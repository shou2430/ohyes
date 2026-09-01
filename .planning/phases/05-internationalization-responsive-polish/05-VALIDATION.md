---
phase: 05
slug: internationalization-responsive-polish
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-01
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (frontend — stood up this phase) / pytest (backend, existing) |
| **Config file** | frontend: none (vitest defaults, node env) · `frontend/pnpm-workspace.yaml` allows esbuild build · backend: `backend/pyproject.toml` |
| **Quick run command** | `cd frontend && pnpm test` |
| **Full suite command** | `cd frontend && pnpm test && cd ../backend && uv run pytest` |
| **Estimated runtime** | frontend ~0.2s · backend ~a few s |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm test` for frontend changes
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** < 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01 | 01 | 1 | UI-02 (bilingual, allow-list default) | T-05-01 | Unknown/tampered `ohyes_lang` falls back to `zh-TW`; only `{en, zh-TW}` accepted | unit | `cd frontend && pnpm test` | ✅ `src/i18n/init.test.js` | ✅ green (7) |
| 05-01 | 01 | 1 | UI-02 (translation completeness) | — | Every `t()` key exists in BOTH locales as a non-empty string | unit | `cd frontend && pnpm test` | ✅ `src/i18n/keys.test.js` | ✅ green (2) |
| 05-01 | 01 | 1 | UI-02 (toggle flips text with NO reload) | — | changeLanguage re-renders in place; persists + syncs `document.documentElement.lang` | manual | — (browser) | see Manual-Only | ✅ UAT #1 pass |
| 05-02 | 02 | 1 | UI-01 (375px no-overflow, ≥44px tap targets) | T-05-02-01 | No horizontal scroll at 375px; touch targets ≥44×44px | manual | — (browser/DevTools) | see Manual-Only | ✅ UAT #2, #3 pass |
| 05-03 | 03 | 1 | UI-03 (Fast-3G <3s reveal) | T-05-03-02 | Reveal (title+photo, clickable Yes/No) under 3s on Fast-3G-equivalent throttle | manual | — (browser/DevTools timing) | see Manual-Only | ✅ UAT #4 pass |
| 05-03 | 03 | 1 | UI-03 (single photo fetch, WebP 100–200KB, CLS≈0) | T-05-03-02 | Photo fetched once (crossOrigin cache-share), image/webp ~144KB, no layout jump | manual | — (Network + backend log) | see Manual-Only | ✅ UAT #4,#5,#6 pass |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Automated coverage added this phase:** 2 test files, 9 tests, all green (`frontend/src/i18n/keys.test.js`, `frontend/src/i18n/init.test.js`). This is the first automated test suite on the frontend.

---

## Wave 0 Requirements

- [x] `frontend/src/i18n/init.test.js` — allow-list default + config (UI-02 / T-05-01)
- [x] `frontend/src/i18n/keys.test.js` — en/zh-TW key parity + non-empty values (UI-02)
- [x] vitest installed (`pnpm add -D vitest`); esbuild build approved via `pnpm-workspace.yaml`; `test` script added

*The i18n logic (allow-list resolution + translation completeness) is the automatable core of UI-02 and is now covered. The remaining Phase-5 outcomes are visual/perf/runtime (below).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Language toggle flips ALL text with no page reload | UI-02 | Full-app re-render + "no navigation" is a browser-runtime behavior, not unit-testable without a full DOM/render harness | On dev :5173 (signed in), click 繁/EN on Dashboard & Create; confirm every string flips and Network shows only XHR (no document/asset reload). UAT #1 ✅ |
| No horizontal overflow at 375px; tap targets ≥44px | UI-01 | Computed box sizes + live overflow at a viewport are visual, not provable by static/unit tests | DevTools device toolbar 375px across Dashboard/Create/gate states; measure logout, Back, eye, goHome ≥44×44px. UAT #2/#3 ✅ |
| Recipient reveal <3s on throttled mobile | UI-03 | Human-timed load measurement (D-10); needs live backend + real photo; no load-test harness | Preview :4173, Slow-4G (= legacy Fast-3G) + Disable cache, hard-reload, enter password, time to title+photo+clickable Yes/No. UAT #4 ✅ |
| Photo: single fetch, WebP 100–200KB, no layout shift | UI-03 | Network-panel + visual transition observation; backend-served asset | DevTools Network: one image/webp request ~144KB, CLS≈0 in the aspect-[4/3] box. Corroborated by backend access log (photo-GET count == verify count). UAT #5/#6 ✅ |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or documented manual-only rationale
- [x] Sampling continuity: automatable core (i18n logic) covered; visual/perf outcomes are inherently manual and pass UAT
- [x] Wave 0 covers all automatable references
- [x] No watch-mode flags (`vitest run`, not `vitest`)
- [x] Feedback latency < 15s
- [ ] `nyquist_compliant: true` — NOT set: UI-01 (responsive) and UI-03 (load-perf) are inherently visual/runtime and validated via human UAT, not automated tests. This is PARTIAL by design, consistent with prior frontend phases.

**Approval:** validated 2026-09-01 (PARTIAL — automated i18n logic + manual-verified visual/perf via UAT 6/6)
