import { GOALS } from "@/types/onboarding";
import { ChipSelect } from "./ChipSelect";

interface StepGoalsProps {
  value: string[];
  onChange: (val: string[]) => void;
}

export function StepGoals({ value, onChange }: StepGoalsProps) {
  return (
    <div>
      <ChipSelect options={GOALS} selected={value} onChange={onChange} />
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
        Select all that apply — we'll prioritize your most important goals.
      </p>
    </div>
  );
}
