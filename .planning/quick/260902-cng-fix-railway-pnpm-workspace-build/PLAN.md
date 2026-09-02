---
quick_id: 260902-cng
slug: fix-railway-pnpm-workspace-build
date: 2026-09-02
---

# Quick Task: Fix Railway pnpm build "packages field missing or empty"

## Problem

Railway image build failed at the install step:

```
pnpm install --frozen-lockfile --prefer-offline
 ERROR  packages field missing or empty
```

## Root Cause

`frontend/pnpm-workspace.yaml` existed but contained only an `allowBuilds:`
block with **no `packages:` field**. The pnpm version on the Railway builder
treats any `pnpm-workspace.yaml` as a workspace root and requires a `packages:`
list, so it aborted before installing. Locally (pnpm 11.18.0) the same file was
tolerated, which is why it built on the dev machine but not on Railway — a pnpm
**version mismatch** (builder pnpm was unpinned).

Secondary: esbuild has an install/build script that pnpm skips by default
(`ERR_PNPM_IGNORED_BUILDS`); it must be explicitly approved or `vite build`
has no esbuild binary. pnpm 11 approves via `allowBuilds:`, pnpm 9/10 via
`onlyBuiltDependencies:`.

## Fix

1. `frontend/package.json`: add `"packageManager": "pnpm@11.18.0"` so the Railway
   builder (via corepack) uses the same pnpm as local.
2. `frontend/pnpm-workspace.yaml`: add a `packages: [.]` field (kills the
   "packages field missing" error on any pnpm version) and keep esbuild approved
   via **both** `allowBuilds` (pnpm 11) and `onlyBuiltDependencies` (pnpm 9/10)
   for builder-version resilience.
3. Delete `frontend/.pnpm-approve-builds.json` — a non-standard file pnpm never reads.

## Verification

- Clean `rm -rf node_modules && pnpm install --frozen-lockfile --prefer-offline`
  → exit 0, no `ERR_PNPM_IGNORED_BUILDS`.
- `pnpm build` → exit 0, 2208 modules, main bundle 93.15 kB gzip (unchanged).
- `pnpm-lock.yaml` unchanged (frozen-lockfile stays valid).
