import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "default" | "footer" | "auth";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  const isFooter = variant === "footer";
  const isAuth = variant === "auth";

  const markSize = isAuth ? 44 : isFooter ? 34 : 40;
  const mainSize = isAuth ? "1.15rem" : isFooter ? "0.92rem" : "1.06rem";
  const accentSize = isAuth ? "0.9rem" : isFooter ? "0.73rem" : "0.86rem";
  const lineWidth = isFooter ? "1.8rem" : "2.7rem";

  const mainColor = isFooter ? "rgba(255,255,255,0.9)" : "var(--navy)";
  const accentColor = isFooter ? "var(--amber-light)" : "var(--amber)";
  const lineColor = isFooter ? "rgba(212,164,76,0.7)" : "rgba(196,154,42,0.9)";

  return (
    <Link
      to="/"
      aria-label="HealthPlanFactory home"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.82rem",
        textDecoration: "none",
      }}
      className={className}
    >
      <span
        aria-hidden="true"
        style={{
          width: markSize,
          height: markSize,
          display: "inline-block",
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
          <rect x="3" y="3" width="19" height="19" rx="5.5" fill="#22365f" />
          <rect x="26" y="3" width="19" height="19" rx="5.5" fill="#d4a44c" />
          <rect x="3" y="26" width="19" height="19" rx="5.5" fill="#f3eee3" />
          <rect x="26" y="26" width="19" height="19" rx="5.5" fill="#c7ccc5" />
          <path d="M20.2 6.5 8 20.2" stroke="#fbfaf7" strokeWidth="1.8" strokeLinecap="round" opacity={0.6} />
          <path d="M30.1 28.2 18 42" stroke="#fbfaf7" strokeWidth="1.8" strokeLinecap="round" opacity={0.4} />
        </svg>
      </span>

      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span
          style={{
            fontFamily: "var(--app-font-sans)",
            fontSize: mainSize,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: mainColor,
            textTransform: "uppercase",
          }}
        >
          Health Plan
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.55rem",
            marginTop: "0.22rem",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: lineWidth,
              height: "1.5px",
              background: lineColor,
              borderRadius: 999,
            }}
          />
          <span
            style={{
              fontFamily: "var(--app-font-sans)",
              fontSize: accentSize,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: accentColor,
            }}
          >
            Factory
          </span>
          <span
            aria-hidden="true"
            style={{
              width: lineWidth,
              height: "1.5px",
              background: lineColor,
              borderRadius: 999,
            }}
          />
        </span>
      </span>
    </Link>
  );
}
