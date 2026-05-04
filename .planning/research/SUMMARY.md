# OhYes -- Research Summary

> Decision document synthesized from STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md.
> Date: 2026-05-04

---

## 1. Recommended Stack

| Layer | Choice |
|-------|--------|
| **Frontend** | React 19 + Vite 6 + Tailwind CSS v4 + Motion 12 (Framer Motion) |
| **i18n** | react-i18next (zh-TW default, en toggle) |
| **State** | React Context + useReducer (no library) |
| **Backend** | Python 3.12 + FastAPI 0.115+ + Pydantic v2 |
| **ORM** | SQLAlchemy 2.0 async + asyncpg + Alembic |
| **Auth** | Authlib (Google OAuth) + self-issued JWT |
| **Database** | PostgreSQL 16 (Railway managed) |
| **Storage** | Railway persistent volume for photos |
| **Hosting** | Railway -- 3 services (static frontend, FastAPI backend, PostgreSQL) |

---

## 2. Table Stakes Features

- Escaping "No" button that dodges cursor/finger (desktop + mobile touch)
- Confetti/hearts celebration on "Yes" click
- Shareable unique link per invitation (short, clean URL)
- Creator personalization: custom title + photo upload
- Mobile-first responsive design (most traffic comes from messaging app links)
- Fast page load (<3s, with image compression and minimal JS)

---

## 3. Key Differentiators

- **Occasion-agnostic** -- not Valentine-locked; works for prom, proposals, apologies, parties, anything
- **Escalating "No" button personality** -- 5-stage arc from polite dodge to frantic panic to surrender, with changing button text (the brand identity)
- **Creator notification loop** -- creator gets notified when recipient says Yes, with optional 30-char reply message (no free competitor does this)
- **Password-protected pages** -- personal touch that doubles as privacy gate ("use our anniversary date")
- **Auto-expiry with full data deletion** -- 7-day TTL, photos included; privacy as a feature
- **Bilingual UI** -- Traditional Chinese (zh-TW) + English, underserving the TW/HK market

---

## 4. Architecture Overview

OhYes is a three-service deployment on Railway: a static React SPA (Vite build served by Nginx), a FastAPI backend with async SQLAlchemy, and a managed PostgreSQL database. Photos are stored on a Railway persistent volume mounted to the backend and served via FastAPI FileResponse. Authentication uses Google OAuth with Authlib, issuing self-managed JWTs (24h TTL) so no Google token refresh is needed. The recipient flow is stateless from the recipient's perspective -- they unlock an invitation with a password, receive a short-lived token, and interact without any account.

---

## 5. Critical Pitfalls

1. **Mobile touch support for the "No" button** -- `mousemove` dodge logic does not work on mobile; must use `pointermove`/`touchstart` with proximity detection and `touch-action: none`. This is the core feature and 60%+ of traffic is mobile. Get it wrong and the product is broken.

2. **Railway volume persistence** -- Files written outside the mounted volume path vanish on redeploy. All uploads must go to the configured volume path (e.g., `/data/uploads`), set via environment variable, and verified with a health check.

3. **Google OAuth redirect URI mismatch** -- Must register both localhost and Railway production callback URLs in Google Cloud Console from day one. Use an env var for the redirect URI; never hardcode.

4. **CORS between frontend and backend** -- Separate Railway origins require explicit `allow_origins` with `allow_credentials=True`. Never use wildcard origins with credentials. Configure via environment variable, test on deployed URL early.

5. **Orphaned files and timezone bugs in expiry** -- Use TIMESTAMPTZ everywhere, UTC in Python. Implement both lazy expiry (check on access) and periodic sweep (APScheduler). Delete file before DB row to prevent orphans.

---

## 6. Build Order

| Phase | Scope | Key Deliverable |
|-------|-------|-----------------|
| **1. Foundation** | Project scaffolding, DB models + Alembic migrations, Google OAuth flow | Running app with auth |
| **2. Core CRUD** | Invitation creation (with photo upload + max-2 check), creator dashboard, photo serving | Creator can make and manage invitations |
| **3. Recipient Experience** | Password gate, invitation reveal page, "No" button with escalating dodge, "Yes" accept flow with reply message | The core product loop works end-to-end |
| **4. Polish** | Notification system (red dot, mark read), expiry cleanup (APScheduler + lazy), i18n (zh-TW + en) | Feature-complete v1 |
| **5. Deploy + Harden** | Railway config (railway.toml, env vars, volume), health checks, rate limiting, error handling, testing | Production-ready |

---

## 7. Open Questions

1. **JWT storage: HTTP-only cookie vs. localStorage?** Cookie is more secure but complicates CORS. localStorage is simpler but XSS-vulnerable. Needs a decision before auth implementation.
2. **Unlock token: JWT or opaque DB token?** JWT is stateless but irrevocable. DB token adds a query but allows revocation. Leaning JWT (short-lived).
3. **Frontend serving: single service or separate?** Serving React static files from FastAPI (one Railway service, cheaper) vs. dedicated Nginx service (cleaner separation). Cost vs. simplicity tradeoff.
4. **Client-side image resizing before upload?** Dramatically reduces upload size and server load but adds frontend complexity. Likely worth it.
5. **Notification retention policy?** Without cleanup, notifications accumulate forever. Auto-delete after 30 days? Needs a decision.
6. **Password hashing strategy?** STACK.md says SHA-256 (not a security boundary), ARCHITECTURE.md says bcrypt with low rounds. Need alignment.

---

*This is a decision document. For detailed reasoning, see the individual research files.*
