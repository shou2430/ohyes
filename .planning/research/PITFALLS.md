# OhYes — Common Pitfalls Research

Research into known failure modes for the OhYes stack (React + FastAPI + PostgreSQL on Railway). Each pitfall includes warning signs, prevention strategies, and the project phase that should address it.

---

## 1. Google OAuth on Railway

### 1.1 Redirect URI Mismatch

**The problem:** Google OAuth is strict about redirect URIs. The callback URL registered in Google Cloud Console must match *exactly* — scheme, host, port, and path. Railway assigns dynamic URLs (`*.up.railway.app`) and HTTPS is enforced, but developers often register `http://localhost:3000/callback` during development and forget to add the production URI, or add it with a trailing slash mismatch.

**Warning signs:**
- `redirect_uri_mismatch` error on login attempt in production
- OAuth works locally but fails after deploy
- Error only appears for some users (cached vs. fresh sessions)

**Prevention strategy:**
- Register both `http://localhost:8000/auth/callback` (dev) and `https://<app>.up.railway.app/auth/callback` (prod) in Google Cloud Console from day one
- Use an environment variable (`OAUTH_REDIRECT_URI`) so the backend constructs the correct URI per environment — never hardcode it
- Add a startup log line that prints the configured redirect URI so misconfiguration is caught immediately on deploy

**Phase:** Authentication (Phase 1 / early backend setup)

---

### 1.2 CORS Blocking the OAuth Popup/Redirect Flow

**The problem:** If the React frontend and FastAPI backend are on different origins (they will be on Railway unless using a single service), the browser blocks cookies or redirects. The OAuth flow typically redirects the browser to Google, then back to the backend callback, then to the frontend. If the backend sets a session cookie, it won't be sent on cross-origin requests unless `SameSite=None; Secure` is set and CORS headers include `Access-Control-Allow-Credentials: true`.

**Warning signs:**
- Login redirect works but the session is lost immediately after
- Cookies appear in DevTools but aren't sent on subsequent API calls
- Works in Chrome but fails in Safari (stricter cookie policies)

**Prevention strategy:**
- Use token-based auth (JWT in `Authorization` header) instead of cookie-based sessions — avoids all cross-origin cookie issues
- If using cookies, set `SameSite=None; Secure=True; HttpOnly=True` and configure FastAPI CORS middleware with `allow_credentials=True`
- Test the full OAuth flow on the deployed Railway URL early, not just localhost

**Phase:** Authentication setup

---

### 1.3 OAuth Token Storage and Refresh

**The problem:** Google OAuth access tokens expire after 1 hour. If the app stores only the access token, users get silently logged out. Refresh tokens are only issued on the *first* consent, and only if `access_type=offline` and `prompt=consent` are set.

**Warning signs:**
- Users report being logged out after ~1 hour
- Refresh token is `None` in the database
- Works fine during development (short sessions) but fails in production

**Prevention strategy:**
- For this app, the Google token is only needed for initial login identity verification — store user info in the local DB and issue your own JWT/session token with a longer TTL
- Don't rely on the Google access token for ongoing API calls since the app doesn't need Google APIs beyond login
- Set JWT expiry to 7 days (matches invitation TTL) with refresh-on-use

**Phase:** Authentication setup

---

## 2. Image Upload

### 2.1 Railway Volume Persistence Gotchas

**The problem:** Railway persistent volumes mount at a specific path (e.g., `/data`). If the app writes uploads to a path *outside* the volume mount (e.g., `/app/uploads/`), files survive during the service lifetime but vanish on the next deploy or restart. Railway redeploys create a new container — only the mounted volume persists.

**Warning signs:**
- Uploads work fine, then all images disappear after a deploy
- Images exist during manual testing but are gone the next day
- `ls` in the Railway shell shows files, but after a redeploy the directory is empty

**Prevention strategy:**
- Configure the upload directory via an environment variable (e.g., `UPLOAD_DIR=/data/uploads`)
- Verify the volume mount path in `railway.toml` or the Railway dashboard matches what the app uses
- Add a health check endpoint that writes and reads a test file to the volume to confirm persistence
- Never use relative paths or paths under the app directory for persistent data

**Phase:** Image upload implementation

---

### 2.2 File Size Limits and Upload Failures

**The problem:** Railway has a 100MB request body limit by default, but real issues start earlier. Large image uploads over slow connections time out. FastAPI's default behavior loads the entire file into memory before processing if using `UploadFile` incorrectly, which can OOM the container on Railway's limited memory tiers.

**Warning signs:**
- Upload works for small images but fails for phone camera photos (5-15MB)
- 413 errors or connection timeouts on upload
- Container memory spikes during uploads, potentially causing restarts

**Prevention strategy:**
- Enforce a maximum file size of 5MB on both frontend (before upload) and backend (reject early with `Content-Length` check)
- Use chunked reading in FastAPI: `async for chunk in upload_file: ...` instead of `await upload_file.read()`
- Resize/compress images on the frontend before upload using canvas API (target 1200px max dimension, JPEG 80% quality) — this is the single biggest improvement
- Show upload progress in the UI so users know it's working
- Validate file type (JPEG, PNG, WebP only) on both client and server (check magic bytes, not just extension)

**Phase:** Image upload implementation

---

### 2.3 Serving Uploaded Files Through FastAPI

**The problem:** Serving static files through FastAPI is straightforward but has pitfalls. Using `FileResponse` without proper caching headers means the image is re-read from disk on every request. Path traversal attacks via crafted filenames (e.g., `../../etc/passwd`) are a real risk if the filename comes from user input. Also, serving large files through the Python process ties up a worker thread.

**Warning signs:**
- Slow image loading on invitation pages
- Security scanner flags path traversal vulnerability
- High CPU/memory on the backend during image-heavy traffic

**Prevention strategy:**
- Generate a random UUID filename on upload (never use the original filename) — this prevents path traversal and filename collisions
- Store files as `/data/uploads/{invitation_id}/{uuid}.{ext}`
- Use `FileResponse` with `Cache-Control: public, max-age=86400` header since invitation images don't change
- Validate that the resolved path is within the uploads directory (defense in depth)
- For v1, FastAPI serving is fine. If performance becomes an issue later, put a CDN or nginx in front

**Phase:** Image upload implementation

---

## 3. Invitation Link Security

### 3.1 URL Guessing (Predictable Invitation IDs)

**The problem:** If invitation IDs are sequential integers or short random strings, attackers can enumerate valid invitations. Even with password protection, knowing valid URLs lets attackers target specific invitations for brute-force.

**Warning signs:**
- Invitation URLs use patterns like `/invite/1`, `/invite/2`
- Automated scanners in access logs hitting sequential paths
- Someone reports seeing another person's password prompt page

**Prevention strategy:**
- Use UUID v4 (or nanoid with 21+ characters) for invitation IDs — 128 bits of entropy makes enumeration infeasible
- The password prompt page should not leak any information about whether the invitation exists (show the same UI for invalid IDs as for valid ones, but return a generic "Invalid or expired" on wrong password)
- Rate limit the invitation view endpoint: 10 requests/minute per IP

**Phase:** Invitation creation (core backend)

---

### 3.2 Password Brute-Force

**The problem:** Passwords are 4-8 characters set by the creator. A 4-character alphanumeric password has only ~1.7 million combinations — trivially brute-forceable without rate limiting. Even 8 characters can be attacked at scale.

**Warning signs:**
- Logs show hundreds of password attempts from a single IP
- Invitations are being "opened" by unknown parties
- No rate limiting middleware is configured

**Prevention strategy:**
- Rate limit password attempts: max 5 attempts per invitation per IP per 15 minutes, then lock that IP out for 1 hour
- After 20 total failed attempts on any invitation (across all IPs), temporarily lock the invitation and notify the creator
- Use a short delay (300ms) on password verification to slow automated attacks
- Log all failed password attempts for monitoring
- The password is not a security feature (PROJECT.md says "personal touch") — but basic protection prevents casual abuse

**Phase:** Invitation access endpoint

---

### 3.3 Invitation Data Leakage After "Yes"

**The problem:** PROJECT.md says clicking "Yes" deletes the invitation data. If deletion is not thorough (e.g., soft delete, orphaned image files, cached responses), the personal content remains accessible.

**Warning signs:**
- Images still accessible via direct URL after invitation deletion
- Database records marked as deleted but still queryable
- Browser cache shows invitation content after it should be gone

**Prevention strategy:**
- Hard delete the database row AND the image file on disk in a single transaction (delete file first, then DB row — if DB delete fails, the orphaned file is cleaned up by the expiry job)
- Return 404 for any request to a deleted invitation's image path
- Set `Cache-Control: no-store` on invitation page API responses (not images, which use `max-age`)
- Add a cleanup verification: after deletion, confirm both DB row and file are gone

**Phase:** "Yes" response handling

---

## 4. "No" Button UX

### 4.1 Mobile Touch Support (No Hover!)

**The problem:** The signature feature — the "No" button dodging the cursor — relies on `mousemove` events. On mobile, there is no cursor. A `touchstart` on the button would trigger a click before any dodge logic runs. The button must dodge on `touchstart`/`touchmove` near it, not on `click`.

**Warning signs:**
- Button works perfectly on desktop but is easily clickable on mobile
- Touch events fire `click` immediately with no chance to dodge
- The entire fun of the feature is lost on mobile (likely 60%+ of traffic for this audience)

**Prevention strategy:**
- Listen for `touchstart` and `touchmove` on the *container* (not the button) and calculate distance from touch point to button center
- When touch is within a threshold radius (~80px), move the button away from the touch point
- Prevent `click` on the "No" button entirely on touch devices — the dodge should make it unreachable
- Add `touch-action: none` on the button container to prevent scroll interference
- Test on real mobile devices early — simulators don't capture touch behavior accurately
- Use `pointer` events (`pointermove`, `pointerdown`) as a unified API that covers both mouse and touch

**Phase:** Frontend invitation page (No button implementation)

---

### 4.2 Button Escapes Off-Screen or Into Unreachable Areas

**The problem:** Naive dodge logic (move opposite to cursor) can push the button off-screen, behind other elements, or into corners where it's trapped. On small screens, there may not be enough room for meaningful dodging.

**Warning signs:**
- Button disappears off the viewport edge
- Button gets stuck in a corner oscillating
- On small phones, button immediately goes off-screen

**Prevention strategy:**
- Constrain the button's position to stay within the visible viewport with padding (at least 20px from edges)
- Use `getBoundingClientRect()` of the container, not `window.innerWidth`, to account for safe areas
- When the button is in a corner, make it "teleport" to a random position on the opposite side (with a playful animation) rather than getting stuck
- Implement escalating behavior: gentle dodges (50-100px) at first, then faster/larger dodges, then teleporting — per PROJECT.md's "increasingly frantic" requirement
- Set a minimum container size; on very small screens, reduce dodge distance proportionally

**Phase:** Frontend invitation page

---

### 4.3 Accessibility Concerns

**The problem:** A button that deliberately evades interaction is inherently inaccessible. Screen readers will read it, keyboard users can tab to it, but the visual dodge doesn't apply. This could be frustrating for users with motor disabilities.

**Warning signs:**
- Keyboard users can tab to "No" and press Enter — bypassing the mechanic entirely
- Screen readers announce "No" button but the dodge behavior is invisible to them
- Accessibility audit flags the page

**Prevention strategy:**
- The "No" button dodge is a visual gag, not a functional gate — both "Yes" and "No" are valid responses (this is key)
- Allow keyboard activation of "No" without dodging (the joke is visual, not functional)
- If "No" is clicked/activated, show a playful response ("Are you sure?") but don't block the user
- Add `aria-label="No - this button playfully dodges your cursor"` so screen reader users understand the gag
- Keep the "Yes" button always stable, large, and easy to activate

**Phase:** Frontend invitation page

---

### 4.4 Animation Performance (Jank)

**The problem:** Moving a button on every `mousemove`/`touchmove` event (which fires 60+ times/second) using `top`/`left` CSS properties triggers layout recalculation on every frame, causing jank — especially on low-end mobile devices.

**Warning signs:**
- Button movement feels stuttery or laggy
- Browser DevTools show high "Layout" time in Performance tab
- Page becomes unresponsive during rapid mouse movement

**Prevention strategy:**
- Use CSS `transform: translate(x, y)` instead of `top`/`left` — transforms are GPU-composited and skip layout
- Add `will-change: transform` to the button for compositor optimization
- Throttle the dodge calculation to `requestAnimationFrame` (not every `mousemove` event)
- Keep dodge logic simple: calculate target position, use CSS `transition: transform 150ms ease-out` for smooth movement rather than manually animating each frame
- Avoid triggering style recalculation by reading layout properties (e.g., `offsetWidth`) inside the animation loop

**Phase:** Frontend invitation page

---

## 5. Auto-Expiry System

### 5.1 No Built-In Cron on Railway

**The problem:** Railway doesn't provide cron scheduling. There's no guarantee your cleanup job runs on time. Common approaches — `setInterval` in the app process, a separate cron service, or Railway's cron service (limited) — each have trade-offs.

**Warning signs:**
- Expired invitations remain visible days after they should be gone
- Orphaned image files accumulate on the volume, consuming storage
- No logs of cleanup ever running

**Prevention strategy:**
- **Primary:** Run cleanup on every relevant API request ("lazy expiry") — when fetching an invitation, check if it's expired and delete it on the spot. This is the most reliable approach since it requires no scheduler.
- **Secondary:** Use a FastAPI background task triggered by a lightweight endpoint. Call it via Railway's Cron Service (separate service with a cron schedule that hits `POST /admin/cleanup`) or an external cron service (cron-job.org, free tier).
- **Tertiary:** Run an `asyncio` background task on FastAPI startup that loops every hour with `asyncio.sleep(3600)`. This works but resets on every deploy.
- Implement all three: lazy check on access (catches individual expired invitations), plus a periodic sweep (catches invitations nobody visits).

**Phase:** Invitation expiry / cleanup system

---

### 5.2 Orphaned Files After Failed Deletion

**The problem:** If the database row is deleted but the file deletion fails (disk error, race condition), or vice versa, you get orphaned data. Over time, the volume fills with unreferenced images.

**Warning signs:**
- Volume disk usage grows even though active invitations are within limits
- Files on disk with no matching database record
- Database records pointing to missing files

**Prevention strategy:**
- Store the file path in the database so you always know which file belongs to which invitation
- Delete file first, then database row (if DB delete fails, the next cleanup sweep will retry; if file delete fails, you still have the DB record to find it)
- Periodic reconciliation job: scan the upload directory, check each file against the database, delete unmatched files older than 1 hour (grace period for in-progress uploads)
- Log every deletion (both file and DB) for debugging
- Set up a disk usage alert if volume exceeds 80% capacity

**Phase:** Expiry system and ongoing maintenance

---

### 5.3 Timezone Confusion in Expiry Calculation

**The problem:** If `created_at` is stored in local time or without timezone info, and the server runs in UTC (Railway default), expiry calculations can be off by hours. An invitation created "today" might expire a day early or late depending on the user's timezone.

**Warning signs:**
- Invitations expire at unexpected times for users in non-UTC timezones
- `created_at` values in the database have no timezone info
- Tests pass locally but expiry behaves differently in production

**Prevention strategy:**
- Store all timestamps as `TIMESTAMP WITH TIME ZONE` in PostgreSQL (this is critical)
- Always use UTC in the backend: `datetime.now(timezone.utc)`
- Calculate expiry as `created_at + interval '7 days'` in SQL — let PostgreSQL handle it
- Display expiry time to users in their local timezone (frontend conversion only)
- Never use `datetime.now()` (naive local time) — always `datetime.now(timezone.utc)` or `datetime.utcnow()` (though the latter is deprecated in Python 3.12+, prefer `datetime.now(timezone.utc)`)

**Phase:** Database schema design

---

## 6. CORS Between React and FastAPI

### 6.1 Separate Origins in Dev vs. Production

**The problem:** In development, React runs on `localhost:3000` (or 5173 with Vite) and FastAPI on `localhost:8000` — different origins. In production on Railway, they might be on different subdomains (`frontend.up.railway.app` and `backend.up.railway.app`) or the same origin if using a reverse proxy. CORS configuration that works in dev often breaks in prod or vice versa.

**Warning signs:**
- API calls fail with `No 'Access-Control-Allow-Origin' header` in the browser console
- Preflight `OPTIONS` requests return 405 or 500
- Works in Postman but not in the browser

**Prevention strategy:**
- Configure `ALLOWED_ORIGINS` via environment variable, not hardcoded
- Development: `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173`
- Production: `ALLOWED_ORIGINS=https://ohyes.up.railway.app` (or whatever the frontend domain is)
- FastAPI CORS middleware:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=settings.allowed_origins.split(","),
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- Never use `allow_origins=["*"]` with `allow_credentials=True` — browsers reject this combination
- Test the actual production CORS behavior by curling with `Origin` header before launch

**Phase:** Initial backend setup (first phase)

---

### 6.2 Preflight Caching and Performance

**The problem:** Every cross-origin request with custom headers (like `Authorization: Bearer ...`) triggers a preflight `OPTIONS` request. Without proper `Access-Control-Max-Age`, the browser sends a preflight for every single API call, doubling request count and adding latency.

**Warning signs:**
- Network tab shows an `OPTIONS` request before every `GET`/`POST`
- API feels sluggish despite fast response times
- Double the expected request count in server logs

**Prevention strategy:**
- Set `Access-Control-Max-Age: 3600` (1 hour) in CORS configuration so browsers cache preflight results
- FastAPI's `CORSMiddleware` supports `max_age` parameter
- For requests that don't need custom headers (public endpoints), avoid requiring `Authorization` to skip preflight entirely

**Phase:** Initial backend setup

---

## 7. Railway Deployment

### 7.1 Environment Variable Configuration

**The problem:** Railway uses environment variables for configuration, but there's no `.env` file on the server. If the app has required config that isn't set as a Railway variable, it crashes on startup with a cryptic error. Railway also provides `DATABASE_URL` and `PORT` automatically for linked services, but the format may differ from what the app expects.

**Warning signs:**
- App crashes immediately after deploy with `KeyError` or `ValidationError`
- Database connection fails despite PostgreSQL being provisioned (wrong URL format)
- App works locally with `.env` but not on Railway

**Prevention strategy:**
- Use Pydantic `BaseSettings` for all configuration with explicit defaults and validation — the app should fail fast with a clear error message listing which variables are missing
- Railway provides `DATABASE_URL` in `postgresql://` format — SQLAlchemy 1.4+ requires `postgresql+asyncpg://` for async. Handle this with a simple string replacement in config.
- Document every required environment variable in a `.env.example` file
- Required variables: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_REDIRECT_URI`, `JWT_SECRET`, `FRONTEND_URL`, `ALLOWED_ORIGINS`
- Optional with defaults: `UPLOAD_DIR=/data/uploads`, `MAX_UPLOAD_SIZE=5242880`, `INVITATION_TTL_DAYS=7`

**Phase:** Project initialization / deployment setup

---

### 7.2 Build Configuration and Dockerfile

**The problem:** Railway auto-detects the build system (Nixpacks) but may make wrong assumptions for a monorepo or multi-service setup. Python dependency resolution can be slow or fail. React build can run out of memory on Railway's build machines.

**Warning signs:**
- Build takes 10+ minutes or times out
- `npm run build` fails with out-of-memory error
- Railway picks the wrong Nixpack (detects Python for the frontend or Node for the backend)

**Prevention strategy:**
- Use separate Railway services for frontend and backend with explicit root directories
- Add a `railway.toml` or `Dockerfile` for each service for deterministic builds
- For FastAPI: use a slim `Dockerfile` based on `python:3.12-slim` with multi-stage build
- For React: build locally or in CI and deploy the static build, or use `NODE_OPTIONS=--max-old-space-size=512` to prevent OOM
- Pin all dependency versions (`pip freeze > requirements.txt`, `package-lock.json` committed)

**Phase:** Project initialization / deployment setup

---

### 7.3 Health Checks and Zero-Downtime Deploys

**The problem:** Railway performs a health check (default: TCP check on `PORT`) to determine if a new deployment is ready. If the app takes time to start (database migrations, volume mounting), Railway may route traffic before it's ready, or mark the deploy as failed.

**Warning signs:**
- Deploys marked as "failed" even though the app eventually starts
- Brief downtime during deploys (502 errors)
- Health check endpoint returns 200 but the app isn't actually ready (database not connected)

**Prevention strategy:**
- Add a `GET /health` endpoint that checks database connectivity and volume accessibility — return 200 only when truly ready
- Configure Railway's health check path to `/health` with a reasonable timeout (30s)
- Run database migrations in the startup sequence *before* the server starts listening
- Set `PORT` in Railway (it's automatic) and bind to `0.0.0.0:$PORT`

**Phase:** Deployment setup

---

### 7.4 Volume Mount Path Conflicts

**The problem:** Railway volumes mount at a configured path. If the mount path conflicts with a directory in the Docker image (e.g., mounting at `/app/data` where the Dockerfile has files), the volume *replaces* the directory contents. Also, volumes are tied to a single service — you can't share a volume between the frontend and backend services.

**Warning signs:**
- App files mysteriously missing at a path that's also a volume mount
- Backend can write to the volume but frontend can't serve from it (separate services)
- First deploy works, second deploy loses data at the mount point

**Prevention strategy:**
- Mount the volume at a dedicated path that doesn't overlap with app files: `/data` is a safe choice
- Serve uploaded images through the FastAPI backend (not as static files from the frontend) since the volume is attached to the backend service
- Frontend references images via API URL: `https://backend.up.railway.app/uploads/{id}/image`
- Never put application code under the volume mount path

**Phase:** Deployment setup / image upload

---

## 8. Database

### 8.1 Connection Pooling

**The problem:** FastAPI with async workers opens a new database connection per request by default. PostgreSQL has a connection limit (default: 100 for Railway). Under load or during connection leaks, the app exhausts connections and new requests fail with "too many connections."

**Warning signs:**
- `OperationalError: FATAL: too many clients already` in logs
- Intermittent database errors under moderate load
- Database connections grow steadily without releasing (visible in Railway metrics)

**Prevention strategy:**
- Use SQLAlchemy's async connection pool with sensible limits:
  ```python
  create_async_engine(
      DATABASE_URL,
      pool_size=5,        # Concurrent connections
      max_overflow=10,     # Burst capacity
      pool_timeout=30,     # Wait for connection before error
      pool_recycle=1800,   # Recycle connections every 30 min
  )
  ```
- Use `async with session:` context managers to ensure connections are returned to the pool
- Monitor active connections: `SELECT count(*) FROM pg_stat_activity;`
- For Railway's PostgreSQL, keep `pool_size + max_overflow` well under the plan's connection limit

**Phase:** Database setup (initial backend)

---

### 8.2 Migration Management

**The problem:** Without migration management, database schema changes require manual SQL or destructive table drops. Alembic (Python migration tool for SQLAlchemy) requires careful setup — auto-generated migrations may miss certain changes (e.g., index changes, enum modifications), and running migrations on Railway requires a startup hook.

**Warning signs:**
- Schema changes work in development but production database is out of sync
- "Column does not exist" errors after a deploy with new model fields
- Developers run raw SQL to fix production schema

**Prevention strategy:**
- Set up Alembic from day one, even before the schema is finalized — retrofitting is harder
- Run `alembic upgrade head` as part of the startup command (before `uvicorn`):
  ```
  alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- Always review auto-generated migrations before committing (they can be wrong)
- Store migrations in version control — they are source code
- Use a `alembic.ini` that reads `DATABASE_URL` from environment variables, not hardcoded
- Test migrations against a copy of production data, not just an empty database

**Phase:** Database setup (initial backend)

---

### 8.3 Timezone Handling for Expiry

**The problem:** (Expanded from 5.3) PostgreSQL's `TIMESTAMP` (without timezone) stores wall-clock time with no timezone context. If the server's timezone changes (Railway containers are UTC, but this isn't guaranteed forever), all stored timestamps become ambiguous. Mixing `TIMESTAMP` and `TIMESTAMPTZ` columns causes subtle bugs.

**Warning signs:**
- `WHERE created_at < NOW() - INTERVAL '7 days'` returns unexpected results
- Expiry triggers at wrong times (e.g., 7 days + N hours offset)
- Python's `datetime.utcnow()` and PostgreSQL's `NOW()` disagree by hours

**Prevention strategy:**
- Use `TIMESTAMPTZ` (timestamp with timezone) for all temporal columns — this is the PostgreSQL best practice
- PostgreSQL stores `TIMESTAMPTZ` internally as UTC regardless of the session timezone, which is exactly what you want
- In SQLAlchemy: `Column(DateTime(timezone=True), server_default=func.now())`
- In Python: always use timezone-aware datetimes (`datetime.now(timezone.utc)`)
- Expiry query: `SELECT * FROM invitations WHERE created_at < NOW() - INTERVAL '7 days'` — works correctly with `TIMESTAMPTZ`
- Add a constraint or application check that rejects naive datetimes

**Phase:** Database schema design

---

## Summary: Phase Assignment

| Phase | Pitfalls to Address |
|-------|-------------------|
| **Project init / deployment setup** | 7.1 (env vars), 7.2 (build config), 7.4 (volume mounts) |
| **Database schema design** | 8.1 (connection pooling), 8.2 (migrations), 8.3 (timezones), 5.3 (timezone in expiry) |
| **Initial backend / CORS** | 6.1 (CORS origins), 6.2 (preflight caching) |
| **Authentication** | 1.1 (redirect URI), 1.2 (CORS + cookies), 1.3 (token refresh) |
| **Image upload** | 2.1 (volume persistence), 2.2 (file size), 2.3 (serving files) |
| **Invitation creation** | 3.1 (URL guessing), 3.2 (brute-force), 3.3 (data leakage) |
| **Frontend invitation page** | 4.1 (mobile touch), 4.2 (off-screen), 4.3 (accessibility), 4.4 (animation perf) |
| **Expiry system** | 5.1 (no cron), 5.2 (orphaned files) |
| **Health checks / deploy** | 7.3 (health checks) |

---

*Researched 2026-05-04 for OhYes project planning.*
