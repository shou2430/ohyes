# OhYes Tech Stack Research

> Researched 2026-05-04. Versions reflect latest stable releases at time of writing.

---

## 1. Frontend

### React 19.x (19.2.5)
**Confidence: High**

React 19 is the current stable line. Version 19.2.5 is the latest patch. React 19 brings the React Compiler (automatic memoization), the `<Activity />` component for staged UI loading, and built-in `<meta>`/`<title>` management (eliminating React Helmet). No reason to use React 18 for a greenfield project.

Pin to `^19.2.0` in package.json.

### Build Tool: Vite 6.x
**Confidence: High**

Vite over Next.js or CRA. The reasoning is straightforward:

- **OhYes is a pure SPA.** The creator dashboard lives behind Google OAuth. The recipient page lives behind a password. There are zero public pages that need SEO. Next.js's SSR/SSG capabilities are wasted complexity here.
- **Vite gives sub-second HMR**, instant dev server start, and tiny production bundles via Rollup.
- **Deploy-anywhere simplicity.** `vite build` produces a `dist/` folder of static assets. On Railway, this serves from a lightweight Nginx or Caddy container with zero Node.js runtime needed in production.
- **CRA is dead.** Create React App is officially deprecated and unmaintained. Do not use it.

Use `@vitejs/plugin-react` for JSX/Fast Refresh support.

### CSS: Tailwind CSS v4.x
**Confidence: High**

Tailwind v4 (released January 2025) over styled-components or CSS Modules:

- **Performance.** New Rust-based engine (Lightning CSS) delivers 5x faster full builds and 100x faster incremental builds.
- **CSS-first config.** The `tailwind.config.js` file is gone. Customization happens via `@theme` directives in CSS. Less tooling surface area.
- **Automatic content detection.** No configuration needed to find template files.
- **Utility-first fits this project.** OhYes has a small number of pages (landing, dashboard, create form, recipient page, yes confirmation). Tailwind's utility approach keeps things fast without a component library overhead.
- **Why not styled-components?** Runtime CSS-in-JS adds bundle weight and creates hydration complexity. Styled-components is losing momentum — Tailwind has become the default for new React projects.
- **Why not CSS Modules?** Viable but verbose for a small team. Tailwind's utility classes are faster to iterate with.

Install: `tailwindcss @tailwindcss/postcss @tailwindcss/vite`

### Animation: Motion (Framer Motion) 12.x
**Confidence: High**

The "No" button is OhYes's signature feature. It needs to dodge the cursor with escalating franticness. This requires:

1. Tracking pointer position in real-time
2. Calculating escape vectors
3. Animating position with spring physics (not linear easing)
4. Orchestrating escalation stages (gentle dodge -> frantic escape -> teleportation)

**Motion (formerly Framer Motion)** is the right tool:

- **Declarative + React-native.** Animations are driven by component state, which maps perfectly to escalation stages. `<motion.button animate={{ x, y }} transition={{ type: "spring", stiffness, damping }}>` is the entire API needed.
- **Spring physics built in.** The dodging behavior needs to feel organic, not robotic. Spring animations with configurable stiffness/damping create exactly the right feel.
- **Gesture detection included.** `onHoverStart`, `whileHover`, and pointer tracking come free — no separate gesture library.
- **Layout animations.** If the button needs to "teleport" to a random position as a final escalation, `layout` animations handle this smoothly.
- **MIT licensed, 39M weekly downloads.** The dominant React animation library.
- **Why not GSAP?** GSAP's imperative timeline model is overkill for a single button's state-driven behavior. GSAP shines for cinematic sequences with dozens of elements; OhYes needs reactive spring physics on one element. Additionally, GSAP's license is owned by Webflow with usage restrictions — unnecessary risk for an open/casual project.
- **Why not pure CSS?** CSS animations cannot react to pointer position dynamically. The escape vector must be computed in JavaScript.

### i18n: react-i18next + i18next
**Confidence: High**

OhYes needs bilingual support: Traditional Chinese (zh-TW) as default, English (en) as toggle.

- **react-i18next** is the standard for non-Next.js React apps. 22KB gzipped total (react-i18next + i18next core).
- **Simple JSON translation files.** Two files: `zh-TW.json` and `en.json`. Chinese has no plural forms, so the translation files are trivially simple.
- **Dynamic language switching** via `i18n.changeLanguage('en')` — no page reload needed.
- **Namespace support** allows splitting translations by page if needed (dashboard vs recipient page).
- **Why not next-intl?** next-intl is designed for Next.js App Router. We are using Vite, not Next.js.
- **Why not react-intl (FormatJS)?** Also viable, but react-i18next has a larger ecosystem, more tutorials, and the `useTranslation()` hook API is slightly more ergonomic.

### State Management: React Context + useReducer (no library)
**Confidence: High**

OhYes does not need Redux, Zustand, or Jotai. The application state is minimal:

- **Auth state:** Current user from Google OAuth (single context).
- **Dashboard state:** List of 0-2 invitations (fetched from API, cached in component state).
- **Creator form state:** Local form state (React Hook Form or native).
- **Language toggle:** i18next handles this internally.

React 19's built-in Context API with `useReducer` covers all of this. Adding a state management library would be over-engineering.

If state needs grow in v2, Zustand (2KB) is the escape hatch — but start without it.

---

## 2. Backend

### Python 3.12
**Confidence: High**

Python 3.12 over 3.13:

- **3.12 is the sweet spot.** Broad library compatibility, stable asyncio improvements, PEP 695 type parameter syntax, and significant performance gains over 3.11.
- **Why not 3.13?** Python 3.13 is supported by FastAPI, but 3.13's free-threaded mode (no-GIL) is still experimental and irrelevant for an async I/O-bound app like OhYes. 3.12 has wider third-party library testing and fewer edge cases.
- **Why not 3.11 or earlier?** No reason to leave performance and typing improvements on the table.

### FastAPI 0.115+ (latest 0.136.x)
**Confidence: High**

FastAPI is already a project constraint. Pin to `>=0.115,<1.0` to get Python 3.12 support, Pydantic v2 integration, and Starlette 0.40+ features.

Key FastAPI features used by OhYes:
- **Dependency injection** for auth middleware (verify Google OAuth token).
- **Pydantic v2 models** for request/response validation (invitation creation, password check).
- **Background tasks** for cleanup jobs.
- **File upload handling** for invitation photos.

### ORM: SQLAlchemy 2.0 (async) + asyncpg
**Confidence: High**

- **SQLAlchemy 2.0** provides native async support via `create_async_engine` and `AsyncSession`. It is the most mature Python ORM by a wide margin (18 years of development).
- **asyncpg** as the PostgreSQL driver — fastest async Postgres driver for Python, benchmarked at 3-5x throughput over sync drivers under load.
- **Mapped columns with type hints** (`mapped_column()`) integrate cleanly with Pydantic v2 models.
- **Why not Tortoise ORM?** Tortoise is async-native but has a significantly smaller community, less documentation, and fewer production deployments. SQLAlchemy's ecosystem (Alembic, debugging tools, StackOverflow answers) is unmatched.
- **Why not SQLModel?** SQLModel (by the FastAPI author) merges SQLAlchemy + Pydantic but is less mature, has known edge cases with relationships, and adds a layer of abstraction that can obscure debugging. Use SQLAlchemy directly + separate Pydantic schemas.

### Migrations: Alembic 1.x
**Confidence: High**

Alembic is the only serious migration tool for SQLAlchemy. It supports async engines, auto-generates migrations from model diffs, and is maintained by the SQLAlchemy author.

No alternatives worth considering. This is the standard.

### Google OAuth: Authlib 1.x
**Confidence: High**

- **Native Starlette/FastAPI integration.** FastAPI is built on Starlette, and Authlib's Starlette OAuth client works directly.
- **Standards-compliant.** Full OAuth 2.0 + OpenID Connect support. Automatically fetches Google's discovery document.
- **Minimal dependencies.** No heavy framework required.
- **Why not python-social-auth?** No native async/FastAPI support. Designed for Django/Flask. Would require adapter hacks.
- **Why not FastAPI Users?** Overkill — FastAPI Users bundles user registration, password reset, email verification, and multiple auth backends. OhYes only needs Google OAuth. Authlib does exactly this with less surface area.

### Image Handling: Pillow 10.x
**Confidence: High**

OhYes accepts photo uploads for invitations. Pillow is needed for:

- **Validation:** Verify uploaded file is actually an image (not a renamed executable).
- **Resizing:** Constrain images to a reasonable max dimension (e.g., 1200px) to save storage.
- **Format normalization:** Convert to WebP or JPEG for consistent serving.

Pillow is the universal Python imaging library. No alternatives needed.

### Background Tasks: FastAPI BackgroundTasks + APScheduler
**Confidence: Medium**

OhYes needs a scheduled job to delete expired invitations (7-day TTL) and their photos.

Two-layer approach:

1. **FastAPI `BackgroundTasks`** for immediate fire-and-forget work (e.g., delete photo file after "Yes" click). Built into FastAPI, zero setup.
2. **APScheduler 3.x** for the scheduled expiry sweep. Runs a cron-like job (e.g., every hour) that queries for invitations older than 7 days and deletes them + their photos.

- **Why not Celery?** Celery requires a message broker (Redis or RabbitMQ) — an entire additional service on Railway. Massive overkill for a single hourly cleanup job.
- **Why not arq?** arq also needs Redis. Same problem.
- **Why APScheduler?** Runs in-process, no external dependencies. For a single scheduled task on a low-traffic app, this is the right weight class.
- **Confidence is Medium** because if OhYes scales significantly, APScheduler's in-process model becomes a liability (e.g., duplicate runs across multiple backend instances). At that point, migrate to a Railway Cron Job or a proper task queue. But for v1, APScheduler is correct.

### Password Hashing: None needed
**Confidence: High**

The invitation password (4-8 chars) is not a security feature — it is a "personal touch" per the spec. Store it as plaintext or with a simple hash. Do not use bcrypt or argon2 for this — it would mislead future developers into thinking this is a security boundary. A SHA-256 hash is sufficient to avoid storing plaintext while communicating that this is not a credential.

---

## 3. Database

### PostgreSQL 16
**Confidence: High**

- **Railway provisions PostgreSQL 16** by default. It is the current stable major version with excellent JSON, parallel query, and logical replication support.
- **Why not 17?** PostgreSQL 17 is available but 16 has wider driver/ORM testing. No PG17 features are needed for OhYes's simple schema.
- **Why not SQLite?** The project constraint specifies PostgreSQL. Additionally, Railway's persistent storage model favors a managed database service over a file-based DB.

### Connection Pooling: asyncpg built-in pool
**Confidence: High**

asyncpg includes a built-in connection pool (`asyncpg.create_pool()`). SQLAlchemy's async engine wraps this automatically when using `create_async_engine` with `pool_size` and `max_overflow` parameters.

- **Why not PgBouncer?** PgBouncer is an external connection pooler — another service to manage on Railway. asyncpg's built-in pool is sufficient for OhYes's expected load (low hundreds of concurrent users at most).
- **Recommended settings:** `pool_size=5, max_overflow=10` for v1. Adjust based on Railway's PostgreSQL connection limits.

---

## 4. Infrastructure

### Railway Deployment Architecture
**Confidence: High**

Three Railway services + one volume:

| Service | Type | Domain |
|---------|------|--------|
| **Frontend** | Static site (Nginx/Caddy serving Vite `dist/`) | `ohyes.app` (or `ohyes.up.railway.app`) |
| **Backend** | Docker container (FastAPI + Uvicorn) | `api.ohyes.app` (or `api-ohyes.up.railway.app`) |
| **Database** | Railway PostgreSQL plugin | Internal networking (no public exposure) |
| **Volume** | Railway persistent volume mounted to backend | `/data/photos` mount path |

### Frontend Deployment

Vite builds to static files. Serve via a minimal Dockerfile:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

The `nginx.conf` handles SPA routing (all paths -> `index.html`) and caching headers.

### Backend Deployment

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Persistent Volume for Photos

Railway volumes persist across deployments. Mount to the backend service at `/data/photos`. Key considerations:

- **Volume survives redeploys** but not service deletion. Back up if needed.
- **Only one active deployment can mount a volume** — Railway enforces this, causing brief downtime on redeploy. Acceptable for v1.
- **Size:** Start with default allocation. Photos are resized to ~100-200KB each. With max 2 invitations per user and 7-day TTL, storage stays minimal.

### CORS Configuration
**Confidence: High**

FastAPI's `CORSMiddleware` handles this. Since frontend and backend run on different Railway domains:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ohyes.up.railway.app",  # production
        "http://localhost:5173",           # Vite dev server
    ],
    allow_credentials=True,  # needed for OAuth cookies/tokens
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- **Never use `allow_origins=["*"]` in production** with `allow_credentials=True` — browsers will reject it.
- Pin specific origins. Use environment variables to switch between dev and prod origins.

### Environment Variables

Use Railway's built-in environment variable management. Key variables:

| Variable | Service | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | Backend | Auto-injected by Railway PostgreSQL plugin |
| `GOOGLE_CLIENT_ID` | Backend | Google OAuth app credentials |
| `GOOGLE_CLIENT_SECRET` | Backend | Google OAuth app credentials |
| `FRONTEND_URL` | Backend | For CORS and OAuth redirect URI |
| `API_URL` | Frontend | Backend API base URL (build-time) |
| `JWT_SECRET` | Backend | Signing key for session tokens |
| `PHOTO_STORAGE_PATH` | Backend | Volume mount path (`/data/photos`) |

---

## 5. What NOT to Use

| Technology | Why Not |
|---|---|
| **Create React App (CRA)** | Officially deprecated. Unmaintained. Slow builds. Do not use for new projects. |
| **Next.js** | SSR/SSG is wasted on an app where every page is behind auth or a password. Adds server runtime complexity for zero benefit. Vite is simpler and faster for this use case. |
| **Redux / MobX** | Over-engineered for an app with 2-3 pieces of global state. React Context is sufficient. |
| **styled-components** | Runtime CSS-in-JS is losing momentum. Adds bundle size and hydration complexity vs Tailwind's zero-runtime approach. |
| **Tortoise ORM** | Small community, less documentation, fewer production case studies vs SQLAlchemy 2.0 async. |
| **SQLModel** | Merges ORM + validation but introduces abstraction leaks and immature relationship handling. Keep SQLAlchemy and Pydantic separate. |
| **Celery / arq** | Require Redis or RabbitMQ — an entire additional Railway service for one cron job. Use APScheduler in-process. |
| **python-social-auth** | No native FastAPI/async support. Designed for Django. Use Authlib instead. |
| **MongoDB** | Project constraint is PostgreSQL. Also, OhYes has clearly structured relational data (users -> invitations -> notifications). |
| **Firebase Auth** | Adds vendor lock-in and a Google Cloud dependency. Authlib + Google OAuth is simpler and self-contained. |
| **PgBouncer** | External pooler is unnecessary at OhYes's scale. asyncpg's built-in pool is sufficient. |
| **Docker Compose for dev** | Adds friction for a solo/small team. Use local PostgreSQL + Vite dev server + Uvicorn. Railway's plugin handles prod DB. |
| **Chakra UI / Material UI** | Component libraries add significant bundle weight and constrain styling. OhYes has a small, custom UI. Tailwind is lighter and more flexible. |
| **Socket.IO / WebSockets** | No real-time features in v1. Notifications are polling-based or shown on page load. |

---

## Summary Table

| Layer | Choice | Version | Confidence |
|-------|--------|---------|------------|
| UI Framework | React | ^19.2 | High |
| Build Tool | Vite | ^6.x | High |
| CSS | Tailwind CSS | ^4.x | High |
| Animation | Motion (Framer Motion) | ^12.x | High |
| i18n | react-i18next + i18next | ^15.x + ^24.x | High |
| State Management | React Context (no library) | -- | High |
| Runtime | Python | 3.12 | High |
| API Framework | FastAPI | >=0.115 | High |
| ORM | SQLAlchemy 2.0 (async) | ^2.0 | High |
| DB Driver | asyncpg | ^0.29 | High |
| Migrations | Alembic | ^1.13 | High |
| OAuth | Authlib | ^1.3 | High |
| Image Processing | Pillow | ^10.x | High |
| Scheduled Tasks | APScheduler | ^3.10 | Medium |
| Database | PostgreSQL | 16 | High |
| Connection Pool | asyncpg built-in | -- | High |
| Hosting | Railway | -- | High |
| Photo Storage | Railway Volume | -- | High |

---

*This document is prescriptive. Deviate only with documented reasoning.*
