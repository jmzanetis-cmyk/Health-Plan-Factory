export const COLORS = {
  // ── New brand palette ──────────────────────────────────────
  pink: "#D4227E",
  pinkMid: "#b81c6a",
  pinkLt: "#e04d95",
  pink10: "rgba(212,34,126,0.08)",
  pink20: "rgba(212,34,126,0.15)",
  crimson: "#E02040",
  crimsonLight: "#e84d65",
  crimsonPale: "#fdf0f2",
  crimson10: "rgba(224,32,64,0.12)",
  sage: "#7DB55C",
  sagePale: "#eaf2ec",
  rose: "#dc2626",
  rosePale: "#fef2f2",
  sky: "#3b82f6",
  skyPale: "#eff6ff",
  purple: "#7c3aed",
  purplePale: "#f5f3ff",
  warm: "#fafaf8",
  off: "#f4f2ee",
  parch: "#edeae3",
  white: "#ffffff",
  text: "#1A1A1A",
  textMuted: "#6b7280",
  textLight: "#9ca3af",
  border: "rgba(212,34,126,0.15)",
  shadow: "rgba(212,34,126,0.12)",

  // ── Semantic aliases ───────────────────────────────────────
  primary: "#D4227E",
  accent: "#E02040",
  success: "#7DB55C",

  // ── Backward-compatible aliases (legacy keys) ──────────────
  navy: "#D4227E",
  navyMid: "#b81c6a",
  navyLt: "#e04d95",
  navy10: "rgba(212,34,126,0.08)",
  navy20: "rgba(212,34,126,0.15)",
  amber: "#E02040",
  amberLight: "#e84d65",
  amberPale: "#fdf0f2",
  amber10: "rgba(224,32,64,0.12)",
} as const;

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FONTS = {
  heading: "CormorantGaramond_600SemiBold",
  headingLight: "CormorantGaramond_400Regular",
  body: "Outfit_400Regular",
  bodyMedium: "Outfit_500Medium",
  bodySemiBold: "Outfit_600SemiBold",
  mono: "DMMono_400Regular",
  monoMedium: "DMMono_500Medium",
} as const;
