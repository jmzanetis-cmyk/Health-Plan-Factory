import { Controller, type Control } from "react-hook-form";
import { EXCLUSIONS, type IntakeData } from "@/types/onboarding";
import { ChipSelect } from "./ChipSelect";

interface StepExclusionsProps {
  control: Control<IntakeData>;
}

export function StepExclusions({ control }: StepExclusionsProps) {
  return (
    <Controller
      control={control}
      name="exclusions"
      render={({ field }) => (
        <div>
          <ChipSelect options={EXCLUSIONS} selected={field.value} onChange={field.onChange} />
          <p className="mt-3 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Selected modalities will be removed from your plan. Leave blank if there are no restrictions.
          </p>
        </div>
      )}
    />
  );
}
