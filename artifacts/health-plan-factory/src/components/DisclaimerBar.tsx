import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

export function DisclaimerBar() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [customText, setCustomText] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/settings/disclaimer`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.disclaimer) setCustomText(data.disclaimer);
      })
      .catch(() => {});
  }, []);

  if (dismissed) return null;

  const text = customText ?? t("disclaimer.defaultText");

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
        <strong className="text-white/90 font-semibold">{t("disclaimer.important")}</strong>{" "}
        {text}{" "}
        <Link to="/legal" className="text-[#e84d65] underline underline-offset-2 hover:text-[#E02040] transition-colors whitespace-nowrap">
          {t("disclaimer.fullDisclaimer")}
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
        aria-label={t("disclaimer.dismiss")}
      >
        {t("disclaimer.dismiss")}
      </button>
    </div>
  );
}
