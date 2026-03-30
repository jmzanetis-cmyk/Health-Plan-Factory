import { Controller, type Control } from "react-hook-form";
import { PREFERENCES, type IntakeData } from "@/types/onboarding";
import { ChipSelect } from "./ChipSelect";

interface StepPreferencesProps {
  control: Control<IntakeData>;
}

export function StepPreferences({ control }: StepPreferencesProps) {
  return (
    <Controller
      control={control}
      name="preferences"
      render={({ field, fieldState }) => (
        <div>
          <ChipSelect options={PREFERENCES} selected={field.value} onChange={field.onChange} />
          {fieldState.error ? (
            <p className="mt-2 text-xs" style={{ color: "var(--rose, #dc2626)", fontFamily: "var(--app-font-sans)" }}>
              {fieldState.error.message}
            </p>
          ) : (
            <p className="mt-3 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              These shape how your plan is structured — we match modalities that fit your style.
            </p>
          )}
        </div>
      )}
    />
  );
}
