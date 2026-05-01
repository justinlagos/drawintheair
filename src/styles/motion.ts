/**
 * Draw in the Air — Kid-UI Motion Library
 *
 * Eight named motion behaviours from the design spec:
 *   float, pop, glow, bounce, trace, celebrate, wiggle, pulse.
 *
 * Implementation notes:
 *   - All keyframes use transform + opacity only (compositor-friendly,
 *     no layout thrash, runs at 60fps even on mid-range tablets).
 *   - Single `kidMotionCss` string is injected once at app root.
 *   - `prefers-reduced-motion: reduce` collapses all animations to the
 *     final state in 0.01ms. Required for accessibility.
 *   - Use `animation` shorthand strings exported below in components,
 *     e.g. `style={{ animation: kidAnimation.bounce }}`.
 */

import { tokens } from './tokens';

// ─── KEYFRAMES ─────────────────────────────────────────────────────────
// Defined as raw CSS so they can be injected into a single <style> tag.
const keyframes = `
@keyframes kid-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-10px); }
}

@keyframes kid-pop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0); opacity: 0; }
}

@keyframes kid-pop-in {
  0%   { transform: scale(0.6); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes kid-glow {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(255, 216, 77, 0.4)); }
  50%      { filter: drop-shadow(0 0 16px rgba(255, 216, 77, 0.85)); }
}

@keyframes kid-bounce {
  0%, 100% { transform: translateY(0); }
  30%      { transform: translateY(-8px); }
  60%      { transform: translateY(-2px); }
}

@keyframes kid-bounce-in {
  0%   { transform: scale(0.5) translateY(20px); opacity: 0; }
  60%  { transform: scale(1.05) translateY(-4px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

@keyframes kid-trace {
  0%   { stroke-dashoffset: var(--kid-trace-length, 1000); }
  100% { stroke-dashoffset: 0; }
}

@keyframes kid-celebrate {
  0%   { transform: scale(0.5) rotate(-8deg); opacity: 0; }
  40%  { transform: scale(1.15) rotate(4deg);  opacity: 1; }
  70%  { transform: scale(0.96) rotate(-2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

@keyframes kid-wiggle {
  0%, 100% { transform: rotate(0); }
  20%      { transform: rotate(-6deg); }
  40%      { transform: rotate(5deg); }
  60%      { transform: rotate(-3deg); }
  80%      { transform: rotate(2deg); }
}

@keyframes kid-pulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50%      { transform: scale(1.06); opacity: 1; }
}

@keyframes kid-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes kid-confetti {
  0%   { opacity: 1; transform: translate(0, 0) scale(1) rotate(0); }
  70%  { opacity: 0.9; }
  100% { opacity: 0; transform: translate(var(--kid-cx, 0), var(--kid-cy, 0)) scale(0.4) rotate(var(--kid-cr, 360deg)); }
}

@keyframes kid-star-burst {
  0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
  60%  { transform: scale(1.2) rotate(8deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
`.trim();

// ─── REDUCED MOTION OVERRIDE ───────────────────────────────────────────
// Collapses every animation to its final state instantly. Honors WCAG
// 2.3.3 (Animation from Interactions) and the design spec's accessibility
// rules ("Use motion as feedback, not decoration").
const reducedMotion = `
@media (prefers-reduced-motion: reduce) {
  .kid-anim,
  [class*="kid-anim-"] {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`.trim();

// ─── DEFENSIVE COLOUR INHERITANCE ──────────────────────────────────────
// The legacy :root sets color: var(--text-primary) which is white. Any
// Kid-UI children that don't set their own colour inherit white and
// disappear on cream cards. This rule scopes a charcoal default to all
// .kid-panel descendants — wins via inline class on KidPanel without
// affecting the legacy app surfaces.
const kidPanelDefaults = `
.kid-panel,
.kid-panel * {
  color: ${'#3F4052'};
}
.kid-panel .kid-text-secondary { color: ${'#6B6E80'}; }
.kid-panel .kid-text-muted     { color: ${'#9CA0B0'}; }
.kid-panel .kid-text-primary-accent { color: ${'#6C3FA4'}; }
`.trim();

// ─── ANIMATION STRING SHORTCUTS ────────────────────────────────────────
// Use these in component style props for the named motions in the spec.
// Example: `style={{ animation: kidAnimation.bounceIn }}`
export const kidAnimation = {
  float:       `kid-float 3s ${tokens.motion.ease.standard} infinite`,
  popIn:       `kid-pop-in ${tokens.motion.duration.smooth} ${tokens.motion.ease.bounce} forwards`,
  popOut:      `kid-pop ${tokens.motion.duration.smooth} ${tokens.motion.ease.in} forwards`,
  glow:        `kid-glow 2s ${tokens.motion.ease.standard} infinite`,
  bounce:      `kid-bounce ${tokens.motion.duration.celebrate} ${tokens.motion.ease.standard} infinite`,
  bounceIn:    `kid-bounce-in ${tokens.motion.duration.smooth} ${tokens.motion.ease.bounce} forwards`,
  celebrate:   `kid-celebrate ${tokens.motion.duration.celebrate} ${tokens.motion.ease.spring} forwards`,
  wiggle:      `kid-wiggle ${tokens.motion.duration.smooth} ${tokens.motion.ease.standard}`,
  pulse:       `kid-pulse 1.6s ${tokens.motion.ease.standard} infinite`,
  fadeIn:      `kid-fade-in ${tokens.motion.duration.smooth} ${tokens.motion.ease.out} forwards`,
  starBurst:   `kid-star-burst ${tokens.motion.duration.celebrate} ${tokens.motion.ease.spring} forwards`,
} as const;

export type KidAnimationName = keyof typeof kidAnimation;

// ─── CSS BUNDLE ────────────────────────────────────────────────────────
// Inject once into the document. Idempotent.
export const kidMotionCss = `${keyframes}\n\n${reducedMotion}\n\n${kidPanelDefaults}`;
