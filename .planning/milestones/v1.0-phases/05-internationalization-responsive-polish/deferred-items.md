# Deferred Items — Phase 05

Items discovered during execution that are out of scope for the current task/plan
(per executor Scope Boundary rule) and therefore not auto-fixed.

## From 05-01 (UI-02 bilingual toggle)

- `frontend/src/components/recipient/SparkleTrail.jsx:15` — pre-existing ESLint error
  `react-refresh/only-export-components` (file exports a non-component alongside a component).
  Predates this plan (introduced in commit 2879d12, Phase 3). Not touched by 05-01.
- `frontend/src/context/AuthContext.jsx:65` — pre-existing ESLint error
  `react-refresh/only-export-components`. Predates this plan. Not touched by 05-01.
- `frontend/src/pages/AuthCallbackPage.jsx:10` — pre-existing ESLint error
  `no-unused-vars` (`error` assigned but never used). Predates this plan. Not touched by 05-01.

`npm run lint` at repo/frontend root surfaces these 3 pre-existing errors unrelated to 05-01's
changed files (`src/i18n/index.js`, `src/components/LanguageToggle.jsx`, `src/pages/LandingPage.jsx`,
`index.html`, and later Task 2/3 files). Targeted lint of the 05-01 file set is clean. No lint
regression introduced by 05-01.
