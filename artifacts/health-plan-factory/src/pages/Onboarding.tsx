import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { intakeSchema, type IntakeData } from "@/types/onboarding";
import { generatePlan } from "@/lib/planEngine";
import { StepBudget } from "@/components/onboarding/StepBudget";
import { StepGoals } from "@/components/onboarding/StepGoals";
import { StepConditions } from "@/components/onboarding/StepConditions";
import { StepPreferences } from "@/components/onboarding/StepPreferences";
import { StepExclusions } from "@/components/onboarding/StepExclusions";
import { StepRegion } from "@/components/onboarding/StepRegion";
import { StepReview } from "@/components/onboarding/StepReview";
import { BuildingScreen } from "@/components/onboarding/BuildingScreen";
import { Logo } from "@/components/Logo";
import { useState } from "react";

const STEPS = [
  {
    title: "What's your monthly budget?",
    subtitle: "We'll optimize your plan to this amount — no surprise costs.",
    fields: [] as (keyof IntakeData)[],
  },
  {
    title: "What are your health goals?",
    subtitle: "Choose all that apply. We'll rank modalities by fit.",
    fields: ["goals"] as (keyof IntakeData)[],
  },
  {
    title: "Any conditions or concerns?",
    subtitle: "This helps us personalize — not a medical intake.",
    fields: [] as (keyof IntakeData)[],
  },
  {
    title: "How do you prefer to engage?",
    subtitle: "We'll filter for modalities that match your style.",
    fields: ["preferences"] as (keyof IntakeData)[],
  },
  {
    title: "Anything you'd like to avoid?",
    subtitle: "Optional — skip if there are no restrictions.",
    fields: [] as (keyof IntakeData)[],
  },
  {
    title: "Where are you located?",
    subtitle: "We'll surface providers in your area.",
    fields: ["zipCode"] as (keyof IntakeData)[],
  },
  {
    title: "Review your preferences",
    subtitle: "Make sure everything looks right before we build your plan.",
    fields: [] as (keyof IntakeData)[],
  },
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
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const dirRef = useRef(1);

  const {
    control,
    watch,
    trigger,
    getValues,
    formState: { isSubmitting },
  } = useForm<IntakeData>({
    resolver: zodResolver(intakeSchema),
    defaultValues: DEFAULT_INTAKE,
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

  const handleBuildComplete = useCallback(() => {
    const data = getValues();
    const plan = generatePlan(data);
    sessionStorage.setItem("hpf_intake", JSON.stringify(data));
    sessionStorage.setItem("hpf_plan", JSON.stringify(plan));
    navigate("/plan");
  }, [getValues, navigate]);

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
        borderBottom: "1px solid rgba(27,45,79,0.06)",
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
          Save &amp; Exit
        </button>
      </header>

      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(27,45,79,0.07)" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: "var(--navy)",
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
          Step {step + 1} of {totalSteps}
        </span>
      </div>

      {/* Main card */}
      <main style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1.5rem", overflow: "hidden" }}>
        <div style={{
          width: "100%",
          maxWidth: 540,
          background: "white",
          borderRadius: 20,
          boxShadow: "0 2px 24px rgba(27,45,79,0.07)",
          padding: "2rem 2rem 1.75rem",
          overflow: "hidden",
        }}>
          {/* Step heading */}
          <div style={{ marginBottom: "1.75rem" }}>
            <h1 style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "var(--navy)",
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
            borderTop: "1px solid rgba(27,45,79,0.07)",
          }}>
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: "0.875rem",
                  borderRadius: 10,
                  border: "1.5px solid rgba(27,45,79,0.2)",
                  background: "white",
                  color: "var(--navy)",
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
                background: stepValid ? "var(--navy)" : "rgba(27,45,79,0.25)",
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
