import { Link } from "react-router-dom";

const MODS = [
  { emoji: "🧘", name: "Yoga / Mind-Body", badge: "Moderate", conditions: "Stress, anxiety, flexibility, chronic pain" },
  { emoji: "💆", name: "Massage Therapy", badge: "Strong", conditions: "Chronic pain, stress, muscle tension" },
  { emoji: "🥗", name: "Nutrition Coaching", badge: "Strong", conditions: "Weight, energy, metabolic health" },
  { emoji: "🏃", name: "Personal Training", badge: "Moderate", conditions: "Fitness, strength, weight management" },
  { emoji: "🧠", name: "Mental Wellness", badge: "Strong", conditions: "Anxiety, depression, stress management" },
  { emoji: "💊", name: "Supplements", badge: "Emerging", conditions: "Deficiencies, immune support, sleep" },
  { emoji: "🌿", name: "Acupuncture", badge: "Moderate", conditions: "Pain, nausea, migraines, fertility" },
  { emoji: "🦴", name: "Chiropractic Care", badge: "Moderate", conditions: "Back pain, neck pain, alignment" },
  { emoji: "🏊", name: "Physical Therapy", badge: "Strong", conditions: "Injury recovery, mobility, chronic pain" },
  { emoji: "💤", name: "Sleep Optimization", badge: "Moderate", conditions: "Insomnia, energy, cognitive health" },
  { emoji: "🔬", name: "Functional Medicine", badge: "Emerging", conditions: "Root-cause chronic conditions" },
  { emoji: "📱", name: "App-Based Programs", badge: "Moderate", conditions: "Meditation, habit, fitness tracking" },
];

export default function Modalities() {
  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <div className="px-6 md:px-12 py-20" style={{ background: "var(--navy)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="section-tag" style={{ color: "var(--amber-light)" }}>What's included</div>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.5rem,5vw,4rem)", fontWeight: 700, color: "white", letterSpacing: "-0.02em", marginBottom: "1rem" }}>
            12 Evidence-Led Modalities
          </h1>
          <p className="text-sm font-light leading-relaxed" style={{ color: "rgba(255,255,255,0.6)", maxWidth: "520px", fontFamily: "var(--app-font-sans)" }}>
            Every modality in your plan is rated by evidence level and cross-referenced with your health conditions and budget.
          </p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODS.map((mod) => (
              <div
                key={mod.name}
                className="rounded-xl p-5 flex items-start gap-4"
                style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}
              >
                <span className="text-2xl flex-shrink-0">{mod.emoji}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>{mod.name}</h3>
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded"
                      style={
                        mod.badge === "Strong"
                          ? { background: "var(--sage-pale)", color: "var(--sage)" }
                          : mod.badge === "Moderate"
                          ? { background: "var(--amber-pale)", color: "var(--hpf-amber)" }
                          : { background: "#e0f0ff", color: "#5b9bd5" }
                      }
                    >
                      {mod.badge}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{mod.conditions}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/sign-up"
              className="inline-flex items-center px-8 py-3.5 rounded-lg text-sm font-semibold text-white no-underline"
              style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
            >
              Build my plan with these modalities →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
