import { describe, it, expect, afterEach, vi } from "vitest";

// The i18n module reads localStorage + document at import time and resolves the
// initial language via an allow-list. We stub both browser globals (no jsdom
// needed) and re-import the module fresh per case to exercise resolveInitialLanguage.
async function loadWith(storedLang) {
  vi.resetModules();
  const store = {};
  if (storedLang !== undefined) store.ohyes_lang = storedLang;
  const doc = { documentElement: {} };
  vi.stubGlobal("localStorage", {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = v;
    },
  });
  vi.stubGlobal("document", doc);
  const mod = await import("./index.js");
  return { i18n: mod.default, doc, store };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// UI-02 default + T-05-01 allow-list mitigation: language resolves ONLY from the
// persisted key validated against {en, zh-TW}, else falls back to zh-TW.
describe("i18n initial language resolution (UI-02 / T-05-01)", () => {
  it("defaults to zh-TW when nothing is stored (D-03)", async () => {
    const { i18n, doc } = await loadWith(undefined);
    expect(i18n.options.lng).toBe("zh-TW");
    expect(doc.documentElement.lang).toBe("zh-TW");
  });

  it("honors a valid stored 'en'", async () => {
    const { i18n, doc } = await loadWith("en");
    expect(i18n.options.lng).toBe("en");
    expect(doc.documentElement.lang).toBe("en");
  });

  it("honors a valid stored 'zh-TW'", async () => {
    const { i18n } = await loadWith("zh-TW");
    expect(i18n.options.lng).toBe("zh-TW");
  });

  it("falls back to zh-TW on a tampered/unknown stored value (T-05-01)", async () => {
    const { i18n, doc } = await loadWith("fr");
    expect(i18n.options.lng).toBe("zh-TW");
    expect(doc.documentElement.lang).toBe("zh-TW");
  });
});

describe("i18n configuration (UI-02)", () => {
  it("registers exactly the en and zh-TW resource bundles", async () => {
    const { i18n } = await loadWith("en");
    expect(Object.keys(i18n.options.resources).sort()).toEqual(["en", "zh-TW"]);
  });

  it("uses en as the fallback language", async () => {
    const { i18n } = await loadWith("en");
    const fallback = i18n.options.fallbackLng;
    const flat = Array.isArray(fallback) ? fallback : [fallback];
    expect(flat).toContain("en");
  });

  it("persists + syncs html lang on languageChanged", async () => {
    const { i18n, doc, store } = await loadWith("en");
    await i18n.changeLanguage("zh-TW");
    expect(store.ohyes_lang).toBe("zh-TW");
    expect(doc.documentElement.lang).toBe("zh-TW");
  });
});
