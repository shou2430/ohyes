# Phase 05 — Internationalization & Responsive Polish — Plan Outline

**Mode:** standard · **Tracer-first:** true (UI-02 bilingual toggle is the one genuinely new user-facing capability)
**Requirements:** UI-01, UI-02, UI-03 (each mapped to exactly one plan below)

Fully serialized across three waves: every pair of plans collides on at least one shared
frontend file, so no two plans may run in the same wave. Overlaps are called out per row.

| Plan ID | Objective | Wave | Depends On | Requirements |
|---------|-----------|------|------------|--------------|
| 05-01 | **UI-02 tracer — bilingual language toggle, end-to-end.** LanguageToggle component (text style `繁 / EN`, D-discretion) proven on one page: toggle → i18next `changeLanguage` → `localStorage` persist (D-01, no browser detection) → `document.documentElement.lang` + `index.html` default `zh-TW` (D-03) → visible switch with NO reload; init reads localStorage else defaults zh-TW. Then place the toggle top-right on all creator pages (Landing, Dashboard, Create, D-02); recipient flow gets NO toggle and follows persisted/default lang (D-04). Audit en.json + zh-TW.json completeness/quality across all 8 namespaces — missing key falls back to `en`, never a raw key; zh-TW multi-byte renders correctly. Creator title/message content never translated (D-04). | 1 | none | UI-02 |
| 05-02 | **UI-01 responsive 375px audit-and-fix.** No structural re-layout — Tailwind class edits only (D-05). Close the gap on the five zero-breakpoint recipient components (NoButton, PasswordGate, PostcardKeepsake, DodgeCounter, InvitationReveal), then sweep creator pages (Landing, Dashboard, Create) + InvitationGatePage for overflow/wrapping at 375px. Enforce 44×44px tap targets on Yes/general buttons and links (D-06); the escaping No button is EXEMPT and its dodge behavior is unchanged. | 2 | 05-01 (shared page files: Landing/Dashboard/Create carry the D-02 toggle placed in 05-01 — edit after, not beside) | UI-01 |
| 05-03 | **UI-03 recipient-page load performance.** (a) Route code-split App.jsx via `React.lazy` + `Suspense` (fallback reuses `LoadingSpinner`) so the recipient never downloads Dashboard/Create/AuthCallback JS — targets the 148 kB gzip main bundle (D-07b); Motion is NOT deferred (D-08). (b) Recipient photo skeleton/blur placeholder + fade-in over a fixed aspect-ratio box to kill CLS, polishing existing `photoLoaded`/`onLoad` in InvitationReveal and `new Image()` preload in InvitationGatePage (D-07a). Acceptance-only: served photo is `.webp` ~100–200KB (D-09, no code); <3s = LCP + interactive under DevTools Fast 3G, measured manually in UAT (D-10). | 3 | 05-01 (App.jsx: D-02 header vs D-07b code-split), 05-02 (InvitationReveal + InvitationGatePage: D-05 responsive vs D-07a placeholder/preload) | UI-03 |

**Prohibitions carried into plans (must_haves.prohibitions):** no browser-language detection (D-01); no structural re-layout / edit Tailwind classes only (D-05); do NOT defer or lazy-load Motion (D-08); no backend photo re-compression (D-09); No button EXEMPT from 44px rule, dodge unchanged (D-06); creator title/message never translated (D-04).

## OUTLINE COMPLETE
Plan count: 3
