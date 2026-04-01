import { Controller, type Control } from "react-hook-form";
import { useState } from "react";
import { type IntakeData } from "@/types/onboarding";

interface StepBudgetProps {
  control: Control<IntakeData>;
}

const MIN = 50;
const MAX = 1000;

function budgetLabel(v: number): string {
  if (v < 150) return "Starter budget — great for 1–2 modalities";
  if (v < 300) return "Moderate budget — solid 2–3 modality plan";
  if (v < 500) return "Comfortable budget — 4–5 modality plan";
  return "Premium budget — comprehensive wellness plan";
}

interface BudgetInputProps {
  value: number;
  onChange: (v: number) => void;
}

function BudgetInput({ value, onChange }: BudgetInputProps) {
  const [inputStr, setInputStr] = useState(String(value));
  const pct = ((value - MIN) / (MAX - MIN)) * 100;

  return (
    <div>
      <div className="text-center mb-6" style={{ fontFamily: "var(--app-font-mono)" }}>
        <div style={{ fontSize: "3rem", fontWeight: 500, color: "var(--hpf-pink)", lineHeight: 1 }}>
          <span style={{ fontSize: "1.4rem", verticalAlign: "super" }}>$</span>
          <input
            type="number"
            value={inputStr}
            min={MIN}
            max={MAX}
            onChange={(e) => {
              setInputStr(e.target.value);
              const v = Number(e.target.value);
              if (!isNaN(v) && v >= MIN && v <= MAX) onChange(Math.round(v));
            }}
            onBlur={() => {
              const v = Math.max(MIN, Math.min(MAX, Number(inputStr) || MIN));
              onChange(v);
              setInputStr(String(v));
            }}
            style={{
              width: "5.5ch",
              border: "none",
              background: "transparent",
              fontFamily: "var(--app-font-mono)",
              fontSize: "3rem",
              fontWeight: 500,
              color: "var(--hpf-pink)",
              textAlign: "center",
              outline: "none",
              lineHeight: 1,
            }}
          />
          <span style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginLeft: 4 }}>/mo</span>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          {budgetLabel(value)}
        </p>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={10}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(v);
            setInputStr(String(v));
          }}
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
        <div className="flex justify-between mt-1.5">
          <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}>$50</span>
          <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}>$1,000</span>
        </div>
      </div>

      <div
        className="rounded-xl p-4 text-xs leading-relaxed"
        style={{
          background: "rgba(224,32,64,0.07)",
          border: "1px solid rgba(224,32,64,0.15)",
          color: "var(--hpf-pink)",
          fontFamily: "var(--app-font-sans)",
        }}
      >
        <strong style={{ color: "var(--hpf-crimson)" }}>Tip:</strong> Some services may be HSA/FSA-eligible — we'll flag
        these in your plan. Your budget is an estimate; actual costs depend on your local providers.
      </div>
    </div>
  );
}

export function StepBudget({ control }: StepBudgetProps) {
  return (
    <Controller
      control={control}
      name="budget"
      render={({ field }) => (
        <BudgetInput value={field.value} onChange={field.onChange} />
      )}
    />
  );
}
