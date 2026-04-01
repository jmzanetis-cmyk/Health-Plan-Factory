import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const DEFAULT_TEXT =
  "HealthPlanFactory is a wellness optimization platform — not a medical provider, diagnostic tool, or substitute for professional medical care. This is not medical advice. For emergencies call 911. For mental health crisis call 988.";

export function DisclaimerBar() {
  const [dismissed, setDismissed] = useState(false);
  const [text, setText] = useState(DEFAULT_TEXT);

  useEffect(() => {
    fetch(`${BASE}/api/settings/disclaimer`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.disclaimer) setText(data.disclaimer);
      })
      .catch(() => {});
  }, []);

  if (dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-6 py-2.5 text-xs leading-relaxed"
      style={{
        background: "rgba(212,34,126,0.97)",
        backdropFilter: "blur(8px)",
        borderTop: "2px solid rgba(224,32,64,0.4)",
        color: "rgba(255,255,255,0.65)",
      }}
    >
      <p className="flex-1">
        <strong className="text-white/90 font-semibold">Important:</strong>{" "}
        {text}{" "}
        <Link to="/legal" className="text-[#e84d65] underline underline-offset-2 hover:text-[#E02040] transition-colors whitespace-nowrap">
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
