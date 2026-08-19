---
phase: 05-internationalization-responsive-polish
reviewed: 2026-08-19T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - frontend/index.html
  - frontend/src/App.jsx
  - frontend/src/components/LanguageToggle.jsx
  - frontend/src/components/recipient/DodgeCounter.jsx
  - frontend/src/components/recipient/InvitationReveal.jsx
  - frontend/src/i18n/index.js
  - frontend/src/pages/CreateInvitationPage.jsx
  - frontend/src/pages/DashboardPage.jsx
  - frontend/src/pages/InvitationGatePage.jsx
  - frontend/src/pages/LandingPage.jsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-08-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed the diff against `4a8173f` for the three Phase 05 deliverables: the i18next bilingual toggle (UI-02), the 375px Tailwind responsive pass (UI-01), and React.lazy code-splitting + recipient photo skeleton/fade (UI-03).

No hardcoded secrets, injection vectors, `eval`/`dangerouslySetInnerHTML` usage, or debug artifacts (`console.log`, `TODO`/`FIXME`) were found in the diff. `escapeValue: false` in the i18next config is the standard, safe react-i18next setting because React already escapes JSX text content — no XSS risk was introduced by the translation interpolation (`{{name}}`, `{{title}}`, `{{count}}`), since none of the reviewed files render translated or user-supplied strings via `dangerouslySetInnerHTML`.

The main concerns are: (1) the new `React.lazy`/`Suspense` route-splitting in `App.jsx` has no error boundary anywhere in the codebase, so a chunk-load failure (very common after a redeploy or on a flaky mobile network) will crash the whole app to a blank screen with no fallback UI; (2) adding `<LanguageToggle />` to `DashboardPage.jsx`'s header makes a previously-dormant `useEffect` dependency bug reachable — toggling language now silently re-fetches the invitations list; (3) the language toggle was added to Landing/Dashboard/Create but not to the recipient-facing `InvitationGatePage.jsx` flow, even though that flow renders translated strings, leaving recipients with no way to switch language; and (4) the new `localStorage` read/write in `i18n/index.js` runs unguarded at module-eval time, so if storage access throws (privacy-mode / blocked-storage browsers) the whole app fails to bootstrap.

## Warnings

### WR-01: Lazy-loaded routes have no error boundary — chunk-load failure blanks the whole app

**File:** `frontend/src/App.jsx:7-11, 17-39`
**Issue:** All five page components are now `React.lazy(() => import(...))` and wrapped in a single `<Suspense fallback={<LoadingSpinner />}>`. There is no `ErrorBoundary` anywhere in the codebase (confirmed via `grep -rn "ErrorBoundary\|componentDidCatch\|getDerivedStateFromError" frontend/src/` — no matches). If a dynamic `import()` rejects — e.g. after a redeploy invalidates old chunk hashes referenced by a client still on the previous `index.html`, or a transient network failure on mobile — React throws during render and, with no error boundary present, unmounts the entire tree, leaving a blank page with no recovery path. This is a new failure mode introduced by switching from static to dynamic imports; it did not exist before this diff.
**Fix:**
```jsx
// Add a minimal ErrorBoundary and wrap the Suspense boundary with it,
// e.g. src/components/RouteErrorBoundary.jsx
class RouteErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <ChunkLoadFallback onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

// App.jsx
<RouteErrorBoundary>
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>...</Routes>
  </Suspense>
</RouteErrorBoundary>
```

### WR-02: Language toggle on Dashboard triggers a redundant invitations refetch

**File:** `frontend/src/pages/DashboardPage.jsx:30-47` (effect), `:142` (new `<LanguageToggle />`)
**Issue:** The invitations-fetching effect closes over `t` and lists it in its dependency array (`}, [t]);` at line 47) purely to satisfy `react-hooks/exhaustive-deps` for the `t("errors.network")` call in the `catch` block. `react-i18next`'s `t` function reference changes identity whenever the active language changes. Before this phase, `DashboardPage` had no language-switching UI, so this dependency was dead code in practice. This diff adds `<LanguageToggle />` directly into the Dashboard header (line 142), so every time a user toggles 繁/EN while on the dashboard, the effect re-runs and issues a duplicate `GET /api/invitations` request, silently repopulating already-loaded state. This is a real, newly-reachable side effect, not just a lint artifact.
**Fix:** Extract the fetch function so it doesn't need `t` in its closure, or fetch once with a stable dependency and localize the error message separately:
```jsx
useEffect(() => {
  async function fetchInvitations() {
    try {
      const token = localStorage.getItem("ohyes_token");
      const res = await fetch(`${API_URL}/api/invitations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setInvitations(await res.json());
      else setToast("errors.network"); // store the key, translate at render time
    } finally {
      setLoading(false);
    }
  }
  fetchInvitations();
}, []); // no `t` dependency — runs once on mount
```

### WR-03: Recipient-facing pages have no way to switch language

**File:** `frontend/src/pages/InvitationGatePage.jsx` (whole file — no `LanguageToggle` import/usage)
**Issue:** `<LanguageToggle />` was added to `LandingPage.jsx`, `DashboardPage.jsx`, and `CreateInvitationPage.jsx`, but not to `InvitationGatePage.jsx`, which is the entry point recipients land on via their invitation link and which renders multiple `t(...)`-driven strings (`invitation.expiredHeading`, `invitation.expiredBody`, `invitation.goHome`, plus everything under `PasswordGate`/`InvitationReveal`/`MessageCard`/`PostcardKeepsake`). Recipients arrive on a fresh browser session with no prior `ohyes_lang` value, so they default to zh-TW (per `resolveInitialLanguage`) with no UI affordance to switch to English — an inconsistent application of the "bilingual toggle" feature for exactly the audience (recipients, who may not share the creator's language) most likely to need it.
**Fix:** Add `<LanguageToggle />` to `InvitationGatePage.jsx` (e.g. top-right on the password/expired screens), consistent with its placement on the other three pages.

### WR-04: Unguarded `localStorage` access at i18n module-eval time can crash app bootstrap

**File:** `frontend/src/i18n/index.js:14, 38`
**Issue:** `resolveInitialLanguage()` calls `localStorage.getItem(LANG_STORAGE_KEY)` synchronously at module import time (line 14), before React ever mounts, and the `languageChanged` listener calls `localStorage.setItem(...)` (line 38) with no `try/catch` around either. In browsers/configurations where `localStorage` access throws (e.g. Safari with "Block All Cookies", some locked-down enterprise/mobile browser configs, or storage quota exhaustion on `setItem`), this throws uncaught at import time, before any error boundary or app UI exists to catch it — the entire SPA fails to bootstrap for that user, not just the language toggle. This is a stricter failure mode than a guarded runtime call because it runs unconditionally as a side effect of importing `src/i18n/index.js`, which `main.jsx`/`App.jsx` presumably import unconditionally on every page load.
**Fix:**
```js
function resolveInitialLanguage() {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : "zh-TW";
  } catch {
    return "zh-TW";
  }
}

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lng);
  } catch {
    // storage unavailable — language still changes in-memory for this session
  }
  document.documentElement.lang = lng;
});
```

## Info

### IN-01: Hardcoded `lang="zh-TW"` in index.html briefly mismatches a stored "en" preference

**File:** `frontend/index.html:2`
**Issue:** The static `<html lang="zh-TW">` is correct only for the default/first-visit case. When a returning user has `en` persisted in `localStorage`, the document briefly reports `lang="zh-TW"` to assistive technology and the browser until `src/i18n/index.js` runs and sets `document.documentElement.lang = initialLanguage` (line 32 of `i18n/index.js`). This is a minor flash and generally not observable to sighted users, but a screen reader that begins announcing content before the module executes could briefly use zh-TW pronunciation rules for what will become English content.
**Fix:** Low priority; if it matters, this can only be fully fixed with an inline blocking `<script>` in `index.html` that reads `localStorage` and sets `lang` before first paint. Not necessary for v1 given the negligible practical impact.

### IN-02: Password-visibility toggle `aria-label` is not translated

**File:** `frontend/src/pages/CreateInvitationPage.jsx:294`
**Issue:** `aria-label={showPassword ? "Hide password" : "Show password"}` uses hardcoded English strings even though this same file was just updated in this phase to add a full `<LanguageToggle />` (line 153) and every other user-facing string on the page goes through `t(...)`. A zh-TW screen-reader user toggling this button hears an English label sandwiched between Chinese announcements.
**Fix:**
```jsx
aria-label={showPassword ? t("create.hidePassword") : t("create.showPassword")}
```
(add corresponding keys to `en.json`/`zh-TW.json`).

### IN-03: Dashboard header packs 5 flex items without wrap — verify no overflow at 375px

**File:** `frontend/src/pages/DashboardPage.jsx:141-171`
**Issue:** The header's right-hand `<div className="flex items-center gap-2">` now holds `LanguageToggle`, `NotificationBell`, the avatar/initials, the (responsively hidden) display name, and the logout button, with no `flex-wrap` and no explicit min-width budget. This is the exact viewport phase 05 targets (375px). The `hidden sm:inline` on the display name mitigates most of the risk, but this is worth an explicit visual check at 375px width with a longer English display value (e.g. "Log out" vs "登出", or a wide notification badge), since nothing in the diff verifies this row doesn't wrap/overflow.
**Fix:** If overflow is confirmed at 375px, add `flex-wrap` with `gap-y-2`, or drop `LanguageToggle`'s gap/padding on `xs` screens.

---

_Reviewed: 2026-08-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
