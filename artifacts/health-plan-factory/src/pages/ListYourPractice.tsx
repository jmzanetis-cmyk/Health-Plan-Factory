import { Link } from "react-router-dom";
import { CheckCircle, Star, Users, TrendingUp, Shield, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

const LISTING_PRICE = "$29/month";

export default function ListYourPractice() {
  const { t } = useTranslation();

  const benefits = [
    { icon: <Users size={20} />, title: t("listYourPractice.benefit0Title"), desc: t("listYourPractice.benefit0Desc") },
    { icon: <TrendingUp size={20} />, title: t("listYourPractice.benefit1Title"), desc: t("listYourPractice.benefit1Desc") },
    { icon: <Star size={20} />, title: t("listYourPractice.benefit2Title"), desc: t("listYourPractice.benefit2Desc") },
    { icon: <Shield size={20} />, title: t("listYourPractice.benefit3Title"), desc: t("listYourPractice.benefit3Desc") },
    { icon: <Clock size={20} />, title: t("listYourPractice.benefit4Title"), desc: t("listYourPractice.benefit4Desc") },
    { icon: <CheckCircle size={20} />, title: t("listYourPractice.benefit5Title"), desc: t("listYourPractice.benefit5Desc") },
  ];

  const steps = [
    { num: "01", title: t("listYourPractice.step0Title"), desc: t("listYourPractice.step0Desc") },
    { num: "02", title: t("listYourPractice.step1Title"), desc: t("listYourPractice.step1Desc", { price: LISTING_PRICE }) },
    { num: "03", title: t("listYourPractice.step2Title"), desc: t("listYourPractice.step2Desc") },
    { num: "04", title: t("listYourPractice.step3Title"), desc: t("listYourPractice.step3Desc") },
  ];

  const faqs = [
    { q: t("listYourPractice.faq0Q"), a: t("listYourPractice.faq0A", { price: LISTING_PRICE }) },
    { q: t("listYourPractice.faq1Q"), a: t("listYourPractice.faq1A") },
    { q: t("listYourPractice.faq2Q"), a: t("listYourPractice.faq2A") },
    { q: t("listYourPractice.faq3Q"), a: t("listYourPractice.faq3A") },
    { q: t("listYourPractice.faq4Q"), a: t("listYourPractice.faq4A") },
  ];

  const features = [
    t("listYourPractice.feature0"),
    t("listYourPractice.feature1"),
    t("listYourPractice.feature2"),
    t("listYourPractice.feature3"),
    t("listYourPractice.feature4"),
    t("listYourPractice.feature5"),
  ];

  const stats = [
    { val: t("listYourPractice.stat1Val"), label: t("listYourPractice.stat1Label") },
    { val: t("listYourPractice.stat2Val"), label: t("listYourPractice.stat2Label") },
    { val: t("listYourPractice.stat3Val"), label: t("listYourPractice.stat3Label") },
    { val: t("listYourPractice.stat4Val"), label: t("listYourPractice.stat4Label") },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      {/* Hero */}
      <div
        className="px-6 md:px-12 py-12 md:py-20"
        style={{ background: "linear-gradient(135deg, #d4227e 0%, #e02040 100%)" }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(255,255,255,0.15)", color: "white", fontFamily: "var(--app-font-sans)" }}>
            {t("listYourPractice.badge")}
          </div>
          <h1
            className="mb-6"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(2.2rem,5vw,4rem)",
              fontWeight: 700,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              whiteSpace: "pre-line",
            }}
          >
            {t("listYourPractice.heroH1")}
          </h1>
          <p
            className="text-lg mb-10 mx-auto"
            style={{ color: "rgba(255,255,255,0.85)", fontFamily: "var(--app-font-sans)", maxWidth: "580px", lineHeight: 1.6 }}
          >
            {t("listYourPractice.heroP", { price: LISTING_PRICE })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/provider/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold no-underline transition-all"
              style={{ background: "white", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
            >
              {t("listYourPractice.getStartedBtn", { price: LISTING_PRICE })}
            </Link>
            <Link
              to="/modalities"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-medium no-underline transition-all"
              style={{ background: "rgba(255,255,255,0.12)", color: "white", fontFamily: "var(--app-font-sans)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              {t("listYourPractice.browseModalities")}
            </Link>
          </div>
        </div>
      </div>

      {/* Social proof bar */}
      <div style={{ background: "white", borderBottom: "1px solid rgba(212,34,126,0.06)" }}>
        <div className="px-6 md:px-12 py-5 max-w-4xl mx-auto flex flex-wrap gap-6 justify-center md:justify-between items-center">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>{s.val}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="px-6 md:px-12 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="section-tag">{t("listYourPractice.howItWorksTag")}</p>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)" }}>
              {t("listYourPractice.howItWorksH2")}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4"
                  style={{ background: "var(--hpf-pink)", color: "white", fontFamily: "var(--app-font-sans)" }}
                >
                  {step.num}
                </div>
                <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                  {step.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="px-6 md:px-12 py-16" style={{ background: "white" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-tag">{t("listYourPractice.whyChooseTag")}</p>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)" }}>
              {t("listYourPractice.whyChooseH2")}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="p-6 rounded-2xl"
                style={{ background: "var(--warm-white)", border: "1px solid rgba(212,34,126,0.08)" }}
              >
                <div className="mb-3" style={{ color: "var(--hpf-pink)" }}>{b.icon}</div>
                <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                  {b.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="px-6 md:px-12 py-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-10">
            <p className="section-tag">{t("listYourPractice.pricingTag")}</p>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)" }}>
              {t("listYourPractice.pricingH2")}
            </h2>
          </div>
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "white", border: "2px solid rgba(212,34,126,0.15)", boxShadow: "0 8px 40px rgba(212,34,126,0.08)" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: "rgba(212,34,126,0.08)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
              {t("listYourPractice.foundingOffer")}
            </div>
            <p style={{ fontFamily: "var(--app-font-serif)", fontSize: "3rem", fontWeight: 700, color: "var(--hpf-pink)", lineHeight: 1 }}>
              $29
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{t("listYourPractice.perMonth")}</p>
            <ul className="text-sm text-left flex flex-col gap-3 mb-8">
              {features.map((item) => (
                <li key={item} className="flex items-center gap-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  <CheckCircle size={14} style={{ color: "var(--sage)", flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/provider/signup"
              className="block w-full py-4 rounded-xl text-sm font-semibold text-white no-underline text-center"
              style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              {t("listYourPractice.listMyPractice")}
            </Link>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              {t("listYourPractice.pricingNote")}
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="px-6 md:px-12 py-16" style={{ background: "white" }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-tag">{t("listYourPractice.faqTag")}</p>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)" }}>
              {t("listYourPractice.faqH2")}
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl p-5"
                style={{ background: "var(--warm-white)", border: "1px solid rgba(212,34,126,0.06)" }}
              >
                <p className="text-sm font-semibold mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                  {faq.q}
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6 }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div
        className="px-6 md:px-12 py-20 text-center"
        style={{ background: "linear-gradient(135deg, #d4227e 0%, #e02040 100%)" }}
      >
        <div className="max-w-2xl mx-auto">
          <h2
            className="mb-4"
            style={{ fontFamily: "var(--app-font-serif)", fontSize: "2.2rem", fontWeight: 700, color: "white" }}
          >
            {t("listYourPractice.ctaH2")}
          </h2>
          <p className="mb-8 text-base" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "var(--app-font-sans)" }}>
            {t("listYourPractice.ctaP", { price: LISTING_PRICE })}
          </p>
          <Link
            to="/provider/signup"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold no-underline"
            style={{ background: "white", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
          >
            {t("listYourPractice.ctaBtn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
