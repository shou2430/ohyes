# Phase 2: Invitation Creation & Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 02-invitation-creation-management
**Areas discussed:** Creation form flow, Photo upload UX, Shareable URL format, Dashboard card design, Invitation limit behavior, Password field UX, Error states & edge cases

---

## Creation form flow

| Option | Description | Selected |
|--------|-------------|----------|
| Single page | All fields on one page. Simple for 3 fields. | |
| Multi-step wizard | Step-by-step: Title > Photo > Password > Review. | |
| Modal/drawer overlay | Form as overlay on dashboard. | |

**User's choice:** Single page, but with preview before submit
**Notes:** User wanted ability to preview the complete invitation before submitting.

### Preview approach

| Option | Description | Selected |
|--------|-------------|----------|
| Inline preview | Live preview section that updates as fields are filled. | ✓ |
| Preview step before submit | Click 'Preview' to see full mock, then confirm. | |
| You decide | Claude picks. | |

**User's choice:** Inline preview

### Post-creation destination

| Option | Description | Selected |
|--------|-------------|----------|
| Success modal with share link | Modal with shareable URL and copy button. | ✓ |
| Redirect to dashboard | Go to dashboard with toast notification. | |
| Dedicated share page | Full page with link, QR code, social share. | |

**User's choice:** Success modal with share link

### Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Separate /create page | Dedicated page, URL bookmarkable, back button works. | ✓ |
| Expandable section on dashboard | Form inline on dashboard. | |
| You decide | Claude picks. | |

**User's choice:** Separate /create page

---

## Photo upload UX

| Option | Description | Selected |
|--------|-------------|----------|
| Click to upload with preview | Click placeholder to open file picker, shows preview. | ✓ |
| Drag-and-drop + click | Drag-and-drop zone, also clickable. | |
| You decide | Claude picks. | |

**User's choice:** Click to upload with preview

### Crop behavior

| Option | Description | Selected |
|--------|-------------|----------|
| No crop — upload as-is | Backend resizes to 1200px, converts to WebP. | ✓ |
| Simple aspect ratio crop | Crop overlay locked to specific ratio. | |
| You decide | Claude decides. | |

**User's choice:** No crop — upload as-is

### File size limit

| Option | Description | Selected |
|--------|-------------|----------|
| 5 MB max | Covers most phone photos. Backend resizes to ~100-200KB. | ✓ |
| 10 MB max | More permissive, handles high-res. | |
| You decide | Claude picks. | |

**User's choice:** 5 MB max
**Notes:** User asked about mobile browser upload compatibility. Confirmed that `<input type="file" accept="image/*">` works correctly on mobile browsers (opens camera roll/file picker) — standard browser behavior, no special handling needed.

---

## Shareable URL format

| Option | Description | Selected |
|--------|-------------|----------|
| Short code: /i/Xk9mP | 6-8 char alphanumeric, clean for sharing. | ✓ |
| UUID: /invite/abc123-... | Standard UUID, longer but collision-proof. | |
| You decide | Claude picks. | |

**User's choice:** Short code: /i/Xk9mP

### Link routing

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend SPA route | Link goes to frontend /i/:code, shows password gate. | ✓ |
| Backend redirect | Backend redirects to frontend. Enables Open Graph. | |
| You decide | Claude picks. | |

**User's choice:** Frontend SPA route
**Notes:** User asked what happens if creator closes browser without copying the link. Confirmed the link is always re-accessible from the dashboard card's copy button.

---

## Dashboard card design

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked cards | Full-width, vertically stacked. Shows info + actions. | ✓ |
| Side-by-side cards | Two cards side-by-side on desktop, stacked on mobile. | |
| You decide | Claude picks. | |

**User's choice:** Stacked cards

### Card content (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Photo thumbnail | Small preview of uploaded photo. | |
| Title text | Custom invitation title. | ✓ |
| Created date + expiry countdown | When created and days remaining. | ✓ |
| Password hint | Show password (masked or visible). | ✓ |

**User's choice:** Title text, Created date + expiry countdown, Password hint — no photo thumbnail
**Notes:** User was concerned that without cropping, photo thumbnails might look awkward at small size. Decided to skip thumbnails for v1.

### Link on card

| Option | Description | Selected |
|--------|-------------|----------|
| Copy button only | Just a 'Copy link' button, no URL text displayed. | ✓ |
| Truncated URL + copy button | Display URL (truncated) and copy button. | |
| Full URL | Display full URL text. | |

**User's choice:** Copy button only

### Delete confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Simple confirm dialog | Browser native confirm dialog. | ✓ |
| Custom modal confirmation | Styled modal with title + buttons. | |
| You decide | Claude picks. | |

**User's choice:** Simple confirm dialog

---

## Invitation limit behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Disable Create button + message | Grayed out with limit message. | ✓ |
| Hide Create button entirely | Remove button at limit. | |
| Allow click but show error | Button active, error on click at limit. | |

**User's choice:** Disable Create button + message

---

## Password field UX

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text input with show/hide toggle | Shows characters by default. Toggle to hide. Counter shows chars. | ✓ |
| Masked by default | Standard password field with eye icon to reveal. | |
| You decide | Claude picks. | |

**User's choice:** Plain text input with show/hide toggle

---

## Error states & edge cases

### Dead invitation link

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly 'gone' page | Styled page with message and link to landing. | ✓ |
| Generic 404 | Standard 'page not found'. | |
| You decide | Claude picks. | |

**User's choice:** Friendly 'gone' page

### Error display

| Option | Description | Selected |
|--------|-------------|----------|
| Inline validation + toast for server errors | Field-level inline + toast at top. | ✓ |
| You decide | Claude handles. | |
| Modal for all errors | All errors in modal dialog. | |

**User's choice:** Inline validation + toast for server errors

---

## Claude's Discretion

- Database schema design (columns, indexes, short code generation)
- API endpoint design (routes, request/response shapes)
- Photo storage directory structure
- Visual styling details (consistent with Phase 1 playful tone)
- Toast notification implementation

## Deferred Ideas

None — discussion stayed within phase scope
