import { useContext } from "react";
import type { AuthUser } from "@workspace/api-client-react";
import { AuthContext } from "./auth-context";

export type { AuthUser };

/**
 * useAuth() — consumes the global AuthContext provided by AuthProvider.
 * Must be used inside an AuthProvider; throws otherwise.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
