import { useState } from "react";
import { Link } from "react-router-dom";

const navy = "#1b2d4f";
const amber = "#b8892a";
const sage = "#3d6b52";

const CONTACT_EMAIL = "employers@healthplanfactory.com";

interface DemoFormState {
  name: string;
  company: string;
  email: string;
  teamSize: string;
  submitted: boolean;
  submitting: boolean;
}

export default function ForEmployers() {
  const [form, setForm] = useState<DemoFormState>({
    name: "",
    company: "",
    email: "",
    teamSize: "",
    submitted: false,
    submitting: false,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForm((prev) => ({ ...prev, submitting: true }));
    const subject = encodeURIComponent(`Demo request — ${form.company} (${form.teamSize} employees)`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nCompany: ${form.company}\nEmail: ${form.email}\nTeam size: ${form.teamSize}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setTimeout(() => setForm((prev) => ({ ...prev, submitted: true, submitting: false })), 400);
  }

  const formValid = form.name.trim() && form.company.trim() && form.email.includes("@") && form.teamSize;

  return (
    <div style={{ minHeight: "100vh", background: "var(--warm-white)" }}>

      {/* ── HERO ── */}
      <div style={{ background: navy, padding: "72px 24px 64px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <nav style={{ marginBottom: 20, display: "flex", gap: 6, alignItems: "center", fontFamily: "var(--app-font-sans)", fontSize: 13 }}>
            <Link to="/" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Home</Link>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
            <span style={{ color: "rgba(255,255,255,0.9)" }}>For Employers</span>
          </nav>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <div
                className="inline-flex items-center gap-2 mb-6 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-widest"
                style={{ background: "rgba(184,137,42,0.15)", border: "1px solid rgba(184,137,42,0.3)", color: "#d4a84b" }}
              >
                ✦ Employer Benefits
              </div>
              <h1
                style={{
                  fontFamily: "var(--app-font-serif)",
                  fontSize: "clamp(2.2rem,4vw,3.5rem)",
                  fontWeight: 700,
                  color: "white",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  marginBottom: "1.25rem",
                }}
              >
                A personalized wellness benefit your team will actually use.
              </h1>
              <p
                className="text-sm font-light leading-relaxed mb-8"
                style={{ color: "rgba(255,255,255,0.65)", fontFamily: "var(--app-font-sans)", maxWidth: 480 }}
              >
                Stop paying for generic gym memberships nobody redeems. Health Plan Factory builds each employee a{" "}
                <strong style={{ color: "white", fontWeight: 600 }}>custom wellness plan</strong> fitted to their budget, conditions, and goals — with HSA/FSA guidance built in.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#request-demo"
                  className="inline-flex items-center px-7 py-3.5 rounded-md text-sm font-semibold no-underline transition-all"
                  style={{
                    background: amber,
                    color: "white",
                    fontFamily: "var(--app-font-sans)",
                    boxShadow: "0 4px 16px rgba(184,137,42,0.35)",
                    letterSpacing: "0.01em",
                  }}
                >
                  Request a demo →
                </a>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center px-6 py-3.5 rounded-md text-sm font-medium no-underline transition-all"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.8)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    fontFamily: "var(--app-font-sans)",
                  }}
                >
                  See how it works
                </Link>
              </div>
            </div>

            {/* Right — stat card */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(12px)",
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--app-font-sans)" }}>
                ROI at a glance
              </p>
              {[
                { value: "$1,700", label: "Average annual cost of preventable absenteeism per employee", color: amber },
                { value: "67%", label: "of employees say wellness benefits influence their decision to stay at a company", color: "#4fb0a0" },
                { value: "3.2×", label: "ROI on employer wellness programs in reduced healthcare costs (Harvard School of Public Health)", color: "#8bcf9a" },
                { value: "From $8", label: "per employee/month with Health Plan Factory — less than a gym membership", color: "rgba(255,255,255,0.7)" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-start gap-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span
                    className="flex-shrink-0 text-xl font-bold"
                    style={{ fontFamily: "var(--app-font-mono)", color: stat.color, minWidth: 56 }}
                  >
                    {stat.value}
                  </span>
                  <p className="text-xs font-light leading-relaxed" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--app-font-sans)" }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── VALUE PROPS ── */}
      <div className="px-6 md:px-12 py-20">
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 mb-4 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-widest"
              style={{ background: "rgba(184,137,42,0.08)", border: "1px solid rgba(184,137,42,0.12)", color: amber }}
            >
              Why it works
            </div>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 700, color: navy, letterSpacing: "-0.02em", margin: "0 0 1rem" }}>
              A benefit your employees will actually use
            </h2>
            <p className="text-sm font-light leading-relaxed max-w-xl mx-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Generic wellness programs have 5–15% participation. Health Plan Factory is personalized from day one — each employee builds their own plan based on their own health goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: "📋",
                title: "Custom plans per employee",
                desc: "Every team member answers a short health intake. The engine builds a prioritized, costed plan — their conditions, their budget, their goals.",
                color: navy,
              },
              {
                icon: "💳",
                title: "HSA/FSA guidance built in",
                desc: "Each plan flags which modalities are HSA/FSA-eligible and surfaces LMN guidance where applicable — turning benefits dollars into real spending.",
                color: sage,
              },
              {
                icon: "📊",
                title: "Employer wellness dashboard",
                desc: "Aggregate engagement data, team wellness score trends, and modality adoption rates — without individual privacy exposure.",
                color: amber,
              },
              {
                icon: "⚙️",
                title: "Zero admin burden",
                desc: "No per-use approvals. No reimbursement paperwork. Employees manage their own plans; you get a monthly usage report.",
                color: "#5b9bd5",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl p-6 flex flex-col gap-3"
                style={{ background: "white", border: "1px solid rgba(27,45,79,0.07)", boxShadow: "0 2px 12px rgba(27,45,79,0.05)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${card.color}18` }}
                >
                  {card.icon}
                </div>
                <h3 className="text-sm font-semibold" style={{ color: navy, fontFamily: "var(--app-font-sans)" }}>{card.title}</h3>
                <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WHAT YOUR TEAM GETS ── */}
      <div className="px-6 md:px-12 py-16" style={{ background: "var(--off-white)", borderTop: "1px solid rgba(27,45,79,0.06)", borderBottom: "1px solid rgba(27,45,79,0.06)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Left — sample plan card */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "white",
                border: "1.5px solid rgba(27,45,79,0.1)",
                boxShadow: "0 8px 32px rgba(27,45,79,0.08)",
              }}
            >
              <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: "1px solid rgba(27,45,79,0.06)" }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: navy }}
                >
                  JR
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: navy, fontFamily: "var(--app-font-sans)" }}>Jamie Rodriguez</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Marketing Manager · $200/mo wellness budget</p>
                </div>
                <div
                  className="ml-auto px-2 py-1 rounded-md text-xs font-semibold"
                  style={{ background: "rgba(61,107,82,0.1)", color: sage, fontFamily: "var(--app-font-sans)" }}
                >
                  Active
                </div>
              </div>

              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                Monthly plan preview
              </p>

              <div className="flex flex-col gap-2 mb-4">
                {[
                  { emoji: "💆", name: "Massage Therapy", freq: "2×/month", cost: "$120", hsa: true, border: amber },
                  { emoji: "🧘", name: "Yoga / Mind-Body", freq: "8×/month", cost: "$60", hsa: false, border: sage },
                  { emoji: "🥗", name: "Nutrition Coaching", freq: "1×/month", cost: "$45", hsa: false, border: "#5b9bd5" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{ background: "var(--off-white)", borderLeft: `3px solid ${item.border}` }}
                  >
                    <span className="text-base flex-shrink-0">{item.emoji}</span>
                    <span className="text-xs font-semibold flex-1" style={{ color: navy, fontFamily: "var(--app-font-sans)" }}>{item.name}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{item.freq}</span>
                    <span className="text-xs font-medium" style={{ fontFamily: "var(--app-font-mono)", color: navy }}>{item.cost}</span>
                    {item.hsa && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: sage, background: "rgba(61,107,82,0.08)", fontFamily: "var(--app-font-sans)" }}>
                        HSA
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center px-3 py-2.5 rounded-lg mb-3" style={{ background: navy }}>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--app-font-sans)" }}>Monthly total</span>
                <span className="text-sm font-medium" style={{ fontFamily: "var(--app-font-mono)", color: "white" }}>$225 / $200 budget</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                  <span>Budget utilization</span>
                  <strong style={{ color: navy }}>87%</strong>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--off-white)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: "87%", background: `linear-gradient(90deg, ${navy}, ${amber})` }}
                  />
                </div>
              </div>
            </div>

            {/* Right — copy */}
            <div>
              <div
                className="inline-flex items-center gap-2 mb-4 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-widest"
                style={{ background: "rgba(27,45,79,0.06)", color: navy, fontFamily: "var(--app-font-sans)" }}
              >
                The employee experience
              </div>
              <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(1.6rem,3vw,2.5rem)", fontWeight: 700, color: navy, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
                Each employee builds their own plan. You fund the benefit.
              </h2>
              <p className="text-sm font-light leading-relaxed mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                Team members complete a 5-minute health intake — their goals, budget, and conditions. The engine assembles a prioritized wellness plan and surfaces the right providers near them.
              </p>

              <div className="flex flex-col gap-4">
                {[
                  { num: "01", title: "Intake & plan generation", desc: "5-minute health questionnaire → AI-assembled plan with ranked modalities." },
                  { num: "02", title: "Provider matching", desc: "Members browse vetted, in-network providers near them — pre-filtered by their plan." },
                  { num: "03", title: "HSA/FSA spending guidance", desc: "The platform flags eligible services and generates LMN documentation where applicable." },
                  { num: "04", title: "Monthly reporting to HR", desc: "You receive aggregate participation data and wellness score trends — no individual data." },
                ].map((step) => (
                  <div key={step.num} className="flex items-start gap-4">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "rgba(27,45,79,0.08)", color: navy, fontFamily: "var(--app-font-sans)" }}
                    >
                      {step.num}
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-0.5" style={{ color: navy, fontFamily: "var(--app-font-sans)" }}>{step.title}</p>
                      <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRICING TEASER ── */}
      <div className="px-6 md:px-12 py-20">
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="text-center mb-12">
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 700, color: navy, letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
              Simple, transparent pricing
            </h2>
            <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Per-seat. No usage fees. No per-approval admin overhead.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                tier: "Starter",
                price: "$8",
                seats: "10–49 employees",
                features: [
                  "Full plan engine per employee",
                  "Provider directory access",
                  "HSA/FSA eligibility flags",
                  "Monthly HR report",
                ],
                cta: "Request demo",
                highlight: false,
              },
              {
                tier: "Growth",
                price: "$6",
                seats: "50–199 employees",
                features: [
                  "Everything in Starter",
                  "Wellness score dashboard",
                  "Priority onboarding support",
                  "Slack/Teams digest integration",
                ],
                cta: "Request demo",
                highlight: true,
              },
              {
                tier: "Enterprise",
                price: "Custom",
                seats: "200+ employees",
                features: [
                  "Everything in Growth",
                  "HRIS data sync (Rippling, Gusto)",
                  "Custom reporting & SLAs",
                  "Dedicated CSM",
                ],
                cta: "Contact us",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.tier}
                className="rounded-2xl p-6 flex flex-col"
                style={{
                  background: plan.highlight ? navy : "white",
                  border: plan.highlight ? `2px solid ${amber}` : "1px solid rgba(27,45,79,0.08)",
                  boxShadow: plan.highlight ? "0 12px 40px rgba(27,45,79,0.18)" : "0 2px 12px rgba(27,45,79,0.05)",
                }}
              >
                <div className="mb-4">
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: plan.highlight ? amber : "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}
                  >
                    {plan.tier}
                  </p>
                  <p style={{ fontFamily: "var(--app-font-mono)", fontSize: "2.25rem", fontWeight: 700, color: plan.highlight ? "white" : navy, lineHeight: 1 }}>
                    {plan.price}
                  </p>
                  <p className="text-xs mt-1" style={{ color: plan.highlight ? "rgba(255,255,255,0.5)" : "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                    {plan.price !== "Custom" ? "per employee/month · annual billing" : "contact us for pricing"}
                  </p>
                  <p className="text-xs font-semibold mt-1" style={{ color: plan.highlight ? "rgba(255,255,255,0.65)" : "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                    {plan.seats}
                  </p>
                </div>

                <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs font-light leading-relaxed" style={{ color: plan.highlight ? "rgba(255,255,255,0.75)" : "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                      <span style={{ color: plan.highlight ? amber : sage, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="#request-demo"
                  className="block text-center px-5 py-3 rounded-lg text-sm font-semibold no-underline transition-all"
                  style={{
                    background: plan.highlight ? amber : "rgba(27,45,79,0.08)",
                    color: plan.highlight ? "white" : navy,
                    fontFamily: "var(--app-font-sans)",
                  }}
                >
                  {plan.cta} →
                </a>
              </div>
            ))}
          </div>

          <p className="text-center text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Pricing shown is indicative. Final pricing confirmed during demo call. Annual billing required. Minimum 10 seats.
          </p>
        </div>
      </div>

      {/* ── REQUEST DEMO FORM ── */}
      <div
        id="request-demo"
        className="px-6 md:px-12 py-20"
        style={{ background: navy, scrollMarginTop: 80 }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div className="text-center mb-10">
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 700, color: "white", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
              Request a demo
            </h2>
            <p className="text-sm font-light leading-relaxed" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--app-font-sans)" }}>
              We'll walk you through the employer portal and answer any questions. No sales pressure.
            </p>
          </div>

          {form.submitted ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: "var(--app-font-sans)" }}>
                We'll be in touch shortly
              </h3>
              <p className="text-sm font-light" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--app-font-sans)" }}>
                Your email client should have opened a draft. If not, email us directly at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: amber, textDecoration: "none" }}>{CONTACT_EMAIL}</a>.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-8 flex flex-col gap-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {[
                { name: "name", label: "Your name", type: "text", placeholder: "Jane Smith" },
                { name: "company", label: "Company", type: "text", placeholder: "Acme Corp" },
                { name: "email", label: "Work email", type: "email", placeholder: "jane@acme.com" },
              ].map((field) => (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <label
                    htmlFor={field.name}
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--app-font-sans)" }}
                  >
                    {field.label}
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={(form as Record<string, string>)[field.name]}
                    onChange={handleChange}
                    required
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      color: "white",
                      fontFamily: "var(--app-font-sans)",
                      fontSize: "0.875rem",
                      outline: "none",
                    }}
                  />
                </div>
              ))}

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="teamSize"
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--app-font-sans)" }}
                >
                  Team size
                </label>
                <select
                  id="teamSize"
                  name="teamSize"
                  value={form.teamSize}
                  onChange={handleChange}
                  required
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: form.teamSize ? "white" : "rgba(255,255,255,0.4)",
                    fontFamily: "var(--app-font-sans)",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                >
                  <option value="" disabled style={{ background: navy }}>Select team size</option>
                  <option value="10–49" style={{ background: navy }}>10–49 employees</option>
                  <option value="50–199" style={{ background: navy }}>50–199 employees</option>
                  <option value="200–999" style={{ background: navy }}>200–999 employees</option>
                  <option value="1000+" style={{ background: navy }}>1,000+ employees</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!formValid || form.submitting}
                className="mt-2 w-full py-3.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: formValid ? amber : "rgba(255,255,255,0.1)",
                  color: formValid ? "white" : "rgba(255,255,255,0.3)",
                  fontFamily: "var(--app-font-sans)",
                  border: "none",
                  cursor: formValid ? "pointer" : "not-allowed",
                  letterSpacing: "0.01em",
                }}
              >
                {form.submitting ? "Opening email…" : "Request demo →"}
              </button>

              <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--app-font-sans)" }}>
                No spam. We'll respond within 1 business day.
              </p>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}
