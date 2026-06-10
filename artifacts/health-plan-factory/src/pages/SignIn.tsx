import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

function getApiUrl(path: string): string {
  return `${BASE_URL}api${path}`.replace(/\/+/g, "/");
}

export default function SignIn() {
  const { login, loginWithMagicLink, isAuthenticated, isLoading, user } =
    useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const dest =
        user?.role === "admin"
          ? "/admin/dashboard"
          : user?.role === "provider"
            ? "/provider/dashboard"
            : returnTo;
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user, returnTo]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const { error: err } = await login(email.trim(), password);
    setSubmitting(false);
    if (err) setFormError(err);
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setFormError("Enter your email address first.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    const { error: err } = await loginWithMagicLink(email.trim());
    setSubmitting(false);
    if (err) setFormError(err);
    else setMagicSent(true);
  }

  function handleGitHubLogin() {
    const url = new URL(getApiUrl("/auth/github/login"), window.location.origin);
    if (returnTo) url.searchParams.set("returnTo", returnTo);
    window.location.href = url.href;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo variant="auth" />
          </div>
          <h1
            className="mb-2"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "2rem",
              fontWeight: 700,
              color: "var(--hpf-deep)",
            }}
          >
            {t("signIn.title")}
          </h1>
          <p
            className="text-sm font-light"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            {t("signIn.sub")}
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: "white",
            border: "1px solid rgba(212,34,126,0.08)",
            boxShadow: "0 8px 32px rgba(212,34,126,0.08)",
          }}
        >
          {(error || formError) && (
            <div
              className="mb-4 rounded-lg px-4 py-3 text-sm"
              style={{
                background: "rgba(220,38,38,0.06)",
                color: "#b91c1c",
                fontFamily: "var(--app-font-sans)",
                border: "1px solid rgba(220,38,38,0.15)",
              }}
            >
              {formError ??
                (error === "github_oauth_failed"
                  ? t("signIn.githubError")
                  : error === "github_not_configured"
                    ? t("signIn.githubNotConfigured")
                    : t("signIn.genericError"))}
            </div>
          )}

          {magicSent ? (
            <div
              className="rounded-lg px-4 py-3 text-sm text-center"
              style={{
                background: "rgba(125,181,92,0.08)",
                color: "var(--sage)",
                border: "1px solid rgba(125,181,92,0.2)",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              Check your inbox — we sent a magic link to <strong>{email}</strong>.
            </div>
          ) : (
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold mb-1"
                  style={{
                    color: "var(--hpf-pink)",
                    fontFamily: "var(--app-font-sans)",
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm"
                  style={{
                    border: "1.5px solid rgba(212,34,126,0.15)",
                    fontFamily: "var(--app-font-sans)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold mb-1"
                  style={{
                    color: "var(--hpf-pink)",
                    fontFamily: "var(--app-font-sans)",
                  }}
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm"
                  style={{
                    border: "1.5px solid rgba(212,34,126,0.15)",
                    fontFamily: "var(--app-font-sans)",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-3"
                style={{
                  background:
                    submitting || isLoading
                      ? "rgba(212,34,126,0.4)"
                      : "var(--hpf-pink)",
                  fontFamily: "var(--app-font-sans)",
                  cursor: submitting || isLoading ? "not-allowed" : "pointer",
                  border: "none",
                }}
              >
                {submitting ? (
                  <div
                    className="w-4 h-4 rounded-full border-2 animate-spin"
                    style={{
                      borderColor: "rgba(255,255,255,0.3)",
                      borderTopColor: "white",
                    }}
                  />
                ) : null}
                {t("signIn.title")} →
              </button>
            </form>
          )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div
                className="w-full border-t"
                style={{ borderColor: "rgba(212,34,126,0.08)" }}
              />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-3 text-xs"
                style={{
                  background: "white",
                  color: "var(--text-muted)",
                  fontFamily: "var(--app-font-sans)",
                }}
              >
                {t("common.or")}
              </span>
            </div>
          </div>

          {!magicSent && (
            <button
              onClick={handleMagicLink}
              disabled={submitting}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all mb-3"
              style={{
                background: "white",
                color: "var(--hpf-pink)",
                fontFamily: "var(--app-font-sans)",
                cursor: submitting ? "not-allowed" : "pointer",
                border: "1px solid rgba(212,34,126,0.25)",
              }}
            >
              Send magic link →
            </button>
          )}

          <button
            onClick={handleGitHubLogin}
            disabled={submitting || isLoading}
            className="w-full py-3.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-3"
            style={{
              background: "white",
              color: "#24292f",
              fontFamily: "var(--app-font-sans)",
              cursor: submitting || isLoading ? "not-allowed" : "pointer",
              border: "1px solid rgba(212,34,126,0.18)",
            }}
          >
            {t("signIn.continueWithGitHub")}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div
                className="w-full border-t"
                style={{ borderColor: "rgba(212,34,126,0.08)" }}
              />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-3 text-xs"
                style={{
                  background: "white",
                  color: "var(--text-muted)",
                  fontFamily: "var(--app-font-sans)",
                }}
              >
                {t("signIn.noAccount")}
              </span>
            </div>
          </div>

          <p
            className="text-center text-sm"
            style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}
          >
            <Link
              to="/sign-up"
              className="font-semibold"
              style={{
                color: "var(--hpf-crimson)",
                textDecoration: "none",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              {t("signIn.signUp")} →
            </Link>
          </p>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}
        >
          By continuing, you agree to our{" "}
          <a href="/terms" className="no-underline" style={{ color: "var(--hpf-crimson)" }}>
            Terms
          </a>{" "}
          {t("common.and")}{" "}
          <a href="/privacy" className="no-underline" style={{ color: "var(--hpf-crimson)" }}>
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
