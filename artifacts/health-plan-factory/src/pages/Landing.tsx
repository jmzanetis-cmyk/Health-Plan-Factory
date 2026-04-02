import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { PlanSpeculator } from "@/components/PlanSpeculator";
import type { SurveyData } from "@/pages/Survey";
import { GOALS } from "@/types/onboarding";

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

function PersonalizedBanner({ survey, onDismiss }: { survey: SurveyData; onDismiss: () => void }) {
  const goals = survey.goals ?? [];
  const budget = survey.budgetMidpoint;

  const goalMap = Object.fromEntries(GOALS.map((g) => [g.id, g.label]));
  const goalLabels = goals.slice(0, 3).map((id) => goalMap[id] ?? id).join(", ");
  const goalText = goalLabels
    ? `Based on your goals (${goalLabels}), we'll build you a personalized plan.`
    : "We'll build you a personalized wellness plan based on your responses.";

  const params = new URLSearchParams();
  if (goals.length > 0) params.set("goals", goals.join(","));
  if (budget) params.set("budget", String(budget));
  const ctaHref = `/onboarding${params.toString() ? `?${params}` : ""}`;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(212,34,126,0.08) 0%, rgba(224,32,64,0.05) 100%)",
        borderBottom: "1px solid rgba(212,34,126,0.15)",
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", flex: 1 }}>
        <span style={{ fontSize: "1.25rem" }}>✨</span>
        <div>
          <p
            style={{
              fontFamily: "var(--app-font-sans)",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "var(--hpf-pink)",
              marginBottom: "0.15rem",
            }}
          >
            Welcome back! Your personalized plan is ready.
          </p>
          <p
            style={{
              fontFamily: "var(--app-font-sans)",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
            }}
          >
            {goalText}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link
          to={ctaHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.6rem 1.25rem",
            borderRadius: 8,
            background: "var(--hpf-pink)",
            color: "white",
            fontSize: "0.85rem",
            fontWeight: 600,
            fontFamily: "var(--app-font-sans)",
            textDecoration: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 10px rgba(212,34,126,0.25)",
          }}
        >
          Build My Free Plan →
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: "0.25rem",
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default function Landing() {
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("hpf_survey_banner_dismissed");
      if (dismissed) {
        setBannerDismissed(true);
        return;
      }
      const raw = sessionStorage.getItem("hpf_survey");
      if (raw) {
        const parsed = JSON.parse(raw) as SurveyData;
        if (parsed.goals?.length && parsed.budgetRange) {
          setSurvey(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDismissBanner = () => {
    sessionStorage.setItem("hpf_survey_banner_dismissed", "1");
    setBannerDismissed(true);
  };

  return (
    <div style={{ background: "var(--warm-white)", overflowX: "hidden" }}>

      {/* ── PERSONALIZED WELCOME BANNER ── */}
      {survey && !bannerDismissed && (
        <PersonalizedBanner survey={survey} onDismiss={handleDismissBanner} />
      )}

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
          {/* Factory illustration — animated inline SVG */}
          <div className="hidden md:block w-full max-w-sm mx-auto mb-1" style={{ pointerEvents: "none" }}>
            <svg
              viewBox="0 0 480 320"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto"
              style={{ filter: "drop-shadow(0 16px 40px rgba(212,34,126,0.2))" }}
            >
              <defs>
                <linearGradient id="fctSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff0f3"/>
                  <stop offset="100%" stopColor="#f4f2ee"/>
                </linearGradient>
                <style>{`
                  .fct-s1{animation:fctSmoke 3s ease-in-out infinite}
                  .fct-s2{animation:fctSmoke 3s 1s ease-in-out infinite}
                  .fct-s3{animation:fctSmoke 3s 2s ease-in-out infinite}
                  @keyframes fctSmoke{0%{transform:translateY(0) scaleX(1);opacity:.5}100%{transform:translateY(-40px) scaleX(1.4);opacity:0}}
                  @keyframes fctGear{to{transform:rotate(360deg)}}
                  .fct-wb{animation:fctBlink 4s ease-in-out infinite}
                  @keyframes fctBlink{0%,90%,100%{opacity:1}95%{opacity:.3}}
                  .fct-belt{animation:fctBelt 1.5s linear infinite}
                  @keyframes fctBelt{from{stroke-dashoffset:0}to{stroke-dashoffset:-20}}
                  @keyframes fctWave{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-22deg)}}
                `}</style>
                <clipPath id="fctClip"><rect x="0" y="0" width="480" height="200"/></clipPath>
              </defs>

              {/* Sky */}
              <rect width="480" height="320" fill="url(#fctSky)" rx="16"/>

              {/* Ground */}
              <rect x="0" y="260" width="480" height="60" fill="#f0e4e8"/>
              <rect x="0" y="256" width="480" height="8" fill="#e2cdd3"/>

              {/* Smoke */}
              <g clipPath="url(#fctClip)">
                <circle className="fct-s1" cx="140" cy="95" r="14" fill="rgba(224,130,170,0.6)"/>
                <circle className="fct-s1" cx="148" cy="90" r="10" fill="rgba(224,130,170,0.5)"/>
                <circle className="fct-s2" cx="210" cy="85" r="12" fill="rgba(224,130,170,0.6)"/>
                <circle className="fct-s2" cx="218" cy="80" r="9" fill="rgba(224,130,170,0.5)"/>
                <circle className="fct-s3" cx="280" cy="80" r="11" fill="rgba(224,130,170,0.5)"/>
              </g>

              {/* Main factory body */}
              <rect x="60" y="150" width="360" height="110" fill="#c01054" rx="4"/>
              <rect x="60" y="146" width="360" height="8" fill="#a80d42" rx="2"/>
              <rect x="40" y="180" width="40" height="80" fill="#a80d42" rx="2"/>
              <rect x="400" y="170" width="40" height="90" fill="#a80d42" rx="2"/>

              {/* Chimneys */}
              <rect x="120" y="100" width="24" height="55" fill="#d4227e" rx="3"/>
              <rect x="116" y="96" width="32" height="10" fill="#e84d65" rx="2"/>
              <rect x="190" y="88" width="24" height="62" fill="#d4227e" rx="3"/>
              <rect x="186" y="84" width="32" height="10" fill="#e84d65" rx="2"/>
              <rect x="260" y="82" width="20" height="68" fill="#d4227e" rx="3"/>
              <rect x="256" y="78" width="28" height="10" fill="#e84d65" rx="2"/>

              {/* Windows row 1 */}
              <rect x="80" y="165" width="28" height="20" fill="#fdf5e6" rx="3" opacity=".9"/>
              <rect x="80" y="165" width="28" height="20" fill="#e02040" rx="3" opacity=".15"/>
              <rect x="80" y="165" width="13" height="20" fill="none" stroke="#e02040" strokeWidth=".5" rx="3"/>
              <rect x="120" y="165" width="28" height="20" fill="#fdf5e6" rx="3" opacity=".9"/>
              <rect x="120" y="165" width="28" height="20" fill="#e02040" rx="3" opacity=".15"/>
              <rect className="fct-wb" x="160" y="165" width="28" height="20" fill="#fdf5e6" rx="3" opacity=".9"/>
              <rect className="fct-wb" x="160" y="165" width="28" height="20" fill="#e02040" rx="3" opacity=".15"/>
              <rect x="200" y="165" width="28" height="20" fill="#fdf5e6" rx="3" opacity=".9"/>
              <rect x="240" y="165" width="28" height="20" fill="#fdf5e6" rx="3" opacity=".9"/>
              <rect x="280" y="165" width="28" height="20" fill="#fdf5e6" rx="3" opacity=".9"/>
              <rect x="320" y="165" width="28" height="20" fill="#fdf5e6" rx="3" opacity=".9"/>
              <rect x="360" y="165" width="28" height="20" fill="#fdf5e6" rx="3" opacity=".9"/>

              {/* Windows row 2 */}
              <rect x="90" y="200" width="18" height="14" fill="#fdf5e6" rx="2" opacity=".7"/>
              <rect x="130" y="200" width="18" height="14" fill="#fdf5e6" rx="2" opacity=".7"/>
              <rect x="170" y="200" width="18" height="14" fill="#fdf5e6" rx="2" opacity=".7"/>
              <rect x="210" y="200" width="18" height="14" fill="#fdf5e6" rx="2" opacity=".7"/>
              <rect x="250" y="200" width="18" height="14" fill="#fdf5e6" rx="2" opacity=".7"/>
              <rect x="290" y="200" width="18" height="14" fill="#fdf5e6" rx="2" opacity=".7"/>
              <rect x="330" y="200" width="18" height="14" fill="#fdf5e6" rx="2" opacity=".7"/>
              <rect x="370" y="200" width="18" height="14" fill="#fdf5e6" rx="2" opacity=".7"/>

              {/* Door */}
              <rect x="200" y="220" width="50" height="40" fill="#a80d42" rx="4"/>
              <rect x="204" y="224" width="42" height="32" fill="#8a0a38" rx="3"/>
              <circle cx="240" cy="242" r="3" fill="#e02040"/>
              <path d="M200 224 Q225 208 250 224" fill="none" stroke="#e02040" strokeWidth="2"/>

              {/* Big gear — outer <g> positions, inner <g> spins */}
              <g transform="translate(390,220)">
                <g style={{ animation: "fctGear 4s linear infinite", transformOrigin: "0px 0px" }}>
                  <circle r="22" fill="none" stroke="#e02040" strokeWidth="4"/>
                  <circle r="14" fill="#c01054"/>
                  <circle r="4" fill="#e02040"/>
                  <rect x="-4" y="-26" width="8" height="8" rx="1" fill="#e02040"/>
                  <rect x="-4" y="18" width="8" height="8" rx="1" fill="#e02040"/>
                  <rect x="-26" y="-4" width="8" height="8" rx="1" fill="#e02040"/>
                  <rect x="18" y="-4" width="8" height="8" rx="1" fill="#e02040"/>
                  <rect x="-20" y="-20" width="7" height="7" rx="1" fill="#e02040" transform="rotate(45)"/>
                  <rect x="13" y="-20" width="7" height="7" rx="1" fill="#e02040" transform="rotate(45)"/>
                </g>
              </g>

              {/* Small gear */}
              <g transform="translate(368,205)">
                <g style={{ animation: "fctGear 4s linear infinite reverse", transformOrigin: "0px 0px" }}>
                  <circle r="14" fill="none" stroke="#ff5f7a" strokeWidth="3"/>
                  <circle r="8" fill="#c01054"/>
                  <circle r="2.5" fill="#ff5f7a"/>
                  <rect x="-2.5" y="-17" width="5" height="6" rx="1" fill="#ff5f7a"/>
                  <rect x="-2.5" y="11" width="5" height="6" rx="1" fill="#ff5f7a"/>
                  <rect x="-17" y="-2.5" width="6" height="5" rx="1" fill="#ff5f7a"/>
                  <rect x="11" y="-2.5" width="6" height="5" rx="1" fill="#ff5f7a"/>
                </g>
              </g>

              {/* Conveyor belt */}
              <rect x="60" y="248" width="120" height="12" fill="#d4227e" rx="3"/>
              {/* Animated belt surface */}
              <line
                className="fct-belt"
                x1="65" y1="254" x2="175" y2="254"
                stroke="rgba(255,255,255,.18)"
                strokeWidth="8"
                strokeDasharray="10,10"
              />
              <circle cx="65" cy="254" r="6" fill="#a80d42" stroke="#e02040" strokeWidth="2"/>
              <circle cx="175" cy="254" r="6" fill="#a80d42" stroke="#e02040" strokeWidth="2"/>

              {/* Boxes on conveyor */}
              <rect x="88" y="239" width="18" height="16" fill="#3d6b52" rx="2"/>
              <rect x="95.5" y="242" width="3" height="10" fill="white" rx="1"/>
              <rect x="91" y="245.5" width="10" height="3" fill="white" rx="1"/>
              <rect x="115" y="241" width="14" height="14" fill="#e02040" rx="2"/>
              <text x="122" y="251" fontSize="8" fill="white" textAnchor="middle" fontFamily="Arial">Rx</text>

              {/* Sign */}
              <rect x="155" y="134" width="120" height="28" fill="#e02040" rx="4"/>
              <text x="215" y="153" fontSize="10" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">HEALTH PLAN FACTORY</text>

              {/* Worker character */}
              <circle cx="310" cy="243" r="8" fill="#fdf5e6" stroke="#1a1a2e" strokeWidth="1.5"/>
              <rect x="303" y="232" width="14" height="5" fill="#e02040" rx="2"/>
              <rect x="302" y="236" width="16" height="3" fill="#ff5f7a" rx="1"/>
              <circle cx="307" cy="242" r="1.2" fill="#1a1a2e"/>
              <circle cx="313" cy="242" r="1.2" fill="#1a1a2e"/>
              <path d="M307 246 Q310 249 313 246" fill="none" stroke="#1a1a2e" strokeWidth="1"/>
              <rect x="304" y="251" width="12" height="14" fill="#d4227e" rx="2"/>
              {/* Waving arm — animated rotation around shoulder pivot */}
              <g style={{ animation: "fctWave 1.5s ease-in-out infinite", transformOrigin: "316px 254px" }}>
                <line x1="316" y1="254" x2="326" y2="248" stroke="#fdf5e6" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="328" cy="247" r="3" fill="#fdf5e6" stroke="#1a1a2e" strokeWidth="1"/>
              </g>
              <line x1="304" y1="255" x2="296" y2="259" stroke="#fdf5e6" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="307" y1="265" x2="305" y2="275" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="313" y1="265" x2="315" y2="275" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round"/>
              <ellipse cx="304" cy="276" rx="4" ry="2" fill="#1a1a2e"/>
              <ellipse cx="316" cy="276" rx="4" ry="2" fill="#1a1a2e"/>

              {/* Decorative clouds */}
              <ellipse cx="60" cy="60" rx="25" ry="12" fill="white" opacity=".7"/>
              <ellipse cx="78" cy="55" rx="18" ry="10" fill="white" opacity=".7"/>
              <ellipse cx="380" cy="50" rx="22" ry="10" fill="white" opacity=".6"/>
              <ellipse cx="395" cy="45" rx="15" ry="8" fill="white" opacity=".6"/>

              {/* Sun */}
              <circle cx="430" cy="40" r="18" fill="#fdf5e6" opacity=".8"/>
              <circle cx="430" cy="40" r="12" fill="#fdf0c0" opacity=".9"/>
              <line x1="430" y1="18" x2="430" y2="14" stroke="#e8c84a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="448" y1="22" x2="451" y2="19" stroke="#e8c84a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="454" y1="40" x2="458" y2="40" stroke="#e8c84a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="448" y1="58" x2="451" y2="61" stroke="#e8c84a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="412" y1="22" x2="409" y2="19" stroke="#e8c84a" strokeWidth="2" strokeLinecap="round"/>
            </svg>
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

      {/* ── SAVINGS CALCULATOR CTA ── */}
      <section
        className="px-6 md:px-12 py-16"
        style={{ background: "var(--hpf-pink)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              <span className="w-5 h-px" style={{ background: "rgba(255,255,255,0.3)" }} />
              HSA/FSA Savings Calculator
            </div>
            <h2
              className="mb-3 leading-tight"
              style={{
                fontFamily: "var(--app-font-serif)",
                fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.02em",
              }}
            >
              See how much you could save with tax-free wellness dollars.
            </h2>
            <p
              className="text-sm font-light leading-relaxed"
              style={{ color: "rgba(255,255,255,0.65)", fontFamily: "var(--app-font-sans)", maxWidth: 420 }}
            >
              68% of HSA/FSA holders leave money on the table. Our free calculator shows your estimated
              tax savings based on your budget and bracket — in under 30 seconds.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              to="/savings-calculator"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-lg text-sm font-semibold no-underline"
              style={{
                background: "white",
                color: "var(--hpf-pink)",
                fontFamily: "var(--app-font-sans)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
              }}
            >
              Calculate Your Savings →
            </Link>
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

