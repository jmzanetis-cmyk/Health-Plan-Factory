import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PlanSpeculator } from "@/components/PlanSpeculator";

const MODALITIES = [
  { emoji: "🧘", name: "Yoga / Mind-Body", badge: "Moderate", badgeType: "moderate" },
  { emoji: "💆", name: "Massage Therapy", badge: "Strong", badgeType: "strong" },
  { emoji: "🥗", name: "Nutrition Coaching", badge: "Strong", badgeType: "strong" },
  { emoji: "🏃", name: "Personal Training", badge: "Moderate", badgeType: "moderate" },
  { emoji: "🧠", name: "Mental Wellness", badge: "Strong", badgeType: "strong" },
  { emoji: "💊", name: "Supplements", badge: "Emerging", badgeType: "emerging" },
  { emoji: "🌿", name: "Acupuncture", badge: "Moderate", badgeType: "moderate" },
  { emoji: "🦴", name: "Chiropractic Care", badge: "Moderate", badgeType: "moderate" },
  { emoji: "🏊", name: "Physical Therapy", badge: "Strong", badgeType: "strong" },
  { emoji: "💤", name: "Sleep Optimization", badge: "Moderate", badgeType: "moderate" },
  { emoji: "🔬", name: "Functional Medicine", badge: "Emerging", badgeType: "emerging" },
  { emoji: "📱", name: "App-Based Programs", badge: "Moderate", badgeType: "moderate" },
];

const HOW_IT_WORKS = [
  { num: "01", icon: "📝", title: "Tell us about you", desc: "Share your health goals, current conditions, monthly budget, and lifestyle preferences. Takes about 5 minutes." },
  { num: "02", icon: "⚙️", title: "AI builds your plan", desc: "Our AI analyzes your inputs and assembles a prioritized list of wellness modalities fitted to your budget and goals." },
  { num: "03", icon: "🗺️", title: "Discover local providers", desc: "Browse matched providers for each modality in your plan. Unlock contact info for the ones that interest you." },
  { num: "04", icon: "📅", title: "Book & track progress", desc: "Book sessions directly, log your routine, and watch your wellness score improve over time." },
];

const STATS = [
  { num: "73%", desc: "of adults want a structured wellness plan but don't know where to start or what they can afford." },
  { num: "$2.4T", desc: "spent on healthcare annually in the US — yet most spend zero on preventive wellness each year." },
  { num: "68%", desc: "of HSA/FSA holders don't know many wellness services qualify for tax-advantaged spending." },
];

const FAQS = [
  {
    q: "Is this medical advice?",
    a: "No. HealthPlanFactory is a wellness optimization platform — not a medical provider, diagnostic tool, or substitute for licensed healthcare. Always consult a qualified healthcare professional before beginning any wellness program.",
  },
  {
    q: "How much does it cost to get started?",
    a: "Building your initial plan is completely free. You pay unlock fees ($3–$8) only when you want to view a specific provider's contact information. A Plus membership ($9.99/month) unlocks unlimited reveals, journaling, routine building, and the AI accountability coach.",
  },
  {
    q: "Can I use my HSA or FSA?",
    a: "Many services in your plan — including massage, acupuncture, physical therapy, and nutrition counseling — may qualify for HSA/FSA reimbursement. Eligibility is determined by your plan administrator. Our platform includes an HSA/FSA log to help you track spending.",
  },
  {
    q: "How are providers vetted?",
    a: "Providers apply to be listed and agree to our provider standards. We collect credential information and license numbers. However, HealthPlanFactory does not independently verify credentials or guarantee outcomes. Always do your own due diligence before booking.",
  },
  {
    q: "What's the difference between a wellness provider and a physician provider?",
    a: "Wellness providers include massage therapists, yoga instructors, nutritionists, personal trainers, and similar practitioners. Physician providers are licensed MDs, DOs, and NPs — often Direct Primary Care physicians who can order labs, prescribe, and write Letters of Medical Necessity that may unlock HSA/FSA spending for wellness services.",
  },
  {
    q: "What is the Founding Provider program?",
    a: "Founding Providers who join during our early access period pay zero platform commission on bookings for their first 90 days. After that, a small commission applies to bookings made through the platform.",
  },
];

const PRICING_TIERS = [
  {
    tier: "Explorer",
    price: "Free",
    per: "forever",
    desc: "Build your plan, browse providers, and see what's possible.",
    features: ["Full plan generation", "Modality library access", "Provider browse (blurred)", "Up to 2 free unlocks"],
    cta: "Get started free",
    ctaHref: "/sign-up",
    featured: false,
  },
  {
    tier: "Plus",
    price: "$9.99",
    per: "per month",
    desc: "The full factory experience — unlimited reveals, coaching, and tracking.",
    features: [
      "Everything in Explorer",
      "Unlimited provider reveals",
      "AI accountability coach",
      "Routine & journal builder",
      "HSA/FSA spending log",
      "Progress tracking & insights",
      "14-day free trial",
    ],
    cta: "Start 14-day free trial",
    ctaHref: "/sign-up?plan=plus",
    featured: true,
  },
  {
    tier: "Provider",
    price: "Free",
    per: "to list",
    desc: "Get discovered by members whose plans match your specialty.",
    features: ["Listing in provider directory", "Lead alerts for your modalities", "Booking calendar integration", "Founding: 0% commission for 90 days"],
    cta: "Apply as a provider",
    ctaHref: "/provider/signup",
    featured: false,
  },
];

const TESTIMONIALS = [
  {
    stars: "★★★★★",
    quote: "I finally have a plan I can actually afford. The AI figured out that massage + online yoga fits my $120/month budget better than a gym membership I'd never use.",
    name: "Sarah M.",
    desc: "Busy mom, Denver CO",
  },
  {
    stars: "★★★★★",
    quote: "The HSA unlock feature alone paid for itself. I had no idea my massage therapist qualified. That's $600 in tax-free spending I was missing.",
    name: "James T.",
    desc: "Software engineer, Austin TX",
  },
  {
    stars: "★★★★★",
    quote: "As a DPC physician, this is the referral platform I've been waiting for. My patients come in already knowing what they want to try and how it fits their budget.",
    name: "Dr. Priya R., MD",
    desc: "Direct Primary Care, Seattle WA",
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
        <h3 className="font-sans font-medium text-sm" style={{ color: "var(--hpf-deep)", fontFamily: "var(--app-font-sans)" }}>
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

export default function Landing() {
  return (
    <div style={{ background: "var(--warm-white)", overflowX: "hidden" }}>

      {/* ── HERO ── */}
      <section
        className="relative grid md:grid-cols-2 gap-12 items-start px-4 md:px-12 pt-16 pb-16"
      >
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(212,34,126,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Left */}
        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 mb-6 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "var(--crimson-pale)", border: "1px solid rgba(224,32,64,0.12)", color: "var(--hpf-crimson)" }}
          >
            ✦ Your personalized wellness plan
          </div>

          <h1
            className="mb-6 leading-tight"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(2.8rem, 5vw, 5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--hpf-deep)",
            }}
          >
            A health plan
            <br />
            built around
            <br />
            <em style={{ color: "var(--hpf-crimson)" }}>your life.</em>
          </h1>

          <p
            className="mb-8 leading-relaxed max-w-md"
            style={{ fontSize: "1.05rem", fontWeight: 300, color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            Tell us your budget, your conditions, and your goals.
            HealthPlanFactory assembles a{" "}
            <strong style={{ color: "var(--hpf-pink)", fontWeight: 600 }}>prioritized, costed wellness plan</strong>
            {" "}— then matches it to{" "}
            <strong style={{ color: "var(--hpf-pink)", fontWeight: 600 }}>vetted providers near you</strong>
            {" "}so your plan is ready to book, not just to browse.
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              to="/sign-up"
              className="inline-flex items-center px-7 py-3.5 rounded-md text-sm font-semibold text-white no-underline transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--hpf-pink)",
                fontFamily: "var(--app-font-sans)",
                boxShadow: "0 4px 16px rgba(212,34,126,0.25)",
                letterSpacing: "0.01em",
              }}
            >
              Build my plan free →
            </Link>
            <Link
              to="/provider/signup"
              className="inline-flex items-center px-6 py-3.5 rounded-md text-sm font-medium no-underline transition-all"
              style={{
                background: "transparent",
                color: "var(--hpf-pink)",
                border: "1.5px solid rgba(212,34,126,0.2)",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              Join as a provider
            </Link>
          </div>

          <div className="flex flex-wrap gap-5">
            {[
              { icon: "📍", text: "Matched to local providers" },
              { icon: "🔒", text: "Privacy-first intake" },
              { icon: "🧾", text: "No credit card" },
              { icon: "💳", text: "Some services may qualify for HSA/FSA" },
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-md text-xs"
                  style={{ background: "var(--sage-pale)" }}
                >
                  {badge.icon}
                </span>
                {badge.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right — interactive plan speculator (desktop); on mobile it appears below the hero CTAs */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          {/* Factory illustration — decorative position above speculator on desktop */}
          <div className="hidden md:block w-full max-w-sm mx-auto mb-1" style={{ pointerEvents: "none" }}>
            <img
              src="/assets/factory-hero.png"
              alt="Health Plan Factory illustration with worker character"
              className="w-full h-auto"
              style={{ filter: "drop-shadow(0 16px 40px rgba(212,34,126,0.18))" }}
            />
          </div>
          <PlanSpeculator />
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div
        className="flex items-center justify-center flex-wrap gap-10 px-6 py-3.5"
        style={{ background: "var(--hpf-pink)" }}
      >
        {[
          { icon: "✓", text: "Evidence-led modality library" },
          { icon: "✓", text: "12 wellness modalities" },
          { icon: "✓", text: "HSA/FSA tracking included" },
          { icon: "✓", text: "Budget-aware by design" },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-2 text-xs font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
            <span style={{ color: "var(--crimson-light)" }}>{item.icon}</span>
            {item.text}
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how"
        className="px-6 md:px-12 py-20"
        style={{ background: "var(--off-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="section-tag">How it works</div>
          <h2
            className="mb-14"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(2rem, 3.5vw, 3rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              color: "var(--hpf-pink)",
              maxWidth: "480px",
            }}
          >
            From intake to <em style={{ color: "var(--hpf-crimson)" }}>action plan</em> in minutes
          </h2>

          {/* Conveyor connector (desktop) */}
          <div className="relative">
            <div
              className="absolute hidden md:block"
              style={{
                top: "40px",
                left: "10%",
                right: "10%",
                height: "3px",
                background: "repeating-linear-gradient(90deg, rgba(212,34,126,0.2) 0, rgba(212,34,126,0.2) 12px, transparent 12px, transparent 20px)",
                borderRadius: "2px",
                animation: "conveyor 2s linear infinite",
              }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
              {HOW_IT_WORKS.map((step) => (
                <div
                  key={step.num}
                  className="rounded-2xl p-6 text-center transition-all hover:-translate-y-1.5 cursor-default"
                  style={{
                    background: "white",
                    border: "1px solid rgba(212,34,126,0.08)",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4 text-xs font-medium transition-all"
                    style={{
                      background: "var(--hpf-pink)",
                      color: "white",
                      fontFamily: "var(--app-font-mono)",
                    }}
                  >
                    {step.num}
                  </div>
                  <div className="text-2xl mb-3">{step.icon}</div>
                  <h3
                    className="mb-2 text-base font-bold"
                    style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MODALITY GRID ── */}
      <section
        id="modalities"
        className="relative px-6 md:px-12 py-20 overflow-hidden"
        style={{ background: "var(--hpf-pink)" }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute right-12 top-12 text-8xl opacity-5 animate-spin-slow pointer-events-none"
          aria-hidden="true"
          style={{ animationDuration: "20s" }}
        >
          ⚙️
        </div>
        <div
          className="absolute left-20 bottom-16 text-9xl opacity-[0.03] pointer-events-none"
          aria-hidden="true"
          style={{ animation: "gearSpin 30s linear infinite reverse" }}
        >
          ⚙️
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="section-tag" style={{ color: "var(--crimson-light)" }}>
            What's included
          </div>
          <h2
            className="mb-10"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(2rem, 3.5vw, 3rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              color: "white",
              maxWidth: "520px",
            }}
          >
            12 evidence-led modalities,{" "}
            <em style={{ color: "var(--crimson-light)" }}>one unified plan</em>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {MODALITIES.map((mod) => (
              <div
                key={mod.name}
                className="rounded-xl p-4 transition-all hover:-translate-y-0.5 cursor-default"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "rgba(255,255,255,0.1)";
                  el.style.borderColor = "rgba(224,32,64,0.4)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "rgba(255,255,255,0.05)";
                  el.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                <div className="text-xl mb-2">{mod.emoji}</div>
                <p className="text-xs font-medium mb-2 leading-tight" style={{ color: "rgba(255,255,255,0.88)" }}>
                  {mod.name}
                </p>
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded inline-block"
                  style={
                    mod.badgeType === "strong"
                      ? { background: "rgba(125,181,92,0.5)", color: "#82c99a" }
                      : mod.badgeType === "moderate"
                      ? { background: "rgba(224,32,64,0.25)", color: "#e4b94e" }
                      : { background: "rgba(91,155,213,0.25)", color: "#7ab9e8" }
                  }
                >
                  {mod.badge}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs mt-6 text-center" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--app-font-sans)" }}>
            Evidence ratings reflect the current research consensus for general wellness purposes — not clinical treatment recommendations.
          </p>
        </div>
      </section>

      {/* ── IS / IS NOT ── */}
      <section
        className="px-6 md:px-12 py-16"
        style={{
          background: "var(--crimson-pale)",
          borderTop: "3px solid var(--hpf-crimson)",
          borderBottom: "3px solid var(--hpf-crimson)",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2
              style={{
                fontFamily: "var(--app-font-serif)",
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                fontWeight: 700,
                color: "var(--hpf-pink)",
                marginBottom: "0.5rem",
              }}
            >
              What HealthPlanFactory is — and isn't
            </h2>
            <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              We want to be clear about what this platform does and doesn't do so you can use it confidently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* IS */}
            <div>
              <h3
                className="flex items-center gap-2 text-lg font-bold pb-3 mb-4"
                style={{ fontFamily: "var(--app-font-serif)", color: "var(--sage)", borderBottom: "2px solid var(--sage)" }}
              >
                ✓ HealthPlanFactory IS
              </h3>
              <ul className="flex flex-col gap-3">
                {[
                  "A wellness optimization and plan-building platform",
                  "A way to discover and compare local wellness providers",
                  "A budget-aware tool for preventive health spending",
                  "An HSA/FSA spend tracker for wellness expenses",
                  "An AI-powered wellness accountability coach",
                  "A modality research library based on evidence",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-snug" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                    <span className="font-bold mt-0.5 flex-shrink-0" style={{ color: "var(--sage)" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* IS NOT */}
            <div>
              <h3
                className="flex items-center gap-2 text-lg font-bold pb-3 mb-4"
                style={{ fontFamily: "var(--app-font-serif)", color: "#b91c1c", borderBottom: "2px solid #b91c1c" }}
              >
                ✗ HealthPlanFactory IS NOT
              </h3>
              <ul className="flex flex-col gap-3">
                {[
                  "A licensed medical provider or healthcare system",
                  "A diagnostic tool or medical advice service",
                  "A substitute for a physician or therapist",
                  "A replacement for your doctor or care team",
                  "A prescription management or clinical platform",
                  "Regulated by HIPAA as a covered entity",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-snug" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                    <span className="font-bold mt-0.5 flex-shrink-0" style={{ color: "#b91c1c" }}>✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-center mt-8 leading-relaxed pt-6" style={{ color: "var(--text-secondary)", borderTop: "1px solid rgba(224,32,64,0.3)", fontFamily: "var(--app-font-sans)" }}>
            <strong style={{ color: "var(--hpf-pink)" }}>For emergencies:</strong> Call 911 immediately.{" "}
            <strong style={{ color: "var(--hpf-pink)" }}>For mental health crisis:</strong> Call or text 988 (Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis Text Line).
          </p>
        </div>
      </section>

      {/* ── PROBLEM / STATS ── */}
      <section
        className="px-6 md:px-12 py-20"
        style={{ background: "var(--warm-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-14">
            <div>
              <div
                className="leading-none mb-4"
                style={{
                  fontFamily: "var(--app-font-serif)",
                  fontSize: "clamp(5rem, 12vw, 9rem)",
                  fontWeight: 700,
                  color: "var(--hpf-pink)",
                  letterSpacing: "-0.03em",
                  position: "relative",
                  display: "inline-block",
                }}
              >
                75%
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest mt-3" style={{ color: "var(--text-muted)" }}>
                of preventable health spending goes unmanaged
              </p>
            </div>
            <div>
              <h3
                style={{
                  fontFamily: "var(--app-font-serif)",
                  fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                  fontWeight: 700,
                  color: "var(--hpf-pink)",
                  lineHeight: 1.2,
                  marginBottom: "1rem",
                }}
              >
                Most people want a wellness plan. Very few have one that fits their actual life.
              </h3>
              <p className="text-sm font-light leading-relaxed mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                Most wellness spending happens outside the clinic — massage, yoga, nutrition, sleep, acupuncture, and more. HealthPlanFactory organizes it all around your actual budget, so you can actually follow through.
              </p>
              <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                We built the tool we wished existed: practical, evidence-informed, and priced for how real people actually live.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.num}
                className="rounded-xl p-6 relative overflow-hidden"
                style={{
                  background: "white",
                  border: "1px solid rgba(212,34,126,0.08)",
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0"
                  style={{ height: "3px", background: "linear-gradient(90deg, var(--hpf-pink), var(--hpf-crimson))" }}
                />
                <div
                  className="mb-2 leading-none"
                  style={{
                    fontFamily: "var(--app-font-serif)",
                    fontSize: "2.2rem",
                    fontWeight: 700,
                    color: "var(--hpf-pink)",
                  }}
                >
                  {stat.num}
                </div>
                <p className="text-xs font-light leading-snug" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  {stat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section
        id="pricing"
        className="px-6 md:px-12 py-20"
        style={{ background: "var(--parchment)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-tag justify-center">Pricing</div>
            <h2
              className="mb-4"
              style={{
                fontFamily: "var(--app-font-serif)",
                fontSize: "clamp(2rem, 3.5vw, 3rem)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                color: "var(--hpf-pink)",
              }}
            >
              Start free. Upgrade when you're <em style={{ color: "var(--hpf-crimson)" }}>ready.</em>
            </h2>
            <p className="text-sm font-light max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              No subscription required to build your plan. Pay small unlock fees only for the provider contacts you actually want.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className="rounded-2xl p-8 relative transition-all hover:-translate-y-1"
                style={
                  tier.featured
                    ? {
                        background: "var(--hpf-pink)",
                        boxShadow: "0 16px 48px rgba(212,34,126,0.28)",
                      }
                    : {
                        background: "white",
                        border: "1px solid rgba(212,34,126,0.08)",
                      }
                }
              >
                {tier.featured && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-white whitespace-nowrap"
                    style={{ background: "var(--hpf-crimson)", letterSpacing: "0.1em" }}
                  >
                    Most Popular
                  </div>
                )}

                <p
                  className="text-xs font-bold uppercase tracking-widest mb-5"
                  style={{ color: tier.featured ? "rgba(255,255,255,0.4)" : "var(--text-muted)" }}
                >
                  {tier.tier}
                </p>
                <div
                  className="leading-none mb-1"
                  style={{
                    fontFamily: "var(--app-font-serif)",
                    fontSize: "3rem",
                    fontWeight: 700,
                    color: tier.featured ? "white" : "var(--hpf-pink)",
                  }}
                >
                  {tier.price}
                </div>
                <p className="text-xs font-light mb-3" style={{ color: tier.featured ? "rgba(255,255,255,0.4)" : "var(--text-muted)" }}>
                  {tier.per}
                </p>
                <p
                  className="text-xs font-light leading-relaxed mb-5 pb-5"
                  style={{
                    color: tier.featured ? "rgba(255,255,255,0.5)" : "var(--text-secondary)",
                    borderBottom: tier.featured ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(212,34,126,0.08)",
                    fontFamily: "var(--app-font-sans)",
                  }}
                >
                  {tier.desc}
                </p>

                <ul className="flex flex-col mb-8">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 py-2 text-xs font-light leading-snug border-b"
                      style={{
                        color: tier.featured ? "rgba(255,255,255,0.65)" : "var(--text-secondary)",
                        borderColor: tier.featured ? "rgba(255,255,255,0.1)" : "rgba(212,34,126,0.08)",
                        fontFamily: "var(--app-font-sans)",
                      }}
                    >
                      <span
                        className="text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ color: tier.featured ? "var(--crimson-light)" : "var(--sage)" }}
                      >
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to={tier.ctaHref}
                  className="block w-full text-center py-3.5 rounded-lg text-sm font-semibold no-underline transition-all"
                  style={
                    tier.featured
                      ? {
                          background: "var(--hpf-crimson)",
                          color: "white",
                          fontFamily: "var(--app-font-sans)",
                        }
                      : {
                          background: "var(--hpf-pink)",
                          color: "white",
                          fontFamily: "var(--app-font-sans)",
                        }
                  }
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Provider unlocks: $5 wellness · $8 physician · $3 app-based · Plus members pay $0 per reveal
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section
        className="px-6 md:px-12 py-16"
        style={{ background: "var(--warm-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xl mb-2" style={{ color: "var(--hpf-crimson)", letterSpacing: "2px" }}>
              ★★★★★
            </div>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              From early members
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-6 transition-all hover:-translate-y-0.5"
                style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}
              >
                <div className="text-sm mb-3" style={{ color: "var(--hpf-crimson)" }}>{t.stars}</div>
                <blockquote
                  className="text-base font-normal italic leading-relaxed mb-5"
                  style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}
                >
                  "{t.quote}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: "var(--parchment)", border: "1.5px solid rgba(212,34,126,0.1)", color: "var(--hpf-pink)" }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--hpf-pink)" }}>{t.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        id="faq"
        className="px-6 md:px-12 py-20"
        style={{ background: "var(--off-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="section-tag">FAQ</div>
          <h2
            className="mb-10"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(2rem, 3vw, 2.8rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              color: "var(--hpf-pink)",
            }}
          >
            Common questions
          </h2>
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="relative px-6 md:px-12 py-24 text-center overflow-hidden"
        style={{ background: "var(--hpf-pink)" }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(224,32,64,0.12) 0%, transparent 65%)",
            top: "-40%",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ color: "var(--crimson-light)" }}
          >
            <span className="w-6 h-px" style={{ background: "var(--crimson-light)" }} />
            Ready to build your plan
            <span className="w-6 h-px" style={{ background: "var(--crimson-light)" }} />
          </div>

          <h2
            className="mb-5 leading-tight"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            Your wellness plan,{" "}
            <em style={{ color: "var(--crimson-light)" }}>built in minutes.</em>
          </h2>

          <p
            className="text-sm font-light mb-10 leading-relaxed mx-auto"
            style={{ color: "rgba(255,255,255,0.55)", maxWidth: "380px", fontFamily: "var(--app-font-sans)" }}
          >
            Free to start. No credit card needed to build your first plan.
          </p>

          <Link
            to="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-sm font-semibold no-underline transition-all hover:-translate-y-0.5"
            style={{
              background: "white",
              color: "var(--hpf-pink)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              fontFamily: "var(--app-font-sans)",
              letterSpacing: "0.01em",
            }}
          >
            Build my plan free →
          </Link>

          <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--app-font-sans)" }}>
            Takes about 5 minutes · No commitment required
          </p>
        </div>
      </section>

      {/* ── FULL DISCLAIMER ── */}
      <section
        id="full-disclaimer"
        className="px-6 md:px-12 py-16"
        style={{ background: "var(--off-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-3xl mx-auto">
          <h3
            className="flex items-center gap-2 mb-8"
            style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.6rem", fontWeight: 700, color: "var(--hpf-pink)" }}
          >
            ⚖️ Full Platform Disclaimer
          </h3>

          <div
            className="p-4 rounded-lg mb-6 text-sm leading-relaxed"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", borderLeft: "4px solid #dc2626", color: "#7f1d1d" }}
          >
            <strong style={{ color: "#dc2626" }}>Emergency Resources:</strong> If you are experiencing a medical emergency, call{" "}
            <strong>911</strong> immediately. For mental health crisis support, call or text <strong>988</strong> (Suicide & Crisis Lifeline),
            or text HOME to <strong>741741</strong> (Crisis Text Line). Do not use this platform in an emergency.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Not Medical Advice",
                text: "All content on HealthPlanFactory — including AI-generated wellness plans, modality descriptions, provider listings, and coaching messages — is for general informational purposes only. It does not constitute medical advice, diagnosis, or treatment recommendations.",
              },
              {
                title: "No Provider-Patient Relationship",
                text: "Use of this platform does not create a provider-patient, therapist-client, or any other healthcare relationship. Always consult a licensed healthcare professional before beginning any wellness program, especially if you have existing health conditions.",
              },
              {
                title: "Provider Listing Disclaimer",
                text: "HealthPlanFactory lists providers for informational purposes only. We do not independently verify credentials, licenses, or insurance. We do not guarantee outcomes or quality of services. Providers operate independently and are responsible for their own practice standards.",
              },
              {
                title: "HSA/FSA Information",
                text: "HSA/FSA eligibility information is general guidance only. Actual eligibility is determined by your plan documents and plan administrator. Consult your plan administrator or tax advisor before making spending decisions based on this information.",
              },
            ].map((block) => (
              <div key={block.title} className="mb-2">
                <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--hpf-crimson)" }}>
                  {block.title}
                </h4>
                <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  {block.text}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs mt-6 pt-4" style={{ color: "var(--text-muted)", borderTop: "1px solid rgba(212,34,126,0.1)", fontFamily: "var(--app-font-sans)" }}>
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} ·{" "}
            <Link to="/legal" className="no-underline" style={{ color: "var(--hpf-crimson)", textDecoration: "underline" }}>
              View full legal disclaimer
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

