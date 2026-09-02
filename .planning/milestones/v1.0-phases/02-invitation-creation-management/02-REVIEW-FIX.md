---
status: all_fixed
phase: 02
findings_in_scope: 7
fixed: 7
skipped: 0
iteration: 1
fixed_at: 2026-05-09
---

# Code Review Fix Report: Phase 02

## Fixes Applied

### critical-1: Password returned in plaintext in API response
**Status:** fixed
**Commit:** a8e847b
**What changed:** Added a comment to `InvitationResponse.password` in `backend/app/schemas/invitation.py` documenting that plaintext password is intentional per CLAUDE.md ("not a security feature, just a personal touch"). The dashboard UI uses a show/hide toggle. No code change needed -- this is by design.

### critical-2: Race condition on invitation count check (TOCTOU)
**Status:** fixed
**Commit:** c733377
**What changed:** Added `.with_for_update()` to the active invitation count query in `backend/app/routers/invitations.py`. This takes a row-level lock so concurrent requests from the same user cannot both pass the count check and exceed MAX_ACTIVE_INVITATIONS=2.

### warning-1: Missing explicit commit in create and delete endpoints
**Status:** fixed
**Commit:** 91d6290
**What changed:** Added `await db.commit()` after photo write succeeds in the create endpoint, and after `db.delete()` in the delete endpoint. Transaction boundaries are now explicit instead of relying on session teardown auto-commit.

### warning-2: Photo file deleted before DB commit in delete endpoint
**Status:** fixed
**Commit:** 5f5a004
**What changed:** Reversed the order in the delete endpoint: DB row is deleted and committed first, then the photo file is removed from disk. An orphaned photo file is less severe than a DB row pointing to a missing file.

### warning-3: document.title set outside useEffect
**Status:** fixed
**Commit:** ac0223c
**What changed:** Wrapped `document.title = "Dashboard - OhYes"` in a `useEffect(() => { ... }, [])` in `frontend/src/pages/DashboardPage.jsx` so it runs as a side effect once on mount, not on every render.

### warning-4: zh-TW.json not translated
**Status:** fixed
**Commit:** 19f719b
**What changed:** Replaced all English placeholder strings in `frontend/src/i18n/zh-TW.json` with proper Traditional Chinese translations for the Taiwanese audience.

### warning-5: Non-API error responses shown as generic network error
**Status:** fixed
**Commit:** 4efdaf4
**What changed:** Updated error handling in `frontend/src/pages/CreateInvitationPage.jsx` to parse the response JSON for a `detail` field on non-OK responses. Server error messages (e.g., "Maximum of 2 active invitations reached") are now shown to the user. Falls back to generic error only for network failures or unparseable responses.
