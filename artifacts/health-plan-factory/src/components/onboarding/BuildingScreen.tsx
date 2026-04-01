import { useEffect, useState } from "react";

const BUILD_STEPS = [
  { icon: "🎯", label: "Analyzing your health goals" },
  { icon: "🔍", label: "Matching wellness modalities" },
  { icon: "💰", label: "Fitting your budget" },
  { icon: "📍", label: "Finding local providers" },
  { icon: "📊", label: "Ranking by evidence & fit" },
  { icon: "✅", label: "Your plan is ready" },
];

interface BuildingScreenProps {
  onComplete: () => void;
}

export function BuildingScreen({ onComplete }: BuildingScreenProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      if (step < BUILD_STEPS.length - 1) {
        setDoneSteps((prev) => [...prev, step]);
        step++;
        setActiveStep(step);
      } else {
        setDoneSteps((prev) => [...prev, step]);
        clearInterval(interval);
        setTimeout(onComplete, 600);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--hpf-pink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        {/* Bouncing factory */}
        <span
          style={{
            fontSize: "5rem",
            display: "block",
            marginBottom: "1.5rem",
            animation: "factoryBob 2s ease-in-out infinite",
          }}
          aria-hidden="true"
        >
          🏭
        </span>

        <h1
          style={{
            fontFamily: "var(--app-font-serif)",
            fontSize: "2.25rem",
            fontWeight: 700,
            color: "white",
            lineHeight: 1.15,
            marginBottom: "0.75rem",
          }}
        >
          Building your{" "}
          <em style={{ fontStyle: "italic", color: "var(--crimson-light)" }}>
            wellness plan
          </em>
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "rgba(255,255,255,0.5)",
            marginBottom: "2.5rem",
            lineHeight: 1.7,
            fontFamily: "var(--app-font-sans)",
          }}
        >
          Our plan engine is scoring your inputs against 12 wellness modalities.
        </p>

        {/* Build steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left", marginBottom: "2rem" }}>
          {BUILD_STEPS.map((step, i) => {
            const isDone = doneSteps.includes(i);
            const isActive = activeStep === i && !isDone;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.875rem 1.25rem",
                  borderRadius: 10,
                  border: isDone
                    ? "1px solid rgba(125,181,92,0.3)"
                    : isActive
                    ? "1px solid rgba(224,32,64,0.3)"
                    : "1px solid rgba(255,255,255,0.06)",
                  background: isDone
                    ? "rgba(125,181,92,0.18)"
                    : isActive
                    ? "rgba(224,32,64,0.12)"
                    : "rgba(255,255,255,0.04)",
                  fontSize: "0.85rem",
                  color: isDone ? "rgba(255,255,255,0.9)" : isActive ? "white" : "rgba(255,255,255,0.4)",
                  transition: "all 0.4s",
                  fontFamily: "var(--app-font-sans)",
                }}
              >
                <span style={{ fontSize: "1.1rem", flexShrink: 0, width: 28, textAlign: "center" }}>
                  {step.icon}
                </span>
                <span style={{ flex: 1 }}>{step.label}</span>
                {isDone && (
                  <span style={{ marginLeft: "auto", color: "rgba(125,181,92,0.9)", fontSize: "0.9rem" }}>✓</span>
                )}
                {isActive && (
                  <span
                    style={{
                      marginLeft: "auto",
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: "2px solid rgba(224,32,64,0.6)",
                      borderTopColor: "var(--crimson-light)",
                      animation: "spin 0.8s linear infinite",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <p
          style={{
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.2)",
            fontFamily: "var(--app-font-sans)",
          }}
        >
          This plan is for wellness optimization only — not a medical diagnosis or treatment recommendation.
        </p>
      </div>

      <style>{`
        @keyframes factoryBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
