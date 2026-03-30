import { Link } from "wouter";

export default function Dashboard() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-16" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="mb-1" style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>
              My Dashboard
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Your personalized wellness plan
            </p>
          </div>
          <Link href="/onboarding" className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white no-underline" style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
            Build my plan
          </Link>
        </div>

        <div className="rounded-2xl p-10 text-center" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
          <div className="text-5xl mb-4">⚙️</div>
          <h2 className="mb-2 text-lg" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>Member dashboard coming soon</h2>
          <p className="text-sm max-w-md mx-auto leading-relaxed mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            This is a placeholder. The full member dashboard — with your wellness plan, provider discovery, AI coach, and progress tracking — will be here once onboarding is complete.
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Sign in to access your account · Authentication coming in Task #4
          </p>
        </div>
      </div>
    </div>
  );
}
