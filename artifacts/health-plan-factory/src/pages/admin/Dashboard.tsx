import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Stethoscope, FileText, Clock, TrendingUp, Loader2, Gift, Percent, CreditCard, Mail, CheckCircle2, AlertCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Stats {
  totalMembers: number;
  totalProviders: number;
  totalPlans: number;
  pendingProviders: number;
  recentSignups: number;
  activeModalities?: number;
}

interface ReferralStats {
  totalReferrals: number;
  rewardedReferrals: number;
  pendingReferrals: number;
  conversionRate: number;
  totalCreditsIssued: number;
  creditsUsed: number;
  totalCreditsIssuedFormatted: string;
  totalCreditsUsedFormatted: string;
}

interface WeeklyData {
  week: string;
  signups: number;
}

function StatCard({ label, value, icon, loading, to }: { label: string; value: number; icon: React.ReactNode; loading: boolean; to?: string }) {
  return (
    <div className="p-5 rounded-2xl flex flex-col gap-3" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ color: "var(--hpf-crimson)" }}>{icon}</span>
      </div>
      {loading ? (
        <div className="h-8 rounded animate-pulse" style={{ background: "rgba(212,34,126,0.06)" }} />
      ) : (
        <span className="text-3xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>{value.toLocaleString()}</span>
      )}
      {to && (
        <Link to={to} className="text-xs no-underline font-medium" style={{ color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)" }}>
          View details →
        </Link>
      )}
    </div>
  );
}

function ReferralStatTile({ label, value, icon, sub }: { label: string; value: string | number; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: "rgba(224,32,64,0.06)", border: "1px solid rgba(224,32,64,0.15)" }}>
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--hpf-crimson)" }}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.07em" }}>{label}</span>
      </div>
      <span className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{sub}</span>}
    </div>
  );
}

const navLinks = [
  { to: "/admin/dashboard", label: "Overview" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/providers", label: "Providers" },
  { to: "/admin/modalities", label: "Modalities" },
  { to: "/admin/employers", label: "Employers" },
  { to: "/admin/messages", label: "Messages" },
  { to: "/admin/settings", label: "Settings" },
];

export function AdminNav({ active }: { active: string }) {
  return (
    <nav className="flex gap-1 flex-wrap mb-8">
      {navLinks.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          className="px-4 py-2 rounded-lg text-sm font-medium no-underline"
          style={{
            background: active === n.to ? "var(--hpf-pink)" : "white",
            color: active === n.to ? "white" : "var(--hpf-pink)",
            border: "1.5px solid rgba(212,34,126,0.12)",
            fontFamily: "var(--app-font-sans)",
          }}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

interface DigestPreview {
  subject: string;
  html: string;
  memberEmail: string;
  stats: {
    wellnessScoreThisWeek: number | null;
    wellnessScoreLastWeek: number | null;
    habitsCompleted: number;
    habitsPlanned: number;
    upcomingSessionCount: number;
    topGoal: string | null;
  };
}

function TestDigestSection() {
  const [memberId, setMemberId] = useState("");
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<DigestPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; sentTo?: string; error?: string } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadPreview = async () => {
    setPreviewing(true);
    setPreviewError(null);
    setSendResult(null);
    try {
      const qs = memberId.trim() ? `?memberId=${encodeURIComponent(memberId.trim())}` : "";
      const res = await fetch(`${BASE}/api/admin/preview-digest${qs}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setPreview(data);
        setShowPreview(true);
      } else {
        setPreviewError(data.error ?? "Failed to generate preview");
      }
    } catch {
      setPreviewError("Network error — please try again");
    } finally {
      setPreviewing(false);
    }
  };

  const sendTest = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`${BASE}/api/admin/send-test-digest`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberId.trim() ? { memberId: memberId.trim() } : {}),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ ok: true, sentTo: data.sentTo });
      } else {
        setSendResult({ ok: false, error: data.error ?? "Failed to send test digest" });
      }
    } catch {
      setSendResult({ ok: false, error: "Network error — please try again" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="p-6 rounded-2xl mb-8" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Mail size={18} style={{ color: "var(--hpf-crimson)" }} />
          <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>
            Weekly Digest — Preview &amp; Test
          </h2>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
          Preview the digest for any member before sending. Leave the Member ID blank to use your own account.
        </p>
        <div className="flex gap-3 flex-wrap items-center mb-3">
          <input
            type="text"
            placeholder="Member ID (optional — leave blank for self)"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            style={{
              flex: 1,
              minWidth: 240,
              border: "1.5px solid rgba(212,34,126,0.18)",
              borderRadius: 8,
              padding: "9px 14px",
              fontFamily: "var(--app-font-sans)",
              fontSize: 13,
              color: "var(--text-primary)",
              outline: "none",
              background: "white",
            }}
          />
          <button
            onClick={loadPreview}
            disabled={previewing}
            style={{
              background: "white",
              color: "var(--hpf-pink)",
              border: "1.5px solid var(--hpf-pink)",
              borderRadius: 8,
              padding: "9px 20px",
              fontFamily: "var(--app-font-sans)",
              fontSize: 14,
              fontWeight: 600,
              cursor: previewing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              opacity: previewing ? 0.6 : 1,
            }}
          >
            {previewing && <Loader2 size={14} className="animate-spin" />}
            Preview Digest
          </button>
          <button
            onClick={sendTest}
            disabled={sending}
            style={{
              background: sending ? "rgba(212,34,126,0.4)" : "var(--hpf-pink)",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "9px 20px",
              fontFamily: "var(--app-font-sans)",
              fontSize: 14,
              fontWeight: 600,
              cursor: sending ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            {sending && <Loader2 size={14} className="animate-spin" />}
            Send Test Email
          </button>
        </div>
        {previewError && (
          <div className="flex items-center gap-2 text-sm mt-1" style={{ color: "#dc2626", fontFamily: "var(--app-font-sans)" }}>
            <AlertCircle size={15} /> {previewError}
          </div>
        )}
        {sendResult?.ok && (
          <div className="flex items-center gap-2 text-sm mt-1" style={{ color: "#16a34a", fontFamily: "var(--app-font-sans)" }}>
            <CheckCircle2 size={15} /> Test digest sent to <strong>{sendResult.sentTo}</strong>
          </div>
        )}
        {sendResult?.ok === false && (
          <div className="flex items-center gap-2 text-sm mt-1" style={{ color: "#dc2626", fontFamily: "var(--app-font-sans)" }}>
            <AlertCircle size={15} /> {sendResult.error}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {showPreview && preview && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "40px 16px",
            overflowY: "auto",
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              width: "100%",
              maxWidth: 700,
              overflow: "hidden",
              boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(212,34,126,0.1)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "var(--app-font-serif)", fontWeight: 700, fontSize: 16, color: "var(--hpf-pink)", marginBottom: 4 }}>
                  Email Preview — {preview.memberEmail}
                </div>
                <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)" }}>
                  Subject: <strong>{preview.subject}</strong>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {[
                    { label: "Score", value: preview.stats.wellnessScoreThisWeek != null ? `${preview.stats.wellnessScoreThisWeek}/10` : "—" },
                    { label: "Habits", value: `${preview.stats.habitsCompleted}/${preview.stats.habitsPlanned}` },
                    { label: "Upcoming", value: `${preview.stats.upcomingSessionCount} sessions` },
                    ...(preview.stats.topGoal ? [{ label: "Goal", value: preview.stats.topGoal }] : []),
                  ].map((s) => (
                    <span key={s.label} style={{ background: "rgba(212,34,126,0.06)", borderRadius: 6, padding: "3px 10px", fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--hpf-pink)" }}>{s.label}:</strong> {s.value}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 4, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
            <div style={{ background: "#f8f6f1", padding: 24, overflowY: "auto", maxHeight: "calc(90vh - 160px)" }}>
              <iframe
                srcDoc={preview.html}
                style={{ width: "100%", height: 680, border: "none", borderRadius: 8, background: "white" }}
                title="Digest Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralLoading, setReferralLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/admin/stats`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${BASE}/api/admin/weekly-signups`, { credentials: "include" }).then((r) => r.json()),
    ]).then(([statsData, weeklyRes]) => {
      setStats(statsData);
      if (Array.isArray(weeklyRes?.data)) setWeeklyData(weeklyRes.data);
      setLoading(false);
      setChartLoading(false);
    }).catch(() => { setLoading(false); setChartLoading(false); });

    fetch(`${BASE}/api/admin/referral-stats`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setReferralStats(data); setReferralLoading(false); })
      .catch(() => setReferralLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-pink)" }}>
            Admin Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Platform overview and management
          </p>
        </div>

        <AdminNav active="/admin/dashboard" />

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Members" value={stats?.totalMembers ?? 0} icon={<Users size={18} />} loading={loading} to="/admin/users" />
          <StatCard label="Providers" value={stats?.totalProviders ?? 0} icon={<Stethoscope size={18} />} loading={loading} to="/admin/providers" />
          <StatCard label="Plans" value={stats?.totalPlans ?? 0} icon={<FileText size={18} />} loading={loading} />
          <StatCard label="Pending" value={stats?.pendingProviders ?? 0} icon={<Clock size={18} />} loading={loading} to="/admin/providers" />
          <StatCard label="30d Signups" value={stats?.recentSignups ?? 0} icon={<TrendingUp size={18} />} loading={loading} />
          <StatCard label="Modalities" value={stats?.activeModalities ?? 0} icon={<Loader2 size={18} />} loading={loading} to="/admin/modalities" />
        </div>

        {/* Referral program stats */}
        <div className="p-6 rounded-2xl mb-8" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
          <div className="flex items-center gap-2 mb-5">
            <Gift size={18} style={{ color: "var(--hpf-crimson)" }} />
            <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>
              Referral Program
            </h2>
          </div>
          {referralLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "rgba(212,34,126,0.04)" }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ReferralStatTile
                label="Total Referrals"
                value={referralStats?.totalReferrals ?? 0}
                icon={<Users size={14} />}
                sub={`${referralStats?.pendingReferrals ?? 0} pending`}
              />
              <ReferralStatTile
                label="Rewarded"
                value={referralStats?.rewardedReferrals ?? 0}
                icon={<Gift size={14} />}
                sub="completed + rewarded"
              />
              <ReferralStatTile
                label="Conversion Rate"
                value={`${referralStats?.conversionRate ?? 0}%`}
                icon={<Percent size={14} />}
                sub="referrals → completions"
              />
              <ReferralStatTile
                label="Credits Issued"
                value={referralStats?.totalCreditsIssuedFormatted ?? "$0.00"}
                icon={<CreditCard size={14} />}
                sub={`${referralStats?.totalCreditsUsedFormatted ?? "$0.00"} redeemed`}
              />
            </div>
          )}
        </div>

        {/* Test Weekly Digest */}
        <TestDigestSection />

        {/* Weekly signups chart */}
        <div className="p-6 rounded-2xl" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
          <h2 className="text-base font-semibold mb-5" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>
            Weekly Signups
          </h2>
          {chartLoading ? (
            <div className="h-52 animate-pulse rounded-xl" style={{ background: "rgba(212,34,126,0.04)" }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} margin={{ top: 4, right: 20, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,34,126,0.06)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }} />
                <Tooltip contentStyle={{ fontFamily: "var(--app-font-sans)", fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="signups" name="Signups" fill="var(--hpf-pink)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
