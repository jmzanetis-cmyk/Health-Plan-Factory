import { Link } from "react-router-dom";

export default function HowItWorks() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="section-tag">Process</div>
        <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.5rem,5vw,4rem)", fontWeight: 700, color: "var(--navy)", letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
          How It Works
        </h1>
        <p className="text-base font-light leading-relaxed mb-10" style={{ color: "var(--text-secondary)", maxWidth: "520px", fontFamily: "var(--app-font-sans)" }}>
          HealthPlanFactory guides you from a simple intake form to a complete, budget-aware wellness plan — with matched local providers — in about 5 minutes.
        </p>
        <div className="rounded-2xl p-8 text-center" style={{ background: "var(--off-white)", border: "1px solid rgba(27,45,79,0.08)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Full page coming soon — in the meantime, <Link to="/sign-up" className="no-underline font-semibold" style={{ color: "var(--hpf-amber)" }}>build your plan</Link> to experience the process firsthand.
          </p>
        </div>
      </div>
    </div>
  );
}
