import { Link } from "react-router-dom";

export default function ForProviders() {
  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <div className="px-6 md:px-12 py-20" style={{ background: "var(--off-white)", borderBottom: "1px solid rgba(27,45,79,0.08)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="section-tag">For Providers</div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.2rem,4vw,3.5rem)", fontWeight: 700, color: "var(--navy)", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
              Get discovered by members who already want what you offer.
            </h1>
            <p className="text-sm font-light leading-relaxed mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Members build their wellness plans before they find you — so when they view your profile, they've already decided they need your modality. No cold outreach. High-intent leads.
            </p>
            <div className="flex gap-3">
              <Link
                href="/provider/signup"
                className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-semibold text-white no-underline"
                style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
              >
                Apply as a provider →
              </Link>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(27,45,79,0.08)", background: "white" }}>
            <div className="p-6" style={{ background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: "rgba(255,255,255,0.15)" }}>
                  S
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Sarah K., LMT</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Licensed Massage Therapist · Denver, CO</p>
                  <p className="text-xs" style={{ color: "var(--amber-light)" }}>★★★★★ 4.9</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { k: "Modality", v: "Massage Therapy" },
                  { k: "Session rate", v: "$75 / 60 min" },
                  { k: "HSA/FSA accepted", v: "Yes, with LMN" },
                  { k: "New patient leads", v: "12 this month" },
                ].map((row) => (
                  <div key={row.k} className="flex justify-between text-xs">
                    <span style={{ color: "var(--text-muted)" }}>{row.k}</span>
                    <span className="font-medium" style={{ color: "var(--navy)" }}>{row.v}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg text-xs" style={{ background: "var(--amber-pale)", border: "1px solid rgba(184,137,42,0.12)", color: "var(--hpf-amber)" }}>
                <span>🎉</span>
                <span><strong style={{ color: "var(--navy)" }}>Founding Provider</strong> — 0% commission for 90 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)", marginBottom: "2rem" }}>
            Why join HealthPlanFactory?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: "🎯", title: "High-intent leads", desc: "Members view your profile after including your modality in their plan — the highest intent possible." },
              { icon: "📅", title: "Booking calendar", desc: "Accept bookings directly through the platform with integrated calendar and confirmation flow." },
              { icon: "🏭", title: "Founding Program", desc: "Early providers get 0% commission on all bookings through the platform for the first 90 days." },
            ].map((b) => (
              <div key={b.title} className="rounded-xl p-5" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
                <div className="text-2xl mb-3">{b.icon}</div>
                <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>{b.title}</h3>
                <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>{b.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/provider/signup"
              className="inline-flex items-center px-8 py-3.5 rounded-lg text-sm font-semibold text-white no-underline"
              style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
            >
              Apply as a founding provider →
            </Link>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              Applications reviewed within 2–3 business days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
