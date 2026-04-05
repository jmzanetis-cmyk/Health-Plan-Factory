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

export interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Base URL of the API server.
   * In development (same-origin): leave undefined or pass "".
   * In production (cross-origin Netlify → Replit): pass VITE_API_BASE_URL,
   * e.g. "https://my-api.replit.app"
   */
  apiBase?: string;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children, apiBase = "" }: AuthProviderProps) {
  const base = apiBase.replace(/\/+$/, "");

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = await fetch(`${base}/api/auth/user`, { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json() as { user: AuthUser | null };
      return data.user ?? null;
    } catch {
      return null;
    }
  }, [base]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const u = await fetchUser();
    setUser(u);
    setIsLoading(false);
  }, [fetchUser]);

  useEffect(() => {
    let cancelled = false;
    fetchUser().then((u) => {
      if (!cancelled) {
        setUser(u);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [fetchUser]);

  const login = useCallback((returnTo?: string) => {
    const path =
      returnTo ??
      (typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/");

    // Always build an absolute returnTo so the API server can redirect back to
    // the correct frontend origin after OAuth (works for both same-origin dev
    // and cross-origin Netlify → Replit production).
    const absoluteReturnTo =
      typeof window !== "undefined"
        ? new URL(path.startsWith("/") ? path : `/${path}`, window.location.origin).href
        : path;

    window.location.href = `${base}/api/login?returnTo=${encodeURIComponent(absoluteReturnTo)}`;
  }, [base]);

  const logout = useCallback(() => {
    window.location.href = `${base}/api/logout`;
  }, [base]);

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
