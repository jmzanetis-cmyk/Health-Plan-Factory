import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@workspace/replit-auth-web";

export default function SignIn() {
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const dest =
        user?.role === "admin" ? "/admin/dashboard" :
        user?.role === "provider" ? "/provider/dashboard" : returnTo;
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user, returnTo]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: "var(--warm-white)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo variant="auth" />
          </div>
          <h1 className="mb-2" style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>
            Welcome back
          </h1>
          <p className="text-sm font-light" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Sign in to your Health Plan Factory account
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)", boxShadow: "0 8px 32px rgba(27,45,79,0.08)" }}>
          <button
            onClick={() => login()}
            disabled={isLoading}
            className="w-full py-3.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-3"
            style={{
              background: isLoading ? "rgba(27,45,79,0.4)" : "var(--navy)",
              fontFamily: "var(--app-font-sans)",
              cursor: isLoading ? "not-allowed" : "pointer",
              border: "none",
            }}
          >
            {isLoading ? (
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.9"/>
                <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.6"/>
                <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.6"/>
                <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.9"/>
              </svg>
            )}
            Continue with Replit
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "rgba(27,45,79,0.08)" }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs" style={{ background: "white", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                New here?
              </span>
            </div>
          </div>

          <p className="text-center text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            No account needed —{" "}
            <button
              onClick={() => login()}
              className="font-semibold"
              style={{ color: "var(--hpf-amber)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
            >
              create one for free →
            </button>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          By continuing, you agree to our{" "}
          <a href="/terms" className="no-underline" style={{ color: "var(--hpf-amber)" }}>Terms</a>
          {" "}and{" "}
          <a href="/privacy" className="no-underline" style={{ color: "var(--hpf-amber)" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
