# Phase 4 — Plan Outline

**Phase:** 04-notifications-invitation-lifecycle
**Mode:** standard · TRACER_MODE=true · REVERSIBILITY_GATES=true · MVP_MODE=false
**Plans:** 4
**Requirement IDs:** NOTF-01, NOTF-02, NOTF-03, INV-07

## Plans

| Plan ID | Objective | Wave | Depends On | Requirements |
|---------|-----------|------|------------|--------------|
| 04-01 | **Wave 0 validation harness.** Add the `db_session` transaction-rollback fixture to `backend/tests/conftest.py`; create `tests/test_notifications.py` and `tests/test_cleanup.py`; unstub the two WR-007 stubs (`test_respond_creates_notification_and_deletes_invitation`, `test_verify_correct_password_returns_200`); `uv add apscheduler`; smoke-test an APScheduler coroutine job (RESEARCH Open Question 1). No product code. | 0 | — | NOTF-01, NOTF-02, NOTF-03, INV-07 |
| 04-02 | **TRACER — end-to-end notification read path.** `schemas/notification.py` + `routers/notifications.py` (`GET /api/notifications`, owner-scoped, newest-first) registered in `main.py`; `NotificationBell` / `NotificationPanel` / `NotificationRow` mounted in the existing `DashboardPage.jsx` top bar; one fetch on mount renders a real Phase-3 `Notification` row. Verified end-to-end (real DB read → rendered panel row) before any expansion work. | 1 | 04-01 | NOTF-01, NOTF-02 |
| 04-03 | **Panel expansion + polling.** `POST /api/notifications/read` (bulk mark-read, owner-scoped); 30s poll on dashboard mount/unmount with 401→landing redirect and silent network-error retry; frontend-derived unread count; one-shot Motion bounce on delta; optimistic silent dot clear; session-scoped unread highlight; empty state; mobile full-width / desktop ~320-360px panel; `en.json` + `zh-TW.json` keys. | 2 | 04-02 | NOTF-01, NOTF-02, NOTF-03 |
| 04-04 | **Scheduled cleanup sweep (INV-07 + NOTF-V2-02).** New `backend/app/tasks/cleanup.py`: `pg_try_advisory_lock`-guarded hourly run deleting expired invitations (`DELETE ... RETURNING photo_filename`) plus their volume photo files, and notifications older than 30 days; failures on `os.remove` logged and swallowed. `AsyncIOScheduler` started/shut down in the `main.py` lifespan. Includes a `checkpoint:decision` gate for the one-way D-07 retention window. Also reclassifies NOTF-V2-02 into v1 in `.planning/REQUIREMENTS.md`. | 2 | 04-02 | INV-07 |

**Autonomy:** 04-01, 04-02, 04-03 are `autonomous: true`. **04-04 is `autonomous: false`** — D-07 is rated one-way (deleting notification rows destroys recipient messages that exist nowhere else), so a `checkpoint:decision` on the 30-day window precedes the sweep task.

## Tracer

**04-02 is the tracer slice** — the thinnest real path through every layer this phase touches: Postgres `notifications` row (created by the Phase 3 producer) → owner-scoped SQLAlchemy query → `NotificationResponse` → `GET /api/notifications` → dashboard fetch → rendered row in the heart-icon panel. Production-quality, not a prototype: real auth scoping, real error handling, real end-to-end verify. 04-03 and 04-04 expand outward from it and must not start until it is green.

## File Ownership (no same-wave overlap)

- **04-01** (wave 0): `backend/tests/conftest.py`, `backend/tests/test_notifications.py`, `backend/tests/test_cleanup.py`, `backend/tests/test_invitation_respond.py`, `backend/tests/test_invitation_verify.py`, `backend/pyproject.toml`
- **04-02** (wave 1): `backend/app/schemas/notification.py`, `backend/app/routers/notifications.py`, `backend/app/main.py`, `backend/tests/test_notifications.py`, `frontend/src/components/NotificationBell.jsx`, `NotificationPanel.jsx`, `NotificationRow.jsx`, `frontend/src/pages/DashboardPage.jsx`, `frontend/src/i18n/en.json`, `zh-TW.json`
- **04-03** (wave 2): `backend/app/routers/notifications.py`, `backend/tests/test_notifications.py`, `frontend/src/components/Notification*.jsx`, `frontend/src/pages/DashboardPage.jsx`, `frontend/src/i18n/*.json`
- **04-04** (wave 2): `backend/app/tasks/cleanup.py`, `backend/app/main.py`, `backend/tests/test_cleanup.py`, `.planning/REQUIREMENTS.md`

04-03 and 04-04 share wave 2 with **zero** `files_modified` overlap (04-03 owns `routers/notifications.py` + all frontend; 04-04 owns `tasks/cleanup.py` + `main.py`). `main.py` is written by 04-02 (wave 1) then 04-04 (wave 2) — sequential, not concurrent.

## Decision Assignment

Every trackable decision D-01..D-23 is assigned to the plan that must cite it. A blocking
decision-coverage gate runs after planning; an uncited D-NN fails the phase.

| Plan | Decisions |
|------|-----------|
| **04-01** | D-18 (partial — `uv add apscheduler` dependency + coroutine-job smoke test; lifespan wiring lands in 04-04) |
| **04-02** | D-01 (top-bar icon + dropdown, not a route), D-02 (lucide `Heart` + red dot, no numeric badge), D-03 (row shows name + title + quoted message + relative time), D-06 (all non-expired notifications, newest first, max height + internal scroll, no pagination) |
| **04-03** | D-04 (friendly empty state, icon always clickable), D-05 (mobile full-width / desktop ~320-360px anchored panel), D-08 (opening the panel marks everything read, one call), D-09 (session-scoped unread highlight), D-10 (mark-read failure is silent — no toast, no revert), D-11 (no multi-tab read-state sync), D-12 (`document.title` stays "Dashboard - OhYes"), D-13 (30s polling), D-14 (dashboard-only, mount/unmount, not lifted to context), D-15 (each poll fetches the full list; frontend derives unread count), D-16 (one-shot Motion spring bounce), D-17 (401 → clear localStorage + redirect to landing; network errors silent) |
| **04-04** | D-07 (**one-way** — 30-day notification retention; `checkpoint:decision` gate), D-18 (`AsyncIOScheduler` started in the FastAPI lifespan), D-19 (`pg_try_advisory_lock` fixed-key guard, skip tick on failure), D-20 (hourly cadence), D-21 (two deletes per run: expired invitations + photos, notifications older than 30 days), D-22 (photo-deletion failures logged and swallowed, DB row deleted regardless), D-23 (expired invitations disappear silently — assert no backend change needed) |

Coverage check: D-01..D-23 = 23 decisions, all assigned (D-18 cited by two plans).

## Notes for per-plan runs

- Each plan needs a `<threat_model>` (ASVS L1, block_on=high). T-4-IDOR belongs to 04-02/04-03 (owner scoping); T-4-SILENT and T-4-LOCKKEY belong to 04-04 (observable sweep logging, distinctive documented lock key).
- Spec-less probe fallback is active — all 5 `$COVERAGE` rows must land in `must_haves` or as flagged assumptions. NOTF-01/NOTF-03/INV-07 (`unclassified`) split across 04-02/04-03/04-04; NOTF-02's `empty` and `encoding` probes are answered by D-03 (optional message) and the 30-char limit — author them as covered truths in 04-02.
- 04-04 must update `.planning/REQUIREMENTS.md`: move NOTF-V2-02 from v2 into v1 Notification requirements and add it to the Phase 4 traceability row (per the ratified scope change in 04-CONTEXT.md).
- No Alembic migration in this phase — the `Notification` model and table already exist from Phase 3. 04-02 should verify the table exists rather than create it.
