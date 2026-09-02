# Phase 3: Recipient Experience - Research

**Researched:** 2026-05-10
**Status:** Complete

## Research Summary

Phase 3 delivers the core product moment: password gate, invitation reveal with escaping No button, sparkle trails, Yes response flow with message input, and postcard keepsake. This research covers the existing codebase integration points, technical approaches for each major feature, dependency analysis, and validation strategies.

Key findings:
- The `motion` package (v12.38.0) is already installed but unused in the codebase. All animation infrastructure is available.
- Password is stored in plaintext (by design), so verification is a simple string comparison — no hashing needed.
- No Notification model exists yet. Phase 3 must create one for RCPT-08 (creator notification on Yes).
- The existing `InvitationGatePage.jsx` is a thin stub with loading/expired states. Phase 3 replaces the "valid" state entirely.
- No backend endpoint exists for password verification or invitation response. Two new endpoints are needed.

---

## Codebase Analysis

### Frontend — What Exists

**`frontend/src/pages/InvitationGatePage.jsx`**
- Currently has three states: `loading`, `valid`, `expired`.
- `loading`: Shows `LoadingSpinner` component.
- `valid`: Placeholder text ("Password gate coming in Phase 3"). This entire branch gets replaced.
- `expired`: Shows `HeartCrack` icon, expired heading/body, and link to home page.
- Uses `useParams()` to extract `code` from `/i/:code` route.
- Calls `GET /api/invitations/by-code/{code}` to check if invitation exists. Currently only checks existence — does not fetch title, photo URL, or any content.

**`frontend/src/App.jsx`**
- Route `/i/:code` maps to `InvitationGatePage`. No new routes needed — all Phase 3 screens live within this single page component as internal state transitions.

**Established patterns for reuse:**
- `VITE_API_URL` for API calls (used in every page).
- `useTranslation()` hook for i18n (every user-facing string).
- `Toast` component for error notifications.
- `LoadingSpinner` for async loading states.
- Tailwind CSS v4 utility classes with theme tokens defined in `index.css`.

**`frontend/src/index.css` theme tokens:**
- `--color-cream`, `--color-accent`, `--color-destructive`, `--color-text-primary`, `--color-text-secondary`, `--color-border`, `--font-sans`.
- Missing: sparkle gold (`#FBBF24`) — needs to be added to theme or used as inline/arbitrary values.

**i18n files (`en.json`, `zh-TW.json`):**
- Currently have `app`, `landing`, `dashboard`, `create`, `invitation`, `errors` namespaces.
- Phase 3 adds a `recipient` namespace with ~25 new keys (per UI-SPEC Copywriting Contract).

**Motion (Framer Motion) v12.38.0:**
- Listed in `package.json` dependencies but not imported anywhere in the codebase. No existing animation patterns to follow.
- Import path is `from "motion/react"` (Motion v12 uses this path, not `from "framer-motion"`).

### Backend — What Exists

**`backend/app/routers/invitations.py`**
- `POST /api/invitations` — Create invitation (authenticated).
- `GET /api/invitations` — List user's invitations (authenticated).
- `DELETE /api/invitations/{id}` — Delete invitation (authenticated).
- `GET /api/invitations/by-code/{short_code}` — Public. Returns `InvitationPublicResponse` with only `short_code` and `requires_password: true`. Does NOT return title, photo, or any content. Does NOT accept password.

**`backend/app/routers/photos.py`**
- `GET /api/photos/{filename}` — Serves photo files. Validates filename against pattern `^[A-Za-z0-9]{7}\.webp$`. This endpoint is public (no auth). Phase 3 can use it directly to display invitation photos on the reveal page.

**`backend/app/models/invitation.py`**
- Fields: `id`, `user_id`, `short_code`, `title`, `password` (plaintext, String(8)), `photo_filename`, `created_at`, `expires_at`.
- Password stored as plaintext (design decision — "not a security feature, just a personal touch").

**`backend/app/models/` — No Notification model exists.**
- Phase 3 (RCPT-08) requires storing a notification when the recipient clicks Yes. A `Notification` model must be created.
- Notification schema from REQUIREMENTS.md: "[Name] said yes to your [title]" with optional 30-char message.

**`backend/app/core/security.py`**
- `get_current_user` dependency extracts JWT from Bearer header. The respond endpoint should NOT use this — recipients are unauthenticated.

**`backend/app/main.py`**
- CORS configured for `settings.FRONTEND_URL` only. New endpoints on the existing router will be covered.
- No background task scheduler (APScheduler) is set up yet — that is Phase 4 territory.

### Backend — What's Needed

Two new endpoints:

1. **Password verification + invitation data:**
   - `POST /api/invitations/by-code/{short_code}/verify`
   - Accepts `{ "password": "..." }`.
   - Returns invitation content (title, photo_url) on correct password.
   - Returns 401 on wrong password.
   - Public (no auth).

2. **Invitation response (Yes):**
   - `POST /api/invitations/by-code/{short_code}/respond`
   - Accepts `{ "name": "...", "message": "..." }` (both optional).
   - Deletes the invitation (data + photo file).
   - Creates a Notification record for the creator.
   - Public (no auth), but requires the invitation to exist.

New model:
- `Notification` — Fields: `id`, `user_id` (creator), `invitation_title` (snapshot), `recipient_name`, `recipient_message`, `is_read`, `created_at`.

New migration:
- Alembic migration for `notifications` table.

New schemas:
- `PasswordVerifyRequest` — `{ password: str }`
- `InvitationRevealResponse` — `{ short_code, title, photo_url }`
- `InvitationRespondRequest` — `{ name: str | None, message: str | None }`
- `InvitationRespondResponse` — `{ message: str }` (success confirmation)

---

## Technical Approaches

### 1. No Button Dodge Behavior

**Escape vector calculation:**
```
1. Get pointer position (clientX, clientY) on hover/touch.
2. Get button center position via getBoundingClientRect().
3. Compute direction vector: buttonCenter - pointerPosition.
4. Normalize the vector to unit length.
5. Multiply by stage-appropriate distance (60-260px range).
6. Add random angular offset (+/-30 degrees) using rotation matrix:
   newX = dx * cos(angle) - dy * sin(angle)
   newY = dx * sin(angle) + dy * cos(angle)
7. Clamp final position to viewport bounds with 16px padding.
```

**Implementation approach — position: absolute within a fixed container:**
- Wrap the entire invitation reveal page in a `div` with `position: relative` and `fixed inset-0`.
- The No button starts in normal flow within the button row.
- On first dodge, switch the No button to `position: absolute` using state.
- Track `x, y` coordinates in React state. Animate with Motion's `animate` prop.
- Use `useRef` for the button element to read its dimensions for bounds checking.

**Spring physics (from UI-SPEC stage table):**
- Stage 1 (Shy): stiffness 200, damping 20, distance 60-80px
- Stage 2 (Nervous): stiffness 350, damping 15, distance 100-140px
- Stage 3 (Frantic): stiffness 500, damping 12, distance 160-200px
- Stage 4 (Panicked): stiffness 700, damping 10, distance 200-260px
- Stage 5 (Desperate): stiffness 900, damping 8, random teleport within viewport

**State management:**
- `dodgeCount` (number) — drives stage transitions.
- `buttonPos` ({ x, y }) — absolute position after dodging.
- `isDodging` (boolean) — switches button from inline to absolute positioning.
- `stage` (derived from dodgeCount via thresholds: 0-2, 3-5, 6-9, 10-14, 15+).

**Motion API usage:**
```jsx
import { motion } from "motion/react";

<motion.button
  animate={{ x: buttonPos.x, y: buttonPos.y }}
  transition={{ type: "spring", stiffness, damping, mass: 1 }}
  onHoverStart={handleDodge}  // desktop
  onTouchStart={handleDodge}  // mobile
/>
```

**Key consideration — preventing button click on touch:**
- On mobile, `onTouchStart` fires before `onClick`. The dodge handler must call `e.preventDefault()` and `e.stopPropagation()` to prevent the touch from being interpreted as a click.
- However, `onTouchStart` on a Motion component is passed as a React event, not a gesture. Use the native `onTouchStart` prop directly.

### 2. Mobile Touch Handling

**Detection approach:**
```js
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
  || 'ontouchstart' in window;
```

**Mobile differences (per UI-SPEC):**
- Use `type: "tween"` with `duration: 0.15` instead of spring (spring feels sluggish on touch).
- Dodge triggers on `onTouchStart` (finger touches button area).
- The button should move instantly to prevent the finger from landing on the new position.

**Potential issue — ghost clicks:**
- After the button moves, the browser may fire a `click` event at the old position. This is harmless since nothing is there.
- But if the button moves under the finger's new position, an unintended click could occur. Mitigation: add a brief `pointerEvents: "none"` period (150ms) after each dodge.

### 3. Sparkle/Star Trail Effects

**Particle system approach:**
- Maintain a particles array in state: `[{ id, x, y, size, color, createdAt }]`.
- On each dodge (stage 2+), spawn N particles along the path between old and new button positions.
- Use `AnimatePresence` with unique keys for enter/exit animations.
- Particles auto-remove after 900ms via `setTimeout` updating the array.
- Cap at 40 particles max to prevent performance issues.

**Particle positioning along path:**
```js
for (let i = 0; i < spawnCount; i++) {
  const t = Math.random(); // position along path (0 to 1)
  const x = oldX + (newX - oldX) * t + (Math.random() - 0.5) * 40; // +/-20px offset
  const y = oldY + (newY - oldY) * t + (Math.random() - 0.5) * 40;
  particles.push({ id: nanoid(), x, y, size, color });
}
```

**Star shape via CSS clip-path:**
```css
clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%,
                   79% 91%, 50% 70%, 21% 91%, 32% 57%,
                   2% 35%, 39% 35%);
```
Alternatively, use a simple 4-pointed star (diamond rotated):
```css
clip-path: polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%,
                   50% 100%, 35% 65%, 0% 50%, 35% 35%);
```

**Performance consideration:**
- Each particle is a `motion.div` with its own animation. 40 particles with individual spring animations should be fine for modern browsers.
- Use `will-change: transform, opacity` on the particle container.
- Remove particles from state after animation completes (use `onAnimationComplete` callback or `setTimeout`).

### 4. Slide Transitions (Screen-to-Screen)

**AnimatePresence pattern:**
```jsx
import { AnimatePresence, motion } from "motion/react";

<AnimatePresence mode="wait">
  {screen === "password" && (
    <motion.div
      key="password"
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
    >
      {/* Password gate content */}
    </motion.div>
  )}
  {screen === "reveal" && (
    <motion.div key="reveal" ...>{/* Reveal content */}</motion.div>
  )}
  {screen === "message" && (
    <motion.div key="message" ...>{/* Message card */}</motion.div>
  )}
  {screen === "postcard" && (
    <motion.div key="postcard" ...>{/* Postcard */}</motion.div>
  )}
</AnimatePresence>
```

**State machine for screens:**
- `"loading"` -> `"password"` (or `"expired"`) -> `"reveal"` -> `"message"` -> `"postcard"`
- Each transition is one-directional (no going back).

**Reduced motion support:**
```js
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const transition = prefersReducedMotion
  ? { duration: 0 }
  : { duration: 0.4, ease: [0.32, 0.72, 0, 1] };
```

### 5. Postcard Animation (Message Card -> Postcard)

**Primary approach — fold animation:**
- The UI-SPEC defines a fold effect: `scaleY: 1 -> 0` with `transformOrigin: "bottom center"` and `perspective: 800px`.
- This creates a card-folding illusion. Duration 600ms.
- After fold completes (600ms), the postcard rises from below: `y: "100%" -> 0` with spring physics.

**Implementation:**
```jsx
// Message card exit
exit={{ scaleY: 0, opacity: 0 }}
style={{ transformOrigin: "bottom center", perspective: "800px" }}
transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}

// Postcard enter
initial={{ y: "100%", opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
```

**Feasibility assessment:** This is straightforward with Motion. The fold effect using `scaleY` with perspective is a standard CSS transform that Motion handles natively. No fallback needed.

**Postcard download (html2canvas):**
- `html2canvas` is a well-established library (40M+ downloads) that captures DOM elements as canvas images.
- Usage: `html2canvas(postcardRef.current).then(canvas => { ... })`.
- The captured canvas can be converted to a downloadable PNG via `canvas.toBlob()` and a temporary download link.
- Risk: `html2canvas` does not handle all CSS perfectly (e.g., some shadows, filters). The postcard design is simple (photo + text + divider) so it should render well.
- Size impact: ~40KB gzipped. Acceptable for a single-use feature.
- Decision: Include the download button. If rendering issues appear during implementation, it can be removed without affecting flow.

### 6. Password Verification (Backend)

**Endpoint design:**
```python
@router.post("/by-code/{short_code}/verify")
async def verify_password(
    short_code: str,
    body: PasswordVerifyRequest,  # { password: str }
    db: AsyncSession = Depends(get_db),
):
```

**Password comparison:**
- Password is stored in plaintext (by design). A simple `==` comparison is sufficient.
- The UI-SPEC says "No attempt limit." No rate limiting needed for v1.
- However, using `hmac.compare_digest()` (timing-safe comparison) is a no-cost best practice even for plaintext passwords, as it prevents timing side-channel leaks that could reveal password length/content.

**Response on success:**
- Return invitation data needed for the reveal page: `title`, `photo_url` (constructed from `photo_filename`).
- The frontend stores this data in component state and transitions to the reveal screen.

**Response on failure:**
- HTTP 401 with `{ "detail": "Incorrect password" }`.
- The frontend shows the shake animation + error text.

**Alternative considered — token-based access:**
- Could return a short-lived access token on successful password verification, then require it for subsequent requests (photo access, respond).
- Rejected: Over-engineering. The photo endpoint is already public. The respond endpoint just needs the `short_code`. No auth layer is needed for the recipient.

### 7. Invitation Response Flow (Backend)

**Endpoint design:**
```python
@router.post("/by-code/{short_code}/respond")
async def respond_to_invitation(
    short_code: str,
    body: InvitationRespondRequest,  # { name: str | None, message: str | None }
    db: AsyncSession = Depends(get_db),
):
```

**Flow:**
1. Look up invitation by `short_code` (must exist and not be expired).
2. Snapshot invitation data needed for notification: `title`, `user_id`.
3. Create `Notification` record with: `user_id` (creator), `invitation_title`, `recipient_name`, `recipient_message`, `is_read=False`.
4. Delete the invitation row from DB.
5. Delete the photo file from disk.
6. Commit transaction.
7. Return success response.

**Atomicity concern:**
- The notification creation and invitation deletion should be in the same DB transaction. Photo file deletion happens after commit (same pattern as existing `delete_invitation` endpoint).
- If photo deletion fails, it becomes an orphan file. Acceptable — Phase 4's cleanup job will handle orphan files.

**Notification model:**
```python
class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    invitation_title: Mapped[str] = mapped_column(String(255))
    recipient_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recipient_message: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

**Why create the Notification model in Phase 3 vs Phase 4:**
- RCPT-08 explicitly requires: "Clicking Yes deletes the invitation data and notifies the creator."
- The notification must be stored at respond-time because the invitation data (title) is deleted in the same operation.
- Phase 4 adds the UI for viewing notifications (NOTF-01, NOTF-02, NOTF-03), but the data must be captured in Phase 3.

---

## Dependencies & Risks

### New Dependencies

| Package | Purpose | Size Impact | Risk |
|---------|---------|-------------|------|
| `html2canvas` | Postcard image download | ~40KB gzip | Low — mature library, simple use case. Optional feature — can be dropped. |

No other new dependencies. `motion` is already installed. All other functionality is achievable with existing packages.

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| No button dodge feels frustrating rather than fun | Medium | Tune spring parameters carefully. Keep stage 1 gentle (200 stiffness). Ensure the Yes button remains stationary and visually prominent. Stage 5 desperate messages add humor. |
| Sparkle trail performance on low-end mobile | Low | Cap at 40 particles. Use simple CSS clip-path instead of SVG. Remove particles after 900ms. Disable trail on `prefers-reduced-motion`. |
| Mobile touch dodge — finger lands on moved button | Medium | Add 150ms `pointerEvents: "none"` cooldown after each dodge. Use fast tween (150ms) instead of spring on mobile. |
| `html2canvas` renders postcard incorrectly | Low | Test with the specific postcard layout during implementation. The design is simple (photo + text). If rendering fails, omit the download button — the postcard is still displayed. |
| Respond endpoint race condition — double-click sends two notifications | Low | Check invitation exists before creating notification. If already deleted (from a concurrent request), return 404. DB transaction ensures atomicity. |
| Invitation data lost if user refreshes between verify and respond | Medium | After password verification, the frontend holds invitation data in component state. If the user refreshes, they return to the password gate and must re-enter the password. This is acceptable — the flow is short. |
| Motion v12 import path differences | Low | Motion v12 uses `from "motion/react"` (not `from "framer-motion"`). Verify import path works with installed version. |

### Race condition on respond endpoint

When the recipient clicks Yes, the backend deletes the invitation and creates a notification. If the invitation is already deleted (e.g., creator deleted it, or TTL expired between password verify and Yes click), the respond endpoint should return a 404 or 410 (Gone). The frontend should handle this gracefully — show a "This invitation is no longer available" message rather than an error.

---

## Validation Architecture

### Password Gate (RCPT-01)

**Manual verification:**
1. Navigate to `/i/{valid-code}`. See loading spinner, then password gate with invitation title.
2. Enter wrong password. See input shake + red border + "Incorrect password" text.
3. Type again. Error clears on keystroke.
4. Enter correct password. Slide transition to reveal page.
5. Enter empty password. Submit button is disabled.

**Automated test approaches:**
- Backend: Test `POST /api/invitations/by-code/{code}/verify` with correct and incorrect passwords.
- Frontend: Component test that the password gate renders, handles error state, and transitions on success.

### No Button Dodge (RCPT-02, RCPT-03, RCPT-04, RCPT-05)

**Manual verification:**
1. Hover over No button. It drifts away gently (stage 1).
2. Repeat 3+ times. Movement gets faster, sparkles appear (stage 2).
3. Continue to stage 5. Button text changes, wobble appears, teleport-like movement.
4. Dodge counter appears after first attempt. Counter increments and pulses.
5. Counter label text changes at stage boundaries.
6. On mobile: touch the No button. It moves immediately (tween, not spring).

**Automated test approaches:**
- Unit test for dodge vector calculation (given pointer position and button position, verify escape direction, distance range, and bounds clamping).
- Unit test for stage determination from dodge count.
- Visual regression testing is impractical for spring animations — rely on manual QA.

### Yes Flow (RCPT-06, RCPT-07)

**Manual verification:**
1. Click Yes. Button scales down briefly.
2. Slide transition: reveal slides out right, message card slides in from left.
3. Message card shows name input, message input (30 char limit), character counter, send button.
4. Click "Skip message" — submits with empty fields.
5. Fill in name + message, click Send. Loading state appears.
6. Postcard animation plays. Final postcard screen shows.
7. If download button present: click it, verify PNG downloads.

**Automated test approaches:**
- Backend: Test `POST /api/invitations/by-code/{code}/respond` — verify notification created, invitation deleted, photo file removed.
- Frontend: Component test for message card form validation (30 char limit).

### Invitation Response Backend (RCPT-08)

**Manual verification:**
1. Create invitation as creator.
2. Open invitation link as recipient. Enter password. Click Yes. Send message.
3. Verify (via DB or future Phase 4 UI) that a notification was created with correct title, name, message.
4. Verify invitation row is deleted from DB.
5. Verify photo file is deleted from disk.
6. Navigate to the same invitation URL again. See expired/not-found page.

**Automated test approaches:**
- Integration test: Create invitation, call verify, call respond, assert notification exists, invitation deleted, photo file gone.
- Edge case: Call respond on already-deleted invitation — expect 404.
- Edge case: Call respond with 31-character message — expect 422 validation error.

---

## Recommendations

### Component Architecture

Split `InvitationGatePage.jsx` into sub-components rather than one monolithic file:

```
frontend/src/pages/InvitationGatePage.jsx     — Main controller (state machine, API calls)
frontend/src/components/recipient/
  PasswordGate.jsx      — Password input form
  InvitationReveal.jsx  — Title + photo + Yes/No buttons
  NoButton.jsx          — Dodge logic, sparkle system
  SparkleTrail.jsx      — Particle rendering
  DodgeCounter.jsx      — Counter badge + label
  MessageCard.jsx       — Name + message form
  PostcardKeepsake.jsx  — Final postcard display
```

This separation keeps each component focused and testable. The parent `InvitationGatePage` manages the screen state machine and API calls, passing data down as props.

### Backend Plan Split

Split into two plans:
1. **Backend plan:** Notification model + migration, verify endpoint, respond endpoint, new schemas.
2. **Frontend plan:** Password gate, reveal page, No button with dodge + sparkles, message card, postcard, i18n keys, slide transitions.

The frontend plan is large but all components depend on each other (the state machine connects all screens). Consider further splitting the frontend plan if needed:
- 2a: Password gate + reveal page (screens 1-2, basic flow)
- 2b: No button dodge + sparkles (the complex animation work)
- 2c: Message card + postcard + download (screens 3-4, response flow)

### Motion v12 Import Pattern

Motion v12 (the package name is `motion`, not `framer-motion`) uses this import:
```js
import { motion, AnimatePresence } from "motion/react";
```

All Motion examples in this research and the UI-SPEC should use this import path.

### html2canvas Integration

Add `html2canvas` as an optional dependency. If it proves problematic:
- It can be loaded lazily via dynamic import: `const html2canvas = (await import("html2canvas")).default;`
- The download button can be conditionally rendered based on whether the library loaded successfully.
- Total fallback: omit the button entirely. The postcard is still displayed as a visual keepsake.

### Reduced Motion Support

Implement `prefers-reduced-motion` checks at the top level of the invitation gate:
```js
const prefersReducedMotion = useReducedMotion(); // Motion hook
```
When true:
- All slide transitions use `duration: 0`.
- No button still dodges but with instant position change (no spring).
- No sparkle trail.
- No wobble animation.
- No fold animation — instant transition between screens.

Motion v12 provides a `useReducedMotion()` hook that reads the media query reactively.

### State Machine Design

The page has a clear linear flow that can be modeled as a simple state machine:

```
loading -> expired (if invitation not found)
loading -> password (if invitation exists)
password -> reveal (on correct password)
reveal -> message (on Yes click, after respond API call starts)
message -> postcard (on message submit success)
```

Store current screen in a single state variable. Store invitation data (title, photo_url, short_code) in a separate state variable populated after successful password verification.

---

## RESEARCH COMPLETE
