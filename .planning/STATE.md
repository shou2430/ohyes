---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: v1 Launch
current_phase: 05
status: completed
stopped_at: "Phase 5 complete (UAT 6/6, SECURITY.md threats_open:0, VALIDATION.md validated). Milestone v1.0 at 100% (5/5 phases). Local UAT stack (podman ohyes-pg + backend :8000 + preview :4173 + dev :5173) still running."
last_updated: "2026-09-01T12:03:17.204Z"
last_activity: 2026-09-01
last_activity_desc: Milestone v1.0 completed and archived
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 17
  completed_plans: 17
current_phase_name: Internationalization & Responsive Polish
---

# Project State: OhYes

## Current Status

**Milestone:** 1 (v1 Launch)
**Phase:** 05
**Status:** v1.0 milestone complete
**Overall:** 5/5 phases complete (17/17 plans)

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-01)

**Core value:** The moment of delight when someone sees a personalized page made just for them and realizes they can't say no — literally.
**Current focus:** Milestone v1.0 complete — next: `/gsd-complete-milestone v1.0`

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation & Authentication | Complete (2026-05-09) | 6/6 |
| 2 | Invitation Creation & Management | Complete (2026-05-09) | 2/2 |
| 3 | Recipient Experience | Complete (2026-07-30) | 2/2 |
| 4 | Notifications & Invitation Lifecycle | Complete (2026-08-13) | 4/4 |
| 5 | Internationalization & Responsive Polish | Complete (2026-09-01) | 3/3 |

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
- Phase 5 complete: i18n bilingual toggle (allow-list default zh-TW), 375px responsive, load-perf code-split (148.71→93.15 kB gzip main). All 3 plans + code review (0 crit) + verify + 6/6 UAT pass
- Fixed recipient photo double-fetch (quick 260901-ndt): `<img crossOrigin="anonymous">` now shares cache with the keepsake canvas preload → single 143KB fetch (was 2). Confirmed via backend log (photo-GET == verify count) and Slow-4G Network panel
- First frontend test harness stood up in Phase 5 validation: vitest 4.x, 9 i18n tests green (allow-list + en/zh-TW key parity). esbuild build approved via `frontend/pnpm-workspace.yaml`. Frontend uses pnpm, NOT npm (npm corrupts the pnpm node_modules layout)
- Local UAT env this session: podman (not docker — Docker Hub blocked by corp network) postgres:16 as `ohyes-pg`, pulled via `source ~/personal_proxy.sh` (daemon ignores shell proxy; podman honors it)

## Blockers / Concerns

- **WR-007** (carried from Phase 3): `test_verify_correct_password` and `test_respond_creates_notification` are empty stubs (see 03-01-SUMMARY.md:14). The second covers the exact producer path Phase 4 consumes. Needs test DB fixture infrastructure — natural to build during Phase 4.
- Railway volume constraint could not be verified live (no network egress in the prior session). Quoted from CLAUDE.md. Verify when planning INFR-V2-01.
- **Do not plan for more than one backend replica this milestone** — the photo volume pins the backend to a single container until INFR-V2-01 lands.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260901-ndt | fix recipient photo double-fetch (crossOrigin mismatch) — UI-03 perf | 2026-09-01 | 009b500 | [260901-ndt-fix-recipient-photo-double-fetch-crossor](./quick/260901-ndt-fix-recipient-photo-double-fetch-crossor/) |
| 260902-cng | fix Railway pnpm build "packages field missing or empty" (pnpm-workspace.yaml + version pin) | 2026-09-02 | 87d8e2a | [260902-cng-fix-railway-pnpm-workspace-build](./quick/260902-cng-fix-railway-pnpm-workspace-build/) |

## Human Actions Pending

1. ✅ **DONE (2026-08-12):** throwaway `ohyes-pg` (postgres:16) is running on localhost:5432 and `backend/.env` exists (git-ignored, DATABASE_URL → local). `alembic upgrade head` succeeded — users/invitations/notifications tables created. If the container was stopped since (reboot), restart with `docker start ohyes-pg`. To reset: `docker rm -f ohyes-pg` then re-run the `docker run` from the create step. NEVER point DATABASE_URL at Railway prod.
2. ✅ **DONE (2026-08-13):** Confirmed the notification retention window at the 04-04 Task 2 checkpoint (blocking `checkpoint:decision`, D-07 one-way): `retain-30` — 30 days, as originally locked. `NOTIFICATION_RETENTION_DAYS = 30` implemented in `backend/app/tasks/cleanup.py`. First-run backup is NOT needed while prod holds only test data — becomes a launch-checklist item once real recipients exist.
3. Complete the 11 manual UAT items in 03-VERIFICATION.md (`/gsd-verify-work 3`) — non-blocking
4. Re-test the recipient page on the deployed app; Phase 3 fixes (12024ae, 31fa71a, 4a3da61, 824fc9d) are unconfirmed live — non-blocking
5. Ask the gateway owner which Claude model IDs are routable through orion-model.wneweb.com.tw (Opus 4.8 returned auth failure) — non-blocking

## Session Continuity

**Resume file:** None

Last session: 2026-09-01T11:10:00Z
Stopped at: Phase 5 complete (UAT 6/6, SECURITY.md threats_open:0, VALIDATION.md validated). Milestone v1.0 at 100% (5/5 phases). Local UAT stack (podman ohyes-pg + backend :8000 + preview :4173 + dev :5173) still running.
Next action: `/gsd-complete-milestone v1.0` — archive milestone and prepare next

---
*Last updated: 2026-09-01 after Phase 5 (milestone v1.0 complete)*

## Decisions

- [Phase 4]: Phase 4 Plan 01 (Wave 0 harness): db_session rollback fixture confirmed to hold across two full-suite runs (assumption A4); AsyncIOScheduler bare-coroutine-job behavior confirmed by passing test (Open Question 1); apscheduler 3.11.3 approved and pinned
- [Phase 4]: Phase 4 Plan 02 (tracer): GET /api/notifications owner-scoped no-pagination endpoint, NotificationResponse schema, and NotificationBell/Panel/Row components landed; full browser/OAuth visual confirmation deferred to human verifier (A-02-1); title/name cap amendment (A-02-2) still not landed
- [Phase 4]: Phase 4 Plan 03 (read/poll loop): bulk owner-scoped POST /api/notifications/read, 30s dashboard poll with 401-redirect + silent retry, NotificationBell snapshot-before-mark/showDot/bounce, NotificationPanel highlight+focus+responsive-origin wiring landed. NotificationRow highlight + i18n keys confirmed already correct from 04-02, no changes needed.
- [Phase 4]: Phase 4 Plan 04 (cleanup sweep): Task 2 checkpoint (D-07, one-way) confirmed retain-30 (30 days); hourly APScheduler sweep in the FastAPI lifespan, guarded by pg_try_advisory_xact_lock, bulk-deletes expired invitations (row+photo) and prunes notifications past retention in one transaction; NOTF-V2-02 reclassified v2 to v1. Full backend suite green: 28 passed, 0 xfailed.

## Performance Metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 04 P01 | 20min | 5 tasks | 7 files |
| Phase 04 P02 | 45min | 3 tasks | 10 files |
| Phase 4 P03 | 25min | 3 tasks | 5 files |
| Phase 04 P04 | 20min | 5 tasks | 5 files |

## Current Position

Phase: Milestone v1.0 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-09-01 — Milestone v1.0 completed and archived

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
