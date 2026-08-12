---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: v1 Launch
current_phase: 4
current_phase_name: Notifications & Invitation Lifecycle
status: planned
stopped_at: Phase 4 planned — 4 plans, ready to execute
last_updated: "2026-08-12T09:51:15Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 14
  completed_plans: 10
---

# Project State: OhYes

## Current Status

**Milestone:** 1 (v1 Launch)
**Phase:** 4 — Notifications & Invitation Lifecycle
**Status:** Planned — 4 plans across 2 waves, ready to execute
**Overall:** 3/5 phases complete

## Project Reference

See: .planning/PROJECT.md

**Core value:** The moment of delight when someone sees a personalized page made just for them and realizes they can't say no — literally.
**Current focus:** Phase 04 — Notifications & Invitation Lifecycle

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation & Authentication | Complete (2026-05-09) | 6/6 |
| 2 | Invitation Creation & Management | Complete (2026-05-09) | 2/2 |
| 3 | Recipient Experience | Complete (2026-07-30) | 2/2 |
| 4 | Notifications & Invitation Lifecycle | Planned (2026-08-12) | 0/4 |
| 5 | Internationalization & Responsive Polish | Pending | 0/0 |

## Recent Decisions

- Phase 1 deployed to Railway and manually verified (Google OAuth, session persistence, logout all working)
- Fixed: frontend API calls must use VITE_API_URL (not relative paths) since frontend and backend are on separate domains
- Fixed: Dockerfile must run alembic migrations on startup
- Plan 02-01: Backend invitation infrastructure complete (model, migration, schemas, photo pipeline, 5 API endpoints)
- Plan 02-02: Frontend invitation creation form, dashboard cards, invitation gate, toast, i18n, and routes complete
- Phase 4 discussion produced 23 decisions (D-01 to D-23) in 04-CONTEXT.md
- Notifications surface as a top bar heart icon + red dot opening a dropdown panel; opening the panel marks all read
- Dashboard polls GET /api/notifications every 30 seconds and fetches the full list
- NOTF-V2-02 (30-day notification retention) pulled forward from v2 into Phase 4
- Cleanup runs hourly via APScheduler in the FastAPI lifespan, guarded by a Postgres advisory lock (Celery/Redis rejected — a separate worker cannot mount the Railway volume)
- v1 stays on a single backend container with the Railway volume mounted; Storage Buckets migration and horizontal scale-up deferred to the next milestone as INFR-V2-01
- Expired invitations disappear silently from the dashboard; photo deletion failures are logged and the DB row is deleted anyway
- Phase 4 planned: 4 plans, Wave 0 (04-01 test harness) → Wave 1 (04-02 tracer, 04-03 read/poll) → Wave 2 (04-04 cleanup sweep). Plan-checker passed with 0 blockers, 5 warnings (W1-W3 no-fix; W4/W5 optional nits unfixed)
- Backend package index pinned to pypi.org via new `backend/uv.toml` (commit 83ae49f), overriding the global corporate Nexus default — a Nexus-pinned uv.lock would break Railway's `uv sync --frozen` build. uv.lock restored to pypi.org
- Backend tests run against a throwaway docker PostgreSQL 16 at execution time (no CI exists; Railway build does not run tests). Never point DATABASE_URL at prod

## Blockers / Concerns

- **WR-007** (carried from Phase 3): `test_verify_correct_password` and `test_respond_creates_notification` are empty stubs (see 03-01-SUMMARY.md:14). The second covers the exact producer path Phase 4 consumes. Needs test DB fixture infrastructure — natural to build during Phase 4.
- Railway volume constraint could not be verified live (no network egress in the prior session). Quoted from CLAUDE.md. Verify when planning INFR-V2-01.
- **Do not plan for more than one backend replica this milestone** — the photo volume pins the backend to a single container until INFR-V2-01 lands.

## Human Actions Pending

1. **Before executing Phase 4 (blocking for execution):** start a throwaway local PostgreSQL 16 and create `backend/.env` from `backend/.env.example` with `DATABASE_URL` pointing at the LOCAL db — `docker run -d --name ohyes-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ohyes -p 5432:5432 postgres:16`. 04-01 (wave 0) runs `alembic upgrade head` + pytest and needs it. NEVER point at Railway prod.
2. Confirm the 30-day notification retention window at the 04-04 Task 2 checkpoint (blocking `checkpoint:decision`). D-07 is one-way. First-run backup is NOT needed while prod holds only test data — becomes a launch-checklist item once real recipients exist.
3. Complete the 11 manual UAT items in 03-VERIFICATION.md (`/gsd-verify-work 3`) — non-blocking
4. Re-test the recipient page on the deployed app; Phase 3 fixes (12024ae, 31fa71a, 4a3da61, 824fc9d) are unconfirmed live — non-blocking
5. Ask the gateway owner which Claude model IDs are routable through orion-model.wneweb.com.tw (Opus 4.8 returned auth failure) — non-blocking

## Session Continuity

Last session: 2026-08-12T09:51:15Z
Stopped at: Phase 4 planning finalized — all post-planning gates passed (requirements 4/4, decision coverage 23/23), STATE + ROADMAP updated, plans committed
Next action: `/gsd-execute-phase 4` (start throwaway docker PG + backend/.env first — see Human Actions #1)

---
*Last updated: 2026-08-12 on session resume*
