---
status: issues_found
phase: 02
depth: standard
files_reviewed: 17
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
reviewed_at: 2026-05-09
---

# Code Review: Phase 02 — Invitation Creation & Management

## Summary

Phase 02 is well-structured with solid path traversal prevention and clean separation of concerns. Two critical issues need attention: the password is stored and returned in plaintext (leaking in API responses), and the `create_invitation` endpoint has a TOCTOU race on the invitation count check. Several warnings around missing DB commit handling, error message quality, and i18n completeness round out the findings.

## Findings

### critical-1: Password returned in plaintext in API response
**File:** `backend/app/schemas/invitation.py:10`
**Severity:** critical
**Description:** `InvitationResponse` includes the raw `password` field. Every call to `GET /api/invitations` and `POST /api/invitations` returns the plaintext password in the JSON response body. While the CLAUDE.md spec says "not a security feature," the password is transmitted over the wire on every dashboard load. If an attacker intercepts any authenticated API response (e.g., via browser extension, proxy log, or shared screen), they get all recipient passwords. The creator only needs to see the password once (at creation time or via explicit reveal), not on every list fetch.
**Fix:** Create a separate `InvitationCreatedResponse` schema that includes `password`. Remove `password` from `InvitationResponse` used by the list endpoint. Alternatively, if the UI needs to show/hide the password on the dashboard (as `InvitationCard` does), keep it but document the intentional decision.

### critical-2: Race condition on invitation count check (TOCTOU)
**File:** `backend/app/routers/invitations.py:73-85`
**Severity:** critical
**Description:** The active invitation count is checked with a SELECT, then a new row is inserted later. Two concurrent requests from the same user can both pass the count check and create a 3rd invitation, bypassing the MAX_ACTIVE_INVITATIONS=2 limit. The `db.flush()` on line 116 does not prevent this because no database-level constraint enforces the limit.
**Fix:** Either (a) use `SELECT ... FOR UPDATE` on the user's invitations to take a row-level lock during the check, or (b) add a partial unique index / check constraint at the database level, or (c) wrap the count-check + insert in a serializable transaction isolation level. Option (a) is simplest: `select(...).where(...).with_for_update()`.

### warning-1: Missing explicit commit in create and delete endpoints
**File:** `backend/app/routers/invitations.py:107-132`
**Severity:** warning
**Description:** The `create_invitation` endpoint calls `db.flush()` and `db.refresh()` but never calls `await db.commit()`. The `delete_invitation` endpoint calls `await db.delete()` but also never commits. This relies entirely on the `get_db` dependency's session teardown to auto-commit. If the session middleware uses `expire_on_commit=True` (SQLAlchemy default) and the response serialization accesses lazy attributes after commit, it could fail. More importantly, if the photo write fails on line 125, the code raises an HTTPException — but whether the DB row is rolled back depends on whether the session middleware catches the exception and calls rollback. This behavior is implicit and fragile.
**Fix:** Add explicit `await db.commit()` after the photo is successfully written (line 125). For the delete endpoint, add `await db.commit()` after `db.delete()`. This makes the transaction boundary explicit and predictable.

### warning-2: Photo file deleted before DB commit in delete endpoint
**File:** `backend/app/routers/invitations.py:175-180`
**Severity:** warning
**Description:** The photo file is deleted from disk on line 177 (`os.remove`), then the DB row is deleted on line 179. If the DB delete or subsequent commit fails, the photo file is already gone — creating an orphaned DB row pointing to a missing file.
**Fix:** Reverse the order: delete the DB row and commit first, then delete the photo file. A missing photo file is a less severe inconsistency than a DB row pointing to nothing.

### warning-3: `document.title` set outside useEffect causes re-render side effect
**File:** `frontend/src/pages/DashboardPage.jsx:22`
**Severity:** warning
**Description:** `document.title = "Dashboard - OhYes"` is called directly in the component body (outside any hook). This runs on every render, which is wasteful and violates React's expectation that render functions are pure.
**Fix:** Move into a `useEffect(() => { document.title = "Dashboard - OhYes"; }, []);` block.

### warning-4: zh-TW.json is not translated — identical to en.json
**File:** `frontend/src/i18n/zh-TW.json:1-58`
**Severity:** warning
**Description:** The entire `zh-TW.json` file is an exact copy of `en.json`. The app claims to support Chinese (Traditional) but every string is in English. This means Chinese-language users see English text, defeating the purpose of i18n.
**Fix:** Translate all strings in `zh-TW.json` to Traditional Chinese, or remove the file and defer i18n to a later phase to avoid giving users the false impression that Chinese is supported.

### warning-5: Non-API error responses shown as generic network error
**File:** `frontend/src/pages/CreateInvitationPage.jsx:119`
**Severity:** warning
**Description:** When the server returns a non-OK response (e.g., 409 for invitation limit reached, 400 for validation errors), the frontend shows the generic `errors.network` message ("Something went wrong. Please try again.") instead of parsing the server's `detail` field. The user gets no actionable information about why creation failed.
**Fix:** Parse `res.json()` on error responses and display `data.detail` when available. Fall back to the generic message only for unexpected errors or network failures.

### info-1: Unused import `os` can be replaced with pathlib
**File:** `backend/app/routers/invitations.py:1`
**Severity:** info
**Description:** `os` is imported only for `os.remove()` on line 177. The code already uses `pathlib.Path` everywhere else. Mixing `os` and `pathlib` is inconsistent.
**Fix:** Replace `os.remove(photo_path)` with `photo_path.unlink()` and remove the `os` import.

### info-2: Duplicate PHOTO_FILENAME_PATTERN regex
**File:** `backend/app/routers/invitations.py:30`, `backend/app/routers/photos.py:11`
**Severity:** info
**Description:** The same regex `r"^[A-Za-z0-9]{7}\.webp$"` is defined in both `invitations.py` and `photos.py`. In `invitations.py` it is defined but never used.
**Fix:** Remove the unused `PHOTO_FILENAME_PATTERN` from `invitations.py`. If it is needed in the future, extract it to a shared constants module.

### info-3: `string` import unused beyond ALPHABET constant
**File:** `backend/app/routers/invitations.py:4`
**Severity:** info
**Description:** Minor: `string` is imported to build `ALPHABET`. This is fine but could use `secrets.token_urlsafe()` instead for simpler code. Not a bug.
**Fix:** No action required. Noting for completeness.

### info-4: Clipboard copy failure shows wrong error message
**File:** `frontend/src/pages/DashboardPage.jsx:67-68`
**Severity:** info
**Description:** When `navigator.clipboard.writeText` fails (e.g., on HTTP or in an iframe), the `handleCopyError` callback shows `errors.network` ("Something went wrong. Please try again."). A clipboard failure is not a network error — this is misleading.
**Fix:** Add a dedicated i18n key like `errors.clipboardFailed` ("Couldn't copy to clipboard. Try copying the link manually.") and use it in `handleCopyError`.
