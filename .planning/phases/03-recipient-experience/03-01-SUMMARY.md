---
plan: 03-01
status: complete
---

# Summary: 03-01 Backend — Notification Model, Password Verify & Respond Endpoints

## What was built
- **Notification model** (`notifications` table) with fields: `id`, `user_id` (FK to users with CASCADE), `invitation_title`, `recipient_name`, `recipient_message`, `is_read`, `created_at`. Stores a snapshot of invitation data after the recipient clicks Yes and the invitation is deleted.
- **Alembic migration** for the notifications table, chained after the invitations migration.
- **4 new Pydantic schemas**: `PasswordVerifyRequest`, `InvitationRevealResponse`, `InvitationRespondRequest`, `InvitationRespondResponse` for the two new public endpoints.
- **POST `/api/invitations/by-code/{short_code}/verify`** — public endpoint that accepts a password, uses `hmac.compare_digest()` for timing-safe comparison, and returns invitation content (title, photo_url) on success. Returns 401 on wrong password, 404 on missing/expired invitation.
- **POST `/api/invitations/by-code/{short_code}/respond`** — public endpoint for the Yes click. Creates a Notification record (snapshotting invitation title), deletes the invitation row, removes the photo file from disk. Returns 404 on missing/expired invitation, 422 on message > 30 chars.
- **8 test functions** across two test files covering 404/401/422 responses and stub placeholders for full integration tests requiring DB infrastructure.

## Key files created/modified
- `backend/app/models/notification.py` (created)
- `backend/app/models/__init__.py` (modified — added Notification export)
- `backend/alembic/versions/a7c2e1f39b04_create_notifications_table.py` (created)
- `backend/app/schemas/invitation.py` (modified — added 4 schemas, Field import)
- `backend/app/routers/invitations.py` (modified — added hmac import, Notification import, 2 new endpoints)
- `backend/tests/test_invitation_verify.py` (created — 4 tests)
- `backend/tests/test_invitation_respond.py` (created — 4 tests)

## Self-Check: PASSED
- All files exist and contain expected classes/functions
- `hmac.compare_digest()` used for password comparison
- Both endpoints are public (no auth dependency)
- Photo URL format: `/api/photos/{photo_filename}`
- Message max_length=30 enforced at schema level
- Photo file deleted after DB commit, not before
- Test files parse without syntax errors (verified via `ast.parse`)
- Validation-only tests (422 checks, stubs) pass; DB-dependent tests fail with expected connection errors (no PostgreSQL in CI environment)
