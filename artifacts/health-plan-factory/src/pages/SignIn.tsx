import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@workspace/replit-auth-web";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

function getApiUrl(path: string): string {
  return `${BASE_URL}api${path}`.replace(/\/+/g, "/");
}

export default function SignIn() {
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";
  const error = searchParams.get("error");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const dest =
        user?.role === "admin" ? "/admin/dashboard" :
        user?.role === "provider" ? "/provider/dashboard" : returnTo;
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user, returnTo]);

  function handleGitHubLogin() {
    const url = new URL(getApiUrl("/auth/github/login"), window.location.origin);
    if (returnTo) url.searchParams.set("returnTo", returnTo);
    window.location.href = url.href;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: "var(--warm-white)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo variant="auth" />
          </div>
          <h1 className="mb-2" style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)" }}>
            Welcome back
          </h1>
          <p className="text-sm font-light" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Sign in to your Health Plan Factory account
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)", boxShadow: "0 8px 32px rgba(212,34,126,0.08)" }}>
          {error && (
            <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(220,38,38,0.06)", color: "#b91c1c", fontFamily: "var(--app-font-sans)", border: "1px solid rgba(220,38,38,0.15)" }}>
              {error === "github_oauth_failed"
                ? "GitHub sign-in failed. Please try again."
                : error === "github_not_configured"
                ? "GitHub sign-in is not available right now."
                : "Something went wrong. Please try again."}
            </div>
          )}

          <button
            onClick={() => login()}
            disabled={isLoading}
            className="w-full py-3.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-3"
            style={{
              background: isLoading ? "rgba(212,34,126,0.4)" : "var(--hpf-pink)",
              fontFamily: "var(--app-font-sans)",
              cursor: isLoading ? "not-allowed" : "pointer",
              border: "none",
            }}
          >
            {isLoading ? (
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
            ) : null}
            Sign in to Health Plan Factory →
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "rgba(212,34,126,0.08)" }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs" style={{ background: "white", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                or
              </span>
            </div>
          </div>

          <button
            onClick={handleGitHubLogin}
            disabled={isLoading}
            className="w-full py-3.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-3"
            style={{
              background: "white",
              color: isLoading ? "rgba(212,34,126,0.4)" : "#24292f",
              fontFamily: "var(--app-font-sans)",
              cursor: isLoading ? "not-allowed" : "pointer",
              border: "1px solid rgba(212,34,126,0.18)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
            Continue with GitHub
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "rgba(212,34,126,0.08)" }} />
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
              style={{ color: "var(--hpf-crimson)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
            >
              create one for free →
            </button>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          By continuing, you agree to our{" "}
          <a href="/terms" className="no-underline" style={{ color: "var(--hpf-crimson)" }}>Terms</a>
          {" "}and{" "}
          <a href="/privacy" className="no-underline" style={{ color: "var(--hpf-crimson)" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
