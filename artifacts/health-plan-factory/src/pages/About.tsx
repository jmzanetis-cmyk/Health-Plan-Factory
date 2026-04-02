import { Link } from "react-router-dom";
import { TestimonialsSection } from "@/components/TestimonialsSection";

const VALUES = [
  {
    emoji: "💸",
    title: "Budget-first, always",
    body: "Most wellness platforms ignore your wallet. We built every recommendation engine around your budget — not the other way around.",
    color: "var(--hpf-pink)",
    pale: "rgba(212,34,126,0.06)",
  },
  {
    emoji: "🔬",
    title: "Evidence, not trends",
    body: "Every modality in our library is scored against clinical and peer-reviewed literature — no pseudoscience, no affiliate-driven hype.",
    color: "var(--hpf-crimson)",
    pale: "var(--crimson-pale)",
  },
  {
    emoji: "🤝",
    title: "Transparency over upsells",
    body: "You see the full plan for free. You pay only to unlock individual provider contact details — never for the plan itself.",
    color: "var(--sage)",
    pale: "var(--sage-pale)",
  },
  {
    emoji: "🏙️",
    title: "Local providers, real people",
    body: "We surface vetted practitioners in your area — massage therapists, acupuncturists, coaches, and more — not faceless apps or generic referrals.",
    color: "#5b9bd5",
    pale: "rgba(91,155,213,0.1)",
  },
];

const STATS = [
  { num: "5 min", label: "Average time to build your first plan" },
  { num: "12+", label: "Evidence-rated wellness modalities" },
  { num: "$0", label: "To see your complete personalized plan" },
];

export default function About() {
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
          <div className="section-tag">Our story</div>
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
            Wellness that fits{" "}
            <em style={{ color: "var(--hpf-crimson)" }}>your budget</em>,
            <br />
            not someone else's.
          </h1>
          <p
            className="mb-8 max-w-xl leading-relaxed"
            style={{ fontSize: "1.05rem", fontWeight: 300, color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            HealthPlanFactory was built for people who care about their health but live in the real world — where money is finite, time is short, and one-size-fits-all advice doesn't cut it.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/survey"
              className="inline-flex items-center px-7 py-3.5 rounded-md text-sm font-semibold text-white no-underline"
              style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", boxShadow: "0 4px 16px rgba(212,34,126,0.2)" }}
            >
              Build my plan free →
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center px-6 py-3.5 rounded-md text-sm font-medium no-underline"
              style={{ border: "1.5px solid rgba(212,34,126,0.2)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="section-tag">Mission</div>
            <h2
              className="mb-5 leading-tight"
              style={{
                fontFamily: "var(--app-font-serif)",
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 700,
                letterSpacing: "-0.015em",
                color: "var(--hpf-pink)",
              }}
            >
              Make personalized wellness accessible to everyone.
            </h2>
            <p
              className="text-sm font-light leading-relaxed mb-4"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
            >
              Premium wellness guidance shouldn't require a premium income. We built an AI-powered plan engine that takes your real budget, your actual health goals, and your unique situation — and assembles a practical, costed plan you can act on today.
            </p>
            <p
              className="text-sm font-light leading-relaxed"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
            >
              We then surface vetted local providers for every modality in your plan, so the gap between "knowing what to do" and "actually doing it" shrinks to a single click.
            </p>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{
              background: "white",
              border: "1px solid rgba(212,34,126,0.08)",
              boxShadow: "0 2px 12px rgba(212,34,126,0.04)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}
            >
              How we started
            </p>
            <p
              className="text-sm font-light leading-relaxed mb-4"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
            >
              The idea came from a simple frustration: every wellness app assumes you have unlimited money, unlimited time, or both. Generic recommendations, affiliate-padded lists, and no real understanding of budget constraints.
            </p>
            <p
              className="text-sm font-light leading-relaxed mb-4"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
            >
              So we asked: what if a platform worked like a financial planner — but for wellness? Allocate your budget across the highest-impact modalities, flag HSA/FSA-eligible items automatically, and connect you to real local providers — all without charging you for the plan itself.
            </p>
            <p
              className="text-sm font-light leading-relaxed"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
            >
              HealthPlanFactory is the answer to that question.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section
        className="px-6 md:px-12 py-20"
        style={{ background: "var(--off-white)", borderTop: "1px solid rgba(212,34,126,0.07)", borderBottom: "1px solid rgba(212,34,126,0.07)" }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
          {/* Photo */}
          <div className="flex justify-center md:justify-start">
            <div
              style={{
                width: 260,
                height: 260,
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid rgba(212,34,126,0.15)",
                boxShadow: "0 8px 40px rgba(212,34,126,0.12)",
                flexShrink: 0,
              }}
            >
              <img
                src="/founder.jpg"
                alt="Founder of Health Plan Factory"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <div className="section-tag">Founder</div>
            <h2
              className="mb-4 leading-tight"
              style={{
                fontFamily: "var(--app-font-serif)",
                fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                fontWeight: 700,
                letterSpacing: "-0.015em",
                color: "var(--hpf-deep)",
              }}
            >
              Built from a personal frustration.
            </h2>
            <p
              className="text-sm font-light leading-relaxed mb-4"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
            >
              I spent years navigating a fragmented wellness landscape — expensive apps with generic advice, providers I couldn't afford, and HSA/FSA dollars I didn't know I could use. The gap between "wanting to be healthier" and "knowing how to get there on a real budget" was enormous.
            </p>
            <p
              className="text-sm font-light leading-relaxed mb-6"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
            >
              HealthPlanFactory is what I wish had existed. A platform that treats your wellness like a financial planner would — with real numbers, real trade-offs, and real local providers ready to book.
            </p>
            <div
              className="flex items-center gap-3 pt-4"
              style={{ borderTop: "1px solid rgba(212,34,126,0.08)" }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
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
                <p style={{ fontFamily: "var(--app-font-sans)", fontWeight: 700, fontSize: "0.85rem", color: "var(--hpf-pink)", margin: 0 }}>
                  Founder & CEO
                </p>
                <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                  Health Plan Factory
                </p>
              </div>
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

      {/* ── VALUES ── */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="section-tag">What we stand for</div>
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
            Our values, in plain English
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
            Ready to see your plan?
          </h2>
          <p
            className="mb-8 text-sm font-light leading-relaxed"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", maxWidth: 420, margin: "0 auto 2rem" }}
          >
            Free to build. No credit card. No commitment — just a wellness plan built around your budget and your life.
          </p>
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
              Build my free plan →
            </Link>
            <Link
              to="/providers"
              className="inline-flex items-center px-8 py-4 rounded-lg text-sm font-semibold no-underline"
              style={{
                border: "1.5px solid rgba(212,34,126,0.2)",
                color: "var(--hpf-pink)",
                fontFamily: "var(--app-font-sans)",
                letterSpacing: "0.01em",
              }}
            >
              Find providers
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
