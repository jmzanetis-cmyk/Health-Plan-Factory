import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { type Plan, type PlanItem, planSchema, deserializePlan } from "@/lib/planEngine";
import { intakeSchema, type IntakeData } from "@/types/onboarding";
import { type EvidenceLevel } from "@/data/modalities";
import { Logo } from "@/components/Logo";

function ProviderCountBadge({ count, isTelehealth }: { count?: number | null; isTelehealth?: boolean }) {
  if (isTelehealth) {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.2rem 0.55rem",
        borderRadius: 100,
        fontSize: "0.7rem",
        fontWeight: 600,
        background: "rgba(125,181,92,0.08)",
        color: "var(--sage)",
        fontFamily: "var(--app-font-sans)",
      }}>
        🌐 Available via telehealth
      </span>
    );
  }
  if (count == null) return null;
  if (count === 0) {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.2rem 0.55rem",
        borderRadius: 100,
        fontSize: "0.7rem",
        fontWeight: 600,
        background: "rgba(200,200,200,0.12)",
        color: "var(--text-muted)",
        fontFamily: "var(--app-font-sans)",
      }}>
        📍 No local providers found
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.25rem",
      padding: "0.2rem 0.55rem",
      borderRadius: 100,
      fontSize: "0.7rem",
      fontWeight: 600,
      background: "rgba(125,181,92,0.08)",
      color: "var(--sage)",
      fontFamily: "var(--app-font-sans)",
    }}>
      📍 {count} provider{count !== 1 ? "s" : ""} near you
    </span>
  );
}

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const styles: Record<EvidenceLevel, { bg: string; color: string }> = {
    Strong:   { bg: "rgba(125,181,92,0.1)",  color: "var(--sage)" },
    Moderate: { bg: "rgba(224,32,64,0.1)", color: "var(--hpf-crimson)" },
    Emerging: { bg: "rgba(212,34,126,0.07)",  color: "var(--hpf-pink)" },
  };
  const s = styles[level];
  return (
    <span style={{
      display: "inline-block",
      padding: "0.2rem 0.55rem",
      borderRadius: 100,
      fontSize: "0.7rem",
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      fontFamily: "var(--app-font-sans)",
      letterSpacing: "0.02em",
    }}>
      {level} Evidence
    </span>
  );
}

function HsaBadge() {
  return (
    <span style={{
      display: "inline-block",
      padding: "0.2rem 0.55rem",
      borderRadius: 100,
      fontSize: "0.7rem",
      fontWeight: 600,
      background: "rgba(212,34,126,0.06)",
      color: "var(--hpf-pink)",
      fontFamily: "var(--app-font-sans)",
      letterSpacing: "0.02em",
    }}>
      HSA/FSA
    </span>
  );
}

interface LmnContext {
  eligibleCount: number;
  estimatedAnnualSavingsCents: number;
}

function ModalityCard({ item, rank, lmnContext, unusedCredits, nearbyProviderCount }: { item: PlanItem; rank: number; lmnContext?: LmnContext; unusedCredits?: number; nearbyProviderCount?: number | null }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      border: "1px solid rgba(212,34,126,0.08)",
      overflow: "hidden",
      transition: "box-shadow 0.2s",
    }}>
      {/* Card header */}
      <div style={{ padding: "1.25rem 1.25rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
          {/* Rank number */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: rank === 1 ? "var(--hpf-pink)" : "rgba(212,34,126,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: rank === 1 ? "white" : "var(--text-secondary)",
              fontFamily: "var(--app-font-mono)",
            }}>
              {rank}
            </span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "1.1rem" }}>{item.modality.emoji}</span>
              <h3 style={{
                fontFamily: "var(--app-font-serif)",
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "var(--hpf-pink)",
                lineHeight: 1.2,
              }}>
                {item.modality.name}
              </h3>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
              <EvidenceBadge level={item.modality.evidenceLevel} />
              {item.modality.hsaEligible && <HsaBadge />}
              <ProviderCountBadge count={nearbyProviderCount} isTelehealth={item.modality.category === "telehealth"} />
            </div>

            {/* Rationale */}
            <p style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              fontFamily: "var(--app-font-sans)",
              lineHeight: 1.55,
            }}>
              {item.rationale}
            </p>
          </div>
        </div>
      </div>

      {/* Cost & frequency row */}
      <div style={{
        padding: "0.875rem 1.25rem",
        borderTop: "1px solid rgba(212,34,126,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(212,34,126,0.02)",
      }}>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <div>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              Est. cost
            </p>
            <p style={{ fontFamily: "var(--app-font-mono)", fontSize: "1rem", fontWeight: 600, color: "var(--hpf-pink)" }}>
              ${item.estimatedMonthlyCost}/mo
            </p>
          </div>
          <div>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              Frequency
            </p>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>
              {item.frequency}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{
            background: "none",
            border: "none",
            color: "var(--hpf-crimson)",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--app-font-sans)",
          }}
        >
          {expanded ? "Less ↑" : "More ↓"}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "1rem 1.25rem 1.25rem", borderTop: "1px solid rgba(212,34,126,0.05)" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.65, marginBottom: "1rem" }}>
            {item.modality.description}
          </p>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.25rem" }}>
            {item.modality.tags.map((tag) => (
              <span key={tag} style={{
                padding: "0.2rem 0.6rem",
                borderRadius: 100,
                fontSize: "0.7rem",
                fontWeight: 500,
                background: "rgba(212,34,126,0.05)",
                color: "var(--text-secondary)",
                fontFamily: "var(--app-font-sans)",
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Physician / DPC LMN callout */}
          {item.modality.category === "medical" && (
            <div style={{
              marginBottom: "1rem",
              padding: "0.875rem",
              borderRadius: 10,
              background: "rgba(224,32,64,0.06)",
              border: "1.5px solid rgba(224,32,64,0.2)",
            }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", marginBottom: 3 }}>
                🩺 This DPC physician can write an LMN for your plan
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6, marginBottom: 6 }}>
                {lmnContext && lmnContext.eligibleCount > 0
                  ? `A Letter of Medical Necessity from this physician can cover ${lmnContext.eligibleCount} item${lmnContext.eligibleCount !== 1 ? "s" : ""} in your plan for HSA/FSA reimbursement — saving an estimated $${Math.round(lmnContext.estimatedAnnualSavingsCents / 100)}/year.`
                  : "A Direct Primary Care physician can issue a Letter of Medical Necessity covering HSA/FSA-reimbursable services in your plan — potentially saving hundreds per year."}
              </p>
              <Link
                to="/hsa-unlock"
                style={{ fontSize: "0.72rem", fontWeight: 600, color: "#E02040", fontFamily: "var(--app-font-sans)", textDecoration: "underline" }}
              >
                Unlock your HSA →
              </Link>
            </div>
          )}

          {/* Provider CTA — locked */}
          <div style={{
            padding: "1rem",
            borderRadius: 10,
            border: unusedCredits && unusedCredits > 0
              ? "1.5px solid rgba(224,32,64,0.35)"
              : "1.5px dashed rgba(212,34,126,0.2)",
            background: unusedCredits && unusedCredits > 0
              ? "rgba(224,32,64,0.05)"
              : "rgba(212,34,126,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}>
            <span style={{ fontSize: "1.25rem" }}>{unusedCredits && unusedCredits > 0 ? "🎁" : "🔒"}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", marginBottom: 2 }}>
                See vetted providers near you
              </p>
              {unusedCredits && unusedCredits > 0 ? (
                <p style={{ fontSize: "0.72rem", color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)", fontWeight: 600 }}>
                  1 referral credit applied — $3.00 discount
                </p>
              ) : (
                <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  Unlock for {item.modality.category === "medical" ? "$3" : item.modality.category === "telehealth" ? "$1" : "$2"} · HSA-eligible providers flagged
                </p>
              )}
            </div>
            <Link
              to="/sign-up"
              style={{
                padding: "0.5rem 0.875rem",
                borderRadius: 8,
                background: unusedCredits && unusedCredits > 0 ? "var(--hpf-crimson)" : "var(--hpf-pink)",
                color: "white",
                fontSize: "0.75rem",
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "var(--app-font-sans)",
                whiteSpace: "nowrap",
              }}
            >
              {unusedCredits && unusedCredits > 0 ? "Unlock Free" : "Unlock"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function DeprioritizedCard({ item, nearbyProviderCount }: { item: PlanItem; nearbyProviderCount?: number | null }) {
  const noLocalProviders = nearbyProviderCount === 0 && item.modality.category !== "telehealth";
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.875rem",
      padding: "0.875rem 1rem",
      background: "white",
      borderRadius: 12,
      border: "1px solid rgba(212,34,126,0.06)",
      opacity: 0.7,
    }}>
      <span style={{ fontSize: "1.1rem" }}>{item.modality.emoji}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
          {item.modality.name}
        </p>
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          {noLocalProviders
            ? "No in-person providers found in your area · consider telehealth options"
            : `Over budget for this cycle · $${item.estimatedMonthlyCost}/mo est.`}
        </p>
      </div>
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
        <EvidenceBadge level={item.modality.evidenceLevel} />
        {nearbyProviderCount !== undefined && nearbyProviderCount !== null && (
          <span style={{ fontSize: "0.6rem", fontFamily: "var(--app-font-sans)", color: "var(--text-muted)" }}>
            {nearbyProviderCount} near you
          </span>
        )}
      </div>
    </div>
  );
}

export default function Plan() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [lmnEligibleIds, setLmnEligibleIds] = useState<Set<string>>(new Set());
  const [unusedCreditsCents, setUnusedCreditsCents] = useState(0);
  const [providerCounts, setProviderCounts] = useState<Record<string, number | null>>({});

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Fetch unused referral credits when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`${BASE}/api/credits/mine`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data.unusedCreditsCents === "number") {
          setUnusedCreditsCents(data.unusedCreditsCents);
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Fetch LMN-eligible modality IDs for personalized physician callout
  useEffect(() => {
    fetch(`${BASE}/api/lmn/eligible-modalities`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (Array.isArray(data?.modalities)) {
          setLmnEligibleIds(new Set(data.modalities.map((m: { id: string }) => m.id)));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const storedPlan = sessionStorage.getItem("hpf_plan");
      const storedIntake = sessionStorage.getItem("hpf_intake");
      if (!storedPlan || !storedIntake) return;

      const rawIntake = JSON.parse(storedIntake);
      const intakeResult = intakeSchema.safeParse(rawIntake);
      if (!intakeResult.success) {
        console.warn("Stored intake data failed validation — clearing");
        sessionStorage.removeItem("hpf_intake");
        sessionStorage.removeItem("hpf_plan");
        return;
      }

      const rawPlan = JSON.parse(storedPlan);
      const planResult = planSchema.safeParse(rawPlan);
      if (!planResult.success) {
        console.warn("Stored plan data failed schema validation — clearing");
        sessionStorage.removeItem("hpf_plan");
        return;
      }

      const rehydrated = deserializePlan(planResult.data);
      if (!rehydrated) {
        console.warn("Stored plan references unknown modality IDs — clearing");
        sessionStorage.removeItem("hpf_plan");
        return;
      }

      setIntake(intakeResult.data);
      setPlan(rehydrated);

      // Seed provider counts from stored plan items (available for unauthenticated users
      // whose plan was enriched by the server speculate call during onboarding).
      const seedCounts: Record<string, number | null> = {};
      for (const item of [...(rawPlan.included || []), ...(rawPlan.deprioritized || [])]) {
        if (item.modalityId && item.nearbyProviderCount !== undefined) {
          seedCounts[item.modalityId] = item.nearbyProviderCount;
        }
      }
      if (Object.keys(seedCounts).length > 0) {
        setProviderCounts(seedCounts);
      }
    } catch {
      console.warn("Failed to parse stored plan data — clearing");
      sessionStorage.removeItem("hpf_intake");
      sessionStorage.removeItem("hpf_plan");
    }
  }, []);

  // Fetch provider counts from the server plan (when authenticated, match by modality ID)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    fetch(`${BASE}/api/plans/${user.id}/latest`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.items) return;
        const counts: Record<string, number | null> = {};
        for (const item of data.items) {
          if (item.modalityId) {
            counts[item.modalityId] = item.nearbyProviderCount ?? null;
          }
        }
        setProviderCounts(counts);
      })
      .catch(() => {});
  }, [isAuthenticated, user?.id]);

  // Share handler — fetches/creates a share token for authenticated users
  async function handleSharePlan() {
    setShowShareModal(true);
    if (!isAuthenticated) return; // unauthenticated: modal shows card-only options
    if (shareUrl) return; // already generated

    setShareLoading(true);
    try {
      // Get the user's latest plan ID from API
      const profileId = user?.id;
      if (!profileId) { setShareLoading(false); return; }

      const planRes = await fetch(`${BASE}/api/plans/${profileId}/latest`, { credentials: "include" });
      if (!planRes.ok) { setShareLoading(false); return; }
      const planData = await planRes.json();
      const planId = planData?.plan?.id;
      if (!planId) { setShareLoading(false); return; }

      // Get primary goal label from intake
      const primaryGoal = intake?.goals?.[0] ?? null;
      const shareRes = await fetch(`${BASE}/api/plans/${planId}/share`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: primaryGoal }),
      });
      if (!shareRes.ok) { setShareLoading(false); return; }
      const shareData = await shareRes.json();
      setShareUrl(shareData.shareUrl ?? null);
    } catch {
      // silently degrade — share modal still shows card-only view
    } finally {
      setShareLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select text
    }
  }

  if (!plan || !intake) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--warm-white)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>📋</span>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)", marginBottom: "0.75rem" }}>
            No plan yet
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.65, marginBottom: "1.5rem" }}>
            Complete the onboarding wizard to generate your personalized wellness plan.
          </p>
          <button
            type="button"
            onClick={() => navigate("/onboarding")}
            style={{
              padding: "0.875rem 2rem",
              borderRadius: 10,
              border: "none",
              background: "var(--hpf-pink)",
              color: "white",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            Start Onboarding
          </button>
        </div>
      </div>
    );
  }

  const top3Modalities = plan.included.slice(0, 3);

  return (
    <div style={{ minHeight: "100vh", background: "var(--warm-white)" }}>
      {/* Header */}
      <header style={{
        background: "white",
        borderBottom: "1px solid rgba(212,34,126,0.07)",
        padding: "1.25rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <Logo />
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => navigate("/onboarding")}
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: 8,
              border: "1.5px solid rgba(212,34,126,0.2)",
              background: "white",
              color: "var(--hpf-pink)",
              fontWeight: 600,
              fontSize: "0.78rem",
              cursor: "pointer",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            Edit Inputs
          </button>
          <button
            type="button"
            onClick={handleSharePlan}
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: 8,
              border: "1.5px solid rgba(212,34,126,0.2)",
              background: "white",
              color: "var(--hpf-pink)",
              fontWeight: 600,
              fontSize: "0.78rem",
              cursor: "pointer",
              fontFamily: "var(--app-font-sans)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span>📤</span> Share
          </button>
          <Link
            to="/sign-up"
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: 8,
              background: "var(--hpf-pink)",
              color: "white",
              fontWeight: 600,
              fontSize: "0.78rem",
              textDecoration: "none",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            Save Plan
          </Link>
        </div>
      </header>

      {/* Share modal */}
      {showShareModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem",
          }}
        >
          <div style={{
            background: "white",
            borderRadius: 20,
            padding: "1.75rem",
            width: "100%",
            maxWidth: 460,
            boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.3rem", fontWeight: 700, color: "var(--hpf-pink)" }}>
                Share My Plan
              </h2>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--text-muted)" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Share card preview */}
            <div
              ref={shareCardRef}
              style={{
                background: "linear-gradient(135deg, var(--hpf-pink) 0%, var(--hpf-crimson) 100%)",
                borderRadius: 16,
                padding: "1.5rem",
                color: "white",
                marginBottom: "1.25rem",
              }}
            >
              <p style={{ fontSize: "0.6rem", fontFamily: "var(--app-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: "0.35rem" }}>
                Health Plan Factory
              </p>
              <p style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.25, marginBottom: "0.5rem" }}>
                {intake.goals?.[0]
                  ? `My wellness plan for ${intake.goals[0].toLowerCase()}`
                  : "My personalized wellness plan"}
              </p>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", fontFamily: "var(--app-font-sans)", marginBottom: "1rem" }}>
                ${plan.totalMonthlyCost}/mo · {plan.included.length} evidence-based modalities
              </p>
              {top3Modalities.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {top3Modalities.map((item, i) => (
                    <div key={item.modality.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "0.5rem 0.75rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>{item.modality.emoji}</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, fontFamily: "var(--app-font-sans)" }}>{item.modality.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: "0.62rem", fontFamily: "var(--app-font-mono)", color: "rgba(255,255,255,0.5)" }}>#{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Share actions */}
            {!isAuthenticated ? (
              <div style={{ background: "rgba(212,34,126,0.04)", border: "1.5px solid rgba(212,34,126,0.12)", borderRadius: 12, padding: "1rem", marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", marginBottom: 4 }}>
                  Save your plan to get a shareable link
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.55, marginBottom: "0.75rem" }}>
                  Create a free account to generate a public link your friends can use — with your referral code embedded.
                </p>
                <Link
                  to="/sign-up"
                  onClick={() => setShowShareModal(false)}
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    borderRadius: 8,
                    background: "var(--hpf-pink)",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.78rem",
                    textDecoration: "none",
                    fontFamily: "var(--app-font-sans)",
                  }}
                >
                  Sign Up Free →
                </Link>
              </div>
            ) : shareLoading ? (
              <div style={{ textAlign: "center", padding: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", fontSize: "0.8rem" }}>
                Generating share link…
              </div>
            ) : shareUrl ? (
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Your share link
                </p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div style={{
                    flex: 1,
                    padding: "0.5rem 0.75rem",
                    background: "rgba(212,34,126,0.04)",
                    border: "1px solid rgba(212,34,126,0.12)",
                    borderRadius: 8,
                    fontSize: "0.72rem",
                    fontFamily: "var(--app-font-mono)",
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {shareUrl}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{
                      padding: "0.5rem 0.875rem",
                      borderRadius: 8,
                      border: "none",
                      background: copied ? "var(--sage)" : "var(--hpf-pink)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      fontFamily: "var(--app-font-sans)",
                      whiteSpace: "nowrap",
                      transition: "background 0.2s",
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: "rgba(212,34,126,0.04)", border: "1.5px solid rgba(212,34,126,0.12)", borderRadius: 12, padding: "0.875rem", marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  Could not generate share link. Please try again.
                </p>
              </div>
            )}

            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6 }}>
              Shared links show your top modalities and goal — no personal details are included. Your referral code is embedded so you earn credit for sign-ups.
            </p>
          </div>
        </div>
      )}

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>

        {/* Hero */}
        <div style={{ marginBottom: "2rem" }}>
          <p style={{
            fontSize: "0.7rem",
            fontFamily: "var(--app-font-mono)",
            color: "var(--hpf-crimson)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "0.5rem",
          }}>
            Your Personalized Plan
          </p>
          <h1 style={{
            fontFamily: "var(--app-font-serif)",
            fontSize: "clamp(1.8rem, 5vw, 2.4rem)",
            fontWeight: 700,
            color: "var(--hpf-pink)",
            lineHeight: 1.15,
            marginBottom: "0.75rem",
          }}>
            Your Wellness Roadmap
          </h1>
          <p style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            fontFamily: "var(--app-font-sans)",
            lineHeight: 1.7,
          }}>
            Based on your goals and <strong style={{ fontFamily: "var(--app-font-mono)", color: "var(--hpf-pink)" }}>${intake.budget}/mo</strong> budget, we've identified{" "}
            <strong>{plan.included.length} high-fit modalities</strong> for your wellness plan.
          </p>
        </div>

        {/* Budget bar */}
        <div style={{
          background: "white",
          borderRadius: 16,
          border: "1px solid rgba(212,34,126,0.08)",
          padding: "1.25rem",
          marginBottom: "1.75rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Budget Allocation
            </p>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: "var(--app-font-mono)", fontSize: "1.1rem", fontWeight: 600, color: "var(--hpf-pink)" }}>
                ${plan.totalMonthlyCost}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                {" "}/ ${intake.budget} /mo
              </span>
            </div>
          </div>

          {/* Bar */}
          <div style={{ height: 8, borderRadius: 100, background: "rgba(212,34,126,0.07)", marginBottom: "0.5rem", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${plan.budgetUtilization}%`,
              background: plan.budgetUtilization > 90
                ? "var(--sage)"
                : plan.budgetUtilization > 60
                ? "var(--hpf-crimson)"
                : "var(--hpf-pink)",
              borderRadius: 100,
              transition: "width 0.6s ease",
            }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              {plan.budgetUtilization}% of budget · {plan.included.length} modalities
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--sage)", fontFamily: "var(--app-font-sans)", fontWeight: 600 }}>
              ${intake.budget - plan.totalMonthlyCost} remaining
            </p>
          </div>
        </div>

        {/* Recommended modalities */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {plan.included.map((item, i) => {
              // For physician cards, compute personalized LMN context:
              // count non-physician plan items that are LMN-eligible + their savings
              let lmnContext: LmnContext | undefined;
              if (item.modality.category === "medical" && lmnEligibleIds.size > 0) {
                const otherEligible = plan.included.filter(
                  (pi) => pi.modality.id !== item.modality.id && lmnEligibleIds.has(pi.modality.id)
                );
                lmnContext = {
                  eligibleCount: otherEligible.length,
                  estimatedAnnualSavingsCents: otherEligible.reduce(
                    (sum, pi) => sum + pi.estimatedMonthlyCost * 100 * 12, 0
                  ),
                };
              }
              return <ModalityCard key={item.modality.id} item={item} rank={i + 1} lmnContext={lmnContext} unusedCredits={unusedCreditsCents} nearbyProviderCount={providerCounts[item.modality.id] ?? null} />;
            })}
          </div>
        </div>

        {/* Deprioritized section */}
        {plan.deprioritized.length > 0 && (
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(212,34,126,0.08)" }} />
              <p style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                fontFamily: "var(--app-font-sans)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                whiteSpace: "nowrap",
              }}>
                Over Budget This Cycle
              </p>
              <div style={{ flex: 1, height: 1, background: "rgba(212,34,126,0.08)" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {plan.deprioritized.map((item) => (
                <DeprioritizedCard key={item.modality.id} item={item} nearbyProviderCount={providerCounts[item.modality.id] ?? null} />
              ))}
            </div>
          </div>
        )}

        {/* LMN / HSA opportunity callout */}
        <div style={{
          borderRadius: 16,
          background: "rgba(224,32,64,0.06)",
          border: "1.5px solid rgba(224,32,64,0.22)",
          padding: "1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1rem",
          alignItems: "flex-start",
        }}>
          <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>💰</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", marginBottom: 4 }}>
              Items in your plan may qualify for HSA/FSA reimbursement with a physician's LMN
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6, marginBottom: 10 }}>
              A Letter of Medical Necessity from a Direct Primary Care physician can unlock tax-free HSA/FSA reimbursement for massage, PT, yoga, acupuncture, and more — potentially saving hundreds per year.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <Link
                to="/hsa-unlock"
                style={{
                  padding: "0.45rem 0.875rem",
                  borderRadius: 8,
                  background: "#E02040",
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  fontFamily: "var(--app-font-sans)",
                }}
              >
                Unlock my HSA →
              </Link>
              <Link
                to="/lmn-guide"
                style={{ fontSize: "0.72rem", fontWeight: 500, color: "#E02040", fontFamily: "var(--app-font-sans)", textDecoration: "underline" }}
              >
                How does it work?
              </Link>
            </div>
          </div>
        </div>

        {/* CTA block */}
        <div style={{
          borderRadius: 20,
          background: "var(--hpf-pink)",
          padding: "2rem",
          textAlign: "center",
        }}>
          <p style={{
            fontSize: "0.7rem",
            fontFamily: "var(--app-font-mono)",
            color: "var(--crimson-light)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "0.75rem",
          }}>
            Ready to act?
          </p>
          <h2 style={{
            fontFamily: "var(--app-font-serif)",
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "white",
            lineHeight: 1.2,
            marginBottom: "0.75rem",
          }}>
            Find vetted providers,<br />unlock your full plan
          </h2>
          {Object.values(providerCounts).some(c => c !== null && c > 0) && (
            <p style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              fontFamily: "var(--app-font-sans)",
              marginBottom: "1rem",
            }}>
              ✨ {Object.values(providerCounts).reduce<number>((acc, c) => acc + (c || 0), 0)} providers found near you for this plan
            </p>
          )}
          {unusedCreditsCents > 0 ? (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(224,32,64,0.2)",
              border: "1px solid rgba(224,32,64,0.4)",
              borderRadius: 8,
              padding: "0.4rem 0.875rem",
              marginBottom: "1rem",
            }}>
              <span style={{ fontSize: "0.85rem" }}>🎁</span>
              <span style={{ fontSize: "0.75rem", color: "var(--crimson-light)", fontFamily: "var(--app-font-sans)", fontWeight: 600 }}>
                1 referral credit applied — ${(unusedCreditsCents / 100).toFixed(2)} discount
              </span>
            </div>
          ) : null}
          <p style={{
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.55)",
            fontFamily: "var(--app-font-sans)",
            lineHeight: 1.65,
            marginBottom: "1.5rem",
            maxWidth: 380,
            margin: "0 auto 1.5rem",
          }}>
            {unusedCreditsCents > 0
              ? "Your referral credit covers your first provider unlock — sign up to redeem it."
              : "Save your plan, book appointments, and get AI accountability coaching — starting at $1 to unlock a provider list."}
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/sign-up"
              style={{
                padding: "0.875rem 1.75rem",
                borderRadius: 10,
                background: "var(--hpf-crimson)",
                color: "white",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              See Providers
            </Link>
            <Link
              to="/sign-up"
              style={{
                padding: "0.875rem 1.75rem",
                borderRadius: 10,
                border: "1.5px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "white",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              Save Plan
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <p style={{
          fontSize: "0.68rem",
          color: "var(--text-muted)",
          fontFamily: "var(--app-font-sans)",
          lineHeight: 1.7,
          textAlign: "center",
          marginTop: "2rem",
          maxWidth: 480,
          margin: "2rem auto 0",
        }}>
          This plan is generated for wellness optimization purposes only. It is not a medical diagnosis, treatment plan, or healthcare recommendation. Always consult a qualified healthcare provider. In a crisis: 911 · 988 Suicide &amp; Crisis Lifeline · Crisis Text Line 741741.
        </p>
      </main>
    </div>
  );
}
