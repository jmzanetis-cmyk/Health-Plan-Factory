import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Building2, Loader2, CheckCircle2, AlertCircle, Bell, Phone, Mail, CalendarDays } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");
const navy = "#2C2825";
const sage = "#7DB55C";

interface EmployerBudget {
  enrolled: boolean;
  employer?: {
    id: string;
    companyName: string;
    inviteCode: string;
    status: string;
  } | null;
  member?: {
    monthlyBudget: number;
    spentThisMonth: number;
    remainingCents: number;
    budgetMonth: string;
  } | null;
}

interface CommsPrefs {
  email: boolean;
  sms: boolean;
  weeklyDigest?: boolean;
  digestDay?: number;
}

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function EmployerStipendSection() {
  const [budget, setBudget] = useState<EmployerBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const loadBudget = () => {
    fetch(`${BASE}/api/employer/my-budget`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setBudget(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadBudget(); }, []);

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeeming(true);
    setRedeemResult(null);
    try {
      const res = await fetch(`${BASE}/api/employer/redeem-code`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();
      if (res.ok) {
        setRedeemResult({ success: true });
        setCode("");
        loadBudget();
      } else {
        setRedeemResult({ error: data.error ?? "Failed to redeem code" });
      }
    } catch {
      setRedeemResult({ error: "Network error — please try again" });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div style={{
      background: "white",
      border: "1.5px solid rgba(212,34,126,0.1)",
      borderRadius: 12,
      padding: 28,
      marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Building2 size={18} color={navy} />
        <h2 style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, fontWeight: 700, color: navy, margin: 0 }}>
          Employer Wellness Stipend
        </h2>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: navy }} />
        </div>
      ) : budget?.enrolled && budget.employer && budget.member ? (
        <div>
          <div style={{ background: "rgba(125,181,92,0.06)", border: "1px solid rgba(125,181,92,0.2)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, color: sage, marginBottom: 4 }}>
              ✓ Enrolled — {budget.employer.companyName}
            </div>
            <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-secondary)" }}>
              {budget.member.budgetMonth} benefit period
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {[
              { label: "Monthly Budget", value: fmt(budget.member.monthlyBudget) },
              { label: "Spent", value: fmt(budget.member.spentThisMonth) },
              { label: "Remaining", value: fmt(budget.member.remainingCents) },
            ].map((s) => (
              <div key={s.label} style={{ background: "rgba(212,34,126,0.03)", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 18, fontWeight: 700, color: navy }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", marginBottom: 18 }}>
            Your employer may offer a wellness stipend through Health Plan Factory. Enter the invite code your HR team provided.
          </p>
          {redeemResult?.success && (
            <div style={{ background: "rgba(125,181,92,0.08)", border: "1px solid rgba(125,181,92,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: sage, fontFamily: "var(--app-font-sans)", fontSize: 14 }}>
              <CheckCircle2 size={16} /> Stipend enrolled successfully!
            </div>
          )}
          {redeemResult?.error && (
            <div style={{ background: "rgba(220,53,53,0.08)", border: "1px solid rgba(220,53,53,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "#c42b2b", fontFamily: "var(--app-font-sans)", fontSize: 14 }}>
              <AlertCircle size={16} /> {redeemResult.error}
            </div>
          )}
          <form onSubmit={redeem} style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              placeholder="Invite code (e.g. ABX7YK2M)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              style={{
                flex: 1,
                border: "1.5px solid rgba(212,34,126,0.18)",
                borderRadius: 8,
                padding: "10px 14px",
                fontFamily: "monospace",
                fontSize: 16,
                fontWeight: 600,
                color: navy,
                letterSpacing: "0.1em",
                outline: "none",
                background: "white",
              }}
            />
            <button
              type="submit"
              disabled={!code.trim() || redeeming}
              style={{
                background: navy,
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontFamily: "var(--app-font-sans)",
                fontSize: 14,
                fontWeight: 600,
                cursor: !code.trim() || redeeming ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: !code.trim() || redeeming ? 0.6 : 1,
              }}
            >
              {redeeming && <Loader2 size={14} className="animate-spin" />}
              Redeem
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function NotificationPrefsSection() {
  const [prefs, setPrefs] = useState<CommsPrefs>({ email: true, sms: false, weeklyDigest: true, digestDay: 1 });
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/profile/comms-prefs`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.prefs) setPrefs({
          email: d.prefs.email ?? true,
          sms: d.prefs.sms ?? false,
          weeklyDigest: d.prefs.weeklyDigest !== false,
          digestDay: d.prefs.digestDay ?? 1,
        });
        if (d.phone) setPhone(d.phone);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`${BASE}/api/profile/comms-prefs`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: prefs.email,
          sms: prefs.sms,
          weeklyDigest: prefs.weeklyDigest ?? true,
          digestDay: prefs.digestDay ?? 1,
          phone: phone || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      background: "white",
      border: "1.5px solid rgba(212,34,126,0.1)",
      borderRadius: 12,
      padding: 28,
      marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Bell size={18} color={navy} />
        <h2 style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, fontWeight: 700, color: navy, margin: 0 }}>
          Notification Preferences
        </h2>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: navy }} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            Choose how you'd like to receive reminders, plan updates, and accountability nudges.
          </p>

          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 16px", borderRadius: 8, border: "1.5px solid rgba(212,34,126,0.1)", background: "rgba(212,34,126,0.02)" }}>
            <input
              type="checkbox"
              checked={prefs.email}
              onChange={(e) => setPrefs((p) => ({ ...p, email: e.target.checked }))}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <Mail size={15} color={navy} />
            <div>
              <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 600, color: navy }}>Email notifications</div>
              <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-secondary)" }}>Reminders, plan updates, and weekly summaries</div>
            </div>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 16px", borderRadius: 8, border: "1.5px solid rgba(212,34,126,0.1)", background: "rgba(212,34,126,0.02)" }}>
            <input
              type="checkbox"
              checked={prefs.sms}
              onChange={(e) => setPrefs((p) => ({ ...p, sms: e.target.checked }))}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <Phone size={15} color={navy} />
            <div>
              <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 600, color: navy }}>SMS notifications</div>
              <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-secondary)" }}>Text message reminders (requires phone number)</div>
            </div>
          </label>

          {prefs.sms && (
            <div>
              <label style={{ display: "block", fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Mobile phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                style={{
                  width: "100%",
                  border: "1.5px solid rgba(212,34,126,0.18)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontFamily: "var(--app-font-sans)",
                  fontSize: 14,
                  color: navy,
                  outline: "none",
                  background: "white",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Include country code, e.g. +1 for US
              </p>
            </div>
          )}

          <div style={{ borderTop: "1px solid rgba(212,34,126,0.08)", paddingTop: 16 }}>
            <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Weekly Wellness Digest
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 16px", borderRadius: 8, border: "1.5px solid rgba(212,34,126,0.1)", background: "rgba(212,34,126,0.02)", marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={prefs.weeklyDigest !== false}
                onChange={(e) => setPrefs((p) => ({ ...p, weeklyDigest: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <CalendarDays size={15} color={navy} />
              <div>
                <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 600, color: navy }}>Weekly digest email</div>
                <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-secondary)" }}>
                  Wellness score trend, completed habits, upcoming sessions, and an AI motivational tip
                </div>
              </div>
            </label>

            {prefs.weeklyDigest !== false && (
              <div>
                <label style={{ display: "block", fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Send on
                </label>
                <select
                  value={prefs.digestDay ?? 1}
                  onChange={(e) => setPrefs((p) => ({ ...p, digestDay: Number(e.target.value) }))}
                  style={{
                    border: "1.5px solid rgba(212,34,126,0.18)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontFamily: "var(--app-font-sans)",
                    fontSize: 14,
                    color: navy,
                    outline: "none",
                    background: "white",
                    cursor: "pointer",
                    minWidth: 160,
                  }}
                >
                  {DAY_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: "rgba(220,53,53,0.08)", border: "1px solid rgba(220,53,53,0.2)", borderRadius: 8, padding: "10px 14px", color: "#c42b2b", fontFamily: "var(--app-font-sans)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
            {saved && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: sage, fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600 }}>
                <CheckCircle2 size={14} /> Saved
              </div>
            )}
            <button
              onClick={save}
              disabled={saving}
              style={{
                background: saving ? "rgba(212,34,126,0.4)" : navy,
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontFamily: "var(--app-font-sans)",
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: navy }} />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--warm-white)", minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: navy, marginBottom: 6 }}>My Profile</h1>
        <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", marginBottom: 32 }}>
          Manage your account and wellness benefit settings.
        </p>

        {/* Account info */}
        <div style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.1)", borderRadius: 12, padding: 28, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, fontWeight: 700, color: navy, marginBottom: 20 }}>Account</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Name", value: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—" },
              { label: "Email", value: user?.email ?? "—" },
              { label: "Role", value: user?.role ?? "member" },
            ].map((f) => (
              <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottom: "1px solid rgba(212,34,126,0.06)" }}>
                <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</span>
                <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, color: navy, fontWeight: 500 }}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notification preferences */}
        {(user?.role === "member" || user?.role === "provider") && (
          <NotificationPrefsSection />
        )}

        {/* Employer stipend — for member/employer roles */}
        {(user?.role === "member" || user?.role === "employer") && (
          <EmployerStipendSection />
        )}

        {/* Employer portal shortcut */}
        {user?.role === "employer" && (
          <div style={{ background: `linear-gradient(120deg, ${navy} 0%, #243d68 100%)`, borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ color: "white" }}>
              <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Employer Portal</div>
              <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, opacity: 0.8 }}>Manage your company's wellness stipend program</div>
            </div>
            <a
              href="/employer/dashboard"
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "9px 18px", fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Go to Dashboard →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
