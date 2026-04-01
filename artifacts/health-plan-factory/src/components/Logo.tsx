import { Link } from "react-router-dom";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface LogoProps {
  variant?: "default" | "footer" | "auth";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  const height = variant === "auth" ? 56 : variant === "footer" ? 36 : 68;

  return (
    <Link
      to="/"
      aria-label="HealthPlanFactory home"
      style={{
        display: "inline-flex",
        alignItems: "center",
        textDecoration: "none",
      }}
      className={className}
    >
      <img
        src={`${BASE}/logo.png`}
        alt="Health Plan Factory"
        style={{
          height,
          width: "auto",
          objectFit: "contain",
        }}
      />
    </Link>
  );
}
