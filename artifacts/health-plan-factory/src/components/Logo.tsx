import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "default" | "footer" | "auth";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  const isAuth = variant === "auth";
  const isFooter = variant === "footer";

  const width = isAuth ? 180 : isFooter ? 120 : 140;

  return (
    <Link
      to="/"
      aria-label="HealthPlanFactory home"
      style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
      className={className}
    >
      <img
        src="/logo.png"
        alt="Health Plan Factory"
        width={width}
        style={{ display: "block" }}
      />
    </Link>
  );
}
