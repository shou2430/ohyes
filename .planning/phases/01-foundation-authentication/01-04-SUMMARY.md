# Plan 1-04 Summary: Deployment Config

## Status: COMPLETE

## Tasks Completed

### 1-04-01: Create backend Dockerfile with uv
- Created `backend/Dockerfile` using `python:3.12-slim` base with uv package manager
- Dependency layer cached separately from application code for faster rebuilds
- Uses `--no-dev` to exclude test dependencies from production image
- Creates `/data/photos` directory for Railway persistent volume mount
- Shell form CMD expands `$PORT` at runtime (Railway sets this dynamically), falls back to 8000
- Created `backend/.dockerignore` excluding `.venv`, `.env`, `tests`, `__pycache__`, etc.

### 1-04-02: Update .env.example with Railway deployment documentation
- Updated `backend/.env.example` with comprehensive Railway setup instructions (8 steps)
- Documents which vars Railway auto-injects (`DATABASE_URL`, `PORT`) vs manual (`GOOGLE_CLIENT_ID`, etc.)
- Updated `JWT_SECRET` and `SESSION_SECRET` placeholders to indicate min 32 chars
- Documents OAuth redirect URI as `<API_URL>/api/auth/callback` (direct to backend, no proxy)
- References `VITE_API_URL` for frontend static site service configuration

### 1-04-03: Create frontend .env.example and verify builds
- Created `frontend/.env.example` with `VITE_API_URL=http://localhost:8000`
- Verified frontend builds successfully with `pnpm build` (290KB JS, 10KB CSS)
- Docker build could not complete in CI environment (ghcr.io network restriction) but Dockerfile syntax and structure are correct
- Confirmed no `frontend/Dockerfile` or `frontend/Caddyfile` exist (frontend is Railway static site)
- Backend passes `ruff check` with all checks passed

## Commits
1. `feat(01-04): Create backend Dockerfile with uv`
2. `feat(01-04): Update .env.example with Railway deployment documentation`
3. `feat(01-04): Create frontend .env.example and verify builds`

## Architecture Decisions Confirmed
- **Frontend**: Railway static site service (no Dockerfile, no Caddy/Nginx)
- **Backend**: Docker container with FastAPI + Uvicorn
- **Auth**: Bearer token via Authorization header (no cookie domain issues)
- **CORS**: Backend allows frontend origin; no reverse proxy needed
- **Photos**: Railway persistent volume at `/data/photos`

## Threat Mitigations
| ID | Threat | Mitigation Applied |
|----|--------|--------------------|
| T-1-10 | Docker image contains secrets/dev deps | `.dockerignore` excludes `.env`, `.venv`; `--no-dev` flag on `uv sync` |
| T-1-11 | Photo storage path not writable | `mkdir -p /data/photos` in Dockerfile; Railway volume mounts over |
| T-1-12 | CORS misconfigured | `allow_origins` pinned to `FRONTEND_URL` env var (already in main.py from plan 01-03) |
