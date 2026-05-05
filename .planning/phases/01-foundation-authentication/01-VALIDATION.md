---
phase: 1
slug: foundation-authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x (backend) + vitest (frontend) |
| **Config file** | `backend/pyproject.toml` / `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && uv run pytest -x -q` / `cd frontend && pnpm test --run` |
| **Full suite command** | `cd backend && uv run pytest -v` && `cd frontend && pnpm test --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick test commands
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | AUTH-01 | — | Google OAuth redirect flow works | integration | `cd backend && uv run pytest tests/test_auth.py -v` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | AUTH-02 | — | JWT cookie set as httpOnly SameSite=Lax | unit | `cd backend && uv run pytest tests/test_jwt.py -v` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | AUTH-03 | — | Logout clears session cookie | unit | `cd backend && uv run pytest tests/test_auth.py::test_logout -v` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | INFR-01 | — | Database connects and migrations run | integration | `cd backend && uv run pytest tests/test_db.py -v` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | INFR-02 | — | Frontend builds and serves | build | `cd frontend && pnpm build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/conftest.py` — shared fixtures (test DB, test client)
- [ ] `backend/tests/test_auth.py` — stubs for AUTH-01, AUTH-02, AUTH-03
- [ ] `backend/tests/test_db.py` — stubs for INFR-01
- [ ] `frontend/vitest.config.ts` — vitest configuration
- [ ] pytest + httpx install — test framework dependencies

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth redirect works with real Google | AUTH-01 | Requires real Google OAuth credentials | 1. Navigate to landing page 2. Click "Sign in with Google" 3. Complete Google auth 4. Verify redirect to dashboard |
| Railway deployment accessible | INFR-02 | Requires deployed infrastructure | 1. Access Railway URL 2. Verify frontend loads 3. Verify API responds at /api/health |
| Page refresh maintains session | AUTH-02 | Requires browser cookie persistence | 1. Sign in 2. Refresh page 3. Verify still authenticated |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
