# Phase 1: Foundation & Authentication - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold the full-stack project (React + FastAPI + PostgreSQL), set up deployment infrastructure on Railway, and implement Google OAuth so creators can sign in, maintain sessions, and log out. This phase delivers a working deployed skeleton with authentication — no invitation features yet.

Requirements in scope: AUTH-01, AUTH-02, AUTH-03, INFR-01, INFR-02

</domain>

<decisions>
## Implementation Decisions

### OAuth Flow & Session
- **D-01:** Google OAuth uses redirect flow (server-side via Authlib). User clicks "Sign in with Google" → redirected to Google → redirected back to app with auth code → backend exchanges for tokens.
- **D-02:** JWT session token stored as httpOnly cookie (SameSite=Lax). Frontend never touches the token directly — backend sets/reads it.
- **D-03:** JWT has 24h TTL with no refresh token. When expired, user re-authenticates with Google (one-click). Simple, sufficient for a casual app.
- **D-04:** Backend generates its own JWT after validating Google's OAuth response. The JWT contains the user's internal ID and is signed with JWT_SECRET.

### User Data
- **D-05:** (Claude's Discretion) Store minimal user data from Google OAuth. At minimum: Google ID (unique identifier), email, display name. May include Google profile photo URL if it adds value to the dashboard header with minimal effort.

### Landing Page & App Shell
- **D-06:** Landing page is minimal: centered layout with app name/tagline, one-liner description, and prominent "Sign in with Google" button. No feature tours or marketing copy.
- **D-07:** Authenticated dashboard shell has: top bar (app name, user display name, logout button) and main area showing empty state ("No invitations yet"). Create button exists but is non-functional until Phase 2.
- **D-08:** Unauthenticated users hitting protected routes (e.g., /dashboard) are redirected to the landing page (/).

### Visual Tone
- **D-09:** (Claude's Discretion) Claude picks a visual direction that fits the product's playful personality. Should feel inviting and fun — this is not a corporate SaaS tool.

### Project Structure
- **D-10:** Monorepo with `/frontend` and `/backend` top-level directories. Single GitHub repo, single git history.
- **D-11:** Frontend: pnpm as package manager, Vite as build tool, React 19, Tailwind CSS v4.
- **D-12:** Backend: uv for Python dependency management, FastAPI, SQLAlchemy 2.0 async, asyncpg, Alembic for migrations.
- **D-13:** Code quality: ESLint + Prettier for frontend, Ruff (linting + formatting) for backend.

### Deployment Config
- **D-14:** Auto-deploy on push to main branch. Railway watches the GitHub repo.
- **D-15:** Deploy a working skeleton to Railway at the end of Phase 1. Proves full stack: frontend serves, backend responds, DB connects, OAuth redirects work.
- **D-16:** Use Railway's default domain for v1 (e.g., *.up.railway.app). Custom domain deferred.
- **D-17:** Frontend served via Nginx container (Vite build output → Nginx static serving). Backend runs as Docker container with FastAPI + Uvicorn.
- **D-18:** Railway services: Frontend (Nginx), Backend (FastAPI), Database (PostgreSQL plugin). Persistent volume attached to backend for future photo storage.

### Claude's Discretion
- User data scope (D-05): Minimal set, may include Google avatar URL
- Visual tone (D-09): Playful and inviting, Claude picks specifics
- Any standard implementation patterns not covered above

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above and in:
- `.planning/REQUIREMENTS.md` — AUTH-01, AUTH-02, AUTH-03, INFR-01, INFR-02 acceptance criteria
- `.planning/PROJECT.md` — Constraints section (tech stack, deployment platform, invitation limits)
- `CLAUDE.md` — Full technology stack decisions with rationale (React 19, Vite 6, Tailwind v4, FastAPI, SQLAlchemy 2.0, Authlib, etc.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no code exists yet.

### Established Patterns
- None — patterns will be established in this phase. This is the foundation phase.

### Integration Points
- OAuth callback URL must be registered in Google Cloud Console
- Railway environment variables (DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, FRONTEND_URL) must be configured
- Frontend needs API_URL at build time (Vite env variable)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The key insight from research (HANDOFF.json) is:
- Railway deployment uses GitHub integration (auto-deploy)
- Research surfaced risks around OAuth redirect URIs, CORS config, and Railway volume paths — these should be addressed during implementation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-authentication*
*Context gathered: 2026-05-05*
