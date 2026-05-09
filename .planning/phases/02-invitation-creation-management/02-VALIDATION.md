---
phase: 2
slug: invitation-creation-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x (backend) / vitest (frontend — if configured) |
| **Config file** | `backend/pytest.ini` or `backend/pyproject.toml` |
| **Quick run command** | `cd backend && python -m pytest tests/ -x -q` |
| **Full suite command** | `cd backend && python -m pytest tests/ -v` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/ -x -q`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -v`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | INV-01, INV-02, INV-03, INV-04 | T-02-01 | File type validation, size limit, auth required | integration | `python -m pytest tests/test_invitations.py -k create` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | INV-05 | T-02-02 | Invitation count enforced server-side | unit | `python -m pytest tests/test_invitations.py -k limit` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | INV-06 | T-02-03 | Owner-only deletion, file cleanup | integration | `python -m pytest tests/test_invitations.py -k delete` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | INV-04 | — | N/A | integration | `python -m pytest tests/test_invitations.py -k short_code` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | INV-01 | — | N/A | manual | Manual browser test | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_invitations.py` — stubs for INV-01 through INV-06
- [ ] `backend/tests/conftest.py` — shared fixtures (test DB, auth helper, test client)
- [ ] pytest + httpx installed in backend dev dependencies

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Photo preview in creation form | INV-02 | Browser file input + visual preview | Upload image on /create, verify preview updates |
| Clipboard copy on dashboard | INV-04 | Clipboard API requires browser context | Click "Copy link" button, paste in text editor |
| Create button disabled at limit | INV-05 | Visual state verification | Create 2 invitations, verify button grayed + message shown |
| Expired invitation friendly page | D-19 | Requires expired invitation state | Access /i/:code for deleted/expired invitation |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
