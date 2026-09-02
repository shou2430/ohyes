# Plan 1-03 Summary: Google OAuth Flow, JWT Bearer Tokens, Login/Logout Endpoints

## Status: COMPLETE

## What Was Done

### Task 1-03-01: Create user Pydantic response schema
- Created `backend/app/schemas/user.py` with `UserResponse` model (id, email, display_name, avatar_url)
- Updated `backend/app/schemas/__init__.py` with export

### Task 1-03-02: Create JWT security utilities
- Created `backend/app/core/security.py` with:
  - `create_access_token(user_id)` — HS256 JWT with sub + exp (24h TTL)
  - `get_current_user` — FastAPI dependency using HTTPBearer to extract/validate JWT from Authorization header
  - Proper error handling for expired and invalid tokens

### Task 1-03-03: Create OAuth router
- Created `backend/app/routers/auth.py` with:
  - `GET /api/auth/login` — redirects to Google OAuth consent screen
  - `GET /api/auth/callback` — handles Google response, upserts user, redirects to frontend `/auth/callback?token=<jwt>`
  - `GET /api/auth/me` — returns current user from Bearer token (or 401)
  - `POST /api/auth/logout` — returns success message (client clears localStorage)
- Authlib OAuth client configured with Google OpenID Connect discovery

### Task 1-03-04: Register auth router, add middleware
- Updated `backend/app/main.py` with:
  - SessionMiddleware (required by Authlib for OAuth state)
  - CORSMiddleware with FRONTEND_URL origin, Authorization header allowed
  - Auth router registered

### Task 1-03-05: Create test stubs
- Created `backend/tests/conftest.py` with async test client fixture
- Created `backend/tests/test_auth.py` — 3 tests (login redirect, me 401, logout success)
- Created `backend/tests/test_jwt.py` — 3 tests (sub claim, exp claim, invalid secret)
- Created `backend/tests/test_db.py` — 1 test (health endpoint)
- All 7 tests pass

## Verification Results
- All 7 tests pass (`pytest tests/ -v`)
- All 5 routes registered: `/api/auth/login`, `/api/auth/callback`, `/api/auth/me`, `/api/auth/logout`, `/api/health`
- Ruff check passes with no errors

## Requirements Addressed
- **AUTH-01**: Google OAuth login flow via Authlib redirect
- **AUTH-02**: JWT Bearer token session with 24h TTL, HTTPBearer dependency
- **AUTH-03**: Logout endpoint (client-side localStorage clearing)

## Commits
1. `feat(01-03): create user Pydantic response schema`
2. `feat(01-03): create JWT security utilities with Bearer token auth`
3. `feat(01-03): create OAuth router with login, callback, me, and logout endpoints`
4. `feat(01-03): register auth router, add SessionMiddleware and CORS`
5. `feat(01-03): create test stubs for auth endpoints and JWT utilities`
