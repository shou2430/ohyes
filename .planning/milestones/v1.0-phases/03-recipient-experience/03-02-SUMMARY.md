---
plan: 03-02
status: complete
---

# Summary: 03-02 Frontend — Password Gate, Invitation Reveal, No Button Dodge, Message Card & Postcard

## What was built
Complete recipient experience as a multi-screen flow within InvitationGatePage:
- Password gate with shake error animation and title display
- Invitation reveal with photo, title, Yes/No buttons
- No button with 5-stage escalating dodge behavior (shy -> nervous -> frantic -> panicked -> desperate), sparkle trails, viewport clamping, mobile touch support, wobble animations, and stage 5 desperate text cycling
- Sparkle trail particle system with 4-pointed star shapes, 60/40 gold/white color distribution, AnimatePresence lifecycle, and 40-particle cap
- Dodge counter badge with scale entrance, pulse on increment, and label text changes at stage boundaries
- Message card with optional name/message inputs, 30-character limit with counter, send and skip options
- Postcard keepsake with photo, title, divider, stamp text, and html2canvas image download
- State machine page controller with AnimatePresence slide transitions, postcard fold animation, and prefers-reduced-motion support
- Backend InvitationPublicResponse updated to include title field

## Key files created/modified
- `frontend/src/components/recipient/PasswordGate.jsx` (created)
- `frontend/src/components/recipient/NoButton.jsx` (created)
- `frontend/src/components/recipient/SparkleTrail.jsx` (created)
- `frontend/src/components/recipient/DodgeCounter.jsx` (created)
- `frontend/src/components/recipient/InvitationReveal.jsx` (created)
- `frontend/src/components/recipient/MessageCard.jsx` (created)
- `frontend/src/components/recipient/PostcardKeepsake.jsx` (created)
- `frontend/src/pages/InvitationGatePage.jsx` (rewritten)
- `frontend/src/i18n/en.json` (27 recipient keys added)
- `frontend/src/i18n/zh-TW.json` (27 recipient keys added)
- `frontend/package.json` (html2canvas dependency added)
- `backend/app/schemas/invitation.py` (title field added to InvitationPublicResponse)
- `backend/app/routers/invitations.py` (title returned in by-code endpoint)

## Self-Check: PASSED
- All Motion imports use `from "motion/react"` (not `"framer-motion"`)
- No button implements 5 escalation stages with correct spring parameters
- Sparkle colors are 60% #FBBF24 gold, 40% #FFFFFF white
- Message input enforces maxLength={30} with character counter
- Slide transitions use ease [0.32, 0.72, 0, 1] and duration 0.4
- Postcard fold uses scaleY: 0 with transformOrigin: "bottom center" and perspective: "800px"
- Reduced motion support via useReducedMotion() disabling all animations
- Password gate shake animation uses x: [0, -8, 8, -6, 6, -3, 3, 0]
- All user-facing text uses i18n keys from the recipient namespace
- InvitationPublicResponse includes title for password gate display
- Both i18n files contain 27 recipient keys and parse as valid JSON
- `npx vite build` completes without errors
