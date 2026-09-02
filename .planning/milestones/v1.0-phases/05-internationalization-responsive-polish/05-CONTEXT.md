# Phase 5: Internationalization & Responsive Polish - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship bilingual UI (Traditional Chinese default + English toggle, switched without page reload), make every page usable on mobile (375px+) via a responsive audit-and-fix pass, and meet a `<3s` recipient-page load target on a throttled mobile connection.

**Requirements (locked by ROADMAP):** UI-01 (mobile-first responsive), UI-02 (bilingual zh-TW default + English toggle), UI-03 (<3s mobile load).

**In scope:** language toggle UI + persistence, `<html lang>` correctness, zh-TW coverage/quality audit, 375px responsive fixes across all pages, tap-target sizing, recipient-page load optimizations (image placeholder + route code-split).
**Out of scope (own phase / already done):** new features, backend photo re-compression (already WebP), Storage-Bucket migration (INFR-V2-01), any change to the escalating "No" button behavior.
</domain>

<decisions>
## Implementation Decisions

### Bilingual Toggle & Persistence (UI-02)
- **D-01:** Language choice is persisted in `localStorage` and reused on return visits. First-ever visit always defaults to `zh-TW` — **no browser-language detection** (keeps ROADMAP's "defaults to Traditional Chinese" literally true). Switching uses react-i18next `changeLanguage` — no page reload. — **Reversibility:** reversible (client-only localStorage key).
- **D-02:** The language toggle sits in a **consistent top-right header position on every creator-facing page** (Landing, Dashboard, Create). Dashboard already has a top bar (heart/bell) to place it beside. No floating global widget. — reversible.
- **D-03:** `index.html` currently hardcodes `<html lang="en">`. It must reflect the active language — default `zh-TW`, updated on toggle. — reversible.

### Recipient Page Language (UI-02)
- **D-04:** The recipient flow (password gate + reveal) shows **no language toggle** — kept deliberately minimal (it is the emotional peak). Its UI chrome follows the persisted/default language (`zh-TW`). The creator-authored title/message content is fixed text and is never translated. — reversible.

### Responsive Polish (UI-01)
- **D-05:** Scope is a **375px audit-and-fix pass, no structural re-layout.** Go page by page at 375px, fix overflow / wrapping / tap targets by editing Tailwind classes; do not restructure layouts. Priority: close the gap on recipient components that currently carry **zero breakpoints** (NoButton, PasswordGate, PostcardKeepsake, DodgeCounter, InvitationReveal). Build on the existing 34 `sm:/md:/lg:` usages. — reversible.
- **D-06:** Minimum tap-target size is **44×44px (iOS HIG)**, applied to Yes/general buttons and links. The escalating "No" button dodges the cursor and is exempt. — reversible.

### Load Performance (UI-03)
- **D-07:** Apply two optimizations: **(a)** recipient photo lazy-load + skeleton/blur placeholder with fade-in — polish the existing `photoLoaded`/`onLoad` (InvitationReveal) and `new Image()` preload (InvitationGatePage); reserve a fixed aspect-ratio box to kill layout shift (CLS). **(b)** **Route code-split** via `React.lazy` + `Suspense` (fallback reuses `LoadingSpinner`) so the recipient does not download Dashboard/Create/AuthCallback JS. — reversible.
- **D-08:** Do **not** defer/lazy-load Motion — the recipient's "No" button dodge uses it immediately, so deferring it does not help the recipient. — reversible.
- **D-09:** Photo compression is **already done** (backend `photo.py`: WebP + max 1200px + quality 85) — write no new code. Recorded as an **acceptance-check item**: in UAT, confirm the served recipient photo is `.webp` and ~100–200KB.
- **D-10:** `<3s` acceptance = under **Chrome DevTools Fast 3G** (~1.6 Mbps / ~150ms RTT), the recipient page shows the personalized page (LCP) **and** is interactive (Yes/No clickable) within 3 seconds — full-byte load is NOT required. Measured **manually with DevTools** in UAT; Lighthouse not required. — reversible.

### Claude's Discretion
- Language-toggle **visual style**: recommend a text toggle (e.g. `繁 / EN` or `中文 / English`), not flags (flags are ambiguous for language). Exact icon/spacing is a UI detail.
- Code-split **granularity** (per-route) and the `Suspense` fallback presentation.
- Skeleton placeholder style (plain skeleton vs blurred low-res).
- Whether the toggle is a two-state switch or a small dropdown (only two languages, so a switch is likely cleaner).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/ROADMAP.md` § Phase 5 — goal + 4 success criteria (zh-TW default, English toggle no-reload, 375px usable, <3s mobile).
- `.planning/REQUIREMENTS.md` — UI-01, UI-02, UI-03 rows.
- `CLAUDE.md` § Frontend — locked stack: react-i18next + i18next, Tailwind CSS v4, Motion (Framer Motion). No new libraries needed for this phase.

### Key implementation files (measured this session)
- `frontend/src/i18n/index.js` — i18next init; `lng: "zh-TW"`, `fallbackLng: "en"`. No LanguageDetector today (D-01 keeps it that way).
- `frontend/src/i18n/en.json`, `frontend/src/i18n/zh-TW.json` — 8 namespaces each (app, landing, dashboard, create, invitation, recipient, errors, notifications); audit for completeness/quality.
- `frontend/index.html` — `<html lang="en">` to fix (D-03).
- `frontend/src/App.jsx` (routes) — code-split target (D-07b).
- `frontend/src/components/recipient/*` — zero-breakpoint components to fix (D-05); InvitationReveal has `photoLoaded`/`onLoad`; PostcardKeepsake already dynamic-imports html2canvas.
- `frontend/src/pages/InvitationGatePage.jsx` — `new Image()` photo preload (D-07a).
- `backend/app/utils/photo.py` — WebP + 1200px + q85 (D-09; no change).

No external ADRs/specs beyond the above.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LoadingSpinner` component — ready-made `Suspense` fallback for route code-split (D-07b).
- Existing dynamic import of `html2canvas` in `PostcardKeepsake.jsx` — proves the Vite chunking path works; a precedent to follow for `React.lazy` routes.
- react-i18next `t()` already wired in 15 components — the toggle only needs to call `i18n.changeLanguage(...)`; strings are mostly externalized.

### Established Patterns
- Tailwind utility classes with `sm:/md:/lg:` breakpoints already used in 7 files (34 occurrences) — the responsive fix continues this pattern, no new tooling.
- Photo served as WebP from `backend/app/routers/photos.py` (`image/webp`), filename `{7 alnum}.webp`.

### Integration Points
- Toggle → `i18n.changeLanguage` + write `localStorage` + update `document.documentElement.lang` (D-01/D-03).
- Route wrapping in `App.jsx` → `React.lazy` + `Suspense` (D-07b).
- Recipient `<img>` in `InvitationReveal.jsx` → placeholder + fade using existing `photoLoaded` state (D-07a).

### Measured baseline (this session)
- Bundle: main `index-*.js` **463 kB / 148 kB gzip** loaded by every visitor incl. recipient; `html2canvas` 202 kB / 48 kB gzip already split; CSS 22.7 kB / 5.1 kB gzip. Code-split (D-07b) targets the 148 kB gzip main bundle for recipient.
</code_context>

<specifics>
## Specific Ideas

- `<3s`: framed as Fast 3G + "see personalized page (LCP) + interactive within 3s", not full-byte load (D-10).
- Language toggle: text-based (`繁 / EN`-style), not flags.
- Persistence without browser detection so the app literally "defaults to Traditional Chinese" (D-01).
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (no new capabilities raised).
</deferred>

---

*Phase: 5-Internationalization & Responsive Polish*
*Context gathered: 2026-08-18*
