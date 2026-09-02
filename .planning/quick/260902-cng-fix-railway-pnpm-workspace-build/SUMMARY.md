---
quick_id: 260902-cng
slug: fix-railway-pnpm-workspace-build
date: 2026-09-02
status: complete
---

# Summary: Fix Railway pnpm build "packages field missing or empty"

## What changed

- `frontend/package.json` — added `"packageManager": "pnpm@11.18.0"` (pin builder pnpm = local).
- `frontend/pnpm-workspace.yaml` — added `packages: [.]`; approve esbuild via both
  `allowBuilds: { esbuild: true }` (pnpm 11) and `onlyBuiltDependencies: [esbuild]` (pnpm 9/10).
- `frontend/.pnpm-approve-builds.json` — deleted (non-standard, unread by pnpm).
- `frontend/pnpm-lock.yaml` — unchanged.

## Root cause

The old `pnpm-workspace.yaml` had an `allowBuilds:` block but no `packages:` field.
The (unpinned, older) pnpm on the Railway builder treated the file as a workspace
root and required `packages:`, failing with "packages field missing or empty".
Local pnpm 11.18.0 tolerated it, masking the bug.

## Verification

- `rm -rf node_modules && pnpm install --frozen-lockfile --prefer-offline` → exit 0,
  no `ERR_PNPM_IGNORED_BUILDS` (esbuild approved and built).
- `pnpm build` → exit 0, 2208 modules transformed, main bundle 93.15 kB gzip (matches Phase 5).

## Follow-up

- Re-trigger the Railway deploy to confirm the image builds end-to-end (the local
  run reproduces the builder's install+build steps but not Railway's exact base image).
- Related memory: [[frontend-uses-pnpm-not-npm]] — the pnpm-workspace `allowBuilds`
  approval is a pnpm 11 mechanism; note it now also needs a `packages:` field.
