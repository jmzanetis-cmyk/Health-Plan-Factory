import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "default" | "footer" | "auth";
  className?: string;
}

function LogoMark({ size = 40, dark = false }: { size?: number; dark?: boolean }) {
  const nodeColor = dark ? "rgba(255,255,255,0.88)" : "#1b2d4f";

  // 6 outer nodes at radius 12 from center (24,24), node radius 6
  // Each adjacent pair is tangent (distance 12 = 6+6)
  const nodes = [
    { cx: 36,   cy: 24   },
    { cx: 30,   cy: 13.6 },
    { cx: 18,   cy: 13.6 },
    { cx: 12,   cy: 24   },
    { cx: 18,   cy: 34.4 },
    { cx: 30,   cy: 34.4 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer node ring — health modalities / connected plan components */}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.cx} cy={n.cy} r="6" fill={nodeColor} />
      ))}

      {/* Central amber hub — the factory / plan engine */}
      <circle cx="24" cy="24" r="8" fill="#b8892a" />

      {/* Center cutout (same as node color) — gear eye, gives depth */}
      <circle cx="24" cy="24" r="3.5" fill={nodeColor} />
    </svg>
  );
}

function LogoWordmark({
  color = "#1b2d4f",
  size = "default",
}: {
  color?: string;
  size?: "default" | "footer" | "auth";
}) {
  const headingSize =
    size === "auth" ? "15px" : size === "footer" ? "11px" : "13px";
  const subSize =
    size === "auth" ? "9px" : size === "footer" ? "7.5px" : "8px";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
          fontSize: headingSize,
          fontWeight: 600,
          color,
          letterSpacing: "0.12em",
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
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginTop: "3px",
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
  const wordmarkColor =
    variant === "footer" ? "rgba(255,255,255,0.85)" : "#1b2d4f";
  const dark = variant === "footer";

  return (
    <Link
      to="/"
      aria-label="HealthPlanFactory home"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        textDecoration: "none",
      }}
      className={className}
    >
      <LogoMark size={iconSize} dark={dark} />
      <LogoWordmark color={wordmarkColor} size={variant} />
    </Link>
  );
}
