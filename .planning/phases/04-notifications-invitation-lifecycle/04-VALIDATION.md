---
phase: 4
slug: notifications-invitation-lifecycle
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-02
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> Seeded by `/gsd-plan-phase 4` from `04-RESEARCH.md` § Validation Architecture.
> Task IDs in the Per-Task Verification Map are filled in once plans exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 9.0.3 + pytest-asyncio 1.3.0 (`asyncio_mode = "auto"`) |
| **Config file** | `backend/pyproject.toml` (`[tool.pytest.ini_options]`) |
| **Quick run command** | `cd backend && uv run pytest tests/test_notifications.py tests/test_cleanup.py -x` |
| **Full suite command** | `cd backend && uv run pytest` |
| **Estimated runtime** | ~15 seconds (quick) / ~45 seconds (full) — re-measure after Wave 0 |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && uv run pytest tests/test_notifications.py tests/test_cleanup.py -x`
- **After every plan wave:** Run `cd backend && uv run pytest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

Task IDs are assigned when plans are written. Rows below are seeded at requirement
granularity from `04-RESEARCH.md` § Validation Architecture → Phase Requirements → Test Map.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | (infra) | — | N/A | fixture | `cd backend && uv run pytest tests/ -x --collect-only` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | NOTF-01 | — | N/A | unit | `cd backend && uv run pytest tests/test_notifications.py::test_list_returns_unread -x` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | NOTF-02 | T-4-IDOR | Every query filtered by `Notification.user_id == current_user.id`; `user_id` never accepted from request | unit | `cd backend && uv run pytest tests/test_notifications.py::test_list_scoped_to_owner -x` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | NOTF-03 | T-4-IDOR | Mark-read affects only the authenticated user's rows | unit | `cd backend && uv run pytest tests/test_notifications.py::test_mark_all_read -x` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | INV-07 | T-4-SILENT | Sweep deletes expired invitations + photo file; logs run start / rows deleted / lock skip so a stuck scheduler is observable | unit | `cd backend && uv run pytest tests/test_cleanup.py::test_sweep_deletes_expired_invitation_and_photo -x` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | INV-07 | T-4-LOCKKEY | Transaction-scoped advisory lock with a distinctive documented key prevents concurrent double-sweep | unit | `cd backend && uv run pytest tests/test_cleanup.py::test_advisory_lock_blocks_concurrent_run -x` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | (WR-007 debt) | — | N/A | integration | `cd backend && uv run pytest tests/test_invitation_respond.py::test_respond_creates_notification_and_deletes_invitation -x` | ✅ stub exists, needs fixture | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/conftest.py` — add the `db_session` transaction-rollback fixture (see `04-RESEARCH.md` § Code Examples) so seeded-row tests don't pollute each other
- [ ] `backend/tests/test_notifications.py` — new file covering NOTF-01 / NOTF-02 / NOTF-03
- [ ] `backend/tests/test_cleanup.py` — new file covering INV-07 sweep logic + advisory lock behavior
- [ ] Unstub `test_respond_creates_notification_and_deletes_invitation` and `test_verify_correct_password_returns_200` (WR-007 debt) using the new fixture
- [ ] `cd backend && uv add apscheduler` — the one new dependency this phase introduces (verified live on PyPI: 3.11.3, published 2026-06-28)
- [ ] Smoke-test APScheduler coroutine jobs before wiring real cleanup logic (resolves RESEARCH Open Question 1): register `add_job(..., "interval", seconds=2)` in a scratch script and confirm it fires via a log line

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Heart indicator renders a red dot on the dashboard when unread notifications exist | NOTF-01 | Visual state; backend coverage asserts the `is_read` flags the indicator derives from, but the rendered dot itself is not automated in v1 | Log in as a creator with ≥1 unread notification → open dashboard → confirm red dot is visible on the heart |
| One-shot bounce animation fires on unread-count delta | NOTF-01 | Motion/animation timing is not automated in v1 | With the dashboard open, trigger a new "yes" response from a second browser → confirm the heart bounces exactly once when the poll picks up the new count |
| Indicator clears after marking notifications read | NOTF-03 | Visual state transition; the underlying mark-read call is automated | Open notification list → mark read → confirm red dot disappears without a page reload |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
