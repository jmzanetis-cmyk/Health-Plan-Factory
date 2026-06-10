import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";

type Role = "member" | "provider";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export default function SignUp() {
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedRole, setSelectedRole] = useState<Role>("member");
  const [employerCode, setEmployerCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const MEMBER_FEATURES = t("signUp.memberFeatures", {
    returnObjects: true,
  }) as string[];
  const PROVIDER_FEATURES = t("signUp.providerFeatures", {
    returnObjects: true,
  }) as string[];

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const dest =
        user?.role === "admin"
          ? "/admin/dashboard"
          : user?.role === "provider"
            ? "/provider/dashboard"
            : "/onboarding";
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (employerCode.trim()) {
      sessionStorage.setItem(
        "hpf_employer_code",
        employerCode.trim().toUpperCase(),
      );
    }

    const budget = searchParams.get("budget");
    const conditions = searchParams.get("conditions");
    const goals = searchParams.get("goals");
    if (budget || conditions || goals) {
      const prefill: Record<string, string> = {};
      if (budget) prefill.budget = budget;
      if (conditions) prefill.conditions = conditions;
      if (goals) prefill.goals = goals;
      sessionStorage.setItem("hpf_speculator_prefill", JSON.stringify(prefill));
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        user?: { role?: string };
        access_token?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        setFormError(data.error ?? "Sign up failed — please try again");
        setSubmitting(false);
        return;
      }

      if (data.message) {
        // Email confirmation required
        setConfirmationSent(true);
        setSubmitting(false);
        return;
      }

      if (data.access_token) {
        localStorage.setItem("sb-access-token", data.access_token);
      }

      // Sign in immediately so auth context picks up the new user
      const { error: loginErr } = await login(email.trim(), password);
      if (loginErr) {
        setFormError(loginErr);
        setSubmitting(false);
        return;
      }

      const destination =
        selectedRole === "provider" ? "/provider/signup" : "/onboarding";
      navigate(destination, { replace: true });
    } catch {
      setFormError("Network error — please try again");
      setSubmitting(false);
    }
  }

  const features =
    selectedRole === "provider" ? PROVIDER_FEATURES : MEMBER_FEATURES;

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
            {t("signUp.title")}
          </h1>
          <p
            className="text-sm font-light"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            {t("signUp.sub")}
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
          {confirmationSent ? (
            <div
              className="rounded-lg px-4 py-5 text-sm text-center"
              style={{
                background: "rgba(125,181,92,0.08)",
                color: "var(--sage)",
                border: "1px solid rgba(125,181,92,0.2)",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              <p className="font-semibold mb-1">Check your inbox!</p>
              <p>
                We sent a confirmation link to <strong>{email}</strong>. Click
                it to activate your account, then sign in.
              </p>
              <Link
                to="/sign-in"
                className="inline-block mt-3 font-semibold"
                style={{ color: "var(--hpf-crimson)", textDecoration: "none" }}
              >
                Go to Sign In →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleContinue} className="flex flex-col gap-4">
              {/* Role selector */}
              <div className="grid grid-cols-2 gap-3">
                {(["member", "provider"] as Role[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className="relative flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all"
                    style={{
                      border:
                        selectedRole === role
                          ? "2px solid var(--hpf-pink)"
                          : "2px solid rgba(212,34,126,0.12)",
                      background:
                        selectedRole === role
                          ? "rgba(212,34,126,0.04)"
                          : "white",
                      cursor: "pointer",
                      fontFamily: "var(--app-font-sans)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          selectedRole === role
                            ? "var(--hpf-pink)"
                            : "rgba(212,34,126,0.06)",
                      }}
                    >
                      {role === "member" ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                            stroke={
                              selectedRole === role ? "white" : "var(--hpf-pink)"
                            }
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <circle
                            cx="12"
                            cy="7"
                            r="4"
                            stroke={
                              selectedRole === role ? "white" : "var(--hpf-pink)"
                            }
                            strokeWidth="2"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                            stroke={
                              selectedRole === role ? "white" : "var(--hpf-pink)"
                            }
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <polyline
                            points="9,22 9,12 15,12 15,22"
                            stroke={
                              selectedRole === role ? "white" : "var(--hpf-pink)"
                            }
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className="text-sm font-semibold capitalize"
                      style={{ color: "var(--hpf-pink)" }}
                    >
                      {role === "member"
                        ? t("signUp.memberTab")
                        : t("signUp.providerTab")}
                    </span>
                    {selectedRole === role && (
                      <div
                        className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: "var(--hpf-pink)" }}
                      >
                        <svg
                          width="8"
                          height="6"
                          viewBox="0 0 8 6"
                          fill="none"
                        >
                          <path
                            d="M1 3L3 5L7 1"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Features list */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: "rgba(125,181,92,0.06)",
                  border: "1px solid rgba(125,181,92,0.12)",
                }}
              >
                <div className="flex flex-col gap-2">
                  {features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--sage)" }}
                      >
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path
                            d="M1 3L3 5L7 1"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <span
                        className="text-xs"
                        style={{
                          color: "var(--hpf-pink)",
                          fontFamily: "var(--app-font-sans)",
                        }}
                      >
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-semibold mb-1"
                  style={{
                    color: "var(--hpf-pink)",
                    fontFamily: "var(--app-font-sans)",
                  }}
                >
                  Full name <span style={{ color: "var(--text-muted)" }}>(optional)</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm"
                  style={{
                    border: "1.5px solid rgba(212,34,126,0.15)",
                    fontFamily: "var(--app-font-sans)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="signupEmail"
                  className="block text-xs font-semibold mb-1"
                  style={{
                    color: "var(--hpf-pink)",
                    fontFamily: "var(--app-font-sans)",
                  }}
                >
                  Email
                </label>
                <input
                  id="signupEmail"
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

              {/* Password */}
              <div>
                <label
                  htmlFor="signupPassword"
                  className="block text-xs font-semibold mb-1"
                  style={{
                    color: "var(--hpf-pink)",
                    fontFamily: "var(--app-font-sans)",
                  }}
                >
                  Password <span style={{ color: "var(--text-muted)" }}>(min 6 chars)</span>
                </label>
                <input
                  id="signupPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
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

              {/* Employer invite code — member sign-up only */}
              {selectedRole === "member" && (
                <div>
                  <label
                    htmlFor="employerCode"
                    className="block text-xs font-semibold mb-1.5"
                    style={{
                      color: "var(--hpf-pink)",
                      fontFamily: "var(--app-font-sans)",
                    }}
                  >
                    {t("signUp.employerCodeLabel")}
                  </label>
                  <div className="relative">
                    <input
                      id="employerCode"
                      type="text"
                      value={employerCode}
                      onChange={(e) =>
                        setEmployerCode(e.target.value.toUpperCase())
                      }
                      placeholder={t("signUp.employerCodePlaceholder")}
                      maxLength={20}
                      spellCheck={false}
                      autoComplete="off"
                      className="w-full px-4 py-2.5 rounded-lg text-sm tracking-widest"
                      style={{
                        border: "1.5px solid rgba(212,34,126,0.15)",
                        fontFamily: "var(--app-font-sans)",
                        color: "var(--hpf-pink)",
                        outline: "none",
                        background: employerCode
                          ? "rgba(224,32,64,0.04)"
                          : "white",
                      }}
                    />
                    {employerCode && (
                      <div
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "var(--hpf-crimson)" }}
                      >
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path
                            d="M1 3L3 5L7 1"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formError && (
                <div
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{
                    background: "rgba(220,38,38,0.06)",
                    color: "#b91c1c",
                    fontFamily: "var(--app-font-sans)",
                    border: "1px solid rgba(220,38,38,0.15)",
                  }}
                >
                  {formError}
                </div>
              )}

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
                Create account →
              </button>
            </form>
          )}

          <p
            className="text-center text-xs mt-4 leading-relaxed"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            By continuing you agree to our{" "}
            <a
              href="/terms"
              className="no-underline"
              style={{ color: "var(--hpf-crimson)" }}
            >
              Terms
            </a>{" "}
            {t("common.and")}{" "}
            <a
              href="/privacy"
              className="no-underline"
              style={{ color: "var(--hpf-crimson)" }}
            >
              Privacy Policy
            </a>
            .
          </p>

          <p
            className="text-center text-xs mt-3"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            {t("signUp.haveAccount")}{" "}
            <Link
              to="/sign-in"
              className="font-semibold no-underline"
              style={{ color: "var(--hpf-crimson)" }}
            >
              {t("signUp.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
