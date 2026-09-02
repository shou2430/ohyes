---
phase: 04-notifications-invitation-lifecycle
plan: 01
subsystem: testing
tags: [pytest, pytest-asyncio, sqlalchemy, asyncpg, apscheduler, fastapi]

requires:
  - phase: 03-recipient-experience
    provides: "respond_to_invitation and verify_invitation_password endpoints (backend/app/routers/invitations.py) that this plan's WR-007 tests exercise"
provides:
  - "db_session transaction-rollback fixture + seeded_user/second_user/auth_headers/second_auth_headers fixtures in backend/tests/conftest.py"
  - "backend/tests/test_notifications.py — xfail(strict) scaffolds for NOTF-01/02/03, contract 04-02/04-03 implement against"
  - "backend/tests/test_cleanup.py — passing AsyncIOScheduler coroutine-job smoke test + xfail(strict) scaffolds for INV-07 sweep/lock, contract 04-04 implements against"
  - "apscheduler 3.11.3 pinned in backend/pyproject.toml / backend/uv.lock (D-18)"
  - "WR-007 closed: test_verify_correct_password_returns_200 and test_respond_creates_notification_and_deletes_invitation now assert real DB/filesystem outcomes"
affects: [04-02-tracer, 04-03-notifications-read-poll, 04-04-cleanup-sweep]

tech-stack:
  added: ["apscheduler>=3.11.3"]
  patterns:
    - "db_session fixture: engine.connect() + conn.begin() + AsyncSession(bind=conn, join_transaction_mode=\"create_savepoint\") overriding app.dependency_overrides[get_db], rolled back in a finally block after every test"
    - "xfail(strict=True) scaffolds for not-yet-implemented endpoints/modules — an unexpected pass fails the suite, forcing the implementing plan to remove the marker"
    - "Import not-yet-existing modules (app.tasks.cleanup) inside the test function body, never at module scope, so collection isn't broken by a missing file"

key-files:
  created:
    - backend/tests/test_notifications.py
    - backend/tests/test_cleanup.py
  modified:
    - backend/tests/conftest.py
    - backend/tests/test_invitation_respond.py
    - backend/tests/test_invitation_verify.py
    - backend/pyproject.toml
    - backend/uv.lock

key-decisions:
  - "apscheduler pinned at 3.11.3 (3.x line, not the 4.0 alpha) after human legitimacy checkpoint approval — agronholm/apscheduler confirmed, exact name, MIT license"
  - "pytest-asyncio pinned to a session-scoped event loop (asyncio_default_fixture_loop_scope / asyncio_default_test_loop_scope = \"session\") — required for the SQLAlchemy async engine's pooled asyncpg connections to survive across sequential tests (see Deviations)"
  - "AsyncIOScheduler accepts a bare async def job directly with no wrapper — 04-RESEARCH.md Open Question 1 / assumption A1 confirmed true by an executable test, not just training-knowledge confidence"
  - "join_transaction_mode=\"create_savepoint\" rollback fixture (assumption A4) confirmed to hold: full suite run twice in a row both report 17 passed, 5 xfailed with zero row leakage"

requirements-completed: [NOTF-01, NOTF-02, NOTF-03, INV-07]

coverage:
  - id: D1
    description: "db_session transaction-rollback fixture isolates every test, even across routes that call await db.commit()"
    requirement: null
    verification:
      - kind: integration
        ref: "backend/tests/test_invitation_respond.py — full suite run twice in a row, both 17 passed / 5 xfailed"
        status: pass
    human_judgment: false
  - id: D2
    description: "WR-007 closed — test_verify_correct_password_returns_200 and test_respond_creates_notification_and_deletes_invitation assert real DB/filesystem outcomes and pass"
    requirement: null
    verification:
      - kind: integration
        ref: "backend/tests/test_invitation_verify.py#test_verify_correct_password_returns_200"
        status: pass
      - kind: integration
        ref: "backend/tests/test_invitation_respond.py#test_respond_creates_notification_and_deletes_invitation"
        status: pass
    human_judgment: false
  - id: D3
    description: "test_notifications.py and test_cleanup.py exist, collect, and carry the exact test names NOTF-01/02/03 and INV-07 verification maps cite, as xfail(strict) scaffolds"
    requirement: "NOTF-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_notifications.py -q -rx (3 xfailed, 0 failed)"
        status: pass
    human_judgment: false
  - id: D4
    description: "apscheduler 3.x resolved and pinned (D-18); AsyncIOScheduler runs a bare coroutine job with no wrapper (Open Question 1 answered)"
    requirement: "INV-07"
    verification:
      - kind: unit
        ref: "backend/tests/test_cleanup.py#test_asyncio_scheduler_runs_coroutine_job"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-08-12
status: complete
---

# Phase 4 Plan 01: Wave 0 Validation Harness Summary

**Transaction-rollback test fixture (SQLAlchemy savepoint mode) closing Phase 3's WR-007 debt, plus xfail-scaffolded test files for NOTF-01/02/03 and INV-07, and apscheduler 3.11.3 pinned after human legitimacy review — AsyncIOScheduler's bare-coroutine-job behavior proven by a passing smoke test.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-12T10:07Z
- **Completed:** 2026-08-12T10:24Z
- **Tasks:** 5 (4 `auto` + 1 `checkpoint:human-verify`, pre-resolved)
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- `backend/tests/conftest.py` gained a `db_session` transaction-rollback fixture (with `join_transaction_mode="create_savepoint"` so routes that call `await db.commit()` don't end the outer rollback transaction) plus `seeded_user`, `second_user`, `auth_headers`, `second_auth_headers` fixtures minting real JWTs via `create_access_token`
- WR-007 closed: `test_verify_correct_password_returns_200` and `test_respond_creates_notification_and_deletes_invitation` now seed real rows and assert real DB/filesystem postconditions instead of being empty stubs
- Three defective `test_invitation_respond.py` assertions repaired (they were passing/failing for the wrong reason — missing required `password` field, not the behavior under test)
- `backend/tests/test_notifications.py` created with `test_list_returns_unread`, `test_list_scoped_to_owner`, `test_mark_all_read` — all `xfail(strict=True)` scaffolds with real assertions against the `NotificationResponse` contract and the T-04-IDOR ownership requirement, ready for 04-02/04-03 to implement against
- `backend/tests/test_cleanup.py` created: `test_asyncio_scheduler_runs_coroutine_job` passes today and retires 04-RESEARCH.md Open Question 1 (AsyncIOScheduler accepts a bare `async def` job, no wrapper needed); `test_sweep_deletes_expired_invitation_and_photo` and `test_advisory_lock_blocks_concurrent_run` are `xfail(strict=True)` scaffolds for 04-04
- `apscheduler` 3.11.3 added to `backend/pyproject.toml`/`backend/uv.lock` after the Task 4 human legitimacy checkpoint approval (agronholm/apscheduler, exact name, MIT license, 3.x pin — not the 4.0 alpha)
- `cd backend && uv run pytest -q` exits 0 twice in a row: **17 passed, 5 xfailed** (measured baseline was 4 failed, 11 passed) — no product code (`backend/app/`) was touched

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the db_session transaction-rollback fixture and auth helper fixtures to conftest.py** - `b0a1e5b` (test)
2. **Task 2: Close WR-007 — unstub the two integration tests and repair the three defective respond tests** - `d7fdfc7` (test)
3. **Task 3: Create tests/test_notifications.py with the three named NOTF tests** - `84c3c27` (test)
4. **Task 4: Confirm apscheduler package legitimacy before installing it** - checkpoint, pre-resolved by explicit human approval passed through by the orchestrator (no code change, no separate commit — recorded in Task 5's commit message)
5. **Task 5: Add the apscheduler dependency and create tests/test_cleanup.py with the coroutine-job smoke test** - `81c1669` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified

- `backend/tests/conftest.py` - `db_session`, `client`, `seeded_user`, `second_user`, `auth_headers`, `second_auth_headers` fixtures
- `backend/tests/test_invitation_verify.py` - unstubbed `test_verify_correct_password_returns_200`
- `backend/tests/test_invitation_respond.py` - unstubbed `test_respond_creates_notification_and_deletes_invitation`, repaired 3 tests, added `test_respond_missing_password_returns_422`
- `backend/tests/test_notifications.py` (new) - 3 xfail(strict) scaffolds for NOTF-01/02/03
- `backend/tests/test_cleanup.py` (new) - 1 passing scheduler smoke test + 2 xfail(strict) scaffolds for INV-07
- `backend/pyproject.toml` - added `apscheduler>=3.11.3` dependency; added `asyncio_default_fixture_loop_scope` / `asyncio_default_test_loop_scope = "session"` (deviation, see below)
- `backend/uv.lock` - `apscheduler` and `tzlocal` resolved and pinned

## Decisions Made

- **Task 4 (package legitimacy):** Approved. `apscheduler` confirmed as `agronholm/apscheduler`, exact name match (not a typosquat like `apschedulers`/`aps-scheduler`), MIT licensed, 3.x line pinned (3.11.3) rather than the 4.0 alpha. This approval was recorded as an explicit human decision passed through by the orchestrator per the Package Legitimacy Protocol (T-04-01-SC) — the researcher's own SUS verdict (`unknown-downloads`, `no-repository`) was assessed as a registry-metadata gap, and the human confirmed the live PyPI page directly.
- **Open Question 1 answered:** `AsyncIOScheduler.add_job()` accepts a bare `async def` coroutine function directly and fires it on the running event loop — no `asyncio.ensure_future` wrapper, no sync shim. Proven by `test_asyncio_scheduler_runs_coroutine_job`, which passes today. 04-04 can now build its lifespan wiring on this confirmed behavior instead of training-knowledge confidence.
- **Assumption A4 confirmed:** the SQLAlchemy async transaction-rollback fixture pattern (connection + explicit `begin()` + `AsyncSession` bound with `join_transaction_mode="create_savepoint"`) holds under the project's real `asyncpg` driver and `async_sessionmaker` config, once the event-loop scoping issue below was fixed. The full suite run twice in a row both report identical `17 passed, 5 xfailed` — no row leakage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pinned pytest-asyncio to a session-scoped event loop**
- **Found during:** Task 1 (running the acceptance-criteria command `cd backend && uv run pytest tests/test_invitation_verify.py -q` after wiring the `db_session` fixture)
- **Issue:** With pytest-asyncio's default function-scoped event loop, the module-level SQLAlchemy `engine` (created once at import time in `app.core.database`) pools `asyncpg` connections that get bound to whichever event loop was active when each connection was first used. Because a fresh event loop is created per test function by default, the second and later DB-touching test in a run reused a connection created under a *different* prior loop, and asyncpg raised `InterfaceError: cannot perform operation: another operation is in progress` on the `SAVEPOINT` statement (and, before Task 1's fixture existed, on a bare `SELECT`) — this reproduced even with the pre-Task-1 vanilla `client` fixture, confirming it predates this plan's changes and is not something the `db_session` fixture introduced.
- **Fix:** Added `asyncio_default_fixture_loop_scope = "session"` and `asyncio_default_test_loop_scope = "session"` to `backend/pyproject.toml`'s `[tool.pytest.ini_options]`, so the whole test session shares one event loop and the engine's pooled connections stay valid across tests. This is a well-documented SQLAlchemy-async + pytest-asyncio pooling gotcha, not fixable from inside `conftest.py` alone.
- **Files modified:** `backend/pyproject.toml`
- **Verification:** `cd backend && uv run pytest tests/test_invitation_verify.py -q` went from `2 failed, 2 passed` to `4 passed`; full suite run twice in a row both report `17 passed, 5 xfailed`.
- **Committed in:** `b0a1e5b` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking issue)
**Impact on plan:** Necessary for Task 1's own acceptance criteria (the two `ConnectionRefusedError`-turned-passing tests) and for every later plan's `<automated>` verify commands to be trustworthy across a full-suite run. No scope creep — no product code was touched, only test configuration.

## Issues Encountered

None beyond the deviation documented above.

## User Setup Required

None - no external service configuration required beyond what was already confirmed by the orchestrator (local PostgreSQL 16 running, `backend/.env` present, migrations applied).

## Next Phase Readiness

- 04-02 (tracer) and 04-03 can implement `backend/app/routers/notifications.py` against the exact contract `test_notifications.py` already pins (response shape, ownership scoping) — removing the `xfail` marker as each test starts passing.
- 04-04 can implement `backend/app/tasks/cleanup.py` against `test_cleanup.py`'s two scaffolds, with `AsyncIOScheduler`'s coroutine-job behavior already de-risked and the advisory-lock key imported from the module it owns (`CLEANUP_LOCK_KEY`).
- Every `<automated>` verify command cited by 04-02/04-03/04-04's plans now names a file that exists and collects — no MISSING verifies remain in the phase.
- `04-VALIDATION.md` updated: `wave_0_complete: true`, Task ID column filled (`04-01/T1`–`T5`), File Exists flipped to ✅ for all Wave 0 rows.

---
*Phase: 04-notifications-invitation-lifecycle*
*Completed: 2026-08-12*

## Self-Check: PASSED

All created/modified files and all four task commit hashes verified present.
