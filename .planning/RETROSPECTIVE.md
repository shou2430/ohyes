# Retrospective: OhYes

Living retrospective across milestones. Newest milestone section first.

## Milestone: v1.0 — v1 Launch

**Shipped:** 2026-09-01
**Phases:** 5 | **Plans:** 17 | **Tasks:** 32
**Span:** 2026-05-04 → 2026-09-01 (~120 days) · 216 commits · 191 files (+30,825 / −15)

### What Was Built
A complete playful-invitation platform: Google OAuth creators build password-gated "Will you...?" pages with a custom title/photo and a mischievous escaping "No" button; recipients unlock, chase the No button through 5 escalating dodge stages, click Yes, and send a 30-char message; creators are notified via an in-app heart/bell; invitations and photos auto-expire after 7 days. Bilingual (zh-TW default + English toggle), mobile-first at 375px, deployed on Railway (FastAPI + React + PostgreSQL + persistent volume).

### What Worked
- **Vertical slices per phase held up.** Each phase shipped an end-to-end observable outcome (auth → create → recipient moment → notifications → polish), so verification had something real to check rather than isolated units.
- **Tracer-first plans.** Phase 4's "wire GET /api/notifications end-to-end first, then layer read/poll/cleanup" ordering kept integration risk at the front where it's cheap.
- **Backend test discipline.** A throwaway docker/podman postgres:16 fixture (SQLAlchemy savepoint rollback) closed Phase 3's WR-007 debt and gave Phase 4 a real producer-path test to build on — 28 tests green.
- **Deliberate scope guards.** The max-2 limit, single-container volume, and "No button never wins" were treated as product features, not limitations — and defended in Out of Scope.

### What Was Inefficient
- **Stale bookkeeping surfaced at close.** REQUIREMENTS.md checkboxes for INV-01–06 / RCPT-01–08 were never back-filled after Phases 2 & 3 verified, and Phase 4 left three `.planner-*` scratch dotfiles that the plan scanner miscounted as plans — both forced cleanup during milestone close instead of at phase transition.
- **No headless OAuth/browser harness.** A large share of Phase 3/5 UAT items are human-verify-only because the dashboard sits behind real Google OAuth with no automated browser path — verification leaned on manual spot-checks.
- **No CI.** Tests exist but run only locally; the Railway build doesn't run them, so regressions rely on developer diligence.

### Patterns Established
- **Throwaway containerized Postgres for tests** (never point DATABASE_URL at Railway prod).
- **Frontend is pnpm, not npm** (npm corrupts the pnpm node_modules layout; vitest/esbuild builds approved via `pnpm-workspace.yaml`).
- **APScheduler in-process, advisory-lock-guarded** for scheduled cleanup — a broker (Celery/Redis) is rejected because a separate worker can't mount the single Railway volume.
- **Corp-network workarounds documented:** podman + `~/personal_proxy.sh` for blocked Docker Hub; `backend/uv.toml` pins pypi.org over the corporate Nexus so `uv sync --frozen` builds on Railway.

### Key Lessons
- **Back-fill requirement/traceability state at each phase transition,** not at milestone close — the debt compounds silently.
- **Clean phase scratch files (`.planner-*`, `.plan-check`, handoffs) at phase end** — leftover dotfiles containing "plan" break completion detection.
- **The single-mount volume is the real scaling constraint,** not the app code — INFR-V2-01 (Storage Buckets migration) is the natural v1.1 headliner.

### Cost Observations
- Model mix: adaptive profile (opus for planning/verify, sonnet for phase research, haiku for pattern-mapping).
- Notable: the company gateway (~76 tok/s) causes opus subagent timeouts — chunked planning and spot-checks (file + commit) were the mitigation; milestone close ran into an interval cost cap and was resumed.

---

## Cross-Milestone Trends

_Populated as future milestones ship._

| Milestone | Phases | Plans | Tasks | Span | Commits |
|-----------|--------|-------|-------|------|---------|
| v1.0 v1 Launch | 5 | 17 | 32 | ~120 days | 216 |
