import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Building2, Users, DollarSign, TrendingUp, Download, RefreshCw, Loader2, Copy, CheckCheck, CreditCard, Shield,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");
const navy = "#2C2825";
const amber = "#E02040";
const sage = "#7DB55C";

interface DashboardData {
  employer: {
    id: string;
    companyName: string;
    inviteCode: string;
    stipendPerEmployee: number;
    numberOfEmployees: number;
    status: string;
  };
  stats: {
    totalEnrolled: number;
    totalBudgetCents: number;
    totalSpentCents: number | null;
    utilizationPct: number | null;
    avgWellnessScore: number | null;
    monthlyInvoiceCents: number;
    privacySuppressed?: boolean;
  };
  topModalities: Array<{ modalityId: string; sessionCount: number }>;
  monthlySpend: Array<{ month: string; totalCents: number }>;
}

export function EmployerNav({ active }: { active: string }) {
  const links = [
    { to: "/employer/dashboard", label: "Overview" },
    { to: "/employer/members", label: "Members" },
    { to: "/employer/settings", label: "Coverage Rules" },
  ];
  return (
    <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
      {links.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--app-font-sans)",
            textDecoration: "none",
            background: active === n.to ? navy : "white",
            color: active === n.to ? "white" : navy,
            border: "1.5px solid rgba(212,34,126,0.12)",
          }}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: "white",
      border: "1.5px solid rgba(212,34,126,0.1)",
      borderRadius: 12,
      padding: "22px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(212,34,126,0.07)", display: "flex", alignItems: "center", justifyContent: "center", color: navy }}>
          {icon}
        </div>
        <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 26, fontWeight: 700, color: navy }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString("default", { month: "short" });
}

export default function EmployerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMsg, setBillingMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${BASE}/api/employer/dashboard`, { credentials: "include" })
      .then((r) => {
        if (r.status === 404) { navigate("/employer"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const copyCode = () => {
    if (data?.employer.inviteCode) {
      navigator.clipboard.writeText(data.employer.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const exportCsv = () => {
    window.open(`${BASE}/api/employer/export-csv`, "_blank");
  };

  const exportPdf = () => {
    window.open(`${BASE}/api/employer/export-pdf`, "_blank");
  };

  const setupBilling = async () => {
    setBillingLoading(true);
    setBillingMsg(null);
    try {
      const res = await fetch(`${BASE}/api/employer/billing/create-checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.stripe_mode === "live" && json.url) {
        window.location.href = json.url;
      } else if (json.invoice_preview) {
        const p = json.invoice_preview;
        setBillingMsg(`Demo mode — invoice preview: ${p.contractedHeadcount} contracted × ${p.stipendPerEmployee} + ${p.platformFee} fee = ${p.totalMonthly}/mo (${p.enrolledMembers} currently enrolled). Set STRIPE_SECRET_KEY to go live.`);
      } else {
        setBillingMsg(json.error ?? "Unable to create billing session.");
      }
    } catch {
      setBillingMsg("Network error. Please try again.");
    } finally {
      setBillingLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: navy }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <p style={{ fontFamily: "var(--app-font-sans)", color: "var(--text-secondary)" }}>Could not load dashboard.</p>
        <button onClick={load} style={{ marginTop: 16, background: navy, color: "white", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>Retry</button>
      </div>
    );
  }

  const chartData = data.monthlySpend.map((m) => ({
    name: monthLabel(m.month),
    spend: m.totalCents / 100,
  }));

  return (
    <div style={{ background: "var(--warm-white)", minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Building2 size={20} color={navy} />
              <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.8rem", fontWeight: 700, color: navy, margin: 0 }}>
                {data.employer.companyName}
              </h1>
              <span style={{
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--app-font-sans)",
                background: data.employer.status === "active" ? "rgba(125,181,92,0.1)" : "rgba(220,53,53,0.1)",
                color: data.employer.status === "active" ? sage : "#c42b2b",
              }}>
                {data.employer.status}
              </span>
            </div>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
              Employer Wellness Dashboard
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={load} style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.15)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: navy, fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600 }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={exportCsv} style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.15)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: navy, fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600 }}>
              <Download size={14} /> Export CSV
            </button>
            <button onClick={exportPdf} style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.15)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: navy, fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600 }}>
              <Download size={14} /> Export Report
            </button>
            <button
              onClick={setupBilling}
              disabled={billingLoading}
              style={{ background: amber, color: "white", border: "none", borderRadius: 8, padding: "8px 14px", cursor: billingLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, opacity: billingLoading ? 0.7 : 1 }}
            >
              {billingLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              Setup Billing
            </button>
          </div>
        </div>

        {/* Invite Code Banner */}
        <div style={{
          background: "white",
          border: "1.5px solid rgba(212,34,126,0.1)",
          borderRadius: 10,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 28,
          flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Employee Invite Code</span>
            <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 22, fontWeight: 800, color: navy, letterSpacing: "0.12em" }}>{data.employer.inviteCode}</div>
          </div>
          <button onClick={copyCode} style={{ background: copied ? "rgba(125,181,92,0.1)" : "rgba(212,34,126,0.06)", border: "1px solid rgba(212,34,126,0.1)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: copied ? sage : navy, fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600 }}>
            {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
          <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)" }}>
            Share with employees to enroll them in the benefit
          </div>
        </div>

        {/* Privacy assurance banner */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(125,181,92,0.07)",
          border: "1.5px solid rgba(125,181,92,0.18)",
          borderRadius: 10,
          padding: "10px 18px",
          marginBottom: 16,
        }}>
          <Shield size={16} color={sage} style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: sage, fontWeight: 500 }}>
            Aggregate data only — individual member health information is never shared.
          </span>
        </div>

        {/* Billing message */}
        {billingMsg && (
          <div style={{
            background: "rgba(224,32,64,0.08)",
            border: "1.5px solid rgba(224,32,64,0.25)",
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 16,
            fontFamily: "var(--app-font-sans)",
            fontSize: 13,
            color: "#7a5c1e",
          }}>
            {billingMsg}
          </div>
        )}

        <EmployerNav active="/employer/dashboard" />

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
          <StatCard icon={<Users size={18} />} label="Enrolled" value={String(data.stats.totalEnrolled)} sub={`of ${data.employer.numberOfEmployees} employees`} />
          <StatCard icon={<DollarSign size={18} />} label="Monthly Budget" value={fmt(data.stats.totalBudgetCents)} sub="total stipend pool" />
          <StatCard icon={<TrendingUp size={18} />} label="Utilization"
            value={data.stats.utilizationPct != null ? `${data.stats.utilizationPct}%` : "—"}
            sub={data.stats.totalSpentCents != null ? `${fmt(data.stats.totalSpentCents)} spent` : "Suppressed (<5 members)"} />
          <StatCard icon={<DollarSign size={18} />} label="Next Invoice" value={fmt(data.stats.monthlyInvoiceCents)} sub="incl. 8% platform fee" />
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
          {/* Monthly spend chart */}
          <div style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.1)", borderRadius: 12, padding: "24px 20px" }}>
            <h3 style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 700, color: navy, marginBottom: 20 }}>Monthly Spend (6 months)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,34,126,0.06)" />
                <XAxis dataKey="name" tick={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "Spend"]}
                  contentStyle={{ fontFamily: "var(--app-font-sans)", fontSize: 12, border: "1px solid rgba(212,34,126,0.15)", borderRadius: 8 }}
                />
                <Bar dataKey="spend" fill={navy} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top modalities */}
          <div style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.1)", borderRadius: 12, padding: "24px 20px" }}>
            <h3 style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 700, color: navy, marginBottom: 20 }}>Top Modalities Used</h3>
            {data.topModalities.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", fontSize: 14 }}>
                No session data yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.topModalities.map((m, i) => {
                  const max = data.topModalities[0].sessionCount;
                  const pct = (m.sessionCount / max) * 100;
                  return (
                    <div key={m.modalityId}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--app-font-sans)", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: navy, fontWeight: 600 }}>{m.modalityId}</span>
                        <span style={{ color: "var(--text-muted)" }}>{m.sessionCount} sessions</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(212,34,126,0.08)", borderRadius: 3 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? navy : i === 1 ? sage : amber, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Avg wellness score */}
        {data.stats.avgWellnessScore != null && data.stats.avgWellnessScore > 0 && (
          <div style={{
            background: `linear-gradient(120deg, ${navy} 0%, #243d68 100%)`,
            borderRadius: 12,
            padding: "24px 32px",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em" }}>Avg. Wellness Rating</div>
              <div style={{ fontFamily: "var(--app-font-serif)", fontSize: "3rem", fontWeight: 700 }}>{data.stats.avgWellnessScore}<span style={{ fontSize: "1.2rem", opacity: 0.5 }}>/5</span></div>
            </div>
            <div style={{ flex: 1, fontFamily: "var(--app-font-sans)", fontSize: 14, opacity: 0.85, lineHeight: 1.6 }}>
              Aggregated from anonymized session ratings across all enrolled employees. Individual data is never shared.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
