import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Stethoscope, FileText, Clock, TrendingUp, Loader2, Gift, Percent, CreditCard, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

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

const DEMO_LEAD_REFRESH_EVENT = "demo-leads-status-changed";

export function AdminNav({ active }: { active: string }) {
  const { t } = useTranslation();
  const [demoNewCount, setDemoNewCount] = useState<number>(0);

  const navLinks = [
    { to: "/admin/dashboard", label: t("admin.nav.overview") },
    { to: "/admin/users", label: t("admin.nav.users") },
    { to: "/admin/providers", label: t("admin.nav.providers") },
    { to: "/admin/reviews", label: t("admin.nav.reviews") },
    { to: "/admin/modalities", label: t("admin.nav.modalities") },
    { to: "/admin/testimonials", label: t("admin.nav.testimonials") },
    { to: "/admin/employers", label: t("admin.nav.employers") },
    { to: "/admin/messages", label: t("admin.nav.messages") },
    { to: "/admin/booking-requests", label: t("admin.nav.bookings") },
    { to: "/admin/demo-requests", label: t("admin.nav.demoLeads") },
    { to: "/admin/settings", label: t("admin.nav.settings") },
  ];

  const refreshDemoCount = () => {
    fetch(`${BASE}/api/admin/demo-requests?status=new`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data: unknown[]) => { if (Array.isArray(data)) setDemoNewCount(data.length); })
      .catch(() => {});
  };

  useEffect(() => {
    refreshDemoCount();
    window.addEventListener(DEMO_LEAD_REFRESH_EVENT, refreshDemoCount);
    return () => window.removeEventListener(DEMO_LEAD_REFRESH_EVENT, refreshDemoCount);
  }, []);

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
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {n.label}
          {n.to === "/admin/demo-requests" && demoNewCount > 0 && (
            <span style={{
              background: active === n.to ? "rgba(255,255,255,0.25)" : "var(--hpf-pink)",
              color: "white",
              borderRadius: 20,
              padding: "0 6px",
              fontSize: "0.65rem",
              fontWeight: 700,
              lineHeight: "1.6",
              minWidth: 18,
              textAlign: "center",
            }}>
              {demoNewCount}
            </span>
          )}
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
  const { t } = useTranslation();
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
            {t("admin.digest.title")}
          </h2>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
          {t("admin.digest.sub")}
        </p>
        <div className="flex gap-3 flex-wrap items-center mb-3">
          <input
            type="text"
            placeholder={t("admin.digest.memberIdPlaceholder")}
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
            {t("admin.digest.previewButton")}
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
            {t("admin.digest.sendTestButton")}
          </button>
        </div>
        {previewError && (
          <div className="flex items-center gap-2 text-sm mt-1" style={{ color: "#dc2626", fontFamily: "var(--app-font-sans)" }}>
            <AlertCircle size={15} /> {previewError}
          </div>
        )}
        {sendResult?.ok && (
          <div className="flex items-center gap-2 text-sm mt-1" style={{ color: "#16a34a", fontFamily: "var(--app-font-sans)" }}>
            <CheckCircle2 size={15} /> {t("admin.digest.sentTo", { email: sendResult.sentTo })}
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

type BulkResult = { sent: number; failed: number; skipped: number; errors: number; total: number; day: number } | null;
type SingleResult = { result: "sent" | "failed" | "skipped" | "no-plan" | "no-email" | "member-not-found"; memberId: string; day: number } | null;

function ReEngagementSection() {
  const { t } = useTranslation();
  const [memberId, setMemberId] = useState("");
  const [singleDay, setSingleDay] = useState<3 | 7>(3);
  const [sendingSingle, setSendingSingle] = useState(false);
  const [runningBulk, setRunningBulk] = useState<3 | 7 | null>(null);
  const [singleResult, setSingleResult] = useState<SingleResult>(null);
  const [bulkResult, setBulkResult] = useState<BulkResult>(null);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const sendSingle = async () => {
    if (!memberId.trim()) return;
    setSendingSingle(true);
    setSingleResult(null);
    setSingleError(null);
    try {
      const res = await fetch(`${BASE}/api/admin/re-engagement/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: memberId.trim(), day: singleDay }),
      });
      const data = await res.json();
      if (res.ok) setSingleResult(data);
      else setSingleError(data.error ?? "Failed to send");
    } catch {
      setSingleError("Network error — please try again");
    } finally {
      setSendingSingle(false);
    }
  };

  const runBulk = async (day: 3 | 7) => {
    if (!window.confirm(t("admin.reEngagement.bulkConfirm", { day }))) return;
    setRunningBulk(day);
    setBulkResult(null);
    setBulkError(null);
    try {
      const res = await fetch(`${BASE}/api/admin/re-engagement/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      });
      const data = await res.json();
      if (res.ok) setBulkResult(data);
      else setBulkError(data.error ?? "Bulk send failed");
    } catch {
      setBulkError("Network error — please try again");
    } finally {
      setRunningBulk(null);
    }
  };

  const singleResultLabel: Record<string, string> = {
    sent: "Email sent successfully.",
    failed: "Provider delivery failed — check notification log.",
    skipped: "Skipped — already sent or opted out.",
    "no-plan": "Skipped — member has no plan.",
    "no-email": "Skipped — profile has no email address.",
    "member-not-found": "Error — member ID not found.",
  };

  return (
    <div className="p-6 rounded-2xl mb-8" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Mail size={18} style={{ color: "var(--hpf-crimson)" }} />
        <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>
          {t("admin.reEngagement.title")}
        </h2>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
        {t("admin.reEngagement.sub")}
      </p>

      {/* Single member send */}
      <div className="mb-6 p-4 rounded-xl" style={{ background: "rgba(212,34,126,0.03)", border: "1px solid rgba(212,34,126,0.08)" }}>
        <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("admin.reEngagement.testTitle")}
        </p>
        <div className="flex gap-3 flex-wrap items-center">
          <input
            type="text"
            placeholder={t("admin.reEngagement.memberIdPlaceholder")}
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            style={{ flex: 1, minWidth: 220, border: "1.5px solid rgba(212,34,126,0.18)", borderRadius: 8, padding: "9px 14px", fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-primary)", outline: "none" }}
          />
          <select
            value={singleDay}
            onChange={(e) => setSingleDay(Number(e.target.value) as 3 | 7)}
            style={{ border: "1.5px solid rgba(212,34,126,0.18)", borderRadius: 8, padding: "9px 12px", fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-primary)", background: "white", cursor: "pointer" }}
          >
            <option value={3}>{t("admin.reEngagement.day3Option")}</option>
            <option value={7}>{t("admin.reEngagement.day7Option")}</option>
          </select>
          <button
            onClick={sendSingle}
            disabled={sendingSingle || !memberId.trim()}
            style={{ background: "var(--hpf-pink)", color: "white", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, cursor: sendingSingle || !memberId.trim() ? "not-allowed" : "pointer", opacity: sendingSingle || !memberId.trim() ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}
          >
            {sendingSingle ? <Loader2 size={14} className="animate-spin" /> : null}
            {t("admin.reEngagement.sendTestButton")}
          </button>
        </div>
        {singleResult && (
          <div className="flex items-center gap-2 mt-3" style={{ color: singleResult.result === "sent" ? "#16a34a" : "var(--text-secondary)", fontFamily: "var(--app-font-sans)", fontSize: 13 }}>
            {singleResult.result === "sent" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {singleResultLabel[singleResult.result] ?? singleResult.result}
          </div>
        )}
        {singleError && (
          <div className="flex items-center gap-2 mt-3" style={{ color: "#dc2626", fontFamily: "var(--app-font-sans)", fontSize: 13 }}>
            <AlertCircle size={14} /> {singleError}
          </div>
        )}
      </div>

      {/* Bulk send */}
      <div className="p-4 rounded-xl" style={{ background: "rgba(212,34,126,0.03)", border: "1px solid rgba(212,34,126,0.08)" }}>
        <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("admin.reEngagement.bulkTitle")}
        </p>
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
          {t("admin.reEngagement.bulkSub")}
        </p>
        <div className="flex gap-3 flex-wrap items-center">
          <button
            onClick={() => runBulk(3)}
            disabled={runningBulk !== null}
            style={{ background: "#1a2a3a", color: "white", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, cursor: runningBulk !== null ? "not-allowed" : "pointer", opacity: runningBulk !== null ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}
          >
            {runningBulk === 3 ? <Loader2 size={14} className="animate-spin" /> : null}
            {t("admin.reEngagement.runDay3")}
          </button>
          <button
            onClick={() => runBulk(7)}
            disabled={runningBulk !== null}
            style={{ background: "#1a2a3a", color: "white", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, cursor: runningBulk !== null ? "not-allowed" : "pointer", opacity: runningBulk !== null ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}
          >
            {runningBulk === 7 ? <Loader2 size={14} className="animate-spin" /> : null}
            {t("admin.reEngagement.runDay7")}
          </button>
        </div>
        {bulkResult && (
          <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-primary)" }}>
            <div className="flex items-center gap-2 mb-1" style={{ color: "#16a34a", fontWeight: 600 }}>
              <CheckCircle2 size={14} /> {t("admin.reEngagement.bulkComplete", { day: bulkResult.day })}
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              {bulkResult.sent} sent · {bulkResult.failed > 0 ? `${bulkResult.failed} provider errors · ` : ""}{bulkResult.skipped} skipped · {bulkResult.errors} errors · {bulkResult.total} eligible
            </div>
          </div>
        )}
        {bulkError && (
          <div className="flex items-center gap-2 mt-3" style={{ color: "#dc2626", fontFamily: "var(--app-font-sans)", fontSize: 13 }}>
            <AlertCircle size={14} /> {bulkError}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
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
            t("admin.dashboard.sub" || "{t("admin.dashboard.sub")}")
          </p>
        </div>

        <AdminNav active="/admin/dashboard" />

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Members" value={stats?.totalMembers ?? 0} icon={<Users size={18} />} loading={loading} to="/admin/users" />
          <StatCard label={t("admin.dashboard.totalProviders")} value={stats?.totalProviders ?? 0} icon={<Stethoscope size={18} />} loading={loading} to="/admin/providers" />
          <StatCard label="Plans" value={stats?.totalPlans ?? 0} icon={<FileText size={18} />} loading={loading} />
          <StatCard label="Pending" value={stats?.pendingProviders ?? 0} icon={<Clock size={18} />} loading={loading} to="/admin/providers" />
          <StatCard label="30d Signups" value={stats?.recentSignups ?? 0} icon={<TrendingUp size={18} />} loading={loading} />
          <StatCard label={t("admin.dashboard.activeModalities")} value={stats?.activeModalities ?? 0} icon={<Loader2 size={18} />} loading={loading} to="/admin/modalities" />
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

        {/* Re-engagement Drip Emails */}
        <ReEngagementSection />

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
