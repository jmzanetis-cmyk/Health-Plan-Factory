import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import type { AuthUser } from "@workspace/replit-auth-web";

type AllowedRole = "member" | "provider" | "admin" | "employer";

interface ProtectedRouteProps {
  role?: AllowedRole;
  children: React.ReactNode;
}

function hasRequiredRole(user: AuthUser | null, required: AllowedRole): boolean {
  if (!user) return false;
  if (required === "member") return true;
  if (required === "admin") return user.role === "admin";
  if (required === "provider") return user.role === "provider" || user.role === "admin";
  if (required === "employer") return user.role === "employer" || user.role === "admin";
  return false;
}

function roleFallback(user: AuthUser | null, required: AllowedRole): string {
  if (required === "admin") return user?.role === "provider" ? "/provider/dashboard" : "/dashboard";
  if (required === "provider") return "/provider/signup";
  if (required === "employer") return "/employer";
  return "/dashboard";
}

export function ProtectedRoute({ role = "member", children }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--navy)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/sign-in?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!hasRequiredRole(user, role)) {
    return <Navigate to={roleFallback(user, role)} replace />;
  }

  return <>{children}</>;
}
