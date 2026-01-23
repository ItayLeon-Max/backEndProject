import React, { createContext, useContext, useMemo, useState } from "react";

type AuthState = {
  token: string;
  setToken: (t: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string>(() => localStorage.getItem("jwt") ?? "");

  const setToken = (t: string) => {
    setTokenState(t);
    if (t) localStorage.setItem("jwt", t);
    else localStorage.removeItem("jwt");
  };

  const logout = () => setToken("");

  const value = useMemo(() => ({ token, setToken, logout }), [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}