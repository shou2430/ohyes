# Phase 5 Discussion Log

**Date:** 2026-08-18
**Areas discussed:** Language toggle, Recipient-page language, Responsive scope, Load performance (all 4 selected)

> Human-reference only — not consumed by researcher/planner/executor. Canonical decisions live in `05-CONTEXT.md`.

## Language toggle & persistence
- **Persistence / default** — options: (persist + first-visit zh-TW) / (persist + browser-detect) / (no persist). → **Chose: persist in localStorage + first visit always zh-TW** (matches "defaults to zh-TW"; no detector).
- **Toggle placement** — options: (per-page header top-right) / (landing only) / (global floating). → **Chose: consistent top-right header on each creator page.**

## Recipient-page language
- Show a language toggle on the reveal page? — options: (no, keep minimal) / (yes, recipient can switch). → **Chose: no toggle; follows persisted/default language, keeps the emotional page minimal.**

## Responsive scope
- Scope — options: (375px audit-and-fix, no re-layout) / (audit + re-layout specific pages). → **Chose: 375px audit-and-fix, no structural re-layout;** priority = recipient components with zero breakpoints.
- Tap target — options: (44×44 iOS HIG) / (48×48 Material). → **Chose: 44×44px.**

## Load performance
- Optimizations — options: image lazy+skeleton / route code-split / defer Motion / confirm WebP. Measured first (`vite build`): main bundle 148 kB gzip loaded by all visitors; html2canvas already split; photos already WebP+1200px+q85; recipient already has photoLoaded/onLoad + Image() preload. → **Chose: image lazy+skeleton (polish existing) + route code-split.** Defer-Motion rejected (recipient uses it immediately). WebP = already done → acceptance-check only.
- `<3s` acceptance — options: Fast 3G / Slow 4G / Lighthouse; and clarified what "load" means. → **Chose: Fast 3G, recipient page LCP + interactive within 3s (not full-byte); manual DevTools measurement in UAT.**

## Notes
- Two clarification detours: (1) explained option 1 (image placeholder) vs option 2 (code-split) and measured the real bundle/photo before deciding; (2) explained what "Fast 3G" and "<3s" mean before locking the acceptance framing.
- No scope creep raised; no deferred ideas.
