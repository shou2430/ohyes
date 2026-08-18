---
phase: 05-internationalization-responsive-polish
plan: 05-01
subsystem: ui
tags: [i18n, react-i18next, i18next, localStorage, react, tailwind, vite]

# Dependency graph
requires:
  - phase: 03/04
    provides: existing i18next setup, LandingPage/DashboardPage/CreateInvitationPage, recipient flow
provides:
  - LanguageToggle component (繁 / EN) wired to i18next changeLanguage
  - i18n init that resolves language from localStorage (ohyes_lang, allow-listed) else zh-TW
  - centralized languageChanged listener persisting ohyes_lang + syncing document.documentElement.lang
  - index.html default <html lang="zh-TW">
  - audited en.json / zh-TW.json (79/79 key parity across 8 namespaces)
affects: [05-02, 05-03, recipient-flow, creator-pages]

# Tech tracking
tech-stack:
  added: []  # no new deps — i18next/react-i18next already in package.json
  patterns:
    - "Single centralized i18n.on('languageChanged') listener owns persistence + <html lang> sync; components only call changeLanguage"
    - "localStorage key naming convention ohyes_lang (mirrors existing ohyes_token)"
    - "Stored-value allow-list ({en, zh-TW} else zh-TW) as defense-in-depth for T-05-01"

key-files:
  created:
    - frontend/src/components/LanguageToggle.jsx
  modified:
    - frontend/src/i18n/index.js
    - frontend/index.html
    - frontend/src/pages/LandingPage.jsx
    - frontend/src/pages/DashboardPage.jsx
    - frontend/src/pages/CreateInvitationPage.jsx

key-decisions:
  - "localStorage key = ohyes_lang (consistency with existing ohyes_token)"
  - "No i18next language-detector plugin — initial language resolved solely from persisted key else zh-TW (D-01)"
  - "recipient.yes ('Yes!') / recipient.no ('No') stay English brand text in BOTH files (explicit exemption)"
  - "Create page Yes/No preview-mockup badges left as static English (mirror the permanent brand exemption; wiring would render byte-identical)"

patterns-established:
  - "i18n persistence/side-effects centralized in the languageChanged listener, not in UI components"
  - "Toggle placement top-right on every creator page; recipient flow deliberately toggle-free (D-04)"

requirements-completed: [UI-02]

coverage:
  - id: D1
    description: "First-visit zh-TW default; toggle flips all t() text with NO page reload; choice persists in localStorage ohyes_lang and restores on reload; document.documentElement.lang stays in sync (D-01/D-03)"
    requirement: "UI-02"
    verification:
      - kind: manual_procedural
        ref: "Landing DevTools walkthrough (first-visit default, no-reload EN switch, reload persistence) — user-verified 2026-08-18"
        status: pass
    human_judgment: true
    rationale: "Runtime SPA behavior (no-reload swap + persistence) is not provable by static checks. Landing/login page verified by user this session; full creator-page (Dashboard/Create signed-in) walkthrough deferred to phase UAT because the local backend was not running."
  - id: D2
    description: "LanguageToggle rendered top-right on Dashboard and Create (D-02)"
    requirement: "UI-02"
    verification:
      - kind: other
        ref: "grep 'LanguageToggle' src/pages/DashboardPage.jsx && src/pages/CreateInvitationPage.jsx"
        status: pass
    human_judgment: true
    rationale: "Import/render confirmed in code; visual placement on the signed-in pages needs a browser + auth (backend down this session) — defer visual confirmation to phase UAT."
  - id: D3
    description: "Recipient flow (gate + reveal) shows NO language toggle (D-04)"
    requirement: "UI-02"
    verification:
      - kind: other
        ref: "grep -L 'LanguageToggle' src/pages/InvitationGatePage.jsx + components/recipient/* (absent)"
        status: pass
    human_judgment: false
  - id: D4
    description: "en.json / zh-TW.json key-complete (79/79) across 8 namespaces; fallbackLng 'en' retained so missing keys render English, never the raw dotted key"
    requirement: "UI-02"
    verification:
      - kind: other
        ref: "node recursive key-parity command exits 0 (OK parity 79 keys); grep fallbackLng in i18n/index.js"
        status: pass
    human_judgment: false

# Metrics
duration: ~10min
completed: 2026-08-18
status: complete
---

# Phase 05 / Plan 05-01: Bilingual Language Toggle (UI-02) Summary

**A 繁 / EN toggle wired to i18next changeLanguage — zh-TW default, no-reload switching, localStorage (ohyes_lang) persistence with `<html lang>` sync, placed top-right on all creator pages; recipient flow left toggle-free; translation files audited to 79/79 key parity.**

## Performance

- **Duration:** ~10 min (executor) + human checkpoint
- **Completed:** 2026-08-18
- **Tasks:** 3 automated (Task 1 tracer, Task 2 rollout, Task 3 audit) + Task 4 human-verify checkpoint
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments
- i18n init resolves initial language from `localStorage.getItem("ohyes_lang")` validated against the `{en, zh-TW}` allow-list, else `zh-TW`; `fallbackLng: "en"` retained (D-01).
- Centralized `i18n.on("languageChanged")` listener writes `ohyes_lang` and sets `document.documentElement.lang` — components never touch storage/DOM directly (D-01/D-03).
- New `LanguageToggle` (繁 / EN) calls `i18n.changeLanguage` for both languages; placed top-right on Landing, Dashboard, Create (D-02).
- `index.html` default changed to `<html lang="zh-TW">` (D-03).
- Translation audit: 79/79 recursive key parity across all 8 namespaces, natural Traditional Chinese confirmed, brand-text exemptions (`recipient.yes`/`recipient.no`) recorded.

## Task Commits

1. **Task 1 (tracer): wire i18n toggle end-to-end on Landing** — `fe171fe` (feat)
2. **Task 2: roll LanguageToggle out to Dashboard + Create** — `ab059ff` (feat)
3. **Task 3: audit translation completeness + quality** — no commit (audit found no defects; en/zh-TW already at 79/79 parity, no file changes needed)

## Files Created/Modified
- `frontend/src/components/LanguageToggle.jsx` (created) — 繁/EN text toggle calling i18n.changeLanguage
- `frontend/src/i18n/index.js` — localStorage-resolved lng + allow-list + languageChanged listener + `<html lang>` sync; fallbackLng retained
- `frontend/index.html` — `<html lang="zh-TW">`
- `frontend/src/pages/LandingPage.jsx` — top-right `<LanguageToggle />`
- `frontend/src/pages/DashboardPage.jsx` — `<LanguageToggle />` in header right-group
- `frontend/src/pages/CreateInvitationPage.jsx` — `<LanguageToggle />` top-right of back-nav row

## Decisions Made
- `ohyes_lang` localStorage key (consistency with existing `ohyes_token`).
- No language-detector plugin (D-01) — deterministic zh-TW default.
- Kept `recipient.yes`/`recipient.no` English in both files (product punchline exemption); Create-page static Yes/No preview badges left as English for the same reason (wiring would render byte-identical).

## Deviations from Plan
None — plan executed as written. No code deviations, no auto-fixes required.

## Issues Encountered
- `npm run lint` at frontend root surfaces **3 pre-existing** ESLint errors in files this plan did not touch (`src/components/recipient/SparkleTrail.jsx:15`, `src/context/AuthContext.jsx:65`, `src/pages/AuthCallbackPage.jsx:10` — all predate 05-01, Phase 3 origin). Targeted lint of the 05-01 file set is clean — no regression introduced. Logged in `05/deferred-items.md`.

## Verification Status
- **Automated gates:** `npm run build` ✓, translation key-parity node command ✓ (79 keys), all 6 source-assertion greps ✓ — orchestrator spot-checked.
- **Human checkpoint (Task 4):** Landing/login page verified by user (first-visit zh-TW default, no-reload EN switch, reload persistence). Dashboard/Create signed-in visual + recipient no-toggle browser walkthrough **deferred to phase UAT** (local backend not running this session). D3 (no recipient toggle) and D4 (key parity/fallback) are code-confirmed.

## Next Phase Readiness
- 05-02 (UI-01 responsive) edits the SAME creator pages AFTER this plan's toggle placement — the header right-group now includes LanguageToggle, which 05-02 must fit within 375px (its plan already accounts for this via `hidden sm:inline` on the display name).
- Dev server pattern: `cd frontend && npm run dev -- --host` (Vite on :5173).

## Self-Check: PASSED
- key-files.created exist on disk: `LanguageToggle.jsx` ✓
- `git log --grep="05-01"` returns 2 commits (fe171fe, ab059ff) ✓
- All task acceptance criteria + plan-level automated verification re-run and passing ✓

---
*Phase: 05-internationalization-responsive-polish*
*Completed: 2026-08-18*
