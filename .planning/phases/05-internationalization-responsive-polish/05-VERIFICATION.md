---
phase: 05-internationalization-responsive-polish
verified: 2026-08-19T00:00:00Z
status: human_needed
score: 11/20 truths verified (9 require human/browser confirmation with the backend running — deferred to phase UAT, not failed)
behavior_unverified: 0
overrides_applied: 0
re_verification: null
human_verification:
  - test: "Sign in and confirm LanguageToggle switches ALL text on Dashboard and Create with no reload; toggle visible top-right on both; document.documentElement.lang syncs."
    expected: "All t()-driven text on Dashboard/Create flips zh-TW<->en instantly, no navigation/reload."
    why_human: "Requires a signed-in session (Google OAuth) + running backend to reach Dashboard/Create; not reachable this session (backend not running)."
  - test: "At 375px (DevTools device toolbar), inspect the Dashboard header (empty + populated invitation states), Create form, InvitationGatePage loading/expired states, and confirm no horizontal scrollbar; inspect computed box height/width of logout, Back link, show/hide-password eye icon, and goHome link (expect >=44x44px)."
    expected: "No horizontal overflow on any state; all listed controls report a computed box >=44x44px."
    why_human: "Computed box sizes and live overflow at 375px cannot be proven by static grep; signed-in pages and cannot be reached without the backend running this session."
  - test: "At 375px, open a live recipient link /i/:code, walk PasswordGate -> InvitationReveal -> DodgeCounter -> MessageCard -> PostcardKeepsake -> InvitationGatePage expired state; confirm no overflow anywhere, tap targets >=44px, and that the No button still dodges the cursor/finger with unchanged escalating behavior (STAGES 1-5)."
    expected: "No horizontal overflow at any recipient screen; Unlock/Download/Yes buttons >=44px; No button dodge feel unchanged from pre-phase-5 behavior."
    why_human: "Requires a live invitation (password-gated, real photo) served by a running backend; the dodge 'feel' is a runtime/tactile judgment, not a static property."
  - test: "Under DevTools Fast 3G throttling, hard-reload a live /i/:code, enter the password, and time how long until the personalized page (title + photo) is VISIBLE and Yes/No are CLICKABLE."
    expected: "Under 3 seconds (D-10 acceptance target)."
    why_human: "Flagged, human-timed measurement (D-10) — requires a live backend + real invitation + real photo; no automated load-test harness exists in this repo."
  - test: "In DevTools Network, inspect the recipient photo request's Content-Type and transferred size."
    expected: "Content-Type: image/webp, size roughly 100-200 KB (D-09 acceptance-check; backend pipeline output, no code added this phase)."
    why_human: "Requires the backend to actually serve a real uploaded photo; cannot be produced by static analysis."
  - test: "Watch the InvitationReveal photo load in (skeleton -> fade) with a real photo and confirm the Yes/No row below the photo does not visually jump (CLS ~ 0)."
    expected: "The aspect-[4/3] box holds its footprint throughout; no vertical layout shift as the photo fades in."
    why_human: "Requires a live photo to observe the actual load transition; class/attribute presence (aspect-[4/3], animate-pulse, fetchPriority, transition-opacity) is code-confirmed but the visual no-jump outcome is not."
---

# Phase 05: Internationalization & Responsive Polish Verification Report

**Phase Goal:** Ship bilingual support (Traditional Chinese default with English toggle), ensure mobile-first responsiveness across all pages (375px+ with touch-friendly tap targets), and meet the 3-second load target on a throttled mobile connection.
**Verified:** 2026-08-19
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | App defaults to zh-TW on first visit; `index.html` and `document.documentElement.lang` default to `zh-TW` (SC1, D-01/D-03) | VERIFIED | `frontend/index.html:2` `<html lang="zh-TW">`; `frontend/src/i18n/index.js:13-18,32` resolves `localStorage.getItem("ohyes_lang")` against `{en, zh-TW}` allow-list else `"zh-TW"`, sets `document.documentElement.lang`. Human-confirmed on Landing (SUMMARY 05-01, D1). |
| 2 | zh-TW strings are natural Traditional Chinese across all 8 namespaces; 79/79 recursive key parity with `en.json` | VERIFIED | Ran the parity script myself: `OK parity 79 keys`. Read both `en.json`/`zh-TW.json` in full — CJK values read as natural Traditional Chinese (e.g. `使用 Google 登入`, `建立邀請`). `recipient.yes`/`recipient.no` intentionally English in both files (documented exemption). |
| 3 | LanguageToggle switches ALL `t()`-driven text zh-TW<->en with NO page reload, on every creator page | ⚠️ human_needed | Code: single centralized `i18n.on("languageChanged")` listener (no navigation call anywhere in the toggle/listener path) — `frontend/src/i18n/index.js:37-40`, `frontend/src/components/LanguageToggle.jsx`. Human-confirmed on **Landing only** (SUMMARY 05-01 D1). Dashboard/Create signed-in no-reload switch not exercised this session (backend down) — deferred to UAT. |
| 4 | `ohyes_lang` + `document.documentElement.lang` stay in sync after toggle; persists across reload; toggling the active language is a no-op | VERIFIED | Code: allow-list + centralized listener (`frontend/src/i18n/index.js`). Human-confirmed via Landing walkthrough: reload persistence, no-op on same language (SUMMARY 05-01 D1). |
| 5 | Missing translation key resolves to the English fallback, never a raw dotted key | VERIFIED | `frontend/src/i18n/index.js:26` `fallbackLng: "en"` retained; parity script proves no missing keys exist to exercise the path, and fallback mechanism is i18next's built-in, unmodified. |
| 6 | LanguageToggle renders top-right on Landing/Dashboard/Create; recipient flow (gate + reveal) has NO toggle (D-02/D-04) | VERIFIED | Read all 3 creator pages — `<LanguageToggle />` present and positioned top-right in each (`LandingPage.jsx:26-28`, `DashboardPage.jsx:142`, `CreateInvitationPage.jsx:153`). `grep -rl LanguageToggle` on `InvitationGatePage.jsx` + `components/recipient/*` returned empty — confirmed absent. |
| 7 | Landing has no horizontal overflow at 375px; toggle does not collide with the centered card; sign-in >=44px | VERIFIED | Code: `h-11 w-full` sign-in link (44px). Human-confirmed via DevTools screenshot (SUMMARY 05-02 D4): no h-scroll, toggle clear of card, CJK glyphs correct. |
| 8 | Dashboard header fits 375px (display name `hidden sm:inline`; logout `min-h-[44px]`); both empty and populated invitation states overflow-free | ⚠️ human_needed | Code confirmed: `DashboardPage.jsx:161` `hidden sm:inline`, `:166` `min-h-[44px]`. Computed box + live 375px overflow on the signed-in Dashboard not exercised this session (backend down) — deferred to UAT. |
| 9 | Create Back link + show/hide-password toggle each >=44x44px; form single-column, no overflow at 375px | ⚠️ human_needed | Code confirmed: `CreateInvitationPage.jsx:148` Back link `min-h-[44px]`, `:295` eye button `min-h-[44px] min-w-[44px]`, input `pr-12` to avoid collision. Live/computed confirmation on the signed-in page deferred to UAT. |
| 10 | InvitationGatePage loading/expired states no overflow at 375px; goHome link >=44px | ⚠️ human_needed | Code confirmed: `InvitationGatePage.jsx:118` `min-h-[44px]` on goHome link. Live 375px walkthrough with a real invitation deferred to UAT (backend down). |
| 11 | PasswordGate/PostcardKeepsake/InvitationReveal have no overflow at 375px; Unlock/Download/Yes tap targets >=44px; long zh-TW titles wrap | ⚠️ human_needed | Code confirmed: `PasswordGate.jsx` input+button `h-11` (44px), `PostcardKeepsake.jsx` download `h-11`, `InvitationReveal.jsx` Yes button `h-12` (48px); all titles carry `line-clamp-2`. Live browser confirmation with a real invitation deferred to UAT (backend down). |
| 12 | DodgeCounter's long zh-TW label wraps (`flex-wrap`) rather than overflowing at 375px (encoding probe) | VERIFIED | `frontend/src/components/recipient/DodgeCounter.jsx:20` `flex-wrap`, `:38` `text-center` on label. |
| 13 | NoButton dodge math (STAGES, `getBoundingClientRect`, spring/tween) is unchanged and exempt from the 44px tap-target rule | ⚠️ human_needed | Code confirmed: `NoButton.jsx` retains `STAGES` table and `getBoundingClientRect` dodge math; no `min-h`/`min-w` utility added anywhere in the file. That the dodge still **feels** identical at runtime (escalation, teleport, wobble) needs a live interaction pass — deferred to UAT. |
| 14 | No structural re-layout occurred in the 375px pass — only Tailwind utility-class edits; `LanguageToggle.jsx`/`NotificationBell.jsx` untouched by 05-02 | VERIFIED | Read `git log` diffs for `d8dc0ef`/`d7ef0b9` (05-02 commits) — edits are class-only; `LanguageToggle.jsx` and `NotificationBell.jsx` do not appear in either commit's file list. |
| 15 | Recipient `/i/:code` downloads only its own chunk + shared vendor — NOT Dashboard/Create/AuthCallback JS (SC4, D-07b) | VERIFIED | Ran `npm run build` myself — `dist/assets/` contains separate `DashboardPage-*.js`, `CreateInvitationPage-*.js`, `AuthCallbackPage-*.js`, `LandingPage-*.js`, `InvitationGatePage-*.js` chunks (11.00/12.42/0.44/1.52/19.37 kB resp.); main entry gzip **93.15 kB** (matches SUMMARY's claimed drop from 148.71 kB). Human-confirmed via DevTools Network trace on the production preview: `/i/test` loaded only shell + InvitationGatePage + Motion/lucide chunks, no Dashboard/Create/AuthCallback (SUMMARY 05-03 D1). |
| 16 | `<Suspense fallback={<LoadingSpinner/>}>` shows the spinner while a lazy chunk loads — never blank | VERIFIED | `App.jsx:17` wraps `<Routes>` in `<Suspense fallback={<LoadingSpinner />}>`; `LoadingSpinner` remains a static import (`App.jsx:5`). Human-confirmed: unauth `/dashboard` visit redirected to `/` and lazily loaded `LandingPage`+`LanguageToggle` chunks (SUMMARY 05-03 D2). |
| 17 | Motion (`motion/react`) stays statically imported; No-button dodge is interactive immediately on the recipient's own chunk (D-08) | VERIFIED | `grep motion/react` confirms static import in `InvitationReveal.jsx` and `NoButton.jsx`; no `import("motion/react")` dynamic call anywhere. Human-confirmed: `use-reduced-motion`/Motion vendor chunk loaded on the recipient path in the Network trace (SUMMARY 05-03 D1/D3). |
| 18 | Recipient photo renders in a fixed `aspect-[4/3]` box with an `animate-pulse` skeleton and `fetchPriority="high"` fade-in — no layout shift (D-07a) | ⚠️ human_needed | Code confirmed: `InvitationReveal.jsx:34,36,45-55` — fixed `aspect-[4/3]` box, `animate-pulse` skeleton fill, `fetchPriority="high"` + `decoding="async"` on the `<img>`, `opacity-0`->`opacity-100 transition-opacity` fade preserved. The actual no-vertical-jump outcome with a **real** photo was not observed this session (backend down) — deferred to UAT. |
| 19 | Served recipient photo is `image/webp` at ~100-200 KB (D-09 acceptance-check, no code added) | ⚠️ human_needed | Backend `photo.py` pipeline unchanged (no diff this phase) — code-side acceptance-check only. Actual `Content-Type`/size was NOT measured this session (backend not running) — deferred to UAT. |
| 20 | Recipient page shows the LCP (title+photo) and is interactive (Yes/No clickable) within 3s under Fast 3G (SC4, D-10) | ⚠️ human_needed | Flagged, human-timed target. NOT measured this session (backend not running, no live invitation). The payload-reduction lever (55.5 kB gzip lighter entry chunk + code-split, confirmed above) is in place and build-proven; the wall-clock measurement itself is deferred to UAT. |

**Score:** 11/20 truths fully verified; 9 require human/browser confirmation with a running backend (feeds phase UAT).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/i18n/index.js` | localStorage-resolved `lng`, allow-list, `languageChanged` listener, `fallbackLng` retained | ✓ VERIFIED | All elements present and wired (read in full). |
| `frontend/src/components/LanguageToggle.jsx` | Calls `i18n.changeLanguage` for both languages, no direct localStorage/DOM writes | ✓ VERIFIED | Read in full — matches spec exactly. |
| `frontend/index.html` | `<html lang="zh-TW">` | ✓ VERIFIED | Line 2 confirmed. |
| `frontend/src/components/recipient/DodgeCounter.jsx` | `flex-wrap` on the label row | ✓ VERIFIED | Line 20. |
| `frontend/src/components/recipient/NoButton.jsx` | `STAGES` + `getBoundingClientRect` intact, no tap-target utility added | ✓ VERIFIED | Read in full, dodge math untouched. |
| `frontend/src/pages/DashboardPage.jsx` | `hidden sm:inline` + `min-h-[44px]` logout | ✓ VERIFIED | Lines 161, 166. |
| `frontend/src/pages/CreateInvitationPage.jsx` | `min-h-[44px]` Back + eye toggle | ✓ VERIFIED | Lines 148, 295. |
| `frontend/src/pages/InvitationGatePage.jsx` | `min-h-[44px]` goHome link | ✓ VERIFIED | Line 118. |
| `frontend/src/App.jsx` | `React.lazy` for all 5 routes + one `Suspense` | ✓ VERIFIED | Lines 7-11, 17-39. |
| `frontend/src/components/recipient/InvitationReveal.jsx` | `aspect-[4/3]` + `animate-pulse` + `fetchPriority` + `transition-opacity` | ✓ VERIFIED | Lines 34, 36, 45-55. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `LanguageToggle` | `i18n.changeLanguage` | button `onClick` | ✓ WIRED | Both `zh-TW`/`en` buttons call `changeLanguage`. |
| `i18n` `languageChanged` event | `localStorage` + `document.documentElement.lang` | centralized listener | ✓ WIRED | Single listener in `i18n/index.js`, no duplicate/competing writers found elsewhere. |
| `i18n init` | `localStorage.getItem("ohyes_lang")` | allow-list resolution | ✓ WIRED | Confirmed. |
| `App.jsx` route elements | `React.lazy(() => import(...))` | Vite dynamic import | ✓ WIRED | Build emits 5 separate page chunks; confirmed by my own `npm run build` run. |
| `InvitationReveal` photo box | skeleton + fade | `photoLoaded`/`photoError` state + `onLoad`/`onError` | ✓ WIRED | State-driven conditional rendering confirmed in code; live confirmation with a real photo deferred to UAT. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| UI-02 | 05-01 | Bilingual UI, zh-TW default + EN toggle | ✓ SATISFIED (code) / human_needed (full signed-in walkthrough) | Truths 1-6 above. |
| UI-01 | 05-02 | Mobile-first responsive, 375px, tap targets | ✓ SATISFIED (code) / human_needed (signed-in + recipient visual pass) | Truths 7-14 above. |
| UI-03 | 05-03 | <3s load, code-split, CLS | ✓ SATISFIED (code) / human_needed (live timing, WebP, CLS) | Truths 15-20 above. |

No orphaned requirements — REQUIREMENTS.md maps exactly UI-01/UI-02/UI-03 to Phase 5, and all three are claimed by exactly one plan each (05-02, 05-01, 05-03 respectively).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/components/recipient/SparkleTrail.jsx` | 15 | Pre-existing ESLint `react-refresh/only-export-components` | ℹ️ Info | Predates Phase 5 (Phase 3, commit `2879d12`); not introduced or touched by any 05-0x commit — confirmed via `git log -- <file>` cross-referenced against the 6 phase-5 commit hashes. Logged in `deferred-items.md`. |
| `frontend/src/context/AuthContext.jsx` | 65 | Pre-existing ESLint `react-refresh/only-export-components` | ℹ️ Info | Predates Phase 5 (Phase 1). Not touched by phase 5. |
| `frontend/src/pages/AuthCallbackPage.jsx` | 10 | Pre-existing ESLint `no-unused-vars` | ℹ️ Info | Predates Phase 5 (Phase 1). Not touched by phase 5. |
| `frontend/src/components/recipient/PostcardKeepsake.jsx` | 59 | Hardcoded English string `"A yes worth chasing"` bypasses `t()` | ℹ️ Info | Pre-existing, deliberate Phase 3 decision (`git log -S`: commit `12024ae` "Replace i18n stamp text with hardcoded 'A yes worth chasing'"). Not in any 05-0x plan's `files_modified` for text content (05-02 only audited this file's layout/overflow, unchanged). Out of the declared scope of Phase 5's i18n audit (Task 3 of 05-01 explicitly scoped the hardcoded-string scan to Landing/Dashboard/Create only). Flagging for awareness, not a phase-5 regression — recommend a follow-up decision on whether this stays a brand-text exemption (like `recipient.yes`/`recipient.no`) or gets externalized in a future phase. |

No debt markers (`TBD`/`FIXME`/`XXX`) and no `TODO`/`HACK`/`PLACEHOLDER` found in any file modified by Phase 5's three plans.

### Build & Lint Verification (run live, not from SUMMARY claims)

- `cd frontend && npm run build` — ✓ passes. 2208 modules, per-route chunks confirmed: `DashboardPage`, `CreateInvitationPage`, `AuthCallbackPage`, `LandingPage`(implicit in entry-adjacent chunk), `InvitationGatePage` all separate files under `dist/assets/`. Main entry gzip **93.15 kB** — matches the SUMMARY's claimed 148.71 -> 93.15 kB reduction exactly.
- `cd frontend && npm run lint` — 3 pre-existing errors only (verified via `git log` that none of the 3 offending files were touched by any of the 6 Phase 5 commits: `fe171fe`, `ab059ff`, `d8dc0ef`, `d7ef0b9`, `2d2afd0`, `c8d28a5`).
- Translation parity script (re-run live) — `OK parity 79 keys`.
- All 6 phase-5 commit hashes (`fe171fe`, `ab059ff`, `d8dc0ef`, `d7ef0b9`, `2d2afd0`, `c8d28a5`) confirmed to exist via `git cat-file -t`.

### Human Verification Required

See frontmatter `human_verification` list (6 items) — these are the items the local session could not exercise because the backend was not running and no live invitation with a real photo existed:

1. **Dashboard/Create signed-in no-reload language switch** — needs Google OAuth + backend.
2. **Dashboard/Create/InvitationGatePage 375px overflow + computed tap-target sizes** — needs a signed-in session and browser DevTools inspection.
3. **Recipient flow (gate/reveal/postcard/expired) 375px walkthrough + No-button dodge feel** — needs a live invitation with a real photo.
4. **Fast-3G <3s wall-clock timing (D-10)** — flagged, human-timed target; needs a live invitation under DevTools throttling.
5. **WebP Content-Type/size acceptance-check (D-09)** — needs the backend to serve a real photo.
6. **CLS visual no-jump check (D-07a)** — needs a live photo to observe the actual load transition.

### Gaps Summary

No code-level gaps found. Every artifact declared by the three plans exists, is substantive, and is wired correctly; I independently re-ran the build, the translation-parity script, and the lint pass rather than trusting the SUMMARYs, and all outputs matched the SUMMARYs' claims exactly (including the specific 93.15 kB gzip figure). The remaining open items are exclusively runtime/visual truths that require a running backend and a live, password-gated invitation with a real photo — none of which was available this session. This matches the executor's own honest self-assessment across all three SUMMARYs (each explicitly flags the same backend-gated items as deferred to phase UAT rather than claiming them verified). Recommend running `/gsd-verify-work 5` (or the phase UAT flow) once the local backend and a test invitation are available, using the 6 human-verification items above as the checklist.

One out-of-scope observation (not a gap): `PostcardKeepsake.jsx`'s decorative stamp text `"A yes worth chasing"` is hardcoded English from Phase 3 and was never brought into i18n scope by any Phase 5 plan — flagged above for awareness only.

---

*Verified: 2026-08-19*
*Verifier: Claude (gsd-verifier)*
