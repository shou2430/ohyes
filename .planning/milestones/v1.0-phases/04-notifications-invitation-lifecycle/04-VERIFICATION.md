---
phase: 04-notifications-invitation-lifecycle
verified: 2026-08-13T02:20:07Z
status: passed
score: 5/8 must-haves verified
behavior_unverified: 3
overrides_applied: 0
behavior_unverified_items:

  - truth: "Creator sees a red dot/heart indicator on the dashboard when a new notification arrives (Success Criterion 1)"
    test: "Sign in as a creator with an existing invitation, open the share link in a private window, submit the password, click Yes with a name + message. Reload the dashboard within 30s (or wait one poll tick)."
    expected: "The heart in the top bar turns accent-colored, a 2px red dot with a white ring appears at its top-right, and the heart performs a one-shot scale bounce exactly once (not on every subsequent 30s poll)."
    why_human: "No frontend test runner exists in this repo (`frontend/package.json` exposes only dev/build/lint/preview) and the dashboard sits behind real Google OAuth, which could not be driven headlessly in this session. The dot-visibility formula (`unreadCount > 0 && !open`) and the bounce-edge-detection logic (`prevUnreadCount.current === 0 && unreadCount > 0`) are present and wired in `NotificationBell.jsx`, but no automated test exercises the actual DOM render or the poll-driven state transition."

  - truth: "Notification displays \"[Name] said yes to your [title]\" with the recipient's optional message (Success Criterion 2)"
    test: "Same flow as above, once with a name+message and once as an anonymous response (no name/message). Open the panel and read the rendered row in both en and zh-TW."
    expected: "Populated row reads exactly \"{name} said yes to your “{title}”\" with the message quoted below; anonymous row reads \"Someone said yes to your “{title}”\" with no quote block, no bare rule, no placeholder. zh-TW renders with 「」 corner brackets and no raw translation key."
    why_human: "The API-level contract (is_read flag, ordering, null-handling of recipient_name/recipient_message) is proven by passing backend tests (`test_list_returns_unread`), and the sentence-construction and null-branch logic exist in `NotificationRow.jsx` source (confirmed via grep for `saidYesAnonymous`), but no automated check confirms the actual rendered DOM text, quote-block suppression, or zh-TW glyph rendering in a browser."

  - truth: "Creator can mark notifications as read and the indicator clears (Success Criterion 3)"
    test: "With unread notifications present, click the heart to open the panel. Confirm the dot disappears immediately (optimistic). Close and reopen the panel; confirm the previously-unread rows keep their highlight on this session but a fresh reload shows them as plain (highlight decay)."
    expected: "Dot clears optimistically the instant the panel opens (before the network request settles); a failed POST does not revert the dot or show a toast; rows unread at open-time keep a left-accent highlight for that session and lose it after a subsequent open/reload."
    why_human: "`POST /api/notifications/read` itself is fully covered by passing tests (`test_mark_all_read`, `test_mark_all_read_scoped_to_owner`) proving the owner-scoped DB update. The frontend optimistic-flip, snapshot-before-mark ordering, and highlight-decay state transitions exist in source (`handleMarkNotificationsRead`, `highlightedIds` snapshot in `NotificationBell.jsx`) but are not exercised by any automated frontend test — this is a state-transition invariant that presence-and-wiring checks cannot prove."
gaps: []
---

# Phase 4: Notifications & Invitation Lifecycle Verification Report

**Phase Goal:** Close the creator feedback loop with a notification system and ensure invitations auto-expire with full data cleanup after 7 days.
**Verified:** 2026-08-13T02:20:07Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Creator sees a red dot/heart indicator on the dashboard when a new notification arrives | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `NotificationBell.jsx` implements `showDot = unreadCount > 0 && !open` (verified via grep, line 16) and a bounce-edge-detector (`prevUnreadCount.current === 0 && unreadCount > 0`, lines 22-27); `DashboardPage.jsx` polls `GET /api/notifications` every 30s (`setInterval(fetchNotifications, 30000)`, line 75). Backend data half proven by `test_list_returns_unread` (28/28 backend tests pass). No browser session was available to confirm the rendered dot/bounce (documented in 04-02-SUMMARY.md coverage id D3 and 04-03-SUMMARY.md D3/D4 as `human_judgment: true`). |
| 2 | Notification displays "[Name] said yes to your [title]" with the recipient's optional message | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `NotificationRow.jsx` constructs the sentence via i18next (`notifications.saidYes` / `notifications.saidYesAnonymous`), suppresses the quote block when `recipient_message` is null/empty, and both `en.json`/`zh-TW.json` carry matching key sets (parity confirmed — see i18n check below). Backend `NotificationResponse` schema and ordering/null-handling proven by passing tests. No browser confirmation of actual rendered text/quote suppression/zh-TW glyphs (04-02-SUMMARY.md coverage id D3, `human_judgment: true`). |
| 3 | Creator can mark notifications as read and the indicator clears | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED (backend half VERIFIED) | `POST /api/notifications/read` is owner-scoped (`Notification.user_id == current_user.id`, no body-supplied identity) and fully proven by `test_mark_all_read` and `test_mark_all_read_scoped_to_owner`, both passing. Frontend optimistic-flip (`handleMarkNotificationsRead` in `DashboardPage.jsx`) and snapshot-before-mark highlight logic (`NotificationBell.jsx` `handleToggle`) exist in source but the dot-clears/highlight-decay state transitions are not exercised by any automated frontend test (04-03-SUMMARY.md coverage ids D2-D4, `human_judgment: true`). |
| 4 | An invitation older than 7 days is automatically deleted along with its photo file | ✓ VERIFIED | `backend/app/tasks/cleanup.py::run_cleanup()` — transaction-scoped advisory lock (`pg_try_advisory_xact_lock`), bulk `DELETE ... RETURNING Invitation.photo_filename`, per-file `os.remove` with `OSError` swallowed, plus the notification-retention delete in the same transaction. Behaviorally proven by 7 passing tests against a live PostgreSQL instance: `test_sweep_deletes_expired_invitation_and_photo`, `test_sweep_keeps_unexpired_invitation`, `test_sweep_tolerates_missing_photo_file`, `test_advisory_lock_blocks_concurrent_run`, `test_sweep_deletes_notifications_older_than_retention`, `test_sweep_keeps_recent_notifications`, `test_scheduler_registers_hourly_cleanup_job`. Hourly `AsyncIOScheduler` job (`id="cleanup_sweep"`) wired into the FastAPI lifespan in `main.py`, confirmed registered by a passing test that drives the actual lifespan context manager. |

**Score:** 1/4 roadmap success criteria fully behavior-verified (3 present + wired, behavior not exercised by an automated/browser check).

### Requirement-Level Truths (from PLAN frontmatter, spot-checked)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | `GET /api/notifications` returns only the authenticated creator's own rows, newest-first, 401 without a token (T-04-IDOR) | ✓ VERIFIED | `notifications.py` filters `Notification.user_id == current_user.id`, orders `created_at desc, id desc`; `test_list_scoped_to_owner` proves cross-owner isolation in both directions; `get_current_user` dependency (existing, reused) 401s on missing/invalid token. |
| 6 | `GET /api/notifications` takes no pagination parameter (D-06) | ✓ VERIFIED | `def list_notifications(current_user, db)` — exactly two dependency parameters, no query/body parameter, confirmed by direct read of `backend/app/routers/notifications.py`. |
| 7 | No numeric badge is ever rendered on the bell; count lives only in `aria-label` (D-02) | ✓ VERIFIED | `NotificationBell.jsx` dot span has no text/digit content (`aria-hidden="true"`, empty `<span>`); count only appears inside `t("notifications.ariaLabel", { unread: unreadCount })`. |
| 8 | The heart button is never `disabled`, at any unread count or open state (D-04) | ✓ VERIFIED | `grep -c 'disabled' frontend/src/components/NotificationBell.jsx` → 0. |
| 9 | No cross-tab/cross-device read-state sync exists (D-11) | ✓ VERIFIED | No `BroadcastChannel`, `storage` event listener found in `NotificationBell.jsx` or `DashboardPage.jsx`. |
| 10 | `document.title` is never mutated by unread state (D-12) | ✓ VERIFIED | `DashboardPage.jsx` still sets `document.title = "Dashboard - OhYes"` unconditionally in its own effect, untouched by the notifications code. |
| 11 | No raw-HTML injection API renders recipient-authored strings (T-04-02-XSS) | ✓ VERIFIED | `grep -c 'dangerouslySetInnerHTML'` → 0 across `NotificationRow.jsx`, `NotificationPanel.jsx`, `NotificationBell.jsx`; all recipient content rendered as React text children / i18next interpolation values. |
| 12 | `en.json` and `zh-TW.json` carry an identical `notifications.*` key set (9 keys) | ✓ VERIFIED | Directly inspected both files: `title, ariaLabel, ariaLabelNone, saidYes, saidYesAnonymous, newLabel, justNow, emptyHeading, emptyBody` present and matching in both locales. |

**Combined score:** 5/8 must-haves fully verified by automated evidence; 3/8 present-and-wired but behaviorally unverified (routed to human verification below).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/schemas/notification.py` | `NotificationResponse` schema | ✓ VERIFIED | Exact 6-field shape (`id, invitation_title, recipient_name, recipient_message, is_read, created_at`), `model_config = {"from_attributes": True}` present. |
| `backend/app/routers/notifications.py` | `GET /api/notifications`, `POST /api/notifications/read` | ✓ VERIFIED | Both handlers present, owner-scoped, registered under `/api/notifications` prefix. |
| `backend/app/main.py` | router registration + scheduler lifespan wiring | ✓ VERIFIED | `app.include_router(notifications_router)` present; `AsyncIOScheduler` instantiated, `add_job(run_cleanup, "interval", hours=1, id="cleanup_sweep")`, `scheduler.start()`/`scheduler.shutdown(wait=False)` in lifespan. |
| `backend/app/tasks/cleanup.py` | `run_cleanup()` sweep | ✓ VERIFIED | Advisory-lock guard, bulk delete + returning, photo removal, notification retention delete, INFO/WARNING logging — all present and behaviorally tested. |
| `frontend/src/components/NotificationBell.jsx` | heart trigger, dot, bounce, dismissal contract | ✓ VERIFIED (wired) — ⚠️ rendering unconfirmed | All required tokens present (`showDot`, `aria-hidden`, `aria-label`, Escape/pointerdown/focusout handlers); no `disabled`. |
| `frontend/src/components/NotificationPanel.jsx` | dropdown container, scroll region, empty state | ✓ VERIFIED (wired) — ⚠️ rendering unconfirmed | `role="region"`, `tabIndex={0}`, `overscroll-contain`, `divide-y divide-border`, responsive `sm:w-[360px]` / `top-[72px]` classes all present. |
| `frontend/src/components/NotificationRow.jsx` | sentence, optional quote, relative time | ✓ VERIFIED (wired) — ⚠️ rendering unconfirmed | `Intl.RelativeTimeFormat`, `dateTime=`, `saidYesAnonymous`, no `line-clamp`, no `dangerouslySetInnerHTML`. |
| `frontend/src/pages/DashboardPage.jsx` | bell mount, poll, mark-read handler | ✓ VERIFIED | `<NotificationBell notifications={notifications} onMarkRead={handleMarkNotificationsRead} />` mounted first in the top-bar right cluster; 30s poll with 401-redirect and silent-retry; `document.title` unchanged. |
| `frontend/src/i18n/en.json` / `zh-TW.json` | `notifications.*` namespace | ✓ VERIFIED | 9 matching keys in both locales, confirmed by direct read. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `main.py` | `notifications_router` | `app.include_router(notifications_router)` | ✓ WIRED | Present, survives 04-04's lifespan edit (grep confirms 1 occurrence). |
| `main.py` lifespan | `run_cleanup` | `AsyncIOScheduler.add_job(run_cleanup, "interval", hours=1, id="cleanup_sweep")` | ✓ WIRED | Confirmed by a passing test that drives the real `lifespan` context manager and asserts the job exists with a 1-hour trigger interval. |
| `DashboardPage.jsx` poll | `NotificationBell` | `<NotificationBell notifications={notifications} onMarkRead={...} />` | ✓ WIRED | Props flow confirmed by source inspection; state updates on each poll tick. |
| `NotificationBell` open transition | `onMarkRead` → `POST /api/notifications/read` | snapshot-before-mark ordering in `handleToggle` | ✓ WIRED (code-level) | Present in source; runtime ordering/timing not exercised by an automated test (see human verification). |
| `cleanup.py` | `app.core.database` session factory | `async_session_factory()` (not request-scoped `get_db`) | ✓ WIRED | Confirmed via import and direct call in `run_cleanup()`. |
| DELETE...RETURNING | filesystem removal | `Path(settings.PHOTO_STORAGE_PATH) / filename` → `os.remove` | ✓ WIRED | Confirmed by passing `test_sweep_deletes_expired_invitation_and_photo`. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full backend suite passes against live PostgreSQL | `cd backend && uv run pytest -q` | `28 passed, 0 failed, 0 xfailed` (re-run live in this session) | ✓ PASS |
| Frontend production build succeeds | `cd frontend && npm run build` | `✓ built in 2.29s`, 0 errors (re-run live in this session) | ✓ PASS |
| Cleanup sweep deletes expired invitation + photo | `pytest tests/test_cleanup.py::test_sweep_deletes_expired_invitation_and_photo` (part of full run above) | pass | ✓ PASS |
| Advisory lock blocks concurrent sweep | `pytest tests/test_cleanup.py::test_advisory_lock_blocks_concurrent_run` (part of full run above) | pass | ✓ PASS |
| Scheduler registers hourly job | `pytest tests/test_cleanup.py::test_scheduler_registers_hourly_cleanup_job` (part of full run above) | pass | ✓ PASS |
| Owner-scoped mark-read | `pytest tests/test_notifications.py::test_mark_all_read_scoped_to_owner` (part of full run above) | pass | ✓ PASS |
| Rendered dot/bounce/highlight in a real browser | n/a | not run — no OAuth session available | ? SKIP (routed to human verification) |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|--------------|--------|----------|
| NOTF-01 | 04-01, 04-02, 04-03 | Creator sees red dot/heart indicator | ⚠️ human_needed | Data/logic path verified by tests; rendered indicator needs browser confirmation. |
| NOTF-02 | 04-01, 04-02, 04-03 | Notification shows sentence + optional message | ⚠️ human_needed | Same as above. |
| NOTF-03 | 04-01, 04-03 | Creator can mark notifications as read | ✓ SATISFIED (backend) / ⚠️ human_needed (frontend rendering) | `POST /api/notifications/read` fully tested; dot-clear/highlight-decay UI needs browser confirmation. |
| INV-07 | 04-01, 04-04 | Invitations auto-expire + full cleanup after 7 days | ✓ SATISFIED | Fully covered by 7 passing automated tests against live PostgreSQL; no human verification needed. |
| NOTF-V2-02 | 04-04 | Notifications auto-deleted 30 days after `created_at` (pulled forward from v2 via D-07) | ✓ SATISFIED | Reclassified in `.planning/REQUIREMENTS.md` (v1 section + Phase 4 traceability row, `grep -c 'NOTF-V2-02'` → 2); behavior proven by `test_sweep_deletes_notifications_older_than_retention` / `test_sweep_keeps_recent_notifications`. |

No orphaned requirements found — `.planning/REQUIREMENTS.md`'s Phase 4 traceability table lists exactly NOTF-01, NOTF-02, NOTF-03, NOTF-V2-02, INV-07, matching the union of all four plans' `requirements:` frontmatter fields.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | none found | — | `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` grep across all phase-modified backend/frontend files returned zero matches. No debt markers. |

### Human Verification Required

1. **Red dot / heart indicator appears on new notification (NOTF-01, Success Criterion 1)**
   **Test:** Sign in, create an invitation, respond to it as a recipient (name + message) in a private window, reload the dashboard within 30s.
   **Expected:** Heart turns accent-colored with a red dot; one scale-bounce animation plays; the dot does not reappear on the following poll ticks while the panel stays closed and no new notification arrives.
   **Why human:** No frontend test runner exists in this repo; dashboard requires a real Google OAuth session that could not be established headlessly in this environment.

2. **Notification content renders correctly, including anonymous/zh-TW cases (NOTF-02, Success Criterion 2)**
   **Test:** Open the panel after both a named+message response and an anonymous response; switch the UI language to zh-TW and repeat.
   **Expected:** "{name} said yes to your "{title}"" with quoted message; anonymous variant reads "Someone said yes to your "{title}"" with no quote block; zh-TW renders with 「」 corner brackets and no raw i18n key.
   **Why human:** Rendered DOM text and conditional quote-block suppression require visual/browser confirmation.

3. **Mark-as-read clears the indicator and highlight decays correctly (NOTF-03, Success Criterion 3)**
   **Test:** With unread notifications, open the panel (dot should clear immediately), close it, reopen it (previously-unread rows should still show highlight for this session), then reload the page and reopen (highlight should be gone).
   **Expected:** Dot clears optimistically; no toast/revert on a failed request; highlight persists for the session and decays after a fresh load.
   **Why human:** This is a client-side state-transition sequence (snapshot-before-mark, optimistic UI, session-scoped decay) with no automated frontend test exercising it.

### Gaps Summary

No gaps were found — every artifact exists, is substantive, and is wired; every backend behavior is proven by passing automated tests against a live PostgreSQL instance (28/28); the frontend builds cleanly with no anti-patterns or debt markers. The phase is **not** blocked on missing or broken functionality.

The reason this verification resolves to `human_needed` rather than `passed` is that three of the four ROADMAP success criteria describe **rendered, browser-observable behavior** (a red dot appearing, specific text rendering, a highlight decaying across opens) that this session could not exercise in a real browser — the dashboard sits behind live Google OAuth, and the frontend has no test runner (`frontend/package.json` only exposes `dev`/`build`/`lint`/`preview`). This gap was independently identified and flagged by the executor in 04-02-SUMMARY.md (coverage id D3) and 04-03-SUMMARY.md (coverage ids D2-D4) as `human_judgment: true`, and is corroborated here by an independent code read rather than taken on the SUMMARY's word alone: the underlying formulas, state machines, and API contracts are present, correctly wired, and pass every test that a browser is not required to run.

Success Criterion 4 (INV-07 / the invitation-lifecycle half of the phase goal) has no such gap — it is fully automated-tested and requires no human sign-off.

---

_Verified: 2026-08-13T02:20:07Z_
_Verifier: Claude (gsd-verifier)_
