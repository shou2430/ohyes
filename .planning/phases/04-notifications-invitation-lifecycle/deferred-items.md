# Deferred Items — Phase 4

Out-of-scope issues discovered during execution, logged rather than fixed (scope boundary rule).

## From 04-02 (Task 1)

- `backend/app/routers/invitations.py` has 3 pre-existing `ruff check` findings (1 unused
  `sqlalchemy.func` import, 2 `E501` line-too-long) that predate this plan (confirmed via
  `git diff --stat` showing zero changes to this file in the current session). Not touched by
  04-02 — file is out of `files_modified` scope. `uv run ruff check app tests` therefore exits
  non-zero at the full-directory level even though every file this plan created or modified
  (`app/schemas/notification.py`, `app/routers/notifications.py`, `app/main.py`,
  `tests/test_notifications.py`) passes `ruff check` individually with zero findings.
