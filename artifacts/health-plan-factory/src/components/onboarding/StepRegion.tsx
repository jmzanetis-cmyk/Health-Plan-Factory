import { RADIUS_OPTIONS } from "@/types/onboarding";

interface StepRegionProps {
  zipCode: string;
  radius: number;
  telehealth: boolean;
  onZipChange: (val: string) => void;
  onRadiusChange: (val: number) => void;
  onTelehealthChange: (val: boolean) => void;
  zipError?: string;
}

export function StepRegion({
  zipCode,
  radius,
  telehealth,
  onZipChange,
  onRadiusChange,
  onTelehealthChange,
  zipError,
}: StepRegionProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ZIP code */}
      <div>
        <label
          className="block text-xs font-semibold mb-1.5"
          style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.01em" }}
        >
          ZIP Code
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={zipCode}
          onChange={(e) => onZipChange(e.target.value.replace(/\D/g, ""))}
          placeholder="e.g. 90210"
          style={{
            width: "100%",
            padding: "0.8rem 1rem",
            border: zipError ? "1.5px solid var(--rose, #dc2626)" : "1.5px solid rgba(27,45,79,0.2)",
            borderRadius: 8,
            fontFamily: "var(--app-font-mono)",
            fontSize: "1rem",
            color: "var(--navy)",
            background: zipError ? "rgba(220,38,38,0.04)" : "white",
            outline: "none",
            transition: "border-color 0.15s",
          }}
        />
        {zipError && (
          <p className="mt-1 text-xs" style={{ color: "var(--rose, #dc2626)", fontFamily: "var(--app-font-sans)" }}>
            {zipError}
          </p>
        )}
      </div>

      {/* Search radius */}
      <div>
        <label
          className="block text-xs font-semibold mb-2"
          style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
        >
          Search Radius
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRadiusChange(r)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: 100,
                border: radius === r ? "1.5px solid var(--navy)" : "1.5px solid rgba(27,45,79,0.2)",
                background: radius === r ? "var(--navy)" : "white",
                color: radius === r ? "white" : "var(--text-secondary)",
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

      {/* Telehealth toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.25rem",
          borderRadius: 12,
          border: "1.5px solid rgba(27,45,79,0.1)",
          background: telehealth ? "rgba(27,45,79,0.04)" : "white",
        }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
            Include telehealth options
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Virtual consultations — often HSA-eligible
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={telehealth}
          onClick={() => onTelehealthChange(!telehealth)}
          style={{
            width: 44,
            height: 24,
            borderRadius: 100,
            border: "none",
            background: telehealth ? "var(--navy)" : "rgba(27,45,79,0.15)",
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
              left: telehealth ? "calc(100% - 18px - 3px)" : 3,
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
    </div>
  );
}
