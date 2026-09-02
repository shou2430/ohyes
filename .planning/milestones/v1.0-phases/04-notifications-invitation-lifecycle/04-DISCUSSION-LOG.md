# Phase 4: Notifications & Invitation Lifecycle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 04-notifications-invitation-lifecycle
**Areas discussed:** Notification surface & layout, Read interaction, New-notification detection, Expiry cleanup & visibility

---

## Notification Surface & Layout

### Where notifications appear

| Option | Description | Selected |
|--------|-------------|----------|
| Top bar icon + dropdown panel | Heart/bell icon next to the avatar with a red dot; click to expand a dropdown. Present on all authenticated pages, doesn't consume dashboard real estate | ✓ |
| Inline dashboard section | A block above the invitation cards, visible without clicking, but only on /dashboard and pushes cards down | |
| Dedicated /notifications page | Maximum room, but v1 volume (max 2 invitations) doesn't justify a navigation layer | |

**User's choice:** Top bar icon + dropdown panel

### Indicator appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Heart icon + red dot | No count. Matches PROJECT.md's "red dot/heart indicator" wording and the product's playful tone | ✓ |
| Heart icon + numeric badge | More information, but the count will only ever be single digits and reads as a tool | |
| Heart color change + pulse | Outline heart → filled pink with a pulse. Most personality, but a persistent top-bar animation distracts | |

**User's choice:** Heart icon + red dot

### Notification row content

| Option | Description | Selected |
|--------|-------------|----------|
| Full content incl. time | "[Name] said yes to your '[title]'" + quoted 30-char message + relative timestamp. Uses all four model fields | ✓ |
| No timestamp | Cleanest, but the creator can't tell when it happened | |
| Title first, message collapsed | Tighter list, but a 30-char message is already short — an extra click isn't worth it | |

**User's choice:** Full content incl. time

### Empty state

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly empty-state copy | Panel stays openable, shows a line like "No one has said yes yet… soon". Consistent with the Phase 1 dashboard empty state | ✓ |
| Icon disabled | Avoids a pointless click, but users may think it's broken | |
| Icon hidden entirely | Cleanest, but the top bar shifts and there's no way back to past notifications | |

**User's choice:** Friendly empty-state copy

### Mobile rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width dropdown | Full width minus padding below the top bar on mobile; fixed ~320-360px under the icon on desktop. Same component, two widths | ✓ |
| Bottom sheet | More native feel, but needs a separate behavior + gesture-dismiss implementation | |
| Full-screen overlay | Maximum room, too heavy for at most a few notifications | |

**User's choice:** Full-width dropdown

### Notification retention (mid-discussion scope question)

**User's intervention:** Rather than answering the panel-capacity question directly, the user asked to first check the invitation quota rules, stating that notifications should in principle also expire and be deleted after some period.

**Research performed:**
- INV-05 / `invitations.py:35` — `MAX_ACTIVE_INVITATIONS = 2` is a *concurrency* cap checked against `expires_at > now`, not a per-week/month quota
- No rate limit of any kind exists
- Responding (Yes) deletes the invitation immediately (`invitations.py:282`), freeing a slot at once — so notification accumulation has no upper bound, only a slow practical rate
- `.planning/REQUIREMENTS.md:66` — NOTF-V2-02 "Notification retention policy (auto-delete after 30 days)" was deliberately scheduled for **v2**

This was surfaced to the user as a scope decision, with the note that Phase 4 is already building an APScheduler job for INV-07, making the marginal cost of a notification purge near zero.

| Option | Description | Selected |
|--------|-------------|----------|
| Delete after 30 days | Matches NOTF-V2-02 exactly, just pulled forward from v2 into Phase 4 | ✓ |
| Delete after 7 days | Aligns with invitation TTL, but a creator away for a week loses the message forever | |
| Keep forever (leave in v2) | Respects the current REQUIREMENTS.md, but the panel grows unbounded and v2 must rebuild scheduling | |
| Delete 30 days after read | Never lose an unread one, but needs a new `read_at` column and a migration | |

**User's choice:** Delete after 30 days
**Notes:** Ratified as a scope change into Phase 4. REQUIREMENTS.md must be updated to reclassify NOTF-V2-02 as a v1 requirement mapped to Phase 4.

### Panel capacity (resumed after the TTL decision)

| Option | Description | Selected |
|--------|-------------|----------|
| Show all, scrollable | API returns all non-expired notifications, newest first; panel scrolls internally. No pagination or limit param | ✓ |
| Also add a 20-item cap | Belt and braces, but accumulating 20 notifications within 30 days is practically impossible | |

**User's choice:** Show all, scrollable

---

## Read Interaction

### What counts as "read"

| Option | Description | Selected |
|--------|-------------|----------|
| Auto mark-all on panel open | One call on open, dot clears. Fewest clicks; at this volume nothing gets accidentally skipped | ✓ |
| Per-notification click | Most precise, but many clicks and users may not understand why the dot persists | |
| Explicit "mark all read" button | Clear intent, but an extra button users may never press | |

**User's choice:** Auto mark-all on panel open

### Post-read appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Keep highlight this session, dim next time | Items unread at open keep their accent for the current session so new ones are identifiable; plain style next open. Dot clears immediately | ✓ |
| Immediately all-read style | Simplest, but the user can't spot the one that just arrived | |
| Split into read/unread groups | Clearest information, but group headers outweigh the content at this volume | |

**User's choice:** Keep highlight this session, dim next time

### Mark-read failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fail silently | Optimistically clear the dot; on failure do nothing. Dot reappears on next load. No user-visible loss | ✓ |
| Show toast error | Consistent with existing delete/copy failures, but this is a background action the user didn't initiate | |
| Revert the red dot | Most honest state, but the dot flickering away and back is jarring | |

**User's choice:** Fail silently

### Multi-tab / multi-device sync

| Option | Description | Selected |
|--------|-------------|----------|
| No special handling | The other tab's dot clears on its next fetch. Single-user casual app — not worth the complexity | ✓ |
| Refetch on visibilitychange | Cheap and effective, but another event listener to maintain | |

**User's choice:** No special handling

### document.title unread indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Don't change title | Keep "Dashboard - OhYes". The dot suffices; title badging is a mail/chat convention and overwrought here | ✓ |
| Prefix with (1) when unread | Visible from other tabs, but only meaningful paired with polling | |

**User's choice:** Don't change title

---

## New-Notification Detection

### Detection mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Polling every 30-60s | Dot appears on its own while the creator waits — the product's emotional peak. CLAUDE.md already designates polling for v1 | ✓ |
| Fetch on page load only | Simplest, zero backend load, but requires a manual refresh to see anything | |
| On load + on tab refocus | Cheaper than polling, but never updates for a user staring at the page | |

**User's choice:** Polling

### Interval

| Option | Description | Selected |
|--------|-------------|----------|
| 30s | At most half a minute of lag; ~120 light queries/hour per user is nothing for the asyncpg pool | ✓ |
| 60s | Half the load, but a full minute feels long when watching for a response | |
| 15s | Effectively instant, but 240 requests/hour is wasteful for occasional notifications | |

**User's choice:** 30 seconds

### Polling scope

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard only | Starts on mount, stops on unmount. The creator waits on the dashboard; a dot popping up mid-form on /create would distract | ✓ |
| All authenticated pages | Consistent with the top bar's presence, but requires lifting polling into shared context for only two pages | |
| Dashboard + only while tab visible | Most frugal, but another visibilitychange layer to maintain | |

**User's choice:** Dashboard only

### Arrival cue

| Option | Description | Selected |
|--------|-------------|----------|
| Dot + one-shot bounce | Heart springs once (Motion) when the dot appears. Enough to catch the eye without interrupting | ✓ |
| Dot only, no animation | Most restrained, but easy to miss entirely | |
| Dot + toast popup | Impossible to miss, but Toast.jsx is currently an error affordance and would need a success variant | |

**User's choice:** Dot + bounce animation

### Poll payload

| Option | Description | Selected |
|--------|-------------|----------|
| Full list | GET /api/notifications every tick; frontend derives the unread count. One endpoint, panel opens with no loading state | ✓ |
| Unread count only | Smallest poll payload, but needs two endpoints and the panel flashes a loading state on open | |

**User's choice:** Full list

### Poll failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| 401 logout + silent retry on others | 401 clears localStorage and redirects (matches Phase 1 D-03); network errors ignored, retried next tick | ✓ |
| Silently ignore everything | Simplest, but polling keeps firing invalid requests after token expiry | |
| Stop polling after 3 consecutive failures | Most robust, but adds a state machine and won't restart when the backend recovers | |

**User's choice:** 401 logout + silent retry on others

---

## Expiry Cleanup & Visibility

### Cleanup trigger (user requested a re-comparison mid-question)

**User's first intervention:** asked for a fresh APScheduler vs Celery/Redis comparison rather than answering directly.

**Comparison presented, grounded in this phase's actual workload** (one hourly job, two DELETE statements, no retries, no task chaining, no fan-out):

| Dimension | APScheduler (in-process) | Celery + Redis |
|---|---|---|
| Extra services | 0 | +2 (Redis plugin, worker service) |
| Railway cost | 0 | Redis plugin + second container |
| New dependencies | `apscheduler`, no external connections | `celery`, `redis`, broker config |
| Deploy complexity | `scheduler.start()` in lifespan | Extra service definition, broker URL, worker health |
| Failure visibility | Logs only | Retries, acks, task results, Flower |
| Multi-instance duplicate runs | Known weakness | Immune by design |

**Decisive factor:** CLAUDE.md's infrastructure section records that only one active deployment can mount a Railway volume. A Celery worker as a separate Railway service could not mount `/data/photos`, so it could delete DB rows but not photo files — failing INV-07. The same constraint rules out a Railway Cron Job as a separate container. Recommendation given: raise APScheduler's confidence from Medium to High for this project.

**User's second intervention:** "我對 APScheduler 沒有意見，但是我不希望只啟動一個 fastapi 實例而是能夠 scale up 到三個" — no objection to APScheduler, but wants headroom to run 3 FastAPI instances rather than one.

**Analysis returned:** this splits into two independent problems.
1. *APScheduler duplicate runs across replicas* — solvable with a PostgreSQL advisory lock, ~5 lines, no new services, correct at any replica count.
2. *The photo volume* — the actual blocker, and larger than Phase 4. With 3 replicas only one mounts the volume; the other two fail on photo upload and serve 404s, breaking already-completed Phase 2 and Phase 3 features. Fixing it means migrating to object storage, overturning INFR-02 and touching photo.py, photos.py, and the create/delete/respond flows — a phase of its own.

Note: live verification against Railway's documentation was attempted but the environment has no network access; the volume constraint is quoted from CLAUDE.md and was flagged for confirmation before any scale-up.

| Option | Description | Selected |
|--------|-------------|----------|
| Scheduler multi-instance safe first | Phase 4's cleanup job adds a Postgres advisory lock from day one; object storage migration deferred to its own phase | ✓ |
| Migrate object storage now | Pull the S3/R2 migration into Phase 4 to unblock scaling immediately; scope and risk balloon | |
| No lock, stay single-instance | Least code, but the scheduler must be revisited at scale-up and it's easy to forget | |

**User's choice:** Scheduler multi-instance safe first

### Cleanup frequency

| Option | Description | Selected |
|--------|-------------|----------|
| Hourly | Disk freed within an hour of expiry; two DELETE queries are negligible. Matches CLAUDE.md's "single hourly cleanup job" | ✓ |
| Every 6 hours | Cheaper, but expired photos occupy disk up to 6 hours — little practical difference | |
| Daily | Lowest load, but a day-long debug feedback loop | |

**User's choice:** Hourly

### Creator-side expiry visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Silent disappearance (status quo) | Cards already show a days-remaining countdown (Phase 2 D-11), so there's advance warning. No backend change | ✓ |
| Show an "expired" card state | Clearest feedback, but requires changes to the list endpoint, card component, and quota counting, and conflicts with cleanup timing | |
| Emit a notification on expiry | Strongest feedback, but NOTF-01/02/03 only cover "said yes" — a new capability | |

**User's choice:** Silent disappearance

### Photo deletion failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Log and delete the DB row anyway | Matches the existing tradeoff in delete_invitation; one bad file doesn't stall the sweep | ✓ |
| Roll back the batch, retry next hour | Most consistent, but a single bad file permanently blocks cleanup | |
| Keep the DB row and retry next run | Eventually consistent, but an undeletable file pins that row forever | |

**User's choice:** Log and delete the DB row anyway

---

## Claude's Discretion

- Notification API shape (routes, schemas, mark-read verb), ownership scoping via `get_current_user`
- Component decomposition for the panel and where polling state lives
- Empty-state copy, relative-time formatting, i18n keys for `en.json` / `zh-TW.json`
- Visual specifics of the unread highlight, dot size/placement, panel shadow, click-outside/Escape behavior
- Advisory lock key value and job logging format
- Whether the hourly sweep batches deletes or iterates per row

## Deferred Ideas

- Migrate photo storage from Railway volume to object storage (S3 / Cloudflare R2) — the real prerequisite for horizontal scaling; overturns INFR-02; its own phase
- Backend scale-up to 3 replicas — blocked on the above; D-19 removes the scheduler as a blocker
- Manual per-notification delete/dismiss — dropped once the 30-day TTL bounded panel growth
- Notification when an invitation expires unanswered — new capability outside NOTF-01/02/03
- Email notification (NOTF-V2-01) — remains in v2
