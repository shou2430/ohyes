# Phase 2: Invitation Creation & Management -- Research

**Researched:** 2026-05-09

## Existing Codebase Analysis

### Backend Patterns

**Project structure:** `backend/app/` follows a layered layout: `core/` (config, database, security), `models/` (SQLAlchemy ORM), `routers/` (FastAPI route handlers), `schemas/` (Pydantic response/request models). Each layer has an `__init__.py` that re-exports public symbols.

**Model pattern:** Models inherit from `app.models.base.Base` (plain `DeclarativeBase`). Columns use SQLAlchemy 2.0 `Mapped[]` + `mapped_column()` style with Python type hints. Timestamps use `DateTime(timezone=True)` with `server_default=func.now()`. See `app/models/user.py` for the canonical example.

**Model registration:** `app/models/__init__.py` imports and re-exports all models. Alembic's `env.py` imports `Base` from here, which triggers all model registrations for autogenerate. Any new model MUST be imported in `app/models/__init__.py` or Alembic will not see it.

**Router pattern:** Routers use `APIRouter(prefix="/api/...", tags=[...])`. They are registered in `app/main.py` via `app.include_router(...)`. Auth-protected endpoints use `Depends(get_current_user)` from `app/core/security.py`, which returns a `User` ORM object.

**Schema pattern:** Pydantic v2 models in `app/schemas/`. Response models use `model_config = {"from_attributes": True}` for ORM compatibility. Schemas are re-exported from `app/schemas/__init__.py`.

**Database sessions:** `app/core/database.py` provides `get_db()` as a FastAPI dependency yielding `AsyncSession`. The session auto-commits on success and auto-rollbacks on exception.

**Alembic:** Async-aware `env.py` using `create_async_engine`. Migrations live in `backend/alembic/versions/`. Existing migration `b14db3594d41` created the `users` table. The `sqlalchemy.url` in `alembic.ini` is blank; `env.py` reads `settings.async_database_url` directly.

**Config:** `app/core/config.py` uses `pydantic_settings.BaseSettings` with `.env` file support. `PHOTO_STORAGE_PATH` is already defined (default `./data/photos`).

**Auth dependency:** `get_current_user()` extracts JWT from `Authorization: Bearer <token>`, decodes it, looks up the user by `id` from the `sub` claim, and returns the `User` ORM instance. Returns 401 on any failure.

### Frontend Patterns

**Routing:** `react-router` v7 with `BrowserRouter`. Routes defined in `App.jsx`. Protected routes wrap children in `<ProtectedRoute>`. Current routes: `/`, `/auth/callback`, `/dashboard`.

**Auth:** `AuthContext` provides `{ user, loading, logout }` via `useAuth()` hook. Token stored in `localStorage` under key `ohyes_token`. API calls use `Authorization: Bearer <token>` header. The `API_URL` is read from `import.meta.env.VITE_API_URL` (empty string for dev, since Vite proxies `/api` to localhost:8000).

**Styling:** Tailwind CSS v4 with `@theme` block in `index.css` defining custom colors (`cream`, `accent`, `destructive`, `text-primary`, `text-secondary`, `border`) and font. No component library -- all hand-rolled utility classes.

**i18n:** `react-i18next` with `useTranslation()` hook. JSON translation files at `frontend/src/i18n/en.json` and `zh-TW.json`. Default language is `zh-TW`, fallback is `en`. Note: both files currently have identical English content -- zh-TW translations appear to be deferred.

**Icons:** `lucide-react` package. Used as named imports (e.g., `LogIn`, `LogOut`).

**Animation:** `motion` package (Framer Motion 12) is installed but not yet used in any component.

**State management:** No global state library. Auth state via Context. Component-local state via `useState`.

**API call pattern:** Direct `fetch()` calls with manual `authHeaders()` construction. No API client abstraction exists yet. This is fine for the current scale.

### Reusable Assets for Phase 2

| Asset | Location | Reuse |
|-------|----------|-------|
| `get_current_user` dependency | `backend/app/core/security.py` | All invitation endpoints |
| `get_db` dependency | `backend/app/core/database.py` | All invitation endpoints |
| `Base` class | `backend/app/models/base.py` | Invitation model |
| `User` model | `backend/app/models/user.py` | FK relationship |
| `PHOTO_STORAGE_PATH` | `backend/app/core/config.py` | Photo storage |
| `AuthContext` / `useAuth` | `frontend/src/context/AuthContext.jsx` | Auth headers for API calls |
| `ProtectedRoute` | `frontend/src/components/ProtectedRoute.jsx` | `/create` route guard |
| `LoadingSpinner` | `frontend/src/components/LoadingSpinner.jsx` | Loading states |
| Dashboard top bar | `frontend/src/pages/DashboardPage.jsx` | Extract to shared component or duplicate |
| Tailwind theme tokens | `frontend/src/index.css` | All new components |

---

## Database Schema Design

### Invitations Table

```sql
CREATE TABLE invitations (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    short_code    VARCHAR(8) NOT NULL UNIQUE,
    title         VARCHAR(255) NOT NULL,
    password      VARCHAR(8) NOT NULL,
    photo_filename VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_invitations_user_id ON invitations(user_id);
CREATE UNIQUE INDEX ix_invitations_short_code ON invitations(short_code);
```

### SQLAlchemy Model

```python
class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    short_code: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    password: Mapped[str] = mapped_column(String(8))
    photo_filename: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
```

### Column Rationale

- **`user_id`**: FK to `users.id`. Indexed for "list my invitations" queries. `ON DELETE CASCADE` ensures user deletion cleans up invitations (though photo files need separate cleanup).
- **`short_code`**: The unique identifier used in shareable URLs (`/i/:code`). Unique index for fast lookups by recipients.
- **`title`**: Free-form text. 255 chars is generous but reasonable.
- **`password`**: Stored as plain text per project spec ("not a security feature"). 4-8 chars enforced at application layer.
- **`photo_filename`**: Just the filename (e.g., `a1b2c3d4.webp`), not the full path. The storage path is a config concern. This makes migrations between storage backends easier.
- **`expires_at`**: Computed at creation time as `created_at + 7 days`. Storing the absolute timestamp rather than computing from `created_at` makes queries simpler: `WHERE expires_at > now()` filters expired invitations directly.

### Short Code Generation Strategy

**Recommended approach: Python `secrets` module with custom alphabet.**

```python
import secrets
import string

ALPHABET = string.ascii_letters + string.digits  # 62 chars
CODE_LENGTH = 7  # 62^7 = 3.5 trillion combinations

def generate_short_code() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))
```

**Why not nanoid?** nanoid is a Node.js library. The Python port (`nanoid`) is a trivial wrapper around `secrets.choice` with no meaningful advantage. Implementing it inline avoids a dependency for 3 lines of code.

**Why not UUID?** UUIDs are 36 characters. The requirement is 6-8 character codes that are "chat/social friendly" (D-08). A 7-character base-62 code provides 3.5 trillion combinations, which is astronomically more than needed for this app.

**Collision handling:** Generate code, attempt INSERT. On unique constraint violation, retry with a new code. With 3.5 trillion possibilities and a maximum of a few thousand invitations ever, the collision probability is effectively zero. A retry loop (max 5 attempts) is a safety net, not a performance concern.

```python
async def create_unique_short_code(db: AsyncSession) -> str:
    for _ in range(5):
        code = generate_short_code()
        exists = await db.execute(
            select(Invitation.id).where(Invitation.short_code == code)
        )
        if not exists.scalar_one_or_none():
            return code
    raise HTTPException(status_code=500, detail="Failed to generate unique code")
```

Alternative: Check-then-insert is slightly less safe than catch-unique-violation, but with 3.5T combinations and single-digit concurrent users, this is fine. The unique DB constraint is the true safety net regardless.

---

## API Design

### Endpoints

All invitation endpoints live under `/api/invitations` with tag `"invitations"`.

#### 1. Create Invitation

```
POST /api/invitations
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form fields:
  - title: string (required)
  - password: string (required, 4-8 chars)
  - photo: UploadFile (required, max 5 MB, image/*)

Response 201:
{
  "id": 1,
  "short_code": "Xk9mP2a",
  "title": "Will you go out with me?",
  "password": "love",
  "photo_url": "/api/photos/a1b2c3d4.webp",
  "created_at": "2026-05-09T12:00:00Z",
  "expires_at": "2026-05-16T12:00:00Z",
  "share_url": "https://ohyes.app/i/Xk9mP2a"
}

Errors:
  - 400: Validation errors (title missing, password wrong length, file too large, invalid image)
  - 409: Max 2 active invitations reached
  - 401: Not authenticated
```

**Implementation notes:**
- FastAPI handles `multipart/form-data` via `UploadFile` parameter and `Form()` for string fields.
- Must check `count(user's active invitations) < 2` before creating.
- Photo processing (resize, convert to WebP) happens synchronously during the request. With Pillow and max 5 MB input, this should complete in under 1 second.
- `share_url` is computed by the backend from `settings.FRONTEND_URL + "/i/" + short_code`.

#### 2. List My Invitations

```
GET /api/invitations
Authorization: Bearer <token>

Response 200:
[
  {
    "id": 1,
    "short_code": "Xk9mP2a",
    "title": "Will you go out with me?",
    "password": "love",
    "photo_url": "/api/photos/a1b2c3d4.webp",
    "created_at": "2026-05-09T12:00:00Z",
    "expires_at": "2026-05-16T12:00:00Z",
    "share_url": "https://ohyes.app/i/Xk9mP2a"
  }
]
```

**Notes:** Only returns the current user's invitations. Only returns non-expired invitations (filter `WHERE expires_at > now()`). Ordered by `created_at DESC`. Max 2 results.

#### 3. Delete Invitation

```
DELETE /api/invitations/{invitation_id}
Authorization: Bearer <token>

Response 200:
{ "message": "Invitation deleted" }

Errors:
  - 404: Invitation not found or not owned by user
  - 401: Not authenticated
```

**Notes:** Must verify `invitation.user_id == current_user.id`. On delete, also remove the photo file from disk. Use `os.remove()` (or `aiofiles` if strict async is desired, but `os.remove` for a single file is fine).

#### 4. Get Invitation by Short Code (public, for recipient)

```
GET /api/invitations/by-code/{short_code}
(No auth required)

Response 200 (password not included):
{
  "short_code": "Xk9mP2a",
  "title": "Will you go out with me?",
  "photo_url": "/api/photos/a1b2c3d4.webp",
  "requires_password": true
}

Errors:
  - 404: Invitation not found or expired
```

**Notes:** This is the endpoint the recipient's frontend calls when they visit `/i/:code`. It does NOT return the password. The password verification will be a separate endpoint (Phase 3 scope -- recipient experience). For Phase 2, this endpoint exists to power the "expired/invalid invitation" page (D-19). It confirms whether an invitation exists and is still active.

**Decision: Include or exclude photo_url before password verification?** For Phase 2, this endpoint can return minimal info (just existence confirmation). Phase 3 will add password verification and full content delivery. For now, returning `requires_password: true` and omitting photo/title until password is verified is more secure, but since the password is "not a security feature," returning the title and photo is also acceptable. Recommend returning minimal info for now and expanding in Phase 3.

### Pydantic Schemas

```python
# Request schemas
class InvitationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=4, max_length=8)

# Response schemas
class InvitationResponse(BaseModel):
    id: int
    short_code: str
    title: str
    password: str
    photo_url: str
    created_at: datetime
    expires_at: datetime
    share_url: str
    model_config = {"from_attributes": True}

class InvitationPublicResponse(BaseModel):
    short_code: str
    requires_password: bool = True
```

**Note on multipart/form-data:** When using `UploadFile` for the photo, the other fields must be received as `Form()` parameters, not as a JSON body. Pydantic models cannot be used directly with `multipart/form-data`. The schema above documents the shape, but the actual endpoint will declare parameters individually:

```python
async def create_invitation(
    title: str = Form(..., min_length=1, max_length=255),
    password: str = Form(..., min_length=4, max_length=8),
    photo: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
```

---

## Photo Upload Pipeline

### Upload Handling (FastAPI)

1. Receive `UploadFile` from multipart/form-data request.
2. Validate content type: Check `photo.content_type` starts with `image/`. Also validate with Pillow (content type can be spoofed).
3. Validate file size: Read file into memory, check `len(contents) <= 5 * 1024 * 1024` (5 MB). FastAPI's `UploadFile` does not enforce size limits by default. Must read and check manually.
4. Process with Pillow.
5. Save to disk.

### Pillow Processing

```python
from PIL import Image
import io

MAX_DIMENSION = 1200
WEBP_QUALITY = 85

def process_photo(file_contents: bytes) -> bytes:
    """Validate, resize, and convert photo to WebP."""
    img = Image.open(io.BytesIO(file_contents))
    img.verify()  # Validates it's a real image
    
    # Re-open after verify (verify() can only be called once)
    img = Image.open(io.BytesIO(file_contents))
    
    # Convert RGBA to RGB (WebP supports RGBA, but JPEG sources might have issues)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    
    # Resize if larger than max dimension (preserve aspect ratio)
    img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
    
    # Convert to WebP
    output = io.BytesIO()
    img.save(output, format="WebP", quality=WEBP_QUALITY)
    return output.getvalue()
```

**Key considerations:**
- `Image.verify()` detects truncated or corrupted files but also detects non-image files disguised with image extensions.
- `img.thumbnail()` resizes in-place while preserving aspect ratio. Max 1200px on the longest side (per D-05).
- WebP output at quality 85 provides excellent quality with good compression. A 5 MB JPEG input typically becomes ~100-300 KB WebP.
- EXIF orientation is handled automatically by Pillow 10+ when using `Image.open()` (auto-transpose is default behavior).

### File Naming Strategy

Use the invitation's short code as the filename base:

```
{short_code}.webp
```

Example: `Xk9mP2a.webp`

This creates a 1:1 mapping between invitation and photo file. No need for a separate UUID. When an invitation is deleted, the photo file to remove is deterministic.

The `photo_filename` column stores just this filename (e.g., `Xk9mP2a.webp`). The full path is `{PHOTO_STORAGE_PATH}/{photo_filename}`.

### Serving Photos

**Recommended: Dedicated API endpoint, not StaticFiles mount.**

```python
from fastapi.responses import FileResponse

@router.get("/api/photos/{filename}")
async def get_photo(filename: str):
    path = Path(settings.PHOTO_STORAGE_PATH) / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(path, media_type="image/webp")
```

**Why not `StaticFiles` mount?** `StaticFiles` would work but exposes the entire directory. A dedicated endpoint gives control over:
- Path traversal protection (though `StaticFiles` handles this too).
- Future: auth-gated photo access if needed.
- Cache headers (`Cache-Control: public, max-age=86400`).

**Why not serve from frontend/CDN?** Photos are on the backend's persistent volume. The backend must serve them. In production, the frontend at `ohyes.app` will proxy or link to `api.ohyes.app/api/photos/...`.

### Storage Directory

Flat directory: `{PHOTO_STORAGE_PATH}/` with all photos at the top level. With max 2 invitations per user and 7-day TTL, the total file count will stay in the low hundreds at most. No need for subdirectories.

Ensure directory exists at startup:

```python
# In main.py or a startup event
Path(settings.PHOTO_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
```

---

## Frontend Architecture

### New Routes

Add to `App.jsx`:

```jsx
<Route path="/create" element={<ProtectedRoute><CreateInvitationPage /></ProtectedRoute>} />
<Route path="/i/:code" element={<InvitationGatePage />} />
```

- `/create` is protected (requires auth).
- `/i/:code` is public (recipient access). For Phase 2, this only renders the expired/invalid page or confirms the invitation exists. Phase 3 adds the password gate and invitation experience.

### New Components

```
frontend/src/
  pages/
    CreateInvitationPage.jsx    -- Form + preview + success modal
    InvitationGatePage.jsx      -- Phase 2: expired page only. Phase 3: password gate
  components/
    InvitationCard.jsx          -- Dashboard card for a single invitation
    SuccessModal.jsx            -- Post-creation modal with share URL
    Toast.jsx                   -- Toast notification component
```

### DashboardPage Updates

The current `DashboardPage.jsx` only renders an empty state with a disabled Create button. It needs:

1. Fetch `GET /api/invitations` on mount to get the user's invitations.
2. Render `InvitationCard` components for each invitation.
3. Activate the Create button (link to `/create`) when < 2 invitations.
4. Show limit message when 2 invitations exist.
5. Handle delete action (confirm, call API, remove from local state).
6. Handle copy link action (clipboard API).

### State Management for This Phase

No new Context needed. Component-local state is sufficient:

- **DashboardPage:** `invitations` array from API, loading/error state.
- **CreateInvitationPage:** Form field state (title, password, photo file), validation errors, submission state, success modal visibility.
- **InvitationCard:** Local `showPassword` toggle, `copied` feedback timer.

### API Call Pattern

Follow the existing pattern from `AuthContext.jsx`:

```javascript
const API_URL = import.meta.env.VITE_API_URL || "";

async function apiCall(path, options = {}) {
    const token = localStorage.getItem("ohyes_token");
    const headers = { ...options.headers };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}
```

For the multipart form submission, do NOT set `Content-Type` header manually -- let the browser set it with the boundary when using `FormData`.

```javascript
const formData = new FormData();
formData.append("title", title);
formData.append("password", password);
formData.append("photo", photoFile);

const res = await fetch(`${API_URL}/api/invitations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
});
```

---

## Implementation Considerations

### Edge Cases

1. **Concurrent creation race condition:** User opens two tabs and submits simultaneously, potentially creating a 3rd invitation. The backend MUST check `count < 2` inside the request handler, not rely on the frontend's disabled button. A `SELECT COUNT(*) ... FOR UPDATE` or similar locking approach prevents this. Alternatively, a simple count check is sufficient given the low concurrency -- worst case, 3 invitations exist briefly, which is harmless.

2. **Photo file left on disk after failed DB insert:** If photo is saved to disk but the DB insert fails, an orphan file remains. Mitigation: Save photo to disk AFTER successful DB insert (hold processed bytes in memory), or accept orphans will be cleaned up by the TTL cleanup job in Phase 4.

3. **Large photo upload timeout:** A 5 MB upload over slow mobile connection could take 10+ seconds. The frontend should show clear progress indication. However, `fetch()` does not natively support upload progress. For v1, a spinner with "Creating..." text is sufficient per the UI spec.

4. **Browser clipboard API requires HTTPS or localhost:** `navigator.clipboard.writeText()` only works in secure contexts. This is fine for production (HTTPS) and dev (localhost). If testing on non-localhost HTTP, clipboard will fail. The toast error handles this gracefully.

5. **Photo serving CORS:** Photos served from `api.ohyes.app` will be loaded by `<img>` tags on `ohyes.app`. Standard `<img>` tags are not subject to CORS restrictions, so no additional CORS configuration is needed for photo serving.

6. **Expired invitations still in user's dashboard:** The backend `GET /api/invitations` filters by `expires_at > now()`. But the frontend could cache stale data. On the dashboard, either refetch on every mount (simple) or show a "this invitation has expired" state for invitations past their expiry (calculated client-side from `expires_at`).

### Dependency Order

Implementation should proceed in this order:

1. **Database model + migration** -- Foundation for everything.
2. **Photo processing utility** -- Standalone, testable.
3. **Backend API endpoints** -- Create, list, delete, get-by-code, photo serving.
4. **Frontend CreateInvitationPage** -- Form, preview, submission, success modal.
5. **Frontend DashboardPage updates** -- Card list, copy link, delete, limit enforcement.
6. **Frontend InvitationGatePage** -- Expired page only for Phase 2.
7. **i18n strings** -- Add all new keys to en.json and zh-TW.json.
8. **Toast component** -- Can be implemented alongside any frontend work.

Steps 4-8 can be partially parallelized.

### Dependencies on Other Phases

- **Phase 3 (Recipient Experience)** depends on the invitation model and API from this phase.
- **Phase 4 (Expiry/Cleanup)** depends on the `expires_at` column and the photo storage pattern from this phase.
- The `GET /api/invitations/by-code/{short_code}` endpoint is minimal in Phase 2 and will be expanded in Phase 3 to include password verification and full content delivery.

---

## Validation Architecture

### Backend Testing

1. **Unit tests for photo processing:** Feed various image types (JPEG, PNG, WebP, GIF), oversized images, non-image files, corrupted files. Verify output is WebP, dimensions are <= 1200px, and invalid inputs raise appropriate errors.

2. **Unit tests for short code generation:** Verify code length, character set, uniqueness across multiple generations.

3. **API integration tests:**
   - Create invitation with valid data -> 201, correct response shape.
   - Create invitation without auth -> 401.
   - Create 3rd invitation -> 409.
   - Create with missing title -> 400.
   - Create with password too short/long -> 400.
   - Create with file > 5 MB -> 400.
   - Create with non-image file -> 400.
   - List invitations returns only current user's.
   - Delete own invitation -> 200, photo file removed.
   - Delete another user's invitation -> 404.
   - Get by short code -> 200 for valid, 404 for invalid/expired.

### Frontend Testing (Manual/UAT)

1. Navigate to `/create` while authenticated -> form renders.
2. Fill all fields -> preview updates in real-time.
3. Upload photo > 5 MB -> inline error shown, no upload.
4. Upload valid photo -> preview shows image.
5. Submit with empty title -> field error shown.
6. Submit with 3-char password -> field error shown.
7. Submit valid form -> "Creating..." state, then success modal.
8. Copy link from modal -> clipboard contains correct URL.
9. Dismiss modal -> redirected to dashboard, new card visible.
10. Dashboard shows card with title, date, expiry countdown, masked password.
11. Reveal password -> shows plain text.
12. Copy link from card -> "Copied!" feedback for 2 seconds.
13. Delete card -> confirm dialog, card removed on confirm.
14. Create 2 invitations -> Create button disabled with limit message.
15. Delete one -> Create button re-enabled.
16. Visit `/i/invalidcode` -> expired page shown.
17. All interactions work on mobile viewport.

### Automated Validation Queries

```sql
-- Verify invitation count constraint is respected
SELECT user_id, COUNT(*) FROM invitations
WHERE expires_at > now()
GROUP BY user_id
HAVING COUNT(*) > 2;
-- Should return 0 rows

-- Verify all photo files exist on disk
SELECT photo_filename FROM invitations WHERE expires_at > now();
-- Cross-reference with ls of PHOTO_STORAGE_PATH

-- Verify short codes are unique
SELECT short_code, COUNT(*) FROM invitations
GROUP BY short_code HAVING COUNT(*) > 1;
-- Should return 0 rows
```

---

## RESEARCH COMPLETE
