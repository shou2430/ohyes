# OhYes — Architecture Research

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        RAILWAY                              │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  React SPA   │───▶│   FastAPI    │───▶│  PostgreSQL  │  │
│  │  (Static)    │    │   Backend    │    │   Database   │  │
│  │              │◀───│              │◀───│              │  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘  │
│                             │                               │
│                             │ read/write                    │
│                             ▼                               │
│                      ┌──────────────┐                       │
│                      │   Railway    │                       │
│                      │   Volume    │                       │
│                      │  (Photos)   │                       │
│                      └──────────────┘                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Google OAuth Provider                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 1. System Components

### Frontend — React SPA

- **Framework**: React with Vite (fast builds, simple config)
- **Routing**: React Router for SPA navigation
- **State**: Lightweight — React Context or Zustand (no Redux needed for this scale)
- **i18n**: react-i18next for bilingual support (zh-TW default, en toggle)
- **Styling**: CSS Modules or Tailwind — keep it simple
- **Key pages**:
  - `/` — Landing / login
  - `/dashboard` — Creator's invitation list + notification box
  - `/create` — Create new invitation form
  - `/i/:invitationId` — Public invitation page (password gate → reveal → Yes click)
- **Deployment**: Built static files served by FastAPI or a separate Railway service

### Backend — FastAPI

- **Framework**: FastAPI (Python) with async support
- **ORM**: SQLAlchemy 2.0 (async) with Alembic for migrations
- **Auth**: python-jose for JWT, httpx or authlib for Google OAuth
- **File handling**: python-multipart for uploads, aiofiles for async disk I/O
- **Background tasks**: FastAPI's built-in `BackgroundTasks` for post-response work; APScheduler or a simple cron-style loop for expiry cleanup
- **CORS**: Configured to allow frontend origin
- **Serves**: API endpoints under `/api/v1/`, static photo files under `/uploads/`

### Database — PostgreSQL

- Hosted on Railway's managed PostgreSQL
- Three core tables: `users`, `invitations`, `notifications`
- Indexed on expiry timestamps for efficient cleanup queries

### File Storage — Railway Persistent Volume

- Mounted at a fixed path (e.g., `/data/uploads/`)
- Photos stored as `{invitation_id}.{ext}`
- Served by FastAPI via a static file route or `FileResponse`
- Cleaned up when invitation expires or recipient clicks Yes

---

## 2. API Design

### Auth Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/auth/google` | Redirect to Google OAuth consent screen | No |
| GET | `/api/v1/auth/google/callback` | Handle OAuth callback, issue JWT | No |
| GET | `/api/v1/auth/me` | Return current user info | JWT |
| POST | `/api/v1/auth/logout` | Invalidate session (client-side token discard) | JWT |

### Invitation Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/invitations` | List creator's invitations | JWT |
| POST | `/api/v1/invitations` | Create invitation (multipart: title, photo, password) | JWT |
| DELETE | `/api/v1/invitations/:id` | Delete own invitation | JWT |
| POST | `/api/v1/invitations/:id/unlock` | Recipient submits password to unlock | No |
| GET | `/api/v1/invitations/:id/page` | Get invitation page data (requires unlock token) | Unlock token |
| POST | `/api/v1/invitations/:id/accept` | Recipient clicks Yes + sends message | Unlock token |

### Notification Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/notifications` | List creator's notifications | JWT |
| PATCH | `/api/v1/notifications/:id` | Mark notification as read | JWT |

### Unlock Token Strategy

When a recipient submits the correct password via `/unlock`, the backend returns a short-lived token (e.g., 1-hour JWT or opaque token) scoped to that invitation. This token is required for `/page` and `/accept` — preventing direct URL access without the password.

---

## 3. Data Models

### Users

```
users
├── id              UUID, PK
├── google_id       VARCHAR, UNIQUE, NOT NULL
├── email           VARCHAR, NOT NULL
├── display_name    VARCHAR, NOT NULL
├── avatar_url      VARCHAR, NULLABLE
├── created_at      TIMESTAMPTZ, DEFAULT now()
└── updated_at      TIMESTAMPTZ, DEFAULT now()
```

### Invitations

```
invitations
├── id              UUID, PK (used in shareable URL)
├── creator_id      UUID, FK → users.id, NOT NULL
├── title           VARCHAR(100), NOT NULL
├── photo_path      VARCHAR, NOT NULL (path on volume)
├── password_hash   VARCHAR, NOT NULL (bcrypt hash of 4-8 char password)
├── status          VARCHAR, DEFAULT 'active' (active | accepted | expired)
├── created_at      TIMESTAMPTZ, DEFAULT now()
├── expires_at      TIMESTAMPTZ, DEFAULT now() + 7 days
└── INDEX on (creator_id, status)
    INDEX on (expires_at) WHERE status = 'active'
```

### Notifications

```
notifications
├── id              UUID, PK
├── user_id         UUID, FK → users.id, NOT NULL
├── invitation_id   UUID, NULLABLE (reference, invitation may be deleted)
├── invitation_title VARCHAR, NOT NULL (denormalized — survives invitation deletion)
├── message         VARCHAR(30), NULLABLE (recipient's Yes message)
├── is_read         BOOLEAN, DEFAULT false
├── created_at      TIMESTAMPTZ, DEFAULT now()
└── INDEX on (user_id, is_read)
```

### Relationships

```
users 1──N invitations    (creator_id)
users 1──N notifications  (user_id)
```

### Key Design Decisions

- **Password is hashed**: Even though it's not a security-critical feature, hashing prevents plaintext leakage if the DB is exposed. Use bcrypt with low rounds (cost 4-6) since these are short fun passwords.
- **Invitation title is denormalized into notifications**: When a recipient clicks Yes, the invitation is deleted per requirements. The notification must survive that deletion, so we copy the title.
- **Status enum over boolean**: `active | accepted | expired` is clearer than multiple boolean flags and supports future states.
- **UUID for invitation IDs**: Non-guessable shareable URLs without needing a separate slug field.

---

## 4. Authentication Flow

```
Creator opens app
       │
       ▼
GET /api/v1/auth/google
       │
       ▼
Redirect to Google OAuth consent
       │
       ▼
User grants permission
       │
       ▼
Google redirects to /api/v1/auth/google/callback?code=XXX
       │
       ▼
Backend exchanges code for Google tokens
       │
       ▼
Backend extracts google_id, email, name from ID token
       │
       ▼
Upsert user in DB (create if new, update if returning)
       │
       ▼
Backend issues JWT (contains user_id, expires in 24h)
       │
       ▼
Redirect to frontend with JWT as query param or set HTTP-only cookie
       │
       ▼
Frontend stores JWT, includes in Authorization header for API calls
```

### JWT Structure

```json
{
  "sub": "user-uuid",
  "exp": 1234567890,
  "iat": 1234567890
}
```

- **Token lifetime**: 24 hours (casual app, no refresh token needed for v1)
- **Storage**: HTTP-only cookie preferred (XSS protection). If using localStorage, accept the tradeoff for simplicity.
- **Protected routes**: FastAPI dependency `get_current_user()` that decodes JWT and returns user or raises 401.

---

## 5. Invitation Flow

```
CREATOR                          BACKEND                         RECIPIENT
  │                                 │                                │
  │  POST /invitations              │                                │
  │  (title, photo, password)       │                                │
  │────────────────────────────────▶│                                │
  │                                 │  Validate (max 2 active check) │
  │                                 │  Hash password                 │
  │                                 │  Save photo to volume          │
  │                                 │  Insert DB row                 │
  │  ◀─ { id, url }                │                                │
  │                                 │                                │
  │  Shares URL + password          │                                │
  │  via any messaging app ─────────────────────────────────────────▶│
  │                                 │                                │
  │                                 │   POST /invitations/:id/unlock │
  │                                 │◀───────────────────────────────│
  │                                 │   Verify password hash         │
  │                                 │   Return unlock_token          │
  │                                 │──────────────────────────────▶ │
  │                                 │                                │
  │                                 │   GET /invitations/:id/page    │
  │                                 │◀───────────────────────────────│
  │                                 │   Return title, photo_url      │
  │                                 │──────────────────────────────▶ │
  │                                 │                                │
  │                                 │      (Recipient sees page,     │
  │                                 │       plays with No button,    │
  │                                 │       clicks Yes)              │
  │                                 │                                │
  │                                 │   POST /invitations/:id/accept │
  │                                 │◀───────────────────────────────│
  │                                 │   { message: "I love you" }    │
  │                                 │                                │
  │                                 │   Create notification          │
  │                                 │   Delete invitation + photo    │
  │  ◀── notification appears       │                                │
  │      in dashboard               │                                │
```

### Max 2 Active Check

On `POST /invitations`, query:
```sql
SELECT COUNT(*) FROM invitations
WHERE creator_id = :user_id AND status = 'active'
```
Reject with 409 if count >= 2.

---

## 6. File Upload Flow

### Upload (during invitation creation)

1. Frontend sends multipart/form-data with photo file + other fields
2. Backend validates:
   - File type (JPEG, PNG, WebP only)
   - File size (max 5MB — reasonable for invitation photos)
   - Image dimensions (optional: resize if too large)
3. Backend generates filename: `{invitation_id}.{ext}`
4. Backend writes to Railway volume: `/data/uploads/{invitation_id}.{ext}`
5. Backend stores relative path in `invitations.photo_path`

### Serving

- FastAPI route: `GET /uploads/{filename}`
- Uses `FileResponse` or `StaticFiles` mount
- Optional: Add cache headers (photos are immutable until deleted)

### Cleanup

- On invitation accept: delete photo file in background task
- On invitation expiry: delete photo file during cleanup job

### Railway Volume Notes

- Mount path configured in `railway.toml` or Railway dashboard
- Volume persists across deploys (unlike ephemeral filesystem)
- No CDN — acceptable for v1, photos are only accessed by one recipient typically

---

## 7. Notification System

### How It Works

1. Recipient clicks Yes on invitation page
2. `POST /invitations/:id/accept` handler:
   a. Reads invitation title (before deletion)
   b. Creates notification row:
      ```sql
      INSERT INTO notifications (user_id, invitation_id, invitation_title, message)
      VALUES (:creator_id, :invitation_id, :title, :recipient_message)
      ```
   c. Updates invitation status to 'accepted'
   d. Deletes photo file (background task)
   e. Deletes invitation row (or marks as accepted — see note below)
3. Creator sees notification on next dashboard load

### Notification Display

- Dashboard polls `GET /api/v1/notifications` on load (and optionally on interval)
- Unread notifications show a red dot/heart indicator
- Notification text: "[title] — someone said yes!" + optional 30-char message
- Creator clicks to mark as read via `PATCH /api/v1/notifications/:id`

### Design Note: Delete vs. Soft Delete

The requirements say "clicking Yes deletes the invitation data." Two interpretations:

- **Hard delete**: Remove the invitation row entirely. Notification has denormalized title+message, so it survives. Simplest approach.
- **Soft delete**: Set `status = 'accepted'` and delete photo only. Allows creator to see history. Adds complexity.

**Recommendation**: Hard delete the invitation row + photo. The notification preserves what matters. Keep it simple for v1.

### No WebSockets Needed (v1)

- Polling on dashboard load is sufficient — creators check their dashboard periodically
- Real-time push is over-engineered for this use case in v1

---

## 8. Expiry System

### Strategy: Scheduled Background Task

Use APScheduler (or a simple async loop) running inside the FastAPI process:

```python
# Runs every hour
async def cleanup_expired_invitations():
    expired = await db.execute(
        select(Invitation)
        .where(Invitation.status == 'active')
        .where(Invitation.expires_at < now())
    )
    for inv in expired:
        # Delete photo from volume
        os.remove(f"/data/uploads/{inv.photo_path}")
        # Delete DB row
        await db.delete(inv)
    await db.commit()
```

### Why Not a Separate Cron Service?

- Railway charges per service. Running cleanup inside the FastAPI process is free.
- The cleanup query is lightweight (indexed on `expires_at`).
- If the app restarts, the scheduler restarts — expired items just wait until next run.

### Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| In-process APScheduler | Simple, no extra infra | Dies with process |
| Railway cron job | Decoupled | Extra service cost |
| Lazy expiry (check on access) | Zero background work | Orphan photos never cleaned |
| PostgreSQL pg_cron | DB-native | Can't delete files from DB |

**Recommendation**: In-process APScheduler + lazy expiry as belt-and-suspenders. The scheduler runs hourly to clean up. Additionally, any API endpoint that reads an invitation checks `expires_at` and returns 404 if expired (handles the gap between expiry and next cleanup run).

---

## 9. Component Boundaries

### Frontend → Backend API Contract

The frontend only communicates with the backend via JSON REST API over HTTPS. No direct database or file system access.

```
┌─────────────────────────────────────┐
│            FRONTEND                 │
│                                     │
│  Auth Module ──────────────┐        │
│  Dashboard Module ─────────┤        │
│  Create Module ────────────┤ HTTP   │
│  Invitation Page Module ───┤ JSON   │
│  Notification Module ──────┘        │
│                                     │
└──────────────┬──────────────────────┘
               │
        /api/v1/* (JSON)
        /uploads/* (binary)
               │
┌──────────────▼──────────────────────┐
│            BACKEND                  │
│                                     │
│  Auth Router ──────┐                │
│  Invitation Router ┤  SQLAlchemy    │
│  Notification Router┘  ───────┐     │
│                               │     │
│  Background Scheduler ────────┤     │
│  File Manager ────────────────┤     │
│                               │     │
│              ┌────────────────┘     │
│              ▼                      │
│  ┌──────────────┐  ┌────────────┐  │
│  │  PostgreSQL  │  │  Volume    │  │
│  └──────────────┘  └────────────┘  │
└─────────────────────────────────────┘
```

### Backend Internal Boundaries

- **Routers**: Thin HTTP layer — validate input, call services, return responses
- **Services**: Business logic — invitation creation, password verification, expiry checks
- **Models**: SQLAlchemy ORM models
- **Schemas**: Pydantic models for request/response validation
- **Dependencies**: FastAPI dependency injection for auth, DB sessions

### Error Contract

All API errors return:
```json
{
  "detail": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

Common codes: `MAX_INVITATIONS_REACHED`, `INVALID_PASSWORD`, `INVITATION_EXPIRED`, `NOT_FOUND`, `UNAUTHORIZED`.

---

## 10. Suggested Build Order

### Phase 1: Foundation (no dependencies)

1. **Project scaffolding** — FastAPI project structure, React project with Vite, PostgreSQL connection
2. **Database models + migrations** — Users, Invitations, Notifications tables via Alembic
3. **Google OAuth flow** — Login, JWT issuance, `get_current_user` dependency

*Rationale*: Everything else depends on having a running app with auth.

### Phase 2: Core CRUD (depends on Phase 1)

4. **Invitation creation** — POST endpoint, photo upload to volume, max-2 check
5. **Creator dashboard** — List invitations, delete invitation
6. **Photo serving** — Static file route for uploaded photos

*Rationale*: Creator-side functionality before recipient-side.

### Phase 3: Recipient Experience (depends on Phase 2)

7. **Invitation page — password gate** — Unlock endpoint, token issuance
8. **Invitation page — reveal** — Page data endpoint, frontend animation (the No button)
9. **Accept flow** — Yes click, message dialog, notification creation, invitation deletion

*Rationale*: This is the core product experience. The No button animation is frontend-only and can be developed in parallel with backend work.

### Phase 4: Polish (depends on Phase 3)

10. **Notification system** — List, read, red dot indicator on dashboard
11. **Expiry cleanup** — Background scheduler, photo deletion
12. **Bilingual UI** — i18n setup, zh-TW and en translations

*Rationale*: These are important but not blocking the core flow.

### Phase 5: Deploy + Harden

13. **Railway deployment config** — railway.toml, environment variables, volume mount
14. **Error handling + edge cases** — Rate limiting, input sanitization, CORS lockdown
15. **Testing** — Key flows: create, unlock, accept, expiry

### Dependency Graph

```
Phase 1: Scaffolding ──▶ DB Models ──▶ OAuth
                                         │
                                         ▼
Phase 2:                    Invitation CRUD ──▶ Dashboard ──▶ Photo Serving
                                         │
                                         ▼
Phase 3:              Password Gate ──▶ Reveal Page ──▶ Accept Flow
                                                            │
                                                            ▼
Phase 4:                              Notifications ──▶ Expiry ──▶ i18n
                                                                     │
                                                                     ▼
Phase 5:                                              Deploy ──▶ Harden ──▶ Test
```

---

## Open Questions for Discussion Phase

1. **Cookie vs. localStorage for JWT?** HTTP-only cookie is more secure but complicates CORS. localStorage is simpler but vulnerable to XSS. For a casual app, either works.
2. **Should the unlock token be a JWT or opaque DB token?** JWT is stateless but can't be revoked. DB token adds a query but allows revocation. Leaning JWT since these are short-lived.
3. **Photo resizing on upload?** Reduces storage and speeds up page loads, but adds Pillow dependency and processing time. Worth it if photos are large.
4. **Should notifications have a max retention?** Without cleanup, notifications accumulate forever. Could auto-delete after 30 days.
5. **Frontend serving strategy?** FastAPI serving React static files (single service) vs. separate Railway service. Single service is simpler and cheaper.

---

*Researched: 2025-05-04*
