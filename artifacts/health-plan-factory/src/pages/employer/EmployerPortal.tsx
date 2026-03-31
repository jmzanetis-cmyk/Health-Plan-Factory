import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Users, DollarSign, ShieldCheck, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const navy = "#1b2d4f";
const amber = "#b8892a";
const sage = "#3d6b52";

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
      border: "1.5px solid rgba(27,45,79,0.1)",
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
        background: "rgba(27,45,79,0.07)",
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
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    border: "1.5px solid rgba(27,45,79,0.18)",
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
          <label style={labelStyle}>Company Name *</label>
          <input style={inputStyle} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} required placeholder="Acme Corp" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Admin Contact Name *</label>
            <input style={inputStyle} value={form.adminContactName} onChange={(e) => set("adminContactName", e.target.value)} required placeholder="Jane Smith" />
          </div>
          <div>
            <label style={labelStyle}>Admin Email *</label>
            <input style={inputStyle} type="email" value={form.adminContactEmail} onChange={(e) => set("adminContactEmail", e.target.value)} required placeholder="jane@acmecorp.com" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Billing Email (optional)</label>
          <input style={inputStyle} type="email" value={form.billingContactEmail} onChange={(e) => set("billingContactEmail", e.target.value)} placeholder="billing@acmecorp.com" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Number of Employees *</label>
            <input style={inputStyle} type="number" min={1} value={form.numberOfEmployees} onChange={(e) => set("numberOfEmployees", e.target.value)} required placeholder="50" />
          </div>
          <div>
            <label style={labelStyle}>Monthly Stipend per Employee *</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>$</span>
              <input style={{ ...inputStyle, paddingLeft: 24 }} type="number" min={10} step={1} value={form.stipendPerEmployee} onChange={(e) => set("stipendPerEmployee", e.target.value)} required placeholder="75" />
            </div>
          </div>
        </div>
        <div style={{ background: "rgba(61,107,82,0.06)", border: "1px solid rgba(61,107,82,0.2)", borderRadius: 8, padding: "12px 16px", fontFamily: "var(--app-font-sans)", fontSize: 13, color: sage }}>
          <strong>Platform fee:</strong> 8% per invoice. Total monthly billed = employees × stipend × 1.08. Cancel any time.
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
          Create Employer Account
        </button>
      </div>
    </form>
  );
}

function SuccessPanel({ employer }: { employer: Employer }) {
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
        if (json.stripe_mode === "live" && json.url) {
          window.location.href = json.url;
        } else {
          // Test / sandbox mode — no live redirect; show completion prompt
          setCheckoutDone(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCheckoutLoading(false);
          setCheckoutError("Could not initiate billing setup — you can complete it from the dashboard.");
        }
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(61,107,82,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <CheckCircle2 size={32} color={sage} />
      </div>
      <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.6rem", fontWeight: 700, color: navy, marginBottom: 8 }}>
        Welcome, {employer.companyName}!
      </h2>
      <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, color: "var(--text-secondary)", marginBottom: 28 }}>
        Your employer account is live. Share the invite code below with your team.
      </p>
      <div style={{
        background: "rgba(27,45,79,0.05)",
        border: "2px dashed rgba(27,45,79,0.2)",
        borderRadius: 12,
        padding: "20px 32px",
        marginBottom: 28,
      }}>
        <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Employee Invite Code</div>
        <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 32, fontWeight: 800, color: navy, letterSpacing: "0.15em" }}>
          {employer.inviteCode}
        </div>
        <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
          Employees enter this at sign-up or in their profile settings
        </div>
      </div>

      {/* Billing setup status — shown inline as part of signup completion */}
      {checkoutLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20, fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)" }}>
          <Loader2 size={16} className="animate-spin" />
          Setting up billing…
        </div>
      )}
      {checkoutError && (
        <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "#b8892a", marginBottom: 20 }}>{checkoutError}</p>
      )}
      {checkoutDone && (
        <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: sage, marginBottom: 20 }}>
          Billing configured in test mode. You can update payment details from the dashboard.
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
        Go to Dashboard <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default function EmployerPortal() {
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
            <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600 }}>Employer Wellness Stipends</span>
          </div>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, lineHeight: 1.15, marginBottom: 18 }}>
            Give your team a personalized<br />wellness benefit they'll actually use
          </h1>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, opacity: 0.8, lineHeight: 1.7, maxWidth: 560, margin: "0 auto 32px" }}>
            Health Plan Factory delivers AI-curated wellness plans. Fund a monthly stipend and employees choose the therapies that work for them — from massage to physical therapy to mindfulness.
          </p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { icon: <Users size={16} />, text: "Anonymized aggregate data" },
              { icon: <DollarSign size={16} />, text: "Usage-based invoicing" },
              { icon: <ShieldCheck size={16} />, text: "HIPAA-aware design" },
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
          <StatCard icon={<Users size={20} />} label="Avg. utilization" value="68%" />
          <StatCard icon={<DollarSign size={20} />} label="Avg. stipend" value="$75/mo" />
          <StatCard icon={<ShieldCheck size={20} />} label="Employee NPS" value="4.8 / 5" />
        </div>
      </div>

      {/* Signup form */}
      <div style={{ maxWidth: 640, margin: "48px auto", padding: "0 24px" }}>
        {newEmployer ? (
          <div style={{ background: "white", border: "1.5px solid rgba(27,45,79,0.1)", borderRadius: 16, padding: 40 }}>
            <SuccessPanel employer={newEmployer} />
          </div>
        ) : (
          <div style={{ background: "white", border: "1.5px solid rgba(27,45,79,0.1)", borderRadius: 16, padding: 40 }}>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.5rem", fontWeight: 700, color: navy, marginBottom: 6 }}>Create an Employer Account</h2>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", marginBottom: 28 }}>
              {user
                ? "Set up your company's wellness stipend program."
                : <>You need to be signed in. <Link to="/sign-in" style={{ color: amber }}>Sign in here</Link></>}
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
                  Sign In to Continue
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
