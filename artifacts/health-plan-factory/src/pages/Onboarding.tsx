import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { type IntakeData } from "@/types/onboarding";
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

const STEPS = [
  { title: "What's your monthly budget?", subtitle: "We'll optimize your plan to this amount — no surprise costs." },
  { title: "What are your health goals?", subtitle: "Choose all that apply. We'll rank modalities by fit." },
  { title: "Any conditions or concerns?", subtitle: "This helps us personalize — not a medical intake." },
  { title: "How do you prefer to engage?", subtitle: "We'll filter for modalities that match your style." },
  { title: "Anything you'd like to avoid?", subtitle: "Optional — skip if there are no restrictions." },
  { title: "Where are you located?", subtitle: "We'll surface providers in your area." },
  { title: "Review your preferences", subtitle: "Make sure everything looks right before we build your plan." },
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

function validate(step: number, data: IntakeData): string | null {
  switch (step) {
    case 0: return null;
    case 1: return data.goals.length === 0 ? "Please select at least one goal." : null;
    case 2: return null;
    case 3: return data.preferences.length === 0 ? "Please select at least one preference." : null;
    case 4: return null;
    case 5: return !/^\d{5}$/.test(data.zipCode) ? "Please enter a valid 5-digit ZIP code." : null;
    case 6: return null;
    default: return null;
  }
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeData>(DEFAULT_INTAKE);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  const totalSteps = STEPS.length;
  const pct = ((step + 1) / totalSteps) * 100;

  const update = <K extends keyof IntakeData>(key: K, val: IntakeData[K]) => {
    setData((prev) => ({ ...prev, [key]: val }));
    setError(null);
  };

  const handleNext = () => {
    const err = validate(step, data);
    if (err) { setError(err); return; }
    setError(null);
    if (step === totalSteps - 1) {
      setBuilding(true);
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const handleEditStep = (targetStep: number) => {
    setStep(targetStep);
    setError(null);
  };

  const handleBuildComplete = useCallback(() => {
    const plan = generatePlan(data);
    sessionStorage.setItem("hpf_intake", JSON.stringify(data));
    sessionStorage.setItem("hpf_plan", JSON.stringify(plan));
    navigate("/plan");
  }, [data, navigate]);

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
        <span style={{ fontFamily: "var(--app-font-mono)", fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
          Step {step + 1} of {totalSteps}
        </span>
      </div>

      {/* Main card */}
      <main style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{
          width: "100%",
          maxWidth: 540,
          background: "white",
          borderRadius: 20,
          boxShadow: "0 2px 24px rgba(27,45,79,0.07)",
          padding: "2rem 2rem 1.75rem",
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
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6 }}>
              {stepMeta.subtitle}
            </p>
          </div>

          {/* Step content */}
          {step === 0 && <StepBudget value={data.budget} onChange={(v) => update("budget", v)} />}
          {step === 1 && <StepGoals value={data.goals} onChange={(v) => update("goals", v)} />}
          {step === 2 && <StepConditions value={data.conditions} onChange={(v) => update("conditions", v)} />}
          {step === 3 && <StepPreferences value={data.preferences} onChange={(v) => update("preferences", v)} />}
          {step === 4 && <StepExclusions value={data.exclusions} onChange={(v) => update("exclusions", v)} />}
          {step === 5 && (
            <StepRegion
              zipCode={data.zipCode}
              radius={data.radius}
              telehealth={data.telehealth}
              onZipChange={(v) => update("zipCode", v)}
              onRadiusChange={(v) => update("radius", v)}
              onTelehealthChange={(v) => update("telehealth", v)}
              zipError={error && step === 5 ? error : undefined}
            />
          )}
          {step === 6 && <StepReview data={data} onEdit={handleEditStep} />}

          {/* Validation error */}
          {error && step !== 5 && (
            <p style={{ color: "var(--rose, #dc2626)", fontSize: "0.875rem", fontFamily: "var(--app-font-sans)", marginTop: "0.75rem" }}>
              {error}
            </p>
          )}

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
              style={{
                flex: 2,
                padding: "0.875rem",
                borderRadius: 10,
                border: "none",
                background: "var(--navy)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              {step === totalSteps - 1 ? "Generate My Plan" : "Continue"}
            </button>
          </div>
        </div>
      </main>

      {/* Footer disclaimer */}
      <footer style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
          Health Plan Factory is a wellness optimization tool — not a medical provider. In a crisis, call 911 or 988.
        </p>
      </footer>
    </div>
  );
}
