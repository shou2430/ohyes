# Phase 3: Recipient Experience - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the core product moment — recipient unlocks a personalized page via password, encounters the escaping No button with escalating dodge behavior and sparkle trail effects, and inevitably clicks Yes. After Yes, a slide transition leads to a message input card where the recipient enters their name and a 30-character message. Submission triggers a postcard animation and final postcard-style keepsake screen showing the invitation title and photo.

Requirements in scope: RCPT-01, RCPT-02, RCPT-03, RCPT-04, RCPT-05, RCPT-06, RCPT-07, RCPT-08

</domain>

<decisions>
## Implementation Decisions

### No Button Behavior
- **D-01:** Claude's Discretion on escalation stages — design the most fun dodge behavior using Motion's spring physics engine. Should include escalating intensity (gentle → frantic → extreme), visible dodge counter, and make it feel fun not frustrating.
- **D-02:** Trail effects use **sparkles/stars** (not hearts) — glittering star particles left behind as the button moves.
- **D-03:** Claude's Discretion on mobile touch handling — choose the best approach given mobile device touch constraints (touch-to-dodge vs proximity-based).

### Celebration / Transition
- **D-04:** No celebration animation (no confetti, no hearts rain). Instead, use a **slide transition** after clicking Yes: current page slides out to the right, message input card slides in from the left. Clean and elegant.

### Password Gate
- **D-05:** Claude's Discretion on password gate visual design — create an appropriate visual for the centered password entry page.
- **D-06:** Wrong password feedback: **input field shakes** (Motion spring animation) + red border + "密碼不正確" text. No attempt limit — unlimited retries.

### Yes → Message Flow
- **D-07:** After clicking Yes, a **slide-in card** appears (from left, matching D-04 transition) with: name field + 30-character message input + send button.
- **D-08:** After sending message, attempt a **postcard folding into envelope animation** (CSS/Motion). If too complex to implement well, fall back to a simple slide transition.
- **D-09:** Final screen shows a **postcard-style keepsake** — the invitation title + photo styled as a postcard. If feasible without excessive complexity, offer the postcard as a downloadable image (canvas-to-image). If too complex, show a styled text/photo layout as the ending experience. Claude's Discretion on implementation difficulty tradeoff.
- **D-10:** RCPT-08 requires clicking Yes to delete the invitation data and notify the creator. The backend needs a new endpoint for this (POST /api/invitations/respond or similar).

### Claude's Discretion
- No button escalation stage design (number of stages, physics parameters, final behavior)
- Mobile touch dodge trigger mechanism
- Password gate visual design
- Postcard animation complexity (envelope fold vs simple transition — based on implementation effort)
- Postcard download feasibility (canvas-to-image vs styled display only)
- Dodge counter visual placement and style

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `.planning/REQUIREMENTS.md` — RCPT-01 through RCPT-08 acceptance criteria
- `.planning/PROJECT.md` — Constraints (30-char message limit, password 4-8 chars)
- `CLAUDE.md` — Technology stack: Motion (Framer Motion) 12.x for animations, Tailwind CSS v4, react-i18next

### Prior Phase Context
- `.planning/phases/02-invitation-creation-management/02-CONTEXT.md` — D-09 (invitation gate at `/i/:code`), D-19 (expired page design)
- `.planning/phases/02-invitation-creation-management/02-UI-SPEC.md` — UI design patterns established

### Key Existing Code
- `frontend/src/pages/InvitationGatePage.jsx` — Current placeholder with password gate stub (Phase 3 replaces the "valid" state)
- `backend/app/routers/invitations.py` — GET `/api/invitations/by-code/{code}` endpoint (needs password verification addition)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/pages/InvitationGatePage.jsx` — Already has loading/expired states, Phase 3 replaces the "valid" state with password gate → invitation page → message flow
- `frontend/src/components/LoadingSpinner.jsx` — Loading indicator for API calls
- `frontend/src/components/Toast.jsx` — Error notifications
- `motion` package (v12.38.0) — Already installed, provides spring physics, gesture detection, layout animations
- `lucide-react` — Icon library already in use

### Established Patterns
- JWT Bearer token auth via `Authorization` header
- `VITE_API_URL` env var for backend API calls
- react-i18next `useTranslation()` for all user-facing text
- Tailwind CSS v4 utility classes
- React Router `useParams()` for URL parameters

### Integration Points
- `InvitationGatePage.jsx` — Main file to extend (password gate → reveal → Yes/No → message → postcard)
- Backend needs: password verification endpoint, Yes/respond endpoint (deletes invitation, stores notification)
- `frontend/src/i18n/en.json` and `zh-TW.json` — New i18n keys for all recipient-facing text

</code_context>

<specifics>
## Specific Ideas

- Slide transition after Yes: current view slides right, message card slides in from left (Motion animate with x offset)
- Postcard concept for final screen: invitation title + photo styled as a physical postcard
- If feasible, postcard can be downloaded as image (html2canvas or similar)
- Envelope fold animation after sending message — aspirational, fall back to slide if too complex
- Star/sparkle trail effects on No button dodge path
- No attempt limit on password — shake + red border feedback only

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-recipient-experience*
*Context gathered: 2026-05-09*
