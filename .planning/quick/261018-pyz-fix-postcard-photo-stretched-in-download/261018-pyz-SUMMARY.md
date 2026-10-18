---
quick_id: 261018-pyz
status: complete
commit: 9e8cd65
---

# Quick 261018-pyz Summary: Fix postcard photo stretched in downloaded image

**Root cause:** html2canvas 1.4.1 has no `object-fit` support. The postcard `<img>`
(`w-full max-h-[420px] object-cover`) is cropped on screen, but html2canvas draws the whole
image into the 400x420 box, so tall photos (phone screenshots) come out squashed/too wide.

**Fix:**
- New `coverCrop.js`: pure helper returning the centered source rect `object-fit: cover` shows.
- `PostcardKeepsake` `onclone`: draws that rect of the loaded original `<img>` to a canvas and sets
  the cloned `<img>` src to the data URL; awaits its load because html2canvas reads `currentSrc`.
  On-screen UI unchanged, no photo refetch.
- `coverCrop.test.js`: 4 vitest cases.

**Verification:** `pnpm test` 17/17, `pnpm lint` clean, `pnpm build` OK.
**Pending:** manual download check with a tall photo in Chrome + Safari after deploy.
