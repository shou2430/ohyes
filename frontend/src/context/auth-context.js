import { createContext, useContext } from "react";

// Context object + hook live here (not AuthContext.jsx) so the provider file
// only exports a component — satisfies react-refresh/only-export-components.
export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
