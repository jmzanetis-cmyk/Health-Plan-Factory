import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Loader2, TrendingUp, Download, BarChart2, Lock } from "lucide-react";
import { EmployerNav } from "./EmployerDashboard";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");
const navy = "#1b2d4f";
const sage = "#3d6b52";
const amber = "#b8892a";

interface UtilizationBucket {
  label: string;
  count: number;
  pct: number;
  barMin: number;
}

interface EnrollmentPoint {
  month: string;
  count: number;
}

interface CohortStats {
  contractedHeadcount: number;
  totalEnrolled: number;
  utilizationRate: number;
  averageMonthlyBudgetCents: number;
  averageMonthlySpentCents: number;
  utilizationBuckets: UtilizationBucket[];
  enrollmentTrend: EnrollmentPoint[];
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function bucketColor(barMin: number) {
  if (barMin >= 75) return sage;
  if (barMin >= 25) return amber;
  return "rgba(27,45,79,0.25)";
}

export default function EmployerMembers() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/employer/members`, { credentials: "include" })
      .then((r) => {
        if (r.status === 404) { navigate("/employer"); return null; }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => { if (d) setStats(d); setLoading(false); })
      .catch(() => { setError("Failed to load coverage analytics"); setLoading(false); });
  }, [navigate]);

  const exportCsv = () => window.open(`${BASE}/api/employer/export-csv`, "_blank");

  const enrollmentPct = stats && stats.contractedHeadcount > 0
    ? Math.round((stats.totalEnrolled / stats.contractedHeadcount) * 100)
    : 0;

  const maxBucketCount = stats
    ? Math.max(...stats.utilizationBuckets.map((b) => b.count), 1)
    : 1;

  return (
    <div style={{ background: "var(--warm-white)", minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.8rem", fontWeight: 700, color: navy, margin: 0 }}>
              Coverage Analytics
            </h1>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: "4px 0 0" }}>
              Aggregate utilization insights across your enrolled cohort
            </p>
          </div>
          <button
            onClick={exportCsv}
            style={{ background: navy, color: "white", border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600 }}
          >
            <Download size={14} /> Export Summary
          </button>
        </div>

        <EmployerNav active="/employer/members" />

        {/* Privacy notice */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(61,107,82,0.07)", border: "1px solid rgba(61,107,82,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 24 }}>
          <Lock size={14} color={sage} />
          <p style={{ margin: 0, fontFamily: "var(--app-font-sans)", fontSize: 13, color: sage }}>
            All data is aggregate-only. No individual employee identifiers or personal health information are disclosed.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: navy }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 60, color: "#c42b2b", fontFamily: "var(--app-font-sans)" }}>{error}</div>
        ) : !stats ? null : (
          <>
            {/* Summary KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
              {[
                {
                  label: "Enrollment Rate",
                  value: `${enrollmentPct}%`,
                  sub: `${stats.totalEnrolled} of ${stats.contractedHeadcount} contracted`,
                  icon: <Users size={16} />,
                },
                {
                  label: "Avg Utilization",
                  value: `${stats.utilizationRate}%`,
                  sub: "of monthly stipend used",
                  icon: <TrendingUp size={16} />,
                },
                {
                  label: "Avg Monthly Budget",
                  value: fmt(stats.averageMonthlyBudgetCents),
                  sub: "per enrolled employee",
                  icon: <BarChart2 size={16} />,
                },
                {
                  label: "Avg Monthly Spend",
                  value: fmt(stats.averageMonthlySpentCents),
                  sub: "per enrolled employee",
                  icon: <TrendingUp size={16} />,
                },
              ].map((s) => (
                <div key={s.label} style={{ background: "white", border: "1.5px solid rgba(27,45,79,0.1)", borderRadius: 10, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "var(--text-muted)" }}>
                    {s.icon}
                    <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>{s.label}</span>
                  </div>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 22, fontWeight: 700, color: navy }}>{s.value}</div>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Utilization Distribution */}
            {stats.totalEnrolled === 0 ? (
              <div style={{ background: "white", border: "1.5px solid rgba(27,45,79,0.1)", borderRadius: 12, padding: 60, textAlign: "center" }}>
                <Users size={40} color="rgba(27,45,79,0.15)" style={{ marginBottom: 16 }} />
                <h3 style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, fontWeight: 600, color: navy, marginBottom: 8 }}>No enrolled members yet</h3>
                <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)" }}>
                  Share the invite code from your dashboard to enroll employees.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                {/* Utilization distribution */}
                <div style={{ background: "white", border: "1.5px solid rgba(27,45,79,0.1)", borderRadius: 12, padding: "20px 24px" }}>
                  <h2 style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 700, color: navy, margin: "0 0 18px", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
                    Utilization Distribution
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
                    {stats.utilizationBuckets.map((b) => (
                      <div key={b.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: navy, fontWeight: 500 }}>{b.label}</span>
                          <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)" }}>
                            {b.count} {b.count === 1 ? "employee" : "employees"} ({b.pct}%)
                          </span>
                        </div>
                        <div style={{ height: 8, background: "rgba(27,45,79,0.06)", borderRadius: 4, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.round((b.count / maxBucketCount) * 100)}%`,
                              background: bucketColor(b.barMin),
                              borderRadius: 4,
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: "16px 0 0", fontFamily: "var(--app-font-sans)", fontSize: 11, color: "var(--text-muted)" }}>
                    Cohort of {stats.totalEnrolled} enrolled employees (min. 5 required to display individual buckets)
                  </p>
                </div>

                {/* Enrollment trend */}
                <div style={{ background: "white", border: "1.5px solid rgba(27,45,79,0.1)", borderRadius: 12, padding: "20px 24px" }}>
                  <h2 style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 700, color: navy, margin: "0 0 18px", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
                    Monthly Enrollment
                  </h2>
                  {stats.enrollmentTrend.length === 0 ? (
                    <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>No trend data yet.</p>
                  ) : (() => {
                    const maxCount = Math.max(...stats.enrollmentTrend.map((p) => p.count), 1);
                    return (
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
                        {stats.enrollmentTrend.map((p) => (
                          <div key={p.month} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
                            <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, color: navy }}>{p.count}</span>
                            <div
                              style={{
                                width: "100%",
                                height: Math.max(8, Math.round((p.count / maxCount) * 80)),
                                background: navy,
                                borderRadius: "3px 3px 0 0",
                                opacity: 0.7,
                              }}
                            />
                            <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" as const }}>
                              {p.month.slice(5)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <p style={{ margin: "16px 0 0", fontFamily: "var(--app-font-sans)", fontSize: 11, color: "var(--text-muted)" }}>
                    New enrollments per calendar month (last 6 months)
                  </p>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
