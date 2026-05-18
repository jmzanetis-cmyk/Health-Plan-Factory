import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { useTranslation } from "react-i18next";

// STAGES and FAQS defined inside component for i18n

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b cursor-pointer"
      style={{ borderColor: "rgba(212,34,126,0.1)" }}
      onClick={() => setOpen(!open)}
    >
      <div className="flex justify-between items-center py-5 gap-4">
        <h3 className="font-medium text-sm" style={{ color: "var(--hpf-deep)", fontFamily: "var(--app-font-sans)" }}>
          {q}
        </h3>
        {open ? (
          <ChevronUp size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        ) : (
          <ChevronDown size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        )}
      </div>
      {open && (
        <p className="text-sm font-light leading-relaxed pb-5" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
          {a}
        </p>
      )}
    </div>
  );
}

export default function HowItWorks() {
  const { t } = useTranslation();

  const STAGES = [
    {
      num: "01",
      emoji: "📝",
      title: t("howItWorks.step1.title"),
      tagline: t("howItWorks.step1.tagline"),
      bullets: t("howItWorks.step1.bullets", { returnObjects: true }) as string[],
      color: "var(--hpf-crimson)",
      pale: "var(--crimson-pale)",
    },
    {
      num: "02",
      emoji: "⚙️",
      title: t("howItWorks.step2.title"),
      tagline: t("howItWorks.step2.tagline"),
      bullets: t("howItWorks.step2.bullets", { returnObjects: true }) as string[],
      color: "var(--sage)",
      pale: "var(--sage-pale)",
    },
    {
      num: "03",
      emoji: "🗺️",
      title: t("howItWorks.step3.title"),
      tagline: t("howItWorks.step3.tagline"),
      bullets: t("howItWorks.step3.bullets", { returnObjects: true }) as string[],
      color: "#5b9bd5",
      pale: "rgba(91,155,213,0.1)",
    },
    {
      num: "04",
      emoji: "📅",
      title: t("howItWorks.step4.title"),
      tagline: t("howItWorks.step4.tagline"),
      bullets: t("howItWorks.step4.bullets", { returnObjects: true }) as string[],
      color: "var(--hpf-pink)",
      pale: "rgba(212,34,126,0.06)",
    },
  ];

  const FAQS = [
    { q: t("howItWorks.faq.q1"), a: t("howItWorks.faq.a1") },
    { q: t("howItWorks.faq.q2"), a: t("howItWorks.faq.a2") },
    { q: t("howItWorks.faq.q3"), a: t("howItWorks.faq.a3") },
    { q: t("howItWorks.faq.q4"), a: t("howItWorks.faq.a4") },
    { q: t("howItWorks.faq.q5"), a: t("howItWorks.faq.a5") },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>

      {/* ── HERO ── */}
      <section
        className="relative px-6 md:px-12 py-10 md:py-20"
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
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="section-tag">{t("howItWorks.hero.tag")}</div>
          <h1
            className="mb-5 leading-tight"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--hpf-deep)",
            }}
          >
            {t("howItWorks.hero.headline")}
          </h1>
          <p
            className="mb-8 max-w-xl leading-relaxed"
            style={{ fontSize: "1.05rem", fontWeight: 300, color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            {t("howItWorks.hero.sub")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/sign-up"
              className="inline-flex items-center px-7 py-3.5 rounded-md text-sm font-semibold text-white no-underline"
              style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", boxShadow: "0 4px 16px rgba(212,34,126,0.2)" }}
            >
              {t("howItWorks.cta.button")}
            </Link>
            <Link
              to="/modalities"
              className="inline-flex items-center px-6 py-3.5 rounded-md text-sm font-medium no-underline"
              style={{ border: "1.5px solid rgba(212,34,126,0.2)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              {t("nav.modalities")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── STEPS ── */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="section-tag">The process</div>
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
            Four stages, start to finish
          </h2>

          <div className="flex flex-col gap-10">
            {STAGES.map((stage, i) => (
              <div
                key={stage.num}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "white",
                  border: "1px solid rgba(212,34,126,0.08)",
                  boxShadow: "0 2px 12px rgba(212,34,126,0.04)",
                }}
              >
                <div
                  className="px-6 md:px-8 py-5 flex items-center gap-4"
                  style={{ background: stage.pale, borderBottom: "1px solid rgba(212,34,126,0.06)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      background: stage.color,
                      color: "white",
                      fontFamily: "var(--app-font-mono)",
                    }}
                  >
                    {stage.num}
                  </div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h3
                      className="font-bold text-lg leading-tight"
                      style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}
                    >
                      <span className="mr-2">{stage.emoji}</span>
                      {stage.title}
                    </h3>
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: stage.color, fontFamily: "var(--app-font-mono)" }}
                    >
                      {stage.tagline}
                    </span>
                  </div>
                </div>
                <div className="px-6 md:px-8 py-6">
                  <ul className="flex flex-col gap-3">
                    {stage.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                          style={{ background: stage.color }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                  {i === 0 && (
                    <div
                      className="mt-5 flex flex-wrap gap-2"
                    >
                      {["Budget", "Goals", "Conditions", "Preferences", "Exclusions", "Location", "Review"].map((tag) => (
                        <span
                          key={tag}
                          className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: "var(--crimson-pale)", color: "var(--hpf-crimson)", border: "1px solid rgba(224,32,64,0.15)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {i === 1 && (
                    <div
                      className="mt-5 rounded-xl p-4"
                      style={{ background: "var(--off-white)", border: "1px solid rgba(212,34,126,0.06)" }}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                        Example plan preview
                      </p>
                      <div className="flex flex-col gap-2">
                        {[
                          { emoji: "💆", name: "Massage Therapy", freq: "2×/month", cost: "$120", hsa: true },
                          { emoji: "🧘", name: "Yoga / Mind-Body", freq: "8×/month", cost: "$60", hsa: false },
                          { emoji: "🥗", name: "Nutrition Coaching", freq: "1×/month", cost: "$45", hsa: false },
                        ].map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg"
                            style={{ background: "white", borderLeft: `3px solid ${item.hsa ? "var(--hpf-crimson)" : "rgba(212,34,126,0.15)"}` }}
                          >
                            <span className="text-sm flex-shrink-0">{item.emoji}</span>
                            <span className="text-xs font-semibold flex-1" style={{ color: "var(--hpf-pink)" }}>{item.name}</span>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.freq}</span>
                            <span className="text-xs font-medium" style={{ fontFamily: "var(--app-font-mono)", color: "var(--hpf-pink)" }}>{item.cost}</span>
                            {item.hsa && (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: "var(--sage)", background: "var(--sage-pale)" }}>
                                HSA
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center px-3 py-2 rounded-lg mt-2" style={{ background: "var(--hpf-pink)" }}>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Monthly total</span>
                        <span className="text-xs font-medium" style={{ fontFamily: "var(--app-font-mono)", color: "white" }}>$225 / $260 budget</span>
                      </div>
                    </div>
                  )}
                  {i === 2 && (
                    <div
                      className="mt-5 rounded-xl overflow-hidden"
                      style={{ border: "1px solid rgba(212,34,126,0.08)" }}
                    >
                      <div className="px-4 py-3" style={{ background: "var(--hpf-pink)" }}>
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Sample provider card
                        </p>
                      </div>
                      <div className="px-4 py-4 flex items-center gap-4" style={{ background: "white" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white flex-shrink-0" style={{ background: "var(--hpf-pink)" }}>
                          S
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "var(--hpf-pink)" }}>Sarah K., LMT</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Licensed Massage Therapist · Denver, CO</p>
                        </div>
                        <div
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background: "var(--crimson-pale)", color: "var(--hpf-crimson)", border: "1px solid rgba(224,32,64,0.15)" }}
                        >
                          Plus: View contact →
                        </div>
                      </div>
                    </div>
                  )}
                  {i === 3 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {[
                        { label: "Provider contact details", icon: "📞" },
                        { label: "Direct booking", icon: "📅" },
                        { label: "Provider messaging", icon: "💬" },
                        { label: "AI coach + journaling", icon: "🤖" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
                          style={{ background: "var(--off-white)", border: "1px solid rgba(212,34,126,0.08)", color: "var(--hpf-pink)" }}
                        >
                          <span>{item.icon}</span>
                          {item.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SNAPSHOT STATS ── */}
      <section
        className="px-6 md:px-12 py-14"
        style={{ background: "var(--hpf-pink)" }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { num: "5 min", label: "Average intake completion time" },
            { num: "12", label: "Evidence-rated wellness modalities" },
            { num: "$0", label: "To build and view your full plan" },
          ].map((stat) => (
            <div key={stat.label}>
              <div
                className="text-4xl font-bold mb-2"
                style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-crimson)", letterSpacing: "-0.02em" }}
              >
                {stat.num}
              </div>
              <p className="text-xs font-light leading-relaxed" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--app-font-sans)" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <TestimonialsSection sectionTag="What members say" />

      {/* ── SAVINGS CALCULATOR CTA ── */}
      <section
        className="px-6 md:px-12 py-14"
        style={{ background: "var(--warm-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-2xl px-8 py-10 flex flex-col md:flex-row items-center gap-8"
            style={{
              background: "var(--hpf-pink)",
              boxShadow: "0 8px 30px rgba(212,34,126,0.2)",
            }}
          >
            <div className="flex-1">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--app-font-sans)" }}
              >
                HSA/FSA Savings Calculator
              </p>
              <h3
                className="mb-2 leading-tight"
                style={{
                  fontFamily: "var(--app-font-serif)",
                  fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: "-0.015em",
                }}
              >
                Know your tax savings before you build your plan.
              </h3>
              <p
                className="text-sm font-light"
                style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--app-font-sans)" }}
              >
                Enter your budget and tax bracket — see exactly how much you could save using HSA/FSA dollars on your wellness plan.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                to="/savings-calculator"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-semibold no-underline"
                style={{
                  background: "white",
                  color: "var(--hpf-pink)",
                  fontFamily: "var(--app-font-sans)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  whiteSpace: "nowrap",
                }}
              >
                Calculate Your Savings →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 md:px-12 py-20" style={{ background: "var(--warm-white)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="section-tag">Common questions</div>
          <h2
            className="mb-10"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: "var(--hpf-pink)",
            }}
          >
            Still have questions?
          </h2>
          <div>
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="px-6 md:px-12 py-20 text-center"
        style={{ background: "var(--off-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-3xl mb-4">🏭</div>
          <h2
            className="mb-4"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--hpf-pink)",
            }}
          >
            Ready to build yours?
          </h2>
          <p
            className="mb-8 text-sm font-light leading-relaxed"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", maxWidth: 420, margin: "0 auto 2rem" }}
          >
            It's free to start. No credit card, no commitment — just a plan built around your life.
          </p>
          <Link
            to="/sign-up"
            className="inline-flex items-center px-8 py-4 rounded-lg text-sm font-semibold text-white no-underline"
            style={{
              background: "var(--hpf-pink)",
              fontFamily: "var(--app-font-sans)",
              boxShadow: "0 4px 20px rgba(212,34,126,0.25)",
              letterSpacing: "0.01em",
            }}
          >
            Build my plan free →
          </Link>
          <p className="mt-4 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Explorer plan · no credit card required
          </p>
        </div>
      </section>

    </div>
  );
}
