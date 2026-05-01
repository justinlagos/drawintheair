/**
 * Draw in the Air – Cinematic Color System V2
 * Matched to the product's deep navy UI with cyan/teal accents
 */
export const COLORS = {
  // Backgrounds – matched to product UI
  bgDeep: "#080c18",
  bgNavy: "#0c1324",
  bgMid: "#111b30",
  bgCard: "rgba(18, 30, 55, 0.85)",
  bgCardSolid: "#121e37",

  // Primary – signature cyan from the product UI
  primary: "#00d4ff",
  primarySoft: "#00b8e6",
  primaryGlow: "rgba(0, 212, 255, 0.35)",
  primaryFaint: "rgba(0, 212, 255, 0.06)",

  // Warm – gold/amber from product buttons and highlights
  gold: "#ffb347",
  goldGlow: "rgba(255, 179, 71, 0.35)",
  amber: "#f59e0b",

  // Text
  textWhite: "#ffffff",
  textLight: "rgba(255, 255, 255, 0.92)",
  textSoft: "rgba(255, 255, 255, 0.65)",
  textMuted: "rgba(255, 255, 255, 0.4)",
  textFaint: "rgba(255, 255, 255, 0.18)",

  // Game colors from screenshots
  green: "#34d399",
  pink: "#f472b6",
  purple: "#a78bfa",
  red: "#fb7185",
  orange: "#fb923c",
  blue: "#60a5fa",

  // Gradients
  gradientHero: "radial-gradient(ellipse at 50% 40%, #111b30 0%, #080c18 70%)",
  gradientWarm: "radial-gradient(ellipse at 50% 50%, rgba(255,179,71,0.06) 0%, transparent 60%)",
  gradientCyan: "radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.08) 0%, transparent 50%)",
  gradientBottom: "linear-gradient(0deg, #080c18 0%, transparent 40%)",
  gradientTop: "linear-gradient(180deg, #080c18 0%, transparent 30%)",
  gradientVignette: "radial-gradient(ellipse at center, transparent 30%, rgba(8,12,24,0.8) 100%)",

  // Lines
  lineBright: "rgba(255,255,255,0.1)",
  lineSubtle: "rgba(255,255,255,0.04)",
} as const;

export const FONT = {
  display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", sans-serif',
  body: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Helvetica Neue", sans-serif',
  mono: '"SF Mono", "Fira Code", monospace',
} as const;
