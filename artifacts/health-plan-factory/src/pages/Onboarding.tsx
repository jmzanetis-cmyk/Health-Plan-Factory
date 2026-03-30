export default function Onboarding() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-lg text-center">
        <div className="text-5xl mb-6">📋</div>
        <h1 className="mb-3" style={{ fontFamily: "var(--app-font-serif)", fontSize: "2.5rem", fontWeight: 700, color: "var(--navy)" }}>
          Onboarding Wizard
        </h1>
        <p className="text-sm font-light leading-relaxed mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
          The 5-screen intake form — covering your health goals, conditions, budget, lifestyle, and preferences — will be built here in Task #2.
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          Placeholder · Full flow coming soon
        </p>
      </div>
    </div>
  );
}
