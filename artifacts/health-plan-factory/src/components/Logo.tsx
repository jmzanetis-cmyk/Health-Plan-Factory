import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "default" | "footer" | "auth";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  const isFooter = variant === "footer";
  const isAuth = variant === "auth";

  const markSize = isAuth ? 52 : isFooter ? 36 : 42;
  const mainSize = isAuth ? "1.2rem" : isFooter ? "0.9rem" : "1.05rem";
  const subSize = isAuth ? "0.75rem" : isFooter ? "0.62rem" : "0.7rem";

  const mainColor = isFooter ? "rgba(255,255,255,0.93)" : "var(--navy)";
  const subColor = isFooter ? "rgba(212,175,100,0.9)" : "var(--hpf-amber)";
  const ringColor = isFooter ? "rgba(212,175,100,0.6)" : "#c49a2a";
  const innerColor = isFooter ? "rgba(255,255,255,0.12)" : "rgba(27,45,79,0.06)";
  const hColor = isFooter ? "rgba(255,255,255,0.95)" : "#1b2d4f";

  return (
    <Link
      to="/"
      aria-label="HealthPlanFactory home"
      style={{ display: "flex", alignItems: "center", gap: "0.78rem", textDecoration: "none" }}
      className={className}
    >
      <span
        aria-hidden="true"
        style={{ width: markSize, height: markSize, display: "inline-block", flexShrink: 0 }}
      >
        <svg
          viewBox="0 0 48 48"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <circle cx="24" cy="24" r="22" fill={innerColor} />

          <circle cx="24" cy="24" r="22" fill="none" stroke={ringColor} strokeWidth="1.5" />

          <circle cx="24" cy="24" r="16.5" fill="none" stroke={ringColor} strokeWidth="0.7" strokeDasharray="2.4 3.2" />

          <rect x="14" y="15" width="5.5" height="18" rx="1.5" fill={hColor} />
          <rect x="28.5" y="15" width="5.5" height="18" rx="1.5" fill={hColor} />
          <rect x="14" y="21.25" width="20" height="5.5" rx="1.5" fill={hColor} />

          <circle cx="24" cy="7.5" r="2" fill={ringColor} />
          <circle cx="24" cy="40.5" r="2" fill={ringColor} />
          <circle cx="7.5" cy="24" r="2" fill={ringColor} />
          <circle cx="40.5" cy="24" r="2" fill={ringColor} />
        </svg>
      </span>

      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1, gap: "0.3rem" }}>
        <span
          style={{
            fontFamily: "var(--app-font-sans)",
            fontSize: mainSize,
            fontWeight: 800,
            letterSpacing: "0.04em",
            color: mainColor,
            textTransform: "uppercase",
          }}
        >
          Health Plan
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span
            aria-hidden="true"
            style={{
              flex: 1,
              height: "1px",
              background: `linear-gradient(to right, ${ringColor}, transparent)`,
              minWidth: isAuth ? "2.2rem" : isFooter ? "1.5rem" : "1.8rem",
            }}
          />
          <span
            style={{
              fontFamily: "var(--app-font-sans)",
              fontSize: subSize,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: subColor,
            }}
          >
            Factory
          </span>
          <span
            aria-hidden="true"
            style={{
              flex: 1,
              height: "1px",
              background: `linear-gradient(to left, ${ringColor}, transparent)`,
              minWidth: isAuth ? "2.2rem" : isFooter ? "1.5rem" : "1.8rem",
            }}
          />
        </span>
      </span>
    </Link>
  );
}
