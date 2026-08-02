# Phase 4: Notifications & Invitation Lifecycle - Pattern Map

**Mapped:** 2026-08-02
**Files analyzed:** 10
**Analogs found:** 9 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `backend/app/routers/notifications.py` | route/controller | CRUD (request-response) | `backend/app/routers/invitations.py` | exact |
| `backend/app/schemas/notification.py` | model (Pydantic schema) | transform | `backend/app/schemas/invitation.py` | exact |
| `backend/app/tasks/cleanup.py` | service | batch | `backend/app/routers/invitations.py` (`delete_invitation`, `respond_to_invitation`) | role-match (new `tasks/` package, no direct analog directory) |
| `backend/app/main.py` (modified: lifespan + router registration) | config | event-driven | `backend/app/main.py` (self, existing lifespan) | exact — self-modification |
| `backend/pyproject.toml` (modified: add apscheduler) | config | — | n/a | no analog needed |
| `frontend/src/components/NotificationBell.jsx` | component | event-driven | `frontend/src/pages/DashboardPage.jsx` (top bar block) | role-match |
| `frontend/src/components/NotificationPanel.jsx` | component | request-response | `frontend/src/components/InvitationCard.jsx` | role-match |
| `frontend/src/components/NotificationRow.jsx` | component | transform | `frontend/src/components/InvitationCard.jsx` | role-match |
| `frontend/src/pages/DashboardPage.jsx` (modified: mount bell + polling) | component | streaming (polling) | `frontend/src/pages/DashboardPage.jsx` (self, existing fetch-on-mount) | exact — self-modification |
| `backend/tests/conftest.py` (modified: `db_session` fixture) | test | transform | `backend/tests/conftest.py` (self, existing `client` fixture) | exact — self-modification |
| `backend/tests/test_notifications.py` | test | request-response | `backend/tests/test_invitation_verify.py` | role-match |
| `backend/tests/test_cleanup.py` | test | batch | no close analog (no scheduled-job tests exist yet) | none |

## Pattern Assignments

### `backend/app/routers/notifications.py` (route, CRUD/request-response)

**Analog:** `backend/app/routers/invitations.py`

**Imports pattern** (lines 1-27):
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["notifications"])
```
(Matches existing `router = APIRouter(prefix="/api/invitations", tags=["invitations"])` convention exactly — same prefix/tags shape.)

**Auth + ownership-scoping pattern** — every invitations router handler that touches a specific user's row does:
```python
current_user: User = Depends(get_current_user),
db: AsyncSession = Depends(get_db),
```
then filters the query by `.where(Invitation.user_id == current_user.id, ...)` (seen in `delete_invitation`, full block read above). Mirror this exactly for notifications: `.where(Notification.user_id == current_user.id, ...)`. This is the ASVS V4 access-control requirement flagged in RESEARCH.md — never trust a `user_id` from the request.

**Core CRUD pattern (list + bulk update)** — see RESEARCH.md Code Examples section (`GET /api/notifications` via `select().where().order_by(.desc())`, `POST /api/notifications/read` via `update().where(..., is_read.is_(False)).values(is_read=True)` then `await db.commit()`). This already mirrors the existing `select(Invitation).where(...)` + `result.scalar_one_or_none()` idiom used throughout `invitations.py`.

**Error handling pattern** — existing convention (`invitations.py` `delete_invitation`):
```python
result = await db.execute(select(Invitation).where(...))
invitation = result.scalar_one_or_none()
if not invitation:
    raise HTTPException(status_code=404, detail="Invitation not found")
```
Notifications list/mark-read do not need a 404 branch (empty list / no-op update are both valid 200s) — no `HTTPException` needed unless auth fails, which `get_current_user` already handles (401).

---

### `backend/app/schemas/notification.py` (model/schema, transform)

**Analog:** `backend/app/schemas/invitation.py`

**Pattern** (mirror `InvitationResponse`, lines 6-19):
```python
from datetime import datetime
from pydantic import BaseModel

class NotificationResponse(BaseModel):
    id: int
    invitation_title: str
    recipient_name: str | None
    recipient_message: str | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
```
Follow the same `model_config = {"from_attributes": True}` convention used on every response schema in `invitation.py` so `Notification` ORM objects serialize directly from `db.execute(...).scalars().all()`.

---

### `backend/app/tasks/cleanup.py` (service, batch/event-driven)

**No direct analog directory** (`tasks/` is new), but the DB-first-then-file deletion ordering and swallow-on-failure pattern already exists in `backend/app/routers/invitations.py`:

**`delete_invitation` pattern to mirror** (paraphrased from read above):
```python
# Delete DB row first, then remove photo file. If DB delete fails, the photo
# stays intact. An orphaned photo file (no DB row) is less severe than an
# orphaned DB row pointing to a missing file.
photo_path = Path(settings.PHOTO_STORAGE_PATH) / invitation.photo_filename
await db.delete(invitation)
await db.commit()
if photo_path.exists():
    os.remove(photo_path)
```
D-22 explicitly requires this exact tradeoff for the bulk sweep, just via `DELETE ... RETURNING photo_filename` (RESEARCH.md Pattern 3) instead of a single-row `db.delete()`. Reuse `settings.PHOTO_STORAGE_PATH` from `app.core.config` exactly as `invitations.py` does.

**Timezone pattern to mirror** (`invitations.py` line ~5, `respond_to_invitation`):
```python
now = datetime.now(timezone.utc)
```
Always compare against `timezone.utc`-aware datetimes — never naive `datetime.now()` (RESEARCH.md Pitfall 2 flags this explicitly; the existing code already gets it right, so copy it verbatim).

**Advisory lock + full sweep implementation:** use RESEARCH.md's Pattern 2 and Pattern 3 code verbatim — no closer in-repo analog exists since this is the first scheduled job in the codebase.

---

### `backend/app/main.py` (modified: lifespan)

**Analog:** self — current `main.py` lines 1-44 (read in full above).

**Exact current lifespan to extend:**
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle. Creates photo storage directory on boot."""
    Path(settings.PHOTO_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    yield
```
Extend per RESEARCH.md Pattern 1 (add `scheduler.add_job(run_cleanup, "interval", hours=1, id="cleanup_sweep")`, `scheduler.start()` before `yield`, `scheduler.shutdown(wait=False)` after). Router registration follows the exact existing convention:
```python
from app.routers.invitations import router as invitations_router
...
app.include_router(invitations_router)
```
Add `from app.routers.notifications import router as notifications_router` and `app.include_router(notifications_router)` in the same style, same location (after `photos_router`).

---

### `frontend/src/components/NotificationBell.jsx` / `NotificationPanel.jsx` / `NotificationRow.jsx` (components)

**Analog:** `frontend/src/components/InvitationCard.jsx` (full file conventions) + `frontend/src/pages/DashboardPage.jsx` top-bar block (lines 86-116, read above).

**Imports/component shape pattern** (`InvitationCard.jsx` lines 1-8):
```jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Link, Check, Trash2 } from "lucide-react";

export default function InvitationCard({ invitation, onDelete, onCopyError }) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  ...
```
Mirror exactly: default export function component, props destructured in signature, `useTranslation()` for every string, `lucide-react` icons imported by name (`Heart` for the bell per D-02).

**Top bar integration point** (`DashboardPage.jsx` lines 86-116) — the `<header className="flex h-16 items-center justify-between border-b border-border bg-white px-4 sm:px-8">` block, with the right-hand `<div className="flex items-center gap-2">` group holding avatar + name + logout button. `<NotificationBell />` mounts inside this same right-hand flex group, before or after the avatar per UI-SPEC.

**Date/relative-time convention already in codebase** (`InvitationCard.jsx` line 16):
```jsx
const createdDate = new Date(invitation.created_at).toLocaleDateString();
```
This is a plain-date formatter, not relative — RESEARCH.md's locked decision (`Intl.RelativeTimeFormat`, no library) supersedes this for `NotificationRow.jsx`, but the pattern of computing derived display values inline (as with `daysRemaining` in `InvitationCard.jsx` lines 9-14) is the convention to copy:
```jsx
const daysRemaining = Math.max(
  0,
  Math.ceil((new Date(invitation.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
);
```

**Styling tokens** (from `InvitationCard.jsx` and `DashboardPage.jsx`): `bg-cream`, `bg-white`, `border-border`, `text-text-primary`, `text-text-secondary`, `bg-accent`, `text-destructive`, rounded-lg cards with `p-4 sm:p-6`. Reuse these exact Tailwind v4 token names — do not invent new colors.

---

### `frontend/src/pages/DashboardPage.jsx` (modified: mount bell + 30s poll)

**Analog:** self — existing fetch-on-mount pattern (lines 1-42, read above).

**Exact existing pattern to mirror for polling:**
```jsx
useEffect(() => {
  async function fetchInvitations() {
    try {
      const token = localStorage.getItem("ohyes_token");
      const res = await fetch(`${API_URL}/api/invitations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setInvitations(await res.json());
      }
    } catch {
      setToast(t("errors.network"));
    } finally {
      setLoading(false);
    }
  }
  fetchInvitations();
}, [t]);
```
The notification poll (RESEARCH.md Pattern 4) follows this exact `fetch` + `localStorage.getItem("ohyes_token")` + `Authorization: Bearer` header shape, but adds `setInterval`/`clearInterval` for D-13/D-14 and a 401-redirect branch per D-17 (not present in this analog since invitation list fetch doesn't currently handle 401 explicitly — check `useAuth`/`ProtectedRoute.jsx` for the canonical 401-handling location before duplicating).

**Delete/toast-on-error pattern** (`handleDelete`, lines 51-64) — this is the "toast on failure" convention D-10 explicitly diverges from for mark-read (fail silently instead). Do not copy the `setToast(t("errors.network"))` call into the mark-read handler.

---

## Shared Patterns

### Ownership scoping (Access Control)
**Source:** `backend/app/core/security.py` lines 30-55 (`get_current_user`), applied via `.where(Invitation.user_id == current_user.id, ...)` throughout `backend/app/routers/invitations.py`
**Apply to:** `notifications.py` list and mark-read endpoints — every query MUST filter by `Notification.user_id == current_user.id`. Never accept `user_id` from request body/query params.

### DB-first-then-file deletion with swallowed failures
**Source:** `backend/app/routers/invitations.py` (`delete_invitation` photo-deletion comment/logic)
**Apply to:** `tasks/cleanup.py` — delete DB rows first (via `DELETE ... RETURNING photo_filename`), then attempt `os.remove()` per filename, catching `OSError` and logging rather than raising (D-22).

### Timezone-aware datetime comparisons
**Source:** `backend/app/routers/invitations.py` (`now = datetime.now(timezone.utc)`, used against `DateTime(timezone=True)` columns)
**Apply to:** `tasks/cleanup.py` for both the invitation `expires_at` sweep and the notification `created_at` 30-day sweep.

### Async test client fixture
**Source:** `backend/tests/conftest.py` (existing `client` fixture using `AsyncClient` + `ASGITransport`)
```python
@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
```
**Apply to:** `test_notifications.py`, `test_cleanup.py` — extend (do not replace) with the new `db_session` transaction-rollback fixture from RESEARCH.md's Code Examples section, since Phase 3 left `test_respond_creates_notification_and_deletes_invitation` stubbed pending exactly this fixture (WR-007).

### Component conventions (frontend)
**Source:** `frontend/src/components/InvitationCard.jsx` (full file)
**Apply to:** `NotificationBell.jsx`, `NotificationPanel.jsx`, `NotificationRow.jsx` — default export function component, props destructured in signature, `useTranslation()` hook for all strings, `lucide-react` named icon imports, derived values computed inline in the component body (not via external utils), existing Tailwind token names (`bg-cream`, `border-border`, `text-text-primary`, `text-text-secondary`, `bg-accent`, `text-destructive`).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/tests/test_cleanup.py` | test | batch | No scheduled-job or advisory-lock tests exist yet in the codebase — this is the first. Use RESEARCH.md Architecture Patterns (Pattern 2, Pattern 3) and Code Examples directly; structure the test file like `test_invitation_respond.py` for async test conventions (fixture usage, `assert` shape) even though the subject matter (mocking/seeding expired rows, asserting lock behavior) has no precedent. |

## Metadata

**Analog search scope:** `backend/app/routers/`, `backend/app/schemas/`, `backend/app/models/`, `backend/app/core/`, `backend/tests/`, `frontend/src/components/`, `frontend/src/pages/`
**Files scanned:** `backend/app/main.py`, `backend/app/core/security.py`, `backend/app/models/notification.py`, `backend/app/routers/invitations.py`, `backend/app/schemas/invitation.py`, `frontend/src/pages/DashboardPage.jsx`, `frontend/src/components/InvitationCard.jsx`, `backend/tests/conftest.py`
**Pattern extraction date:** 2026-08-02
