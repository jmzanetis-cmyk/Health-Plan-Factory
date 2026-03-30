import { EXCLUSIONS } from "@/types/onboarding";
import { ChipSelect } from "./ChipSelect";

interface StepExclusionsProps {
  value: string[];
  onChange: (val: string[]) => void;
}

export function StepExclusions({ value, onChange }: StepExclusionsProps) {
  return (
    <div>
      <ChipSelect options={EXCLUSIONS} selected={value} onChange={onChange} />
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
        Selected modalities will be removed from your plan. Leave blank if there are no restrictions.
      </p>
    </div>
  );
}
