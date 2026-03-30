import { Link } from "wouter";

interface LogoProps {
  variant?: "default" | "footer" | "auth";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  const sizes = {
    default: { text: "text-xl", gear: "text-base" },
    footer: { text: "text-lg", gear: "text-sm" },
    auth: { text: "text-2xl", gear: "text-lg" },
  };

  const s = sizes[variant];
  const isFooter = variant === "footer";

  const nameColor = isFooter ? "text-white/85" : "text-[#1b2d4f]";
  const factoryColor = "text-[#b8892a] italic";

  return (
    <Link href="/" className={`flex items-center gap-1.5 no-underline ${className}`} aria-label="HealthPlanFactory home">
      <span
        className={`font-serif font-bold tracking-tight leading-none ${s.text} ${nameColor}`}
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        HealthPlan
        <span className={factoryColor}>Factory</span>
      </span>
      <span className={`${s.gear} animate-spin-slow inline-block`} aria-hidden="true" style={{ animationDuration: "8s" }}>
        <GearIcon />
      </span>
    </Link>
  );
}

function GearIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#b8892a" }}>
      <path d="M10.3 2h3.4l.5 2.1c.5.2 1 .4 1.5.6l2-1.1 2.4 2.4-1.1 2c.2.5.4 1 .6 1.5L22 10.3v3.4l-2.1.5c-.2.5-.4 1-.6 1.5l1.1 2-2.4 2.4-2-1.1c-.5.2-1 .4-1.5.6l-.5 2.1h-3.4l-.5-2.1c-.5-.2-1-.4-1.5-.6l-2 1.1-2.4-2.4 1.1-2c-.2-.5-.4-1-.6-1.5L2 13.7v-3.4l2.1-.5c.2-.5.4-1 .6-1.5l-1.1-2 2.4-2.4 2 1.1c.5-.2 1-.4 1.5-.6L10.3 2Zm1.7 6.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z" />
    </svg>
  );
}
