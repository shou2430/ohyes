# Phase 4: Notifications & Invitation Lifecycle - Research

**Researched:** 2026-08-02
**Domain:** APScheduler-based scheduled cleanup jobs (FastAPI lifespan), PostgreSQL advisory locks, SQLAlchemy 2.0 async bulk delete, React polling UI for notifications
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Notification Surface & Layout**
- D-01: Notifications live in a top bar icon + dropdown panel, not an inline dashboard section and not a dedicated route. The top bar already exists in `DashboardPage.jsx` and the panel does not push the invitation cards down.
- D-02: The indicator is a heart icon (lucide-react) with a small red dot in its top-right corner. No numeric badge.
- D-03: Each notification row shows all four fields plus time: "[recipient_name] said yes to your '[invitation_title]'", the 30-character message rendered as a quote, and a relative timestamp ("2 hours ago").
- D-04: Empty panel shows friendly empty-state copy. The icon stays clickable at all times — never disabled or hidden.
- D-05: Mobile (375px): full-width dropdown below the top bar. Desktop: fixed ~320-360px panel anchored under the icon. Same component, two widths.
- D-06: The panel returns all non-expired notifications, newest first, with a max panel height and internal scroll. No pagination, no `limit` parameter — the 30-day TTL (D-07) already bounds growth.

**Notification Retention**
- D-07: Notifications are auto-deleted 30 days after `created_at`, handled by the same scheduled job as INV-07. This implements NOTF-V2-02 ahead of schedule. No new column needed — `created_at` already exists. Reversibility: one-way — deleted notification rows carry recipient messages that exist nowhere else. Confirm the 30-day window before the cleanup job first runs in production.

**Read Interaction**
- D-08: Opening the panel marks everything read — one call, no per-item clicks, no separate "mark all read" button. The red dot clears immediately.
- D-09: Items unread at the moment of opening keep their highlight for that panel session (left accent bar or faint tint); they render plain on the next open. Read state is visual only — nothing is hidden or moved.
- D-10: A failed mark-read request fails silently — optimistically clear the dot, no toast, no revert.
- D-11: No multi-tab / multi-device read-state sync. A second open tab clears its own dot on its next 30-second poll.
- D-12: `document.title` does not reflect unread state — stays "Dashboard - OhYes". The top bar dot is the only indicator.

**New-Notification Detection**
- D-13: Polling, every 30 seconds.
- D-14: Polling runs on the dashboard only — starts on mount, stops on unmount. Not on `/create`, not lifted into a shared context.
- D-15: Each poll fetches the full notification list (`GET /api/notifications`); frontend derives unread count. One endpoint, panel opens instantly with data already in hand.
- D-16: When the dot appears, the heart icon does a one-shot spring bounce (Motion). No toast, no sound.
- D-17: Poll failures: 401 clears localStorage and redirects to the landing page (consistent with Phase 1 D-03); network errors are ignored silently and retried on the next tick. No backoff, no circuit breaker.

**Expiry Cleanup (INV-07)**
- D-18: Cleanup runs as an APScheduler `AsyncIOScheduler` started in the FastAPI `lifespan` (`backend/app/main.py` already has a lifespan hook). `apscheduler` is not yet in `backend/pyproject.toml` and must be added. Lazy deletion on query was rejected.
- D-19: v1 runs a single backend container mounting the Railway volume — horizontal scaling deferred to next milestone. The job wraps each run in a PostgreSQL advisory lock (`pg_try_advisory_lock` with a fixed key); an instance that cannot acquire the lock skips that tick. Do not ship a scheduler that silently assumes a single instance. Reversibility: reversible — the lock is local to the job function.
- D-20: Cleanup runs hourly.
- D-21: Each run does two things: delete invitations where `expires_at < now()` plus their photo files, and delete notifications where `created_at < now() - 30 days`.
- D-22: Photo deletion failures are logged and swallowed — the DB row is deleted regardless and the job continues to the next record. Matches `delete_invitation` (`invitations.py:184-192`).
- D-23: Expired invitations disappear silently from the creator's dashboard — no "expired" card state. The list endpoint already filters on `expires_at > now`. No backend change needed for this.

### Claude's Discretion
- Notification API shape — routes, response schemas, whether mark-read is `POST /api/notifications/read` or a PATCH; ownership scoping via the existing `get_current_user` dependency
- Component decomposition for the panel (single component vs. bell + panel + row split) and where polling state lives
- Exact empty-state copy, relative-time formatting approach, and i18n keys for `en.json` / `zh-TW.json`
- Visual specifics of the unread highlight, dot size/placement, panel shadow and open/close behavior (click-outside, Escape) — consistent with the Phase 1-3 playful tone
- Advisory lock key value and the job's logging format
- Whether the hourly sweep batches deletes or iterates per row

### Deferred Ideas (OUT OF SCOPE)
- Migrate photo storage from the Railway volume to Railway Storage Buckets — scheduled for the NEXT MILESTONE. Tracked as INFR-V2-01. Do not absorb into Phase 4.
- Backend horizontal scale-up (target: 3 replicas) — blocked on the above, same milestone.
- Manual per-notification delete/dismiss — dropped once 30-day TTL bounded growth.
- Notification when an invitation expires unanswered — rejected as new capability outside NOTF-01/02/03.
- Email notification (NOTF-V2-01) — remains in v2.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTF-01 | Creator sees red dot/heart indicator when a notification arrives | `NotificationBell` component (UI-SPEC), 30s poll (D-13), Motion one-shot spring bounce (D-16) — see Code Examples |
| NOTF-02 | Notification shows "[Name] said yes to your [title]" with optional message | `Notification` model already has all fields (Phase 3); `GET /api/notifications` returns them ordered by `created_at desc` — see Architecture Patterns |
| NOTF-03 | Creator can mark notifications as read | Bulk `UPDATE notifications SET is_read=true WHERE user_id=:uid AND is_read=false` on panel open (D-08) — see Code Examples |
| INV-07 | Invitations auto-expire and are fully deleted (data + photo) after 7 days | APScheduler `AsyncIOScheduler` hourly job in `lifespan`, `pg_try_advisory_xact_lock` guard, bulk `DELETE ... RETURNING photo_filename` — see Architecture Patterns, Common Pitfalls |
</phase_requirements>

## Summary

This phase is unusually well-specified: `04-CONTEXT.md` contains 23 locked decisions (D-01 through D-23) covering UI layout, interaction, retention, and cleanup cadence, plus an approved `04-UI-SPEC.md`. Research therefore focuses on filling the remaining *technical* gaps the discussion intentionally left to implementation: how to wire `AsyncIOScheduler` into FastAPI's existing `lifespan`, how to make the PostgreSQL advisory lock correct under SQLAlchemy's connection pool, how to bulk-delete expired invitations without an N+1 query while still capturing each `photo_filename` for filesystem cleanup, and how to structure the test DB fixture that Phase 3 left as a stub (WR-007).

The backend has no schema work to do — `notifications` table and `Notification` model already exist from Phase 3 (verified: migration `a7c2e1f39b04_create_notifications_table.py` present, model has `user_id`, `invitation_title`, `recipient_name`, `recipient_message`, `is_read`, `created_at`). Phase 4 adds one new dependency (`apscheduler`), one new router (`notifications.py`), one new task module (`tasks/cleanup.py`), and registers both in the existing `lifespan`. The frontend adds no new dependencies — `motion`, `lucide-react`, and the platform `Intl.RelativeTimeFormat` (per UI-SPEC) cover every interaction need.

**Primary recommendation:** Use `apscheduler>=3.11` `AsyncIOScheduler.add_job(..., "interval", hours=1)` started/shutdown in the existing `lifespan` context manager; guard the cleanup body with `pg_try_advisory_xact_lock` (transaction-scoped, not the plain session-scoped `pg_try_advisory_lock`) so the lock cannot be orphaned by connection-pool reuse; use a single `DELETE ... RETURNING photo_filename` statement per sweep to get both DB deletion and the filenames needed for `os.remove()` in one round trip.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Notification indicator (dot + bounce) | Browser / Client | — | Pure derived UI state from polled data; no server push (no WebSockets per CLAUDE.md) |
| Notification list rendering (panel) | Browser / Client | API / Backend | Client renders; backend supplies data via `GET /api/notifications` |
| Notification creation (producer) | API / Backend | Database | Already built in Phase 3 (`respond_to_invitation`) — Phase 4 only consumes |
| Mark-all-read | API / Backend | Database | Single bulk `UPDATE`, ownership-scoped via `get_current_user` |
| 30s polling loop | Browser / Client | — | `useEffect` + `setInterval`, starts/stops with `DashboardPage` mount per D-14 |
| Invitation expiry sweep | API / Backend (in-process scheduler) | Database, Filesystem (Railway volume) | No separate worker service allowed (no Celery/Redis); volume only mountable by the one backend container |
| Notification retention sweep (30d) | API / Backend (same scheduler job) | Database | Piggybacks on the same hourly tick per D-07/D-21 |
| Photo file deletion | API / Backend (filesystem I/O) | — | Must happen in the same container that mounts `/data/photos` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| apscheduler | 3.11.3 [VERIFIED: PyPI JSON API — published 2026-06-28] | In-process interval job for hourly cleanup | Already locked in CLAUDE.md; runs in the same process as FastAPI, no Redis/broker needed |
| lucide-react | ^1.14.0 (already installed) | `Heart` icon for the notification indicator | Already in `frontend/package.json`; D-02 |
| motion | ^12.38.0 (already installed) | One-shot spring bounce on new notification (D-16), panel open/close transition | Already in `frontend/package.json` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Intl.RelativeTimeFormat` (browser built-in, no package) | — | Relative timestamps ("2 hours ago") on notification rows | Per `04-UI-SPEC.md` line 32: "relative timestamps use the platform's `Intl.RelativeTimeFormat` (no `date-fns`, no `dayjs`)" — this is a locked decision, not a research choice |
| pytest-asyncio | already installed (`>=1.3.0`) | Async test fixtures for the DB-seeded integration tests needed to unstub WR-007 | Already in `backend/pyproject.toml` dev deps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| APScheduler (in-process) | Celery + Redis / arq | Rejected in CLAUDE.md — an extra Railway service for one hourly job is overkill, and a separate worker process cannot mount the Railway volume anyway (photo deletion requires filesystem access from the same container) |
| APScheduler (in-process) | Railway Cron Job (platform-level scheduled service) | CLAUDE.md flags this as the correct migration path *if* scale increases, but it is a separate Railway service and would need its own volume/API access — deferred, not needed for v1 at hourly cadence |
| `pg_try_advisory_lock` (session-scoped) | `pg_try_advisory_xact_lock` (transaction-scoped) | Recommended below in Common Pitfalls — xact-scoped avoids the failure mode where a pooled connection is returned before the lock is released |

**Installation:**
```bash
cd backend && uv add apscheduler
```

**Version verification:** `apscheduler` version 3.11.3 confirmed via PyPI JSON API `https://pypi.org/pypi/apscheduler/json` [VERIFIED: PyPI registry — published 2026-06-28T19:39:20]. A 4.0 line exists only as alpha pre-releases (`4.0.0a6`, April 2025) — stay on the 3.x line; the `AsyncIOScheduler` API referenced throughout this document is 3.x syntax. No `pip`/`npm` tooling was available in this execution sandbox to cross-check locally; verify at `uv add apscheduler` time that the resolved version matches.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| apscheduler | pypi | 3.11.3 published 2026-06-28 (project itself is ~15 years old, originally released ~2009) | unknown — registry metadata lookup did not surface weekly-download figures | unknown — registry metadata lookup returned no repo URL | SUS (seam verdict) | Approved with note — see below |

**Note on the SUS verdict:** `gsd-tools query package-legitimacy check` flagged `apscheduler` `SUS` with reasons `unknown-downloads` and `no-repository`. This is very likely a metadata-extraction gap in the registry lookup (PyPI's JSON API does expose `project_urls` with a GitHub link, and APScheduler is one of the most widely used Python scheduling libraries — `github.com/agronholm/apscheduler`, in production use for over a decade, and is already an explicit, deliberated stack choice in `CLAUDE.md` with its own "why not Celery/arq" rationale). This is **not** a fresh/unknown package. However, per the Package Legitimacy Protocol, the formal verdict is SUS and must be surfaced as such — the planner should insert a lightweight `checkpoint:human-verify` before `uv add apscheduler` confirming the resolved version and repo match the well-known `agronholm/apscheduler` project (not a typosquat), even though the practical risk here is low given this is a named, locked CLAUDE.md dependency, not a novel discovery.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** apscheduler (see note above — approved with a light human-verify checkpoint, not removed)

## Architecture Patterns

### System Architecture Diagram

```
[Recipient clicks Yes]  (Phase 3, already built)
        |
        v
POST /api/invitations/by-code/{code}/respond
        |
        v
  Notification row created (user_id, title, name, message, is_read=false)
        |
        v
   [PostgreSQL: notifications table]
        ^                                    ^
        |  GET /api/notifications            |  DELETE ... WHERE created_at < now()-30d
        |  (every 30s poll, ownership-scoped) |  (hourly APScheduler job)
        |                                    |
[DashboardPage.jsx]                    [tasks/cleanup.py]
   |  derives unread count                    ^
   |  from full list (D-15)                   |  guarded by pg_try_advisory_xact_lock
   v                                           |
[NotificationBell: heart + red dot]      [AsyncIOScheduler in FastAPI lifespan]
   |  on click: opens panel                    |  also runs hourly:
   |  fires POST /api/notifications/read       |  DELETE invitations WHERE expires_at < now()
   |  (D-08, fire-and-forget, D-10)            |    RETURNING photo_filename
   v                                           |         |
[NotificationPanel: rows, D-03/D-06/D-09]      |         v
                                                |   os.remove() each file on
                                                |   the Railway volume (/data/photos)
                                                |   — failures logged + swallowed (D-22)
                                                v
                                     [invitations table + /data/photos]
```

### Recommended Project Structure
```
backend/app/
├── routers/
│   └── notifications.py     # GET /api/notifications, POST /api/notifications/read
├── schemas/
│   └── notification.py      # Pydantic response model for the list endpoint
├── tasks/
│   └── cleanup.py           # run_cleanup() — invitation + notification sweep, advisory lock
└── main.py                  # lifespan: scheduler.add_job(run_cleanup, "interval", hours=1)

frontend/src/
├── components/
│   ├── NotificationBell.jsx   # heart icon + red dot + bounce, owns panel open/closed state
│   ├── NotificationPanel.jsx  # dropdown, empty state, scroll
│   └── NotificationRow.jsx    # single row: name/title/message/relative time, unread tint
└── pages/
    └── DashboardPage.jsx       # owns the 30s poll (D-14), mounts <NotificationBell />
```

### Pattern 1: APScheduler wired into the existing FastAPI lifespan
**What:** A module-level `AsyncIOScheduler` instance, started and shut down inside the `lifespan` context manager already present in `backend/app/main.py`.
**When to use:** Any in-process periodic job that must run once per container, on the FastAPI event loop, with no separate process.
**Example:**
```python
# backend/app/main.py — extend the existing lifespan
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.tasks.cleanup import run_cleanup

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.PHOTO_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    scheduler.add_job(run_cleanup, "interval", hours=1, id="cleanup_sweep")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)
```
`AsyncIOScheduler` runs on the same asyncio event loop as Uvicorn; `add_job` accepts a coroutine function directly (APScheduler 3.x detects `iscoroutinefunction` and schedules it on the running loop — no `asyncio.run()` wrapper needed). [ASSUMED — training knowledge on APScheduler 3.x async job support; not verified against apscheduler's official docs in this session due to no web-search access, only WebFetch to PyPI's JSON metadata endpoint.]

### Pattern 2: Transaction-scoped advisory lock (not session-scoped)
**What:** Use `pg_try_advisory_xact_lock(key)` instead of `pg_try_advisory_lock(key)` to guard the cleanup body.
**When to use:** Whenever an advisory lock is acquired through a pooled connection (SQLAlchemy's `async_sessionmaker` hands out connections from a pool of size 5 + overflow 10, per `database.py`).
**Why:** `pg_try_advisory_lock` is session-scoped — it must be released with `pg_advisory_unlock` on the *exact same* physical connection that acquired it, or explicitly on session close. Under a connection pool, a session's connection can be checked back in and reused for something else before an explicit unlock runs (e.g., if an exception path forgets the `finally`), silently leaking the lock until the physical connection drops. `pg_try_advisory_xact_lock` auto-releases at `COMMIT`/`ROLLBACK` of the enclosing transaction — matching D-19's own framing ("the lock is local to the job function") with no manual unlock bookkeeping required.
**Example:**
```python
# backend/app/tasks/cleanup.py
from sqlalchemy import text
from app.core.database import async_session_factory

CLEANUP_LOCK_KEY = 727100401  # arbitrary fixed int64; Claude's discretion (D-19 discretion note)

async def run_cleanup() -> None:
    async with async_session_factory() as db:
        acquired = (
            await db.execute(text("SELECT pg_try_advisory_xact_lock(:k)"), {"k": CLEANUP_LOCK_KEY})
        ).scalar()
        if not acquired:
            logger.info("cleanup: lock held by another instance, skipping this tick")
            return
        await _delete_expired_invitations(db)
        await _delete_old_notifications(db)
        await db.commit()  # releases the xact lock automatically
```
[ASSUMED — PostgreSQL advisory lock semantics are well-documented core Postgres behavior (session-scoped vs. transaction-scoped lock functions), drawn from training knowledge; not re-verified against postgresql.org docs in this session.]

### Pattern 3: Single `DELETE ... RETURNING` for invitation expiry (answers the "batch vs. iterate" discretion point)
**What:** One bulk `DELETE` statement that both removes the rows and returns the `photo_filename` column, so no separate `SELECT` is needed and the filesystem step is the only per-row loop.
**When to use:** Any cleanup where the DB delete is uniform (a `WHERE` clause) but a per-row side effect (file deletion) is still required.
**Example:**
```python
from sqlalchemy import delete
from datetime import datetime, timezone
from pathlib import Path
import os
from app.models.invitation import Invitation
from app.core.config import settings

async def _delete_expired_invitations(db) -> None:
    now = datetime.now(timezone.utc)
    stmt = delete(Invitation).where(Invitation.expires_at < now).returning(Invitation.photo_filename)
    result = await db.execute(stmt)
    filenames = result.scalars().all()
    for filename in filenames:
        path = Path(settings.PHOTO_STORAGE_PATH) / filename
        try:
            if path.exists():
                os.remove(path)
        except OSError as e:
            logger.warning("cleanup: failed to remove photo %s: %s", filename, e)
            # swallow per D-22 — DB row is already gone, sweep continues
```
Notification retention (D-07/D-21) has no filesystem side effect, so it can be a plain bulk delete with no `RETURNING`:
```python
from app.models.notification import Notification

async def _delete_old_notifications(db) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    await db.execute(delete(Notification).where(Notification.created_at < cutoff))
```
[VERIFIED: SQLAlchemy 2.0 `delete()` construct with `.returning()` is documented core ORM-enabled bulk DML — confirmed from training knowledge of SQLAlchemy 2.0's `Delete.returning()` API; this specific behavior was not re-fetched from docs.sqlalchemy.org in this session, so treat the *syntax* as CITED-level confidence, not independently re-verified.]

### Pattern 4: Frontend polling scoped to the dashboard's lifetime
**What:** `setInterval` started in a `useEffect` with an empty (or auth-token) dependency array, cleared on unmount.
**When to use:** D-13/D-14 — polling must start on `DashboardPage` mount and stop on unmount, not live in a shared context.
**Example:**
```jsx
// frontend/src/pages/DashboardPage.jsx (or a useNotifications hook it calls)
useEffect(() => {
  let cancelled = false;
  const token = localStorage.getItem("ohyes_token");

  async function poll() {
    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("ohyes_token");
        navigate("/");
        return;
      }
      if (res.ok && !cancelled) setNotifications(await res.json());
    } catch {
      // network error: ignored silently, retried next tick (D-17)
    }
  }

  poll();
  const id = setInterval(poll, 30000);
  return () => {
    cancelled = true;
    clearInterval(id);
  };
}, [navigate]);
```

### Pattern 5: One-shot bounce triggered by unread-count delta
**What:** Compare the previous unread count to the newly polled unread count; if it increased, trigger Motion's spring animation once, not on every poll.
**Example:**
```jsx
const prevUnreadRef = useRef(0);
const [bounce, setBounce] = useState(false);

useEffect(() => {
  const unread = notifications.filter((n) => !n.is_read).length;
  if (unread > prevUnreadRef.current) setBounce(true);
  prevUnreadRef.current = unread;
}, [notifications]);

// In NotificationBell.jsx:
<motion.div
  animate={bounce ? { scale: [1, 1.3, 0.9, 1.1, 1] } : {}}
  transition={{ type: "spring", stiffness: 400, damping: 10 }}
  onAnimationComplete={() => setBounce(false)}
>
  <Heart size={20} className={unreadCount > 0 ? "text-accent" : "text-text-secondary"} />
</motion.div>
```

### Anti-Patterns to Avoid
- **Per-row `DELETE` in a Python loop for invitation expiry:** issues N round trips to Postgres and N calls to `os.remove` inside the same loop, holding a DB transaction open for the duration of filesystem I/O. Use the single `RETURNING` delete (Pattern 3) instead — filesystem I/O happens after the DB transaction commits.
- **`pg_try_advisory_lock` (session-scoped) with a pooled `AsyncSession`:** risks a stuck lock if the connection is recycled before an explicit unlock runs. Use `pg_try_advisory_xact_lock` (Pattern 2).
- **Polling logic in a shared `NotificationContext`:** D-14 explicitly rejects this — polling must start/stop with `DashboardPage`'s own mount lifecycle, not persist across routes.
- **Per-notification mark-read endpoint:** D-08 requires one bulk call on panel open, not N calls for N unread rows.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative timestamps ("2 hours ago") | Custom diff-and-format string logic | `Intl.RelativeTimeFormat` (browser built-in) | Locked in `04-UI-SPEC.md` line 32 — no `date-fns`/`dayjs`; the Intl API handles pluralization and locale (zh-TW vs en) natively, which matters for this bilingual app |
| Periodic background job | A custom `while True: await asyncio.sleep(3600)` loop in `lifespan` | `AsyncIOScheduler.add_job(..., "interval", hours=1)` | APScheduler handles job misfire policy, jitter, and clean shutdown; a hand-rolled sleep loop can't be cancelled cleanly on `lifespan` teardown and has no built-in single-flight protection |
| Cross-instance mutual exclusion | Redis lock, file lock, or "check a DB row and hope" | `pg_try_advisory_xact_lock` | Already have Postgres; advisory locks are purpose-built for exactly this and need zero new infrastructure — this is the entire point of D-19 |

**Key insight:** Every "don't hand-roll" item in this phase already has a zero-new-infrastructure answer available (Postgres advisory locks, browser Intl API, APScheduler's own interval trigger) — the temptation to hand-roll here would only add code, not capability.

## Common Pitfalls

### Pitfall 1: Session-scoped advisory lock leaks under connection pooling
**What goes wrong:** Using `pg_try_advisory_lock` (not the `_xact_` variant) means the lock is tied to the physical connection, not the transaction. If the code path that releases it is skipped (exception before `finally`, or the session is closed without an explicit unlock), the lock stays held by that connection in the pool until the connection itself is dropped — silently freezing the cleanup job forever on future ticks.
**Why it happens:** Session-scoped lock semantics are a common Postgres gotcha that doesn't matter until you introduce connection pooling.
**How to avoid:** Use `pg_try_advisory_xact_lock`, which auto-releases at `COMMIT`/`ROLLBACK` — no manual unlock path to get wrong.
**Warning signs:** Cleanup job logs "lock held by another instance" on every tick even though only one container is running.

### Pitfall 2: `datetime.now()` (naive) compared against `DateTime(timezone=True)` columns
**What goes wrong:** `Invitation.expires_at` and `Notification.created_at` are `DateTime(timezone=True)`. Comparing them against a naive `datetime.now()` either raises or silently compares in the wrong timezone.
**Why it happens:** Easy to type `datetime.now()` instead of `datetime.now(timezone.utc)` out of habit.
**How to avoid:** The existing codebase already does this correctly in `invitations.py` (`now = datetime.now(timezone.utc)`) — mirror that exact pattern in `tasks/cleanup.py`.
**Warning signs:** Cleanup deletes nothing, or deletes everything, depending on server local timezone.

### Pitfall 3: Bulk-deleting invitations without capturing `photo_filename` first
**What goes wrong:** If the cleanup deletes invitation rows and only *afterward* tries to figure out which photos to remove, the filenames are gone — there's no way to know which files on `/data/photos` belonged to the deleted rows.
**Why it happens:** Natural instinct is "delete row, then delete file" per-row (as `delete_invitation` already does), which doesn't obviously generalize to a bulk sweep.
**How to avoid:** Use `DELETE ... RETURNING photo_filename` (Pattern 3) so the filenames are captured in the same statement that deletes the rows.
**Warning signs:** Orphaned photo files accumulate on the Railway volume with no corresponding DB row (the inverse of the acceptable "orphaned row" tradeoff the codebase already accepts).

### Pitfall 4: APScheduler running twice under `uvicorn --reload` or multi-worker config
**What goes wrong:** If Uvicorn is ever configured with `--workers > 1` (or `--reload` spawns a reloader + worker process pair), each process starts its own `AsyncIOScheduler` instance and each independently fires the hourly job — exactly the multi-instance race D-19's advisory lock is designed to catch, but worth calling out explicitly since Railway's current single-container deployment could still run multiple Uvicorn workers within that one container.
**Why it happens:** `lifespan` runs once per Python process, not once per deployment.
**How to avoid:** The advisory lock (Pattern 2) already covers this — verify the cleanup log line ("lock held by another instance, skipping this tick") appears if a second worker is ever configured, confirming the guard is working rather than assuming single-worker forever.
**Warning signs:** Cleanup log lines appear twice per hour instead of once.

### Pitfall 5: Test DB pollution without transaction-rollback fixtures (WR-007)
**What goes wrong:** The existing `client` fixture in `backend/tests/conftest.py` uses the app's real `get_db` dependency with no isolation — any seeded test data (an `Invitation` row created to test `respond_to_invitation`) persists after the test unless manually cleaned up, and parallel test runs would collide.
**Why it happens:** The stub tests (`test_respond_creates_notification_and_deletes_invitation`, `test_verify_correct_password_returns_200`) were left empty in Phase 3 precisely because this fixture infrastructure doesn't exist yet.
**How to avoid:** Add a `db_session` fixture that opens a connection, begins a transaction, overrides `get_db` to yield a session bound to that connection, and rolls back the transaction after the test (see Code Examples). This is the standard SQLAlchemy async testing pattern for isolating tests against a real Postgres instance without needing a separate test database per run.
**Warning signs:** Tests pass individually but fail when run together (leftover rows from a previous test's seed data).

## Code Examples

### Test DB fixture unblocking WR-007
```python
# backend/tests/conftest.py — addition
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.core.database import engine, get_db


@pytest.fixture
async def db_session():
    """Open a connection, begin a transaction, and roll it back after the test
    so seeded rows (invitations, notifications) never leak between tests."""
    async with engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        yield session
        await session.close()
        await conn.rollback()
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
async def client(db_session):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
```
[ASSUMED — this is a widely-used SQLAlchemy async testing pattern (join-a-transaction / rollback-after-test), drawn from training knowledge. Not re-verified against SQLAlchemy's official testing documentation in this session due to no web-search access.]

### Notification list + mark-read endpoints
```python
# backend/app/routers/notifications.py
from fastapi import APIRouter, Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    return result.scalars().all()


@router.post("/read")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "Notifications marked read"}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Lazy expiry (filter expired rows out of queries, never actually delete) | Active hourly deletion via scheduled job | This phase (D-18) | Satisfies INV-07's "fully deleted (data + photo)" requirement; lazy filtering was already implemented in Phase 2/3 but never deleted anything |

**Deprecated/outdated:** None specific to this phase — APScheduler 3.x remains the current stable line; the 4.0 alpha exists but is not production-ready (still in `a6` pre-release as of the version checked).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `AsyncIOScheduler.add_job()` accepts an `async def` function directly and schedules it on the running event loop without extra wrapping | Architecture Patterns, Pattern 1 | If wrong, the job would need wrapping in `asyncio.ensure_future` or a sync wrapper — a quick fix during implementation, not a design-level risk |
| A2 | PostgreSQL advisory lock session- vs. transaction-scoped semantics as described (`pg_try_advisory_lock` needs matching connection; `pg_try_advisory_xact_lock` auto-releases at commit) | Architecture Patterns, Pattern 2; Common Pitfalls, Pitfall 1 | If wrong, could either leave the lock model insufficiently safe under pooling, or over-engineer something Postgres already handles more simply — verify with a quick local Postgres test (`SELECT pg_try_advisory_xact_lock(1);` in two separate `psql` sessions) before trusting in production |
| A3 | SQLAlchemy 2.0 `delete(Model).where(...).returning(Model.column)` is valid syntax for async execution via `AsyncSession.execute()` | Architecture Patterns, Pattern 3 | If the exact `.returning()` chaining differs, a fallback `SELECT` then `DELETE` in two statements still works, just costs one extra round trip |
| A4 | The SQLAlchemy async test fixture pattern (connection + transaction + rollback + `dependency_overrides`) as shown works cleanly with `asyncpg` and the project's existing `async_sessionmaker` config | Code Examples | If wrong, tests may need a lighter approach (e.g., truncate tables in a fixture teardown instead of transaction rollback) — moderate risk, would need debugging during Wave 0 |

**If this table is empty:** N/A — see rows above. All are technical implementation-detail assumptions, not requirements-level assumptions; nothing here touches user-facing behavior (which is fully locked by D-01 through D-23).

## Open Questions

1. **Does APScheduler 3.11.x need any extra configuration for coroutine jobs, or does `AsyncIOScheduler` handle it out of the box?**
   - What we know: `AsyncIOScheduler` is designed specifically for asyncio-based apps and is documented to accept coroutine functions as jobs.
   - What's unclear: exact behavior/version history was not re-verified against apscheduler's official docs in this session (no web-search access; only a PyPI metadata WebFetch succeeded).
   - Recommendation: Wave 0 should include a throwaway smoke test — register a job with `add_job(..., "interval", seconds=2)` in a scratch script, confirm it fires via a log line, before wiring the real cleanup logic.

2. **Should `GET /api/notifications` defensively filter out notifications older than 30 days, or fully trust the hourly sweep?**
   - What we know: D-06 says "all non-expired notifications" and D-07/D-21 delete them hourly, so at most ~1 hour of overshoot is possible between sweeps.
   - What's unclear: whether "non-expired" in D-06 implies the endpoint itself must also filter defensively (belt-and-suspenders) or whether relying purely on the sweep is acceptable.
   - Recommendation: Rely on the sweep alone (simpler, one less thing to keep in sync) — the ≤1 hour overshoot window is well within the spirit of D-06/D-07 and matches D-23's precedent of trusting the backend job over client-side filtering for invitations.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Advisory lock, notification/invitation storage | Assumed available in Railway prod; not probed locally in this sandbox (no live DB connection attempted) | 16 (per CLAUDE.md) | — |
| `uv` (package manager) | `apscheduler` install | ✓ (uv.lock present in `backend/`) | — | — |
| Node/npm tooling for frontend | No new frontend deps needed this phase | N/A | — | — |
| Network egress (WebSearch/npm/pip) | Version verification, docs lookup | ✗ — WebSearch tool blocked by org policy in this session; `pip`/`npm` not present in this sandbox; `WebFetch` to pypi.org succeeded | — | Used `WebFetch` against PyPI's JSON API directly as the sole verification channel |

**Missing dependencies with no fallback:** None blocking — the one dependency this phase adds (`apscheduler`) was verified via WebFetch to PyPI, and the ecosystem-standard `uv add apscheduler` will pin the resolved version at install time.

**Missing dependencies with fallback:** WebSearch tool unavailable this session (org policy blocks `web_search` for this model) — fell back to direct `WebFetch` calls against PyPI's JSON API, which was sufficient for package version verification but should be supplemented with an official APScheduler docs read (Context7 or `apscheduler.readthedocs.io`) during implementation if Open Question 1 needs resolving.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.0.3 + pytest-asyncio 1.3.0 (`asyncio_mode = "auto"`) |
| Config file | `backend/pyproject.toml` (`[tool.pytest.ini_options]`) |
| Quick run command | `cd backend && uv run pytest tests/test_notifications.py tests/test_cleanup.py -x` |
| Full suite command | `cd backend && uv run pytest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTF-01 | Heart indicator shows red dot when unread notifications exist | unit (backend: list endpoint returns correct `is_read` flags) + manual (frontend: dot renders/bounces) | `uv run pytest tests/test_notifications.py::test_list_returns_unread -x` | ❌ Wave 0 |
| NOTF-02 | `GET /api/notifications` returns name/title/message/timestamp, ownership-scoped | unit | `uv run pytest tests/test_notifications.py::test_list_scoped_to_owner -x` | ❌ Wave 0 |
| NOTF-03 | `POST /api/notifications/read` marks all unread rows read for that user only | unit | `uv run pytest tests/test_notifications.py::test_mark_all_read -x` | ❌ Wave 0 |
| INV-07 | Hourly sweep deletes invitations past `expires_at` and their photo file; notifications past 30 days | unit (sweep logic against seeded rows) | `uv run pytest tests/test_cleanup.py::test_sweep_deletes_expired_invitation_and_photo -x` | ❌ Wave 0 |
| INV-07 | Advisory lock prevents a second concurrent sweep from double-processing | unit (mock: acquire lock in one session, assert second call returns False) | `uv run pytest tests/test_cleanup.py::test_advisory_lock_blocks_concurrent_run -x` | ❌ Wave 0 |
| (WR-007 debt) | `respond_to_invitation` creates a notification and deletes the invitation + photo | integration (unstub the existing test) | `uv run pytest tests/test_invitation_respond.py::test_respond_creates_notification_and_deletes_invitation -x` | ✅ stub exists, needs fixture (Wave 0) |

### Sampling Rate
- **Per task commit:** quick run command above
- **Per wave merge:** full suite command
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/conftest.py` — add the `db_session` transaction-rollback fixture (Code Examples) so seeded-row tests don't pollute each other
- [ ] `backend/tests/test_notifications.py` — new file covering NOTF-01/02/03
- [ ] `backend/tests/test_cleanup.py` — new file covering INV-07 sweep logic + advisory lock behavior
- [ ] Unstub `test_respond_creates_notification_and_deletes_invitation` and `test_verify_correct_password_returns_200` (WR-007) using the new fixture
- [ ] Framework install: `cd backend && uv add apscheduler` (also add to dev/test deps if `tasks/cleanup.py` is imported directly in tests)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (indirect) | Existing JWT bearer scheme (`get_current_user`) reused unchanged — no new auth surface introduced |
| V3 Session Management | no | No session changes in this phase |
| V4 Access Control | yes | `GET /api/notifications` and `POST /api/notifications/read` MUST scope every query by `Notification.user_id == current_user.id` — a creator must never see or mark-read another user's notifications. This is the single most important access-control check for this phase. |
| V5 Input Validation | no (minimal) | No new user-supplied input in this phase — notification content was already validated in Phase 3's `respond_to_invitation` (30-char message limit) |
| V6 Cryptography | no | Not applicable — no new secrets, tokens, or hashing in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on notification list/mark-read (creator A reads/marks creator B's notifications) | Information Disclosure / Tampering | Filter every query by `Notification.user_id == current_user.id`; never accept a `user_id` from the request body/query string |
| Advisory-lock key collision with an unrelated future use of the same integer key | Denial of Service (self-inflicted) | Use a distinctive, documented fixed constant (e.g., a value derived from a project-specific string via a stable hash, or a clearly-commented magic number) so a future feature doesn't accidentally reuse the same lock key and block cleanup |
| Cleanup job silently never running (scheduler fails to start, or advisory lock permanently stuck) | Denial of Service (data never expires — a privacy/compliance concern given INV-07 is a stated product guarantee) | Log a clear line on every sweep (run start, rows deleted, lock skip) so a stuck scheduler is observable in Railway logs, not silent |

## Sources

### Primary (HIGH confidence)
- PyPI JSON API (`pypi.org/pypi/apscheduler/json`) via WebFetch — apscheduler version 3.11.3, published 2026-06-28
- Direct codebase reads: `backend/app/models/notification.py`, `backend/app/models/invitation.py`, `backend/app/routers/invitations.py`, `backend/app/main.py`, `backend/app/core/database.py`, `backend/alembic/versions/a7c2e1f39b04_create_notifications_table.py`, `backend/tests/*.py`, `backend/pyproject.toml`, `frontend/package.json`, `frontend/src/pages/DashboardPage.jsx`, `.planning/phases/04-notifications-invitation-lifecycle/04-CONTEXT.md`, `.planning/phases/04-notifications-invitation-lifecycle/04-UI-SPEC.md` (grep), `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json`

### Secondary (MEDIUM confidence)
- None — WebSearch tool was unavailable this session (org policy: `web_search` feature disallowed for this model in this environment)

### Tertiary (LOW confidence)
- APScheduler `AsyncIOScheduler` coroutine-job behavior (Pattern 1) — training knowledge, not re-verified against official apscheduler docs this session
- PostgreSQL advisory lock session-vs-transaction scoping (Pattern 2, Pitfall 1) — training knowledge of core Postgres behavior, not re-verified against postgresql.org docs this session
- SQLAlchemy async test fixture pattern (transaction + rollback) — training knowledge, not re-verified against SQLAlchemy's official testing cookbook this session

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — apscheduler version verified live via PyPI; all frontend deps already installed and confirmed via `package.json` grep; no new frontend deps needed per UI-SPEC
- Architecture: HIGH for what touches existing code (verified by direct file reads); MEDIUM for the specific APScheduler/advisory-lock code patterns (ASSUMED — no web-search access this session to cross-check against official docs)
- Pitfalls: MEDIUM — grounded in well-known Postgres/SQLAlchemy/asyncio behavior but not independently re-verified against official docs in this session due to environment network restrictions

**Research date:** 2026-08-02
**Valid until:** 30 days (stable stack, no fast-moving dependencies) — but re-verify Pitfall 1/2 and Pattern 1/2 code against official APScheduler and PostgreSQL docs during Wave 0 if network access is available then, since this session's WebSearch tool was blocked by org policy.
