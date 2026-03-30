import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@workspace/replit-auth-web";

export default function SignUp() {
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const dest =
        user?.role === "admin" ? "/admin/dashboard" :
        user?.role === "provider" ? "/provider/dashboard" : "/onboarding";
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: "var(--warm-white)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo variant="auth" />
          </div>
          <h1 className="mb-2" style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>
            Build your plan free
          </h1>
          <p className="text-sm font-light" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            No credit card required. Takes about 5 minutes.
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)", boxShadow: "0 8px 32px rgba(27,45,79,0.08)" }}>
          <div className="mb-6 p-4 rounded-xl" style={{ background: "rgba(61,107,82,0.06)", border: "1px solid rgba(61,107,82,0.12)" }}>
            <div className="flex flex-col gap-2">
              {["AI-powered personalized health plan", "Budget-aware provider matching", "Progress tracking & accountability coach"].map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--sage)" }}>
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span className="text-xs" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={login}
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
            Get started with Replit →
          </button>

          <p className="text-center text-xs mt-4 leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            By continuing you agree to our{" "}
            <a href="/terms" className="no-underline" style={{ color: "var(--hpf-amber)" }}>Terms</a> and{" "}
            <a href="/privacy" className="no-underline" style={{ color: "var(--hpf-amber)" }}>Privacy Policy</a>.
          </p>

          <p className="text-center text-xs mt-3" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Already have an account?{" "}
            <button onClick={login} className="font-semibold" style={{ color: "var(--hpf-amber)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}
