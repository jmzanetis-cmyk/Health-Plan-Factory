export default function Progress() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-lg text-center">
        <div className="text-5xl mb-6">📈</div>
        <h1 className="mb-3" style={{ fontFamily: "var(--app-font-serif)", fontSize: "2.5rem", fontWeight: 700, color: "var(--navy)" }}>
          Progress & Insights
        </h1>
        <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
          Track your wellness score over time, view journal trends, and see which modalities are making the biggest difference.
        </p>
      </div>
    </div>
  );
}
