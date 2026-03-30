import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { type Plan, type PlanItem, planSchema } from "@/lib/planEngine";
import { intakeSchema, type IntakeData } from "@/types/onboarding";
import { type EvidenceLevel } from "@/data/modalities";
import { Logo } from "@/components/Logo";

function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const styles: Record<EvidenceLevel, { bg: string; color: string }> = {
    Strong:   { bg: "rgba(61,107,82,0.1)",  color: "var(--sage)" },
    Moderate: { bg: "rgba(184,137,42,0.1)", color: "var(--hpf-amber)" },
    Emerging: { bg: "rgba(27,45,79,0.07)",  color: "var(--navy)" },
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
      background: "rgba(27,45,79,0.06)",
      color: "var(--navy)",
      fontFamily: "var(--app-font-sans)",
      letterSpacing: "0.02em",
    }}>
      HSA/FSA
    </span>
  );
}

function ModalityCard({ item, rank }: { item: PlanItem; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      border: "1px solid rgba(27,45,79,0.08)",
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
            background: rank === 1 ? "var(--navy)" : "rgba(27,45,79,0.07)",
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
                color: "var(--navy)",
                lineHeight: 1.2,
              }}>
                {item.modality.name}
              </h3>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
              <EvidenceBadge level={item.modality.evidenceLevel} />
              {item.modality.hsaEligible && <HsaBadge />}
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
        borderTop: "1px solid rgba(27,45,79,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(27,45,79,0.02)",
      }}>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <div>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              Est. cost
            </p>
            <p style={{ fontFamily: "var(--app-font-mono)", fontSize: "1rem", fontWeight: 600, color: "var(--navy)" }}>
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
            color: "var(--hpf-amber)",
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
        <div style={{ padding: "1rem 1.25rem 1.25rem", borderTop: "1px solid rgba(27,45,79,0.05)" }}>
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
                background: "rgba(27,45,79,0.05)",
                color: "var(--text-secondary)",
                fontFamily: "var(--app-font-sans)",
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Provider CTA — locked */}
          <div style={{
            padding: "1rem",
            borderRadius: 10,
            border: "1.5px dashed rgba(27,45,79,0.2)",
            background: "rgba(27,45,79,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}>
            <span style={{ fontSize: "1.25rem" }}>🔒</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--navy)", fontFamily: "var(--app-font-sans)", marginBottom: 2 }}>
                See vetted providers near you
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                Unlock for $1–$3 · HSA-eligible providers flagged
              </p>
            </div>
            <Link
              to="/sign-up"
              style={{
                padding: "0.5rem 0.875rem",
                borderRadius: 8,
                background: "var(--navy)",
                color: "white",
                fontSize: "0.75rem",
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "var(--app-font-sans)",
                whiteSpace: "nowrap",
              }}
            >
              Unlock
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function DeprioritizedCard({ item }: { item: PlanItem }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.875rem",
      padding: "0.875rem 1rem",
      background: "white",
      borderRadius: 12,
      border: "1px solid rgba(27,45,79,0.06)",
      opacity: 0.7,
    }}>
      <span style={{ fontSize: "1.1rem" }}>{item.modality.emoji}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
          {item.modality.name}
        </p>
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          Over budget for this cycle · ${item.estimatedMonthlyCost}/mo est.
        </p>
      </div>
      <EvidenceBadge level={item.modality.evidenceLevel} />
    </div>
  );
}

export default function Plan() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [intake, setIntake] = useState<IntakeData | null>(null);

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
        console.warn("Stored plan data failed validation — clearing");
        sessionStorage.removeItem("hpf_plan");
        return;
      }

      setIntake(intakeResult.data);
      setPlan(planResult.data as unknown as Plan);
    } catch {
      console.warn("Failed to parse stored plan data — clearing");
      sessionStorage.removeItem("hpf_intake");
      sessionStorage.removeItem("hpf_plan");
    }
  }, []);

  if (!plan || !intake) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--warm-white)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>📋</span>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)", marginBottom: "0.75rem" }}>
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
              background: "var(--navy)",
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--warm-white)" }}>
      {/* Header */}
      <header style={{
        background: "white",
        borderBottom: "1px solid rgba(27,45,79,0.07)",
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
              border: "1.5px solid rgba(27,45,79,0.2)",
              background: "white",
              color: "var(--navy)",
              fontWeight: 600,
              fontSize: "0.78rem",
              cursor: "pointer",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            Edit Inputs
          </button>
          <Link
            to="/sign-up"
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: 8,
              background: "var(--navy)",
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

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>

        {/* Hero */}
        <div style={{ marginBottom: "2rem" }}>
          <p style={{
            fontSize: "0.7rem",
            fontFamily: "var(--app-font-mono)",
            color: "var(--hpf-amber)",
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
            color: "var(--navy)",
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
            Based on your goals and <strong style={{ fontFamily: "var(--app-font-mono)", color: "var(--navy)" }}>${intake.budget}/mo</strong> budget, we've identified{" "}
            <strong>{plan.included.length} high-fit modalities</strong> for your wellness plan.
          </p>
        </div>

        {/* Budget bar */}
        <div style={{
          background: "white",
          borderRadius: 16,
          border: "1px solid rgba(27,45,79,0.08)",
          padding: "1.25rem",
          marginBottom: "1.75rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--navy)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Budget Allocation
            </p>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: "var(--app-font-mono)", fontSize: "1.1rem", fontWeight: 600, color: "var(--navy)" }}>
                ${plan.totalMonthlyCost}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                {" "}/ ${intake.budget} /mo
              </span>
            </div>
          </div>

          {/* Bar */}
          <div style={{ height: 8, borderRadius: 100, background: "rgba(27,45,79,0.07)", marginBottom: "0.5rem", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${plan.budgetUtilization}%`,
              background: plan.budgetUtilization > 90
                ? "var(--sage)"
                : plan.budgetUtilization > 60
                ? "var(--hpf-amber)"
                : "var(--navy)",
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
            {plan.included.map((item, i) => (
              <ModalityCard key={item.modality.id} item={item} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* Deprioritized section */}
        {plan.deprioritized.length > 0 && (
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(27,45,79,0.08)" }} />
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
              <div style={{ flex: 1, height: 1, background: "rgba(27,45,79,0.08)" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {plan.deprioritized.map((item) => (
                <DeprioritizedCard key={item.modality.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* CTA block */}
        <div style={{
          borderRadius: 20,
          background: "var(--navy)",
          padding: "2rem",
          textAlign: "center",
        }}>
          <p style={{
            fontSize: "0.7rem",
            fontFamily: "var(--app-font-mono)",
            color: "var(--amber-light)",
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
          <p style={{
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.55)",
            fontFamily: "var(--app-font-sans)",
            lineHeight: 1.65,
            marginBottom: "1.5rem",
            maxWidth: 380,
            margin: "0 auto 1.5rem",
          }}>
            Save your plan, book appointments, and get AI accountability coaching — starting at $1 to unlock a provider list.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/sign-up"
              style={{
                padding: "0.875rem 1.75rem",
                borderRadius: 10,
                background: "var(--hpf-amber)",
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
