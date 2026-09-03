---
quick_id: 260903-fao
title: "CI (GitHub Actions) + clear lint debt to green"
date: 2026-09-03
status: planned
---

# Quick Task 260903-fao — CI + lint-to-green

## Goal

Stand up GitHub Actions CI that runs, on push to `main` and on every PR:
- **Backend**: `ruff check` + `alembic upgrade head` + `pytest` against a
  `postgres:16` service container (throwaway — never Railway prod).
- **Frontend**: `pnpm eslint` + `pnpm vitest` (pnpm, not npm; esbuild build
  approved via existing `pnpm-workspace.yaml`).

Clear all outstanding lint findings so the lint gate is green on first run.

## Context / findings (from investigation)

- Backend is uv-managed; Dockerfile = `python:3.12-slim` + `uv sync --frozen`
  + `alembic upgrade head`. CI mirrors this (Python 3.12; note stray local
  `.python-version=3.13` is dev drift — CI pins 3.12 via `UV_PYTHON`).
- Tests need a real Postgres; schema is created by alembic migrations
  (conftest does not `create_all`). So CI must run `alembic upgrade head`
  before `pytest`. DB wired via `DATABASE_URL` (config converts to asyncpg).
- **Ruff findings are 5, not the 3 in TECH-DEBT §3** — TECH-DEBT missed
  `cleanup.py:87` E501. All 5 must be cleared for a green gate.
- `spawnSparkles` (SparkleTrail.jsx) has **zero importers**; `useAuth` has 3
  importers (ProtectedRoute, DashboardPage, LandingPage). Fix react-refresh
  by moving non-component exports to their own modules.

## Tasks

### Task 1 — Clear backend ruff findings
- files: `backend/app/routers/invitations.py`, `backend/app/tasks/cleanup.py`
- action:
  - Remove unused `func` import (`invitations.py:10`).
  - Wrap the 3 E501 long lines (`invitations.py:93,256`; `cleanup.py:87`)
    under 88 cols without changing behavior.
- verify: `cd backend && uv run ruff check .` → "All checks passed!"
- done: ruff exits 0.

### Task 2 — Clear frontend ESLint findings
- files: `frontend/src/pages/AuthCallbackPage.jsx`,
  `frontend/src/components/recipient/SparkleTrail.jsx` (+ new
  `sparkles.js`), `frontend/src/context/AuthContext.jsx` (+ new
  `auth-context.js`), and useAuth importers.
- action:
  - Remove unused `error` var in `AuthCallbackPage.jsx`.
  - Move `spawnSparkles` into `src/components/recipient/sparkles.js`;
    SparkleTrail.jsx keeps only the default component export.
  - Move `AuthContext` object + `useAuth` hook into
    `src/context/auth-context.js`; `AuthContext.jsx` keeps only the
    `AuthProvider` component export. Update the 3 `useAuth` importers.
- verify: `cd frontend && pnpm run lint` (0 problems) AND `pnpm run build`
  (no broken imports).
- done: eslint exits 0, build succeeds.

### Task 3 — Add GitHub Actions CI workflow
- files: `.github/workflows/ci.yml`
- action: two jobs (backend, frontend) per Goal above; postgres:16 service
  with healthcheck; pnpm pinned + frozen lockfile; uv pinned to Python 3.12.
- verify: `yaml` parses; steps mirror local commands that pass.
- done: workflow file present and internally consistent.

## must_haves
- truths:
  - CI runs backend pytest against throwaway postgres:16 (not Railway prod).
  - CI runs frontend vitest + eslint via pnpm.
  - `ruff check` and `eslint` both exit 0 on current tree.
- artifacts:
  - `.github/workflows/ci.yml`
- key_links:
  - `backend/pyproject.toml`, `backend/Dockerfile`, `frontend/package.json`,
    `frontend/pnpm-workspace.yaml`
