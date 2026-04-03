import { Link } from "react-router-dom";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { useTranslation } from "react-i18next";

export default function About() {
  const { t } = useTranslation();

  const VALUES = [
    {
      emoji: "💸",
      title: t("about.values.value1Title"),
      body: t("about.values.value1Body"),
      color: "var(--hpf-pink)",
      pale: "rgba(212,34,126,0.06)",
    },
    {
      emoji: "🔬",
      title: t("about.values.value2Title"),
      body: t("about.values.value2Body"),
      color: "var(--hpf-crimson)",
      pale: "var(--crimson-pale)",
    },
    {
      emoji: "🤝",
      title: t("about.values.value3Title"),
      body: t("about.values.value3Body"),
      color: "var(--sage)",
      pale: "var(--sage-pale)",
    },
    {
      emoji: "🏙️",
      title: t("about.values.value4Title"),
      body: t("about.values.value4Body"),
      color: "#5b9bd5",
      pale: "rgba(91,155,213,0.1)",
    },
  ];

  const STATS = [
    { num: t("about.stats.stat1Num"), label: t("about.stats.stat1Label") },
    { num: t("about.stats.stat2Num"), label: t("about.stats.stat2Label") },
    { num: t("about.stats.stat3Num"), label: t("about.stats.stat3Label") },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>

      {/* ── FOUNDER STORY (top) ── */}
      <section
        className="px-6 md:px-12 py-10 md:py-20"
        style={{
          background: "var(--off-white)",
          borderBottom: "1px solid rgba(212,34,126,0.08)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(212,34,126,0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="max-w-2xl mx-auto relative">
          <div className="section-tag">{t("about.founder.tag")}</div>
          <h1
            className="mb-6 leading-tight"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--hpf-deep)",
            }}
          >
            {t("about.founder.headline")}
          </h1>
          <p
            className="text-base font-light leading-relaxed mb-5"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            {t("about.founder.p1")}
          </p>
          <p
            className="text-base font-light leading-relaxed mb-5"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            I spent thousands of dollars with no roadmap — just a pile of appointments and a lot of hope. It eventually resolved. But I always wondered: what if I'd had a more calculated approach from the start?
          </p>
          <p
            className="text-base font-light leading-relaxed mb-8"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            {t("about.founder.p3")}
          </p>
          <div
            className="flex items-center gap-3 pt-5"
            style={{ borderTop: "1px solid rgba(212,34,126,0.08)" }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid rgba(212,34,126,0.15)",
                flexShrink: 0,
              }}
            >
              <img
                src="/founder.jpg"
                alt="Founder"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
            <div>
              <p style={{ fontFamily: "var(--app-font-sans)", fontWeight: 700, fontSize: "0.88rem", color: "var(--hpf-pink)", margin: 0 }}>
                Jordan Zanetis — Founder & CEO
              </p>
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                Health Plan Factory · Somerset, NJ
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section
        className="px-6 md:px-12 py-14"
        style={{ background: "var(--hpf-pink)" }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div
                className="text-4xl font-bold mb-2"
                style={{ fontFamily: "var(--app-font-serif)", color: "white", letterSpacing: "-0.02em" }}
              >
                {stat.num}
              </div>
              <p className="text-xs font-light leading-relaxed" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "var(--app-font-sans)" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="section-tag">{t("about.values.tag")}</div>
          <h2
            className="mb-14"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: "var(--hpf-pink)",
              maxWidth: 480,
            }}
          >
            {t("about.values.headline")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "white",
                  border: "1px solid rgba(212,34,126,0.08)",
                  boxShadow: "0 2px 12px rgba(212,34,126,0.04)",
                }}
              >
                <div
                  className="px-6 py-4 flex items-center gap-4"
                  style={{ background: v.pale, borderBottom: "1px solid rgba(212,34,126,0.06)" }}
                >
                  <span className="text-2xl">{v.emoji}</span>
                  <h3
                    className="font-bold text-base"
                    style={{ fontFamily: "var(--app-font-serif)", color: v.color }}
                  >
                    {v.title}
                  </h3>
                </div>
                <div className="px-6 py-5">
                  <p
                    className="text-sm font-light leading-relaxed"
                    style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
                  >
                    {v.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <TestimonialsSection sectionTag="What members say" />

      {/* ── INVITE (bottom) ── */}
      <section
        className="relative px-6 md:px-12 py-20 text-center"
        style={{
          background: "var(--off-white)",
          borderTop: "1px solid rgba(212,34,126,0.08)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(212,34,126,0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="max-w-3xl mx-auto relative z-10">
          <h2
            className="mb-5 leading-tight"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--hpf-deep)",
            }}
          >
            {t("about.cta.headline")}
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/survey"
              className="inline-flex items-center px-8 py-4 rounded-lg text-sm font-semibold text-white no-underline"
              style={{
                background: "var(--hpf-pink)",
                fontFamily: "var(--app-font-sans)",
                boxShadow: "0 4px 20px rgba(212,34,126,0.25)",
                letterSpacing: "0.01em",
              }}
            >
              {t("about.cta.button")}
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center px-8 py-4 rounded-lg text-sm font-semibold no-underline"
              style={{
                border: "1.5px solid rgba(212,34,126,0.2)",
                color: "var(--hpf-pink)",
                fontFamily: "var(--app-font-sans)",
                letterSpacing: "0.01em",
              }}
            >
              {t("nav.howItWorks")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
