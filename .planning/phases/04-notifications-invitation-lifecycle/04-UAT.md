---
status: testing
phase: 04-notifications-invitation-lifecycle
source: [04-VERIFICATION.md]
started: "2026-08-13T02:25:13Z"
updated: "2026-08-13T02:25:13Z"
---

## Current Test

number: 1
name: Red dot / heart indicator appears on a new notification (NOTF-01, Success Criterion 1)
expected: |
  After a recipient clicks Yes, within one 30s poll tick the top-bar heart turns
  accent-colored, a red dot with a white ring appears at its top-right, and the heart
  performs a one-shot scale bounce exactly once — it does not re-bounce on subsequent
  poll ticks while the panel stays closed and no new notification arrives.
awaiting: user response

## Tests

### 1. Red dot / heart indicator appears on a new notification (NOTF-01)
test: Sign in as a creator with an existing invitation. In a private window open the share link, submit the password, click Yes with a name + message. Reload the dashboard within 30s (or wait one poll tick).
expected: Heart turns accent-colored; a 2px red dot with a white ring appears at its top-right; the heart plays a single scale bounce (not on every following 30s poll).
result: [pending]

### 2. Notification content renders correctly, incl. anonymous + zh-TW (NOTF-02)
test: Open the panel after both a named+message response and an anonymous response (no name/message). Switch the UI language to zh-TW and repeat.
expected: Populated row reads exactly "{name} said yes to your “{title}”" with the message quoted below; anonymous row reads "Someone said yes to your “{title}”" with no quote block, no bare rule, no placeholder; zh-TW renders with 「」 corner brackets and no raw i18n key.
result: [pending]

### 3. Mark-as-read clears the indicator and highlight decays correctly (NOTF-03)
test: With unread notifications present, click the heart to open the panel (dot should clear immediately). Close and reopen the panel (previously-unread rows keep their highlight this session). Reload the page and reopen (highlight should be gone).
expected: Dot clears optimistically the instant the panel opens (before the network request settles); a failed POST does not revert the dot or show a toast; rows unread at open-time keep a left-accent highlight for that session and lose it after a subsequent reload.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
