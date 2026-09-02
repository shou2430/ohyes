---
status: issues_found
phase: "03"
depth: standard
files_reviewed: 17
findings:
  critical: 1
  warning: 7
  info: 6
  total: 14
---

# Code Review: Phase 03 (recipient-experience)

## Summary
The phase implementation is largely solid and well-structured. The most significant issue is that the `respond` endpoint accepts unauthenticated "Yes" submissions without any password re-verification, meaning anyone who knows a short code can trigger notification creation and invitation deletion without having seen the invite. Several warning-level issues exist around race conditions, missing brute-force protection on the verify endpoint, and a confusing container layout in `InvitationReveal`. Info findings are minor style and robustness items.

## Findings

### CR-001: Respond endpoint lacks password verification — unauthenticated deletion
**Severity:** critical
**File:** backend/app/routers/invitations.py:250-287
**Description:** The `POST /by-code/{short_code}/respond` endpoint accepts a "Yes" response from any caller who knows the short code, with no password required. An attacker who discovers a 7-character code (through enumeration or a leaked share URL) can immediately delete the invitation, create a notification record, and destroy the associated photo — without ever entering the creator's password. The victim creator loses their invitation data silently. The verify endpoint (correctly) requires a password, but the respond endpoint that triggers the destructive action does not.
**Suggestion:** Require the password in `InvitationRespondRequest` and validate it with `hmac.compare_digest()` before proceeding, the same way the verify endpoint does. Alternatively, issue a short-lived signed token from the verify endpoint and require it on respond. The simplest fix matching existing patterns:

```python
class InvitationRespondRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=8)
    name: str | None = Field(None, max_length=100)
    message: str | None = Field(None, max_length=30)
```

And add the comparison in the router before creating the notification. Update the frontend `MessageCard` to pass the verified password (stored in component or page state after verify succeeds).

---

### WR-001: No rate limiting on the password verify endpoint — brute-force feasible for short passwords
**Severity:** warning
**File:** backend/app/routers/invitations.py:221-247
**Description:** The plan's threat model (T-03-01-02) acknowledges there is no attempt limit, classifying it as "accepted risk." However, a 4-character password drawn from a small character set (the creator's choice) can be brute-forced in thousands of requests with no friction. With 7-day TTL invitations this window is substantial. The existing code performs no counting, no lockout, and no CAPTCHA.
**Suggestion:** At minimum, add a simple in-memory counter per short_code using a `dict` + `asyncio.Lock`, returning 429 after N failed attempts (e.g., 10) within a sliding window. For production, use a Redis-backed counter. This is a low-effort change that substantially reduces the attack surface even for v1.

---

### WR-002: Race condition — concurrent respond requests can create duplicate notifications
**Severity:** warning
**File:** backend/app/routers/invitations.py:250-287
**Description:** Two concurrent "Yes" clicks (e.g., double-tap on mobile or duplicate network request) both query the invitation, both find it, both create a `Notification`, then both attempt `db.delete(invitation)` and `db.commit()`. The second `DELETE` will raise an SQLAlchemy `StaleDataError` or silently succeed depending on the session state. The notification may be duplicated even if the second commit rolls back, because the first already committed. The `create_invitation` endpoint correctly uses `SELECT ... FOR UPDATE` to prevent a similar race; this endpoint does not.
**Suggestion:** Add `with_for_update()` to the invitation SELECT in `respond_to_invitation`, or use a unique database constraint on notifications that makes the duplicate INSERT fail. The `FOR UPDATE` pattern already used in `create_invitation` is the appropriate model.

---

### WR-003: `InvitationReveal` uses conflicting CSS position properties on the dodge container
**Severity:** warning
**File:** frontend/src/components/recipient/InvitationReveal.jsx:47-48
**Description:** The outer container has both `className="fixed inset-0 bg-cream overflow-hidden"` and `style={{ position: "relative" }}`. The inline style `position: relative` overrides the Tailwind `fixed` utility class because inline styles have higher specificity. The No button, which sets `position: absolute` after first dodge, expects to be positioned relative to this container — but `position: fixed` would make it relative to the viewport, which is actually what the dodge behavior needs for correct clamping. Setting `position: relative` via inline style defeats the `fixed` intent and will cause the absolute-positioned button to overflow the content column width rather than the full viewport. This is a layout bug that will cause the button to dodge within the wrong coordinate space.
**Suggestion:** Remove the `style={{ position: "relative" }}` inline override. If the intent is for the No button to escape within the full viewport, `fixed inset-0` is correct as the containing block for `position: absolute` children when the container itself is `position: fixed`. Verify the dodge clamping math uses `containerRect` (the fixed container's bounds) consistently, which it does.

---

### WR-004: `NoButton` `isMobile` evaluated at module parse time — SSR/hydration incompatible and stale after orientation change
**Severity:** warning
**File:** frontend/src/components/recipient/NoButton.jsx:32-35
**Description:** `const isMobile` is computed once when the module loads using `window.matchMedia(...)`. This is problematic in two ways: (1) it will throw a ReferenceError if ever evaluated in a non-browser context (SSR or test environments without a DOM); (2) it will not re-evaluate if the user rotates the device or attaches a mouse after load. The `typeof window !== "undefined"` guard mitigates the ReferenceError but the staleness remains.
**Suggestion:** Move the `isMobile` check inside a `useMemo` or compute it within `useCallback` at dodge time using `window.matchMedia` lazily. For a SPA-only app this is low-urgency, but the module-level evaluation is a code smell.

---

### WR-005: `PostcardKeepsake` download creates an anchor element but never appends it to the DOM
**Severity:** warning
**File:** frontend/src/components/recipient/PostcardKeepsake.jsx:26-29
**Description:** The download handler creates an `<a>` element, sets `href` and `download`, then calls `a.click()` — but never appends the element to `document.body`. In Firefox and some other browsers, `click()` on a detached element will not trigger the file download. This is a known cross-browser compatibility issue with programmatic downloads.
**Suggestion:** Append the element before clicking and remove it immediately after:
```js
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

---

### WR-006: `PasswordGate` trims the password before comparison but backend uses raw value
**Severity:** warning
**File:** frontend/src/components/recipient/PasswordGate.jsx:14-16
**Description:** The `handleSubmit` guard checks `!password.trim()` to prevent submission of whitespace-only passwords, but then sends `password` (untrimmed) in the JSON body. If a creator sets a password with leading/trailing spaces (unlikely but valid given the `min_length=4` constraint accepts any characters), a recipient who enters the exact same password will succeed. However, if the form guard is intended to normalize the value, the actual sent value should also be trimmed for consistency. More importantly, the guard `password.trim()` being falsy while `password` itself being non-empty (all spaces) would never reach the backend, hiding the case where a user typed only spaces — but that is handled correctly by `PasswordVerifyRequest.min_length=1` on the backend which would reject it anyway. The inconsistency between trim-check and raw-send is a latent confusion.
**Suggestion:** Either send `password.trim()` in the body to match the guard, or remove the trim from the guard and rely solely on backend validation.

---

### WR-007: Test coverage relies on stubs — critical integration paths are untested
**Severity:** warning
**File:** backend/tests/test_invitation_verify.py:5-9, backend/tests/test_invitation_respond.py:36-40
**Description:** The two most important tests — `test_verify_correct_password_returns_200` and `test_respond_creates_notification_and_deletes_invitation` — are empty `pass` stubs. These cover the success paths of both new endpoints, which include password validation, notification creation, invitation deletion, and file deletion. With these stubs in place, the test suite provides no assurance that the endpoints work correctly end-to-end, and regressions will go undetected.
**Suggestion:** Implement these tests using an in-process SQLite or async test database. The conftest already has a `client` fixture; extend it to seed a test invitation before each test, then assert: (1) verify returns 200 with correct `short_code`, `title`, `photo_url`; (2) respond returns 200, the invitation is gone from the DB, and a notification row exists with the correct `user_id` and `invitation_title`.

---

### IR-001: `DodgeCounter` uses `AnimatePresence` without an `exit` animation defined on the child
**Severity:** info
**File:** frontend/src/components/recipient/DodgeCounter.jsx:23-36
**Description:** `AnimatePresence` wraps the `motion.span`, but the span has no `exit` prop. When the span exits (which cannot currently happen since the component returns null for count <= 0 before reaching the AnimatePresence), the exit animation would be undefined. The `AnimatePresence` wrapper provides no value in the current implementation because the count-keyed span never actually exits — it re-mounts on each count change. The `key={count}` approach causes a new element to mount each increment, which is the intended pulse effect, but the `AnimatePresence` wrapper is not contributing a meaningful exit.
**Suggestion:** Either add an `exit` animation to the span (e.g., `exit={{ scale: 0, opacity: 0 }}`), or remove `AnimatePresence` since the exit case is handled by the component returning null at the parent level.

---

### IR-002: `InvitationGatePage` does not handle network errors distinctly from expired invitations
**Severity:** info
**File:** frontend/src/pages/InvitationGatePage.jsx:22-38
**Description:** Both a 404 response (invitation not found) and a network/fetch exception are routed to the `"expired"` screen, which displays "This invitation has expired or been removed." A user on a flaky connection who gets a network timeout will see an expiry message rather than a retry option, creating a confusing UX.
**Suggestion:** Add a separate `"error"` screen state for network failures with a retry button (`window.location.reload()` or re-running `checkInvitation`). Reserve `"expired"` for confirmed 404 responses.

---

### IR-003: `MessageCard` skip link uses `<p role="button">` instead of a semantic `<button>`
**Severity:** info
**File:** frontend/src/components/recipient/MessageCard.jsx:105-118
**Description:** The "Skip message" action is implemented as a `<p>` element with `role="button"`, `tabIndex={0}`, and manual `onKeyDown` handling for Enter/Space. This is an accessibility anti-pattern. A native `<button type="button">` provides all this behavior for free (focus, Enter/Space activation, correct ARIA role) and eliminates the need for manual keyboard handling.
**Suggestion:** Replace with:
```jsx
<button
  type="button"
  className="mt-3 text-sm text-text-secondary text-center cursor-pointer hover:text-text-primary w-full"
  onClick={() => !loading && handleSubmit(true)}
  disabled={loading}
>
  {t("recipient.skip")}
</button>
```

---

### IR-004: `SparkleTrail` `willChange` on container element may cause unnecessary compositor layers
**Severity:** info
**File:** frontend/src/components/recipient/SparkleTrail.jsx:43
**Description:** `style={{ willChange: "transform, opacity" }}` is applied to the static container `div`, not to individual animated particles. `will-change` on the container promotes it to its own compositor layer even when no particles are present, consuming GPU memory for the full duration of the page. Motion's `motion.div` already handles `will-change` optimally on individual elements during animation.
**Suggestion:** Remove `willChange` from the container style. Let Motion manage compositor layer promotion on individual particles automatically.

---

### IR-005: `Notification` model `is_read` field has Python-level `default=False` but no `server_default`
**Severity:** info
**File:** backend/app/models/notification.py:19
**Description:** `is_read: Mapped[bool] = mapped_column(default=False)` sets a Python-side default but not a `server_default`. The Alembic migration correctly sets `server_default=sa.text("false")`, so the database column will default correctly for raw inserts. However, if someone bulk-inserts via raw SQL or a migration script that bypasses SQLAlchemy, the Python default won't apply. The migration and model are inconsistent: the migration has `server_default`, the model does not.
**Suggestion:** Add `server_default=sa.false()` (or `server_default=sa.text("false")`) to the model's `mapped_column` to keep model and migration in sync, matching the pattern used for `created_at`.

---

### IR-006: Short code validation missing on path parameter inputs in public endpoints
**Severity:** info
**File:** backend/app/routers/invitations.py:197-218, 221-247, 250-287
**Description:** The three public endpoints accept `short_code: str` as a path parameter with no length or format validation. A caller can send arbitrarily long strings (e.g., 10,000 characters) as the short code. While the database query will return no results and the endpoint will return 404, the long string is logged, allocated in memory, and included in any error responses. The `PHOTO_FILENAME_PATTERN` regex is defined (`r"^[A-Za-z0-9]{7}\.webp$"`) but only used for delete file safety — not for incoming short codes.
**Suggestion:** Add a `short_code: str = Path(..., min_length=7, max_length=7, pattern=r"^[A-Za-z0-9]{7}$")` annotation on the three public endpoints to reject malformed codes before the DB query with a clean 422.

---

## Files Reviewed

1. `backend/alembic/versions/a7c2e1f39b04_create_notifications_table.py`
2. `backend/app/models/__init__.py`
3. `backend/app/models/notification.py`
4. `backend/app/routers/invitations.py`
5. `backend/app/schemas/invitation.py`
6. `backend/tests/test_invitation_respond.py`
7. `backend/tests/test_invitation_verify.py`
8. `frontend/src/components/recipient/DodgeCounter.jsx`
9. `frontend/src/components/recipient/InvitationReveal.jsx`
10. `frontend/src/components/recipient/MessageCard.jsx`
11. `frontend/src/components/recipient/NoButton.jsx`
12. `frontend/src/components/recipient/PasswordGate.jsx`
13. `frontend/src/components/recipient/PostcardKeepsake.jsx`
14. `frontend/src/components/recipient/SparkleTrail.jsx`
15. `frontend/src/i18n/en.json`
16. `frontend/src/i18n/zh-TW.json`
17. `frontend/src/pages/InvitationGatePage.jsx`
