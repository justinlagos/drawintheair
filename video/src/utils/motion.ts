import { interpolate, spring, Easing } from "remotion";

// ─── Cinematic Spring Presets ──────────────────────────────────────
export const SPRING = {
  gentle: { damping: 22, stiffness: 80, mass: 0.9 },
  smooth: { damping: 28, stiffness: 60, mass: 1.1 },
  snappy: { damping: 15, stiffness: 170, mass: 0.6 },
  bouncy: { damping: 10, stiffness: 200, mass: 0.5 },
  slow: { damping: 35, stiffness: 40, mass: 1.4 },
  cinematic: { damping: 40, stiffness: 30, mass: 1.6 },
} as const;

// ─── Easing Functions ──────────────────────────────────────────────
export const EASE = {
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutQuart: (t: number) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
} as const;

// ─── Fade ──────────────────────────────────────────────────────────
export function fadeIn(frame: number, start: number, dur = 20): number {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

export function fadeOut(frame: number, start: number, dur = 15): number {
  return interpolate(frame, [start, start + dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
}

export function fadeInOut(
  frame: number,
  inStart: number,
  inDur: number,
  outStart: number,
  outDur: number
): number {
  if (frame < inStart) return 0;
  if (frame < inStart + inDur) return fadeIn(frame, inStart, inDur);
  if (frame < outStart) return 1;
  if (frame < outStart + outDur) return fadeOut(frame, outStart, outDur);
  return 0;
}

// ─── Slide ─────────────────────────────────────────────────────────
export function slideUp(frame: number, fps: number, start: number, dist = 50, config = SPRING.gentle): number {
  const p = spring({ frame: Math.max(0, frame - start), fps, config });
  return interpolate(p, [0, 1], [dist, 0]);
}

export function slideDown(frame: number, fps: number, start: number, dist = 50, config = SPRING.gentle): number {
  return -slideUp(frame, fps, start, dist, config);
}

// ─── Scale ─────────────────────────────────────────────────────────
export function scaleIn(frame: number, fps: number, start: number, config = SPRING.snappy): number {
  const p = spring({ frame: Math.max(0, frame - start), fps, config });
  return interpolate(p, [0, 1], [0.85, 1]);
}

export function scaleFromZero(frame: number, fps: number, start: number, config = SPRING.bouncy): number {
  const p = spring({ frame: Math.max(0, frame - start), fps, config });
  return interpolate(p, [0, 1], [0, 1]);
}

// ─── Letter Tracking Animation ─────────────────────────────────────
export function trackingAnim(frame: number, start: number, dur = 30): number {
  return interpolate(frame, [start, start + dur], [0.4, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

// ─── Stagger Helper ────────────────────────────────────────────────
export function stagger(index: number, gap = 6): number {
  return index * gap;
}

// ─── Parallax / Ken Burns ──────────────────────────────────────────
export function kenBurns(
  frame: number,
  start: number,
  dur: number,
  fromScale = 1,
  toScale = 1.06
): number {
  return interpolate(frame, [start, start + dur], [fromScale, toScale], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// ─── Progress (0→1) over a range ──────────────────────────────────
export function progress(frame: number, start: number, dur: number): number {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}
