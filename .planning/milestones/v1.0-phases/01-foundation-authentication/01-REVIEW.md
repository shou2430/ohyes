---
status: issues_found
phase: 01
depth: standard
files_reviewed: 22
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
reviewed: 2026-05-06
---

# Code Review: Phase 01 — Foundation Authentication

## Summary

The foundation is well-structured: clean async SQLAlchemy setup, proper JWT creation/validation with PyJWT, correct Authlib OAuth integration, and a functional frontend auth flow with AuthContext, ProtectedRoute, and callback handling. Two critical issues need attention before production: the JWT token is exposed in a redirect URL query parameter (leaks via logs, Referer, and browser history), and the default secrets silently work in production without any guard. Five warnings cover health endpoint status codes, unnecessary DB commits, unhandled ValueError in JWT parsing, missing SessionMiddleware hardening, and a React side-effect anti-pattern. Three informational items note missing error display to users, reliance on Vite proxy for API routing, and limited test database isolation.

## Findings

### CR-01: JWT token passed in URL query parameter — leaks via Referer, logs, browser history
- **Severity:** critical
- **File:** backend/app/routers/auth.py:76
- **Issue:** After OAuth callback, the JWT is appended as a plaintext query parameter (`/auth/callback?token=...`) via `RedirectResponse`. Query parameters appear in browser history, server access logs, Referer headers on outbound navigation, and any analytics/monitoring tools. The frontend `AuthCallbackPage.jsx` reads the token and stores it in localStorage, but the URL with the token remains in browser history. An attacker with access to any of these sources obtains a valid 24-hour session token.
- **Fix:** Use a URL fragment (`#token=...`) instead of a query parameter — fragments are not sent to servers or included in Referer headers. Alternatively, implement a short-lived one-time authorization code pattern where the frontend exchanges a code for the JWT via a POST request. At minimum, the frontend should call `window.history.replaceState({}, '', '/auth/callback')` immediately after reading the token to scrub it from the URL and history.

### CR-02: Insecure default JWT_SECRET and SESSION_SECRET silently used in production
- **Severity:** critical
- **File:** backend/app/core/config.py:13-14
- **Issue:** Both `JWT_SECRET` and `SESSION_SECRET` default to `"change-me-in-production"`. If the environment variables are not set during deployment, the application starts normally with these publicly known values. Anyone can forge valid JWTs and session cookies. There is no startup validation, no warning, and no failure.
- **Fix:** Add a Pydantic `@model_validator` in `Settings` that raises `ValueError` if either secret is the placeholder string when not in a development environment. Better yet, remove the default values entirely (`JWT_SECRET: str` with no default) so the app refuses to start without explicit configuration.

### WR-01: Health endpoint returns HTTP 200 when database is down
- **Severity:** warning
- **File:** backend/app/routers/health.py:16-17
- **Issue:** When the database connection fails, the endpoint catches the exception and returns HTTP 200 with `{"status": "unhealthy", "database": "disconnected"}`. Load balancers, Railway health checks, and uptime monitors rely on HTTP status codes. A 200 response means the service will never be marked unhealthy by infrastructure tooling.
- **Fix:** Return HTTP 503 (Service Unavailable) when the database check fails: `return JSONResponse(status_code=503, content={"status": "unhealthy", "database": "disconnected"})`.

### WR-02: `get_db` commits on every request, including read-only ones
- **Severity:** warning
- **File:** backend/app/core/database.py:30
- **Issue:** The `get_db` dependency always calls `await session.commit()` after the route handler completes, even for GET requests that only read data. This sends unnecessary `COMMIT` statements to the database on every request, adding latency and DB load.
- **Fix:** Let individual route handlers call `db.commit()` explicitly when they perform writes. Change the dependency to only yield the session without auto-committing. For the current small codebase the impact is negligible, but this pattern will compound as endpoints grow.

### WR-03: `int()` conversion of JWT `sub` claim can raise unhandled ValueError
- **Severity:** warning
- **File:** backend/app/core/security.py:50
- **Issue:** `int(user_id)` is called on the `sub` claim extracted from the JWT payload. If a valid-signature token contains a non-numeric `sub` value (e.g., `"sub": "abc"` — possible if the secret is compromised or during testing), this raises an unhandled `ValueError`, resulting in a 500 Internal Server Error with a stack trace instead of a clean 401.
- **Fix:** Wrap in try/except: `try: uid = int(user_id) except (ValueError, TypeError): raise HTTPException(status_code=401, detail="Invalid session")`.

### WR-04: SessionMiddleware missing SameSite and secure cookie attributes
- **Severity:** warning
- **File:** backend/app/main.py:12
- **Issue:** `SessionMiddleware` is added with only `secret_key`. The session cookie used for OAuth state storage has no explicit `same_site` or `https_only` configuration. In production (HTTPS), the session cookie should be marked `SameSite=Lax` and `Secure=True` to prevent CSRF attacks on the OAuth callback and to avoid the cookie being sent over plain HTTP.
- **Fix:** Pass `same_site="lax"` and `https_only=True` to `SessionMiddleware` for production. Consider making these configurable via environment variables or deriving them from the `API_URL` scheme.

### WR-05: `document.title` set as a side effect in render body
- **Severity:** warning
- **File:** frontend/src/pages/DashboardPage.jsx:13
- **Issue:** `document.title = "Dashboard - OhYes"` is called directly in the component function body, running on every render. This is a side effect outside React's lifecycle, violating the principle that render functions should be pure. In React Strict Mode, this runs twice per render cycle unnecessarily.
- **Fix:** Move into a `useEffect`: `useEffect(() => { document.title = "Dashboard - OhYes"; }, []);`

### IR-01: AuthCallbackPage does not display OAuth errors to the user
- **Severity:** info
- **File:** frontend/src/pages/AuthCallbackPage.jsx:14-16
- **Issue:** When the `error` search parameter is present (set by the backend when OAuth fails at line 42 of auth.py), the page silently redirects to `/` without showing any error message. The user gets no indication of what went wrong with their sign-in attempt.
- **Fix:** Before redirecting, pass the error as navigation state to the landing page (`navigate("/", { state: { error } })`) and display a toast or banner there. Alternatively, show a brief error message on the callback page before redirecting.

### IR-02: Frontend uses relative `/api` paths — requires proxy configuration in production
- **Severity:** info
- **File:** frontend/src/context/AuthContext.jsx:26, frontend/src/pages/LandingPage.jsx:38
- **Issue:** API calls use relative paths (`/api/auth/me`, `/api/auth/logout`) and the login link points to `/api/auth/login`. This works in development via Vite's proxy configuration, but according to the architecture docs, the frontend and backend will be on separate Railway domains in production. These relative paths will 404 unless a reverse proxy is configured in front of the static frontend, or the paths are prefixed with the API URL.
- **Fix:** Use `VITE_API_URL` environment variable (build-time) to construct absolute API URLs. This is likely planned for a later phase but is a production blocker worth tracking.

### IR-03: Test suite does not isolate database state
- **Severity:** info
- **File:** backend/tests/conftest.py:1-13
- **Issue:** The test client fixture uses the real `app` instance with its production database configuration. There is no test database setup, no transaction rollback between tests, and no dependency overrides for the database session. Tests that hit database-dependent endpoints will fail without a running PostgreSQL instance and may leave stale state between runs.
- **Fix:** Acceptable for Phase 01 since current tests are lightweight (health check, auth redirect, JWT unit tests). As the test suite grows, introduce a test database fixture with per-test transaction rollback or use `app.dependency_overrides` to inject a test session factory.

## Files Reviewed
- `backend/app/core/config.py`
- `backend/app/core/database.py`
- `backend/app/core/security.py`
- `backend/app/main.py`
- `backend/app/models/base.py`
- `backend/app/models/__init__.py`
- `backend/app/models/user.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/health.py`
- `backend/app/schemas/user.py`
- `backend/alembic/env.py`
- `backend/tests/conftest.py`
- `backend/tests/test_auth.py`
- `backend/tests/test_db.py`
- `backend/tests/test_jwt.py`
- `frontend/src/App.jsx`
- `frontend/src/components/ProtectedRoute.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/pages/AuthCallbackPage.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/LandingPage.jsx`
- `frontend/vite.config.js`
