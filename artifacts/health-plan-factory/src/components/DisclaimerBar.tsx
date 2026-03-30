import { useState } from "react";
import { Link } from "wouter";

export function DisclaimerBar() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-6 py-2.5 text-xs leading-relaxed"
      style={{
        background: "rgba(27,45,79,0.97)",
        backdropFilter: "blur(8px)",
        borderTop: "2px solid rgba(184,137,42,0.4)",
        color: "rgba(255,255,255,0.65)",
      }}
    >
      <p className="flex-1">
        <strong className="text-white/90 font-semibold">Important:</strong>{" "}
        HealthPlanFactory is a wellness optimization platform — not a medical provider, diagnostic tool, or substitute for professional medical care.
        This is not medical advice. For emergencies call{" "}
        <strong className="text-white/90">911</strong>. For mental health crisis call{" "}
        <strong className="text-white/90">988</strong>.{" "}
        <Link href="/legal" className="text-[#d4a44c] underline underline-offset-2 hover:text-[#b8892a] transition-colors whitespace-nowrap">
          Full disclaimer ↓
        </Link>
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 px-2.5 py-1 text-xs border rounded transition-colors cursor-pointer"
        style={{
          background: "none",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "rgba(255,255,255,0.5)",
          fontFamily: "var(--app-font-sans)",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.color = "white";
          (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.5)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
          (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
        }}
        aria-label="Dismiss disclaimer"
      >
        Dismiss
      </button>
    </div>
  );
}
