---
phase: 1
status: issues_found
depth: standard
files_reviewed: 26
findings:
  critical: 2
  warning: 6
  info: 7
  total: 15
reviewed: 2026-05-06
---

# Phase 1 Code Review

## Summary

The foundation is solid overall — async SQLAlchemy, proper JWT validation, and clean separation of concerns are all in place. However, two critical issues require immediate attention: the JWT token is exposed in a redirect URL query parameter (open to server-log and referrer leakage), and the auth callback silently swallows DB exceptions without surfacing an error to the user. Several warnings around missing token storage, no CSRF protection on the OAuth callback, and unsafe defaults also need addressing before production.

## Findings

### CR-01: JWT Token Exposed in Redirect URL Query Parameter
- **Severity**: critical
- **File**: `backend/app/routers/auth.py:70`
- **Issue**: After OAuth callback, the JWT is appended as a plaintext query parameter (`/auth/callback?token=...`) and sent via `RedirectResponse`. Query parameters appear in browser history, server access logs, Referer headers on outbound navigation, and any analytics/monitoring tools. An attacker with read access to any of these can steal a valid 24-hour session token.
- **Fix**: Use a short-lived (60-second) one-time code stored server-side (e.g., in the session or a DB table), redirect to `/auth/callback?code=...`, then have the frontend exchange the code for the JWT via a POST to `/api/auth/token`. Alternatively, set the JWT in an HttpOnly cookie and redirect without any token in the URL.

### CR-02: OAuth Callback Silently Redirects to Error URL on Exception
- **Severity**: critical
- **File**: `backend/app/routers/auth.py:37-70`
- **Issue**: `authorize_access_token` can raise `OAuthError` (e.g., CSRF state mismatch, expired state, invalid grant). This exception is not caught — it will propagate as an unhandled 500 with a raw stack trace rather than a clean redirect to the frontend error page. Additionally, the DB upsert at lines 48-64 is not wrapped in try/except; a DB failure after `db.flush()` will also raise a 500 with no user-facing guidance.
- **Fix**: Wrap `authorize_access_token` in a `try/except OAuthError` block and redirect to `{FRONTEND_URL}/?error=auth_failed`. Wrap the upsert block similarly, catching `SQLAlchemyError`.

### WR-01: Frontend Sends Bearer Token Incorrectly — `/api/auth/me` Will Always Return 403
- **Severity**: warning
- **File**: `frontend/src/context/AuthContext.jsx:12`
- **Issue**: `AuthContext` calls `/api/auth/me` with `credentials: "same-origin"` but sends no `Authorization` header. The backend `get_current_user` dependency requires a `Bearer` token via `HTTPBearer`. The `fetch` call will return 403 on every page load, so `user` will always be `null` and the dashboard will be unreachable after redirect (the frontend has no mechanism to read or store the token from the OAuth redirect URL).
- **Fix**: After Google OAuth redirects to `/auth/callback?token=...`, the frontend needs a route/page that reads `token` from the query string, stores it in `localStorage` (or an in-memory store), and then includes it as `Authorization: Bearer <token>` on all API calls. The current codebase has no `/auth/callback` route defined in `App.jsx`.

### WR-02: Missing `/auth/callback` Route in Frontend Router
- **Severity**: warning
- **File**: `frontend/src/App.jsx`
- **Issue**: The backend redirects the browser to `{FRONTEND_URL}/auth/callback?token=...` after OAuth, but `App.jsx` defines no route for `/auth/callback`. React Router will render nothing (or fall through to a 404 depending on server config), leaving the token in the URL with no handler to consume it.
- **Fix**: Add `<Route path="/auth/callback" element={<AuthCallbackPage />} />`. The `AuthCallbackPage` should extract the token from `useSearchParams()`, store it, then `navigate("/dashboard", { replace: true })`.

### WR-03: `document.title` Set Directly in Render Body (Side Effect in Render)
- **Severity**: warning
- **File**: `frontend/src/pages/DashboardPage.jsx:12`
- **Issue**: `document.title = "Dashboard - OhYes"` is executed as a side effect directly in the function body on every render. In React Strict Mode (enabled in `main.jsx`), this runs twice per render cycle. It also violates React's principle that render must be pure.
- **Fix**: Move into a `useEffect(() => { document.title = "Dashboard - OhYes"; }, [])`.

### WR-04: Default JWT_SECRET and SESSION_SECRET Are Insecure Placeholder Values
- **Severity**: warning
- **File**: `backend/app/core/config.py:13-14`
- **Issue**: Both `JWT_SECRET` and `SESSION_SECRET` default to `"change-me-in-production"`. If the application is deployed without setting these environment variables, real user sessions are signed with a publicly known key. Anyone can forge valid JWTs.
- **Fix**: Add a startup validation check (e.g., using Pydantic's `@model_validator`) that raises a `ValueError` if either secret is the placeholder string when `ENVIRONMENT != "development"`. Consider also enforcing a minimum length (32+ characters).

### WR-05: Health Endpoint Returns HTTP 200 for Unhealthy State
- **Severity**: warning
- **File**: `backend/app/routers/health.py:17`
- **Issue**: When the database is disconnected, the endpoint returns `{"status": "unhealthy", "database": "disconnected"}` with HTTP status `200`. Load balancers and uptime monitors (including Railway's) use HTTP status codes to determine health. A `200` response means the service will never be marked unhealthy by infrastructure tooling.
- **Fix**: Return HTTP `503` when unhealthy: `return JSONResponse(status_code=503, content={"status": "unhealthy", "database": "disconnected"})`.

### WR-06: No CSRF Protection on OAuth State Validation Dependency
- **Severity**: warning
- **File**: `backend/app/routers/auth.py:34-40`
- **Issue**: `SessionMiddleware` stores the OAuth `state` parameter, and Authlib validates it on callback. However, if `SESSION_SECRET` is weak or the session cookie has no `SameSite` attribute explicitly set, CSRF on the callback endpoint is possible. The `SessionMiddleware` default does not set `SameSite=Lax` on the session cookie in older Starlette versions.
- **Fix**: Explicitly pass `same_site="lax"` and `https_only=True` (in production) to `SessionMiddleware`: `SessionMiddleware(secret_key=..., same_site="lax", https_only=settings.ENVIRONMENT == "production")`.

### IR-01: `async_database_url` Property Does Not Handle `postgresql+asyncpg://` Input Idempotently
- **Severity**: info
- **File**: `backend/app/core/config.py:24-26`
- **Issue**: Railway injects `DATABASE_URL` as `postgresql://...`. The `.replace("postgresql://", "postgresql+asyncpg://", 1)` handles this correctly. However, if someone sets `DATABASE_URL=postgresql+asyncpg://...` directly, the replacement fails silently and returns the original URL unchanged — which is actually correct behavior, but could be documented.
- **Fix**: Add a guard: `if "postgresql+asyncpg://" in url: return url` before the replace, or add a comment explaining the idempotency assumption.

### IR-02: `updated_at` Will Not Auto-Update on SQLAlchemy ORM Updates
- **Severity**: info
- **File**: `backend/app/models/user.py:20-22`
- **Issue**: `onupdate=func.now()` in SQLAlchemy ORM context is a Python-side `onupdate` trigger, not a database trigger. It works correctly for ORM `UPDATE` statements. However, the migration in `b14db3594d41` only sets `server_default=now()` for `updated_at` — there is no `ON UPDATE` trigger at the DB level. If anyone issues a raw SQL `UPDATE` bypassing the ORM, `updated_at` will not be refreshed.
- **Fix**: Either accept this limitation (ORM-only updates), or add a `CREATE OR REPLACE TRIGGER` in a future migration to enforce `updated_at` at the DB level.

### IR-03: Alembic `email` Unique Constraint Has No Index
- **Severity**: info
- **File**: `backend/alembic/versions/b14db3594d41_create_users_table.py:44`
- **Issue**: `google_id` has both a `UniqueConstraint` and an explicit `create_index` call (line 47). `email` only has a `UniqueConstraint` (which PostgreSQL implements as a unique index, so lookup performance is fine). However, the model defines `email` without `index=True`, creating an inconsistency between model definition and migration intent. Future `autogenerate` may detect a drift.
- **Fix**: Add `index=True` to the `email` column in `user.py` to match the implicit index created by the unique constraint, or remove the explicit `create_index` on `google_id` since `UniqueConstraint` already creates one (avoid the duplicate).

### IR-04: Dockerfile Uses `:latest` Tag for `uv`
- **Severity**: info
- **File**: `backend/Dockerfile:4`
- **Issue**: `COPY --from=ghcr.io/astral-sh/uv:latest` pins to the floating `latest` tag. This means the Docker layer cache may silently pick up a breaking `uv` version change between builds.
- **Fix**: Pin to a specific `uv` version: `COPY --from=ghcr.io/astral-sh/uv:0.6.x /uv /uvx /bin/`.

### IR-05: `conftest.py` Missing `pytest-asyncio` Mode Configuration
- **Severity**: info
- **File**: `backend/tests/conftest.py`
- **Issue**: The `client` fixture is `async def` and the tests use `@pytest.mark.asyncio`, but there is no `asyncio_mode = "auto"` in `pytest.ini` or `pyproject.toml`, and no `pytest_plugins` declaration for `anyio`. In newer `pytest-asyncio` versions (>=0.21), `asyncio_mode` must be explicitly set to `"auto"` or each async fixture needs `@pytest_asyncio.fixture`.
- **Fix**: Add `asyncio_mode = "auto"` to `[tool.pytest.ini_options]` in `pyproject.toml`, or change `@pytest.fixture` to `@pytest_asyncio.fixture` on the async client fixture.

### IR-06: `i18n` Initialised as a Module Side Effect on Import
- **Severity**: info
- **File**: `frontend/src/i18n/index.js:6`
- **Issue**: `i18n.use(initReactI18next).init(...)` is called at module load time (not inside a component or effect). `init` returns a Promise that is not awaited. If translation JSON files were ever fetched asynchronously (e.g., from a CDN), this would cause a race condition where components render before translations are ready. Currently, translations are bundled inline so the race does not manifest, but it is fragile.
- **Fix**: Either await the `init` promise before mounting the React tree (in `main.jsx`), or add `initImmediate: false` to the `i18n.init` options to ensure synchronous initialization for bundled resources.

### IR-07: `LocalStorage` Token Strategy Has No Fallback for Private/Incognito Browsers
- **Severity**: info
- **File**: `frontend/src/context/AuthContext.jsx` (implied by WR-01 fix path)
- **Issue**: The intended token storage mechanism (not yet implemented) will likely use `localStorage`. In some private browsing modes and restrictive enterprise environments, `localStorage` access throws a `SecurityError`. `fetch` calls would then fail silently or throw uncaught errors.
- **Fix**: When implementing token storage, wrap `localStorage.setItem/getItem` in a try/catch with a graceful degradation to in-memory state (and a user-visible notice that session won't persist across tabs).

## Files Reviewed

- `backend/app/core/config.py`
- `backend/app/core/database.py`
- `backend/app/core/security.py`
- `backend/app/main.py`
- `backend/app/models/base.py`
- `backend/app/models/user.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/health.py`
- `backend/app/schemas/user.py`
- `backend/alembic/env.py`
- `backend/alembic/versions/b14db3594d41_create_users_table.py`
- `backend/Dockerfile`
- `backend/tests/conftest.py`
- `backend/tests/test_auth.py`
- `backend/tests/test_db.py`
- `backend/tests/test_jwt.py`
- `frontend/src/App.jsx`
- `frontend/src/components/LoadingSpinner.jsx`
- `frontend/src/components/ProtectedRoute.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/i18n/index.js`
- `frontend/src/index.css`
- `frontend/src/main.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/LandingPage.jsx`
- `frontend/vite.config.js`
