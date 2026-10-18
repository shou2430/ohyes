---
quick_id: 261018-pyz
mode: quick
---

# Quick 261018-pyz: Fix postcard photo stretched in downloaded image

## Problem
The downloaded postcard (html2canvas) shows the photo distorted (too wide) for tall photos,
e.g. phone screenshots uploaded from macOS, or when downloading in Safari. The postcard `<img>`
uses `w-full max-h-[420px] object-cover`, but html2canvas 1.4.1 does not implement
`object-fit`, so it draws the whole image stretched into the element box. Backend already
applies `ImageOps.exif_transpose`, so orientation is not the cause.

## Tasks

### Task 1: Pre-crop the photo for capture
- files: frontend/src/components/recipient/coverCrop.js (new), coverCrop.test.js (new),
  frontend/src/components/recipient/PostcardKeepsake.jsx
- action: Pure `coverCrop(naturalW, naturalH, boxW, boxH)` returns the centered source rect
  that `object-fit: cover` shows. In `html2canvas`'s `onclone`, draw that rect of the
  already-loaded original `<img>` onto a canvas and set the cloned `<img>`'s `src` to the
  data URL, so the image html2canvas stretches already has the box's aspect ratio. On-screen
  UI unchanged; no refetch of the photo.
- verify: vitest for `coverCrop`; `pnpm test`, `pnpm lint`, `pnpm build`; manual download check
  with a tall photo in Chrome + Safari after deploy
- done: downloaded postcard photo matches on-screen crop
