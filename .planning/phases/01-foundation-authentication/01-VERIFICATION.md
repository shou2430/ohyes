---
phase: 1
status: gaps_found
verified: 2026-05-06
must_haves_checked: 26/30
---

# Phase 1 Verification

## Must-Haves Check

### Plan 01-01: Backend Scaffolding

| Must-Have | Status | Evidence |
|-----------|--------|---------|
| `backend/pyproject.toml` with all required deps (fastapi, sqlalchemy, asyncpg, alembic, authlib, pyjwt) | PASS | File exists with all deps confirmed |
| User model with google_id, email, display_name, avatar_url, created_at, updated_at | PASS | `backend/app/models/user.py` — all columns present |
| Async database engine with pool_size=5, max_overflow=10 | PASS | `backend/app/core/database.py` — both params confirmed |
| Alembic initialized with async template, initial migration for users table | PASS | `backend/alembic/versions/b14db3594d41_create_users_table.py` exists |
| `/api/health` endpoint with database connectivity check | PASS | `backend/app/routers/health.py` — SELECT 1 check present |
| All secrets loaded from environment variables | PASS | pydantic-settings with env_file loading |
| `.env.example` documents all required env vars | PASS | All 7 vars present (13 occurrences matched) |
| Ruff linting passes with zero errors | PASS | `ruff check .` — All checks passed |

### Plan 01-02: Frontend Scaffolding

| Must-Have | Status | Evidence |
|-----------|--------|---------|
| Frontend builds successfully with `pnpm build` | PASS | 290KB JS, 10KB CSS, 3.65s build time |
| React Router configured with / and /dashboard routes | PARTIAL | Routes exist in App.jsx but `/auth/callback` route is missing (see Gaps) |
| AuthContext checks /api/auth/me and provides user, loading, logout | PARTIAL | AuthContext exists but sends no Authorization header — will always get 401/403 (see Gaps) |
| ProtectedRoute redirects to / when unauthenticated, shows spinner while loading | PASS | `frontend/src/components/ProtectedRoute.jsx` correct |
| Landing page with app name, tagline, sign-in link to /api/auth/login | PASS | `frontend/src/pages/LandingPage.jsx` correct |
| Dashboard with top bar, user info, logout, empty state | PASS | `frontend/src/pages/DashboardPage.jsx` correct |
| Tailwind v4 with design tokens: cream, accent, Inter font | PASS | `frontend/src/index.css` has all tokens |
| i18n with zh-TW default and en fallback | PASS | `frontend/src/i18n/index.js` confirmed |
| Vite dev server proxies /api to localhost:8000 | PASS | `frontend/vite.config.js` proxy config confirmed |

### Plan 01-03: Google OAuth Flow, JWT Bearer Tokens

| Must-Have | Status | Evidence |
|-----------|--------|---------|
| GET /api/auth/login redirects to Google OAuth | PASS | Route registered; test passes |
| GET /api/auth/callback handles response, upserts user, redirects to /auth/callback?token= | PASS | Backend redirects to `{FRONTEND_URL}/auth/callback?token=<jwt>` |
| GET /api/auth/me returns user from Bearer token or 401 | PASS | Endpoint exists; test `test_me_returns_401_without_token` passes |
| POST /api/auth/logout returns success | PASS | Test passes; returns `{"message": "Logged out"}` |
| JWT contains sub and exp claims, HS256 signed | PASS | JWT tests pass: sub and exp verified |
| get_current_user uses HTTPBearer | PASS | `backend/app/core/security.py` confirmed |
| SessionMiddleware added for Authlib | PASS | `backend/app/main.py` confirmed |
| CORS configured with FRONTEND_URL origin, Authorization header allowed | PASS | `backend/app/main.py` confirmed |
| Test stubs for auth and JWT | PASS | 7 tests all passing |

### Plan 01-04: Deployment Config

| Must-Have | Status | Evidence |
|-----------|--------|---------|
| Backend Dockerfile with uv, --no-dev, uvicorn on $PORT | PASS | `backend/Dockerfile` confirmed |
| Backend Dockerfile creates /data/photos | PASS | `mkdir -p /data/photos` in Dockerfile |
| Backend .dockerignore excludes .env, .venv, tests | PASS | `.dockerignore` confirmed |
| Frontend has NO Dockerfile and NO Caddyfile | PASS | Neither file exists |
| Frontend .env.example documents VITE_API_URL | PASS | `frontend/.env.example` confirmed |
| Backend .env.example documents all required env vars and Railway setup | PASS | 8-step setup guide present |
| OAuth redirect URI documented as API_URL/api/auth/callback | PASS | `.env.example` references `<API_URL>/api/auth/callback` |

## Automated Checks

### Backend Tests: 7/7 PASSED
```
tests/test_auth.py::test_login_redirects_to_google       PASSED
tests/test_auth.py::test_me_returns_401_without_token    PASSED
tests/test_auth.py::test_logout_returns_success          PASSED
tests/test_db.py::test_health_endpoint                   PASSED
tests/test_jwt.py::test_create_access_token_contains_sub PASSED
tests/test_jwt.py::test_create_access_token_contains_exp PASSED
tests/test_jwt.py::test_create_access_token_invalid_secret_fails PASSED
```

Note: 6 warnings about HMAC key length (23 bytes < recommended 32 bytes) — caused by the default `JWT_SECRET = "change-me-in-production"`. This is expected in the test environment and is mitigated by WR-04 fix guidance.

### Frontend Build: PASSED
- `pnpm build` exits 0
- Output: 290KB JS (92KB gzip), 10KB CSS (2.9KB gzip)
- Build time: 3.65s

### Ruff Linting: PASSED
- `ruff check .` — All checks passed

### Route Registration (backend): CONFIRMED
All 5 required routes registered: `/api/health`, `/api/auth/login`, `/api/auth/callback`, `/api/auth/me`, `/api/auth/logout`

### Python Version Note
The environment runs Python 3.13.5 despite `requires-python = ">=3.12"`. This is not a functional issue — all tests pass — but deviates from the CLAUDE.md specification of Python 3.12. Python 3.13 is not officially tested against all dependencies per the CLAUDE.md rationale.

## Code Review Issues

Issues from `01-REVIEW.md` assessed against phase goal:

### CR-01: JWT Token Exposed in Redirect URL Query Parameter (critical)
- **Blocks phase goal?** No — the OAuth flow is architecturally functional; the token reaches the frontend via the redirect URL.
- **Assessment:** Security concern that should be addressed before production. Does not block development-environment testing of the auth flow. Recommended fix: one-time code exchange or HttpOnly cookie.

### CR-02: OAuthError Not Caught in Callback (critical)
- **Blocks phase goal?** Partially — if a CSRF state mismatch or expired state occurs during testing, the user gets a raw 500 error instead of a clean redirect. Not a normal happy-path blocker, but degrades the auth flow for edge cases.
- **Assessment:** Should be fixed before phase is declared fully complete for production use.

### WR-01: AuthContext Sends No Authorization Header — `/api/auth/me` Always Returns 403 (warning → BLOCKER)
- **Blocks phase goal?** YES. This directly blocks success criteria #1 and #2:
  - "User can click 'Sign in with Google' and land on an authenticated dashboard shell" — BLOCKED. After OAuth redirect to `/auth/callback?token=...`, the token is never read or stored. `AuthContext` calls `/api/auth/me` without a Bearer token, gets 403, sets `user = null`, and `ProtectedRoute` redirects back to `/`.
  - "User can refresh the page and remain logged in" — BLOCKED. No token storage exists.
- **Assessment:** The authentication loop is broken. The JWT is delivered to the frontend URL but nothing reads it.

### WR-02: Missing `/auth/callback` Route in Frontend Router (warning → BLOCKER)
- **Blocks phase goal?** YES. The backend redirects to `{FRONTEND_URL}/auth/callback?token=...` but `App.jsx` has no route for `/auth/callback`. The token cannot be consumed.
- **Assessment:** There is no `AuthCallbackPage` component anywhere in the codebase. This is confirmed by grep verification.

### WR-03: `document.title` Set as Side Effect in Render Body (warning)
- **Blocks phase goal?** No — cosmetic/best-practice issue only.

### WR-04: Insecure Default JWT_SECRET and SESSION_SECRET (warning)
- **Blocks phase goal?** No in development. Blocker for production deployment.

### WR-05: Health Endpoint Returns HTTP 200 for Unhealthy State (warning)
- **Blocks phase goal?** No — functional behavior unchanged; monitoring accuracy issue.

### WR-06: Missing `same_site="lax"` on SessionMiddleware (warning)
- **Blocks phase goal?** No — CSRF risk in edge cases, not a happy-path blocker.

## Gaps

### GAP-01 (BLOCKS PHASE GOAL): Missing `/auth/callback` Frontend Route
The backend redirects to `{FRONTEND_URL}/auth/callback?token=<jwt>` after OAuth, but `App.jsx` defines no route for this path. React Router renders nothing at this URL. The token is dropped.

**Required fix:** Add `<Route path="/auth/callback" element={<AuthCallbackPage />} />` to `frontend/src/App.jsx` and create an `AuthCallbackPage` component that:
1. Reads `token` from `useSearchParams()`
2. Stores it in `localStorage`
3. Navigates to `/dashboard` with `replace: true`

### GAP-02 (BLOCKS PHASE GOAL): AuthContext Does Not Send Authorization Header
`AuthContext.jsx` calls `/api/auth/me` with `credentials: "same-origin"` only. The backend `get_current_user` dependency requires `Authorization: Bearer <token>`. The call always fails with 403.

**Required fix:** `AuthContext` must:
1. Read the JWT from `localStorage` on mount
2. Include `Authorization: Bearer <token>` header in the `/api/auth/me` fetch call
3. Include the same header in the `/api/auth/logout` fetch call
4. Clear `localStorage` on logout

### GAP-03 (BLOCKS PHASE GOAL — combined effect of GAP-01 + GAP-02): Session Does Not Persist
Because no token is stored and no Bearer header is sent, page refresh always results in `user = null`. Success criterion #2 ("User can refresh and remain logged in") cannot be met.

### GAP-04 (DOES NOT BLOCK — security): CR-02 OAuthError Unhandled
CSRF state mismatch or expired OAuth state produces a raw 500 instead of a user-friendly redirect. Fix before production.

## Human Verification

The following items require manual end-to-end testing with a real Google OAuth app configured and Railway deployment active:

1. **Google OAuth happy path** — Click "Sign in with Google", complete Google consent screen, confirm redirect lands on `/dashboard` with user info displayed. Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and correct redirect URI registered in Google Cloud Console. Cannot be verified without real credentials.

2. **Session persistence on refresh** — After signing in, reload `/dashboard` and confirm user remains logged in. Depends on GAP-01 and GAP-02 being fixed first.

3. **Logout flow** — Click "Log out", confirm redirect to landing page and subsequent `/dashboard` navigation requires re-authentication. Can be tested locally once GAP-01/GAP-02 are fixed.

4. **Railway deployment** — Verify app is accessible at a Railway-hosted URL with frontend, backend, and database all connected. The Docker build could not be verified in CI (network restriction blocked ghcr.io). Local Dockerfile syntax is correct.

5. **Database connectivity on Railway** — `/api/health` returns `{"status": "healthy", "database": "connected"}` with the Railway PostgreSQL plugin connected.

## Summary

The backend foundation (Plan 01-01), backend auth implementation (Plan 01-03), and deployment config (Plan 01-04) are all correctly implemented and tested. The frontend scaffolding (Plan 01-02) is structurally correct and builds successfully.

However, the authentication loop is broken by two blocking gaps (GAP-01, GAP-02): the frontend has no `/auth/callback` route to consume the OAuth-delivered JWT, and `AuthContext` never sends a Bearer token to the backend. As a result, **none of the four phase success criteria can currently be demonstrated end-to-end**. The fix is well-defined (add `AuthCallbackPage`, add `localStorage` token management in `AuthContext`) and represents approximately 1–2 hours of work.

**Verdict: `gaps_found` — Phase 1 infra and backend are solid but the frontend OAuth callback handling is not implemented. Phase goal cannot be verified until GAP-01 and GAP-02 are resolved.**
