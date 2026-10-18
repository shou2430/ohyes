import { describe, it, expect } from "vitest";
import { coverCrop } from "./coverCrop.js";

describe("coverCrop", () => {
  it("crops top and bottom of a tall image (phone screenshot in 400x420 box)", () => {
    const r = coverCrop(800, 1600, 400, 420);
    expect(r.sw).toBeCloseTo(800);
    expect(r.sh).toBeCloseTo(840);
    expect(r.sx).toBeCloseTo(0);
    expect(r.sy).toBeCloseTo(380);
  });

  it("crops left and right of a wide image", () => {
    const r = coverCrop(1200, 600, 400, 400);
    expect(r).toEqual({ sx: 300, sy: 0, sw: 600, sh: 600 });
  });

  it("keeps the whole image when aspect ratios match", () => {
    expect(coverCrop(1200, 900, 400, 300)).toEqual({ sx: 0, sy: 0, sw: 1200, sh: 900 });
  });

  it("returns a rect with the box's aspect ratio", () => {
    const r = coverCrop(1179, 2556, 400, 420);
    expect(r.sw / r.sh).toBeCloseTo(400 / 420);
  });
});
