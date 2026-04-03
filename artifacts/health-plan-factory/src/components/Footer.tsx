import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  const footerLinks = [
    { href: "/about", label: t("footer.about") },
    { href: "/how-it-works", label: t("footer.howItWorks") },
    { href: "/modalities", label: t("footer.modalities") },
    { href: "/for-providers", label: t("footer.forProviders") },
    { href: "/for-employers", label: t("footer.forEmployers") },
    { href: "/pricing", label: t("footer.pricing") },
    { href: "/blog", label: t("footer.blog") },
    { href: "/faq", label: t("footer.faq") },
    { href: "/legal", label: t("footer.disclaimer") },
    { href: "/privacy", label: t("footer.privacy") },
    { href: "/terms", label: t("footer.terms") },
    { href: "/contact", label: t("footer.contact") },
  ];

  return (
    <footer style={{ background: "#1C1A18", padding: "2.5rem 3rem 5rem" }}>
      <div
        className="flex justify-between items-start flex-wrap gap-8 pb-8 mb-8"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div>
          <Logo variant="footer" />
          <p className="text-xs font-light mt-1" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--app-font-sans)" }}>
            {t("footer.tagline")}
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
        <strong style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{t("footer.disclaimerLabel")}</strong>{" "}
        {t("footer.disclaimerText", { emergencyNum: "911", crisisNum: "988" })}{" "}
        <Link to="/terms" className="no-underline" style={{ color: "rgba(224,32,64,0.6)", textDecoration: "underline" }}>
          {t("footer.termsOfService")}
        </Link>{" "}
        {t("footer.and")}{" "}
        <Link to="/privacy" className="no-underline" style={{ color: "rgba(224,32,64,0.6)", textDecoration: "underline" }}>
          {t("footer.privacyPolicy")}
        </Link>
        .
      </p>

      <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.15)", fontFamily: "var(--app-font-sans)" }}>
        {t("footer.copyright", { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
