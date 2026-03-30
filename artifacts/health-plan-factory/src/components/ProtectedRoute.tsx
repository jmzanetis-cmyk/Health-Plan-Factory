import { Link } from "react-router-dom";

interface ProtectedRouteProps {
  role?: "member" | "provider" | "admin";
  children: React.ReactNode;
}

export function ProtectedRoute({ role = "member", children }: ProtectedRouteProps) {
  const isAuthenticated = false;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-5">🔒</div>
          <h2 className="mb-3" style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.75rem", fontWeight: 700, color: "var(--navy)" }}>
            Sign in to access
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            {role === "admin"
              ? "This page is for platform administrators only."
              : role === "provider"
              ? "This area is for registered providers. Sign in or apply to join."
              : "Create a free account to access your personalized wellness plan."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/sign-in"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold no-underline text-white"
              style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
            >
              Sign in
            </Link>
            {role !== "admin" && (
              <Link
                to={role === "provider" ? "/provider/signup" : "/sign-up"}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold no-underline"
                style={{ border: "1.5px solid var(--navy)", color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
              >
                {role === "provider" ? "Apply as provider" : "Create free account"}
              </Link>
            )}
          </div>
          <p className="mt-5 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Authentication will be enabled in an upcoming release.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
