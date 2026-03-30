import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (returnTo?: string) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

async function fetchAuthUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/user", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json() as { user: AuthUser | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const u = await fetchAuthUser();
    setUser(u);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAuthUser().then((u) => {
      if (!cancelled) {
        setUser(u);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback((returnTo?: string) => {
    const dest =
      returnTo ??
      (typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/");
    window.location.href = `/api/login?returnTo=${encodeURIComponent(dest)}`;
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
}
