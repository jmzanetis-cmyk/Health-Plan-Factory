import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@workspace/replit-auth-web";

type Role = "member" | "provider";

const MEMBER_FEATURES = [
  "AI-powered personalized health plan",
  "Budget-aware provider matching",
  "Progress tracking & accountability coach",
];

const PROVIDER_FEATURES = [
  "Get discovered by health-motivated members",
  "Receive qualified leads in your specialty",
  "0% commission for founding providers (90 days)",
];

export default function SignUp() {
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role>("member");
  const [employerCode, setEmployerCode] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const dest =
        user?.role === "admin" ? "/admin/dashboard" :
        user?.role === "provider" ? "/provider/dashboard" : "/onboarding";
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const handleContinue = () => {
    if (selectedRole === "provider") {
      login("/provider/signup");
    } else {
      // Persist invite code so it can be redeemed after OAuth completes
      if (employerCode.trim()) {
        sessionStorage.setItem("hpf_employer_code", employerCode.trim().toUpperCase());
      }
      login("/onboarding");
    }
  };

  const features = selectedRole === "provider" ? PROVIDER_FEATURES : MEMBER_FEATURES;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: "var(--warm-white)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo variant="auth" />
          </div>
          <h1 className="mb-2" style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)" }}>
            Get started free
          </h1>
          <p className="text-sm font-light" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Choose how you'd like to use Health Plan Factory
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)", boxShadow: "0 8px 32px rgba(212,34,126,0.08)" }}>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(["member", "provider"] as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className="relative flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all"
                style={{
                  border: selectedRole === role ? "2px solid var(--hpf-pink)" : "2px solid rgba(212,34,126,0.12)",
                  background: selectedRole === role ? "rgba(212,34,126,0.04)" : "white",
                  cursor: "pointer",
                  fontFamily: "var(--app-font-sans)",
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: selectedRole === role ? "var(--hpf-pink)" : "rgba(212,34,126,0.06)" }}>
                  {role === "member" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={selectedRole === role ? "white" : "var(--hpf-pink)"} strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="7" r="4" stroke={selectedRole === role ? "white" : "var(--hpf-pink)"} strokeWidth="2"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={selectedRole === role ? "white" : "var(--hpf-pink)"} strokeWidth="2" strokeLinecap="round"/>
                      <polyline points="9,22 9,12 15,12 15,22" stroke={selectedRole === role ? "white" : "var(--hpf-pink)"} strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm font-semibold capitalize" style={{ color: "var(--hpf-pink)" }}>{role}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {role === "member" ? "Get a health plan" : "List my practice"}
                </span>
                {selectedRole === role && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--hpf-pink)" }}>
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Features list */}
          <div className="mb-6 p-4 rounded-xl" style={{ background: "rgba(125,181,92,0.06)", border: "1px solid rgba(125,181,92,0.12)" }}>
            <div className="flex flex-col gap-2">
              {features.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--sage)" }}>
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span className="text-xs" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Employer invite code — member sign-up only */}
          {selectedRole === "member" && (
            <div className="mb-5">
              <label
                htmlFor="employerCode"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
              >
                Employer invite code <span className="font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span>
              </label>
              <div className="relative">
                <input
                  id="employerCode"
                  type="text"
                  value={employerCode}
                  onChange={(e) => setEmployerCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ACME-4B2Z"
                  maxLength={20}
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full px-4 py-2.5 rounded-lg text-sm tracking-widest"
                  style={{
                    border: "1.5px solid rgba(212,34,126,0.15)",
                    fontFamily: "var(--app-font-sans)",
                    color: "var(--hpf-pink)",
                    outline: "none",
                    background: employerCode ? "rgba(224,32,64,0.04)" : "white",
                  }}
                />
                {employerCode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--hpf-crimson)" }}>
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                Your employer covers wellness sessions up to your monthly stipend limit.
              </p>
            </div>
          )}

          <button
            onClick={handleContinue}
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
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.9"/>
                <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.6"/>
                <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.6"/>
                <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.9"/>
              </svg>
            )}
            Continue with Replit →
          </button>

          <p className="text-center text-xs mt-4 leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            By continuing you agree to our{" "}
            <a href="/terms" className="no-underline" style={{ color: "var(--hpf-crimson)" }}>Terms</a> and{" "}
            <a href="/privacy" className="no-underline" style={{ color: "var(--hpf-crimson)" }}>Privacy Policy</a>.
          </p>

          <p className="text-center text-xs mt-3" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Already have an account?{" "}
            <Link to="/sign-in" className="font-semibold no-underline" style={{ color: "var(--hpf-crimson)" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
