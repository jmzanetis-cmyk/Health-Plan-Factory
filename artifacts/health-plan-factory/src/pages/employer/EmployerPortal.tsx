import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Users, DollarSign, ShieldCheck, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const navy = "#2C2825";
const amber = "#E02040";
const sage = "#7DB55C";

interface Employer {
  id: string;
  companyName: string;
  inviteCode: string;
  status: string;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      background: "white",
      border: "1.5px solid rgba(212,34,126,0.1)",
      borderRadius: 12,
      padding: "24px 28px",
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: "rgba(212,34,126,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: navy,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 22, fontWeight: 700, color: navy, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

function SignupForm({ onSuccess }: { onSuccess: (employer: Employer) => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    companyName: "",
    adminContactName: "",
    adminContactEmail: "",
    billingContactEmail: "",
    numberOfEmployees: "",
    stipendPerEmployee: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/employer/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          adminContactName: form.adminContactName,
          adminContactEmail: form.adminContactEmail,
          billingContactEmail: form.billingContactEmail || undefined,
          numberOfEmployees: parseInt(form.numberOfEmployees, 10),
          stipendPerEmployee: Math.round(parseFloat(form.stipendPerEmployee) * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        onSuccess(data);
      }
    } catch {
      setError(t("employerPortal.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    border: "1.5px solid rgba(212,34,126,0.18)",
    borderRadius: 8,
    padding: "10px 14px",
    fontFamily: "var(--app-font-sans)",
    fontSize: 15,
    color: navy,
    outline: "none",
    background: "white",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    fontFamily: "var(--app-font-sans)",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 6,
  };

  return (
    <form onSubmit={submit}>
      {error && (
        <div style={{ background: "rgba(220,53,53,0.08)", border: "1px solid rgba(220,53,53,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#c42b2b", fontFamily: "var(--app-font-sans)", fontSize: 14 }}>
          {error}
        </div>
      )}
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <label style={labelStyle}>{t("employerPortal.companyNameLabel")} *</label>
          <input style={inputStyle} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} required placeholder="Acme Corp" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>{t("employerPortal.adminNameLabel")} *</label>
            <input style={inputStyle} value={form.adminContactName} onChange={(e) => set("adminContactName", e.target.value)} required placeholder="Jane Smith" />
          </div>
          <div>
            <label style={labelStyle}>{t("employerPortal.adminEmailLabel")} *</label>
            <input style={inputStyle} type="email" value={form.adminContactEmail} onChange={(e) => set("adminContactEmail", e.target.value)} required placeholder="jane@acmecorp.com" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>{t("employerPortal.billingEmailLabel")}</label>
          <input style={inputStyle} type="email" value={form.billingContactEmail} onChange={(e) => set("billingContactEmail", e.target.value)} placeholder="billing@acmecorp.com" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>{t("employerPortal.numEmployeesLabel")} *</label>
            <input style={inputStyle} type="number" min={1} value={form.numberOfEmployees} onChange={(e) => set("numberOfEmployees", e.target.value)} required placeholder="50" />
          </div>
          <div>
            <label style={labelStyle}>{t("employerPortal.stipendLabel")} *</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>$</span>
              <input style={{ ...inputStyle, paddingLeft: 24 }} type="number" min={10} step={1} value={form.stipendPerEmployee} onChange={(e) => set("stipendPerEmployee", e.target.value)} required placeholder="75" />
            </div>
          </div>
        </div>
        <div style={{ background: "rgba(125,181,92,0.06)", border: "1px solid rgba(125,181,92,0.2)", borderRadius: 8, padding: "12px 16px", fontFamily: "var(--app-font-sans)", fontSize: 13, color: sage }}>
          {t("employerPortal.platformFee")}
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: navy,
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "13px 24px",
            fontFamily: "var(--app-font-sans)",
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {t("employerPortal.createBtn")}
        </button>
      </div>
    </form>
  );
}

function SuccessPanel({ employer }: { employer: Employer }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutDone, setCheckoutDone] = useState(false);

  // Auto-initiate Stripe checkout as part of signup completion flow
  useEffect(() => {
    let cancelled = false;
    setCheckoutLoading(true);
    fetch(`${BASE}/api/employer/billing/create-checkout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setCheckoutLoading(false);
        if (json.url) {
          window.location.href = json.url;
        } else {
          setCheckoutError(json.error ?? t("employerPortal.checkoutError"));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCheckoutLoading(false);
          setCheckoutError(t("employerPortal.checkoutSetupError"));
        }
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(125,181,92,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <CheckCircle2 size={32} color={sage} />
      </div>
      <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.6rem", fontWeight: 700, color: navy, marginBottom: 8 }}>
        {t("employerPortal.successH2", { company: employer.companyName })}
      </h2>
      <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, color: "var(--text-secondary)", marginBottom: 28 }}>
        {t("employerPortal.successP")}
      </p>
      <div style={{
        background: "rgba(212,34,126,0.05)",
        border: "2px dashed rgba(212,34,126,0.2)",
        borderRadius: 12,
        padding: "20px 32px",
        marginBottom: 28,
      }}>
        <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{t("employerPortal.inviteCodeLabel")}</div>
        <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 32, fontWeight: 800, color: navy, letterSpacing: "0.15em" }}>
          {employer.inviteCode}
        </div>
        <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
          {t("employerPortal.inviteCodeHint")}
        </div>
      </div>

      {/* Billing setup status — shown inline as part of signup completion */}
      {checkoutLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20, fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)" }}>
          <Loader2 size={16} className="animate-spin" />
          {t("employerPortal.settingUpBilling")}
        </div>
      )}
      {checkoutError && (
        <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "#E02040", marginBottom: 20 }}>{checkoutError}</p>
      )}
      {checkoutDone && (
        <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: sage, marginBottom: 20 }}>
          {t("employerPortal.billingConfigured")}
        </p>
      )}

      <button
        onClick={() => navigate("/employer/dashboard")}
        style={{
          background: navy,
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "13px 32px",
          fontFamily: "var(--app-font-sans)",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {t("employerPortal.dashboardBtn")} <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default function EmployerPortal() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [existingEmployer, setExistingEmployer] = useState<Employer | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [newEmployer, setNewEmployer] = useState<Employer | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      fetch(`${BASE}/api/employer/me`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.id) setExistingEmployer(data);
          setCheckingExisting(false);
        })
        .catch(() => setCheckingExisting(false));
    } else if (!isLoading) {
      setCheckingExisting(false);
    }
  }, [user, isLoading]);

  if (isLoading || checkingExisting) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: navy }} />
      </div>
    );
  }

  if (existingEmployer) {
    navigate("/employer/dashboard");
    return null;
  }

  return (
    <div style={{ background: "var(--warm-white)", minHeight: "100vh" }}>
      {/* Hero */}
      <div style={{ background: navy, color: "white", padding: "64px 24px 72px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "6px 14px", marginBottom: 20 }}>
            <Building2 size={14} />
            <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600 }}>{t("employerPortal.badge")}</span>
          </div>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, lineHeight: 1.15, marginBottom: 18 }}>
            {t("employerPortal.heroH1")}
          </h1>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, opacity: 0.8, lineHeight: 1.7, maxWidth: 560, margin: "0 auto 32px" }}>
            {t("employerPortal.heroP")}
          </p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { icon: <Users size={16} />, text: t("employerPortal.feat0") },
              { icon: <DollarSign size={16} />, text: t("employerPortal.feat1") },
              { icon: <ShieldCheck size={16} />, text: t("employerPortal.feat2") },
            ].map((item) => (
              <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--app-font-sans)", fontSize: 14, opacity: 0.85 }}>
                {item.icon} {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ maxWidth: 900, margin: "-36px auto 0", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <StatCard icon={<Users size={20} />} label={t("employerPortal.statUtil")} value="68%" />
          <StatCard icon={<DollarSign size={20} />} label={t("employerPortal.statStipend")} value="$75/mo" />
          <StatCard icon={<ShieldCheck size={20} />} label={t("employerPortal.statNps")} value="4.8 / 5" />
        </div>
      </div>

      {/* Signup form */}
      <div style={{ maxWidth: 640, margin: "48px auto", padding: "0 24px" }}>
        {newEmployer ? (
          <div style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.1)", borderRadius: 16, padding: 40 }}>
            <SuccessPanel employer={newEmployer} />
          </div>
        ) : (
          <div style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.1)", borderRadius: 16, padding: 40 }}>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.5rem", fontWeight: 700, color: navy, marginBottom: 6 }}>{t("employerPortal.formH2")}</h2>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", marginBottom: 28 }}>
              {user
                ? t("employerPortal.formP")
                : <>{t("employerPortal.signInRequired")} <Link to="/sign-in" style={{ color: amber }}>{t("employerPortal.signInLink")}</Link></>}
            </p>
            {user ? (
              <SignupForm onSuccess={setNewEmployer} />
            ) : (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <Link
                  to="/sign-in"
                  style={{
                    background: navy,
                    color: "white",
                    borderRadius: 8,
                    padding: "12px 28px",
                    fontFamily: "var(--app-font-sans)",
                    fontWeight: 600,
                    textDecoration: "none",
                    fontSize: 15,
                  }}
                >
                  {t("employerPortal.signInBtn")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
