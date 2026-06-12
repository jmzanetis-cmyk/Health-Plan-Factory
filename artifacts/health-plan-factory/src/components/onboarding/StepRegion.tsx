import { Controller, type Control } from "react-hook-form";
import { RADIUS_OPTIONS, type IntakeData } from "@/types/onboarding";

interface StepRegionProps {
  control: Control<IntakeData>;
}

export function StepRegion({ control }: StepRegionProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ZIP code */}
      <Controller
        control={control}
        name="zipCode"
        render={({ field, fieldState }) => (
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.01em" }}
            >
              ZIP Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
              onBlur={field.onBlur}
              placeholder="e.g. 90210"
              style={{
                width: "100%",
                padding: "0.8rem 1rem",
                border: fieldState.error
                  ? "1.5px solid var(--rose, #dc2626)"
                  : "1.5px solid rgba(212,34,126,0.2)",
                borderRadius: 8,
                fontFamily: "var(--app-font-mono)",
                fontSize: "1rem",
                color: "var(--hpf-pink)",
                background: fieldState.error ? "rgba(220,38,38,0.04)" : "white",
                outline: "none",
                transition: "border-color 0.15s",
              }}
            />
            {fieldState.error && (
              <p className="mt-1 text-xs" style={{ color: "var(--rose, #dc2626)", fontFamily: "var(--app-font-sans)" }}>
                {fieldState.error.message}
              </p>
            )}
          </div>
        )}
      />

      {/* Search radius */}
      <Controller
        control={control}
        name="radius"
        render={({ field }) => (
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              Search Radius
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => field.onChange(r)}
                  style={{
                    padding: "0.4rem 0.75rem",
                    borderRadius: 100,
                    border: field.value === r
                      ? "1.5px solid var(--hpf-pink)"
                      : "1.5px solid rgba(212,34,126,0.2)",
                    background: field.value === r ? "var(--hpf-pink)" : "white",
                    color: field.value === r ? "white" : "var(--text-secondary)",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "var(--app-font-sans)",
                    transition: "all 0.15s",
                  }}
                >
                  {r} mi
                </button>
              ))}
            </div>
          </div>
        )}
      />

      {/* Telehealth toggle */}
      <Controller
        control={control}
        name="telehealth"
        render={({ field }) => (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.25rem",
              borderRadius: 12,
              border: "1.5px solid rgba(212,34,126,0.1)",
              background: field.value ? "rgba(212,34,126,0.04)" : "white",
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                Include telehealth options
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                Virtual consultations — often HSA-qualifying
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 100,
                border: "none",
                background: field.value ? "var(--hpf-pink)" : "rgba(212,34,126,0.15)",
                cursor: "pointer",
                position: "relative",
                flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: field.value ? "calc(100% - 18px - 3px)" : 3,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "white",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                }}
              />
            </button>
          </div>
        )}
      />
    </div>
  );
}
