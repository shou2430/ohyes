# Phase 1: Foundation & Authentication - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 01-foundation-authentication
**Areas discussed:** OAuth flow & session, Landing page & app shell, Project structure, Deployment config

---

## OAuth Flow & Session

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect flow | User redirected to Google and back. Standard, works on all browsers. Simpler with Authlib. | ✓ |
| Popup flow | Google sign-in opens in popup. Snappier but popup-blocker issues on mobile. | |
| You decide | Claude picks best approach. | |

**User's choice:** Redirect flow
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| httpOnly cookie | Backend sets JWT as httpOnly cookie. Immune to XSS. SameSite=Lax handles CSRF. | ✓ |
| localStorage + Bearer header | Frontend stores JWT in localStorage. Simpler CORS but vulnerable to XSS. | |
| You decide | Claude picks based on security best practices. | |

**User's choice:** httpOnly cookie
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 24h JWT, re-login after | Simple single JWT with 24h TTL. No refresh token complexity. | ✓ |
| Short JWT + refresh token | 15-min access JWT + 7-day refresh token. Overkill for non-sensitive app. | |
| You decide | Claude picks simplest approach. | |

**User's choice:** 24h JWT, re-login after expiry
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Google ID + email + display name | Minimal data needed for identification and personalization. | |
| Add Google profile photo URL | Also store avatar URL for dashboard header. | |
| You decide | Claude picks minimal set needed. | ✓ |

**User's choice:** Claude's discretion
**Notes:** User deferred to Claude for minimal data set decision.

---

## Landing Page & App Shell

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — hero + sign-in | Clean centered layout with app name/tagline and sign-in button. Gets users in fast. | ✓ |
| Playful showcase | Animated landing with mini No button demo. More engaging but more Phase 1 work. | |
| You decide | Claude designs simple landing matching app tone. | |

**User's choice:** Minimal — hero + sign-in
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Header + empty state | Top bar with app name, user info, logout. Main area shows empty state message. | ✓ |
| Header + placeholder cards | Same header with placeholder invitation cards. Risks confusion. | |
| You decide | Claude designs minimal shell to prove auth works. | |

**User's choice:** Header + empty state
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Warm & playful | Soft rounded corners, warm colors (pinks, corals, soft purples), friendly typography. | |
| Clean & minimal | Mostly white/neutral with one accent color. Modern SaaS feel. | |
| Bold & vibrant | Strong colors, large typography, high contrast. | |
| You decide | Claude picks visual direction matching product personality. | ✓ |

**User's choice:** Claude's discretion
**Notes:** User trusts Claude to pick visual tone.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to landing | Unauthenticated users hitting /dashboard redirected to /. Standard pattern. | ✓ |
| Show login prompt inline | Show dashboard URL with login overlay. Preserves URL. | |
| You decide | Claude implements standard auth guard. | |

**User's choice:** Redirect to landing
**Notes:** None

---

## Project Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Monorepo /frontend + /backend | Single repo, two top-level dirs. Simpler for solo/small team. | ✓ |
| Separate repos | Frontend and backend in separate GitHub repos. More overhead. | |
| You decide | Claude picks best structure for Railway. | |

**User's choice:** Monorepo
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| ESLint + Prettier + Ruff | Full linting + formatting for both stacks. Minimal config, fast feedback. | ✓ |
| Minimal — just formatters | Prettier + Ruff format-only. No linting rules. | |
| You decide | Claude sets up reasonable defaults. | |

**User's choice:** ESLint + Prettier + Ruff
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| uv | Modern, extremely fast Python package manager. Handles virtualenvs and lockfiles. | ✓ |
| pip + requirements.txt | Classic approach. Simple, universal. | |
| Poetry | Mature dependency manager with lockfile. pyproject.toml based. | |
| You decide | Claude picks best fit. | |

**User's choice:** uv
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| pnpm | Fast, disk-efficient, strict dependency resolution. | ✓ |
| npm | Ships with Node.js. No extra install needed. | |
| You decide | Claude picks based on Vite/Railway compatibility. | |

**User's choice:** pnpm
**Notes:** None

---

## Deployment Config

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-deploy on push to main | Railway watches GitHub repo and auto-deploys. Zero-friction CI/CD. | ✓ |
| Manual deploy via Railway CLI | Deploy manually using `railway up`. More control. | |
| You decide | Claude configures simplest reliable pipeline. | |

**User's choice:** Auto-deploy on push to main
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Deploy skeleton in Phase 1 | Deploy working minimal app to Railway. Proves full stack end-to-end. | ✓ |
| Code locally, deploy later | Build locally and defer Railway setup. Risks deployment surprises. | |
| You decide | Claude determines best timing. | |

**User's choice:** Deploy skeleton in Phase 1
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Railway default for now | Use *.up.railway.app. Zero DNS config needed. | ✓ |
| Custom domain from start | Configure custom domain in Phase 1. Requires DNS setup. | |
| You decide | Claude picks simplest approach. | |

**User's choice:** Railway default domain
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Nginx container | Vite build → Nginx serves static files. Fast, minimal, standard. | ✓ |
| Caddy container | Simpler config syntax, automatic HTTPS. Less common in Docker. | |
| FastAPI serves static files | Single service, simpler Railway setup. Couples frontend/backend deploys. | |
| You decide | Claude picks best serving strategy for Railway. | |

**User's choice:** Nginx container
**Notes:** None

---

## Claude's Discretion

- User data scope from Google OAuth (minimal set, may include avatar URL)
- Visual tone for the app (playful and inviting, Claude picks specifics)

## Deferred Ideas

None — discussion stayed within phase scope
