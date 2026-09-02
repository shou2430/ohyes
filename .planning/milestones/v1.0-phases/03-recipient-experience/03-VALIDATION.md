---
phase: 3
slug: recipient-experience
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) / pytest 7.x (backend) |
| **Config file** | `frontend/vitest.config.ts` / `backend/pytest.ini` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` / `cd backend && python -m pytest -x -q` |
| **Full suite command** | `cd frontend && npx vitest run && cd ../backend && python -m pytest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command for affected layer (frontend/backend)
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | RCPT-01 | T-03-01 | Password verified via timing-safe comparison | integration | `cd backend && python -m pytest tests/test_invitation_verify.py -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | RCPT-08 | T-03-02 | Invitation deleted on respond, notification created | integration | `cd backend && python -m pytest tests/test_invitation_respond.py -x` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | RCPT-02 | — | N/A | component | `cd frontend && npx vitest run src/pages/__tests__/InvitationPage.test.jsx` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | RCPT-03 | — | N/A | visual/manual | Manual — dodge behavior is visual/physics | N/A | ⬜ pending |
| 03-02-03 | 02 | 2 | RCPT-04 | — | N/A | visual/manual | Manual — sparkle trail is visual | N/A | ⬜ pending |
| 03-02-04 | 02 | 2 | RCPT-05 | — | N/A | component | `cd frontend && npx vitest run src/components/__tests__/DodgeCounter.test.jsx` | ❌ W0 | ⬜ pending |
| 03-02-05 | 02 | 2 | RCPT-06 | — | N/A | visual/manual | Manual — slide transition is visual | N/A | ⬜ pending |
| 03-02-06 | 02 | 2 | RCPT-07 | — | N/A | component | `cd frontend && npx vitest run src/components/__tests__/MessageCard.test.jsx` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `backend/tests/test_invitation_verify.py` — stubs for RCPT-01 password verification
- [ ] `backend/tests/test_invitation_respond.py` — stubs for RCPT-08 respond flow
- [ ] `frontend/src/pages/__tests__/InvitationPage.test.jsx` — stubs for RCPT-02 page rendering
- [ ] `frontend/src/components/__tests__/DodgeCounter.test.jsx` — stubs for RCPT-05 counter
- [ ] `frontend/src/components/__tests__/MessageCard.test.jsx` — stubs for RCPT-07 message input

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No button dodge with escalating intensity | RCPT-03 | Physics/animation behavior cannot be unit tested | 1. Open invitation page 2. Hover near No button 3. Verify dodge escalates through stages 4. Verify boundary containment |
| Sparkle trail on dodge | RCPT-04 | Visual particle effect | 1. Trigger No button dodge 2. Verify sparkle particles appear along movement path 3. Verify particles fade out |
| Slide transition after Yes | RCPT-06 | Page transition animation | 1. Click Yes 2. Verify current view slides right 3. Verify message card slides in from left |
| Postcard animation after send | RCPT-08 | Complex CSS animation | 1. Submit message 2. Verify postcard/envelope animation plays 3. Verify final keepsake screen appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
