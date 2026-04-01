import { Link } from "react-router-dom";
import { Logo } from "./Logo";

const footerLinks = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/modalities", label: "Modalities" },
  { href: "/for-providers", label: "For Providers" },
  { href: "/for-employers", label: "For Employers" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/legal", label: "Disclaimer" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer style={{ background: "#1C1A18", padding: "2.5rem 3rem 5rem" }}>
      <div
        className="flex justify-between items-start flex-wrap gap-8 pb-8 mb-8"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div>
          <Logo variant="footer" />
          <p className="text-xs font-light mt-1" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--app-font-sans)" }}>
            Budget-first wellness, built for real life.
          </p>
        </div>

        <div className="flex flex-wrap gap-6 items-center">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-xs no-underline transition-colors"
              style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--app-font-sans)" }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-xs leading-relaxed max-w-2xl" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--app-font-sans)" }}>
        <strong style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>Disclaimer:</strong>{" "}
        HealthPlanFactory is a wellness optimization and information platform only. It is not a licensed medical provider, health insurer, or
        regulated financial advisor. Nothing on this platform constitutes medical advice, diagnosis, or treatment. Always consult a qualified
        healthcare professional before beginning any wellness, fitness, or health program. For medical emergencies, call{" "}
        <strong style={{ color: "rgba(255,255,255,0.35)" }}>911</strong>. For mental health crisis support, call or text{" "}
        <strong style={{ color: "rgba(255,255,255,0.35)" }}>988</strong>.{" "}
        HSA/FSA eligibility is determined by your plan administrator — consult your plan documents before assuming eligibility.
        Provider listings are for informational purposes only. HealthPlanFactory does not endorse, verify credentials of, or guarantee results from
        any listed provider. Use of this platform is subject to our{" "}
        <Link to="/terms" className="no-underline" style={{ color: "rgba(224,32,64,0.6)", textDecoration: "underline" }}>
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link to="/privacy" className="no-underline" style={{ color: "rgba(224,32,64,0.6)", textDecoration: "underline" }}>
          Privacy Policy
        </Link>
        .
      </p>

      <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.15)", fontFamily: "var(--app-font-sans)" }}>
        © {new Date().getFullYear()} Zanetis Holdings LLC. All rights reserved.
      </p>
    </footer>
  );
}
