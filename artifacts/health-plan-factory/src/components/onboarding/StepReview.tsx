import { type IntakeData, GOALS, CONDITIONS, PREFERENCES, EXCLUSIONS } from "@/types/onboarding";

interface StepReviewProps {
  data: IntakeData;
  onEdit: (step: number) => void;
}

function getLabelList(ids: string[], options: { id: string; label: string }[]): string {
  if (!ids || ids.length === 0) return "None selected";
  return ids.map((id) => options.find((o) => o.id === id)?.label ?? id).join(", ");
}

interface ReviewRowProps {
  label: string;
  value: string;
  onEdit: () => void;
}

function ReviewRow({ label, value, onEdit }: ReviewRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "0.875rem 0",
        borderBottom: "1px solid rgba(212,34,126,0.07)",
        gap: "1rem",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </p>
        <p className="text-sm" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", lineHeight: 1.4 }}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-semibold flex-shrink-0"
        style={{
          background: "none",
          border: "none",
          color: "var(--hpf-crimson)",
          cursor: "pointer",
          padding: "0.25rem 0",
          fontFamily: "var(--app-font-sans)",
        }}
      >
        Edit
      </button>
    </div>
  );
}

export function StepReview({ data, onEdit }: StepReviewProps) {
  return (
    <div>
      <ReviewRow
        label="Monthly Budget"
        value={`$${data.budget}/month`}
        onEdit={() => onEdit(0)}
      />
      <ReviewRow
        label="Health Goals"
        value={getLabelList(data.goals, GOALS)}
        onEdit={() => onEdit(1)}
      />
      <ReviewRow
        label="Conditions / Concerns"
        value={getLabelList(data.conditions, CONDITIONS)}
        onEdit={() => onEdit(2)}
      />
      <ReviewRow
        label="Preferences"
        value={getLabelList(data.preferences, PREFERENCES)}
        onEdit={() => onEdit(3)}
      />
      <ReviewRow
        label="Exclusions"
        value={data.exclusions.length === 0 ? "None" : getLabelList(data.exclusions, EXCLUSIONS)}
        onEdit={() => onEdit(4)}
      />
      <ReviewRow
        label="Location"
        value={`ZIP ${data.zipCode} · ${data.radius} mi radius${data.telehealth ? " · Telehealth included" : ""}`}
        onEdit={() => onEdit(5)}
      />

      <div
        className="mt-4 rounded-xl p-4 text-xs leading-relaxed"
        style={{
          background: "rgba(125,181,92,0.06)",
          border: "1px solid rgba(125,181,92,0.15)",
          color: "var(--hpf-pink)",
          fontFamily: "var(--app-font-sans)",
        }}
      >
        Everything looks good? Hit <strong>Generate My Plan</strong> and we'll build your personalized wellness roadmap in seconds.
      </div>
    </div>
  );
}
