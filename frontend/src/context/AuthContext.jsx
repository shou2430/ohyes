import { useCallback, useEffect, useState } from "react";
import { AuthContext } from "./auth-context";
import { API_URL, TOKEN_KEY, authHeaders, fetchCurrentUser } from "./auth-api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      // login() may store a newer token while this check is in flight; its
      // result then wins, so don't overwrite it with this stale one.
      const isCurrent = () => localStorage.getItem(TOKEN_KEY) === token;
      try {
        const me = await fetchCurrentUser(token);
        if (isCurrent()) setUser(me);
      } catch {
        if (isCurrent()) setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Called by AuthCallbackPage: the provider's mount-time check already ran
  // (with no token), so the new token must be verified explicitly.
  const login = useCallback(async (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    const me = await fetchCurrentUser(token);
    setUser(me);
    setLoading(false);
    return me;
  }, []);

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: authHeaders(),
      });
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
