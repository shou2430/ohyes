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

## From 04-02 (Task 2)

- `pnpm lint` (whole-repo `eslint .`) reports 3 pre-existing errors in files this plan does not
  touch: `frontend/src/components/recipient/SparkleTrail.jsx:15` and
  `frontend/src/context/AuthContext.jsx:65` (`react-refresh/only-export-components`), and
  `frontend/src/pages/AuthCallbackPage.jsx:10` (`no-unused-vars`). Confirmed pre-existing via
  `git diff --stat` (zero changes to any of the three files this session). Every file 04-02
  created or modified (`NotificationBell.jsx`, `NotificationPanel.jsx`, `NotificationRow.jsx`,
  `en.json`, `zh-TW.json`, and Task 3's `DashboardPage.jsx` edit) passes
  `eslint <file>` individually with zero findings.
- Running `pnpm lint`/`pnpm build` in this environment triggers pnpm's implicit
  "deps status check", which fails on `[ERR_PNPM_IGNORED_BUILDS] esbuild` and (in one run)
  auto-wrote a stray `frontend/pnpm-workspace.yaml` prompting a build-script approval. That
  stray file was deleted before committing — it was pnpm environment noise, not a plan artifact.
  Verification in this plan therefore ran `./node_modules/.bin/eslint` and
  `./node_modules/.bin/vite build` directly to bypass the wrapper; both exit 0 on this plan's
  files.
