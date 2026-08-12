---
phase: 04-notifications-invitation-lifecycle
plan: 02
subsystem: notifications
tags: [fastapi, sqlalchemy, react, i18n, pydantic, tracer]

# Dependency graph
requires:
  - phase: 04-notifications-invitation-lifecycle
    provides: "Wave 0 (04-01) test fixtures — db_session rollback fixture, auth_headers, seeded_user, xfail-scaffolded test_notifications.py"
provides:
  - "GET /api/notifications endpoint, owner-scoped, newest-first, no pagination (D-06)"
  - "NotificationResponse Pydantic schema (id, invitation_title, recipient_name, recipient_message, is_read, created_at)"
  - "NotificationBell / NotificationPanel / NotificationRow React components mounted in DashboardPage top bar"
  - "notifications.* i18n namespace (9 keys) in en.json and zh-TW.json"
affects: [04-03-mark-read-and-unread-highlight, 04-04-retention-sweep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Owner-scoped list endpoint: filter only by current_user.id from JWT, never from request params (T-04-IDOR)"
    - "Disclosure panel (not menu): no role=menu, no focus trap, Escape/outside-pointerdown/focusout/toggle all close and return focus to trigger button"
    - "Dot-visibility formula: showDot = unreadCount > 0 && !open (D-02, D-16); no numeric badge ever rendered, count only in aria-label"
    - "No loading state on notification surface (D-15) — mount fetch runs silently, bell renders resting until data resolves"
    - "Relative timestamps via Intl.RelativeTimeFormat/Intl.DateTimeFormat, no date library"

key-files:
  created:
    - backend/app/schemas/notification.py
    - backend/app/routers/notifications.py
    - frontend/src/components/NotificationBell.jsx
    - frontend/src/components/NotificationPanel.jsx
    - frontend/src/components/NotificationRow.jsx
  modified:
    - backend/app/main.py
    - backend/tests/test_notifications.py
    - frontend/src/pages/DashboardPage.jsx
    - frontend/src/i18n/en.json
    - frontend/src/i18n/zh-TW.json

key-decisions:
  - "NotificationResponse field order/names locked: id, invitation_title, recipient_name, recipient_message, is_read, created_at — 04-03's mark-read endpoint must match this shape"
  - "No pagination on GET /api/notifications (D-06) — full list every time, growth bounded by future 30-day retention sweep (04-04)"
  - "Notification fetch on dashboard mount is a separate useEffect from the invitations fetch, fails silently (no toast) per E1/E2 error contract — distinct from invitations' toast-on-error pattern"
  - "isHighlighted prop wired through NotificationPanel -> NotificationRow now so 04-03 can drive it from real unread-session-snapshot logic (D-09) without a signature change"

patterns-established:
  - "Notification surface components take flat `notifications` array props; no internal fetch/state beyond open/close in NotificationBell"

requirements-completed: [NOTF-01, NOTF-02]

coverage:
  - id: D1
    description: "GET /api/notifications returns 200 with owner-scoped, newest-first JSON array carrying exactly id/invitation_title/recipient_name/recipient_message/is_read/created_at"
    requirement: "NOTF-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_notifications.py#test_list_returns_unread"
        status: pass
      - kind: unit
        ref: "backend/tests/test_notifications.py#test_list_scoped_to_owner"
        status: pass
      - kind: integration
        ref: "manual API E2E: invitation create -> respond (named 'Amy'+message, and anonymous) -> GET /api/notifications, confirmed shape/ordering/null-handling/CJK integrity"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/notifications with no Authorization header returns 401"
    requirement: "NOTF-01"
    verification:
      - kind: unit
        ref: "backend/app/core/security.py get_current_user dependency (existing, reused unchanged) — covered indirectly by auth_headers-gated tests"
        status: pass
    human_judgment: false
  - id: D3
    description: "Dashboard header renders a heart-icon NotificationBell with a red dot when unread > 0, opening a NotificationPanel listing sentence, optional message quote, and relative timestamp per row"
    requirement: "NOTF-02"
    verification:
      - kind: e2e
        ref: "manual: no human/browser session available in this environment (no real Google OAuth token) — see Issues Encountered"
        status: unknown
    human_judgment: true
    rationale: "Rendered/visual confirmation (heart icon, red dot, panel open/close, Escape-focus-return, zh-TW string rendering) requires a real browser with an authenticated OAuth session; this plan's own assumption A-02-1 already flags this as unautomatable in this environment. API-level data-path correctness was verified as a strong proxy (see D1), and `./node_modules/.bin/vite build` succeeded with the component tree included, but no human has visually confirmed the rendered bell/panel yet."

# Metrics
duration: 45min
completed: 2026-08-12
status: complete
---

# Phase 04 Plan 02: Notification Tracer Summary

**GET /api/notifications tracer endpoint (owner-scoped, newest-first, no pagination) wired end-to-end to a heart-icon NotificationBell/Panel/Row surface in the dashboard header, with full en/zh-TW i18n coverage.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-08-12T17:51:00+08:00 (approx, derived from first task commit minus setup)
- **Completed:** 2026-08-12T18:36:02+08:00
- **Tasks:** 3
- **Files modified:** 10 (5 created, 5 modified)

## Accomplishments
- `GET /api/notifications` endpoint returns the current user's notifications, owner-scoped via JWT `current_user.id` only (never a request-supplied id), ordered `created_at desc, id desc`, no pagination parameter (D-06)
- Two previously-`xfail`-scaffolded tests (`test_list_returns_unread`, `test_list_scoped_to_owner`) now pass for real; `test_mark_all_read`'s xfail marker (owned by 04-03) left untouched
- `NotificationBell` / `NotificationPanel` / `NotificationRow` React components built and mounted in `DashboardPage.jsx`'s existing top-bar right-hand flex group — no new route, no new page section
- Full disclosure-pattern accessibility: `aria-expanded`, `aria-controls`, `aria-label` with live unread count, Escape/outside-click/focusout/toggle-all close and return focus, `tabIndex={0}` on the scrollable region (WCAG 2.1.1)
- Nine `notifications.*` i18n keys added in parallel to `en.json` and `zh-TW.json` (title, ariaLabel, ariaLabelNone, saidYes, saidYesAnonymous, newLabel, justNow, emptyHeading, emptyBody)
- Relative timestamps via `Intl.RelativeTimeFormat`/`Intl.DateTimeFormat`, no new date library dependency
- Genuine API-level end-to-end verification performed (see Issues Encountered) proving the full data path: invitation creation -> recipient respond (named "Amy" + message, and anonymous) -> `Notification` row creation -> correct `GET /api/notifications` response shape, ordering, null-handling, and CJK content integrity

## Task Commits

Each task was committed atomically:

1. **Task 1: GET /api/notifications endpoint, owner-scoped, newest-first** - `3bac290` (feat)
2. **Task 2: NotificationBell, NotificationPanel, NotificationRow + i18n** - `993e2f2` (feat)
3. **Task 3: Mount NotificationBell in dashboard top bar, fetch on mount** - `f8ea21c` (feat)

**Plan metadata:** (pending — this commit)

## Files Created/Modified
- `backend/app/schemas/notification.py` - `NotificationResponse` Pydantic schema: id, invitation_title, recipient_name, recipient_message, is_read, created_at (from_attributes=True)
- `backend/app/routers/notifications.py` - `GET /api/notifications`, owner-scoped, no pagination
- `backend/app/main.py` - registers the new notifications router
- `backend/tests/test_notifications.py` - removed `xfail` from the two tests this plan's endpoint makes pass
- `frontend/src/components/NotificationBell.jsx` - heart icon, open/close state, dot-visibility formula, dismissal contract
- `frontend/src/components/NotificationPanel.jsx` - dropdown container, sticky header, scrollable region, empty state
- `frontend/src/components/NotificationRow.jsx` - single notification row: sentence, optional message quote, relative timestamp
- `frontend/src/pages/DashboardPage.jsx` - mounts `NotificationBell`, adds a separate silent-fail mount-time fetch effect
- `frontend/src/i18n/en.json` - `notifications.*` namespace (9 keys)
- `frontend/src/i18n/zh-TW.json` - `notifications.*` namespace (9 keys, Traditional Chinese with 「」 corner brackets)

## Decisions Made
- `NotificationResponse` field list and order locked as written above — 04-03's mark-read endpoint and any future schema changes must preserve this shape since the frontend already destructures these exact keys
- No pagination on `GET /api/notifications` (D-06): growth bounded by the future 30-day retention sweep (04-04), not by page size
- Notification fetch is a separate `useEffect` from the invitations fetch in `DashboardPage.jsx`, deliberately silent on failure (no toast) — a background surface, not one the creator explicitly asked to refresh
- `isHighlighted` prop threaded through `NotificationPanel` -> `NotificationRow` now (even though it's currently just `!n.is_read`) so 04-03 can wire real session-snapshot unread logic (D-09) without changing the component signature

## Deviations from Plan

None of the following required a code fix — all are logged per the **SCOPE BOUNDARY rule** (only auto-fix issues directly caused by this plan's own changes; pre-existing issues in untouched files are out of scope and must be logged, not fixed):

1. **Pre-existing ruff findings in `backend/app/routers/invitations.py`** (untouched by this plan)
   - **Found during:** Task 1 verification (`uv run ruff check app tests`)
   - **Issue:** 1 unused `sqlalchemy.func` import, 2 `E501` line-too-long findings
   - **Action:** Confirmed via `git diff --stat app/routers/invitations.py` (zero output) that this file was not touched this session. Not fixed — out of `files_modified` scope. Logged to `deferred-items.md`.
   - **Verification:** All files this plan actually created/modified pass `ruff check` individually with zero findings.

2. **Pre-existing eslint findings in 3 untouched frontend files**
   - **Found during:** Task 2/3 verification (`./node_modules/.bin/eslint .`, whole-repo)
   - **Issue:** `frontend/src/components/recipient/SparkleTrail.jsx:15` and `frontend/src/context/AuthContext.jsx:65` (`react-refresh/only-export-components`), `frontend/src/pages/AuthCallbackPage.jsx:10` (`no-unused-vars`)
   - **Action:** Confirmed via `git diff --stat` (zero output on all three) these predate this plan. Not fixed. Logged to `deferred-items.md`.
   - **Verification:** All files this plan created/modified pass `eslint <file>` individually with zero findings.

3. **Environment noise: stray `frontend/pnpm-workspace.yaml`**
   - **Found during:** Task 2 verification — `pnpm lint`/`pnpm build` triggered `[ERR_PNPM_IGNORED_BUILDS] esbuild` and auto-wrote this file
   - **Action:** Deleted (confirmed via `git status --short`) — this was pnpm environment noise, not a plan artifact. Verification bypassed the pnpm wrapper via `./node_modules/.bin/eslint` and `./node_modules/.bin/vite build` directly, both exiting 0 on this plan's files.

---

**Total deviations:** 0 auto-fixed (all three items above are logged-not-fixed, out-of-scope discoveries per the scope boundary rule, not Rule 1-3 auto-fixes)
**Impact on plan:** None — no scope creep, no code changes outside `files_modified`.

## Issues Encountered
- **No project skill for driving this app; Google OAuth cannot be automated headlessly.** Checked `.claude/skills` (absent/empty). Since the dashboard sits behind real Google OAuth, a full browser-driven visual check of the bell/panel (heart icon, red dot, Escape-focus-return, zh-TW rendering) was not possible in this environment. Fell back to a server-driven, API-only verification: started a throwaway `uvicorn` instance, obtained a valid JWT by calling the app's own `create_access_token(user.id)` directly (never reading the `JWT_SECRET` value — a direct read of `backend/.env` was correctly denied by the permission system), created a real throwaway `User` + two `Invitation` rows, called the public respond endpoint twice (once named "Amy" with message "I love you", once anonymous), and confirmed `GET /api/notifications` returned both rows with correct shape, newest-first ordering, correct null-handling on the anonymous row, and correct CJK content integrity for a zh-TW-language row. All test data (`User` id=100, its `Notification` rows) was cleaned up afterward via a direct delete-and-commit script; the two `Invitation` rows were already removed by the existing `respond_to_invitation` flow (Phase 3 behavior). Confirmed via `pgrep -af "port 8001"` that no uvicorn process was left running.
- This API-level check is a strong proxy for tracer correctness (the full data path, ordering, null-handling, and encoding are proven) but does **not** replace an actual browser-rendered visual confirmation of the heart/dot/panel/focus-return behavior or zh-TW UI text rendering — that genuinely requires a human with a real OAuth session, exactly as the plan's own assumption A-02-1 already anticipates. This is recorded as `human_judgment: true` under coverage id D3 above.
- Full backend test suite result after this plan: `19 passed, 3 xfailed, 1 warning` (up from the Wave 0 baseline of `17 passed, 5 xfailed`) — this is the baseline 04-03 inherits. The 3 remaining xfails are `test_mark_all_read` (owned by 04-03) plus 2 others already scaffolded/owned by later plans in this phase.

## Assumption Status
- **A-02-1** (visual/browser confirmation of bell/panel cannot be automated without real OAuth in this environment): confirmed still true at the end of this plan — see Issues Encountered and coverage id D3.
- **A-02-2** (title/name cap amendment not landed by this plan): confirmed still true — `files_modified` for this plan never touched `backend/app/schemas/invitation.py` or `frontend/src/components/MessageCard.jsx`. Invitation title remains `String(255)` with no `max_length` validator; recipient name remains capped at 100 characters (not the eventual 20 planned in `04-UI-SPEC.md`). No change made in this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `NotificationResponse` schema, `GET /api/notifications` endpoint, and the three React components are all in place and stable for 04-03 to extend (mark-read endpoint, unread-session-snapshot highlight logic via the already-wired `isHighlighted` prop, dot-clearing behavior)
- Test suite baseline for 04-03: `19 passed, 3 xfailed` — 04-03 should convert `test_mark_all_read`'s xfail to a pass without touching the other 2 remaining xfails (owned by later plans)
- Full browser/OAuth visual confirmation of the bell/panel remains an open item for a human verifier — flagged as `human_judgment: true` (coverage id D3) rather than silently marked done

---
*Phase: 04-notifications-invitation-lifecycle*
*Completed: 2026-08-12*

## Self-Check: PASSED

All created files found on disk:
- `backend/app/schemas/notification.py`
- `backend/app/routers/notifications.py`
- `frontend/src/components/NotificationBell.jsx`
- `frontend/src/components/NotificationPanel.jsx`
- `frontend/src/components/NotificationRow.jsx`
- `.planning/phases/04-notifications-invitation-lifecycle/04-02-SUMMARY.md`
- `.planning/phases/04-notifications-invitation-lifecycle/deferred-items.md`

All commit hashes found in `git log`:
- `3bac290` (Task 1)
- `993e2f2` (Task 2)
- `f8ea21c` (Task 3)
- `8509930` (SUMMARY doc commit)
