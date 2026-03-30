import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function SignUp() {
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
          <div className="flex flex-col gap-4 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>First name</label>
                <input type="text" placeholder="Alex" className="w-full px-4 py-3 rounded-lg text-sm border outline-none" style={{ border: "1px solid rgba(27,45,79,0.15)", background: "var(--warm-white)", color: "var(--navy)", fontFamily: "var(--app-font-sans)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>Last name</label>
                <input type="text" placeholder="Smith" className="w-full px-4 py-3 rounded-lg text-sm border outline-none" style={{ border: "1px solid rgba(27,45,79,0.15)", background: "var(--warm-white)", color: "var(--navy)", fontFamily: "var(--app-font-sans)" }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>Email address</label>
              <input type="email" placeholder="you@example.com" className="w-full px-4 py-3 rounded-lg text-sm border outline-none" style={{ border: "1px solid rgba(27,45,79,0.15)", background: "var(--warm-white)", color: "var(--navy)", fontFamily: "var(--app-font-sans)" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>Password</label>
              <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-lg text-sm border outline-none" style={{ border: "1px solid rgba(27,45,79,0.15)", background: "var(--warm-white)", color: "var(--navy)", fontFamily: "var(--app-font-sans)" }} />
            </div>
          </div>

          <button className="w-full py-3.5 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
            Create account & build my plan →
          </button>

          <p className="text-center text-xs mt-4 leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            By creating an account you agree to our{" "}
            <Link to="/terms" className="no-underline" style={{ color: "var(--hpf-amber)", textDecoration: "underline" }}>Terms</Link> and{" "}
            <Link to="/privacy" className="no-underline" style={{ color: "var(--hpf-amber)", textDecoration: "underline" }}>Privacy Policy</Link>.
          </p>

          <p className="text-center text-xs mt-4" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Already have an account?{" "}
            <Link to="/sign-in" className="no-underline font-semibold" style={{ color: "var(--hpf-amber)" }}>Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          Authentication coming soon — this is a preview stub.
        </p>
      </div>
    </div>
  );
}
