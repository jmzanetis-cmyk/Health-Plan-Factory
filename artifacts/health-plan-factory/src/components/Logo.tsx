import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "default" | "footer" | "auth";
  className?: string;
}

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Navy rounded-square base */}
      <rect width="48" height="48" rx="11" fill="#1b2d4f" />

      {/* Plan lines — three white horizontal bars (priority taper) */}
      <rect x="10" y="14" width="28" height="5" rx="2.5" fill="white" />
      <rect x="10" y="23" width="21" height="5" rx="2.5" fill="white" opacity="0.75" />
      <rect x="10" y="32" width="14" height="5" rx="2.5" fill="white" opacity="0.45" />

      {/* Amber accent — leaf sprout (wellness / growth) */}
      <circle cx="38" cy="11" r="7" fill="#b8892a" />
      <path
        d="M38 15 C38 15 36 12 36 9.5 C36 8.1 37 7 38 7 C39 7 40 8.1 40 9.5 C40 12 38 15 38 15Z"
        fill="rgba(255,255,255,0.35)"
      />
    </svg>
  );
}

function LogoWordmark({ color = "#1b2d4f", size = "default" }: { color?: string; size?: "default" | "footer" | "auth" }) {
  const headingSize = size === "auth" ? "15px" : size === "footer" ? "11px" : "13px";
  const subSize = size === "auth" ? "9.5px" : size === "footer" ? "7.5px" : "8.5px";

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", lineHeight: 1 }}>
      <span
        style={{
          fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
          fontSize: headingSize,
          fontWeight: 700,
          color,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Health Plan
      </span>
      <span
        style={{
          fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
          fontSize: subSize,
          fontWeight: 400,
          color: "#b8892a",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginTop: "2px",
        }}
      >
        Factory
      </span>
    </div>
  );
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  const iconSize = variant === "auth" ? 44 : variant === "footer" ? 30 : 36;
  const gap = variant === "footer" ? "8px" : "10px";
  // Footer renders on a dark navy background — use white wordmark for contrast
  const wordmarkColor = variant === "footer" ? "rgba(255,255,255,0.85)" : "#1b2d4f";

  return (
    <Link
      to="/"
      aria-label="HealthPlanFactory home"
      style={{ display: "inline-flex", alignItems: "center", gap, textDecoration: "none" }}
      className={className}
    >
      <LogoMark size={iconSize} />
      <LogoWordmark color={wordmarkColor} size={variant} />
    </Link>
  );
}
