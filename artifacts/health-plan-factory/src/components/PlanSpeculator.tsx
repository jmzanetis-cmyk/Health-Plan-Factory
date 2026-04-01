import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONDITIONS, GOALS } from "@/types/onboarding";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const MIN = 50;
const MAX = 1000;

type Severity = "mild" | "moderate" | "severe";
type Priority = "low" | "medium" | "high";

interface ConditionWeight {
  severity: Severity;
  priority: Priority;
}

interface SpeculateResult {
  items: {
    name: string;
    emoji: string;
    estimatedMonthlyCost: number;
    frequency: string;
    rationale: string;
    hsaEligible: boolean;
  }[];
  totalMonthlyCost: number;
  budgetUtilization: number;
  budget: number;
}

const SPECULATOR_CONDITIONS = CONDITIONS.filter((c) => c.id !== "none");
const SPECULATOR_GOALS = GOALS;

const SEVERITIES: { id: Severity; label: string }[] = [
  { id: "mild", label: "Mild" },
  { id: "moderate", label: "Moderate" },
  { id: "severe", label: "Severe" },
];

const PRIORITIES: { id: Priority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

function budgetLabel(v: number): string {
  if (v < 150) return "Starter — 1–2 modalities";
  if (v < 300) return "Moderate — 2–3 modality plan";
  if (v < 500) return "Comfortable — 4–5 modalities";
  return "Premium — comprehensive plan";
}

function PillButton({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.2rem 0.55rem",
        borderRadius: 100,
        border: active ? `1.5px solid ${color}` : "1.5px solid rgba(44,40,37,0.15)",
        background: active ? color : "white",
        color: active ? "white" : "var(--text-secondary)",
        fontSize: "0.7rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.12s",
        fontFamily: "var(--app-font-sans)",
        userSelect: "none",
        lineHeight: 1.4,
      }}
    >
      {label}
    </button>
  );
}

const SEVERITY_COLOR: Record<Severity, string> = {
  mild: "#7DB55C",
  moderate: "#D4A84B",
  severe: "#E02040",
};
const PRIORITY_COLOR: Record<Priority, string> = {
  low: "var(--hpf-pink)",
  medium: "#9B51E0",
  high: "#E02040",
};

export function PlanSpeculator() {
  const navigate = useNavigate();
  const [budget, setBudget] = useState(250);
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionWeights, setConditionWeights] = useState<Record<string, ConditionWeight>>({});
  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpeculateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pct = ((budget - MIN) / (MAX - MIN)) * 100;

  function toggleCondition(id: string) {
    if (conditions.includes(id)) {
      setConditions(conditions.filter((c) => c !== id));
      setConditionWeights((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setConditions([...conditions, id]);
      setConditionWeights((prev) => ({
        ...prev,
        [id]: { severity: "moderate", priority: "medium" },
      }));
    }
  }

  function toggleGoal(id: string) {
    if (goals.includes(id)) {
      setGoals(goals.filter((g) => g !== id));
    } else {
      setGoals([...goals, id]);
    }
  }

  function setWeight<K extends keyof ConditionWeight>(id: string, key: K, val: ConditionWeight[K]) {
    setConditionWeights((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: val },
    }));
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const conditionWeightsPayload = conditions.map((id) => ({
        id,
        severity: conditionWeights[id]?.severity ?? "moderate",
        priority: conditionWeights[id]?.priority ?? "medium",
      }));
      const res = await fetch(`${BASE}/api/plans/speculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget, conditions, conditionWeights: conditionWeightsPayload, goals }),
      });
      if (!res.ok) throw new Error("Failed to generate plan preview");
      const data: SpeculateResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
  }

  function handleSave() {
    const params = new URLSearchParams();
    params.set("budget", String(budget));
    if (conditions.length > 0) params.set("conditions", conditions.join(","));
    if (goals.length > 0) params.set("goals", goals.join(","));
    navigate(`/sign-up?${params.toString()}`);
  }

  const utilizationPct = result ? Math.round(result.budgetUtilization * 100) : 0;

  if (result) {
    return (
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: "white",
          border: "1.5px solid rgba(212,34,126,0.12)",
          boxShadow: "0 8px 32px rgba(212,34,126,0.1)",
        }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: "1px solid rgba(212,34,126,0.08)" }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Your plan preview
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs"
              style={{
                color: "var(--hpf-pink)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--app-font-sans)",
                fontWeight: 500,
              }}
            >
              ← Adjust inputs
            </button>
          </div>
        </div>

        <div className="px-5 pt-4 pb-2 flex flex-col gap-2">
          {result.items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl p-3"
              style={{
                background: "var(--off-white)",
                borderLeft: `3px solid ${i === 0 ? "var(--hpf-crimson)" : i === 1 ? "var(--sage)" : "var(--sky, #38bdf8)"}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base flex-shrink-0">{item.emoji}</span>
                <span
                  className="text-xs font-semibold flex-1"
                  style={{ color: "var(--hpf-pink)" }}
                >
                  {item.name}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.frequency}
                </span>
                <span
                  className="text-xs font-medium"
                  style={{
                    fontFamily: "var(--app-font-mono)",
                    color: "var(--hpf-pink)",
                  }}
                >
                  ${item.estimatedMonthlyCost}/mo
                </span>
                {item.hsaEligible && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: "var(--sage)",
                      background: "var(--sage-pale)",
                    }}
                  >
                    HSA
                  </span>
                )}
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
              >
                {item.rationale}
              </p>
            </div>
          ))}
        </div>

        <div className="px-5 py-3">
          <div
            className="flex justify-between items-center px-3 py-2.5 rounded-lg mb-3"
            style={{ background: "var(--hpf-pink)" }}
          >
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
              Monthly total
            </span>
            <span
              className="text-sm font-medium"
              style={{
                fontFamily: "var(--app-font-mono)",
                color: "white",
              }}
            >
              ${result.totalMonthlyCost} / ${result.budget} budget
            </span>
          </div>
          <div>
            <div
              className="flex justify-between text-xs mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              <span>Budget utilization</span>
              <strong style={{ color: "var(--hpf-pink)" }}>{utilizationPct}%</strong>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--off-white)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(utilizationPct, 100)}%`,
                  background:
                    "linear-gradient(90deg, var(--hpf-pink), var(--hpf-crimson))",
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="px-5 py-4"
          style={{ borderTop: "1px solid rgba(212,34,126,0.08)" }}
        >
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--hpf-pink)",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--app-font-sans)",
              boxShadow: "0 4px 16px rgba(212,34,126,0.25)",
              letterSpacing: "0.01em",
            }}
          >
            Save this plan — it's free →
          </button>
          <p
            className="text-center text-xs mt-2"
            style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}
          >
            No credit card required. Your inputs carry over automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: "white",
        border: "1.5px solid rgba(212,34,126,0.12)",
        boxShadow: "0 8px 32px rgba(212,34,126,0.1)",
      }}
    >
      <div
        className="px-5 py-4"
        style={{ borderBottom: "1px solid rgba(212,34,126,0.08)" }}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          ✦ Instant plan speculator
        </p>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
        >
          See your personalized plan in seconds — no account needed.
        </p>
      </div>

      {/* Budget */}
      <div className="px-5 pt-5 pb-2">
        <label
          className="block text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--hpf-deep)" }}
        >
          Monthly budget
        </label>
        <div className="text-center mb-3" style={{ fontFamily: "var(--app-font-mono)" }}>
          <span
            style={{
              fontSize: "2.4rem",
              fontWeight: 500,
              color: "var(--hpf-pink)",
              lineHeight: 1,
            }}
          >
            <span style={{ fontSize: "1.1rem", verticalAlign: "super" }}>$</span>
            {budget}
          </span>
          <span
            style={{
              fontSize: "0.95rem",
              color: "var(--text-secondary)",
              marginLeft: 4,
            }}
          >
            /mo
          </span>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}
          >
            {budgetLabel(budget)}
          </p>
        </div>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={10}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          style={{
            width: "100%",
            appearance: "none",
            height: 6,
            borderRadius: 100,
            outline: "none",
            cursor: "pointer",
            background: `linear-gradient(90deg, var(--hpf-pink) ${pct}%, rgba(212,34,126,0.12) ${pct}%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}
          >
            $50
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}
          >
            $1,000
          </span>
        </div>
      </div>

      {/* Conditions */}
      <div className="px-5 pt-4 pb-2">
        <label
          className="block text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: "var(--hpf-deep)" }}
        >
          Health conditions{" "}
          <span
            style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}
          >
            (optional)
          </span>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {SPECULATOR_CONDITIONS.map((opt) => {
            const isSelected = conditions.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleCondition(opt.id)}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: 100,
                  border: isSelected
                    ? "1.5px solid var(--hpf-pink)"
                    : "1.5px solid rgba(212,34,126,0.2)",
                  background: isSelected ? "var(--hpf-pink)" : "white",
                  color: isSelected ? "white" : "var(--text-secondary)",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "var(--app-font-sans)",
                  userSelect: "none",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-condition severity + priority */}
      {conditions.length > 0 && (
        <div
          className="mx-5 mb-1 mt-3 rounded-xl overflow-hidden"
          style={{
            border: "1px solid rgba(44,40,37,0.08)",
            background: "var(--off-white)",
          }}
        >
          <div
            className="px-3 py-2"
            style={{ borderBottom: "1px solid rgba(44,40,37,0.06)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Condition details — helps us prioritize your plan
            </p>
          </div>
          {conditions.map((id, i) => {
            const label = SPECULATOR_CONDITIONS.find((c) => c.id === id)?.label ?? id;
            const w = conditionWeights[id] ?? { severity: "moderate", priority: "medium" };
            return (
              <div
                key={id}
                className="px-3 py-3"
                style={{
                  borderBottom: i < conditions.length - 1 ? "1px solid rgba(44,40,37,0.06)" : "none",
                }}
              >
                <p
                  className="text-xs font-semibold mb-2"
                  style={{ color: "var(--hpf-deep)", fontFamily: "var(--app-font-sans)" }}
                >
                  {label}
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs w-14 flex-shrink-0"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}
                    >
                      Severity
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {SEVERITIES.map((s) => (
                        <PillButton
                          key={s.id}
                          label={s.label}
                          active={w.severity === s.id}
                          onClick={() => setWeight(id, "severity", s.id)}
                          color={SEVERITY_COLOR[s.id]}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs w-14 flex-shrink-0"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}
                    >
                      Priority
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {PRIORITIES.map((p) => (
                        <PillButton
                          key={p.id}
                          label={p.label}
                          active={w.priority === p.id}
                          onClick={() => setWeight(id, "priority", p.id)}
                          color={PRIORITY_COLOR[p.id]}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goals */}
      <div className="px-5 pt-4 pb-2">
        <label
          className="block text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: "var(--hpf-deep)" }}
        >
          Goals &amp; interests{" "}
          <span
            style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}
          >
            (optional)
          </span>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {SPECULATOR_GOALS.map((opt) => {
            const isSelected = goals.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleGoal(opt.id)}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: 100,
                  border: isSelected
                    ? "1.5px solid var(--hpf-pink)"
                    : "1.5px solid rgba(212,34,126,0.2)",
                  background: isSelected ? "var(--hpf-pink)" : "white",
                  color: isSelected ? "white" : "var(--text-secondary)",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "var(--app-font-sans)",
                  userSelect: "none",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="px-5 pt-3">
          <p
            className="text-xs"
            style={{ color: "var(--rose, #dc2626)", fontFamily: "var(--app-font-sans)" }}
          >
            {error}
          </p>
        </div>
      )}

      <div className="px-5 py-5">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background: loading ? "rgba(212,34,126,0.5)" : "var(--hpf-pink)",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "var(--app-font-sans)",
            boxShadow: loading ? "none" : "0 4px 16px rgba(212,34,126,0.25)",
            letterSpacing: "0.01em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          {loading ? (
            <>
              <span
                className="animate-spin"
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "white",
                  borderRadius: "50%",
                }}
              />
              Building your plan...
            </>
          ) : (
            "Generate my plan →"
          )}
        </button>
      </div>
    </div>
  );
}
