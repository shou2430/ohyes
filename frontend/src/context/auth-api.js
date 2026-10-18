export const TOKEN_KEY = "ohyes_token";
export const API_URL = import.meta.env.VITE_API_URL || "";

export function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// Returns the user for `token`, or null if the backend rejects it. A rejected
// token is removed only if it is still the stored one, so a slow 401 for an old
// token can't wipe a token that was stored after the request started.
// Network errors propagate to the caller.
export async function fetchCurrentUser(token) {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) return res.json();
  if (localStorage.getItem(TOKEN_KEY) === token) {
    localStorage.removeItem(TOKEN_KEY);
  }
  return null;
}
