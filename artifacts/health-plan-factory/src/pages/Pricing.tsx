import { Link } from "wouter";

const TIERS = [
  {
    tier: "Explorer",
    price: "Free",
    per: "forever",
    desc: "Build your plan, browse providers, and see what's possible.",
    features: ["Full AI plan generation", "Modality library access", "Provider browse (blurred)", "Up to 2 free unlocks"],
    cta: "Get started free",
    ctaHref: "/sign-up",
    featured: false,
  },
  {
    tier: "Plus",
    price: "$9.99",
    per: "per month or $89.99/year",
    desc: "The full factory experience — unlimited reveals, coaching, and tracking.",
    features: [
      "Everything in Explorer",
      "Unlimited provider reveals",
      "AI accountability coach",
      "Routine & journal builder",
      "HSA/FSA spending log",
      "Progress tracking & insights",
      "14-day free trial included",
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

export default function Pricing() {
  return (
    <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
      <div className="px-6 md:px-12 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-tag justify-center">Pricing</div>
            <h1
              className="mb-4"
              style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.5rem,5vw,4rem)", fontWeight: 700, color: "var(--navy)", letterSpacing: "-0.02em" }}
            >
              Simple, honest pricing.
            </h1>
            <p className="text-sm font-light max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Start free. Pay only for the provider contacts you actually want. Upgrade to Plus for unlimited access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {TIERS.map((tier) => (
              <div
                key={tier.tier}
                className="rounded-2xl p-8 relative"
                style={tier.featured ? { background: "var(--navy)", boxShadow: "0 16px 48px rgba(27,45,79,0.28)" } : { background: "white", border: "1px solid rgba(27,45,79,0.08)" }}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-white whitespace-nowrap" style={{ background: "var(--hpf-amber)" }}>
                    Most Popular
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: tier.featured ? "rgba(255,255,255,0.4)" : "var(--text-muted)" }}>{tier.tier}</p>
                <div className="leading-none mb-1" style={{ fontFamily: "var(--app-font-serif)", fontSize: "3rem", fontWeight: 700, color: tier.featured ? "white" : "var(--navy)" }}>{tier.price}</div>
                <p className="text-xs font-light mb-3" style={{ color: tier.featured ? "rgba(255,255,255,0.4)" : "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{tier.per}</p>
                <p className="text-xs font-light leading-relaxed mb-5 pb-5" style={{ color: tier.featured ? "rgba(255,255,255,0.5)" : "var(--text-secondary)", borderBottom: tier.featured ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(27,45,79,0.08)", fontFamily: "var(--app-font-sans)" }}>{tier.desc}</p>
                <ul className="flex flex-col mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 py-2 text-xs font-light border-b" style={{ color: tier.featured ? "rgba(255,255,255,0.65)" : "var(--text-secondary)", borderColor: tier.featured ? "rgba(255,255,255,0.1)" : "rgba(27,45,79,0.08)", fontFamily: "var(--app-font-sans)" }}>
                      <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: tier.featured ? "var(--amber-light)" : "var(--sage)" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={tier.ctaHref} className="block w-full text-center py-3.5 rounded-lg text-sm font-semibold text-white no-underline" style={{ background: tier.featured ? "var(--hpf-amber)" : "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-6 text-center" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
            <h3 className="font-semibold mb-2 text-sm" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>À la carte provider unlocks</h3>
            <div className="flex justify-center gap-8 flex-wrap">
              {[
                { label: "Wellness provider", price: "$2.00" },
                { label: "Physician / DPC", price: "$3.00" },
                { label: "App-based program", price: "$1.00" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-xl font-semibold mb-1" style={{ fontFamily: "var(--app-font-mono)", color: "var(--navy)" }}>{item.price}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{item.label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-4" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Plus members pay $0 per reveal · Credits earned via referrals never expire</p>
          </div>
        </div>
      </div>
    </div>
  );
}
