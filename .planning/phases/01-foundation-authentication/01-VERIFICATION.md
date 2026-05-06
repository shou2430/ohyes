---
status: passed
phase: 01
verified: 2026-05-06
must_haves_met: 4/4
---

# Phase 01 Verification: Foundation & Authentication

**Re-verified after gap closure plans 01-05 and 01-06 resolved all blocking gaps from the initial verification.**

## Must-Have Checks

### SC-1: User can click "Sign in with Google" and land on an authenticated dashboard shell

**Status: PASS**

Evidence:
- `frontend/src/pages/LandingPage.jsx` renders `<a href="/api/auth/login">` with translated "Sign in with Google" text
- `backend/app/routers/auth.py` `GET /api/auth/login` calls `oauth.google.authorize_redirect(request, redirect_uri)` to redirect to Google OAuth consent
- `backend/app/routers/auth.py` `GET /api/auth/callback` handles Google response, upserts user by `google_id`, creates JWT via `create_access_token(user.id)`, redirects to `{FRONTEND_URL}/auth/callback?token=<jwt>`
- `frontend/src/pages/AuthCallbackPage.jsx` reads `token` from URL search params, stores in `localStorage` with key `ohyes_token`, navigates to `/dashboard` with `replace: true`
- `frontend/src/App.jsx` has `<Route path="/auth/callback" element={<AuthCallbackPage />} />` (unprotected)
- `frontend/src/App.jsx` routes `/dashboard` through `<ProtectedRoute>` wrapping `<DashboardPage />`
- `frontend/src/pages/DashboardPage.jsx` renders dashboard shell with user display_name, avatar, logout button, and empty state with disabled "Create Invitation" button

**Previous blocker resolved:** GAP-01 (missing `/auth/callback` route) and GAP-02 (no Bearer header) fixed by Plan 01-05.

### SC-2: User can refresh the page and remain logged in (session persists)

**Status: PASS**

Evidence:
- `frontend/src/context/AuthContext.jsx` defines `TOKEN_KEY = "ohyes_token"`
- On mount, `checkAuth()` reads `localStorage.getItem(TOKEN_KEY)` -- if no token, skips fetch and sets `loading = false` immediately
- If token exists, calls `fetch("/api/auth/me", { headers: { Authorization: "Bearer <token>" } })` via `authHeaders()` helper
- `backend/app/core/security.py` `get_current_user` validates JWT (`exp` claim, HS256 signature, user lookup by ID)
- `backend/app/routers/auth.py` `GET /api/auth/me` returns user via `response_model=UserResponse`
- JWT has 24-hour TTL (`JWT_EXPIRATION_HOURS = 24`)
- `localStorage` persists across page refreshes and browser restarts
- On 401/403 from `/api/auth/me`, token is cleared from localStorage (expired token cleanup)

**Previous blocker resolved:** GAP-02 and GAP-03 fixed by Plan 01-05 (AuthContext rewritten with Bearer token auth and localStorage persistence).

### SC-3: User can log out and is returned to the public landing page

**Status: PASS**

Evidence:
- `frontend/src/pages/DashboardPage.jsx` has logout button calling `handleLogout()` which invokes `await logout()` then `navigate("/")`
- `frontend/src/context/AuthContext.jsx` `logout()` calls `POST /api/auth/logout` with Bearer header, then in `finally` block calls `localStorage.removeItem(TOKEN_KEY)` and `setUser(null)`
- `backend/app/routers/auth.py` `POST /api/auth/logout` returns `{"message": "Logged out"}`
- After `setUser(null)`, `ProtectedRoute` redirects to `/` if user navigates to `/dashboard`
- `LandingPage` shows sign-in button when `user` is null

### SC-4: App is accessible at a Railway-hosted URL with backend and database connected

**Status: PASS (deployment artifacts complete; actual Railway deployment requires human verification)**

Evidence:
- `backend/Dockerfile`: `python:3.12-slim` base, uv from `ghcr.io/astral-sh/uv:latest`, `uv sync --frozen --no-dev`, `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`, `mkdir -p /data/photos`
- `backend/.dockerignore`: excludes `.venv`, `.env`, `tests`, `__pycache__`
- `backend/.env.example`: 8-step Railway setup guide, all env vars documented
- `frontend/.env.example`: documents `VITE_API_URL`
- No `frontend/Dockerfile` or `frontend/Caddyfile` (frontend deployed as Railway static site)
- `backend/app/main.py`: CORS allows `FRONTEND_URL` origin with `Authorization` header; SessionMiddleware for OAuth state
- `backend/app/routers/health.py`: `/api/health` checks DB with `SELECT 1`
- `backend/alembic/versions/b14db3594d41_create_users_table.py`: initial migration for `users` table

## Automated Checks

| Check | Result |
|-------|--------|
| Backend tests (7 total) | PASS -- 7/7 passed in 0.28s |
| Backend lint (ruff check) | PASS -- "All checks passed!" |
| Frontend build (pnpm build) | PASS -- built in 3.26s (291KB JS gzip:93KB, 10KB CSS gzip:2.9KB) |
| API routes registered | PASS -- all 5 required routes present |
| Alembic migration | PASS -- `b14db3594d41_create_users_table.py` with `create_table` for `users` |
| Backend Dockerfile | PASS -- correct structure verified |
| Backend .dockerignore | PASS -- excludes `.env`, `.venv`, `tests` |
| Backend .env.example | PASS -- all required vars documented |
| Frontend .env.example | PASS -- `VITE_API_URL` documented |

### Test Results

```
tests/test_jwt.py::test_create_access_token_contains_sub         PASSED
tests/test_jwt.py::test_create_access_token_contains_exp         PASSED
tests/test_jwt.py::test_create_access_token_invalid_secret_fails PASSED
tests/test_auth.py::test_login_redirects_to_google               PASSED
tests/test_auth.py::test_me_returns_401_without_token            PASSED
tests/test_auth.py::test_logout_returns_success                  PASSED
tests/test_db.py::test_health_endpoint                           PASSED
```

**Warnings noted:** JWT tests produce `InsecureKeyLengthWarning` because the default `JWT_SECRET = "change-me-in-production"` is 23 bytes (< 32 byte minimum for HS256). Expected in dev; production requires 32+ byte secret as documented in `.env.example`.

## Human Verification

Items that require manual testing (cannot be verified programmatically):

1. **Google OAuth end-to-end flow** -- Click "Sign in with Google", complete Google consent, verify redirect chain: Google -> `/api/auth/callback` -> `/auth/callback?token=...` -> `/dashboard` with user info. Requires real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
2. **Session persistence** -- After signing in, refresh the page and verify dashboard remains displayed with user info.
3. **Logout flow** -- Click "Log out", verify redirect to landing page, verify `/dashboard` is inaccessible after logout.
4. **Railway deployment** -- Verify app is accessible at Railway-hosted URL with frontend, backend, and database all connected. Health endpoint returns `"database": "connected"`.
5. **OAuthError edge case** -- Trigger expired OAuth state and verify clean redirect to `/?error=auth_failed` instead of 500.

## Requirement Traceability

| Requirement | Description | Implementation | Status |
|-------------|-------------|----------------|--------|
| AUTH-01 | User can log in with Google OAuth (one-click) | `backend/app/routers/auth.py`: login/callback endpoints with Authlib; `frontend/src/pages/LandingPage.jsx`: sign-in link; `frontend/src/pages/AuthCallbackPage.jsx`: token capture; OAuthError handling (Plan 01-06) | IMPLEMENTED |
| AUTH-02 | User session persists via JWT (24h TTL) | `backend/app/core/security.py`: `create_access_token` (HS256, 24h exp), `get_current_user` (Bearer validation); `frontend/src/context/AuthContext.jsx`: localStorage JWT persistence, Bearer header on API calls | IMPLEMENTED |
| AUTH-03 | User can log out from dashboard | `backend/app/routers/auth.py`: POST /api/auth/logout; `frontend/src/pages/DashboardPage.jsx`: logout button; `frontend/src/context/AuthContext.jsx`: clears localStorage, sets user null | IMPLEMENTED |
| INFR-01 | Deployed on Railway (FastAPI + React + PostgreSQL) | `backend/Dockerfile`, `backend/.env.example` (Railway setup guide), `backend/app/main.py` (CORS + middleware), `backend/app/routers/health.py` (DB check), Alembic migrations | IMPLEMENTED (deployment artifacts ready; Railway deployment needs human verification) |
| INFR-02 | Photos stored on Railway persistent volume | `backend/Dockerfile`: `mkdir -p /data/photos`; `backend/app/core/config.py`: `PHOTO_STORAGE_PATH`; `backend/.env.example`: documents volume mount | IMPLEMENTED (path prepared; actual volume attachment needs human verification) |

## Gap Closure Status

All gaps identified in the initial verification have been resolved:

| Gap | Description | Resolved By | Status |
|-----|-------------|-------------|--------|
| GAP-01 | Missing `/auth/callback` frontend route | Plan 01-05, Task 1-2: `AuthCallbackPage.jsx` created, route added to `App.jsx` | CLOSED |
| GAP-02 | AuthContext sends no Authorization header | Plan 01-05, Task 3: AuthContext rewritten with `authHeaders()`, Bearer token, localStorage | CLOSED |
| GAP-03 | Session does not persist (combined GAP-01 + GAP-02) | Plan 01-05: token stored in localStorage, sent on mount via `/api/auth/me` | CLOSED |
| GAP-04 | OAuthError unhandled in callback | Plan 01-06: `except OAuthError` with redirect to `/?error=auth_failed` | CLOSED |

## Result

**Phase 01 PASSES verification.**

All 4 success criteria are met at the code level. All 5 requirements (AUTH-01, AUTH-02, AUTH-03, INFR-01, INFR-02) have corresponding, correct implementations in the codebase. All 7 backend tests pass, ruff lint is clean, and the frontend builds successfully.

The code-level implementation is complete:
- Backend: FastAPI app with Google OAuth (Authlib), JWT Bearer auth (24h TTL, HS256), User model (SQLAlchemy 2.0 async), Alembic migrations, health endpoint, CORS, SessionMiddleware, Dockerfile
- Frontend: Vite + React 19 + Tailwind v4 with landing page (sign-in), dashboard shell (logout, empty state), OAuth callback handler (token capture), AuthContext (localStorage JWT, Bearer headers), protected routing, i18n infrastructure

Remaining items are human-verification-only: actual Google OAuth flow testing, Railway deployment verification, and cross-origin behavior in production.
