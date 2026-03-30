import { useState } from "react";

interface StepBudgetProps {
  value: number;
  onChange: (val: number) => void;
}

const MIN = 50;
const MAX = 1000;

export function StepBudget({ value, onChange }: StepBudgetProps) {
  const [inputVal, setInputVal] = useState(String(value));

  const pct = ((value - MIN) / (MAX - MIN)) * 100;

  const budgetLabel =
    value < 150 ? "Starter budget — great for 1–2 modalities"
    : value < 300 ? "Moderate budget — solid 2–3 modality plan"
    : value < 500 ? "Comfortable budget — 4–5 modality plan"
    : "Premium budget — comprehensive wellness plan";

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange(v);
    setInputVal(String(v));
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
    const v = Number(e.target.value);
    if (!isNaN(v) && v >= MIN && v <= MAX) {
      onChange(Math.round(v));
    }
  };

  return (
    <div>
      <div
        className="text-center mb-6"
        style={{ fontFamily: "var(--app-font-mono)" }}
      >
        <div style={{ fontSize: "3rem", fontWeight: 500, color: "var(--navy)", lineHeight: 1 }}>
          <span style={{ fontSize: "1.4rem", verticalAlign: "super" }}>$</span>
          <input
            type="number"
            value={inputVal}
            min={MIN}
            max={MAX}
            onChange={handleInput}
            onBlur={() => {
              const v = Math.max(MIN, Math.min(MAX, Number(inputVal) || MIN));
              onChange(v);
              setInputVal(String(v));
            }}
            style={{
              width: "5.5ch",
              border: "none",
              background: "transparent",
              fontFamily: "var(--app-font-mono)",
              fontSize: "3rem",
              fontWeight: 500,
              color: "var(--navy)",
              textAlign: "center",
              outline: "none",
              lineHeight: 1,
            }}
          />
          <span style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginLeft: 4 }}>/mo</span>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          {budgetLabel}
        </p>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={10}
          value={value}
          onChange={handleSlider}
          style={{
            width: "100%",
            appearance: "none",
            height: 6,
            borderRadius: 100,
            outline: "none",
            cursor: "pointer",
            background: `linear-gradient(90deg, var(--navy) ${pct}%, var(--parchment, #edeae3) ${pct}%)`,
          }}
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}>$50</span>
          <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}>$1,000</span>
        </div>
      </div>

      <div
        className="rounded-xl p-4 text-xs leading-relaxed"
        style={{
          background: "var(--amber-pale, #fdf5e6)",
          border: "1px solid rgba(184,137,42,0.12)",
          color: "var(--navy)",
          fontFamily: "var(--app-font-sans)",
        }}
      >
        <strong style={{ color: "var(--hpf-amber)" }}>Tip:</strong> Some services may be HSA/FSA-eligible — we'll flag
        these in your plan. Your budget is an estimate; actual costs depend on your local providers.
      </div>
    </div>
  );
}
