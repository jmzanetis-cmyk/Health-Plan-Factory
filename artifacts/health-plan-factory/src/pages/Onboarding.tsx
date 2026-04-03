import { useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { intakeSchema, type IntakeData } from "@/types/onboarding";
import { generatePlan, serializePlan, type Plan, type PlanItem } from "@/lib/planEngine";
import { MODALITIES } from "@/data/modalities";
import { StepBudget } from "@/components/onboarding/StepBudget";
import { StepGoals } from "@/components/onboarding/StepGoals";
import { StepConditions } from "@/components/onboarding/StepConditions";
import { StepPreferences } from "@/components/onboarding/StepPreferences";
import { StepExclusions } from "@/components/onboarding/StepExclusions";
import { StepRegion } from "@/components/onboarding/StepRegion";
import { StepReview } from "@/components/onboarding/StepReview";
import { BuildingScreen } from "@/components/onboarding/BuildingScreen";
import { Logo } from "@/components/Logo";
import { getApiBase } from "@/lib/apiBase";
import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";

const STEP_FIELDS: (keyof IntakeData)[][] = [
  [],
  ["goals"],
  [],
  ["preferences"],
  [],
  ["zipCode"],
  [],
];

const DEFAULT_INTAKE: IntakeData = {
  budget: 250,
  goals: [],
  conditions: [],
  preferences: [],
  exclusions: [],
  zipCode: "",
  radius: 25,
  telehealth: true,
};

function parseIntakeFromParams(params: URLSearchParams): Partial<IntakeData> {
  const result: Partial<IntakeData> = {};

  let budget = params.get("budget");
  let conditions = params.get("conditions");
  let goals = params.get("goals");

  // Fall back to sessionStorage prefill (survives OAuth redirects from speculator CTA)
  if (!budget && !conditions && !goals) {
    try {
      const stored = sessionStorage.getItem("hpf_speculator_prefill");
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, string>;
        budget = parsed.budget ?? null;
        conditions = parsed.conditions ?? null;
        goals = parsed.goals ?? null;
        sessionStorage.removeItem("hpf_speculator_prefill");
      }
    } catch {
      // ignore
    }
  }

  if (budget) {
    const b = parseInt(budget, 10);
    if (!isNaN(b) && b >= 50 && b <= 1000) result.budget = b;
  }
  if (conditions) {
    result.conditions = conditions.split(",").filter(Boolean);
  }
  if (goals) {
    result.goals = goals.split(",").filter(Boolean);
  }
  return result;
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 48 : -48,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -48 : 48,
    opacity: 0,
  }),
};

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const dirRef = useRef(1);

  const STEPS = useMemo(() => [
    { title: t("onboarding.step1Title"), subtitle: t("onboarding.step1Sub"), fields: STEP_FIELDS[0] },
    { title: t("onboarding.step2Title"), subtitle: t("onboarding.step2Sub"), fields: STEP_FIELDS[1] },
    { title: t("onboarding.step3Title"), subtitle: t("onboarding.step3Sub"), fields: STEP_FIELDS[2] },
    { title: t("onboarding.step4Title"), subtitle: t("onboarding.step4Sub"), fields: STEP_FIELDS[3] },
    { title: t("onboarding.step5Title"), subtitle: t("onboarding.step5Sub"), fields: STEP_FIELDS[4] },
    { title: t("onboarding.step6Title"), subtitle: t("onboarding.step6Sub"), fields: STEP_FIELDS[5] },
    { title: t("onboarding.step7Title"), subtitle: t("onboarding.step7Sub"), fields: STEP_FIELDS[6] },
  ], [t]);

  const prefill = useMemo(() => parseIntakeFromParams(searchParams), [searchParams]);

  const {
    control,
    watch,
    trigger,
    getValues,
    formState: { isSubmitting },
  } = useForm<IntakeData>({
    resolver: zodResolver(intakeSchema),
    defaultValues: { ...DEFAULT_INTAKE, ...prefill },
    mode: "onChange",
  });

  const goals = watch("goals");
  const preferences = watch("preferences");
  const zipCode = watch("zipCode");

  const totalSteps = STEPS.length;
  const pct = ((step + 1) / totalSteps) * 100;

  function isStepValid(s: number): boolean {
    switch (s) {
      case 1: return goals.length > 0;
      case 3: return preferences.length > 0;
      case 5: return /^\d{5}$/.test(zipCode);
      default: return true;
    }
  }

  const stepValid = isStepValid(step);

  const handleNext = async () => {
    const fields = STEPS[step].fields;
    if (fields.length > 0) {
      const ok = await trigger(fields);
      if (!ok) return;
    }
    if (step === totalSteps - 1) {
      setBuilding(true);
    } else {
      dirRef.current = 1;
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    dirRef.current = -1;
    setStep((s) => Math.max(0, s - 1));
  };

  const handleEditStep = (targetStep: number) => {
    dirRef.current = targetStep < step ? -1 : 1;
    setStep(targetStep);
  };

  const handleBuildComplete = useCallback(async () => {
    const data = getValues();
    const plan = generatePlan(data);

    // Use server-side speculate as the source of truth for provider-aware plan generation.
    // The server engine applies proximity-based deprioritization (zero-provider modalities
    // are moved to Deprioritized), so we use its full output to build the preview.
    // Falls back to local generatePlan if the server is unavailable.
    let enriched: Plan = plan;
    try {
      const base = getApiBase();
      type SpeculateItem = {
        modalityId: string;
        score: number;
        frequency: string;
        estimatedMonthlyCost: number;
        rationale: string;
        nearbyProviderCount: number | null;
        isDeprioritized: boolean;
      };
      const res = await fetch(`${base}/api/plans/speculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: data.budget,
          goals: data.goals ?? [],
          conditions: data.conditions ?? [],
          preferences: data.preferences ?? [],
          exclusions: data.exclusions ?? [],
          telehealth: data.telehealth ?? false,
          zipCode: data.zipCode ?? undefined,
          radius: data.radius ?? 25,
        }),
      });
      if (res.ok) {
        const speculateResult = await res.json() as {
          allItems: SpeculateItem[];
          totalMonthlyCost: number;
          budgetUtilization: number;
        };
        if (Array.isArray(speculateResult.allItems)) {
          // Map server results back to the local Plan shape using local Modality objects.
          // Items without a local Modality match are silently skipped (unknown server modalities).
          const toLocalPlanItem = (si: SpeculateItem): PlanItem | null => {
            const modality = MODALITIES.find((m) => m.id === si.modalityId);
            if (!modality) return null;
            return {
              modality,
              score: si.score,
              frequency: si.frequency,
              estimatedMonthlyCost: si.estimatedMonthlyCost,
              rationale: si.rationale,
              nearbyProviderCount: si.nearbyProviderCount,
            };
          };
          const includedFromServer = speculateResult.allItems
            .filter((si) => !si.isDeprioritized)
            .map(toLocalPlanItem)
            .filter((x): x is PlanItem => x !== null);
          const deprioritizedFromServer = speculateResult.allItems
            .filter((si) => si.isDeprioritized)
            .map(toLocalPlanItem)
            .filter((x): x is PlanItem => x !== null);

          if (includedFromServer.length > 0 || deprioritizedFromServer.length > 0) {
            enriched = {
              included: includedFromServer,
              deprioritized: deprioritizedFromServer,
              totalMonthlyCost: speculateResult.totalMonthlyCost,
              budgetUtilization: speculateResult.budgetUtilization,
            };
          }
        }
      }
    } catch {
      // Server unavailable — use local plan as-is
    }

    sessionStorage.setItem("hpf_intake", JSON.stringify(data));
    sessionStorage.setItem("hpf_plan", JSON.stringify(serializePlan(enriched)));

    // Persist to DB immediately for authenticated users (fire-and-forget).
    // We set hpf_plan_saved optimistically BEFORE navigating so Plan.tsx doesn't
    // fire a second concurrent POST to /api/plans/generate (race condition fix).
    // If the save fails we clear the flag so Plan.tsx can retry on next mount.
    if (isAuthenticated && user?.id) {
      sessionStorage.setItem("hpf_plan_saved", "1");
      const base = getApiBase();
      fetch(`${base}/api/plans/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profileId: user.id,
          budget: data.budget,
          goals: data.goals ?? [],
          conditions: data.conditions ?? [],
          preferences: data.preferences ?? [],
          exclusions: data.exclusions ?? [],
          telehealth: data.telehealth ?? false,
          zipCode: data.zipCode || undefined,
          radius: data.radius ?? 25,
        }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((saved) => {
          if (saved?.plan?.id) {
            sessionStorage.setItem("hpf_plan_id", saved.plan.id);
          } else {
            // Save failed — clear optimistic flag so Plan.tsx can retry
            sessionStorage.removeItem("hpf_plan_saved");
          }
        })
        .catch(() => {
          // Network failure — clear optimistic flag so Plan.tsx can retry
          sessionStorage.removeItem("hpf_plan_saved");
        });
    }

    navigate("/plan");
  }, [getValues, navigate, isAuthenticated, user]);

  if (building) {
    return <BuildingScreen onComplete={handleBuildComplete} />;
  }

  const stepMeta = STEPS[step];

  return (
    <div style={{ minHeight: "100vh", background: "var(--warm-white)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        padding: "1.25rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(212,34,126,0.06)",
      }}>
        <Logo />
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontFamily: "var(--app-font-sans)",
          }}
        >
          {t("onboarding.saveExit")}
        </button>
      </header>

      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(212,34,126,0.07)" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: "var(--hpf-pink)",
          transition: "width 0.35s ease",
          borderRadius: "0 100px 100px 0",
        }} />
      </div>

      {/* Step counter */}
      <div style={{ padding: "1.25rem 1.5rem 0", textAlign: "center" }}>
        <span style={{
          fontFamily: "var(--app-font-mono)",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          letterSpacing: "0.05em",
        }}>
          {t("onboarding.stepCounter", { current: step + 1, total: totalSteps })}
        </span>
      </div>

      {/* Main card */}
      <main style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1.5rem", overflow: "hidden" }}>
        <div style={{
          width: "100%",
          maxWidth: 540,
          background: "white",
          borderRadius: 20,
          boxShadow: "0 2px 24px rgba(212,34,126,0.07)",
          padding: "2rem 2rem 1.75rem",
          overflow: "hidden",
        }}>
          {/* Step heading */}
          <div style={{ marginBottom: "1.75rem" }}>
            <h1 style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "var(--hpf-pink)",
              lineHeight: 1.2,
              marginBottom: "0.45rem",
            }}>
              {stepMeta.title}
            </h1>
            <p style={{
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              fontFamily: "var(--app-font-sans)",
              lineHeight: 1.6,
            }}>
              {stepMeta.subtitle}
            </p>
          </div>

          {/* Animated step content */}
          <AnimatePresence mode="wait" custom={dirRef.current}>
            <motion.div
              key={step}
              custom={dirRef.current}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {step === 0 && <StepBudget control={control} />}
              {step === 1 && <StepGoals control={control} />}
              {step === 2 && <StepConditions control={control} />}
              {step === 3 && <StepPreferences control={control} />}
              {step === 4 && <StepExclusions control={control} />}
              {step === 5 && <StepRegion control={control} />}
              {step === 6 && <StepReview data={watch()} onEdit={handleEditStep} />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "2rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(212,34,126,0.07)",
          }}>
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: "0.875rem",
                  borderRadius: 10,
                  border: "1.5px solid rgba(212,34,126,0.2)",
                  background: "white",
                  color: "var(--hpf-pink)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  fontFamily: "var(--app-font-sans)",
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!stepValid || isSubmitting}
              style={{
                flex: 2,
                padding: "0.875rem",
                borderRadius: 10,
                border: "none",
                background: stepValid ? "var(--hpf-pink)" : "rgba(212,34,126,0.25)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: stepValid ? "pointer" : "not-allowed",
                fontFamily: "var(--app-font-sans)",
                transition: "background 0.2s",
              }}
            >
              {step === totalSteps - 1 ? "Generate My Plan" : "Continue"}
            </button>
          </div>
        </div>
      </main>

      {/* Footer disclaimer */}
      <footer style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
        <p style={{
          fontSize: "0.7rem",
          color: "var(--text-muted)",
          fontFamily: "var(--app-font-sans)",
          lineHeight: 1.6,
          maxWidth: 480,
          margin: "0 auto",
        }}>
          Health Plan Factory is a wellness optimization tool — not a medical provider. In a crisis, call 911 or 988.
        </p>
      </footer>
    </div>
  );
}
