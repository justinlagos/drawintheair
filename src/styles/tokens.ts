/**
 * Draw in the Air, Kid-UI Design Tokens
 *
 * Single source of truth for the bright-sky design system.
 * Consumers can either:
 *   1. Import the `tokens` object and use values inline
 *      e.g. `style={{ color: tokens.colors.deepPlum }}`
 *   2. Reference CSS custom properties (injected into :root by `kidTokensCss`)
 *      e.g. `style={{ color: 'var(--kid-color-deep-plum)' }}`
 *
 * Both surfaces stay in sync because tokens are the single declaration site.
 *
 * Spec reference: /docs/design-system (Bright sky / 2.5D / kid-friendly).
 */

// ─── PALETTE ───────────────────────────────────────────────────────────
// Core palette per spec. Names are camelCase in TS, kebab-case in CSS vars.
// Draw in the Air 2.0 palette — cream warmth, lavender primary, mint/sky
// accents, warm sun rewards, peach for emotional moments. Keys are
// unchanged so every consumer keeps working; only the values shifted.
export const colors = {
  // Backgrounds
  skyBlue: '#EAF7FF',         // soft panels, sky scenes, calm spaces
  meadowGreen: '#5BCE9A',     // hills, success surfaces, nature elements
  limeGlow: '#7BD9A8',        // highlights, active states, friendly energy

  // Primary accents
  deepPlum: '#8A66F0',        // headings, primary buttons, key accents (lavender)
  sunshine: '#FFC83D',        // rewards, stars, achievement, warm highlights
  coral: '#F07A5C',           // playful alerts, wrong answers, balloons (peach)
  aqua: '#7BB6FF',            // progress, tracing paths, timers (sky)

  // Neutrals
  cloudWhite: '#FFFFFF',      // cards, panels, task surfaces
  charcoal: '#1F1B2E',        // primary text, readable labels (warm ink)

  // Support
  softLavender: '#E5DBFF',    // secondary cards, gentle accents
  bubbleBlue: '#B8DBFF',      // decorative objects
  warmOrange: '#FF9B7E',      // coins, warm secondary actions (peach)
  softGrey: '#C5C0D1',        // disabled states, inactive outlines
} as const;

// ─── SEMANTIC ALIASES ──────────────────────────────────────────────────
// What the colors *mean* in UI terms. Use these in components when possible
// so a palette change is one-line, not a global find-replace.
export const semantic = {
  bgScene: colors.skyBlue,
  bgPanel: colors.cloudWhite,
  bgPanelTinted: '#F4EFFF',     // very soft lavender tint for cards
  borderPanel: 'rgba(31, 27, 46, 0.10)', // warm ink at 10% opacity

  textPrimary: colors.charcoal,
  textSecondary: '#6B6580',
  textMuted: '#908AA3',
  textOnDark: colors.cloudWhite,
  textOnPlum: colors.cloudWhite,

  primary: colors.deepPlum,
  primaryHover: '#9D7DFF',
  primaryActive: '#5C3FB0',

  success: colors.meadowGreen,
  successHover: '#7BD9A8',

  warning: colors.warmOrange,
  danger: colors.coral,
  reward: colors.sunshine,
  progress: colors.aqua,

  disabled: colors.softGrey,
} as const;

// ─── TYPOGRAPHY ────────────────────────────────────────────────────────
// 2.0 type: Outfit for display/headings, Nunito for body. Old families kept
// as fallbacks so nothing breaks if a 2.0 webfont is briefly unavailable.
export const fontFamily = {
  display: "'Outfit', 'Fredoka', system-ui, -apple-system, sans-serif",
  heading: "'Outfit', 'Fredoka', system-ui, -apple-system, sans-serif",
  body: "'Nunito', 'Quicksand', system-ui, -apple-system, sans-serif",
  caption: "'Nunito', 'Quicksand', system-ui, -apple-system, sans-serif",
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

// Type scale uses clamp() for responsive sizing, matches the per-screen
// ranges in the design spec (display 56-72, heading 32-44, etc.).
export const fontSize = {
  display: 'clamp(2.75rem, 6vw, 4.5rem)',     // 44–72px
  heading: 'clamp(1.75rem, 4vw, 2.75rem)',    // 28–44px
  objective: 'clamp(1.25rem, 2.5vw, 2rem)',   // 20–32px
  button: 'clamp(1.05rem, 1.6vw, 1.5rem)',    // 17–24px (target spec: 20-28)
  label: 'clamp(0.95rem, 1.2vw, 1.15rem)',    // 15–18px
  body: 'clamp(0.95rem, 1.1vw, 1.05rem)',     // 15–17px
  caption: 'clamp(0.75rem, 0.9vw, 0.9rem)',   // 12–14px
} as const;

export const lineHeight = {
  tight: 1.1,
  normal: 1.3,
  relaxed: 1.5,
} as const;

export const letterSpacing = {
  tight: '-0.5px',
  normal: '0',
  wide: '0.3px',
} as const;

// ─── SPACING ───────────────────────────────────────────────────────────
// 4px base unit. Use these for padding, gap, margin throughout components.
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  xxxl: '48px',
  xxxxl: '64px',
} as const;

// ─── RADII ─────────────────────────────────────────────────────────────
// Spec: cards 24-36px, pills full-radius. Soft and tactile.
export const radius = {
  sm: '8px',
  md: '14px',
  lg: '20px',          // chips
  xl: '28px',          // small cards
  xxl: '36px',         // panels, large cards
  pill: '9999px',      // buttons, score chips
} as const;

// ─── SHADOWS ───────────────────────────────────────────────────────────
// Soft 2.5D depth. No hard edges. Layered for tactile feel.
// Drop shadows tinted with deep plum at low opacity for warmth.
// 2.0 shadows: warm, ambient, tinted with the warm-ink colour (64,50,90)
// instead of plum. Primary buttons carry a soft lavender glow.
export const shadow = {
  // Resting state of cards
  panel: '0 6px 16px rgba(64, 50, 90, 0.08), 0 2px 4px rgba(64, 50, 90, 0.05)',
  // Buttons / interactive
  button: '0 12px 28px rgba(138, 102, 240, 0.22), 0 2px 4px rgba(64, 50, 90, 0.10)',
  buttonPressed: '0 2px 4px rgba(64, 50, 90, 0.14)',
  // Floating elements (chips, badges)
  float: '0 4px 16px rgba(64, 50, 90, 0.12), 0 1px 2px rgba(64, 50, 90, 0.08)',
  // Reward highlights, sunshine glow
  glow: '0 0 24px rgba(255, 200, 61, 0.45), 0 4px 12px rgba(64, 50, 90, 0.10)',
  // Modal lift
  modal: '0 24px 60px rgba(64, 50, 90, 0.20), 0 8px 24px rgba(64, 50, 90, 0.12)',
  // Inner highlight for pillowy buttons
  inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.70)',
} as const;

// ─── MOTION ────────────────────────────────────────────────────────────
// Timing matches the kid-bright feel: slightly springy, never aggressive.
export const motion = {
  duration: {
    instant: '120ms',
    quick: '220ms',
    smooth: '320ms',
    slow: '500ms',
    celebrate: '900ms',
  },
  ease: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    out: 'cubic-bezier(0.0, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    // Slight overshoot, playful pop without being distracting
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    // Stronger overshoot for celebration & badges
    spring: 'cubic-bezier(0.5, 1.8, 0.6, 1)',
  },
} as const;

// ─── Z-INDEX LAYERS ────────────────────────────────────────────────────
// NOTE: TrackingLayer's gameplay canvas sits at zIndex 100. HUD elements
// must therefore live ABOVE 100 to remain visible, empirically learned
// during the Batch 3A migration when HUDs went invisible behind balloons.
export const zIndex = {
  base: 0,
  scene: 1,         // HTML/SVG decorative backgrounds
  game: 10,         // (reserved for in-canvas concepts; canvas itself = 100)
  hud: 200,         // HUD chips, panels, must be above the canvas
  floatingFx: 250,  // confetti, +1 floats, drop feedback
  modal: 1000,
  celebration: 10000,
  toast: 11000,
} as const;

// ─── KID-FRIENDLY TARGET SIZES ────────────────────────────────────────
// Touch/gesture target minimums. Larger than WCAG 2.5.5 (44px) because
// 3-7 year olds with hand tracking need more grace than a finger tap.
export const targetSize = {
  min: '64px',     // smallest gesture target
  comfortable: '88px',
  generous: '120px',
} as const;

// ─── EXPORT ────────────────────────────────────────────────────────────
export const tokens = {
  colors,
  semantic,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  spacing,
  radius,
  shadow,
  motion,
  zIndex,
  targetSize,
} as const;

export type Tokens = typeof tokens;

// ─── CSS CUSTOM PROPERTY EXPORT ────────────────────────────────────────
// Inject this once at app root (or in index.css) to make tokens available
// as CSS variables. Use the `--kid-*` prefix to avoid colliding with the
// existing `--world-*` and `--color-*` vars from the legacy night theme.
export const kidTokensCss = `
:root {
  /* Palette */
  --kid-color-sky-blue: ${colors.skyBlue};
  --kid-color-meadow-green: ${colors.meadowGreen};
  --kid-color-lime-glow: ${colors.limeGlow};
  --kid-color-deep-plum: ${colors.deepPlum};
  --kid-color-sunshine: ${colors.sunshine};
  --kid-color-coral: ${colors.coral};
  --kid-color-aqua: ${colors.aqua};
  --kid-color-cloud-white: ${colors.cloudWhite};
  --kid-color-charcoal: ${colors.charcoal};
  --kid-color-soft-lavender: ${colors.softLavender};
  --kid-color-bubble-blue: ${colors.bubbleBlue};
  --kid-color-warm-orange: ${colors.warmOrange};
  --kid-color-soft-grey: ${colors.softGrey};

  /* Semantic */
  --kid-bg-scene: ${semantic.bgScene};
  --kid-bg-panel: ${semantic.bgPanel};
  --kid-bg-panel-tinted: ${semantic.bgPanelTinted};
  --kid-border-panel: ${semantic.borderPanel};
  --kid-text-primary: ${semantic.textPrimary};
  --kid-text-secondary: ${semantic.textSecondary};
  --kid-text-muted: ${semantic.textMuted};
  --kid-text-on-dark: ${semantic.textOnDark};
  --kid-primary: ${semantic.primary};
  --kid-primary-hover: ${semantic.primaryHover};
  --kid-primary-active: ${semantic.primaryActive};
  --kid-success: ${semantic.success};
  --kid-success-hover: ${semantic.successHover};
  --kid-warning: ${semantic.warning};
  --kid-danger: ${semantic.danger};
  --kid-reward: ${semantic.reward};
  --kid-progress: ${semantic.progress};
  --kid-disabled: ${semantic.disabled};

  /* Typography */
  --kid-font-display: ${fontFamily.display};
  --kid-font-heading: ${fontFamily.heading};
  --kid-font-body: ${fontFamily.body};
  --kid-font-caption: ${fontFamily.caption};

  --kid-fz-display: ${fontSize.display};
  --kid-fz-heading: ${fontSize.heading};
  --kid-fz-objective: ${fontSize.objective};
  --kid-fz-button: ${fontSize.button};
  --kid-fz-label: ${fontSize.label};
  --kid-fz-body: ${fontSize.body};
  --kid-fz-caption: ${fontSize.caption};

  /* Spacing */
  --kid-space-xs: ${spacing.xs};
  --kid-space-sm: ${spacing.sm};
  --kid-space-md: ${spacing.md};
  --kid-space-lg: ${spacing.lg};
  --kid-space-xl: ${spacing.xl};
  --kid-space-xxl: ${spacing.xxl};

  /* Radii */
  --kid-radius-sm: ${radius.sm};
  --kid-radius-md: ${radius.md};
  --kid-radius-lg: ${radius.lg};
  --kid-radius-xl: ${radius.xl};
  --kid-radius-xxl: ${radius.xxl};
  --kid-radius-pill: ${radius.pill};

  /* Shadows */
  --kid-shadow-panel: ${shadow.panel};
  --kid-shadow-button: ${shadow.button};
  --kid-shadow-button-pressed: ${shadow.buttonPressed};
  --kid-shadow-float: ${shadow.float};
  --kid-shadow-glow: ${shadow.glow};
  --kid-shadow-modal: ${shadow.modal};
  --kid-shadow-inset: ${shadow.inset};

  /* Motion */
  --kid-ease-standard: ${motion.ease.standard};
  --kid-ease-out: ${motion.ease.out};
  --kid-ease-bounce: ${motion.ease.bounce};
  --kid-ease-spring: ${motion.ease.spring};
  --kid-dur-quick: ${motion.duration.quick};
  --kid-dur-smooth: ${motion.duration.smooth};
  --kid-dur-slow: ${motion.duration.slow};
}
`.trim();
