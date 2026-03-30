import { Link } from "wouter";
import { Logo } from "@/components/Logo";

export default function ProviderSignup() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-16" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo variant="auth" />
          </div>
          <h1 className="mb-2" style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>
            Provider Application
          </h1>
          <p className="text-sm font-light" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Join as a founding provider — 0% commission for your first 90 days
          </p>
        </div>

        <div className="rounded-2xl p-10 text-center" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
          <div className="text-4xl mb-4">🏭</div>
          <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
            Full provider signup flow coming soon
          </h2>
          <p className="text-sm font-light leading-relaxed mb-6 max-w-md mx-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            The multi-step provider application — with separate wellness and physician branches, credential upload, and profile creation — will be here in Task #4.
          </p>
          <p className="text-xs mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            In the meantime, reach out directly:
          </p>
          <a
            href="mailto:providers@healthplanfactory.com"
            className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-semibold no-underline"
            style={{ background: "var(--navy)", color: "white", fontFamily: "var(--app-font-sans)" }}
          >
            Email us to apply →
          </a>
        </div>

        <div className="mt-6 rounded-xl p-5" style={{ background: "var(--amber-pale)", border: "1px solid rgba(184,137,42,0.12)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
            <strong style={{ color: "var(--hpf-amber)" }}>Founding Provider Program:</strong>{" "}
            Providers who join during our early access period pay <strong>0% commission</strong> on bookings through the platform for 90 days.
            After that, a small commission applies. Limited spots available.
          </p>
        </div>
      </div>
    </div>
  );
}
