import i18n from "@/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

async function persistLanguageToServer(lang: "en" | "es") {
  try {
    await fetch(`${BASE}/api/profile/language`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ language: lang }),
    });
  } catch {
    // Non-blocking — language is always stored in localStorage regardless
  }
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const currentLang = i18n.language?.startsWith("es") ? "es" : "en";

  const toggle = (lang: "en" | "es") => {
    i18n.changeLanguage(lang);
    persistLanguageToServer(lang);
  };

  return (
    <div
      className={`flex items-center gap-0.5 rounded-md overflow-hidden ${className}`}
      style={{
        border: "1px solid rgba(212,34,126,0.2)",
        fontFamily: "var(--app-font-sans)",
      }}
    >
      {(["en", "es"] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => toggle(lang)}
          className="px-2.5 py-1 text-xs font-semibold uppercase transition-colors cursor-pointer"
          style={{
            background: currentLang === lang ? "var(--hpf-pink)" : "transparent",
            color: currentLang === lang ? "white" : "var(--text-muted)",
            border: "none",
            letterSpacing: "0.04em",
          }}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
