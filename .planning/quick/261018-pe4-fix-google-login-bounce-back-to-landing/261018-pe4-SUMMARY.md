---
quick_id: 261018-pe4
status: complete
commit: a36d45a
---

# Quick 261018-pe4 Summary: Fix Google login bouncing back to landing

**Root cause:** `AuthProvider`'s mount-time `checkAuth()` ran on `/auth/callback` before the
token was stored → `user=null`. `AuthCallbackPage` then navigated to `/dashboard` and
`ProtectedRoute` redirected to `/`. No `/api/auth/me` call was made. Backend OAuth flow was fine.

**Fix:**
- New `frontend/src/context/auth-api.js`: `TOKEN_KEY`, `API_URL`, `authHeaders`, `fetchCurrentUser(token)`
  (clears a rejected token only if it is still the stored one).
- `AuthContext` exposes `login(token)`; `checkAuth` ignores stale results if the stored token changed.
- `AuthCallbackPage` awaits `login(token)` before navigating (`/dashboard` on success, `/` otherwise);
  ref guard against StrictMode double effect.
- `auth-api.test.js`: 4 vitest cases.

**Verification:** `pnpm test` 13/13, `pnpm lint` clean, `pnpm build` OK.
**Pending:** manual prod check after Railway redeploy.
