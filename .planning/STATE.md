---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: v1 Launch
current_phase: 4
current_phase_name: Notifications & Invitation Lifecycle
status: planning
stopped_at: Phase 4 UI-SPEC approved
last_updated: "2026-08-02T13:46:12.481Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 10
  completed_plans: 10
---

# Project State: OhYes

## Current Status

**Milestone:** 1 (v1 Launch)
**Phase:** 4 — Notifications & Invitation Lifecycle
**Status:** Discussion complete, ready for UI design contract
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
| 4 | Notifications & Invitation Lifecycle | Discussed, not planned | 0/0 |
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

## Blockers / Concerns

- **WR-007** (carried from Phase 3): `test_verify_correct_password` and `test_respond_creates_notification` are empty stubs (see 03-01-SUMMARY.md:14). The second covers the exact producer path Phase 4 consumes. Needs test DB fixture infrastructure — natural to build during Phase 4.
- Railway volume constraint could not be verified live (no network egress in the prior session). Quoted from CLAUDE.md. Verify when planning INFR-V2-01.
- **Do not plan for more than one backend replica this milestone** — the photo volume pins the backend to a single container until INFR-V2-01 lands.

## Human Actions Pending

1. Complete the 11 manual UAT items in 03-VERIFICATION.md (`/gsd-verify-work 3`) — non-blocking
2. Re-test the recipient page on the deployed app; Phase 3 fixes (12024ae, 31fa71a, 4a3da61, 824fc9d) are unconfirmed live — non-blocking
3. Confirm the 30-day notification retention window before the cleanup job first runs in production. D-07 is rated one-way — recipient messages exist nowhere else once the invitation is destroyed on respond — non-blocking

## Session Continuity

Last session: 2026-08-02T13:46:12.461Z
Stopped at: Phase 4 UI-SPEC approved
Resume file: .planning/phases/04-notifications-invitation-lifecycle/04-UI-SPEC.md

---
*Last updated: 2026-08-02 on session resume*
