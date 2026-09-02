---
phase: 04-notifications-invitation-lifecycle
plan: 03
subsystem: notifications
tags: [fastapi, sqlalchemy, react, notifications, polling, a11y, i18n]

# Dependency graph
requires:
  - phase: 04-notifications-invitation-lifecycle (04-02)
    provides: NotificationBell/NotificationPanel/NotificationRow tracer, GET /api/notifications, i18n scaffolding
provides:
  - "POST /api/notifications/read: owner-scoped bulk mark-all-read endpoint"
  - "30s dashboard poll with 401-redirect and silent network-error retry"
  - "NotificationBell: highlightedIds snapshot-before-mark ordering, literal showDot formula, one-shot bounce"
  - "NotificationPanel: highlightedIds prop, focus-on-open into scroll region, responsive origin classes for D-05 layout"
affects: [04-notifications-invitation-lifecycle (later plans, if any), phase-5-i18n-pass]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Session-scoped unread highlight via snapshot-before-mark (compute highlightedIds from is_read state before firing the mark-read POST, so the visual highlight persists for the current open even after the server flips is_read)"
    - "Silent-retry poll pattern: 401 -> hard redirect via localStorage clear + navigate('/'); any other error swallowed with no UI state change, relying on the next 30s tick to self-heal"

key-files:
  created: []
  modified:
    - backend/app/routers/notifications.py
    - backend/tests/test_notifications.py
    - frontend/src/pages/DashboardPage.jsx
    - frontend/src/components/NotificationBell.jsx
    - frontend/src/components/NotificationPanel.jsx

key-decisions:
  - "Task 3's NotificationRow highlight treatment (border-l-accent/bg-cream + sr-only newLabel) and the notifications.newLabel/notifications.title i18n keys were already fully implemented and committed in 04-02 (commit 993e2f2) — verified via git log rather than re-implemented, per plan's 'confirm; add only if missing' instruction."
  - "Added origin-top / sm:origin-top-right utility classes to NotificationPanel's outer container so the panel's transform-origin matches D-05's 'top center' (mobile) / 'top right' (sm+) anchor spec via pure Tailwind responsive classes, without needing a JS breakpoint check or touching NotificationBell.jsx's render tree. The full AnimatePresence entrance/exit choreography from the UI-SPEC's Animation Specifications section was left for a future pass since it is not part of this plan's acceptance criteria or must_haves.truths (D-05's truth is about layout widths/max-height, not animation)."

requirements-completed: [NOTF-01, NOTF-02, NOTF-03]

coverage:
  - id: D1
    description: "POST /api/notifications/read owner-scoped bulk mark-all-read endpoint, rejecting cross-owner leakage"
    requirement: "NOTF-03"
    verification:
      - kind: unit
        ref: "backend/tests/test_notifications.py::test_mark_all_read"
        status: pass
      - kind: unit
        ref: "backend/tests/test_notifications.py::test_mark_all_read_scoped_to_owner"
        status: pass
    human_judgment: false
  - id: D2
    description: "30s dashboard poll (setInterval/clearInterval) with 401-redirect and silent network-error retry"
    requirement: "NOTF-02"
    verification:
      - kind: other
        ref: "cd frontend && npm run build (exit 0, no type/syntax errors)"
        status: pass
    human_judgment: true
    rationale: "Poll timing, 401-redirect behavior, and silent-retry-on-error require live browser/network observation (waiting 30s, forcing a 401, simulating a network drop) that a build-only check cannot prove."
  - id: D3
    description: "NotificationBell literal showDot formula, snapshot-before-mark ordering, and one-shot bounce on 0->positive transition"
    requirement: "NOTF-01"
    verification:
      - kind: other
        ref: "cd frontend && npm run build (exit 0); grep -c \"showDot = unreadCount > 0 && !open\" frontend/src/components/NotificationBell.jsx -> 1"
        status: pass
    human_judgment: true
    rationale: "Visual bounce timing and dot appearance/disappearance across open/close and poll transitions need manual or Playwright-driven observation, not covered by this plan's automated checks."
  - id: D4
    description: "NotificationPanel highlightedIds prop, focus-on-open into the scroll region, and D-05 responsive layout (mobile fixed full-width vs sm+ absolute 360px dropdown) with matching transform-origin"
    requirement: "NOTF-01"
    verification:
      - kind: other
        ref: "cd frontend && npm run build (exit 0); grep checks for highlightedIds, role=\"region\", tabIndex={0}, sm:w-[360px], top-[72px] all >= 1 in NotificationPanel.jsx"
        status: pass
    human_judgment: true
    rationale: "Focus-on-open and responsive breakpoint rendering require a real browser at both viewport widths to confirm visually; a build check only proves the code compiles."

# Metrics
duration: 25min
completed: 2026-08-13
status: complete
---

# Phase 4 Plan 3: Notification Read-and-Poll Loop Summary

**Bulk owner-scoped POST /api/notifications/read, a 30s dashboard poll with 401/network-error handling, and the bell/panel/row wiring for the literal showDot formula, one-shot bounce, session-scoped unread highlight, and D-05 responsive panel layout.**

## Performance

- **Duration:** ~25 min (Task 3 completion only; Tasks 1-2 were completed by a prior executor session before an API usage-limit interruption)
- **Started:** 2026-08-13T00:20:00Z (approx, continuation resume)
- **Completed:** 2026-08-13T00:47:00Z
- **Tasks:** 3 (Task 1 and Task 2 completed in a prior session; Task 3 completed and committed in this session)
- **Files modified:** 5 across the whole plan (2 backend, 3 frontend); 1 file (NotificationPanel.jsx) modified in this continuation session

## Accomplishments
- `POST /api/notifications/read`: owner-scoped bulk mark-all-read, no client-supplied identity field reaches the WHERE clause, proven by `test_mark_all_read` and `test_mark_all_read_scoped_to_owner`
- 30-second dashboard poll (`setInterval`/`clearInterval`) with 401 -> localStorage clear + redirect to `/`, and silent swallow-and-retry on network error
- `NotificationBell`: snapshot-before-mark ordering (`highlightedIds` computed from unread rows before `onMarkRead()` fires), literal `showDot = unreadCount > 0 && !open` formula, and a one-shot heart bounce keyed to the `0 -> >0` unreadCount transition
- `NotificationPanel`: `highlightedIds` prop threaded to each row via a memoized `Set`, focus moves into the scroll region on every open via a ref + mount effect, and the D-05 responsive layout (mobile fixed full-width vs desktop 360px anchored dropdown) now carries matching `origin-top` / `sm:origin-top-right` transform-origin classes

## Task Commits

Each task was committed atomically:

1. **Task 1: Bulk owner-scoped mark-read endpoint** - `cbf83dd` (feat)
2. **Task 2: 30s dashboard poll + bell open/mark-read/dot/bounce wiring** - `7a2eced` (feat)
3. **Task 3: Panel highlight rendering, responsive layout, focus-on-open, i18n confirmation** - `7421504` (feat)

**Plan metadata:** (this commit, docs: complete plan)

_Note: Tasks 1 and 2 were completed and committed by a prior executor session before an API usage-limit interruption. This continuation session verified those commits, preserved the interrupted session's correct uncommitted NotificationPanel.jsx work, and finished Task 3._

## Files Created/Modified
- `backend/app/routers/notifications.py` - Added `mark_all_read` handler on `POST /api/notifications/read`, owner-scoped bulk UPDATE
- `backend/tests/test_notifications.py` - Un-xfailed `test_mark_all_read`, added `test_mark_all_read_scoped_to_owner`
- `frontend/src/pages/DashboardPage.jsx` - Replaced mount-only fetch with 30s poll effect, 401-redirect handling, `handleMarkNotificationsRead`
- `frontend/src/components/NotificationBell.jsx` - `onMarkRead` prop, `highlightedIds` state + snapshot-before-mark, literal `showDot` derivation, one-shot bounce via `bounceKey`/`prevUnreadCount`
- `frontend/src/components/NotificationPanel.jsx` - `highlightedIds` prop + memoized `Set`, scroll-region ref + focus-on-mount effect, `origin-top sm:origin-top-right` responsive transform-origin classes

## Decisions Made
- Confirmed rather than re-implemented: `NotificationRow.jsx`'s highlight treatment (`border-l-accent`/`bg-cream` + `sr-only` "New" label) and the `notifications.newLabel`/`notifications.title` i18n keys in both locale files were already correctly committed in 04-02 (commit `993e2f2`). No changes were needed to `NotificationRow.jsx`, `en.json`, or `zh-TW.json` for this plan.
- Added `origin-top` / `sm:origin-top-right` Tailwind utility classes to `NotificationPanel`'s outer container to satisfy D-05's transform-origin spec (mobile: top center, sm+: top right) using pure responsive CSS classes rather than a JS breakpoint check, avoiding any need to touch `NotificationBell.jsx`'s already-committed render tree.
- Deferred the full `AnimatePresence` entrance/exit choreography described in the UI-SPEC's Animation Specifications section (panel open/close scale+opacity+y transition, red-dot spring entrance/exit) — this plan's acceptance criteria and `must_haves.truths` scope D-05 to layout widths/max-height and focus behavior, not animation. The panel currently renders via a plain `{open && <NotificationPanel />}` conditional with no exit transition; a future polish pass can add `AnimatePresence` without touching this plan's committed logic.

## Deviations from Plan

None - Task 3 was executed as specified in 04-03-PLAN.md, with the correction that two of its three file-modification targets (`NotificationRow.jsx`, `en.json`/`zh-TW.json`) turned out to already be correct from 04-02 and required no edits, matching the plan's own "confirm; add only if missing" instruction for those items.

## Issues Encountered
A prior executor session was interrupted by an API usage limit partway through Task 3, after committing Tasks 1 and 2 (`cbf83dd`, `7a2eced`) and leaving correct-but-uncommitted work in `frontend/src/components/NotificationPanel.jsx` (the `highlightedIds` prop, `highlightedSet` memo, `scrollRegionRef` + focus effect, and the `isHighlighted={highlightedSet.has(n.id)}` wiring). This continuation session verified the prior commits via `git log`, reviewed the uncommitted diff via `git diff`, preserved all of it, and completed the one remaining piece (D-05 transform-origin classes) before committing Task 3 as a single atomic commit.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The full read-and-poll notification loop (NOTF-01, NOTF-02, NOTF-03) is now implemented end-to-end: backend bulk mark-read, 30s poll, dot/bounce/highlight/responsive-panel UI.
- Manual smoke verification (open dashboard, wait for a Yes response or trigger one, confirm dot + bounce, open panel, confirm dot clears and highlight renders, close/reopen to confirm highlight decay, resize across the 640px breakpoint) is still recommended before considering this phase's UI fully signed off — the `human_judgment: true` coverage entries above (D2-D4) reflect this.
- A future polish pass may add the UI-SPEC's full `AnimatePresence` panel open/close and red-dot entrance/exit animations; none of this plan's must_haves or acceptance criteria required them, so they were intentionally left out of scope here.

---
*Phase: 04-notifications-invitation-lifecycle*
*Completed: 2026-08-13*

## Self-Check: PASSED

- FOUND: .planning/phases/04-notifications-invitation-lifecycle/04-03-SUMMARY.md
- FOUND: commit cbf83dd (Task 1)
- FOUND: commit 7a2eced (Task 2)
- FOUND: commit 7421504 (Task 3)
- FOUND: frontend/src/components/NotificationPanel.jsx
