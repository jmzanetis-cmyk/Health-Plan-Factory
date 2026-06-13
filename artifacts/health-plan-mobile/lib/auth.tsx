import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { changeLanguage } from "@/lib/i18n";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://api.healthplanfactory.com";

const TOKEN_KEY = "hpf_access_token";
const REFRESH_KEY = "hpf_refresh_token";

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => {},
  signInWithMagicLink: async () => {},
  signOut: async () => {},
  refreshSession: async () => {},
  getToken: async () => null,
});

async function storeTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
  ]);
}

async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getToken = useCallback(async () => {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }, []);

  const doRefreshSession = useCallback(async (): Promise<string> => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!refreshToken) throw new Error("No refresh token");

    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) throw new Error("Session refresh failed");

    const data = await res.json();
    await storeTokens(data.access_token, data.refresh_token);
    return data.access_token as string;
  }, []);

  const doSignOut = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        await fetch(`${API_BASE_URL}/api/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // best-effort logout call
    } finally {
      await clearTokens();
      setUser(null);
    }
  }, []);

  const fetchAndSetUser = useCallback(async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let res = await fetch(`${API_BASE_URL}/api/auth/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      try {
        const newToken = await doRefreshSession();
        res = await fetch(`${API_BASE_URL}/api/auth/user`, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
      } catch {
        await clearTokens();
        setUser(null);
        setIsLoading(false);
        return;
      }
    }

    if (!res.ok) {
      await clearTokens();
      setUser(null);
      setIsLoading(false);
      return;
    }

    const data = await res.json();
    if (data.user) {
      setUser(data.user);
      // Restore server-side language preference (cross-device sync)
      try {
        const currentToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const profRes = await fetch(`${API_BASE_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        const profData = await profRes.json();
        const serverLang = profData?.language;
        if (serverLang === "en" || serverLang === "es") {
          await changeLanguage(serverLang);
        }
      } catch {
        // non-blocking — language restore is supplementary
      }
    } else {
      await clearTokens();
      setUser(null);
    }
    setIsLoading(false);
  }, [doRefreshSession]);

  useEffect(() => {
    fetchAndSetUser();
  }, [fetchAndSetUser]);

  // Passive token refresh every 50 minutes to stay ahead of the 60-minute expiry
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        await doRefreshSession();
      } catch {
        // silently fail — next 401 will trigger a fresh sign-in
      }
    }, 50 * 60 * 1000);
    return () => clearInterval(id);
  }, [doRefreshSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { message?: string }).message ?? "Sign in failed"
      );
    }

    const data = await res.json();
    await storeTokens(data.access_token, data.refresh_token);
    setUser(data.user);
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { message?: string }).message ?? "Failed to send magic link"
      );
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signInWithMagicLink,
        signOut: doSignOut,
        refreshSession: async () => { await doRefreshSession(); },
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
