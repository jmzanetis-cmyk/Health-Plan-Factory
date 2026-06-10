import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Sign in with email + password. Returns { error } on failure. */
  login: (email: string, password: string) => Promise<{ error?: string }>;
  /** Send a magic-link email. Returns { error } on failure. */
  loginWithMagicLink: (email: string) => Promise<{ error?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Base URL of the API server.
   * In development (same-origin): leave undefined or pass "".
   * In production (cross-origin Netlify → Railway): pass VITE_API_BASE_URL,
   * e.g. "https://api.healthplanfactory.com"
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
      const res = await fetch(`${base}/api/auth/user`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { user: AuthUser | null };
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
    return () => {
      cancelled = true;
    };
  }, [fetchUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch(`${base}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        const data = (await res.json()) as {
          user?: AuthUser;
          access_token?: string;
          refresh_token?: string;
          error?: string;
        };

        if (!res.ok || data.error) {
          return { error: data.error ?? "Sign in failed" };
        }

        if (data.access_token) {
          localStorage.setItem("sb-access-token", data.access_token);
        }

        setUser(data.user ?? null);
        return {};
      } catch {
        return { error: "Network error — please try again" };
      }
    },
    [base],
  );

  const loginWithMagicLink = useCallback(
    async (email: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch(`${base}/api/auth/magic-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        });

        const data = (await res.json()) as { message?: string; error?: string };
        if (!res.ok || data.error) {
          return { error: data.error ?? "Could not send magic link" };
        }
        return {};
      } catch {
        return { error: "Network error — please try again" };
      }
    },
    [base],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("sb-access-token");
    window.location.href = `${base}/api/logout`;
  }, [base]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithMagicLink,
        logout,
        refresh,
      }}
    >
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
