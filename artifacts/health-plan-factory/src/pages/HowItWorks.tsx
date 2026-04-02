import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

const STAGES = [
  {
    num: "01",
    emoji: "📝",
    title: "Tell us about yourself",
    tagline: "5 minutes · no credit card",
    bullets: [
      "Set your monthly wellness budget — we optimize every recommendation to it.",
      "Choose your health goals (fitness, stress relief, sleep, chronic pain, and more).",
      "Flag any conditions or concerns so the AI can prioritize the right modalities.",
      "Share your location and how you prefer to engage — in-person, virtual, or both.",
    ],
    color: "var(--hpf-crimson)",
    pale: "var(--crimson-pale)",
  },
  {
    num: "02",
    emoji: "⚙️",
    title: "Your plan is assembled",
    tagline: "AI-ranked · budget-aware",
    bullets: [
      "Every modality in our evidence library is scored against your goals and conditions.",
      "The engine allocates your budget across the highest-scoring modalities — like a financial planner, but for wellness.",
      "Modalities that don't fit your budget this cycle are kept in a 'next cycle' queue so nothing is lost.",
      "HSA/FSA eligibility is flagged automatically for every item in your plan.",
    ],
    color: "var(--sage)",
    pale: "var(--sage-pale)",
  },
  {
    num: "03",
    emoji: "🗺️",
    title: "Discover matched providers",
    tagline: "Local · vetted · high-intent",
    bullets: [
      "Local providers who match each modality in your plan are surfaced — you'll never see irrelevant listings.",
      "Each provider card shows their specialty, session rate, HSA/FSA acceptance, and rating.",
      "You can browse provider names, modalities, and ratings for free — contact details are locked.",
      "Plus members see everything unlocked; Explorer members pay a small à la carte fee per reveal.",
    ],
    color: "#5b9bd5",
    pale: "rgba(91,155,213,0.1)",
  },
  {
    num: "04",
    emoji: "📅",
    title: "Unlock, book & track",
    tagline: "Pay only for what you want",
    bullets: [
      "Unlock a provider's contact info with a single click — app-based $3 · wellness $5 · physician $8.",
      "Referral credits (earned when you invite friends) can cover the unlock fee entirely.",
      "Log sessions directly on your plan page and watch your wellness score climb over time.",
      "Your AI accountability coach (Plus) sends nudges and helps you stay on track between sessions.",
    ],
    color: "var(--hpf-pink)",
    pale: "rgba(212,34,126,0.06)",
  },
];

const FAQS = [
  {
    q: "How long does the intake take?",
    a: "About 5 minutes. There are 7 short screens: budget, goals, conditions, preferences, exclusions, location, and a final review. You can go back and change any answer before generating your plan.",
  },
  {
    q: "Can I edit my plan after it's generated?",
    a: "Yes. You can re-run the intake at any time with updated inputs — your new plan replaces the previous one. Plus members also have access to a manual routine builder where they can adjust modality frequency and budgets directly.",
  },
  {
    q: "Do I need to pay anything to see my plan?",
    a: "No. Your full personalized wellness plan — with every modality, cost estimate, and HSA/FSA flag — is completely free. You only pay when you choose to unlock a specific provider's contact information.",
  },
  {
    q: "What happens when I unlock a provider?",
    a: "You immediately see the provider's full contact details, website, and booking link. Explorer members pay a small à la carte fee per unlock ($3–$8 depending on provider type). Plus members get unlimited unlocks at no extra cost.",
  },
  {
    q: "What if there are no providers near me?",
    a: "Many modalities include telehealth or app-based options that work anywhere. If local in-person providers are sparse in your area, the plan will surface remote-friendly alternatives and flag them clearly.",
  },
];

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
  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>

      {/* ── HERO ── */}
      <section
        className="relative px-6 md:px-12 py-20"
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
          <div className="section-tag">Process</div>
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
            From intake to{" "}
            <em style={{ color: "var(--hpf-crimson)" }}>wellness plan</em>
            <br />
            in 5 minutes.
          </h1>
          <p
            className="mb-8 max-w-xl leading-relaxed"
            style={{ fontSize: "1.05rem", fontWeight: 300, color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            HealthPlanFactory turns your budget, goals, and health conditions into a prioritized,
            costed wellness plan — matched to vetted local providers — with no medical expertise required.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/sign-up"
              className="inline-flex items-center px-7 py-3.5 rounded-md text-sm font-semibold text-white no-underline"
              style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", boxShadow: "0 4px 16px rgba(212,34,126,0.2)" }}
            >
              Build my plan free →
            </Link>
            <Link
              to="/modalities"
              className="inline-flex items-center px-6 py-3.5 rounded-md text-sm font-medium no-underline"
              style={{ border: "1.5px solid rgba(212,34,126,0.2)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              Browse modalities
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
                          Unlock $5 →
                        </div>
                      </div>
                    </div>
                  )}
                  {i === 3 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {[
                        { label: "App-based", price: "$3" },
                        { label: "Wellness provider", price: "$5" },
                        { label: "Physician / DPC", price: "$8" },
                        { label: "Plus member", price: "$0" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
                          style={{ background: "var(--off-white)", border: "1px solid rgba(212,34,126,0.08)", color: "var(--hpf-pink)" }}
                        >
                          <span style={{ fontFamily: "var(--app-font-mono)", fontWeight: 700, color: "var(--hpf-pink)" }}>
                            {item.price}
                          </span>
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
