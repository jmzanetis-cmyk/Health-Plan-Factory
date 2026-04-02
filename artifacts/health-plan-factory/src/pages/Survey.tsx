import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { GOALS } from "@/types/onboarding";
import { X } from "lucide-react";

/* ── Types ── */
export interface SurveyData {
  healthcareSituation?: string;
  healthcareGaps?: string[];
  desiredImprovements?: string[];
  likelihoodRating?: number;
  likelihoodComment?: string;
  goals?: string[];
  budgetRange?: string;
  budgetMidpoint?: number;
  referralSource?: string;
}

/* ── Constants ── */
const HEALTHCARE_SITUATIONS = [
  { id: "insufficient-coverage", label: "I have insurance but it doesn't cover enough", icon: "🏥" },
  { id: "uninsured", label: "I'm uninsured or underinsured", icon: "📋" },
  { id: "out-of-pocket", label: "I rely mostly on out-of-pocket care", icon: "💳" },
  { id: "generally-healthy", label: "I'm generally healthy and looking to stay that way", icon: "✅" },
];

const HEALTHCARE_GAPS = [
  { id: "specialists", label: "Affordable access to specialists" },
  { id: "holistic", label: "Alternative & holistic care" },
  { id: "mental-health", label: "Mental health support" },
  { id: "nutrition", label: "Nutrition & lifestyle guidance" },
  { id: "preventive", label: "Preventive & proactive care" },
  { id: "dental-vision", label: "Affordable dental & vision" },
  { id: "coordination", label: "Something to tie it all together" },
  { id: "satisfied", label: "Nothing — I'm satisfied" },
];

const DESIRED_IMPROVEMENTS = [
  { id: "lower-costs", label: "Lower costs" },
  { id: "personalized", label: "More personalized recommendations" },
  { id: "easier-access", label: "Easier access to providers" },
  { id: "preventive-focus", label: "Better preventive focus" },
  { id: "integrative", label: "More natural/integrative options" },
  { id: "coordination", label: "Simpler coordination" },
  { id: "control", label: "More control over my choices" },
];

const LIKELIHOOD_OPTIONS = [
  { value: 1, emoji: "😕", label: "Definitely not" },
  { value: 2, emoji: "🤔", label: "Unlikely" },
  { value: 3, emoji: "😐", label: "Maybe" },
  { value: 4, emoji: "🙂", label: "Likely" },
  { value: 5, emoji: "🤩", label: "Very likely" },
];

const BUDGET_RANGES = [
  { id: "under-100", label: "Under $100", midpoint: 75 },
  { id: "100-250", label: "$100–$250", midpoint: 175 },
  { id: "250-500", label: "$250–$500", midpoint: 375 },
  { id: "500-plus", label: "$500+", midpoint: 600 },
];

const REFERRAL_SOURCES = [
  { id: "word-of-mouth", label: "Word of mouth" },
  { id: "social-media", label: "Social media" },
  { id: "search", label: "Search (Google, Bing, etc.)" },
  { id: "employer-hr", label: "Employer / HR" },
  { id: "referral", label: "Referral from a provider" },
  { id: "other", label: "Other" },
];

/* ── Progress bar sections ── */
const SECTIONS = [
  { label: "Tell Us About Healthcare", steps: [1, 2, 3, 4] },
  { label: "Personalize Your Plan", steps: [5, 6, 7] },
];

/* ── Slide animation ── */
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 56 : -56, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -56 : 56, opacity: 0 }),
};

/* ── Small helper components ── */
function SingleCard({
  options,
  selected,
  onSelect,
}: {
  options: { id: string; label: string; icon?: string }[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {options.map((opt) => {
        const active = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.875rem 1rem",
              borderRadius: 12,
              border: active ? "2px solid var(--hpf-pink)" : "1.5px solid rgba(212,34,126,0.15)",
              background: active ? "rgba(212,34,126,0.06)" : "white",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            {opt.icon && <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{opt.icon}</span>}
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: active ? 600 : 400,
                color: active ? "var(--hpf-pink)" : "var(--text-secondary)",
              }}
            >
              {opt.label}
            </span>
            <span style={{ marginLeft: "auto", flexShrink: 0 }}>
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: active ? "5px solid var(--hpf-pink)" : "2px solid rgba(212,34,126,0.3)",
                  display: "inline-block",
                  boxSizing: "border-box",
                  transition: "all 0.15s",
                }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MultiTile({
  options,
  selected,
  onToggle,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "0.5rem",
      }}
    >
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            style={{
              padding: "0.625rem 0.75rem",
              borderRadius: 10,
              border: active ? "2px solid var(--hpf-pink)" : "1.5px solid rgba(212,34,126,0.15)",
              background: active ? "rgba(212,34,126,0.06)" : "white",
              cursor: "pointer",
              textAlign: "center",
              fontSize: "0.8rem",
              fontWeight: active ? 600 : 400,
              color: active ? "var(--hpf-pink)" : "var(--text-secondary)",
              transition: "all 0.15s ease",
              fontFamily: "var(--app-font-sans)",
              lineHeight: 1.3,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Main Survey component ── */
export default function Survey() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<SurveyData>({});

  const TOTAL_STEPS = 7;

  const currentSection =
    step <= 4
      ? SECTIONS[0]
      : SECTIONS[1];

  function getSectionPct() {
    if (step <= 4) {
      return ((step - 1) / 3) * 100;
    }
    return ((step - 5) / 2) * 100;
  }

  function getOverallPct() {
    return ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  }

  const save = useCallback(
    (partial: Partial<SurveyData>) => {
      setData((prev) => ({ ...prev, ...partial }));
    },
    [],
  );

  const finish = useCallback(
    (finalData: SurveyData) => {
      sessionStorage.setItem("hpf_survey", JSON.stringify(finalData));
      fetch(`${import.meta.env.BASE_URL}api/survey-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      }).catch((err) => console.error("[Survey] Failed to save survey response:", err));
      navigate("/");
    },
    [navigate],
  );

  const handleSkip = () => {
    finish(data);
  };

  const goNext = (partial?: Partial<SurveyData>) => {
    const updated = partial ? { ...data, ...partial } : data;
    if (partial) setData(updated);
    setDir(1);
    if (step >= TOTAL_STEPS) {
      finish(updated);
    } else {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    setDir(-1);
    setStep((s) => Math.max(1, s - 1));
  };

  const toggle = (arr: string[], id: string): string[] =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  /* ── Step renderers ── */
  function renderStep() {
    switch (step) {
      case 1:
        return (
          <StepShell
            heading="What best describes your current healthcare situation?"
            subtitle="We use this to understand where people are starting from — not to judge."
          >
            <SingleCard
              options={HEALTHCARE_SITUATIONS}
              selected={data.healthcareSituation}
              onSelect={(id) => save({ healthcareSituation: id })}
            />
          </StepShell>
        );
      case 2:
        return (
          <StepShell
            heading="What's missing from your current healthcare?"
            subtitle="Select all that apply — this is anonymous market research that helps us build better features."
          >
            <MultiTile
              options={HEALTHCARE_GAPS}
              selected={data.healthcareGaps ?? []}
              onToggle={(id) => save({ healthcareGaps: toggle(data.healthcareGaps ?? [], id) })}
            />
          </StepShell>
        );
      case 3:
        return (
          <StepShell
            heading="What would you most like to improve about how healthcare works for you?"
            subtitle="Pick all that resonate with your experience."
          >
            <MultiTile
              options={DESIRED_IMPROVEMENTS}
              selected={data.desiredImprovements ?? []}
              onToggle={(id) =>
                save({ desiredImprovements: toggle(data.desiredImprovements ?? [], id) })
              }
            />
          </StepShell>
        );
      case 4:
        return (
          <StepShell
            heading="How likely would you be to use a service that builds you a personalized, budget-optimized wellness plan?"
            subtitle="Be honest — your feedback helps us prioritize."
          >
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              {LIKELIHOOD_OPTIONS.map((opt) => {
                const active = data.likelihoodRating === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => save({ likelihoodRating: opt.value })}
                    style={{
                      flex: 1,
                      padding: "0.75rem 0.25rem",
                      borderRadius: 12,
                      border: active ? "2px solid var(--hpf-pink)" : "1.5px solid rgba(212,34,126,0.15)",
                      background: active ? "rgba(212,34,126,0.06)" : "white",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>{opt.emoji}</span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: active ? "var(--hpf-pink)" : "var(--text-muted)",
                        fontFamily: "var(--app-font-sans)",
                        textAlign: "center",
                        lineHeight: 1.2,
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.5rem",
                  fontFamily: "var(--app-font-sans)",
                }}
              >
                Anything else you'd like us to know? <span style={{ color: "var(--text-muted)" }}>(optional)</span>
              </label>
              <textarea
                value={data.likelihoodComment ?? ""}
                onChange={(e) => save({ likelihoodComment: e.target.value })}
                placeholder="Share your thoughts…"
                rows={3}
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1.5px solid rgba(212,34,126,0.15)",
                  padding: "0.75rem",
                  fontSize: "0.875rem",
                  fontFamily: "var(--app-font-sans)",
                  color: "var(--text-secondary)",
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </StepShell>
        );
      case 5:
        return (
          <StepShell
            heading="What's your primary wellness goal?"
            subtitle="Select all that apply — we'll build your plan around these."
          >
            <MultiTile
              options={GOALS}
              selected={data.goals ?? []}
              onToggle={(id) => save({ goals: toggle(data.goals ?? [], id) })}
            />
          </StepShell>
        );
      case 6:
        return (
          <StepShell
            heading="What's your monthly wellness budget?"
            subtitle="We'll optimize your plan to fit this range — no surprise costs."
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
              {BUDGET_RANGES.map((opt) => {
                const active = data.budgetRange === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => save({ budgetRange: opt.id, budgetMidpoint: opt.midpoint })}
                    style={{
                      padding: "1.25rem 1rem",
                      borderRadius: 12,
                      border: active ? "2px solid var(--hpf-pink)" : "1.5px solid rgba(212,34,126,0.15)",
                      background: active ? "rgba(212,34,126,0.06)" : "white",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: active ? "var(--hpf-pink)" : "var(--hpf-deep)",
                        fontFamily: "var(--app-font-mono)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {opt.label}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: active ? "var(--hpf-pink)" : "var(--text-muted)",
                        fontFamily: "var(--app-font-sans)",
                      }}
                    >
                      per month
                    </span>
                  </button>
                );
              })}
            </div>
          </StepShell>
        );
      case 7:
        return (
          <StepShell
            heading="How did you find us?"
            subtitle="Optional — helps us understand where to focus our growth."
          >
            <SingleCard
              options={REFERRAL_SOURCES}
              selected={data.referralSource}
              onSelect={(id) => save({ referralSource: id })}
            />
          </StepShell>
        );
      default:
        return null;
    }
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return !!data.healthcareSituation;
      case 2: return (data.healthcareGaps?.length ?? 0) > 0;
      case 3: return (data.desiredImprovements?.length ?? 0) > 0;
      case 4: return !!data.likelihoodRating;
      case 5: return (data.goals?.length ?? 0) > 0;
      case 6: return !!data.budgetRange;
      case 7: return true;
      default: return false;
    }
  }

  const valid = canAdvance();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--warm-white)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(212,34,126,0.06)",
        }}
      >
        <Logo />
        <button
          type="button"
          onClick={handleSkip}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontFamily: "var(--app-font-sans)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <X size={14} />
          Skip survey
        </button>
      </header>

      {/* Progress bar with dual-section label */}
      <div style={{ padding: "1rem 1.5rem 0" }}>
        <div
          style={{
            display: "flex",
            gap: "0.375rem",
            marginBottom: "0.5rem",
          }}
        >
          {SECTIONS.map((section, si) => {
            const sectionSteps = section.steps;
            const sectionActive = sectionSteps.includes(step);
            const sectionComplete = sectionSteps[sectionSteps.length - 1] < step;
            const sectionPct = sectionComplete
              ? 100
              : sectionActive
              ? ((step - sectionSteps[0]) / (sectionSteps.length - 1)) * 100
              : 0;

            return (
              <div key={si} style={{ flex: sectionSteps.length, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontFamily: "var(--app-font-sans)",
                    color: sectionActive || sectionComplete ? "var(--hpf-pink)" : "var(--text-muted)",
                    fontWeight: sectionActive ? 600 : 400,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}
                >
                  {section.label}
                </span>
                <div
                  style={{
                    height: 4,
                    background: "rgba(212,34,126,0.10)",
                    borderRadius: 100,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${sectionPct}%`,
                      background: sectionComplete ? "var(--hpf-deep)" : "var(--hpf-pink)",
                      transition: "width 0.35s ease",
                      borderRadius: 100,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginBottom: "0.25rem" }}>
          <span
            style={{
              fontFamily: "var(--app-font-mono)",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
            }}
          >
            Step {step} of {TOTAL_STEPS} &nbsp;·&nbsp; {currentSection.label}
          </span>
        </div>
      </div>

      {/* Main card */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "1.25rem 1.5rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 580,
            background: "white",
            borderRadius: 20,
            boxShadow: "0 2px 24px rgba(212,34,126,0.07)",
            padding: "2rem 2rem 1.75rem",
            overflow: "hidden",
          }}
        >
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              marginTop: "2rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid rgba(212,34,126,0.07)",
            }}
          >
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
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
              onClick={() => goNext()}
              disabled={!valid}
              style={{
                flex: 2,
                padding: "0.875rem",
                borderRadius: 10,
                border: "none",
                background: valid ? "var(--hpf-pink)" : "rgba(212,34,126,0.25)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: valid ? "pointer" : "not-allowed",
                fontFamily: "var(--app-font-sans)",
                transition: "background 0.2s",
              }}
            >
              {step === TOTAL_STEPS ? "See My Personalized Plan →" : "Continue"}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            fontFamily: "var(--app-font-sans)",
            lineHeight: 1.6,
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          Your responses are anonymous and used only to improve HealthPlanFactory. Health Plan Factory
          is a wellness tool — not a medical provider.
        </p>
      </footer>
    </div>
  );
}

/* ── Reusable step shell ── */
function StepShell({
  heading,
  subtitle,
  children,
}: {
  heading: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontFamily: "var(--app-font-serif)",
            fontSize: "1.45rem",
            fontWeight: 700,
            color: "var(--hpf-pink)",
            lineHeight: 1.25,
            marginBottom: "0.4rem",
          }}
        >
          {heading}
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            fontFamily: "var(--app-font-sans)",
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );
}
