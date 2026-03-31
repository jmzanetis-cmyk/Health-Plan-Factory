import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Loader2, TrendingUp, Download } from "lucide-react";
import { EmployerNav } from "./EmployerDashboard";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");
const navy = "#1b2d4f";
const sage = "#3d6b52";
const amber = "#b8892a";

interface Member {
  id: string;
  monthlyBudget: number;
  spentThisMonth: number;
  budgetMonth: string | null;
  linkedAt: string;
}

function UtilBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? sage : pct >= 40 ? amber : "rgba(27,45,79,0.3)";
  return (
    <div style={{ width: 100, height: 6, background: "rgba(27,45,79,0.08)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3 }} />
    </div>
  );
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function EmployerMembers() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/employer/members`, { credentials: "include" })
      .then((r) => {
        if (r.status === 404) { navigate("/employer"); return null; }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => { if (d) setMembers(d); setLoading(false); })
      .catch(() => { setError("Failed to load members"); setLoading(false); });
  }, [navigate]);

  const exportCsv = () => window.open(`${BASE}/api/employer/export-csv`, "_blank");

  const totalBudget = members.reduce((s, m) => s + m.monthlyBudget, 0);
  const totalSpent = members.reduce((s, m) => s + m.spentThisMonth, 0);
  const avgUtil = members.length > 0
    ? Math.round(members.reduce((s, m) => s + (m.monthlyBudget > 0 ? m.spentThisMonth / m.monthlyBudget * 100 : 0), 0) / members.length)
    : 0;

  const thStyle = {
    fontFamily: "var(--app-font-sans)",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    padding: "10px 16px",
    textAlign: "left" as const,
    borderBottom: "1px solid rgba(27,45,79,0.08)",
  };
  const tdStyle = {
    padding: "12px 16px",
    fontFamily: "var(--app-font-sans)",
    fontSize: 14,
    color: navy,
    borderBottom: "1px solid rgba(27,45,79,0.06)",
  };

  return (
    <div style={{ background: "var(--warm-white)", minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.8rem", fontWeight: 700, color: navy, margin: 0 }}>Member Utilization</h1>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: 0, marginTop: 4 }}>
              Anonymized stipend usage across enrolled employees
            </p>
          </div>
          <button onClick={exportCsv} style={{ background: navy, color: "white", border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600 }}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        <EmployerNav active="/employer/members" />

        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Enrolled Members", value: String(members.length), icon: <Users size={16} /> },
            { label: "Total Budget", value: fmt(totalBudget), icon: <TrendingUp size={16} /> },
            { label: "Total Spent", value: fmt(totalSpent), icon: <TrendingUp size={16} /> },
            { label: "Avg Utilization", value: `${avgUtil}%`, icon: <TrendingUp size={16} /> },
          ].map((s) => (
            <div key={s.label} style={{ background: "white", border: "1.5px solid rgba(27,45,79,0.1)", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "var(--text-muted)" }}>{s.icon}<span style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</span></div>
              <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 20, fontWeight: 700, color: navy }}>{s.value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><Loader2 size={24} className="animate-spin" style={{ color: navy }} /></div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 60, color: "#c42b2b", fontFamily: "var(--app-font-sans)" }}>{error}</div>
        ) : members.length === 0 ? (
          <div style={{ background: "white", border: "1.5px solid rgba(27,45,79,0.1)", borderRadius: 12, padding: 60, textAlign: "center" }}>
            <Users size={40} color="rgba(27,45,79,0.15)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, fontWeight: 600, color: navy, marginBottom: 8 }}>No enrolled members yet</h3>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)" }}>
              Share the invite code from your dashboard to enroll employees.
            </p>
          </div>
        ) : (
          <div style={{ background: "white", border: "1.5px solid rgba(27,45,79,0.1)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(27,45,79,0.02)" }}>
                  <th style={thStyle}>Member ID</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Budget/mo</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Spent</th>
                  <th style={thStyle}>Utilization</th>
                  <th style={thStyle}>Budget Month</th>
                  <th style={thStyle}>Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const pct = m.monthlyBudget > 0 ? Math.round((m.spentThisMonth / m.monthlyBudget) * 100) : 0;
                  return (
                    <tr key={m.id} style={{ transition: "background 0.1s" }}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(27,45,79,0.05)", padding: "2px 8px", borderRadius: 4 }}>
                          {m.id.slice(0, 12)}…
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt(m.monthlyBudget)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(m.spentThisMonth)}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <UtilBar pct={pct} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: pct >= 80 ? sage : pct >= 40 ? amber : "var(--text-muted)" }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>{m.budgetMonth ?? "—"}</td>
                      <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>{new Date(m.linkedAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
