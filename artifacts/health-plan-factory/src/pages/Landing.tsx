import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

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
      style={{ borderColor: "rgba(27,45,79,0.1)" }}
      onClick={() => setOpen(!open)}
    >
      <div className="flex justify-between items-center py-5 gap-4">
        <h3 className="font-sans font-medium text-sm" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
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
        className="relative grid md:grid-cols-2 gap-12 items-start px-6 md:px-12 pt-16 pb-16"
      >
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(27,45,79,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Left */}
        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 mb-6 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "var(--amber-pale)", border: "1px solid rgba(184,137,42,0.12)", color: "var(--hpf-amber)" }}
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
              color: "var(--navy)",
            }}
          >
            A health plan
            <br />
            built around
            <br />
            <em style={{ color: "var(--hpf-amber)" }}>your life.</em>
          </h1>

          <p
            className="mb-8 leading-relaxed max-w-md"
            style={{ fontSize: "1.05rem", fontWeight: 300, color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            Tell us your budget, your conditions, and your goals.
            HealthPlanFactory assembles a{" "}
            <strong style={{ color: "var(--navy)", fontWeight: 600 }}>prioritized, costed wellness plan</strong>
            {" "}— fitted to what you can actually spend, built around your goals.
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              to="/sign-up"
              className="inline-flex items-center px-7 py-3.5 rounded-md text-sm font-semibold text-white no-underline transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--navy)",
                fontFamily: "var(--app-font-sans)",
                boxShadow: "0 4px 16px rgba(27,45,79,0.25)",
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
                color: "var(--navy)",
                border: "1.5px solid rgba(27,45,79,0.2)",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              Join as a provider
            </Link>
          </div>

          <div className="flex flex-wrap gap-5">
            {[
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

        {/* Right — factory illustration + mini plan card */}
        <div className="relative z-10 flex flex-col items-center gap-5">
          {/* Speech bubble */}
          <div className="relative w-full max-w-md">
            <div
              className="absolute -top-5 right-4 z-10 animate-bobble text-xs font-semibold px-3 py-2 rounded-2xl"
              style={{
                background: "white",
                border: "2px solid var(--navy)",
                color: "var(--navy)",
                boxShadow: "3px 3px 0 var(--navy)",
                whiteSpace: "nowrap",
              }}
            >
              ⚙️ Building your plan now...
            </div>

            {/* Factory SVG */}
            <FactoryIllustration />
          </div>

          {/* Mini plan card */}
          <div
            className="w-full max-w-md animate-float rounded-2xl p-5"
            style={{
              background: "white",
              border: "1.5px solid rgba(27,45,79,0.1)",
              boxShadow: "0 8px 32px rgba(27,45,79,0.1)",
            }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              Your monthly plan preview
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { emoji: "💆", name: "Massage Therapy", freq: "2×/month", cost: "$120", hsa: true, border: "var(--hpf-amber)" },
                { emoji: "🧘", name: "Yoga / Mind-Body", freq: "8×/month", cost: "$60", hsa: false, border: "var(--sage)" },
                { emoji: "🥗", name: "Nutrition Coaching", freq: "1×/month", cost: "$45", hsa: false, border: "var(--sky)" },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{
                    background: "var(--off-white)",
                    borderLeft: `3px solid ${item.border}`,
                  }}
                >
                  <span className="text-base flex-shrink-0">{item.emoji}</span>
                  <span className="text-xs font-semibold flex-1" style={{ color: "var(--navy)" }}>{item.name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.freq}</span>
                  <span className="text-xs font-medium" style={{ fontFamily: "var(--app-font-mono)", color: "var(--navy)" }}>{item.cost}</span>
                  {item.hsa && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: "var(--sage)", background: "var(--sage-pale)" }}>
                      HSA
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 rounded-lg" style={{ background: "var(--navy)" }}>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Monthly total</span>
              <span className="text-sm font-medium" style={{ fontFamily: "var(--app-font-mono)", color: "white" }}>$225 / $260 budget</span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                <span>Budget utilization</span>
                <strong style={{ color: "var(--navy)" }}>87%</strong>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--off-white)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: "87%", background: "linear-gradient(90deg, var(--navy), var(--hpf-amber))" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div
        className="flex items-center justify-center flex-wrap gap-10 px-6 py-3.5"
        style={{ background: "var(--navy)" }}
      >
        {[
          { icon: "✓", text: "Evidence-led modality library" },
          { icon: "✓", text: "12 wellness modalities" },
          { icon: "✓", text: "HSA/FSA tracking included" },
          { icon: "✓", text: "Budget-aware by design" },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-2 text-xs font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
            <span style={{ color: "var(--amber-light)" }}>{item.icon}</span>
            {item.text}
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how"
        className="px-6 md:px-12 py-20"
        style={{ background: "var(--off-white)", borderTop: "1px solid rgba(27,45,79,0.08)" }}
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
              color: "var(--navy)",
              maxWidth: "480px",
            }}
          >
            From intake to <em style={{ color: "var(--hpf-amber)" }}>action plan</em> in minutes
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
                background: "repeating-linear-gradient(90deg, rgba(27,45,79,0.2) 0, rgba(27,45,79,0.2) 12px, transparent 12px, transparent 20px)",
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
                    border: "1px solid rgba(27,45,79,0.08)",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4 text-xs font-medium transition-all"
                    style={{
                      background: "var(--navy)",
                      color: "white",
                      fontFamily: "var(--app-font-mono)",
                    }}
                  >
                    {step.num}
                  </div>
                  <div className="text-2xl mb-3">{step.icon}</div>
                  <h3
                    className="mb-2 text-base font-bold"
                    style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}
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
        style={{ background: "var(--navy)" }}
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
          <div className="section-tag" style={{ color: "var(--amber-light)" }}>
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
            <em style={{ color: "var(--amber-light)" }}>one unified plan</em>
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
                  el.style.borderColor = "rgba(184,137,42,0.4)";
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
                      ? { background: "rgba(61,107,82,0.5)", color: "#82c99a" }
                      : mod.badgeType === "moderate"
                      ? { background: "rgba(184,137,42,0.25)", color: "#e4b94e" }
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
          background: "var(--amber-pale)",
          borderTop: "3px solid var(--hpf-amber)",
          borderBottom: "3px solid var(--hpf-amber)",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2
              style={{
                fontFamily: "var(--app-font-serif)",
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                fontWeight: 700,
                color: "var(--navy)",
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
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-snug" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
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
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-snug" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
                    <span className="font-bold mt-0.5 flex-shrink-0" style={{ color: "#b91c1c" }}>✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-center mt-8 leading-relaxed pt-6" style={{ color: "var(--text-secondary)", borderTop: "1px solid rgba(184,137,42,0.3)", fontFamily: "var(--app-font-sans)" }}>
            <strong style={{ color: "var(--navy)" }}>For emergencies:</strong> Call 911 immediately.{" "}
            <strong style={{ color: "var(--navy)" }}>For mental health crisis:</strong> Call or text 988 (Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis Text Line).
          </p>
        </div>
      </section>

      {/* ── PROBLEM / STATS ── */}
      <section
        className="px-6 md:px-12 py-20"
        style={{ background: "var(--warm-white)", borderTop: "1px solid rgba(27,45,79,0.08)" }}
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
                  color: "var(--navy)",
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
                  color: "var(--navy)",
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
                  border: "1px solid rgba(27,45,79,0.08)",
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0"
                  style={{ height: "3px", background: "linear-gradient(90deg, var(--navy), var(--hpf-amber))" }}
                />
                <div
                  className="mb-2 leading-none"
                  style={{
                    fontFamily: "var(--app-font-serif)",
                    fontSize: "2.2rem",
                    fontWeight: 700,
                    color: "var(--navy)",
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
        style={{ background: "var(--parchment)", borderTop: "1px solid rgba(27,45,79,0.08)" }}
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
                color: "var(--navy)",
              }}
            >
              Start free. Upgrade when you're <em style={{ color: "var(--hpf-amber)" }}>ready.</em>
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
                        background: "var(--navy)",
                        boxShadow: "0 16px 48px rgba(27,45,79,0.28)",
                      }
                    : {
                        background: "white",
                        border: "1px solid rgba(27,45,79,0.08)",
                      }
                }
              >
                {tier.featured && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-white whitespace-nowrap"
                    style={{ background: "var(--hpf-amber)", letterSpacing: "0.1em" }}
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
                    color: tier.featured ? "white" : "var(--navy)",
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
                    borderBottom: tier.featured ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(27,45,79,0.08)",
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
                        borderColor: tier.featured ? "rgba(255,255,255,0.1)" : "rgba(27,45,79,0.08)",
                        fontFamily: "var(--app-font-sans)",
                      }}
                    >
                      <span
                        className="text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ color: tier.featured ? "var(--amber-light)" : "var(--sage)" }}
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
                          background: "var(--hpf-amber)",
                          color: "white",
                          fontFamily: "var(--app-font-sans)",
                        }
                      : {
                          background: "var(--navy)",
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
        style={{ background: "var(--warm-white)", borderTop: "1px solid rgba(27,45,79,0.08)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xl mb-2" style={{ color: "var(--hpf-amber)", letterSpacing: "2px" }}>
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
                style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}
              >
                <div className="text-sm mb-3" style={{ color: "var(--hpf-amber)" }}>{t.stars}</div>
                <blockquote
                  className="text-base font-normal italic leading-relaxed mb-5"
                  style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}
                >
                  "{t.quote}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: "var(--parchment)", border: "1.5px solid rgba(27,45,79,0.1)", color: "var(--navy)" }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--navy)" }}>{t.name}</p>
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
        style={{ background: "var(--off-white)", borderTop: "1px solid rgba(27,45,79,0.08)" }}
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
              color: "var(--navy)",
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
        style={{ background: "var(--navy)" }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(184,137,42,0.12) 0%, transparent 65%)",
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
            style={{ color: "var(--amber-light)" }}
          >
            <span className="w-6 h-px" style={{ background: "var(--amber-light)" }} />
            Ready to build your plan
            <span className="w-6 h-px" style={{ background: "var(--amber-light)" }} />
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
            <em style={{ color: "var(--amber-light)" }}>built in minutes.</em>
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
              color: "var(--navy)",
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
        style={{ background: "var(--off-white)", borderTop: "1px solid rgba(27,45,79,0.08)" }}
      >
        <div className="max-w-3xl mx-auto">
          <h3
            className="flex items-center gap-2 mb-8"
            style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.6rem", fontWeight: 700, color: "var(--navy)" }}
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
                <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--hpf-amber)" }}>
                  {block.title}
                </h4>
                <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  {block.text}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs mt-6 pt-4" style={{ color: "var(--text-muted)", borderTop: "1px solid rgba(27,45,79,0.1)", fontFamily: "var(--app-font-sans)" }}>
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} ·{" "}
            <Link to="/legal" className="no-underline" style={{ color: "var(--hpf-amber)", textDecoration: "underline" }}>
              View full legal disclaimer
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function FactoryIllustration() {
  return (
    <svg viewBox="0 0 480 280" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" style={{ filter: "drop-shadow(0 16px 40px rgba(27,45,79,0.15))" }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f4fd" />
          <stop offset="100%" stopColor="#f4f2ee" />
        </linearGradient>
        <style>{`
          .smoke1{animation:smokeRise 3s ease-in-out infinite}
          .smoke2{animation:smokeRise 3s 1s ease-in-out infinite}
          .smoke3{animation:smokeRise 3s 2s ease-in-out infinite}
          @keyframes smokeRise{0%{transform:translateY(0) scaleX(1);opacity:.5}100%{transform:translateY(-40px) scaleX(1.4);opacity:0}}
          .gear-anim{animation:gearSpin 4s linear infinite;transform-origin:50% 50%}
          .gear-anim2{animation:gearSpin 4s linear infinite reverse;transform-origin:50% 50%}
          @keyframes gearSpin{to{transform:rotate(360deg)}}
          .win-blink{animation:winBlink 4s ease-in-out infinite}
          @keyframes winBlink{0%,90%,100%{opacity:1}95%{opacity:0.3}}
        `}</style>
        <clipPath id="smokeClip"><rect x="0" y="0" width="480" height="180" /></clipPath>
      </defs>

      {/* Sky */}
      <rect width="480" height="280" fill="url(#sky)" rx="16" />

      {/* Ground */}
      <rect x="0" y="238" width="480" height="42" fill="#e8dfc8" />
      <rect x="0" y="234" width="480" height="7" fill="#d4c9b0" />

      {/* Smoke */}
      <g clipPath="url(#smokeClip)">
        <circle className="smoke1" cx="130" cy="85" r="12" fill="rgba(180,200,220,0.6)" />
        <circle className="smoke1" cx="138" cy="80" r="9" fill="rgba(180,200,220,0.5)" />
        <circle className="smoke2" cx="200" cy="75" r="11" fill="rgba(180,200,220,0.6)" />
        <circle className="smoke2" cx="208" cy="70" r="8" fill="rgba(180,200,220,0.5)" />
        <circle className="smoke3" cx="265" cy="72" r="10" fill="rgba(180,200,220,0.5)" />
      </g>

      {/* Main building */}
      <rect x="60" y="138" width="360" height="100" fill="#1b2d4f" rx="4" />
      <rect x="60" y="134" width="360" height="8" fill="#243a62" rx="2" />
      <rect x="40" y="165" width="38" height="73" fill="#243a62" rx="2" />
      <rect x="402" y="155" width="38" height="83" fill="#243a62" rx="2" />

      {/* Chimneys */}
      <rect x="110" y="92" width="22" height="50" fill="#2f4a7a" rx="3" />
      <rect x="106" y="88" width="30" height="9" fill="#3a5a8a" rx="2" />
      <rect x="178" y="80" width="22" height="58" fill="#2f4a7a" rx="3" />
      <rect x="174" y="76" width="30" height="9" fill="#3a5a8a" rx="2" />
      <rect x="248" y="74" width="18" height="64" fill="#2f4a7a" rx="3" />
      <rect x="244" y="70" width="26" height="9" fill="#3a5a8a" rx="2" />

      {/* Windows */}
      <rect x="80" y="152" width="26" height="18" fill="#fdf5e6" rx="3" opacity="0.9" />
      <rect x="80" y="152" width="26" height="18" fill="#b8892a" rx="3" opacity="0.3" />
      <rect x="118" y="152" width="26" height="18" fill="#fdf5e6" rx="3" opacity="0.9" />
      <rect className="win-blink" x="156" y="152" width="26" height="18" fill="#fdf5e6" rx="3" opacity="0.9" />
      <rect className="win-blink" x="156" y="152" width="26" height="18" fill="#b8892a" rx="3" opacity="0.3" />
      <rect x="194" y="152" width="26" height="18" fill="#fdf5e6" rx="3" opacity="0.9" />
      <rect x="232" y="152" width="26" height="18" fill="#fdf5e6" rx="3" opacity="0.9" />
      <rect x="270" y="152" width="26" height="18" fill="#fdf5e6" rx="3" opacity="0.9" />
      <rect x="308" y="152" width="26" height="18" fill="#fdf5e6" rx="3" opacity="0.9" />
      <rect x="346" y="152" width="26" height="18" fill="#fdf5e6" rx="3" opacity="0.9" />
      <rect x="85" y="184" width="16" height="12" fill="#fdf5e6" rx="2" opacity="0.7" />
      <rect x="122" y="184" width="16" height="12" fill="#fdf5e6" rx="2" opacity="0.7" />
      <rect x="159" y="184" width="16" height="12" fill="#fdf5e6" rx="2" opacity="0.7" />
      <rect x="196" y="184" width="16" height="12" fill="#fdf5e6" rx="2" opacity="0.7" />
      <rect x="233" y="184" width="16" height="12" fill="#fdf5e6" rx="2" opacity="0.7" />
      <rect x="270" y="184" width="16" height="12" fill="#fdf5e6" rx="2" opacity="0.7" />
      <rect x="307" y="184" width="16" height="12" fill="#fdf5e6" rx="2" opacity="0.7" />
      <rect x="344" y="184" width="16" height="12" fill="#fdf5e6" rx="2" opacity="0.7" />

      {/* Door */}
      <rect x="202" y="205" width="46" height="33" fill="#243a62" rx="4" />
      <rect x="206" y="209" width="38" height="25" fill="#1a2840" rx="3" />
      <circle cx="238" cy="223" r="2.5" fill="#b8892a" />
      <path d="M202 209 Q225 195 248 209" fill="none" stroke="#b8892a" strokeWidth="2" />

      {/* Sign */}
      <rect x="152" y="120" width="126" height="24" fill="#b8892a" rx="4" />
      <text x="215" y="136" fontSize="9" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">HEALTH PLAN FACTORY</text>

      {/* Gear system */}
      <g transform="translate(385, 205)" className="gear-anim">
        <circle r="20" fill="none" stroke="#b8892a" strokeWidth="4" />
        <circle r="12" fill="#1b2d4f" />
        <circle r="3.5" fill="#b8892a" />
        <rect x="-3.5" y="-24" width="7" height="7" rx="1" fill="#b8892a" />
        <rect x="-3.5" y="17" width="7" height="7" rx="1" fill="#b8892a" />
        <rect x="-24" y="-3.5" width="7" height="7" rx="1" fill="#b8892a" />
        <rect x="17" y="-3.5" width="7" height="7" rx="1" fill="#b8892a" />
      </g>
      <g transform="translate(365, 190)" className="gear-anim2">
        <circle r="13" fill="none" stroke="#d4a44c" strokeWidth="3" />
        <circle r="7" fill="#1b2d4f" />
        <circle r="2" fill="#d4a44c" />
        <rect x="-2" y="-16" width="4" height="5" rx="1" fill="#d4a44c" />
        <rect x="-2" y="11" width="4" height="5" rx="1" fill="#d4a44c" />
        <rect x="-16" y="-2" width="5" height="4" rx="1" fill="#d4a44c" />
        <rect x="11" y="-2" width="5" height="4" rx="1" fill="#d4a44c" />
      </g>

      {/* Conveyor belt */}
      <rect x="60" y="228" width="115" height="10" fill="#2f4a7a" rx="3" />
      <line x1="70" y1="229" x2="70" y2="237" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
      <line x1="85" y1="229" x2="85" y2="237" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
      <line x1="100" y1="229" x2="100" y2="237" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
      <line x1="115" y1="229" x2="115" y2="237" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
      <line x1="130" y1="229" x2="130" y2="237" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
      <line x1="155" y1="229" x2="155" y2="237" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
      <circle cx="64" cy="233" r="5" fill="#243a62" stroke="#b8892a" strokeWidth="2" />
      <circle cx="170" cy="233" r="5" fill="#243a62" stroke="#b8892a" strokeWidth="2" />
      <rect x="86" y="219" width="16" height="14" fill="#3d6b52" rx="2" />
      <rect x="88" y="221" width="12" height="4" fill="rgba(255,255,255,.3)" rx="1" />
      <rect x="112" y="221" width="13" height="13" fill="#b8892a" rx="2" />
      <text x="118" y="230" fontSize="7" fill="white" textAnchor="middle" fontFamily="Arial">✓</text>

      {/* Worker character */}
      <circle cx="310" cy="225" r="7" fill="#fdf5e6" stroke="#1b2d4f" strokeWidth="1.5" />
      <rect x="304" y="215" width="12" height="4" fill="#b8892a" rx="2" />
      <rect x="303" y="218" width="14" height="3" fill="#d4a44c" rx="1" />
      <circle cx="307" cy="224" r="1" fill="#1b2d4f" />
      <circle cx="313" cy="224" r="1" fill="#1b2d4f" />
    </svg>
  );
}
