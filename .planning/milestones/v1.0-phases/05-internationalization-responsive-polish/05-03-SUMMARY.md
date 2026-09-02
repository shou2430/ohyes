---
phase: 05-internationalization-responsive-polish
plan: 05-03
subsystem: ui
tags: [performance, code-splitting, react-lazy, suspense, vite, cls, lcp, motion, webp]

# Dependency graph
requires:
  - phase: 05-02
    provides: responsive class edits on InvitationReveal.jsx and InvitationGatePage.jsx (this plan layers photo skeleton/fetch hints on top)
provides:
  - Route-level code-splitting of all 5 routes via React.lazy + single Suspense fallback
  - Recipient path no longer downloads Dashboard/Create/AuthCallback JS (main gzip 148.71 -> 93.15 kB)
  - Photo skeleton (animate-pulse) over fixed aspect-[4/3] box + high-priority fade-in (CLS ~ 0)
  - High-priority preload fetch hint in InvitationGatePage (postcard caching preserved)
affects: [recipient-flow, load-performance, future-perf-work]

# Tech tracking
tech-stack:
  added: []  # React.lazy/Suspense are built-ins; no new deps
  patterns:
    - "Route-level code-splitting: React.lazy(() => import('./pages/X')) for every route behind ONE <Suspense fallback={<LoadingSpinner/>}>"
    - "LCP image: fixed aspect-ratio box + animate-pulse skeleton + fetchPriority=high/decoding=async + opacity fade on onLoad to eliminate CLS"
    - "Motion deliberately NOT code-split (stays eager) so the No-button dodge is interactive immediately (D-08)"

key-files:
  created: []
  modified:
    - frontend/src/App.jsx
    - frontend/src/components/recipient/InvitationReveal.jsx
    - frontend/src/pages/InvitationGatePage.jsx

key-decisions:
  - "Split ALL 5 routes (incl. LandingPage + InvitationGatePage) so the entry chunk is just the app shell"
  - "Motion (motion/react) kept STATIC everywhere — rides the recipient chunks, available on first interaction (D-08)"
  - "No backend photo code touched — WebP/1200px/q85 already in backend/app/utils/photo.py; D-09 is an acceptance-check (D-09)"

patterns-established:
  - "Per-route Vite chunks named after the page module; recipient path fetches only its own route chunk + shared vendor"
  - "Skeleton-over-reserved-box is the standard for any future image that would otherwise cause layout shift"

requirements-completed: [UI-03]

coverage:
  - id: D1
    description: "Recipient /i/:code downloads only app-shell + InvitationGatePage chunk + Motion vendor — NOT Dashboard/Create/AuthCallback JS (D-07b); main bundle gzip 148.71 -> 93.15 kB"
    requirement: "UI-03"
    verification:
      - kind: automated_ui
        ref: "vite build emits separate DashboardPage/CreateInvitationPage/AuthCallbackPage/LandingPage/InvitationGatePage chunks; ls dist/assets grep matched"
        status: pass
      - kind: manual_procedural
        ref: "DevTools Network on preview /i/test — user screenshot 2026-08-19: loaded index(93.6kB)+InvitationGatePage(7.3kB)+use-reduced-motion/Motion(41kB)+lucide only; NO Dashboard/Create/AuthCallback chunks"
        status: pass
    human_judgment: false
  - id: D2
    description: "Suspense fallback shows LoadingSpinner (never blank) while a lazy route chunk loads; lazy routing verified (navigating to /dashboard unauth redirected to / and lazily loaded LandingPage + LanguageToggle chunks)"
    requirement: "UI-03"
    verification:
      - kind: manual_procedural
        ref: "DevTools Network — user screenshot 2026-08-19: LandingPage-*.js + LanguageToggle-*.js loaded on-demand after redirect"
        status: pass
    human_judgment: false
  - id: D3
    description: "Motion (motion/react) stays STATIC — No-button dodge works immediately on the recipient path (D-08)"
    requirement: "UI-03"
    verification:
      - kind: other
        ref: "grep motion/react static in InvitationReveal.jsx+NoButton.jsx; no dynamic import(motion) anywhere; use-reduced-motion chunk loads on recipient path (user Network screenshot)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Photo loads inside fixed aspect-[4/3] box with animate-pulse skeleton + fetchPriority=high fade-in — no layout shift (CLS ~ 0) (D-07a)"
    requirement: "UI-03"
    verification:
      - kind: other
        ref: "grep aspect-[4/3]+animate-pulse+fetchPriority+transition-opacity in InvitationReveal.jsx (class presence)"
        status: pass
    human_judgment: true
    rationale: "Class/attribute presence confirmed statically, but the actual no-vertical-jump-as-photo-fades-in (CLS visual) needs a live reveal with a real photo — backend + a real invitation not available this session; defer visual CLS check to phase UAT."
  - id: D5
    description: "Recipient page shows the personalized page (LCP) AND is interactive (Yes/No clickable) within 3s under Fast 3G (D-10)"
    requirement: "UI-03"
    verification:
      - kind: manual_procedural
        ref: "DevTools Fast-3G timed measurement on a live /i/:code — NOT run (backend/live invitation unavailable)"
        status: unknown
    human_judgment: true
    rationale: "Flagged, human-timed acceptance (D-10). Requires a live password-gated recipient page with a real photo under Fast-3G throttling — backend not running this session. The payload-reduction lever (55.5 kB gzip lighter entry + code-split) is in place and build-proven; the wall-clock <3s measurement is deferred to phase UAT."
  - id: D6
    description: "Served recipient photo is image/webp ~100-200 KB (D-09) — backend pipeline output, no new code"
    requirement: "UI-03"
    verification:
      - kind: manual_procedural
        ref: "DevTools Network / curl -sI on photo request — NOT run (backend unavailable); backend/app/utils/photo.py WebP+1200px+q85 confirmed unchanged (no backend diff)"
        status: unknown
    human_judgment: true
    rationale: "Acceptance-check only; no code added. Verifying the actual served Content-Type/size needs the backend serving a real photo — defer to phase UAT."

# Metrics
duration: ~13min
completed: 2026-08-19
status: complete
---

# Phase 05 / Plan 05-03: Recipient Load Performance (UI-03) Summary

**Route code-split App.jsx with React.lazy + one Suspense — the recipient path stops downloading Dashboard/Create/AuthCallback JS (main bundle 148.71 -> 93.15 kB gzip, -55.5 kB) — plus an animate-pulse skeleton + high-priority fade-in photo over a fixed aspect-[4/3] box (CLS ~ 0), with Motion left eager (D-08).**

## Performance

- **Duration:** ~13 min (executor) + human checkpoint
- **Completed:** 2026-08-19
- **Tasks:** 2 automated (Task 1 code-split, Task 2 photo polish) + Task 3 human-verify checkpoint
- **Files modified:** 3 (0 created)

## Accomplishments
- `App.jsx` code-splits all 5 routes via `React.lazy(() => import("./pages/..."))` behind a single `<Suspense fallback={<LoadingSpinner/>}>`; `LoadingSpinner` stays a static import.
- Vite emits per-route chunks; the recipient `/i/:code` path fetches only the app shell + `InvitationGatePage` chunk + Motion vendor — **verified in DevTools Network** (user screenshot): NO Dashboard/Create/AuthCallback chunks load on the recipient path.
- Main entry chunk gzip dropped **148.71 kB -> 93.15 kB** (-55.5 kB) for every visitor incl. the recipient.
- InvitationReveal: `animate-pulse` skeleton fills the fixed `aspect-[4/3]` box while loading; `<img>` gains `fetchPriority="high"` + `decoding="async"` and keeps the `opacity-0 -> 100 transition-opacity` fade.
- InvitationGatePage: preload `new Image()` gains `fetchPriority = "high"` / `decoding = "async"`; canvas `toDataURL` postcard-caching + `crossOrigin` untouched.
- Motion stays statically imported (D-08); zero backend files touched (D-09).

## Task Commits

1. **Task 1: route code-split App.jsx (React.lazy + Suspense)** - `2d2afd0` (feat)
2. **Task 2: recipient photo skeleton + fade + fetch hints** - `c8d28a5` (feat)

## Files Created/Modified
- `frontend/src/App.jsx` - React.lazy wrappers for all 5 routes + single Suspense/LoadingSpinner
- `frontend/src/components/recipient/InvitationReveal.jsx` - animate-pulse skeleton over aspect-[4/3] + fetchPriority/decoding on LCP img
- `frontend/src/pages/InvitationGatePage.jsx` - fetchPriority/decoding on preload Image (postcard cache preserved)

## Decisions Made
- Split all five routes so the entry chunk is just the shell.
- Kept Motion eager everywhere (D-08).
- No backend photo changes (D-09) — acceptance-check only.

## Deviations from Plan
None — plan executed as written. (Plan Task 2 `<verify>` had a mistyped closing XML tag `</antml>`; treated as a normal automated grep — command content was intact and passed.)

## Issues Encountered
- Same 3 pre-existing ESLint errors as prior plans (SparkleTrail/AuthContext/AuthCallbackPage); none introduced here. Logged in `05/deferred-items.md`.

## Verification Status
- **Automated / build-proven:** `npm run build` ✓ emits 5 per-route chunks; main gzip 93.15 kB (from 148.71 kB); all greps ✓ (lazy+Suspense+LoadingSpinner, aspect-[4/3]+animate-pulse+fetchPriority+transition-opacity, preload fetchPriority+toDataURL+crossOrigin); Motion static ✓; backend untouched ✓ — orchestrator spot-checked.
- **Human checkpoint (Task 3):** Code-split (D-07b) + lazy routing + Motion-eager (D-08) **verified by user via DevTools Network** on the production preview: recipient `/i/test` loaded only shell + InvitationGatePage + Motion(use-reduced-motion) + lucide, no deferred-page chunks; `/dashboard` unauth redirect lazily pulled LandingPage + LanguageToggle chunks. **Deferred to phase UAT** (backend + live invitation w/ photo unavailable): Fast-3G <3s wall-clock (D-10), WebP Content-Type/size (D-09), and the CLS visual no-jump check (D-07a).

## Next Phase Readiness
- Phase 5 code deliverables complete (UI-01/02/03). Remaining verification is browser+backend UAT: full creator-page/recipient walkthrough (i18n + 375px) and the recipient-load acceptance checks (Fast-3G <3s, WebP, CLS) — bundle into `/gsd-verify-work 5` once the local backend + a test invitation (with photo) are available.

## Self-Check: PASSED
- key-files modified exist on disk ✓
- `git log --grep="05-03"` returns 2 commits (2d2afd0, c8d28a5) ✓
- All task acceptance criteria + plan-level automated verification re-run and passing; build green with per-route chunks; user Network screenshot confirms recipient-path chunk exclusion ✓

---
*Phase: 05-internationalization-responsive-polish*
*Completed: 2026-08-19*
