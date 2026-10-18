import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TOKEN_KEY, fetchCurrentUser } from "./auth-api.js";

// Plain-object localStorage stub (no jsdom), same approach as i18n/init.test.js.
let store;
beforeEach(() => {
  store = {};
  vi.stubGlobal("localStorage", {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = v;
    },
    removeItem: (k) => {
      delete store[k];
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

function mockFetch(response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("fetchCurrentUser", () => {
  it("sends the given token and returns the user", async () => {
    const user = { id: 1, email: "a@b.c" };
    const fetchFn = mockFetch({ ok: true, json: async () => user });

    await expect(fetchCurrentUser("tok")).resolves.toEqual(user);
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/me$/),
      { headers: { Authorization: "Bearer tok" } }
    );
  });

  it("returns null and clears the stored token when rejected", async () => {
    store[TOKEN_KEY] = "tok";
    mockFetch({ ok: false });

    await expect(fetchCurrentUser("tok")).resolves.toBeNull();
    expect(store[TOKEN_KEY]).toBeUndefined();
  });

  it("keeps a newer stored token when an old token is rejected", async () => {
    store[TOKEN_KEY] = "new";
    mockFetch({ ok: false });

    await expect(fetchCurrentUser("old")).resolves.toBeNull();
    expect(store[TOKEN_KEY]).toBe("new");
  });

  it("propagates network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(fetchCurrentUser("tok")).rejects.toThrow("offline");
  });
});
