import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { toast } from "sonner";
import { type Plan, type PlanItem, planSchema, deserializePlan } from "@/lib/planEngine";
import { intakeSchema, type IntakeData } from "@/types/onboarding";
import { type EvidenceLevel, MODALITIES } from "@/data/modalities";
import { NPI_CATEGORIES } from "@/data/npiCategories";
import { Logo } from "@/components/Logo";
import { getApiBase } from "@/lib/apiBase";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function ProviderCountBadge({ count, isTelehealth }: { count?: number | null; isTelehealth?: boolean }) {
  const { t } = useTranslation();
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
        🌐 {t("plan.availableVia")}
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
        📍 {t("plan.noProvidersNear")}
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
      📍 {count === 1 ? t("plan.providersNear", { count }) : t("plan.providersNearPlural", { count })}
    </span>
  );
}

const BASE = getApiBase();

function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const { t } = useTranslation();
  const styles: Record<EvidenceLevel, { bg: string; color: string }> = {
    Strong:   { bg: "rgba(125,181,92,0.1)",  color: "var(--sage)" },
    Moderate: { bg: "rgba(224,32,64,0.1)", color: "var(--hpf-crimson)" },
    Emerging: { bg: "rgba(212,34,126,0.07)",  color: "var(--hpf-pink)" },
  };
  const s = styles[level];
  const labelKey = level === "Strong" ? "plan.evidenceLabel.strong" : level === "Moderate" ? "plan.evidenceLabel.moderate" : "plan.evidenceLabel.emerging";
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
      {t(labelKey)}
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

function ModalityCard({ item, rank, lmnContext, nearbyProviderCount, zipCode, onUpgrade, feedback, onFeedback, feedbackLoading, isAuthenticated }: { item: PlanItem; rank: number; lmnContext?: LmnContext; nearbyProviderCount?: number | null; zipCode?: string; onUpgrade?: () => void; feedback?: "helpful" | "not_helpful"; onFeedback?: (modalityId: string, fb: "helpful" | "not_helpful") => void; feedbackLoading?: boolean; isAuthenticated?: boolean }) {
  const { t } = useTranslation();
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
              {t("plan.estCost")}
            </p>
            <p style={{ fontFamily: "var(--app-font-mono)", fontSize: "1rem", fontWeight: 600, color: "var(--hpf-pink)" }}>
              ${item.estimatedMonthlyCost}/mo
            </p>
          </div>
          <div>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              {t("plan.frequency")}
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
          {expanded ? t("plan.less") : t("plan.more")}
        </button>
      </div>

      {/* Working for me? — feedback row (authenticated users only) */}
      {isAuthenticated && (
        <div style={{
          padding: "0.65rem 1.25rem",
          borderTop: "1px solid rgba(212,34,126,0.05)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          background: feedback === "not_helpful" ? "rgba(245,158,11,0.04)" : "transparent",
        }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", flex: 1 }}>
            {t("plan.workingForMe")}
          </span>
          <button
            type="button"
            disabled={feedbackLoading}
            onClick={() => onFeedback?.(item.modality.id, "helpful")}
            data-testid={`feedback-helpful-${item.modality.id}`}
            aria-label={t("plan.thumbsUp")}
            style={{
              background: feedback === "helpful" ? "rgba(22,163,74,0.12)" : "rgba(0,0,0,0.04)",
              border: feedback === "helpful" ? "1.5px solid rgba(22,163,74,0.4)" : "1.5px solid transparent",
              borderRadius: 8,
              padding: "0.3rem 0.6rem",
              cursor: feedbackLoading ? "wait" : "pointer",
              fontSize: "0.95rem",
              lineHeight: 1,
              transition: "all 0.15s",
              opacity: feedbackLoading ? 0.6 : 1,
            }}
          >
            👍
          </button>
          <button
            type="button"
            disabled={feedbackLoading}
            onClick={() => onFeedback?.(item.modality.id, "not_helpful")}
            data-testid={`feedback-not-helpful-${item.modality.id}`}
            aria-label={t("plan.thumbsDown")}
            style={{
              background: feedback === "not_helpful" ? "rgba(245,158,11,0.15)" : "rgba(0,0,0,0.04)",
              border: feedback === "not_helpful" ? "1.5px solid rgba(245,158,11,0.5)" : "1.5px solid transparent",
              borderRadius: 8,
              padding: "0.3rem 0.6rem",
              cursor: feedbackLoading ? "wait" : "pointer",
              fontSize: "0.95rem",
              lineHeight: 1,
              transition: "all 0.15s",
              opacity: feedbackLoading ? 0.6 : 1,
            }}
          >
            👎
          </button>
        </div>
      )}

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

          {/* Provider CTA — upgrade to Plus */}
          <div style={{
            padding: "1rem",
            borderRadius: 10,
            border: "1.5px dashed rgba(212,34,126,0.2)",
            background: "rgba(212,34,126,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}>
            <span style={{ fontSize: "1.25rem" }}>🔒</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", marginBottom: 2 }}>
                Upgrade to Plus to see matched providers
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                Plus members get real, matched local providers for every modality — $9.99/mo, no per-provider fees.
              </p>
            </div>
            <button
              onClick={onUpgrade}
              style={{
                padding: "0.5rem 0.875rem",
                borderRadius: 8,
                background: "var(--hpf-pink)",
                color: "white",
                fontSize: "0.75rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--app-font-sans)",
                whiteSpace: "nowrap",
              }}
            >
              Upgrade →
            </button>
          </div>

          {/* NPI Registry CTA — shown only for modalities with NPI coverage */}
          {NPI_CATEGORIES[item.modality.id] && (() => {
            const npiParams = new URLSearchParams({ modality: item.modality.id });
            if (zipCode) npiParams.set("zip", zipCode);
            return (
              <Link
                to={`/providers/search?${npiParams.toString()}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginTop: "0.75rem",
                  padding: "0.6rem 0.875rem",
                  borderRadius: 10,
                  background: "rgba(59,130,246,0.05)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: "0.9rem" }}>🔍</span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#1d4ed8",
                    fontFamily: "var(--app-font-sans)",
                    marginBottom: 1,
                  }}>
                    Find real licensed providers →
                  </p>
                  <p style={{
                    fontSize: "0.65rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--app-font-sans)",
                  }}>
                    Free lookup via the federal NPI Registry
                  </p>
                </div>
              </Link>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function DeprioritizedCard({ item, nearbyProviderCount }: { item: PlanItem; nearbyProviderCount?: number | null }) {
  const { t } = useTranslation();
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
            ? t("plan.noLocalProviders")
            : t("plan.overBudget", { cost: item.estimatedMonthlyCost })}
        </p>
      </div>
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
        <EvidenceBadge level={item.modality.evidenceLevel} />
        {nearbyProviderCount !== undefined && nearbyProviderCount !== null && (
          <span style={{ fontSize: "0.6rem", fontFamily: "var(--app-font-sans)", color: "var(--text-muted)" }}>
            {t("plan.nearYouCount", { count: nearbyProviderCount })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Plan() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [lmnEligibleIds, setLmnEligibleIds] = useState<Set<string>>(new Set());
  const [providerCounts, setProviderCounts] = useState<Record<string, number | null>>({});

  // Guards to prevent duplicate DB persist / load attempts
  const persistAttemptedRef = useRef(false);
  const dbLoadAttemptedRef = useRef(false);

  // True while we are waiting for the DB round-trip to finish.
  // Prevents flashing "No plan yet" on authenticated return visits.
  const [dbHydrating, setDbHydrating] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // PDF download state
  const [pdfLoading, setPdfLoading] = useState(false);

  // Plus checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState<{ checkout_url?: string } | null>(null);

  // Subscription status (fetched once on auth)
  const [isPlus, setIsPlus] = useState(false);

  // Outcome tracking state
  const [outcomeStatus, setOutcomeStatus] = useState<string | null>(null);
  const [outcomeLabel, setOutcomeLabel] = useState<string | null>(null);
  const [outcomeNote, setOutcomeNote] = useState<string | null>(null);
  const [outcomeAt, setOutcomeAt] = useState<string | null>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeFormLabel, setOutcomeFormLabel] = useState("pain-reduced");
  const [outcomeFormNote, setOutcomeFormNote] = useState("");
  const [outcomeSubmitting, setOutcomeSubmitting] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);

  // Per-modality feedback state
  const [modalityFeedback, setModalityFeedback] = useState<Record<string, "helpful" | "not_helpful">>({});
  const [modalityFeedbackLoading, setModalityFeedbackLoading] = useState<Record<string, boolean>>({});
  const feedbackLoadedRef = useRef(false);

  // Reconfigure modal state
  const [showReconfigureModal, setShowReconfigureModal] = useState(false);
  const [reconfigureLoading, setReconfigureLoading] = useState(false);

  const handlePlusCheckout = async () => {
    if (!isAuthenticated) {
      navigate("/sign-up?plan=plus");
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch(`${BASE}/api/subscriptions/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      setCheckoutModal(data);
    } catch {
      // Fallback to pricing page if checkout fails
      navigate("/pricing");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleConfirmCheckout = () => {
    if (checkoutModal?.checkout_url) {
      window.location.href = checkoutModal.checkout_url;
    } else {
      navigate("/pricing");
      setCheckoutModal(null);
    }
  };

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
      // Use partial schema so that missing/invalid optional fields don't wipe the plan.
      // The user just completed onboarding — we should always show their plan.
      const intakeResult = intakeSchema.partial().safeParse(rawIntake);
      const resolvedIntake: IntakeData = {
        budget: intakeResult.data?.budget ?? (typeof rawIntake?.budget === "number" ? rawIntake.budget : 250),
        goals: intakeResult.data?.goals ?? (Array.isArray(rawIntake?.goals) ? rawIntake.goals : []),
        conditions: intakeResult.data?.conditions ?? (Array.isArray(rawIntake?.conditions) ? rawIntake.conditions : []),
        preferences: intakeResult.data?.preferences ?? (Array.isArray(rawIntake?.preferences) ? rawIntake.preferences : []),
        exclusions: intakeResult.data?.exclusions ?? (Array.isArray(rawIntake?.exclusions) ? rawIntake.exclusions : []),
        zipCode: intakeResult.data?.zipCode ?? (typeof rawIntake?.zipCode === "string" ? rawIntake.zipCode : ""),
        radius: intakeResult.data?.radius ?? (typeof rawIntake?.radius === "number" ? rawIntake.radius : 25),
        telehealth: intakeResult.data?.telehealth ?? (typeof rawIntake?.telehealth === "boolean" ? rawIntake.telehealth : false),
      };

      const rawPlan = JSON.parse(storedPlan);
      const planResult = planSchema.safeParse(rawPlan);
      if (!planResult.success) {
        console.warn("Stored plan data failed schema validation", planResult.error.issues);
        return;
      }

      const rehydrated = deserializePlan(planResult.data);
      if (!rehydrated) {
        console.warn("Stored plan references unknown modality IDs — cannot display plan");
        return;
      }

      setIntake(resolvedIntake);
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
      } else {
        // Fallback: fetch provider counts via API if plan items weren't pre-enriched
        const zip = intakeResult.data?.zipCode;
        const params = new URLSearchParams({ radius: "25" });
        if (zip) params.set("zipCode", zip);
        fetch(`${BASE}/api/providers/counts?${params}`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data?.counts) {
              const fallbackCounts: Record<string, number | null> = {};
              for (const [k, v] of Object.entries(data.counts)) {
                fallbackCounts[k] = v as number;
              }
              setProviderCounts(fallbackCounts);
            }
          })
          .catch(() => {});
      }
    } catch {
      console.warn("Failed to parse stored plan data — clearing");
      sessionStorage.removeItem("hpf_intake");
      sessionStorage.removeItem("hpf_plan");
    }
  }, []);

  // Fetch subscription status once auth resolves
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetch(`${BASE}/api/members/subscription`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setIsPlus(!!data.isPlus); })
      .catch(() => {});
  }, [authLoading, isAuthenticated]);

  // Reset feedback-load gate whenever planId changes from external navigation,
  // ensuring hydration always runs for the currently displayed plan.
  const prevPlanIdRef = useRef<string | null>(null);
  if (planId && planId !== prevPlanIdRef.current) {
    prevPlanIdRef.current = planId;
    feedbackLoadedRef.current = false;
  }

  // Load existing modality feedback from API once planId is known
  useEffect(() => {
    if (!planId || !isAuthenticated || feedbackLoadedRef.current) return;
    feedbackLoadedRef.current = true;
    fetch(`${BASE}/api/plans/${planId}/modality-feedback`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!Array.isArray(data?.feedback)) return;
        const map: Record<string, "helpful" | "not_helpful"> = {};
        for (const row of data.feedback) {
          if (row.modalityId && (row.feedback === "helpful" || row.feedback === "not_helpful")) {
            map[row.modalityId] = row.feedback;
          }
        }
        setModalityFeedback(map);
      })
      .catch(() => {});
  }, [planId, isAuthenticated]);

  // Task 2: Persist session-storage plan to DB for users who completed onboarding
  // anonymously and then signed up (the common "try first, then sign up" flow).
  // The hpf_plan_saved flag prevents duplicate inserts on refresh.
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;
    if (persistAttemptedRef.current) return;
    if (sessionStorage.getItem("hpf_plan_saved")) {
      persistAttemptedRef.current = true;
      return;
    }
    const storedPlan = sessionStorage.getItem("hpf_plan");
    const storedIntake = sessionStorage.getItem("hpf_intake");
    if (!storedPlan || !storedIntake) return;

    persistAttemptedRef.current = true;

    try {
      const rawIntake = JSON.parse(storedIntake);
      fetch(`${BASE}/api/plans/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profileId: user.id,
          budget: typeof rawIntake.budget === "number" ? rawIntake.budget : 250,
          goals: Array.isArray(rawIntake.goals) ? rawIntake.goals : [],
          conditions: Array.isArray(rawIntake.conditions) ? rawIntake.conditions : [],
          preferences: Array.isArray(rawIntake.preferences) ? rawIntake.preferences : [],
          exclusions: Array.isArray(rawIntake.exclusions) ? rawIntake.exclusions : [],
          telehealth: typeof rawIntake.telehealth === "boolean" ? rawIntake.telehealth : false,
          zipCode: typeof rawIntake.zipCode === "string" ? rawIntake.zipCode || undefined : undefined,
          radius: typeof rawIntake.radius === "number" ? rawIntake.radius : 25,
        }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((saved) => {
          if (saved?.plan?.id) {
            // Only mark as saved after confirmed successful DB write
            sessionStorage.setItem("hpf_plan_id", saved.plan.id);
            sessionStorage.setItem("hpf_plan_saved", "1");
          }
        })
        .catch(() => {});
    } catch {
      // ignore JSON parse errors
    }
  }, [authLoading, isAuthenticated, user?.id]);

  // Fetch provider counts and, for return visits (no session data), hydrate the plan from DB.
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;
    // Show skeleton while fetching, but only when sessionStorage is empty
    // (if session data exists the plan renders synchronously in the other effect).
    if (!sessionStorage.getItem("hpf_plan")) {
      setDbHydrating(true);
    }
    fetch(`${BASE}/api/plans/${user.id}/latest`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        setDbHydrating(false);
        if (!data) return;

        // Update provider counts (always useful, merges with session-storage seed counts)
        if (Array.isArray(data.items)) {
          const counts: Record<string, number | null> = {};
          for (const item of data.items) {
            if (item.modalityId) {
              counts[item.modalityId] = item.nearbyProviderCount ?? null;
            }
          }
          setProviderCounts(counts);
        }

        // Capture plan ID + outcome state from the DB record (always, regardless of hydration)
        if (data.plan?.id) {
          setPlanId(data.plan.id);
          setOutcomeStatus(data.plan.outcomeStatus ?? null);
          setOutcomeLabel(data.plan.outcomeLabel ?? null);
          setOutcomeNote(data.plan.outcomeNote ?? null);
          setOutcomeAt(data.plan.outcomeAt ?? null);
        }

        // Task 3: Hydrate plan+intake for return visits (new device / cleared storage)
        if (dbLoadAttemptedRef.current) return;
        dbLoadAttemptedRef.current = true;
        if (sessionStorage.getItem("hpf_plan")) return; // session data takes priority
        if (!data.plan || !Array.isArray(data.items)) return;

        const toLocalPlanItem = (dbItem: {
          modalityId?: string | null;
          score?: number | null;
          frequency?: string | null;
          estimatedMonthlyCost?: number | null;
          rationale?: string | null;
          nearbyProviderCount?: number | null;
        }): PlanItem | null => {
          const modality = MODALITIES.find((m) => m.id === dbItem.modalityId);
          if (!modality) return null;
          return {
            modality,
            score: dbItem.score ?? 0,
            frequency: dbItem.frequency ?? "",
            estimatedMonthlyCost: dbItem.estimatedMonthlyCost ?? 0,
            rationale: dbItem.rationale ?? "",
            nearbyProviderCount: dbItem.nearbyProviderCount ?? null,
          };
        };

        const included = (data.items as Array<{ isDeprioritized?: boolean | null; modalityId?: string | null; score?: number | null; frequency?: string | null; estimatedMonthlyCost?: number | null; rationale?: string | null; nearbyProviderCount?: number | null }>)
          .filter((i) => !i.isDeprioritized)
          .map(toLocalPlanItem)
          .filter((x): x is PlanItem => x !== null);
        const deprioritized = (data.items as Array<{ isDeprioritized?: boolean | null; modalityId?: string | null; score?: number | null; frequency?: string | null; estimatedMonthlyCost?: number | null; rationale?: string | null; nearbyProviderCount?: number | null }>)
          .filter((i) => i.isDeprioritized)
          .map(toLocalPlanItem)
          .filter((x): x is PlanItem => x !== null);

        if (included.length === 0 && deprioritized.length === 0) return;

        const reconstructed: Plan = {
          included,
          deprioritized,
          totalMonthlyCost: data.plan.totalMonthlyCost ?? 0,
          budgetUtilization: data.plan.budgetUtilization ?? 0,
        };

        const reconstructedIntake: IntakeData = {
          budget: typeof data.plan.budget === "number" ? data.plan.budget : 250,
          goals: [],
          conditions: [],
          preferences: [],
          exclusions: [],
          zipCode: "",
          radius: 25,
          telehealth: false,
        };

        setPlan(reconstructed);
        setIntake(reconstructedIntake);
        // Mark plan as saved since it already exists in DB
        sessionStorage.setItem("hpf_plan_saved", "1");
      })
      .catch(() => { setDbHydrating(false); });
  }, [authLoading, isAuthenticated, user?.id]);

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

  async function handleDownloadPdf() {
    if (!plan || !intake || pdfLoading) return;
    setPdfLoading(true);
    try {
      // For authenticated users, try to fetch the saved plan ID so the server
      // can load authoritative data from the DB instead of trusting client payload
      let savedPlanId: string | undefined;
      if (isAuthenticated && user?.id) {
        try {
          const planRes = await fetch(`${BASE}/api/plans/${user.id}/latest`, { credentials: "include" });
          if (planRes.ok) {
            const planData = await planRes.json();
            savedPlanId = planData?.plan?.id as string | undefined;
          }
        } catch {
          // fallback to client payload
        }
      }

      const body = {
        ...(savedPlanId ? { planId: savedPlanId } : {}),
        plan: {
          included: plan.included.map((item) => ({
            modalityId: item.modality.id,
            name: item.modality.name,
            emoji: item.modality.emoji,
            description: item.modality.description ?? "",
            evidenceLevel: item.modality.evidenceLevel,
            hsaEligible: item.modality.hsaEligible ?? false,
            category: item.modality.category ?? "",
            frequency: item.frequency,
            estimatedMonthlyCost: item.estimatedMonthlyCost,
            rationale: item.rationale,
            nearbyProviderCount: item.nearbyProviderCount ?? null,
          })),
          totalMonthlyCost: plan.totalMonthlyCost,
          budgetUtilization: plan.budgetUtilization,
        },
        intake: {
          budget: intake.budget,
          goals: intake.goals ?? [],
          zipCode: intake.zipCode ?? "",
        },
      };

      const res = await fetch(`${BASE}/api/plans/pdf`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `health-plan-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleOutcomeSubmit() {
    if (!planId || outcomeSubmitting) return;
    setOutcomeSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/plans/${planId}/outcome`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcomeStatus: "achieved",
          outcomeLabel: outcomeFormLabel,
          outcomeNote: outcomeFormNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to record outcome");
      const data = await res.json();
      setOutcomeStatus(data.plan?.outcomeStatus ?? "achieved");
      setOutcomeLabel(data.plan?.outcomeLabel ?? outcomeFormLabel);
      setOutcomeNote(data.plan?.outcomeNote ?? (outcomeFormNote.trim() || null));
      setOutcomeAt(data.plan?.outcomeAt ?? new Date().toISOString());
      setShowOutcomeModal(false);
    } catch {
      // silently fail — user can retry
    } finally {
      setOutcomeSubmitting(false);
    }
  }

  async function handleFeedback(modalityId: string, fb: "helpful" | "not_helpful") {
    if (!planId || !isAuthenticated) return;
    // Save previous feedback in case we need to revert on failure
    const previousFeedback = modalityFeedback[modalityId];
    // Optimistic update
    setModalityFeedback((prev) => ({ ...prev, [modalityId]: fb }));
    setModalityFeedbackLoading((prev) => ({ ...prev, [modalityId]: true }));
    try {
      const res = await fetch(`${BASE}/api/plans/${planId}/modality-feedback`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modalityId, feedback: fb }),
      });
      if (!res.ok) {
        // Revert optimistic update on API error (remove key if there was no prior feedback)
        setModalityFeedback((prev) => {
          const updated = { ...prev };
          if (previousFeedback === undefined) { delete updated[modalityId]; } else { updated[modalityId] = previousFeedback; }
          return updated;
        });
        toast.error(t("plan.feedbackError"));
      }
    } catch {
      // Revert optimistic update on network error
      setModalityFeedback((prev) => {
        const updated = { ...prev };
        if (previousFeedback === undefined) { delete updated[modalityId]; } else { updated[modalityId] = previousFeedback; }
        return updated;
      });
      toast.error(t("plan.feedbackError"));
    } finally {
      setModalityFeedbackLoading((prev) => ({ ...prev, [modalityId]: false }));
    }
  }

  async function handleReconfigure() {
    if (!planId || reconfigureLoading) return;
    setReconfigureLoading(true);
    try {
      const res = await fetch(`${BASE}/api/plans/${planId}/reconfigure`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Reconfigure failed");
      const data = await res.json();

      // Rebuild local plan from the API response
      const toLocalPlanItem = (dbItem: { modalityId?: string | null; score?: number | null; frequency?: string | null; estimatedMonthlyCost?: number | null; rationale?: string | null; nearbyProviderCount?: number | null }): import("@/lib/planEngine").PlanItem | null => {
        const modality = MODALITIES.find((m) => m.id === dbItem.modalityId);
        if (!modality) return null;
        return {
          modality,
          score: dbItem.score ?? 0,
          frequency: dbItem.frequency ?? "",
          estimatedMonthlyCost: dbItem.estimatedMonthlyCost ?? 0,
          rationale: dbItem.rationale ?? "",
          nearbyProviderCount: dbItem.nearbyProviderCount ?? null,
        };
      };

      if (data.plan && Array.isArray(data.items)) {
        const included = (data.items as Array<{ isDeprioritized?: boolean | null } & Record<string, unknown>>)
          .filter((i) => !i.isDeprioritized)
          .map(toLocalPlanItem)
          .filter((x): x is import("@/lib/planEngine").PlanItem => x !== null);
        const deprioritized = (data.items as Array<{ isDeprioritized?: boolean | null } & Record<string, unknown>>)
          .filter((i) => i.isDeprioritized)
          .map(toLocalPlanItem)
          .filter((x): x is import("@/lib/planEngine").PlanItem => x !== null);

        setPlan({
          included,
          deprioritized,
          totalMonthlyCost: data.plan.totalMonthlyCost ?? 0,
          budgetUtilization: data.plan.budgetUtilization ?? 0,
        });
        setPlanId(data.plan.id);
        // Reset feedback for the new plan
        setModalityFeedback({});
        feedbackLoadedRef.current = false;
        // Clear cached plan so a page refresh hydrates from DB (not stale session)
        sessionStorage.removeItem("hpf_plan");
        sessionStorage.removeItem("hpf_plan_saved");
        sessionStorage.setItem("hpf_plan_id", data.plan.id);
      }

      setShowReconfigureModal(false);
      toast.success(t("plan.updateSuccess"));
    } catch {
      toast.error(t("plan.updateError"));
    } finally {
      setReconfigureLoading(false);
    }
  }

  const notHelpfulModalities = plan
    ? plan.included.filter((item) => modalityFeedback[item.modality.id] === "not_helpful")
    : [];

  if (!plan || !intake) {
    // Show skeleton while auth resolves or DB hydration is in flight
    if (authLoading || dbHydrating) {
      return (
        <div style={{ minHeight: "100vh", background: "var(--warm-white)" }}>
          {/* Skeleton header */}
          <header style={{ background: "white", borderBottom: "1px solid rgba(212,34,126,0.07)", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ width: 120, height: 28, borderRadius: 6, background: "rgba(212,34,126,0.08)", animation: "hpf-pulse 1.4s ease-in-out infinite" }} />
            <div style={{ width: 80, height: 32, borderRadius: 8, background: "rgba(212,34,126,0.08)", animation: "hpf-pulse 1.4s ease-in-out infinite" }} />
          </header>
          {/* Skeleton hero */}
          <div style={{ background: "linear-gradient(135deg, var(--hpf-navy) 0%, var(--hpf-deep) 100%)", padding: "3rem 1.5rem 2.5rem", textAlign: "center" }}>
            <div style={{ width: 260, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.12)", margin: "0 auto 1rem", animation: "hpf-pulse 1.4s ease-in-out infinite" }} />
            <div style={{ width: 180, height: 20, borderRadius: 6, background: "rgba(255,255,255,0.08)", margin: "0 auto", animation: "hpf-pulse 1.4s ease-in-out infinite" }} />
          </div>
          {/* Skeleton cards */}
          <div style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: "white", borderRadius: 14, padding: "1.5rem", border: "1px solid rgba(212,34,126,0.07)", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(212,34,126,0.08)", flexShrink: 0, animation: "hpf-pulse 1.4s ease-in-out infinite" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ width: "55%", height: 18, borderRadius: 5, background: "rgba(212,34,126,0.08)", animation: "hpf-pulse 1.4s ease-in-out infinite" }} />
                  <div style={{ width: "80%", height: 14, borderRadius: 5, background: "rgba(212,34,126,0.05)", animation: "hpf-pulse 1.4s ease-in-out infinite" }} />
                  <div style={{ width: "65%", height: 14, borderRadius: 5, background: "rgba(212,34,126,0.05)", animation: "hpf-pulse 1.4s ease-in-out infinite" }} />
                </div>
              </div>
            ))}
          </div>
          <style>{`@keyframes hpf-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
        </div>
      );
    }

    // Confirmed: no plan in session or DB — prompt user to start
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
          <LanguageSwitcher />
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
            {t("plan.editInputs")}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: 8,
              border: "1.5px solid rgba(212,34,126,0.2)",
              background: "white",
              color: "var(--hpf-pink)",
              fontWeight: 600,
              fontSize: "0.78rem",
              cursor: pdfLoading ? "wait" : "pointer",
              fontFamily: "var(--app-font-sans)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              opacity: pdfLoading ? 0.65 : 1,
            }}
          >
            <span>{pdfLoading ? "⏳" : "⬇️"}</span> {pdfLoading ? t("plan.generating") : t("plan.downloadPdf")}
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
                aria-label={t("common.close")}
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
                  ? t("plan.myWellnessPlanFor", { goal: intake.goals[0].toLowerCase() })
                  : t("plan.defaultTitle")}
              </p>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", fontFamily: "var(--app-font-sans)", marginBottom: "1rem" }}>
                {t("plan.planSummaryLine", { cost: plan.totalMonthlyCost, count: plan.included.length })}
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
                    {copied ? t("plan.copied") : t("plan.copy")}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: "rgba(212,34,126,0.04)", border: "1.5px solid rgba(212,34,126,0.12)", borderRadius: 12, padding: "0.875rem", marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  {t("plan.couldNotShare")}
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

          {/* Goal achieved badge */}
          {outcomeStatus && (
            <div
              data-testid="goal-achieved-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                borderRadius: 100,
                background: "rgba(22,163,74,0.1)",
                border: "1.5px solid rgba(22,163,74,0.3)",
              }}
            >
              <span style={{ fontSize: "1rem" }}>✅</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#15803d", fontFamily: "var(--app-font-sans)" }}>
                {outcomeStatus === "achieved" ? t("plan.goalAchieved") : t("plan.goalPartial")}
                {outcomeAt ? ` · ${new Date(outcomeAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : ""}
              </span>
            </div>
          )}
          {outcomeNote && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", fontStyle: "italic" }}>
              "{outcomeNote}"
            </p>
          )}

          {/* Outcome CTA */}
          {isAuthenticated && !outcomeStatus && (
            <div style={{ marginTop: "1.25rem" }}>
              {isPlus ? (
                <button
                  type="button"
                  data-testid="mark-goal-achieved-btn"
                  onClick={() => setShowOutcomeModal(true)}
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: 100,
                    border: "1.5px solid rgba(22,163,74,0.4)",
                    background: "rgba(22,163,74,0.07)",
                    color: "#15803d",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    fontFamily: "var(--app-font-sans)",
                    transition: "background 0.15s",
                  }}
                >
                  ✓ Mark goal achieved
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePlusCheckout}
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: 100,
                    border: "1.5px solid rgba(212,34,126,0.25)",
                    background: "transparent",
                    color: "var(--hpf-pink)",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    fontFamily: "var(--app-font-sans)",
                  }}
                >
                  Upgrade to track outcomes →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ZIP coverage warning — shown when provider lookup returns 0 results for all modalities */}
        {intake.zipCode && plan.included.length === 0 && plan.deprioritized.length > 0 && (
          <div style={{
            background: "rgba(245, 158, 11, 0.07)",
            border: "1.5px solid rgba(245,158,11,0.3)",
            borderRadius: 12,
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
          }}>
            <span style={{ fontSize: "1.25rem", flexShrink: 0, lineHeight: 1.4 }}>⚠️</span>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#92400e", fontFamily: "var(--app-font-sans)", marginBottom: "0.25rem" }}>
                {t("plan.noProvidersHeading", { zip: intake.zipCode })}
              </p>
              <p style={{ fontSize: "0.8rem", color: "#a16207", fontFamily: "var(--app-font-sans)", lineHeight: 1.6, margin: 0 }}>
                {t("plan.noProvidersNotice")}
              </p>
            </div>
          </div>
        )}

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
              const fb = modalityFeedback[item.modality.id];
              return (
                <div key={item.modality.id}>
                  <ModalityCard
                    item={item}
                    rank={i + 1}
                    lmnContext={lmnContext}
                    nearbyProviderCount={providerCounts[item.modality.id] ?? null}
                    zipCode={intake?.zipCode}
                    onUpgrade={handlePlusCheckout}
                    feedback={fb}
                    onFeedback={handleFeedback}
                    feedbackLoading={!!modalityFeedbackLoading[item.modality.id]}
                    isAuthenticated={isAuthenticated}
                  />
                  {/* Amber inline message when thumbs-down */}
                  {fb === "not_helpful" && (
                    <div style={{
                      marginTop: "0.4rem",
                      padding: "0.6rem 0.875rem",
                      borderRadius: 8,
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.25)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}>
                      <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>💡</span>
                      <p style={{ fontSize: "0.75rem", color: "#92400e", fontFamily: "var(--app-font-sans)", lineHeight: 1.55, margin: 0 }}>
                        If this isn't helping, you can reconfigure your plan to swap it out.
                      </p>
                    </div>
                  )}
                </div>
              );
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
            Connect with real providers.<br />Upgrade to Plus.
          </h2>
          {Object.values(providerCounts).some(c => c !== null && c > 0) && (
            <p style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              fontFamily: "var(--app-font-sans)",
              marginBottom: "1rem",
            }}>
              {t("plan.providersFoundNear", { count: Object.values(providerCounts).reduce<number>((acc, c) => acc + (c || 0), 0) })}
            </p>
          )}
          <p style={{
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.55)",
            fontFamily: "var(--app-font-sans)",
            lineHeight: 1.65,
            marginBottom: "1.5rem",
            maxWidth: 380,
            margin: "0 auto 1.5rem",
          }}>
            Plus members see real matched local providers for every modality — phone, website, booking — no per-provider fees. $9.99/mo.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={handlePlusCheckout}
              disabled={checkoutLoading}
              style={{
                padding: "0.875rem 1.75rem",
                borderRadius: 10,
                background: "var(--hpf-crimson)",
                color: "white",
                fontWeight: 700,
                fontSize: "0.9rem",
                fontFamily: "var(--app-font-sans)",
                border: "none",
                cursor: checkoutLoading ? "wait" : "pointer",
                opacity: checkoutLoading ? 0.7 : 1,
              }}
            >
              {checkoutLoading ? t("plan.upgradeLoading") : t("plan.upgradeBtn")}
            </button>
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
              {t("plan.savePlan")}
            </Link>
          </div>
          {/* Outcome modal */}
          {showOutcomeModal && (
            <div
              data-testid="outcome-modal"
              style={{
                position: "fixed", inset: 0, zIndex: 60,
                background: "rgba(44,40,37,0.55)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
              }}
              onClick={() => setShowOutcomeModal(false)}
            >
              <div
                style={{ background: "white", borderRadius: 16, padding: "1.75rem", maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.2rem", fontWeight: 700, color: "var(--hpf-deep)", marginBottom: "0.75rem" }}>
                  Mark goal as achieved
                </h3>

                {/* Medical disclaimer */}
                <div style={{ background: "rgba(245,158,11,0.07)", border: "1.5px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.25rem" }}>
                  <p style={{ fontSize: "0.75rem", color: "#92400e", fontFamily: "var(--app-font-sans)", lineHeight: 1.6, margin: 0 }}>
                    <strong>Medical reminder:</strong> Health Plan Factory is not a medical provider. Always follow your doctor's guidance before starting, changing, or stopping any wellness practice.
                  </p>
                </div>

                {/* Label selection — radio group */}
                <fieldset style={{ border: "none", padding: 0, margin: 0, marginBottom: "1.25rem" }}>
                  <legend style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t("plan.outcomeLegend")}
                  </legend>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {[
                      { value: "pain-reduced", label: t("plan.outcomePainReduced") },
                      { value: "energy-improved", label: t("plan.outcomeEnergyImproved") },
                      { value: "stress-managed", label: t("plan.outcomeStressManaged") },
                      { value: "sleep-better", label: t("plan.outcomeSleepBetter") },
                      { value: "fitness-improved", label: t("plan.outcomeFitnessImproved") },
                      { value: "other", label: t("plan.outcomeOther") },
                    ].map((opt) => {
                      const checked = outcomeFormLabel === opt.value;
                      return (
                        <label
                          key={opt.value}
                          data-testid={`outcome-label-${opt.value}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.4rem 0.875rem",
                            borderRadius: 100,
                            border: checked ? "1.5px solid #15803d" : "1.5px solid rgba(0,0,0,0.12)",
                            background: checked ? "rgba(22,163,74,0.1)" : "white",
                            color: checked ? "#15803d" : "var(--text-secondary)",
                            fontWeight: checked ? 600 : 400,
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            fontFamily: "var(--app-font-sans)",
                            transition: "all 0.15s",
                          }}
                        >
                          <input
                            type="radio"
                            name="outcomeLabel"
                            value={opt.value}
                            checked={checked}
                            onChange={() => setOutcomeFormLabel(opt.value)}
                            style={{ accentColor: "#15803d", width: 14, height: 14, margin: 0 }}
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Optional note */}
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t("plan.outcomeNoteLabel")}
                </label>
                <textarea
                  data-testid="outcome-note-input"
                  value={outcomeFormNote}
                  onChange={(e) => setOutcomeFormNote(e.target.value.slice(0, 500))}
                  placeholder={t("plan.outcomePlaceholder")}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.7rem 0.875rem",
                    borderRadius: 10,
                    border: "1.5px solid rgba(0,0,0,0.12)",
                    fontFamily: "var(--app-font-sans)",
                    fontSize: "0.85rem",
                    color: "var(--hpf-deep)",
                    resize: "vertical",
                    outline: "none",
                    boxSizing: "border-box",
                    marginBottom: "1.25rem",
                  }}
                />

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowOutcomeModal(false)}
                    style={{ flex: 1, padding: "0.7rem", borderRadius: 10, background: "transparent", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.85rem", border: "1.5px solid rgba(0,0,0,0.12)", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
                  >
                    {t("plan.cancelOutcome")}
                  </button>
                  <button
                    type="button"
                    data-testid="outcome-confirm-btn"
                    onClick={handleOutcomeSubmit}
                    disabled={outcomeSubmitting}
                    style={{ flex: 2, padding: "0.7rem", borderRadius: 10, background: "#15803d", color: "white", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: outcomeSubmitting ? "default" : "pointer", opacity: outcomeSubmitting ? 0.7 : 1, fontFamily: "var(--app-font-sans)" }}
                  >
                    {outcomeSubmitting ? t("plan.outcomeSaving") : t("plan.outcomeConfirm")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {checkoutModal && (
            <div
              style={{
                position: "fixed", inset: 0, zIndex: 50,
                background: "rgba(44,40,37,0.55)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
              }}
              onClick={() => setCheckoutModal(null)}
            >
              <div
                style={{ background: "white", borderRadius: 16, padding: "1.75rem", maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.15rem", fontWeight: 700, color: "var(--hpf-pink)", marginBottom: "0.5rem" }}>
                  {t("plan.upgradeHeading")}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6, marginBottom: "0.5rem" }}>
                  {t("plan.upgradePriceLine")}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", marginBottom: "1.25rem" }}>
                  {t("plan.upgradeSub")}
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    onClick={() => setCheckoutModal(null)}
                    style={{ flex: 1, padding: "0.7rem", borderRadius: 10, background: "transparent", color: "var(--hpf-pink)", fontWeight: 600, fontSize: "0.85rem", border: "1.5px solid rgba(212,34,126,0.15)", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
                  >
                    {t("plan.cancelOutcome")}
                  </button>
                  <button
                    onClick={handleConfirmCheckout}
                    style={{ flex: 2, padding: "0.7rem", borderRadius: 10, background: "var(--hpf-pink)", color: "white", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
                  >
                    {t("plan.upgradeGo")}
                  </button>
                </div>
              </div>
            </div>
          )}
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
          paddingBottom: notHelpfulModalities.length > 0 ? "5rem" : 0,
        }}>
          This plan is generated for wellness optimization purposes only. It is not a medical diagnosis, treatment plan, or healthcare recommendation. Always consult a qualified healthcare provider. In a crisis: 911 · 988 Suicide &amp; Crisis Lifeline · Crisis Text Line 741741.
        </p>
      </main>

      {/* ── Sticky "Reconfigure plan" button — shown when ≥1 modality is 👎 ── */}
      {isAuthenticated && notHelpfulModalities.length > 0 && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          borderTop: "1px solid rgba(245,158,11,0.2)",
          padding: "0.875rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}>
          <p style={{ fontSize: "0.8rem", color: "#92400e", fontFamily: "var(--app-font-sans)", lineHeight: 1.4, margin: 0, flex: 1 }}>
            <strong>{notHelpfulModalities.length} modality</strong> {notHelpfulModalities.length === 1 ? "isn't" : "aren't"} working for you.
          </p>
          <button
            type="button"
            data-testid="reconfigure-plan-btn"
            onClick={() => setShowReconfigureModal(true)}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: 10,
              border: "none",
              background: "rgba(245,158,11,0.85)",
              color: "white",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              fontFamily: "var(--app-font-sans)",
              whiteSpace: "nowrap",
            }}
          >
            Reconfigure plan →
          </button>
        </div>
      )}

      {/* ── Reconfigure confirmation modal ─────────────────────────────────── */}
      {showReconfigureModal && (
        <div
          data-testid="reconfigure-modal"
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(44,40,37,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}
          onClick={() => !reconfigureLoading && setShowReconfigureModal(false)}
        >
          <div
            style={{ background: "white", borderRadius: 16, padding: "1.75rem", maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.2rem", fontWeight: 700, color: "var(--hpf-deep)", marginBottom: "0.75rem" }}>
              Reconfigure your plan
            </h3>

            {/* Doctor disclaimer */}
            <div style={{ background: "rgba(245,158,11,0.07)", border: "1.5px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.75rem", color: "#92400e", fontFamily: "var(--app-font-sans)", lineHeight: 1.6, margin: 0 }}>
                <strong>Medical reminder:</strong> Health Plan Factory is not a medical provider. Always consult your doctor before starting, changing, or stopping any wellness practice.
              </p>
            </div>

            {/* List of flagged modalities */}
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Modalities to swap out
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.25rem" }}>
              {notHelpfulModalities.map((item) => (
                <div key={item.modality.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: 8, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <span style={{ fontSize: "1rem" }}>{item.modality.emoji}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--hpf-deep)", fontFamily: "var(--app-font-sans)" }}>{item.modality.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#92400e", fontFamily: "var(--app-font-sans)" }}>👎 not helpful</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              We'll generate a new plan with these modalities excluded and find better alternatives that fit your budget and goals.
            </p>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setShowReconfigureModal(false)}
                disabled={reconfigureLoading}
                style={{ flex: 1, padding: "0.7rem", borderRadius: 10, background: "transparent", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.85rem", border: "1.5px solid rgba(0,0,0,0.1)", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
              >
                {t("plan.cancelUpdate")}
              </button>
              <button
                type="button"
                data-testid="reconfigure-confirm-btn"
                onClick={handleReconfigure}
                disabled={reconfigureLoading}
                style={{ flex: 2, padding: "0.7rem", borderRadius: 10, background: "rgba(245,158,11,0.85)", color: "white", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: reconfigureLoading ? "wait" : "pointer", opacity: reconfigureLoading ? 0.7 : 1, fontFamily: "var(--app-font-sans)" }}
              >
                {reconfigureLoading ? t("plan.reconfigureLoading") : t("plan.reconfigureConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
