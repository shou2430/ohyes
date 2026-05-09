# Phase 2: Invitation Creation & Management - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Let authenticated creators build personalized invitations with a custom title, photo upload, and 4-8 character password, manage them from the dashboard (view, copy link, delete), and share unique short-code URLs. Max 2 active invitations per user.

Requirements in scope: INV-01, INV-02, INV-03, INV-04, INV-05, INV-06

</domain>

<decisions>
## Implementation Decisions

### Creation Form Flow
- **D-01:** Single-page creation form at `/create` route (separate page, not modal or inline). All three fields (title, photo, password) on one page.
- **D-02:** Inline live preview section on the form that updates as the user fills in fields — shows what the recipient page will look like in real-time.
- **D-03:** After successful creation, a success modal appears showing the shareable URL with a copy button. User dismisses to return to dashboard where the new invitation now appears.

### Photo Upload
- **D-04:** Click-to-upload pattern (click a placeholder area to open file picker). Use `<input type="file" accept="image/*">` which also works correctly on mobile browsers (opens camera roll/file picker).
- **D-05:** No client-side cropping or adjustment. Upload as-is. Backend handles resize (max 1200px) and format conversion (WebP) via Pillow.
- **D-06:** 5 MB max file size. Clear error message shown if exceeded.
- **D-07:** Selected photo appears as preview in the inline preview section.

### Shareable URL
- **D-08:** Short alphanumeric code format: `/i/:code` (e.g., `/i/Xk9mP`). 6-8 characters. Clean and chat/social friendly.
- **D-09:** URL routes to frontend SPA route (not backend redirect). Frontend `/i/:code` page shows the password gate. Frontend calls backend API to validate.
- **D-10:** Link is always accessible from the dashboard card — if user closes the success modal without copying, they can copy it from the card anytime.

### Dashboard Cards
- **D-11:** Stacked full-width cards, vertically listed. Each card shows: title text, created date + expiry countdown (days remaining), and masked password (with option to reveal).
- **D-12:** No photo thumbnail on dashboard cards (since there's no cropping, preview images could look awkward at thumbnail size).
- **D-13:** Each card has a "Copy link" button (click to copy URL to clipboard, brief "Copied!" feedback). No URL text displayed — just the action button.
- **D-14:** Each card has a "Delete" button. Confirmation uses browser's native confirm dialog ("Delete this invitation? This cannot be undone.").

### Invitation Limit
- **D-15:** When user has 2 active invitations, the "Create" button is disabled (grayed out) with a message: "You've reached the limit of 2 active invitations. Delete one to create a new one."

### Password Field
- **D-16:** Plain text input by default (not masked — it's a personal touch, not a security feature). Show/hide toggle available. Character counter shows "N/8 characters". Any characters allowed. 4-8 character length enforced.

### Error Handling
- **D-17:** Field-level inline validation for form errors (e.g., "Password must be 4-8 characters", "Title is required").
- **D-18:** Server/network errors shown as toast notification at the top of the page.
- **D-19:** Expired or deleted invitation links show a friendly styled page: "This invitation has expired or been removed" with a link back to the landing page.

### Claude's Discretion
- Database schema design for invitations (columns, indexes, short code generation strategy)
- API endpoint design (routes, request/response shapes)
- Photo storage directory structure within PHOTO_STORAGE_PATH
- Specific visual styling of cards, form, and success modal (consistent with Phase 1 playful tone)
- Toast notification implementation approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `.planning/REQUIREMENTS.md` — INV-01 through INV-06 acceptance criteria
- `.planning/PROJECT.md` — Constraints (tech stack, photo storage, invitation limit, password rules, message limit)
- `CLAUDE.md` — Full technology stack decisions with rationale (Pillow for image processing, SQLAlchemy 2.0, Tailwind v4, etc.)

### Prior Phase Context
- `.planning/phases/01-foundation-authentication/01-CONTEXT.md` — Auth flow decisions (JWT Bearer token, localStorage, 24h TTL), project structure (monorepo), deployment config (Railway), visual tone (playful)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/context/AuthContext` — useAuth hook for current user and auth state
- `frontend/src/components/ProtectedRoute.jsx` — route guard for authenticated pages
- `frontend/src/components/LoadingSpinner.jsx` — loading indicator
- `frontend/src/pages/DashboardPage.jsx` — existing dashboard shell with top bar, empty state, and disabled Create button (ready to activate)
- `backend/app/models/base.py` — SQLAlchemy Base class for model inheritance
- `backend/app/models/user.py` — User model (id, google_id, email, display_name, avatar_url)
- `backend/app/core/config.py` — Settings with PHOTO_STORAGE_PATH already configured

### Established Patterns
- JWT Bearer token auth via `Authorization` header (FastAPI dependency)
- SQLAlchemy 2.0 async with asyncpg
- react-i18next for all user-facing text (useTranslation hook)
- Tailwind CSS v4 utility classes
- React Router for SPA routing (BrowserRouter)
- Lucide icons (LogOut already used in dashboard)

### Integration Points
- Dashboard's disabled Create button → activate and link to `/create` route
- App.jsx routes → add `/create` and `/i/:code` routes
- Backend routers → add invitation CRUD endpoints
- User model → add relationship to Invitation model
- Alembic → migration for invitations table

</code_context>

<specifics>
## Specific Ideas

- Mobile photo upload must work from browser (standard `accept="image/*"` input handles this)
- Password is visible by default on creation form because it's a personal touch, not security
- Dashboard cards intentionally omit photo thumbnails for v1 (no cropping means unpredictable aspect ratios at small size)
- Invitation link is always re-accessible from dashboard card's copy button (no link-loss scenario)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-invitation-creation-management*
*Context gathered: 2026-05-09*
