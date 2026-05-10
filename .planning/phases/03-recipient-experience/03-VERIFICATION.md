---
status: passed
phase: "03"
verified_at: "2026-05-10T03:45:00Z"
must_haves_verified: 14/14
human_verification:
  - Slide transition visually slides correct direction on password -> reveal -> message -> postcard screens
  - No button dodge feels organic on desktop (spring physics) and mobile (tween)
  - Dodge counter badge pulse is perceptible on each increment
  - Postcard fold (scaleY) is visible and smooth on message -> postcard transition
  - prefers-reduced-motion OS setting disables all animations
  - Sparkle particles appear as 4-pointed gold/white stars during dodge (stage 2+)
  - Wrong password shake animation is perceptible (x: [0, -8, 8, -6, 6, -3, 3, 0])
  - Stage 5 No button text cycles through Wait.../Please??/I give up/Fine...
  - Postcard html2canvas download saves correct image as ohyes-postcard.png
---

# Verification: Phase 03 — Recipient Experience

## Must-Have Verification

| # | Must-Have | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Notification model captures `invitation_title` as snapshot | PASS | `notification.py` line 16: `invitation_title: Mapped[str] = mapped_column(String(255))`. `respond` endpoint sets `invitation_title=invitation.title` before deleting invitation. |
| 2 | Password comparison is timing-safe (`hmac.compare_digest`) | PASS | `routers/invitations.py` line 239: `if not hmac.compare_digest(invitation.password, body.password)` |
| 3 | Respond endpoint is public (no auth dependency) | PASS | `respond_to_invitation` function signature has no `Depends(get_current_user)` — only `db: AsyncSession = Depends(get_db)` |
| 4 | Verify endpoint returns `photo_url` as `/api/photos/{filename}` | PASS | `routers/invitations.py` line 242: `photo_url = f"/api/photos/{invitation.photo_filename}"` |
| 5 | Message field max 30 chars at schema level | PASS | `schemas/invitation.py` line 45: `message: str | None = Field(None, max_length=30)`. Frontend `MessageCard.jsx` also enforces `maxLength={30}`. |
| 6 | Respond endpoint deletes photo after DB commit (not before) | PASS | `routers/invitations.py` lines 278-285: `await db.commit()` at line 281 precedes `os.remove(photo_path)` at line 285 |
| 7 | All Motion imports use `"motion/react"` | PASS | All 5 files checked: `PasswordGate.jsx`, `NoButton.jsx`, `SparkleTrail.jsx`, `DodgeCounter.jsx`, `InvitationReveal.jsx`, `InvitationGatePage.jsx` all import from `"motion/react"`. No `"framer-motion"` imports found. |
| 8 | 5 escalation stages with correct spring parameters | PASS | `NoButton.jsx` STAGES array: Stage 1 stiffness 200 damping 20 dist 60-80, Stage 2 stiffness 350 damping 15 dist 100-140, Stage 3 stiffness 500 damping 12 dist 160-200, Stage 4 stiffness 700 damping 10 dist 200-260, Stage 5 stiffness 900 damping 8 random teleport. |
| 9 | Sparkle colors 60% gold (#FBBF24), 40% white (#FFFFFF) | PASS | `SparkleTrail.jsx` line 26: `const color = Math.random() < 0.6 ? "#FBBF24" : "#FFFFFF"` |
| 10 | Slide transitions with ease `[0.32, 0.72, 0, 1]` | PASS | `InvitationGatePage.jsx` line 42: `{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }`. Message exit also uses `[0.32, 0.72, 0, 1]` at line 151. |
| 11 | Postcard fold uses `scaleY` with `transformOrigin: "bottom center"` | PASS | `InvitationGatePage.jsx` lines 140-147: message screen exit `{ scaleY: 0, opacity: 0 }` with `style={{ transformOrigin: "bottom center", perspective: "800px" }}` |
| 12 | `useReducedMotion` support | PASS | `InvitationGatePage.jsx` line 17: `const prefersReducedMotion = useReducedMotion()`. All transitions branch to `duration: 0` when true. Slide initial/animate/exit also simplified when true. |
| 13 | Password shake animation `x: [0, -8, 8, -6, 6, -3, 3, 0]` | PASS | `PasswordGate.jsx` lines 60-61: `animate={error ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}` |
| 14 | All user-facing text uses i18n keys | PASS | All components use `useTranslation()` with `t("recipient.*")` keys. Both `en.json` and `zh-TW.json` contain 27 recipient keys. No hardcoded user-facing strings found. |

## Requirements Traceability

| Requirement | Description | Implementation | Status |
|-------------|-------------|----------------|--------|
| RCPT-01 | Recipient enters password to unlock | `PasswordGate.jsx` calls `/by-code/{code}/verify` with `hmac.compare_digest` on backend | COMPLETE |
| RCPT-02 | Page displays title, photo, Yes button, No button | `InvitationReveal.jsx` renders all four elements after password gate passes `onVerified` | COMPLETE |
| RCPT-03 | No button dodges cursor/finger (desktop + mobile) | `NoButton.jsx` with 5-stage spring mechanics, `onHoverStart` for desktop, `onTouchStart` for mobile, `pointer: coarse` detection | COMPLETE |
| RCPT-04 | No button leaves trail effects (sparkles/hearts) | `SparkleTrail.jsx` with 4-pointed star particles, `spawnSparkles` helper, spawns from stage 2 (Nervous) onwards | COMPLETE |
| RCPT-05 | Dodge attempt counter | `DodgeCounter.jsx` shows badge from count=1, increments with pulse animation, label changes at 5 stage boundaries | COMPLETE |
| RCPT-06 | Clicking Yes triggers celebration animation | Implemented as slide transition (no confetti/hearts — decision D-04 in CONTEXT.md explicitly rejected confetti). `InvitationGatePage.jsx` slides to message screen on Yes click. | COMPLETE (design intent met per D-04) |
| RCPT-07 | Dialog for recipient name and 30-char message | `MessageCard.jsx` with optional name (maxLength=100) and message (maxLength=30) fields, character counter, send + skip options | COMPLETE |
| RCPT-08 | Yes click deletes invitation and notifies creator | `respond_to_invitation` endpoint creates `Notification` record, calls `db.delete(invitation)`, commits, then removes photo file | COMPLETE |

## Automated Checks

| Check | Result |
|-------|--------|
| `npx vite build` | PASS — built in 4.07s, 0 errors, 2205 modules transformed |
| Backend schema validation tests (422 checks) | PASS — 2/2 pass (`test_verify_empty_password_returns_422`, `test_respond_message_too_long_returns_422`) |
| DB-dependent tests | EXPECTED FAIL — no PostgreSQL available in CI environment. All 6 DB-dependent tests fail with `OSError: Connection refused (:5432)`. This is documented in 03-01-SUMMARY.md as expected behavior. |
| Alembic migration file | PASS — `a7c2e1f39b04_create_notifications_table.py` exists in `backend/alembic/versions/` |
| `en.json` recipient key count | PASS — 27 keys |
| `zh-TW.json` recipient key count | PASS — 27 keys |
| Both i18n files valid JSON | PASS — parsed by Node.js without errors |
| html2canvas in package.json | PASS — present in dependencies, dynamically imported in `PostcardKeepsake.jsx` |

## Human Verification Items

The following items require manual browser testing and cannot be verified statically:

1. **Slide transition direction** — Verify screens slide left-to-right (password→reveal→message) and postcard rises from bottom. Requires a running app with a real invitation.
2. **No button dodge feel** — Verify spring physics feel organic on desktop hover and that mobile tween (0.15s) feels responsive without lag.
3. **Wobble animation** — Stages 4 and 5 add `rotate: [0, deg, -deg, ...]` after landing. Verify this is visible and not jarring.
4. **Stage 5 desperate text** — Verify No button cycles through "Wait...", "Please??", "I give up", "Fine..." at dodge counts 15, 16, 17, 18.
5. **Dodge counter pulse** — Verify badge visually pulses `scale: [1, 1.2, 1]` on each increment and label changes at counts 1→2, 2→6, 6→10, 10→15.
6. **Sparkle particles** — Verify 4-pointed gold/white star particles appear trailing behind the No button starting at stage 2 (3rd dodge).
7. **Postcard fold animation** — Verify message card visibly folds (scaleY: 0) before postcard rises from bottom. Requires interaction.
8. **prefers-reduced-motion** — Set OS reduced motion preference, verify all animations are suppressed (instant transitions).
9. **Password shake** — Verify wrong password shakes the input field with visible horizontal oscillation.
10. **html2canvas download** — Verify "Save as image" button produces a correctly cropped PNG of the postcard (title + photo + stamp).
11. **Mobile touch dodge** — On a touch device, verify finger proximity triggers dodge before actual tap registers.

## Gaps

None identified. All 14 must-haves pass static code verification. RCPT-06 "celebration animation" is fulfilled by the slide transition — the design decision to exclude confetti/hearts was explicitly made in CONTEXT.md (D-04) and approved during the discussion phase. The postcard keepsake screen serves as the celebration moment.

Note: The `respond` endpoint correctly sequences photo deletion after `db.commit()`, matching the threat model mitigation for T-03-01-04 (race condition). The `Notification` row captures `invitation_title` as a snapshot, ensuring creator notification survives invitation deletion.
