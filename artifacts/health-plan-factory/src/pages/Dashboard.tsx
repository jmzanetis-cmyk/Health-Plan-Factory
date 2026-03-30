import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { LayoutDashboard, MapPin, TrendingUp, BookmarkIcon, Plus, ArrowRight, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Plan {
  id: string;
  totalMonthlyCost: number;
  budget: number;
  budgetUtilization: number;
  status: string;
  createdAt: string;
}

interface PlanItem {
  id: string;
  modalityId: string;
  frequency: number;
  estimatedMonthlyCost: number;
  modality?: { name: string; emoji: string };
}

interface ProgressLog {
  id: string;
  rating: number | null;
  note: string | null;
  createdAt: string;
  sessionDate: string | null;
}

interface Favorite {
  id?: string;
  providerId: string;
}

const cardStyle = {
  background: "white",
  border: "1px solid rgba(27,45,79,0.08)",
  borderRadius: "16px",
};

function SkeletonBlock({ h = 16, w = "100%" }: { h?: number; w?: string }) {
  return (
    <div
      className="animate-pulse rounded-md"
      style={{ height: h, width: w, background: "rgba(27,45,79,0.06)" }}
    />
  );
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;

    Promise.all([
      fetch(`${BASE}/api/plans/${uid}/latest`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${BASE}/api/progress?profileId=${uid}&limit=30`, { credentials: "include" })
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${BASE}/api/favorites?profileId=${uid}`, { credentials: "include" })
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([planData, progressData, favData]) => {
      if (planData?.plan) {
        setPlan(planData.plan);
        setPlanItems((planData.items || []).slice(0, 3));
      }
      if (Array.isArray(progressData)) setProgressLogs(progressData.slice(0, 10));
      if (Array.isArray(favData)) setFavorites(favData);
      setLoading(false);
    });
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--warm-white)" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--navy)" }} />
      </div>
    );
  }

  const firstName = user?.firstName || "there";
  const budgetPct = plan ? Math.min(100, Math.round((plan.totalMonthlyCost / plan.budget) * 100)) : 0;
  const avgRating =
    progressLogs.length > 0
      ? (progressLogs.filter((l) => l.rating != null).reduce((s, l) => s + (l.rating ?? 0), 0) /
          (progressLogs.filter((l) => l.rating != null).length || 1)).toFixed(1)
      : null;

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>
              Good day, {firstName}.
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Your wellness dashboard
            </p>
          </div>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white no-underline"
            style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
          >
            <Plus size={15} /> Build New Plan
          </Link>
        </div>

        {/* Crisis disclaimer */}
        <div className="px-4 py-3 rounded-lg text-xs leading-relaxed" style={{ background: "rgba(184,137,42,0.08)", border: "1px solid rgba(184,137,42,0.2)", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
          <strong>Important:</strong> HealthPlanFactory is a wellness optimization platform — not a medical provider or substitute for professional care.
          For emergencies call <strong>911</strong>. Mental health crisis: <strong>988</strong>.
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active Plan", value: plan ? "Yes" : "None", icon: <LayoutDashboard size={18} /> },
            { label: "Monthly Budget", value: plan ? `$${plan.budget}` : "—", icon: <TrendingUp size={18} /> },
            { label: "Saved Providers", value: favorites.length.toString(), icon: <BookmarkIcon size={18} /> },
            { label: "Wellness Logs", value: progressLogs.length.toString(), icon: <MapPin size={18} /> },
          ].map((s) => (
            <div key={s.label} className="p-4 flex flex-col gap-2" style={cardStyle}>
              <div className="flex items-center gap-2" style={{ color: "var(--hpf-amber)" }}>
                {s.icon}
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--app-font-sans)", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                  {s.label}
                </span>
              </div>
              {loading ? (
                <SkeletonBlock h={24} w="60%" />
              ) : (
                <span className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
                  {s.value}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Plan Snapshot + Budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan snapshot */}
          <div className="p-6 flex flex-col gap-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
                Your Plan
              </h2>
              {plan && (
                <Link to="/plan" className="text-xs font-medium no-underline" style={{ color: "var(--hpf-amber)", fontFamily: "var(--app-font-sans)" }}>
                  View full plan →
                </Link>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col gap-3">
                <SkeletonBlock h={48} />
                <SkeletonBlock h={48} />
                <SkeletonBlock h={48} />
              </div>
            ) : !plan ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  No plan yet — answer a few quick questions to get your personalized wellness roadmap.
                </p>
                <Link
                  to="/onboarding"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white no-underline"
                  style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
                >
                  Start onboarding →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {planItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: "var(--warm-white)", border: "1px solid rgba(27,45,79,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.modality?.emoji ?? "✨"}</span>
                      <span className="text-sm font-medium" style={{ fontFamily: "var(--app-font-sans)", color: "var(--navy)" }}>
                        {item.modality?.name ?? "—"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold" style={{ fontFamily: "var(--app-font-mono)", color: "var(--hpf-amber)" }}>
                        ${item.estimatedMonthlyCost}/mo
                      </span>
                    </div>
                  </div>
                ))}
                {plan && planItems.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>No plan items found.</p>
                )}
              </div>
            )}
          </div>

          {/* Budget bar + progress */}
          <div className="p-6 flex flex-col gap-5" style={cardStyle}>
            <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
              Budget Status
            </h2>

            {loading ? (
              <SkeletonBlock h={48} />
            ) : !plan ? (
              <p className="text-sm py-6 text-center" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>No active plan</p>
            ) : (
              <>
                <div>
                  <div className="flex justify-between text-xs mb-2" style={{ fontFamily: "var(--app-font-sans)", color: "var(--text-muted)" }}>
                    <span>${plan.totalMonthlyCost} used</span>
                    <span>${plan.budget} budget</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 10, background: "rgba(27,45,79,0.08)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${budgetPct}%`,
                        background: budgetPct > 90 ? "#c0392b" : budgetPct > 70 ? "var(--hpf-amber)" : "var(--sage)",
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1.5 text-right" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                    {budgetPct}% of monthly budget
                  </p>
                </div>

                {avgRating && (
                  <div className="pt-2 border-t" style={{ borderColor: "rgba(27,45,79,0.06)" }}>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>Avg Wellness Score</p>
                    <p className="text-3xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--sage)" }}>
                      {avgRating}<span className="text-base font-normal" style={{ color: "var(--text-muted)" }}>/10</span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-base font-semibold mb-4" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { to: "/onboarding", label: "Build New Plan", desc: "Update goals and get a fresh plan", emoji: "⚗️" },
              { to: "/providers", label: "Find Providers", desc: "Browse wellness providers near you", emoji: "🗺️" },
              { to: "/progress", label: "Log Progress", desc: "Track your mood, pain, and energy", emoji: "📈" },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center gap-4 p-5 no-underline group transition-shadow hover:shadow-md"
                style={{ ...cardStyle, borderRadius: 16 }}
              >
                <span className="text-3xl">{a.emoji}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
                    {a.label}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                    {a.desc}
                  </p>
                </div>
                <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: "var(--navy)" }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Saved providers mini-section */}
        {(loading || favorites.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
                Saved Providers
              </h2>
              <Link to="/bookmarks" className="text-xs font-medium no-underline" style={{ color: "var(--hpf-amber)", fontFamily: "var(--app-font-sans)" }}>
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} h={64} />)}
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {favorites.slice(0, 6).map((f) => (
                  <div
                    key={f.providerId}
                    className="px-4 py-2 rounded-full text-xs font-medium"
                    style={{ background: "rgba(61,107,82,0.08)", color: "var(--sage)", fontFamily: "var(--app-font-sans)", border: "1px solid rgba(61,107,82,0.15)" }}
                  >
                    Saved #{f.providerId.slice(0, 6)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
