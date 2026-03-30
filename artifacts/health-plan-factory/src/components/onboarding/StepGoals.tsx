import { Controller, type Control } from "react-hook-form";
import { GOALS, type IntakeData } from "@/types/onboarding";
import { ChipSelect } from "./ChipSelect";

interface StepGoalsProps {
  control: Control<IntakeData>;
}

export function StepGoals({ control }: StepGoalsProps) {
  return (
    <Controller
      control={control}
      name="goals"
      render={({ field, fieldState }) => (
        <div>
          <ChipSelect options={GOALS} selected={field.value} onChange={field.onChange} />
          {fieldState.error ? (
            <p className="mt-2 text-xs" style={{ color: "var(--rose, #dc2626)", fontFamily: "var(--app-font-sans)" }}>
              {fieldState.error.message}
            </p>
          ) : (
            <p className="mt-3 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              Select all that apply — we'll prioritize your most important goals.
            </p>
          )}
        </div>
      )}
    />
  );
}
