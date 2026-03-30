import { Controller, type Control } from "react-hook-form";
import { CONDITIONS, type IntakeData } from "@/types/onboarding";
import { ChipSelect } from "./ChipSelect";

interface StepConditionsProps {
  control: Control<IntakeData>;
}

export function StepConditions({ control }: StepConditionsProps) {
  return (
    <Controller
      control={control}
      name="conditions"
      render={({ field }) => (
        <div>
          <ChipSelect
            options={CONDITIONS}
            selected={field.value}
            onChange={field.onChange}
            singleExclusive="none"
          />
          <div
            className="mt-4 rounded-xl p-3 text-xs leading-relaxed"
            style={{
              background: "rgba(27,45,79,0.04)",
              border: "1px solid rgba(27,45,79,0.08)",
              color: "var(--text-secondary)",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            <strong style={{ color: "var(--navy)" }}>Not medical advice.</strong>{" "}
            This helps us match wellness approaches — it does not replace a diagnosis or treatment plan from a healthcare provider.
          </div>
        </div>
      )}
    />
  );
}
