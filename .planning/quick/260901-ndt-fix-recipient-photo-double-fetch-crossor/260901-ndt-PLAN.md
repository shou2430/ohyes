---
phase: quick-260901-ndt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/recipient/InvitationReveal.jsx
autonomous: true
requirements: [UI-03]

must_haves:
  truths:
    - "The recipient page's visible photo <img> and the canvas keepsake preload's new Image() both request ${API_URL}${invitation.photo_url} with crossOrigin=\"anonymous\", so the browser satisfies both from one cache entry and fetches the photo exactly once per page load instead of twice."
    - "The recipient photo still renders correctly on a built-and-served production preview (:4173) — no broken-image icon, no CORS-tainted-canvas console error — matching the backend's CORSMiddleware allow_origins=[settings.FRONTEND_URL] response header."
    - "The keepsake postcard (InvitationGatePage's canvas-to-dataURL snapshot, taken before the respond API deletes the invitation) still renders with the photo intact after this change, proving the shared crossOrigin mode did not break the existing canvas caching flow it depends on."
  artifacts:
    - path: frontend/src/components/recipient/InvitationReveal.jsx
      provides: "<img crossOrigin=\"anonymous\" src={`${API_URL}${invitation.photo_url}`}> matching InvitationGatePage's canvas-preload CORS mode"
  key_links:
    - "InvitationReveal's <img src> and InvitationGatePage's new Image() canvas-preload src both resolve to the identical URL ${API_URL}${invitation.photo_url}; matching crossOrigin attributes on both is what collapses two separate browser cache entries into one, eliminating the duplicate 143 KB download."
---

<objective>
Fix a recipient-page load-performance regression (UI-03): the reveal photo is downloaded TWICE
because of a crossOrigin cache-mode mismatch between two requests for the same URL.
`InvitationGatePage.jsx`'s canvas keepsake preload (`new Image()`) sets `img.crossOrigin =
"anonymous"` so it can later snapshot the photo into a data URL before the respond API deletes the
invitation. `InvitationReveal.jsx`'s visible `<img>` does NOT set `crossOrigin`, so the browser
keys the two fetches as separate cache entries and downloads the same 143 KB photo twice — both
requests also carry `fetchPriority="high"` (added in Phase 5 Plan 03), doubling the highest-priority
download on the exact path Phase 5's `<3s` target is measured against.

The fix: add `crossOrigin="anonymous"` to the visible `<img>` in `InvitationReveal.jsx` so both
requests share one cache key and the browser fetches the photo once. This is a ONE-LINE attribute
addition to a SINGLE file — no other file, and no backend, changes.

Purpose: Undo the accidental doubling of the recipient's single most expensive network request,
directly serving Phase 5 / UI-03's "loads in under 3 seconds on a throttled mobile connection"
success criterion that Phase 5 Plan 03 was written to satisfy.

Output: `frontend/src/components/recipient/InvitationReveal.jsx` with `crossOrigin="anonymous"`
added to its photo `<img>`. No new files, no dependency changes, no backend changes.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

# The file to change
@frontend/src/components/recipient/InvitationReveal.jsx

# Reference ONLY — do not modify. This is the file whose canvas preload already sets
# crossOrigin="anonymous"; InvitationReveal must match it, not the other way around.
@frontend/src/pages/InvitationGatePage.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add crossOrigin="anonymous" to the recipient photo &lt;img&gt; to collapse the duplicate fetch</name>
  <files>frontend/src/components/recipient/InvitationReveal.jsx</files>
  <read_first>
frontend/src/components/recipient/InvitationReveal.jsx (lines ~45-55): the visible photo `<img
src={`${API_URL}${invitation.photo_url}`} alt={invitation.title} fetchPriority="high"
decoding="async" ... onLoad={...} onError={...} />` — currently has no `crossOrigin` attribute.
frontend/src/pages/InvitationGatePage.jsx (lines ~24-47): the canvas keepsake preload `useEffect`
builds `const img = new Image()`, sets `img.crossOrigin = "anonymous"` BEFORE `img.src =
`${API_URL}${invitation.photo_url}``, then draws it to a canvas and calls `toDataURL` to cache the
photo before the respond API deletes the invitation. This file is the reference for the CORS mode
InvitationReveal must match — read it, do not edit it.
  </read_first>
  <action>
Add the `crossOrigin="anonymous"` attribute to the `<img>` element in InvitationReveal.jsx (the one
whose `src` is `` `${API_URL}${invitation.photo_url}` ``), placed alongside the existing
`fetchPriority="high"` and `decoding="async"` attributes. This makes both requests for the same
photo URL — InvitationReveal's visible `<img>` and InvitationGatePage's canvas-preload `new
Image()` — use the identical CORS mode, so the browser's HTTP cache treats them as the SAME
resource and fetches it once instead of twice.

Do NOT touch `InvitationGatePage.jsx`, the backend, or any other file — the only load-bearing
change is this one attribute on this one `<img>`. Do not alter the existing `onLoad`/`onError`
handlers, the skeleton/fade-in logic, or any Tailwind classes on the photo box.

This is safe without a backend change: `/api/photos` is served through FastAPI
`CORSMiddleware(allow_origins=[settings.FRONTEND_URL])`, so the photo response already carries
`Access-Control-Allow-Origin` for the configured frontend origin — a `crossOrigin="anonymous"`
`<img>` renders correctly against that origin in production and in the built preview server. In
local dev (port 5173), Vite's proxy makes the request same-origin, so `crossOrigin` is a no-op
there — nothing to break.
  </action>
  <verify>
    <automated>cd frontend && npm run build && npm run lint</automated>
    <automated>cd frontend && grep -Eq 'crossOrigin="anonymous"' src/components/recipient/InvitationReveal.jsx</automated>
    <automated>cd frontend && grep -Eq 'crossOrigin = "anonymous"' src/pages/InvitationGatePage.jsx</automated>
    <human-check>Build and serve the production bundle to measure real network behavior (dev's Vite proxy makes both requests same-origin regardless, so it cannot reproduce the bug): `cd frontend && npm run build && npm run preview` (serves on :4173, with VITE_API_URL baked at build time). Open a live recipient link `/i/:code` in Chrome with DevTools -> Network open, filtered to Img/media. Enter the password to reach the reveal screen. Confirm the photo URL (`${API_URL}${invitation.photo_url}`) appears as EXACTLY ONE request (~143 KB transferred), not two. Confirm the photo renders visibly (no broken-image icon, no CORS/tainted-canvas error in the Console). Then click Yes, send a short message, and confirm the keepsake postcard screen still shows the photo (proving InvitationGatePage's canvas-to-dataURL preload still works unchanged).</human-check>
  </verify>
  <acceptance_criteria>
    - `frontend/src/components/recipient/InvitationReveal.jsx` contains `crossOrigin="anonymous"` on the photo `<img>` element.
    - `frontend/src/pages/InvitationGatePage.jsx` is unchanged — still contains `crossOrigin = "anonymous"` on its `new Image()` preload (regression guard: this plan must not touch that file).
    - `npm run build` and `npm run lint` pass with no new errors or warnings.
    - Manual check on the built preview (:4173): the photo URL shows as a single Network request, the photo renders without error, and the keepsake postcard still shows the photo after completing the Yes flow.
  </acceptance_criteria>
  <done>InvitationReveal.jsx's photo `<img>` and InvitationGatePage.jsx's canvas preload `new Image()` both use crossOrigin="anonymous" for the same photo URL, collapsing the duplicate 143 KB download into a single fetch; the photo still renders and the keepsake postcard flow is unaffected.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none new) | This is a client-side HTTP-cache-key correctness fix on an already-authorized, already-fetched same-resource request. No new endpoint, no new input, no auth/data-flow change — the recipient still reaches the photo through the same password-gated flow. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260901-ndt-01 | Information Disclosure | Recipient photo `<img crossOrigin="anonymous">` | low | accept | `crossOrigin="anonymous"` only changes how the browser tags the request for CORS/cache purposes; it does not expose any new data. The backend's existing `CORSMiddleware(allow_origins=[settings.FRONTEND_URL])` already scopes the response to the configured frontend origin, so no cross-origin data leak is introduced — the recipient was already authorized to view this exact photo via the same URL. |

No package installs in this plan -> no supply-chain (T-260901-ndt-SC) surface introduced.
No high-severity threats -> no blocking security checkpoint required.
</threat_model>

<verification>
- `cd frontend && npm run build && npm run lint` — both pass, no new errors/warnings.
- `grep -Eq 'crossOrigin="anonymous"' src/components/recipient/InvitationReveal.jsx` — the attribute is present on the reveal photo.
- `grep -Eq 'crossOrigin = "anonymous"' src/pages/InvitationGatePage.jsx` — confirms the sibling file is untouched (regression guard).
- Manual (documented, not a blocking checkpoint — this is a well-diagnosed, low-risk one-line fix): built preview on :4173 shows exactly one Network request for the recipient photo, the photo renders without error, and the keepsake postcard still works after the Yes flow.
</verification>

<success_criteria>
- The recipient page fetches its photo exactly once per page load (verified via DevTools Network tab on the production preview), down from two duplicate 143 KB requests.
- No visual regression: the photo renders, the skeleton/fade-in behavior from Phase 5 Plan 03 is unchanged, and the keepsake postcard still includes the photo.
- No backend, InvitationGatePage.jsx, or dependency changes.
</success_criteria>

<output>
Create `.planning/quick/260901-ndt-fix-recipient-photo-double-fetch-crossor/260901-ndt-SUMMARY.md` when done.
</output>
