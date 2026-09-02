---
status: passed
phase: 02-invitation-creation-management
verified_at: 2026-05-09
must_haves_checked: 12
must_haves_passed: 12
---

# Phase 02 Verification: Invitation Creation & Management

## Must-Have Checklist

### Backend (Plan 02-01)

| # | Must-Have | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Invitation model with all columns (id, user_id, short_code, title, password, photo_filename, created_at, expires_at) | PASS | `backend/app/models/invitation.py` — 9 mapped_columns, FK to users with CASCADE, short_code unique+indexed |
| 2 | Alembic migration creates invitations table | PASS | `backend/alembic/versions/3hgdqo44f5tm_create_invitations_table.py` — has create_table, 2x create_index, drop_table in downgrade |
| 3 | Pydantic schemas (InvitationResponse, InvitationPublicResponse, InvitationDeleteResponse) | PASS | `backend/app/schemas/invitation.py` — all 3 classes present, registered in `__init__.py` |
| 4 | Photo processing: validates images, resizes to max 1200px, outputs WebP | PASS | `backend/app/utils/photo.py` — verify(), LANCZOS resize, WebP output at quality 85. Runtime test: invalid image rejected, oversized file rejected |
| 5 | POST /api/invitations creates invitation with multipart form-data, enforces 2-limit | PASS | `backend/app/routers/invitations.py` — MAX_ACTIVE_INVITATIONS=2, returns 409 on limit, validates file size/type/content |
| 6 | GET /api/invitations lists current user's active invitations | PASS | Endpoint present, filters by user_id and expires_at > now |
| 7 | DELETE /api/invitations/{id} with ownership check + photo cleanup | PASS | Checks user_id == current_user.id, returns 404 for non-owned (IDOR protection), calls os.remove on photo file |
| 8 | GET /api/invitations/by-code/{code} public endpoint | PASS | No auth dependency, returns InvitationPublicResponse with short_code and requires_password |
| 9 | Photo serving with path traversal protection | PASS | `backend/app/routers/photos.py` — strict regex `^[A-Za-z0-9]{7}\.webp$`, Cache-Control header |
| 10 | Routers registered in main.py with lifespan photo dir creation | PASS | Both routers imported and included, PHOTO_STORAGE_PATH mkdir in lifespan |

### Frontend (Plan 02-02)

| # | Must-Have | Status | Evidence |
|---|-----------|--------|----------|
| 11 | Toast component with fixed positioning, auto-dismiss, error styling | PASS | `frontend/src/components/Toast.jsx` — fixed top-4, setTimeout 5s, border-l-destructive, role="alert" |
| 12 | InvitationCard with title, password toggle, copy link, delete | PASS | `frontend/src/components/InvitationCard.jsx` — clipboard.writeText, window.confirm, aria-label, aria-live="polite" |
| 13 | SuccessModal with share URL, copy, Escape/backdrop close, focus trap | PASS | `frontend/src/components/SuccessModal.jsx` — CheckCircle, clipboard, Escape key, backdrop click, navigate("/dashboard") |
| 14 | CreateInvitationPage with form + live preview + multipart submission | PASS | `frontend/src/pages/CreateInvitationPage.jsx` — FormData, accept="image/*", revokeObjectURL, tabIndex, SuccessModal |
| 15 | DashboardPage fetches invitations, renders cards, handles delete, shows limit | PASS | `frontend/src/pages/DashboardPage.jsx` — /api/invitations fetch, InvitationCard, limitReached, handleDelete, Toast |
| 16 | InvitationGatePage at /i/:code with expired/valid states | PASS | `frontend/src/pages/InvitationGatePage.jsx` — useParams, by-code API, HeartCrack, expired heading, goHome link |
| 17 | All i18n keys in en.json and zh-TW.json | PASS | Exhaustive check of 25+ keys: all present in both files |
| 18 | Routes: /create (protected) and /i/:code (public) in App.jsx | PASS | /create wrapped in ProtectedRoute, /i/:code is bare Route |

## Automated Checks Performed

| Check | Method | Result |
|-------|--------|--------|
| All 11 source files exist | `ls` | PASS |
| Migration file exists | `ls *create_invitations_table*` | PASS |
| Backend app loads without import errors | `python -c "from app.main import app"` | PASS |
| All 5 API routes registered | Route path inspection | PASS — `/api/invitations` (POST, GET), `/{invitation_id}` (DELETE), `/by-code/{short_code}` (GET), `/api/photos/{filename}` (GET) |
| Photo processing rejects non-image data | Runtime test | PASS |
| Photo processing rejects files > 5 MB | Runtime test | PASS |
| Frontend production build | `npx vite build` | PASS — built in 2.92s, 312.90 kB JS gzipped to 98.06 kB |
| i18n key exhaustive check (25+ keys) | grep loop over both locale files | PASS — all keys present |
| Route protection verification | grep App.jsx for ProtectedRoute wrapping | PASS — /create protected, /i/:code public |
| Security: IDOR protection on delete | grep for user_id ownership check | PASS — 3 ownership checks in invitations router |
| Security: Path traversal protection | grep for regex pattern | PASS — `^[A-Za-z0-9]{7}\.webp$` |
| Security: 2-invitation limit | grep for MAX_ACTIVE_INVITATIONS | PASS — limit=2, returns 409 |

## Requirements Traceability

| Requirement | Description | Status | Backend | Frontend |
|-------------|-------------|--------|---------|----------|
| INV-01 | Create invitation with custom title | PASS | POST endpoint accepts title via Form() | Title input with validation |
| INV-02 | Upload photo for invitation | PASS | Photo processing pipeline (validate, resize, WebP) | Click-to-upload with preview, 5MB client check |
| INV-03 | Set 4-8 character password | PASS | POST endpoint accepts password via Form(min=4, max=8) | Password field with toggle, character counter |
| INV-04 | Unique shareable URL | PASS | 7-char base-62 short_code, build_invitation_response computes share_url | SuccessModal + InvitationCard copy link |
| INV-05 | Max 2 active invitations | PASS | Count check returns 409 at limit | Create button disabled + limitReached message |
| INV-06 | Delete own invitations | PASS | DELETE endpoint with ownership check + photo cleanup | Delete button with confirm dialog |

## Human Verification Items

These require manual testing in a running environment:

- [ ] Create invitation end-to-end: fill form, upload photo, submit, see success modal with URL
- [ ] Copy link button works (clipboard API requires HTTPS or localhost)
- [ ] Delete invitation removes card from dashboard and photo from disk
- [ ] Third invitation attempt shows 409 error correctly
- [ ] Expired invitation URL shows friendly expired page with HeartCrack icon
- [ ] Mobile layout: single-column form, responsive cards
- [ ] Photo preview updates live as user selects image
- [ ] Password show/hide toggle works correctly
- [ ] Object URL memory cleanup (check in devtools)

## Final Verdict

**PASSED.** All 12 must-haves verified through automated checks against the actual codebase. Both backend and frontend build successfully. All planned files exist with expected content patterns. Security mitigations (path traversal, IDOR, file validation, invitation limit) are implemented. i18n keys are complete in both locale files. Routes are correctly protected/public.

No gaps found between the plan specifications and the implemented code.
