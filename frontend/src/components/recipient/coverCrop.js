// Source rect (in natural image pixels) that `object-fit: cover` displays in a
// boxW x boxH box with the default centered `object-position`.
export function coverCrop(naturalW, naturalH, boxW, boxH) {
  const scale = Math.max(boxW / naturalW, boxH / naturalH);
  const sw = boxW / scale;
  const sh = boxH / scale;
  return { sx: (naturalW - sw) / 2, sy: (naturalH - sh) / 2, sw, sh };
}
