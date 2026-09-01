import { describe, it, expect } from "vitest";
import en from "./en.json";
import zhTW from "./zh-TW.json";

// Collect every leaf key path (dot-notation) from a nested translation object.
function leafPaths(obj, prefix = "") {
  const paths = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      paths.push(...leafPaths(value, path));
    } else {
      paths.push(path);
    }
  }
  return paths.sort();
}

// UI-02: bilingual UI must be complete — every string the app renders via t()
// must exist in BOTH locales, or a language toggle leaves untranslated gaps.
describe("i18n translation key parity (UI-02)", () => {
  const enKeys = leafPaths(en);
  const zhKeys = leafPaths(zhTW);

  it("en.json and zh-TW.json expose the identical set of keys", () => {
    const missingInZh = enKeys.filter((k) => !zhKeys.includes(k));
    const missingInEn = zhKeys.filter((k) => !enKeys.includes(k));
    expect(missingInZh, "keys present in en.json but missing in zh-TW.json").toEqual([]);
    expect(missingInEn, "keys present in zh-TW.json but missing in en.json").toEqual([]);
  });

  it("every leaf value is a non-empty string in both locales", () => {
    for (const src of [en, zhTW]) {
      for (const path of leafPaths(src)) {
        const value = path
          .split(".")
          .reduce((acc, seg) => acc[seg], src);
        expect(typeof value, `${path} must be a string`).toBe("string");
        expect(value.length, `${path} must be non-empty`).toBeGreaterThan(0);
      }
    }
  });
});
