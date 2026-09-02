# Phase 1: Foundation & Authentication — Research

**Researched:** 2026-05-05
**Status:** Complete

## Executive Summary

Phase 1 scaffolds a greenfield monorepo (React 19 + Vite 6 frontend, FastAPI + SQLAlchemy 2.0 async backend) with Google OAuth authentication and deploys the full stack to Railway. The critical risk is cookie-based auth across Railway's default `*.up.railway.app` domains — the Public Suffix List prevents cross-subdomain cookies, so either a custom domain or a same-origin proxy strategy is required from day one. All other technology choices are well-documented and have clear, battle-tested setup paths.

---

## 1. Project Scaffolding

### Findings

**Frontend (React 19 + Vite 6 + Tailwind CSS v4 + react-i18next):**

- Scaffold with `pnpm create vite@latest frontend --template react` (not TypeScript per no explicit TS decision — but CLAUDE.md doesn't exclude it; recommend plain JS to keep simple unless user prefers TS).
- Tailwind CSS v4 setup is significantly simpler than v3: install `tailwindcss` and `@tailwindcss/vite`, add the Vite plugin, and use `@import "tailwindcss"` in CSS. No `tailwind.config.js` needed. Customization via `@theme` directives in CSS.
- react-i18next: install `i18next` + `react-i18next`, create `src/i18n/index.js` with config, create `src/i18n/zh-TW.json` and `src/i18n/en.json`, import in `main.jsx`.
- Additional deps: `react-router` (v7), `motion` (Framer Motion 12.x), `lucide-react` (icons per UI spec).

**Backend (FastAPI + uv + SQLAlchemy 2.0 async + Alembic):**

- Scaffold with `uv init backend --app` which creates `pyproject.toml` with uv's build backend.
- Core deps: `fastapi[standard]`, `uvicorn`, `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `authlib`, `httpx`, `itsdangerous`, `pyjwt`, `pillow`, `python-dotenv`.
- Dev deps: `ruff` (linting + formatting).
- uv generates `uv.lock` automatically on `uv add`; commit this to version control.
- Project structure: `backend/app/` with `main.py`, `models/`, `routers/`, `schemas/`, `core/` (config, security, database).

**Monorepo structure:**
```
/
├── frontend/          # React + Vite
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── nginx.conf (or Caddyfile)
├── backend/           # FastAPI
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── app/
│   ├── alembic/
│   ├── alembic.ini
│   └── Dockerfile
├── .planning/
├── CLAUDE.md
└── .gitignore
```

### Recommended Approach

1. Scaffold frontend with pnpm + Vite React template, add Tailwind v4 via `@tailwindcss/vite` plugin.
2. Scaffold backend with `uv init --app`, add all deps via `uv add`.
3. Initialize Alembic with async template: `uv run alembic init -t async alembic`.
4. Set up ESLint + Prettier for frontend, Ruff for backend (per D-13).
5. Use JavaScript (not TypeScript) unless user explicitly requests TS — keeps scaffolding simpler for a casual app.

### Risks

- **Node.js version:** Tailwind v4 and Vite 6 require Node.js 18+. Ensure Railway build environment uses Node 18+.
- **pnpm on Railway:** Railway auto-detects package managers. Having a `pnpm-lock.yaml` should trigger pnpm usage, but verify with a `nixpacks.toml` or Dockerfile if needed.

---

## 2. Google OAuth with FastAPI + Authlib

### Findings

**Flow (per D-01 through D-04):**

1. User clicks "Sign in with Google" on frontend.
2. Frontend navigates to `GET /api/auth/login` on backend.
3. Backend uses Authlib's `oauth.google.authorize_redirect(request, redirect_uri)` to redirect to Google.
4. Google redirects back to `GET /api/auth/callback` with auth code.
5. Backend calls `oauth.google.authorize_access_token(request)` to exchange code for tokens.
6. Backend extracts user info from Google's ID token (`token['userinfo']`).
7. Backend upserts user in database (Google ID, email, display name, avatar URL).
8. Backend generates its own JWT (containing internal user ID), signs with `JWT_SECRET` (HS256).
9. Backend sets JWT as httpOnly cookie on the response and redirects to `/dashboard`.

**Key dependencies:** `authlib`, `httpx` (Authlib needs an HTTP client), `itsdangerous` (for SessionMiddleware — Authlib uses `request.session` to store OAuth state/nonce).

**Authlib setup:**
```python
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)
```

**SessionMiddleware:** Required by Authlib for temporary OAuth state storage. Only needed on login/callback routes. Add via `app.add_middleware(SessionMiddleware, secret_key=...)`.

**JWT library:** Use **PyJWT** (`pyjwt`) — it is now the officially recommended library in FastAPI docs. python-jose was abandoned for years (revived May 2025 with v3.5.0, but PyJWT is the safer bet). HS256 is sufficient for this use case.

**JWT cookie settings (per D-02, D-03):**
```python
response.set_cookie(
    key="session",
    value=jwt_token,
    httponly=True,
    secure=True,          # requires HTTPS
    samesite="lax",       # or "none" — see CORS section
    max_age=86400,        # 24 hours
    path="/",
)
```

**Logout (AUTH-03):** Delete the cookie by setting `max_age=0` or using `response.delete_cookie("session")`.

**Auth dependency for protected routes:**
```python
async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session")
    if not token:
        raise HTTPException(401)
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    user = await get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(401)
    return user
```

### Recommended Approach

1. Use Authlib's Starlette OAuth client with Google's OpenID discovery endpoint.
2. Add SessionMiddleware for OAuth state management.
3. Generate JWT with PyJWT after successful OAuth, store in httpOnly cookie.
4. Create a `get_current_user` FastAPI dependency for protected routes.
5. Redirect URI: `{API_URL}/api/auth/callback` — must be registered in Google Cloud Console.

### Risks

- **OAuth redirect URI mismatch:** The callback URL must exactly match what's registered in Google Cloud Console. Different between dev (`http://localhost:8000/api/auth/callback`) and prod (`https://api-....up.railway.app/api/auth/callback` or custom domain). Use environment variable for `FRONTEND_URL` and `API_URL`.
- **SessionMiddleware secret:** Must be a strong random string, separate from `JWT_SECRET`. Store as environment variable.
- **Google Cloud Console setup:** Must enable Google+ API or People API, create OAuth 2.0 credentials, configure consent screen. This is a manual step outside the codebase.

---

## 3. Database Schema

### Findings

**SQLAlchemy 2.0 async model pattern:**

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, MappedAsDataclass
from sqlalchemy import String, DateTime
from datetime import datetime

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    google_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    display_name: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Async engine setup:**
```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(DATABASE_URL, pool_size=5, max_overflow=10)
async_session = async_sessionmaker(engine, expire_on_commit=False)
```

**Alembic async setup:**
- Initialize with `alembic init -t async alembic` to get the async `env.py` template.
- In `env.py`: import all models before setting `target_metadata = Base.metadata`.
- URL format must use `postgresql+asyncpg://` driver prefix.
- Use `NullPool` for migrations (no benefit to connection pooling for DDL).
- Escape `%` in URLs with `%%` when passing through `config.set_main_option()`.

### Recommended Approach

1. Create `Base` class in `app/models/base.py`.
2. Create `User` model in `app/models/user.py` with fields: id, google_id, email, display_name, avatar_url, created_at, updated_at.
3. Set up async engine and session factory in `app/core/database.py`.
4. Initialize Alembic with async template, configure `env.py` to import models and use async engine.
5. Generate initial migration: `uv run alembic revision --autogenerate -m "create users table"`.

### Risks

- **Empty autogenerated migrations:** If model modules are not imported in `env.py` before `target_metadata = Base.metadata`, Alembic silently generates empty migrations. Always explicitly import all model files.
- **DATABASE_URL format:** Railway provides `postgresql://...` but asyncpg requires `postgresql+asyncpg://...`. Need to transform the URL at runtime (string replace `postgresql://` with `postgresql+asyncpg://`).

---

## 4. Railway Deployment

### Findings

**Architecture (per D-17, D-18):**

| Service | Build | Serve |
|---------|-------|-------|
| Frontend | Multi-stage Docker: Node builds Vite, Nginx/Caddy serves `dist/` | Port from `$PORT` env var |
| Backend | Docker with uv, FastAPI + Uvicorn | Port from `$PORT` env var |
| Database | Railway PostgreSQL plugin | Internal networking |
| Volume | Persistent volume on backend | Mount at `/data/photos` |

**Critical finding — Caddy vs Nginx on Railway:**

Railway's community strongly recommends **Caddy over Nginx** for serving static files. Caddy has sane defaults that work well on Railway out of the box. Nginx requires more careful configuration (listening on `$PORT`, proper `try_files` for SPA routing). CLAUDE.md mentions "Nginx or Caddy" — Caddy is the better choice for Railway.

**Caddy setup for SPA:**
```
:{$PORT}
root * /srv
try_files {path} /index.html
file_server
```

**Frontend Dockerfile (multi-stage with Caddy):**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
```

**Backend Dockerfile:**
```dockerfile
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

Note: The `CMD` needs shell form for `$PORT` expansion, or use an entrypoint script.

**Auto-deploy (D-14):** Connect GitHub repo to Railway project. Railway watches the `main` branch by default. Each push triggers a build and deploy. Configure root directory per service (frontend → `/frontend`, backend → `/backend`).

**Environment variables (must be set in Railway dashboard):**
- Backend: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `FRONTEND_URL`, `SESSION_SECRET`, `PHOTO_STORAGE_PATH`
- Frontend: `VITE_API_URL` (build-time only, baked into the bundle)

### Recommended Approach

1. Use Caddy (not Nginx) for the frontend container — better Railway compatibility.
2. Multi-stage Dockerfile for frontend (Node build → Caddy serve).
3. uv-based Dockerfile for backend.
4. Configure Railway root directories per service.
5. Use Railway's PostgreSQL plugin with internal networking.
6. Attach persistent volume to backend at `/data/photos`.

### Risks

- **`$PORT` environment variable:** Railway dynamically assigns ports. Both frontend and backend containers must listen on `$PORT`. Caddy handles this natively with `:{$PORT}`. Uvicorn needs it passed explicitly.
- **Volume mount:** Only one active deployment can mount a volume — causes brief downtime on redeploy. Acceptable for v1.
- **Build caching:** Railway's build cache can sometimes cause stale builds. If issues arise, clear the build cache in Railway settings.

---

## 5. Frontend Architecture

### Findings

**React Router v7 (library mode, not framework mode):**

Since OhYes uses Vite (not Remix/React Router framework mode), use React Router in **declarative/library mode**. Install `react-router` (v7 unified package — `react-router-dom` is now re-exported from `react-router`).

**Route structure:**
```
/              → LandingPage (public)
/dashboard     → Dashboard (protected)
/auth/callback → OAuthCallback (handles redirect from backend)
```

**Protected route pattern (per D-08):**
```jsx
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}
```

**Auth state management (React Context per CLAUDE.md — no Redux):**
- `AuthContext` provides `{ user, loading, logout }`.
- On mount, call `GET /api/auth/me` to check if session cookie is valid.
- If valid, set user state. If 401, set user to null.
- The `/api/auth/me` endpoint returns the current user's info from the JWT cookie.

**Sign-in flow:**
1. User clicks "Sign in with Google" button.
2. Frontend navigates to `{API_URL}/api/auth/login` (full page navigation, not fetch).
3. Backend redirects to Google → Google redirects to backend callback → backend sets cookie and redirects to `{FRONTEND_URL}/dashboard`.

**Key architectural decision:** The OAuth flow is server-side redirects, not API calls. The frontend simply navigates to the backend's login URL and the backend handles all redirects, finally landing the user on `/dashboard` with a cookie set.

### Recommended Approach

1. Set up React Router v7 in declarative mode with `BrowserRouter`.
2. Create `AuthContext` + `AuthProvider` that checks `/api/auth/me` on mount.
3. Create `ProtectedRoute` wrapper component.
4. Landing page: centered layout with AppLogo + GoogleSignInButton (per UI spec).
5. Dashboard: TopBar + EmptyState (per UI spec). CreateButton present but disabled.
6. Minimal Motion (Framer Motion) usage: page fade transitions, toast for errors.

### Risks

- **Flash of unauthenticated content:** The `/api/auth/me` check is async. During loading, show a loading spinner (not the landing page or dashboard). The `loading` state in AuthContext prevents premature redirects.
- **OAuth callback redirect:** After backend sets the cookie and redirects to `/dashboard`, the frontend's AuthContext must successfully read the user from `/api/auth/me`. This chain must be reliable.

---

## 6. CORS Configuration

### Findings

**The critical issue: Railway's Public Suffix List problem.**

`up.railway.app` is on the Public Suffix List. This means:
- `frontend-xxx.up.railway.app` and `api-xxx.up.railway.app` are treated as **completely separate sites** by browsers.
- Cookies set on one cannot be shared with the other.
- `SameSite=Lax` cookies will NOT be sent cross-origin between these domains.
- Even `SameSite=None; Secure` requires explicit CORS configuration and `credentials: 'include'`.

**Three options for cookie-based auth on Railway:**

| Option | Complexity | Cookie Behavior |
|--------|-----------|-----------------|
| **A. Custom domain** (e.g., `ohyes.app` + `api.ohyes.app`) | Medium | Set cookie on `.ohyes.app`, shared across subdomains. SameSite=Lax works. |
| **B. Same-origin via proxy** (frontend Caddy proxies `/api/*` to backend) | Low | Same origin, no CORS needed. SameSite=Lax works perfectly. |
| **C. Cross-origin with SameSite=None** | Low code, high friction | Requires HTTPS, `SameSite=None`, `Secure`, explicit CORS with credentials. |

**Option B is recommended for v1.** Configure Caddy to:
1. Serve static files from `/srv` for frontend routes.
2. Reverse proxy `/api/*` requests to the backend's internal Railway URL.

This makes everything same-origin from the browser's perspective. No CORS issues. No cookie domain issues. `SameSite=Lax` works perfectly. The frontend and backend appear as one service to the browser.

**If Option B (proxy):**
```
:{$PORT}

handle /api/* {
    reverse_proxy {$BACKEND_URL}
}

handle {
    root * /srv
    try_files {path} /index.html
    file_server
}
```

The backend's internal URL would be something like `http://backend.railway.internal:PORT`.

**If Option C (cross-origin, fallback):**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],  # exact origin, never "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Cookie must use `samesite="none"` (string, not Python `None`) and `secure=True`.
Frontend must use `credentials: 'include'` on all fetch requests.

### Recommended Approach

**Use Option B (Caddy reverse proxy)** for production on Railway:
- Frontend Caddy container proxies `/api/*` to backend via Railway internal networking.
- Everything is same-origin. No CORS middleware needed on the backend for browser requests.
- Cookies use `SameSite=Lax`, `Secure=True`, `HttpOnly=True`.

**For local development:**
- Vite's dev server proxy: configure `vite.config.js` to proxy `/api` to `http://localhost:8000`.
- This mirrors the production same-origin setup locally.

Still add CORS middleware to backend as a safety net (for direct API access, testing tools, etc.), but the primary path avoids cross-origin entirely.

### Risks

- **Railway internal networking:** The backend must be accessible via `backend.railway.internal` from the frontend service. Railway's private networking must be enabled (it's on by default for services in the same project).
- **Dev/prod parity:** Vite proxy in dev mirrors Caddy proxy in prod — good parity. But if the proxy config drifts, cookies may work in dev but not prod (or vice versa).

---

## 7. Risks and Pitfalls

### OAuth Redirect URI Configuration

- **Risk:** Google OAuth requires exact redirect URI match. Dev uses `http://localhost:8000/api/auth/callback`, prod uses the Railway URL.
- **Mitigation:** Use `API_URL` environment variable. Register both URIs in Google Cloud Console (dev and prod). Google allows multiple redirect URIs per OAuth client.

### Cookie Handling Across Domains

- **Risk:** Railway's `*.up.railway.app` domains are on the Public Suffix List. Cross-subdomain cookies are impossible.
- **Mitigation:** Use same-origin proxy (Caddy forwards `/api/*` to backend). Eliminates the cross-domain cookie problem entirely. See Section 6.

### SESSION_SECRET vs JWT_SECRET

- **Risk:** Confusing Starlette's SessionMiddleware secret (for temporary OAuth state) with the JWT signing secret.
- **Mitigation:** Use two separate environment variables: `SESSION_SECRET` (for Starlette SessionMiddleware) and `JWT_SECRET` (for signing the app's session JWTs). Both should be strong random strings.

### DATABASE_URL Format

- **Risk:** Railway provides `postgresql://...` but asyncpg requires `postgresql+asyncpg://...`.
- **Mitigation:** Transform the URL at startup: `DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)`.

### Alembic Empty Migrations

- **Risk:** Forgetting to import model modules in `env.py` leads to empty autogenerated migrations with no warning.
- **Mitigation:** Explicitly import all model modules in `env.py` before `target_metadata = Base.metadata`. Add a comment warning about this.

### Google Cloud Console Setup

- **Risk:** Manual step outside the codebase. Forgetting to configure OAuth consent screen, enable APIs, or add redirect URIs will break the flow.
- **Mitigation:** Document the required Google Cloud Console setup steps in the phase plan.

### Vite Build-Time Environment Variables

- **Risk:** `VITE_API_URL` is baked into the bundle at build time. If the API URL changes, the frontend must be rebuilt.
- **Mitigation:** With the same-origin proxy approach, `VITE_API_URL` is simply `""` (empty string / relative URLs like `/api/auth/login`). No build-time variable needed for the API base URL.

---

## Validation Architecture

### Critical Paths

These must work end-to-end for Phase 1 to be considered complete:

1. **OAuth login flow:** Click "Sign in with Google" → Google consent → callback → JWT cookie set → redirect to dashboard.
2. **Session persistence:** Refresh `/dashboard` page → `/api/auth/me` returns user from cookie → dashboard displays user info.
3. **Logout:** Click "Log out" → cookie cleared → redirect to landing page → `/dashboard` inaccessible.
4. **Route protection:** Navigate to `/dashboard` without auth → redirect to landing page.
5. **Database connectivity:** Backend connects to Railway PostgreSQL via asyncpg → user record created on first login.
6. **Deployment pipeline:** Push to `main` → Railway auto-builds and deploys both services → app accessible at Railway URL.

### Verification Commands

```bash
# Frontend
cd frontend && pnpm install && pnpm build    # Build succeeds
pnpm dev                                      # Dev server starts

# Backend
cd backend && uv sync                         # Dependencies install
uv run uvicorn app.main:app --reload          # Server starts
uv run alembic upgrade head                   # Migrations apply
uv run alembic check                          # No pending migrations

# Database
uv run python -c "
from app.core.database import engine
import asyncio
async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT 1'))
        print('DB connected:', result.scalar())
asyncio.run(check())
"

# OAuth (manual verification)
# 1. Navigate to http://localhost:5173
# 2. Click "Sign in with Google"
# 3. Complete Google consent
# 4. Verify redirect to /dashboard with user info displayed
# 5. Refresh page — session persists
# 6. Click "Log out" — redirected to landing

# Docker builds
cd frontend && docker build -t ohyes-frontend .
cd backend && docker build -t ohyes-backend .

# Lint
cd frontend && pnpm lint
cd backend && uv run ruff check . && uv run ruff format --check .
```

---

## Key Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend static server | Caddy (not Nginx) | Better Railway defaults, simpler config, built-in HTTPS |
| API proxy strategy | Same-origin via Caddy reverse proxy | Eliminates CORS and cookie domain issues entirely |
| JWT library | PyJWT | Officially recommended by FastAPI docs, actively maintained |
| OAuth library | Authlib (Starlette integration) | Per CLAUDE.md, native FastAPI/Starlette support |
| Package manager (Python) | uv | Per D-12, fast, modern, lockfile support |
| Package manager (JS) | pnpm | Per D-11, fast, disk-efficient |
| React Router | v7 (library/declarative mode) | SPA mode with Vite, not framework mode |
| Database URL transform | Runtime string replace | Railway provides `postgresql://`, asyncpg needs `postgresql+asyncpg://` |

---

## RESEARCH COMPLETE
