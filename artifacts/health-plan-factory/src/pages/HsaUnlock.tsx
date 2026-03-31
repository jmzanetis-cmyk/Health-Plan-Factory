import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { ArrowRight, ArrowLeft, DollarSign, FileText, Stethoscope, CheckCircle, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const navy = "#1b2d4f";
const amber = "#b8892a";
const sage = "#3d6b52";

interface EligibleItem {
  modalityId: string;
  name: string;
  emoji: string;
  estimatedMonthlyCost: number;
}

interface LmnStatusData {
  lmnStatus: string;
  eligibleItems: EligibleItem[];
  estimatedAnnualSavings: number;
  hasActivePlan: boolean;
  latestRequest: { draftMessage: string; status: string } | null;
}

export default function HsaUnlock() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [lmnData, setLmnData] = useState<LmnStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [marking, setMarking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    fetch(`${BASE}/api/lmn/status`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: LmnStatusData) => {
        setLmnData(d);
        if (d.latestRequest?.draftMessage) setDraftMessage(d.latestRequest.draftMessage);
        // If already has draft or received, jump to appropriate step
        if (d.lmnStatus === "received") setStep(3);
        else if (d.lmnStatus === "requested" && d.latestRequest) setStep(2);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const handleRequestLmn = async () => {
    setRequesting(true);
    try {
      const res = await fetch(`${BASE}/api/lmn/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setDraftMessage(data.request?.draftMessage ?? "");
      setLmnData((prev) => prev ? { ...prev, lmnStatus: data.lmnStatus ?? "requested", latestRequest: data.request } : prev);
      setStep(2);
    } catch {
      toast({ title: "Error", description: "Could not create LMN request. Please try again.", variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  const handleMarkReceived = async () => {
    setMarking(true);
    try {
      const res = await fetch(`${BASE}/api/lmn/mark-received`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      setLmnData((prev) => prev ? { ...prev, lmnStatus: "received" } : prev);
      setStep(3);
      toast({ title: "LMN marked as received", description: "Your sessions will now show 'LMN on file' badges." });
    } catch {
      toast({ title: "Error", description: "Could not update status. Please try again.", variant: "destructive" });
    } finally {
      setMarking(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const savingsFormatted = lmnData?.estimatedAnnualSavings
    ? `$${(lmnData.estimatedAnnualSavings / 100).toFixed(0)}`
    : null;

  if (authLoading || loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: navy }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 26, color: navy, marginBottom: 12 }}>Sign in to unlock your HSA savings</h2>
        <p style={{ fontFamily: "var(--app-font-sans)", color: "var(--text-secondary)", marginBottom: 24 }}>
          Create a free account and build your wellness plan to see your personalized LMN savings estimate.
        </p>
        <Link to="/sign-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: navy, color: "white", padding: "12px 24px", borderRadius: 10, fontFamily: "var(--app-font-sans)", fontWeight: 700, textDecoration: "none" }}>
          Get Started Free <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const steps = ["What is an LMN?", "Your HSA Opportunity", "Get Your Draft", "LMN Received"];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(184,137,42,0.09)", border: "1px solid rgba(184,137,42,0.25)", borderRadius: 20, padding: "5px 14px", marginBottom: 16 }}>
          <DollarSign size={13} color={amber} />
          <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 700, color: amber, textTransform: "uppercase", letterSpacing: "0.07em" }}>Unlock Your HSA</span>
        </div>
        <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(22px, 4vw, 32px)", color: navy, margin: "0 0 8px" }}>
          Get HSA/FSA Reimbursement for Your Wellness Plan
        </h1>
        <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          A Letter of Medical Necessity from a DPC physician can unlock tax-free reimbursement for massage, PT, yoga, and more.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 8, marginBottom: 36, alignItems: "center" }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, flex: i < steps.length - 1 ? "1" : "none" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: i < step ? sage : i === step ? navy : "rgba(27,45,79,0.1)",
              color: i <= step ? "white" : "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--app-font-sans)", fontWeight: 700, fontSize: 12,
              flexShrink: 0,
            }}>
              {i < step ? <CheckCircle size={14} /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? sage : "rgba(27,45,79,0.1)", borderRadius: 1 }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — What is an LMN */}
      {step === 0 && (
        <div>
          <div style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)", borderRadius: 16, padding: "28px 28px 24px", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(27,45,79,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={22} color={navy} />
              </div>
              <div>
                <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 20, color: navy, margin: "0 0 6px" }}>What is a Letter of Medical Necessity?</h2>
                <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                  An LMN is a signed document from a licensed physician certifying that specific wellness services are medically necessary for your conditions. With an LMN, your HSA/FSA can reimburse services that would otherwise be ineligible.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(61,107,82,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Stethoscope size={22} color={sage} />
              </div>
              <div>
                <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 20, color: navy, margin: "0 0 6px" }}>What is a Direct Primary Care physician?</h2>
                <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                  DPC physicians work outside insurance. For a flat monthly fee, you get unlimited visits and a physician who knows your health deeply — making them ideal for documenting the medical necessity of your wellness services.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(184,137,42,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <DollarSign size={22} color={amber} />
              </div>
              <div>
                <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 20, color: navy, margin: "0 0 6px" }}>How much could you save?</h2>
                <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                  Members with active plans and HSA/FSA accounts can save hundreds to thousands per year by using pre-tax dollars for LMN-eligible wellness services. Your personalized estimate is on the next screen.
                </p>
              </div>
            </div>
          </div>
          <div style={{ background: "rgba(184,137,42,0.06)", border: "1px solid rgba(184,137,42,0.18)", borderRadius: 10, padding: "12px 16px", marginBottom: 28, display: "flex", gap: 10 }}>
            <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
              HPF is a referral platform, not a medical provider. We do not write or review LMNs. Consult your physician and HSA/FSA administrator for eligibility guidance.
            </span>
          </div>
          <button
            onClick={() => setStep(1)}
            style={{ width: "100%", background: navy, color: "white", padding: "14px 0", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            See My HSA Opportunity <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 1 — Personalized savings estimate */}
      {step === 1 && (
        <div>
          {lmnData?.hasActivePlan && lmnData.eligibleItems.length > 0 ? (
            <div>
              <div style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)", borderRadius: 16, padding: "28px", marginBottom: 20 }}>
                <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Your Estimated Annual Savings</div>
                {savingsFormatted && (
                  <div style={{ fontFamily: "var(--app-font-serif)", fontSize: 48, fontWeight: 800, color: sage, lineHeight: 1, marginBottom: 6 }}>{savingsFormatted}</div>
                )}
                <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
                  Based on {lmnData.eligibleItems.length} LMN-eligible item{lmnData.eligibleItems.length > 1 ? "s" : ""} in your active plan, if reimbursed via HSA/FSA.
                </div>
                <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 700, color: navy, marginBottom: 12 }}>LMN-eligible items in your plan:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {lmnData.eligibleItems.map((item) => (
                    <div key={item.modalityId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(27,45,79,0.03)", borderRadius: 8, padding: "10px 14px" }}>
                      <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: navy }}>
                        {item.emoji} {item.name}
                      </span>
                      <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-muted)" }}>
                        ${(item.estimatedMonthlyCost / 100).toFixed(0)}/mo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setStep(0)}
                  style={{ flex: "none", background: "transparent", border: "1.5px solid rgba(27,45,79,0.15)", padding: "13px 20px", borderRadius: 10, cursor: "pointer", fontFamily: "var(--app-font-sans)", fontWeight: 600, fontSize: 14, color: navy, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleRequestLmn}
                  disabled={requesting}
                  style={{ flex: 1, background: amber, color: "white", padding: "14px 0", borderRadius: 10, border: "none", cursor: requesting ? "not-allowed" : "pointer", fontFamily: "var(--app-font-sans)", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: requesting ? 0.7 : 1 }}
                >
                  {requesting ? <Loader2 size={16} className="animate-spin" /> : null}
                  Generate My LMN Request Draft <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)", borderRadius: 16, padding: "36px 28px", marginBottom: 20, textAlign: "center" }}>
                {!lmnData?.hasActivePlan ? (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
                    <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: 20, color: navy, marginBottom: 8 }}>Build a Plan First</h3>
                    <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
                      You need an active wellness plan to calculate your personalized HSA savings. Build one in 3 minutes — it's free.
                    </p>
                    <Link to="/onboarding" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: navy, color: "white", padding: "12px 24px", borderRadius: 10, fontFamily: "var(--app-font-sans)", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
                      Build My Plan <ArrowRight size={14} />
                    </Link>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>🧘</div>
                    <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: 20, color: navy, marginBottom: 8 }}>No LMN-Eligible Items in Your Current Plan</h3>
                    <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
                      Your active plan's modalities are not currently flagged as LMN-eligible. Rebuild your plan or visit <Link to="/providers" style={{ color: navy }}>Providers</Link> to add a DPC physician who can expand your options.
                    </p>
                    <Link to="/lmn-guide" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(27,45,79,0.07)", color: navy, padding: "12px 24px", borderRadius: 10, fontFamily: "var(--app-font-sans)", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
                      Learn About LMNs <ArrowRight size={14} />
                    </Link>
                  </>
                )}
              </div>
              <button onClick={() => setStep(0)} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <ArrowLeft size={14} /> Back
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Draft LMN request */}
      {step === 2 && (
        <div>
          <div style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)", borderRadius: 16, padding: "28px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 20, color: navy, margin: 0 }}>Your LMN Request Draft</h2>
              <button
                onClick={handleCopy}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(27,45,79,0.06)", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, color: navy }}
              >
                {copied ? <Check size={13} color={sage} /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
              Send this to your DPC physician. They can use it to write an LMN covering the eligible items in your plan. You may edit it to add details about your specific conditions.
            </p>
            <textarea
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              style={{
                width: "100%",
                minHeight: 280,
                borderRadius: 10,
                border: "1.5px solid rgba(27,45,79,0.12)",
                padding: "14px 16px",
                fontFamily: "var(--app-font-sans)",
                fontSize: 13,
                color: navy,
                lineHeight: 1.7,
                resize: "vertical",
                background: "rgba(27,45,79,0.02)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ background: "rgba(61,107,82,0.06)", border: "1px solid rgba(61,107,82,0.18)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <strong style={{ color: sage }}>Next step:</strong> Send this draft to your DPC physician. Once they deliver your LMN, click "I received my LMN" below to activate the HSA/FSA badge on your sessions.
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setStep(1)}
              style={{ flex: "none", background: "transparent", border: "1.5px solid rgba(27,45,79,0.15)", padding: "13px 20px", borderRadius: 10, cursor: "pointer", fontFamily: "var(--app-font-sans)", fontWeight: 600, fontSize: 14, color: navy, display: "flex", alignItems: "center", gap: 6 }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={handleMarkReceived}
              disabled={marking}
              style={{ flex: 1, background: sage, color: "white", padding: "14px 0", borderRadius: 10, border: "none", cursor: marking ? "not-allowed" : "pointer", fontFamily: "var(--app-font-sans)", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: marking ? 0.7 : 1 }}
            >
              {marking ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              I Received My LMN
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — LMN received confirmation */}
      {step === 3 && (
        <div>
          <div style={{ background: "white", border: "1px solid rgba(61,107,82,0.15)", borderRadius: 16, padding: "40px 28px", marginBottom: 20, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(61,107,82,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle size={32} color={sage} />
            </div>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 24, color: navy, margin: "0 0 10px" }}>LMN on File!</h2>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, color: "var(--text-secondary)", margin: "0 0 24px", lineHeight: 1.6 }}>
              Your wellness sessions that include LMN-eligible services will now show an <strong style={{ color: sage }}>"LMN on file"</strong> badge in your progress log, making it easy to track which sessions qualify for HSA/FSA reimbursement.
            </p>
            {savingsFormatted && (
              <div style={{ background: "rgba(61,107,82,0.06)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "inline-block" }}>
                <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, color: sage, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Potential Annual Savings</div>
                <div style={{ fontFamily: "var(--app-font-serif)", fontSize: 36, fontWeight: 800, color: sage }}>{savingsFormatted}</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Link to="/progress" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: navy, color: "white", padding: "12px 20px", borderRadius: 10, fontFamily: "var(--app-font-sans)", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
                View My Sessions <ArrowRight size={14} />
              </Link>
              <Link to="/providers" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(27,45,79,0.06)", color: navy, padding: "12px 20px", borderRadius: 10, fontFamily: "var(--app-font-sans)", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
                Find DPC Providers
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
