---
phase: 04-notifications-invitation-lifecycle
plan: 04
subsystem: infra
tags: [apscheduler, sqlalchemy, asyncpg, postgresql-advisory-lock, fastapi-lifespan]

requires:
  - phase: 04-notifications-invitation-lifecycle
    provides: "04-01's db_session transaction-rollback fixture, xfail(strict) cleanup scaffolds, and apscheduler 3.11.3 pin; 04-02's notifications_router wiring in main.py that this plan must not disturb"
provides:
  - "backend/app/tasks/cleanup.py — run_cleanup(): advisory-lock-guarded hourly sweep that deletes expired invitations (row + photo file) and prunes notifications past their retention window"
  - "AsyncIOScheduler wired into the FastAPI lifespan in main.py, job id cleanup_sweep, hourly interval trigger"
  - "NOTF-V2-02 reclassified from v2/deferred into v1 Notification requirements, traced to Phase 4"
affects: [05-internationalization-responsive-polish]

tech-stack:
  added: []
  patterns:
    - "pg_try_advisory_xact_lock (transaction-scoped, not session-scoped) guards the sweep body; releases automatically at db.commit()"
    - "DELETE ... RETURNING captures photo_filename in the same statement that deletes the row, so filesystem removal happens after commit with no separate SELECT"
    - "Test-only monkeypatch of app.tasks.cleanup.async_session_factory to reuse the test's own db_session — a genuinely new pooled connection cannot see a test's flushed-but-uncommitted seed rows under Postgres transaction isolation, so run_cleanup() must be pointed at the same session/connection to be exercised in a rollback-fixture test"

key-files:
  created:
    - backend/app/tasks/__init__.py
    - backend/app/tasks/cleanup.py
  modified:
    - backend/app/main.py
    - backend/tests/test_cleanup.py
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Task 2 checkpoint (D-07, one-way): retain-30 — 30 days, exactly as locked in D-07. No amendment needed to D-07 or NOTF-V2-02's wording."
  - "D-19 names the session-scoped pg_try_advisory_lock; this plan uses pg_try_advisory_xact_lock instead, per the plan's own recorded Decision deviation — the transaction-scoped variant auto-releases at COMMIT/ROLLBACK and cannot be stranded by a recycled pooled connection (RESEARCH Pitfall 1)."
  - "Test session-factory monkeypatch (not part of the plan's literal action text, added to make the inherited 04-01 test scaffolds pass against a real Postgres instance): run_cleanup()'s own async_session_factory() call is redirected, inside relevant tests only, to the fixture's db_session via a tiny asynccontextmanager wrapper. Without this, run_cleanup()'s genuinely separate pooled connection cannot see rows the test only flushed (not committed), because Postgres transaction isolation hides uncommitted writes from other sessions. The advisory-lock test deliberately does NOT use this patch, since it specifically needs a second, independent connection to prove cross-instance locking."

requirements-completed: [INV-07]

coverage:
  - id: D1
    description: "An expired invitation row and its photo file are both deleted by one run_cleanup() call; an unexpired invitation and its photo survive"
    requirement: "INV-07"
    verification:
      - kind: integration
        ref: "backend/tests/test_cleanup.py#test_sweep_deletes_expired_invitation_and_photo"
        status: pass
      - kind: integration
        ref: "backend/tests/test_cleanup.py#test_sweep_keeps_unexpired_invitation"
        status: pass
    human_judgment: false
  - id: D2
    description: "A photo file that cannot be removed (already missing) does not abort the sweep — the DB row is still deleted (D-22)"
    requirement: "INV-07"
    verification:
      - kind: integration
        ref: "backend/tests/test_cleanup.py#test_sweep_tolerates_missing_photo_file"
        status: pass
    human_judgment: false
  - id: D3
    description: "A held transaction-scoped advisory lock on CLEANUP_LOCK_KEY makes a concurrent run_cleanup() call a no-op (D-19)"
    requirement: "INV-07"
    verification:
      - kind: integration
        ref: "backend/tests/test_cleanup.py#test_advisory_lock_blocks_concurrent_run"
        status: pass
    human_judgment: false
  - id: D4
    description: "A notification older than the confirmed 30-day retention window is deleted; a recent one survives (D-07, NOTF-V2-02)"
    verification:
      - kind: integration
        ref: "backend/tests/test_cleanup.py#test_sweep_deletes_notifications_older_than_retention"
        status: pass
      - kind: integration
        ref: "backend/tests/test_cleanup.py#test_sweep_keeps_recent_notifications"
        status: pass
    human_judgment: false
  - id: D5
    description: "Application startup registers run_cleanup on an hourly interval trigger under job id cleanup_sweep, via the FastAPI lifespan (D-18, D-20)"
    requirement: "INV-07"
    verification:
      - kind: integration
        ref: "backend/tests/test_cleanup.py#test_scheduler_registers_hourly_cleanup_job"
        status: pass
    human_judgment: false
  - id: D6
    description: "NOTF-V2-02 reclassified into v1 Notification requirements and traced to Phase 4 in REQUIREMENTS.md"
    verification:
      - kind: other
        ref: "grep -c 'NOTF-V2-02' .planning/REQUIREMENTS.md returns 2"
        status: pass
    human_judgment: false
  - id: D7
    description: "Manual log check on first Railway deploy: one 'cleanup:' INFO line per hour in production logs (T-04-SILENT detection signal)"
    verification: []
    human_judgment: true
    rationale: "Requires observing live Railway logs after deploy; cannot be verified from the local dev environment in this session."

duration: ~20min
completed: 2026-08-13
status: complete
---

# Phase 4 Plan 04: Cleanup Sweep Summary

**Advisory-lock-guarded hourly APScheduler sweep in the FastAPI lifespan that bulk-deletes expired invitations (row + photo file via `DELETE ... RETURNING`) and prunes notifications older than the confirmed 30-day retention window, in one transaction and one `pg_try_advisory_xact_lock` hold.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 5 (4 `auto` + 1 `checkpoint:decision`, pre-resolved by explicit human decision passed through by the orchestrator)
- **Files modified:** 5 (2 created, 3 modified)

## Retention Window Confirmed

**Retention window confirmed: 30 days (option id: retain-30)**

The Task 2 checkpoint (D-07, rated one-way — deleted notification rows are the only surviving copy of each recipient's message, since the invitation that carried it was already destroyed at respond time) was answered `retain-30` before Task 3 implemented the destructive delete. Because the selection matches the ratified D-07 and NOTF-V2-02 exactly, no amendment to `04-CONTEXT.md` D-07 was needed, and Task 5 wrote the NOTF-V2-02 requirement with the 30-day window unchanged.

## Advisory Lock Key

`CLEANUP_LOCK_KEY = 727100401` — the single project-wide PostgreSQL advisory-lock key for the cleanup sweep, defined once in `backend/app/tasks/cleanup.py` with a comment recording that it must not be reused by any other feature (mitigates T-04-LOCKKEY). Guarded with `pg_try_advisory_xact_lock` (transaction-scoped), not the session-scoped `pg_try_advisory_lock` — this is a recorded deviation from D-19's literal function name, not its behavior (see Decisions Made).

## Log Line Formats

Every `run_cleanup()` invocation emits at least one INFO-or-higher record on the `app.tasks.cleanup` logger (mitigates T-04-SILENT):

- **Lock held by another instance (skip):** `cleanup: lock held by another instance, skipping this tick` (INFO)
- **Completed sweep:** `cleanup: deleted %d invitations, removed %d photo files, deleted %d notifications` (INFO)
- **Per-file removal failure (does not abort the sweep, D-22):** `cleanup: failed to remove photo %s: %s` (WARNING)

## Accomplishments

- `backend/app/tasks/cleanup.py` created: `run_cleanup()` opens its own session (no request-scoped `get_db`), guards the sweep with `pg_try_advisory_xact_lock(CLEANUP_LOCK_KEY)`, deletes expired invitations via a single `DELETE ... RETURNING Invitation.photo_filename`, deletes notifications older than `NOTIFICATION_RETENTION_DAYS` (30) via a plain bulk `DELETE`, commits once (releasing the lock), then removes photo files with per-file `OSError` swallowed so one bad file never stalls the sweep
- `backend/app/main.py`: module-level `AsyncIOScheduler` instance; lifespan registers `run_cleanup` on an hourly interval trigger (`id="cleanup_sweep"`) and starts the scheduler before `yield`, shuts it down (`wait=False`) after — all pre-existing `app.include_router(...)` registrations, including 04-02's `notifications_router`, are untouched
- `backend/tests/test_cleanup.py`: the two `xfail(strict)` scaffolds inherited from 04-01 are now real passing tests (markers removed); 5 new tests added (`test_sweep_keeps_unexpired_invitation`, `test_sweep_tolerates_missing_photo_file`, `test_sweep_deletes_notifications_older_than_retention`, `test_sweep_keeps_recent_notifications`, `test_scheduler_registers_hourly_cleanup_job`) — 8 tests total in the file, all passing
- `.planning/REQUIREMENTS.md`: `NOTF-V2-02` moved from v2/deferred into the v1 Notification section (checked off `[x]`) and added to the Phase 4 traceability table; ID unchanged so prior references stay resolvable
- Full backend suite: **28 passed**, 0 failed, 0 xfailed (baseline was 21 passed, 2 xfailed before this plan)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the tasks package and the lock-guarded expired-invitation sweep** - `9364177` (feat)
2. **Task 2: Confirm the notification retention window (D-07, one-way)** - checkpoint, pre-resolved by explicit human decision passed through by the orchestrator (retain-30); no code change, no separate commit
3. **Task 3: Add the notification retention delete to the sweep** - `c72df82` (feat)
4. **Task 4: Start the hourly scheduler in the FastAPI lifespan** - `5a1442e` (feat)
5. **Task 5: Reclassify NOTF-V2-02 from v2 into v1 in REQUIREMENTS.md** - `70d8641` (docs)

## Files Created/Modified

- `backend/app/tasks/__init__.py` - empty package marker (new package)
- `backend/app/tasks/cleanup.py` - `CLEANUP_LOCK_KEY`, `NOTIFICATION_RETENTION_DAYS`, `run_cleanup()`, `_delete_expired_invitations()`, `_delete_old_notifications()`, `_remove_photo_files()`
- `backend/app/main.py` - `AsyncIOScheduler` import + module-level instance; lifespan gains `scheduler.add_job(run_cleanup, "interval", hours=1, id="cleanup_sweep")` / `scheduler.start()` / `scheduler.shutdown(wait=False)`
- `backend/tests/test_cleanup.py` - rewritten: xfail markers removed from the two 04-01 scaffolds, 5 new tests added, `_reuse_session` test helper added
- `.planning/REQUIREMENTS.md` - `NOTF-V2-02` reclassified v2 → v1, added to Phase 4 traceability

## Decisions Made

- **Task 2 checkpoint (D-07, one-way):** `retain-30` confirmed — 30 days, matching the ratified decision exactly. No D-07 or NOTF-V2-02 wording amendment needed.
- **D-19 function-name deviation (carried from the plan's own `## Decision deviations` note):** used `pg_try_advisory_xact_lock` instead of the session-scoped `pg_try_advisory_lock` D-19 literally names — the transaction-scoped variant delivers D-19's stated intent ("the lock is local to the job function") without the pooled-connection leak risk (RESEARCH Pitfall 1). No requirement of D-19 is reduced.
- **Test infrastructure addition (not in the plan's literal action text):** added a `_reuse_session` async-context-manager test helper and monkeypatched `app.tasks.cleanup.async_session_factory` in the invitation/notification-deletion tests, so `run_cleanup()` operates on the same open transaction the test seeded via `db_session.flush()`. This was necessary because Postgres transaction isolation means a genuinely new pooled connection (what `async_session_factory()` returns unpatched) cannot see another session's flushed-but-uncommitted rows — without this, the tests inherited from 04-01 could never observe a real deletion. The advisory-lock test intentionally does not use this patch, since it specifically requires two independent connections to prove cross-instance lock behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added session-factory test monkeypatch so inherited xfail scaffolds could actually pass against real Postgres**
- **Found during:** Task 1, before writing `run_cleanup()`'s test coverage
- **Issue:** The 04-01 `db_session` fixture opens an explicit `conn.begin()` transaction and only ever flushes (never commits) seeded rows. `run_cleanup()` is required by the plan to open its own session via `async_session_factory()` (not the request-scoped `get_db`), which checks out a genuinely different pooled connection. Under Postgres's standard transaction isolation, that second connection cannot see the first connection's uncommitted writes — so, unpatched, `run_cleanup()` would find zero expired rows in every test, and the inherited scaffolds could never be made to pass without either committing test data for real (breaking the rollback-isolation fixture pattern for the rest of the suite) or reusing the same session.
- **Fix:** Added a tiny `_reuse_session` `asynccontextmanager` helper in `test_cleanup.py` and monkeypatched `app.tasks.cleanup.async_session_factory` to return it wrapping the test's own `db_session`, for every test that seeds rows and expects `run_cleanup()` to see/delete them. The advisory-lock test deliberately omits this patch since it needs a truly independent third connection.
- **Files modified:** `backend/tests/test_cleanup.py` (test-only; no product code affected)
- **Verification:** `cd backend && uv run pytest tests/test_cleanup.py -v` — all 8 tests pass; full suite `uv run pytest -q` — 28 passed.
- **Committed in:** `9364177` (Task 1 commit)

**2. [Rule 1 - Bug] Removed a literal `datetime.now()` docstring phrase that broke the Pitfall-2 grep gate**
- **Found during:** Task 1, running the acceptance-criteria grep commands
- **Issue:** `_delete_expired_invitations`'s docstring literally contained the substring `datetime.now()` (describing what to avoid), which the acceptance criterion `grep -v '^ *#' ... | grep -c 'datetime\.now()'` counts regardless of whether it's code or prose — this returned 1 instead of the required 0.
- **Fix:** Reworded the docstring to describe the same constraint without using the literal `datetime.now()` substring.
- **Files modified:** `backend/app/tasks/cleanup.py`
- **Verification:** `grep -v '^ *#' app/tasks/cleanup.py | grep -c 'datetime\.now()'` returns 0; tests still pass.
- **Committed in:** `9364177` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking test-infrastructure fix, 1 minor bug in docstring wording)
**Impact on plan:** Both fixes were necessary to satisfy the plan's own stated acceptance criteria (the exact xfail scaffold test names and the literal grep gates). No product-code scope creep — Deviation 1 is test-only, Deviation 2 is a docstring wording change with no behavior impact.

## Issues Encountered

None beyond the two deviations documented above.

## User Setup Required

None - no external service configuration required. Local PostgreSQL 16 (`ohyes-pg` docker container) and `backend/.env` were already confirmed running by the orchestrator; no new dependency was installed (`apscheduler` was already pinned by 04-01).

## File Touch Confirmation

`git diff --name-only` from the commit immediately preceding this plan's first task commit (`4e0900e`, end of 04-03) to `HEAD` shows exactly the five files in this plan's `files_modified`: `.planning/REQUIREMENTS.md`, `backend/app/main.py`, `backend/app/tasks/__init__.py`, `backend/app/tasks/cleanup.py`, `backend/tests/test_cleanup.py`. No file outside `files_modified` was touched; zero overlap with sibling plan 04-03's files (`backend/app/routers/notifications.py`, `backend/tests/test_notifications.py`, any `frontend/` path).

## Next Phase Readiness

- Phase 4 (Notifications & Invitation Lifecycle) is now fully implemented: NOTF-01/02/03, INV-07, and NOTF-V2-02 all complete.
- The manual Railway-log verification of the hourly `cleanup:` INFO line (T-04-SILENT detection signal, verification item 8 in the plan) is deferred to first production deploy — flagged as `human_judgment: true` in this SUMMARY's coverage block (D7).
- No blockers for Phase 5 (Internationalization & Responsive Polish).

---
*Phase: 04-notifications-invitation-lifecycle*
*Completed: 2026-08-13*

## Self-Check: PASSED

All created/modified files and all four task commit hashes verified present (see below).
