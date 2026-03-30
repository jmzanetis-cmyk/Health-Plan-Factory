import { PREFERENCES } from "@/types/onboarding";
import { ChipSelect } from "./ChipSelect";

interface StepPreferencesProps {
  value: string[];
  onChange: (val: string[]) => void;
}

export function StepPreferences({ value, onChange }: StepPreferencesProps) {
  return (
    <div>
      <ChipSelect options={PREFERENCES} selected={value} onChange={onChange} />
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
        These shape how your plan is structured — we match modalities that fit your style.
      </p>
    </div>
  );
}
