export default function AdminDashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-lg text-center">
        <div className="text-5xl mb-6">🔧</div>
        <h1 className="mb-3" style={{ fontFamily: "var(--app-font-serif)", fontSize: "2.5rem", fontWeight: 700, color: "var(--navy)" }}>
          Admin Dashboard
        </h1>
        <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
          Platform overview, member stats, provider applications, and revenue metrics. Coming in Task #5.
        </p>
      </div>
    </div>
  );
}
