# Plan 02-01 Summary: Backend — Invitation Model, Photo Pipeline, and API Endpoints

**Executed:** 2026-05-09
**Status:** Complete (7/7 tasks)
**Deviations:** None

## What Was Built

The complete backend infrastructure for invitation management:

1. **Invitation SQLAlchemy Model** — `backend/app/models/invitation.py`
   - Columns: id, user_id (FK to users with CASCADE), short_code (unique, indexed), title, password, photo_filename, created_at, expires_at
   - Registered in `backend/app/models/__init__.py`

2. **Alembic Migration** — `backend/alembic/versions/3hgdqo44f5tm_create_invitations_table.py`
   - Creates invitations table with all columns, FK constraint, and indexes
   - Manually authored (no DB available for autogenerate), follows existing migration pattern

3. **Pydantic Schemas** — `backend/app/schemas/invitation.py`
   - `InvitationResponse`: full details for creator (id, short_code, title, password, photo_url, created_at, expires_at, share_url)
   - `InvitationPublicResponse`: minimal info for recipient lookup (short_code, requires_password)
   - `InvitationDeleteResponse`: confirmation message
   - Registered in `backend/app/schemas/__init__.py`

4. **Photo Processing Utility** — `backend/app/utils/photo.py`
   - `validate_file_size()`: rejects files > 5 MB
   - `process_photo()`: validates with Pillow verify(), converts RGBA/P/LA to RGB, resizes to max 1200px (LANCZOS), outputs WebP at quality 85
   - Standalone module with no framework dependencies

5. **Invitations Router** — `backend/app/routers/invitations.py`
   - `POST /api/invitations`: create with multipart form-data, enforces 2-invitation limit (409), validates photo size/type/content, processes and stores photo
   - `GET /api/invitations`: list current user's active (non-expired) invitations
   - `DELETE /api/invitations/{id}`: ownership-verified delete with photo file cleanup
   - `GET /api/invitations/by-code/{code}`: public endpoint for recipient code lookup

6. **Photos Router** — `backend/app/routers/photos.py`
   - `GET /api/photos/{filename}`: serves WebP files with strict regex validation (`^[A-Za-z0-9]{7}\.webp$`) preventing path traversal, Cache-Control header

7. **main.py Updates** — `backend/app/main.py`
   - Added lifespan context manager to create PHOTO_STORAGE_PATH directory on startup
   - Registered both new routers

## Files Created

- `backend/app/models/invitation.py`
- `backend/alembic/versions/3hgdqo44f5tm_create_invitations_table.py`
- `backend/app/schemas/invitation.py`
- `backend/app/utils/__init__.py`
- `backend/app/utils/photo.py`
- `backend/app/routers/invitations.py`
- `backend/app/routers/photos.py`

## Files Modified

- `backend/app/models/__init__.py` — added Invitation import/export
- `backend/app/schemas/__init__.py` — added invitation schema imports/exports
- `backend/app/main.py` — added lifespan handler, router registrations

## Self-Check Results

- All 5 endpoint paths registered in FastAPI app: PASS
- Invalid image rejected by process_photo: PASS
- Oversized file rejected by validate_file_size: PASS
- All acceptance criteria grep checks: PASS

## Security Mitigations Implemented

- Path traversal: strict regex on photo filename (`^[A-Za-z0-9]{7}\.webp$`)
- File upload validation: Pillow verify() + content-type check + 5 MB size limit
- IDOR prevention: delete endpoint returns 404 (not 403) for non-owned invitations
- Invitation limit: count check before insert (count-then-insert sufficient at this concurrency)
- Short code: 7-char base-62 (3.5T combinations), retry loop for uniqueness
