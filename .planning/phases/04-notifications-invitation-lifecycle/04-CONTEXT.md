# Phase 4: Notifications & Invitation Lifecycle - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the creator feedback loop. The creator sees a heart icon with a red dot in the dashboard top bar when a recipient says Yes, opens a dropdown panel to read "[Name] said yes to your [title]" with the recipient's 30-character message, and the act of opening marks everything read. Separately, a scheduled in-process cleanup job finally makes INV-07 real: expired invitations (DB row + photo file on the Railway volume) are actually deleted, not merely filtered out of queries.

Requirements in scope: NOTF-01, NOTF-02, NOTF-03, INV-07

**Scope change ratified during this discussion:** NOTF-V2-02 (notification retention — auto-delete after 30 days) is pulled forward from v2 into this phase. Rationale: Phase 4 already builds the APScheduler cleanup job for INV-07, so adding a second DELETE statement to the same job costs almost nothing, versus standing up a scheduler again in v2. `gsd-planner` must update `.planning/REQUIREMENTS.md` — move NOTF-V2-02 out of the v2 list into v1 Notification requirements and add it to the traceability table under Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Notification Surface & Layout
- **D-01:** Notifications live in a **top bar icon + dropdown panel**, not an inline dashboard section and not a dedicated route. The top bar already exists in `DashboardPage.jsx` and the panel does not push the invitation cards down.
- **D-02:** The indicator is a **heart icon (lucide-react) with a small red dot** in its top-right corner. No numeric badge — PROJECT.md describes a "red dot/heart indicator" and v1 volume never justifies a count.
- **D-03:** Each notification row shows **all four fields plus time**: "[recipient_name] said yes to your '[invitation_title]'", the 30-character message rendered as a quote, and a relative timestamp ("2 hours ago").
- **D-04:** Empty panel shows **friendly empty-state copy** (tone consistent with the Phase 1 dashboard empty state). The icon stays clickable at all times — it is never disabled or hidden, so the creator can always revisit past notifications.
- **D-05:** On mobile (375px) the panel is a **full-width dropdown** below the top bar (minus side padding); on desktop it is a fixed ~320-360px panel anchored under the icon. Same component, two widths — no bottom sheet, no full-screen overlay.
- **D-06:** The panel returns **all non-expired notifications, newest first**, with a max panel height and internal scroll. No pagination, no `limit` parameter — the 30-day TTL (D-07) already bounds growth.

### Notification Retention
- **D-07:** Notifications are **auto-deleted 30 days after `created_at`**, handled by the same scheduled job as INV-07. This implements NOTF-V2-02 ahead of schedule. No new column needed — `created_at` already exists on the model. — **Reversibility:** one-way — deleted notification rows carry recipient messages that exist nowhere else (the invitation was already destroyed on respond). Once the job runs, that content is unrecoverable. Confirm the 30-day window before the cleanup job first runs in production.

### Read Interaction
- **D-08:** **Opening the panel marks everything read** — one call, no per-item clicks, no separate "mark all read" button. The red dot clears immediately.
- **D-09:** Items unread at the moment of opening **keep their highlight for that panel session** (left accent bar or faint tint) so the creator can see which ones are new; they render in the plain style on the next open. Read state is visual only — nothing is hidden or moved.
- **D-10:** A failed mark-read request **fails silently** — optimistically clear the dot, no toast, no revert. This is a background action the user did not initiate, and the dot naturally reappears on the next fetch. (Deliberately different from the existing delete/copy flows, which do toast on failure.)
- **D-11:** **No multi-tab / multi-device read-state sync.** A second open tab clears its own dot on its next 30-second poll.
- **D-12:** **`document.title` does not reflect unread state** — the dashboard title stays "Dashboard - OhYes". The top bar dot is the only indicator.

### New-Notification Detection
- **D-13:** **Polling, every 30 seconds.** The creator waiting for a response is the emotional peak of the product, so the dot should appear on its own without a manual refresh. Consistent with CLAUDE.md's exclusion of WebSockets for v1.
- **D-14:** Polling runs **on the dashboard only** — starts on mount, stops on unmount. Not on `/create` (form focus) and not lifted into a shared context.
- **D-15:** Each poll fetches the **full notification list** (`GET /api/notifications`); the frontend derives the unread count. One endpoint, and the panel opens instantly with data already in hand — no loading state on open.
- **D-16:** When the dot appears, the heart icon does a **one-shot spring bounce** (Motion). No toast, no sound.
- **D-17:** Poll failures: **401 clears localStorage and redirects to the landing page** (consistent with Phase 1 D-03's 401 handling); network errors are ignored silently and retried on the next tick. No backoff, no circuit breaker.

### Expiry Cleanup (INV-07)
- **D-18:** Cleanup runs as an **APScheduler `AsyncIOScheduler` started in the FastAPI `lifespan`** (`backend/app/main.py` already has a lifespan hook). `apscheduler` is not yet in `backend/pyproject.toml` and must be added. Lazy deletion on query was rejected — a creator who stops logging in would leave photos on the volume forever, which does not satisfy INV-07.
- **D-19:** **v1 runs a single backend container mounting the Railway volume — horizontal scaling is explicitly deferred to the next milestone** (see Deferred Ideas). Even so, the job wraps each run in a PostgreSQL advisory lock (`pg_try_advisory_lock` with a fixed key); an instance that cannot acquire the lock skips that tick. Roughly five lines and zero new infrastructure, and it means the scheduler needs no revisiting when the Storage Buckets migration unlocks multiple replicas. Do not ship a scheduler that silently assumes a single instance. — **Reversibility:** reversible — the lock is local to the job function.
- **D-20:** Cleanup runs **hourly**. Both TTLs (7-day invitation, 30-day notification) are far coarser than an hour, and hourly keeps the debug feedback loop short.
- **D-21:** Each run does two things: delete invitations where `expires_at < now()` **plus their photo files**, and delete notifications where `created_at < now() - 30 days`.
- **D-22:** **Photo deletion failures are logged and swallowed** — the DB row is deleted regardless and the job continues to the next record. This matches the existing tradeoff in `delete_invitation` (`invitations.py:184-192`): an orphaned file is less severe than an orphaned row, and one bad file must not stall the whole sweep.
- **D-23:** Expired invitations **disappear silently** from the creator's dashboard — no "expired" card state. The list endpoint already filters on `expires_at > now` and the cards already show a days-remaining countdown (Phase 2 D-11), so the creator has advance warning and is not ambushed. No backend change needed for this.

### Claude's Discretion
- Notification API shape — routes, response schemas, whether mark-read is `POST /api/notifications/read` or a PATCH; ownership scoping via the existing `get_current_user` dependency
- Component decomposition for the panel (single component vs. bell + panel + row split) and where polling state lives
- Exact empty-state copy, relative-time formatting approach, and i18n keys for `en.json` / `zh-TW.json`
- Visual specifics of the unread highlight, dot size/placement, panel shadow and open/close behavior (click-outside, Escape) — consistent with the Phase 1-3 playful tone
- Advisory lock key value and the job's logging format
- Whether the hourly sweep batches deletes or iterates per row

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `.planning/REQUIREMENTS.md` — NOTF-01, NOTF-02, NOTF-03, INV-07 acceptance criteria; also NOTF-V2-02 (line 66), which D-07 pulls forward into this phase and which this phase must reclassify
- `.planning/PROJECT.md` — Constraints (7-day TTL, 30-character message limit, max 2 active invitations); Active requirements list
- `CLAUDE.md` — Technology stack: APScheduler for scheduled tasks (no Celery/Redis), no WebSockets for v1, Railway volume mount constraints, Tailwind v4, Motion 12.x, react-i18next

### Prior Phase Context
- `.planning/phases/01-foundation-authentication/01-CONTEXT.md` — D-03 (JWT 24h TTL, frontend must handle 401 by clearing localStorage and redirecting), D-07 (dashboard top bar composition)
- `.planning/phases/02-invitation-creation-management/02-CONTEXT.md` — D-11 (dashboard card shows expiry countdown), D-18 (server/network errors shown as toast)
- `.planning/phases/03-recipient-experience/03-CONTEXT.md` — D-10 (respond endpoint deletes invitation and notifies creator)
- `.planning/phases/03-recipient-experience/03-UI-SPEC.md` — established UI patterns and design tokens

### Key Existing Code
- `backend/app/models/notification.py` — Notification model already exists (built in Phase 3). Fields: `user_id`, `invitation_title`, `recipient_name`, `recipient_message`, `is_read`, `created_at`. **No schema change needed** for D-01 through D-12.
- `backend/app/routers/invitations.py:250-290` — `respond_to_invitation` already creates the Notification row and deletes the invitation + photo. This is the producer side; Phase 4 builds only the consumer side.
- `backend/app/routers/invitations.py:184-192` — the existing DB-first-then-file deletion ordering that D-22 mirrors
- `backend/app/main.py:15-19` — existing `lifespan` context manager where the scheduler will be started
- `frontend/src/pages/DashboardPage.jsx:86-116` — the top bar the heart icon plugs into

### Outstanding Phase 3 Debt (relevant to this phase)
- `.planning/HANDOFF.json` — blocker WR-007: `test_respond_creates_notification` is an empty stub awaiting test DB fixture infrastructure. That test covers the exact producer path this phase consumes; implementing the notification test fixtures here is a natural fit.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/app/models/notification.py` — model complete, no migration needed for the notification feature itself
- `backend/app/core/security.py` — `get_current_user` FastAPI dependency for scoping notifications to the owner
- `frontend/src/components/Toast.jsx` — available, but D-10 deliberately does not use it for mark-read failures
- `frontend/src/components/LoadingSpinner.jsx` — available, though D-15 means the panel needs no loading state
- `motion` v12.38.0 — installed; used for the D-16 bounce and panel open/close
- `lucide-react` — installed; provides the Heart icon
- `frontend/src/i18n/en.json`, `zh-TW.json` — existing translation files to extend

### Established Patterns
- JWT Bearer token via `Authorization` header, `VITE_API_URL` for all API calls (frontend and backend are on separate Railway domains)
- SQLAlchemy 2.0 async with asyncpg; routers under `backend/app/routers/`, Pydantic schemas under `backend/app/schemas/`
- react-i18next `useTranslation()` for every user-facing string
- Tailwind CSS v4 utility classes with the existing token names (`bg-cream`, `text-text-primary`, `bg-accent`, `border-border`)

### Integration Points
- `backend/app/main.py` — register a new notifications router and start the scheduler in `lifespan`
- New `backend/app/routers/notifications.py` and `backend/app/schemas/notification.py`
- New cleanup module (e.g. `backend/app/tasks/cleanup.py`) invoked by the scheduler
- `backend/pyproject.toml` — add `apscheduler`
- `frontend/src/pages/DashboardPage.jsx` — mount the heart icon in the top bar and own the 30-second poll
- No Alembic migration required for notifications; verify whether the Phase 3 migration already created the `notifications` table

### Infrastructure Constraint Surfaced During Discussion
- CLAUDE.md records that a Railway volume can only be mounted by one active deployment. Photo upload (`invitations.py:130`), serving (`routers/photos.py`), deletion, and the Phase 4 cleanup job all depend on `/data/photos`. **This, not the scheduler, is what blocks scaling the backend beyond one replica** — additional replicas could neither store nor serve photos, breaking already-shipped Phase 2 and Phase 3 features.
- **Resolved for this milestone:** v1 stays on a single backend container with the volume mounted. The migration to Railway Storage Buckets, and the scale-up it enables, is scheduled for the next milestone. Phase 4 must not introduce anything that assumes multiple replicas — but D-19's advisory lock means the cleanup job will already be correct when they arrive.
- Live verification of the volume constraint against Railway's docs was not possible in this session (no network access). Confirm it when planning the Storage Buckets migration.

</code_context>

<specifics>
## Specific Ideas

- Notification copy pattern: "[Name] said yes to your '[title]'" with the recipient's message shown as a quote beneath it
- The creator waiting on the dashboard for a response is treated as the emotional peak of the product — this is why polling (D-13) beat load-only fetching, and why the heart bounces (D-16) rather than the dot appearing silently
- Recipient messages are treated as having sentimental value — this drove "show everything, scrollable" (D-06) over truncation, and the 30-day retention window (D-07) over 7 days
- The user explicitly wants headroom to scale the backend to 3 instances; the scheduler must not be the thing standing in the way (D-19)

</specifics>

<deferred>
## Deferred Ideas

- **Migrate photo storage from the Railway volume to Railway Storage Buckets — scheduled for the NEXT MILESTONE, decided by the user on 2026-07-30.** This is the prerequisite for scaling the backend beyond one replica. It overturns INFR-02 and CLAUDE.md's locked "Railway volume for photos" decision, and touches `backend/app/utils/photo.py`, `backend/app/routers/photos.py`, the create/delete/respond/cleanup paths, and the Dockerfile/Railway service config — plus a migration plan for photos already live in production. Tracked as INFR-V2-01 in `.planning/REQUIREMENTS.md`. Do not absorb into Phase 4 or anywhere else in v1.
- **Backend horizontal scale-up (target: 3 replicas)** — blocked on the above, same milestone. D-19 removes the scheduler as a blocker; nothing else in Phase 4 needs to change when this happens.
- **Manual per-notification delete/dismiss** — considered while discussing panel capacity, dropped once the 30-day TTL bounded growth. Not required by NOTF-01/02/03.
- **Notification when an invitation expires unanswered** — considered for the expiry-visibility decision (D-23), rejected as a new capability outside NOTF-01/02/03.
- **Email notification (NOTF-V2-01)** — remains in v2; untouched by this phase.

</deferred>

---

*Phase: 04-notifications-invitation-lifecycle*
*Context gathered: 2026-07-30*
