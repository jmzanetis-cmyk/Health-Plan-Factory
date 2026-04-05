import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

function getApiUrl(path: string): string {
  return `${BASE_URL}api${path}`.replace(/\/+/g, "/");
}

export default function SignIn() {
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const { t } = useTranslation();
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
            {t("signIn.title")}
          </h1>
          <p className="text-sm font-light" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            {t("signIn.sub")}
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)", boxShadow: "0 8px 32px rgba(212,34,126,0.08)" }}>
          {error && (
            <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(220,38,38,0.06)", color: "#b91c1c", fontFamily: "var(--app-font-sans)", border: "1px solid rgba(220,38,38,0.15)" }}>
              {error === "github_oauth_failed"
                ? t("signIn.githubError")
                : error === "github_not_configured"
                ? t("signIn.githubNotConfigured")
                : t("signIn.genericError")}
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
            {t("signIn.title")} →
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "rgba(212,34,126,0.08)" }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs" style={{ background: "white", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                {t("common.or")}
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
            {t("signIn.continueWithGitHub")}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "rgba(212,34,126,0.08)" }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs" style={{ background: "white", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                {t("signIn.noAccount")}
              </span>
            </div>
          </div>

          <p className="text-center text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            <button
              onClick={() => login()}
              className="font-semibold"
              style={{ color: "var(--hpf-crimson)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
            >
              {t("signIn.signUp")} →
            </button>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          By continuing, you agree to our{" "}
          <a href="/terms" className="no-underline" style={{ color: "var(--hpf-crimson)" }}>Terms</a>
          {" "}{t("common.and")}{" "}
          <a href="/privacy" className="no-underline" style={{ color: "var(--hpf-crimson)" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
