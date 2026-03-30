import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "default" | "footer" | "auth";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  const isFooter = variant === "footer";
  const isAuth = variant === "auth";

  const markSize = isAuth ? 56 : isFooter ? 38 : 44;
  const mainSize = isAuth ? "1.22rem" : isFooter ? "0.93rem" : "1.08rem";
  const subSize = isAuth ? "0.72rem" : isFooter ? "0.6rem" : "0.68rem";

  const mainColor = isFooter ? "rgba(255,255,255,0.94)" : "var(--navy)";
  const subColor = isFooter ? "rgba(212,175,100,0.9)" : "var(--hpf-amber)";
  const ringAmber = isFooter ? "rgba(212,175,100,0.7)" : "#c49a2a";
  const navyFill = isFooter ? "rgba(255,255,255,0.08)" : "var(--navy)";
  const hColor = isFooter ? "rgba(255,255,255,0.95)" : "#fafaf8";

  const cx = 24;
  const cy = 24;

  const ticks = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 360) / 24;
    const isCardinal = i % 6 === 0;
    const isSemi = i % 3 === 0 && !isCardinal;
    const rOuter = 22.8;
    const rInner = isCardinal ? 19.5 : isSemi ? 21 : 21.9;
    const rad = (angle * Math.PI) / 180;
    const x1 = cx + rOuter * Math.sin(rad);
    const y1 = cy - rOuter * Math.cos(rad);
    const x2 = cx + rInner * Math.sin(rad);
    const y2 = cy - rInner * Math.cos(rad);
    return { x1, y1, x2, y2, isCardinal, isSemi };
  });

  return (
    <Link
      to="/"
      aria-label="HealthPlanFactory home"
      style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}
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
          <circle cx={cx} cy={cy} r="23" fill="none" stroke={ringAmber} strokeWidth="0.6" strokeDasharray="1.8 2.6" />
          <circle cx={cx} cy={cy} r="23" fill="none" stroke={ringAmber} strokeWidth="1" opacity="0.3" />

          {ticks.map(({ x1, y1, x2, y2, isCardinal, isSemi }, i) => (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={ringAmber}
              strokeWidth={isCardinal ? "1.6" : isSemi ? "0.9" : "0.5"}
              strokeLinecap="round"
              opacity={isCardinal ? 1 : isSemi ? 0.8 : 0.55}
            />
          ))}

          <circle cx={cx} cy={cy} r="18.5" fill={navyFill} />

          <circle cx={cx} cy={cy} r="18.5" fill="none" stroke={ringAmber} strokeWidth="0.5" opacity="0.6" />

          <line x1={cx} y1="6.2" x2={cx} y2="10.5" stroke={ringAmber} strokeWidth="1.5" strokeLinecap="round" />
          <line x1={cx} y1="37.5" x2={cx} y2="41.8" stroke={ringAmber} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6.2" y1={cy} x2="10.5" y2={cy} stroke={ringAmber} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="37.5" y1={cy} x2="41.8" y2={cy} stroke={ringAmber} strokeWidth="1.5" strokeLinecap="round" />

          <polygon points={`${cx},5.4 ${cx - 1.1},7.2 ${cx},8.4 ${cx + 1.1},7.2`} fill={ringAmber} />
          <polygon points={`${cx},42.6 ${cx - 1.1},40.8 ${cx},39.6 ${cx + 1.1},40.8`} fill={ringAmber} />
          <polygon points={`5.4,${cy} 7.2,${cy - 1.1} 8.4,${cy} 7.2,${cy + 1.1}`} fill={ringAmber} />
          <polygon points={`42.6,${cy} 40.8,${cy - 1.1} 39.6,${cy} 40.8,${cy + 1.1}`} fill={ringAmber} />

          <rect x="15.5" y="14" width="3.2" height="20" rx="0.4" fill={hColor} />
          <rect x="29.3" y="14" width="3.2" height="20" rx="0.4" fill={hColor} />
          <rect x="15.5" y="21.4" width="17" height="5.2" rx="0.4" fill={hColor} />

          <line x1="13.8" y1="14" x2="20.2" y2="14" stroke={hColor} strokeWidth="1.1" strokeLinecap="square" />
          <line x1="13.8" y1="34" x2="20.2" y2="34" stroke={hColor} strokeWidth="1.1" strokeLinecap="square" />
          <line x1="27.8" y1="14" x2="34.2" y2="14" stroke={hColor} strokeWidth="1.1" strokeLinecap="square" />
          <line x1="27.8" y1="34" x2="34.2" y2="34" stroke={hColor} strokeWidth="1.1" strokeLinecap="square" />
        </svg>
      </span>

      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1, gap: "0.28rem" }}>
        <span
          style={{
            fontFamily: "var(--app-font-serif)",
            fontSize: mainSize,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: mainColor,
            textTransform: "uppercase",
          }}
        >
          Health Plan
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            aria-hidden="true"
            style={{
              height: "1px",
              background: `linear-gradient(to right, transparent, ${ringAmber})`,
              minWidth: isAuth ? "1.8rem" : "1.4rem",
            }}
          />
          <span
            style={{
              fontFamily: "var(--app-font-sans)",
              fontSize: subSize,
              fontWeight: 600,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: subColor,
            }}
          >
            Factory
          </span>
          <span
            aria-hidden="true"
            style={{
              height: "1px",
              background: `linear-gradient(to left, transparent, ${ringAmber})`,
              minWidth: isAuth ? "1.8rem" : "1.4rem",
            }}
          />
        </span>
      </span>
    </Link>
  );
}
