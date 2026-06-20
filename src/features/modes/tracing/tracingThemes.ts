/**
 * Tracing Themes & Tuning — the single, documented source of truth for the
 * playful tracing redesign's visual dimensions, scoring corridor, feedback
 * timing, theming, and per-device quality scaling.
 *
 * Design intent (Workstream 2 + 6):
 *   • VISUAL track width and the SCORING corridor are RELATED but NOT
 *     identical. The painted lane looks generous; the corridor is a touch
 *     wider still so a child hugging the lane edge is never punished.
 *   • Every magic number here is named and commented. Nothing that affects
 *     gameplay should live as an unexplained constant inside a render loop.
 *
 * Pure module — no canvas, no React. Safe to unit test and import anywhere.
 */

import { colors } from '../../../styles/tokens';
import type { SafeRegion } from './tracingStrokeModel';

// ─────────────────────────────────────────────────────────────────────────
// Responsive sizing primitives
// ─────────────────────────────────────────────────────────────────────────

/** vmin in pixels for the current canvas. */
export const vminOf = (width: number, height: number): number => Math.min(width, height);

/**
 * CSS-style clamp() in pixels: lower bound, preferred = `vminFraction` of
 * vmin, upper bound. Mirrors the `clamp(46px, 5.5vmin, 82px)` notation in
 * the brief so the values map 1:1 to the spec.
 */
export const clampPx = (minPx: number, vminFraction: number, maxPx: number, vmin: number): number =>
    Math.max(minPx, Math.min(maxPx, vmin * vminFraction));

// ─────────────────────────────────────────────────────────────────────────
// Track / marker / character metrics (resolved per canvas size)
// ─────────────────────────────────────────────────────────────────────────

export interface TrackMetrics {
    /** Painted lane width (outer edge to outer edge), px. */
    trackWidthPx: number;
    /** Soft outer border thickness, px. */
    trackBorderPx: number;
    /** Dashed centre guide thickness, px. */
    centreGuidePx: number;
    /** Start platform diameter, px. */
    startMarkerPx: number;
    /** Finish star/destination diameter, px. */
    finishMarkerPx: number;
    /** Guide vehicle bounding size, px. */
    vehiclePx: number;
}

/**
 * Resolve all painted dimensions for a canvas. Starting values come straight
 * from the brief; tuned via the preview harness across the six viewport
 * presets.
 */
export const getTrackMetrics = (width: number, height: number): TrackMetrics => {
    const vmin = vminOf(width, height);
    return {
        trackWidthPx: clampPx(46, 0.055, 82, vmin),
        trackBorderPx: clampPx(5, 0.0055, 9, vmin),
        centreGuidePx: clampPx(3, 0.0035, 6, vmin),
        startMarkerPx: clampPx(72, 0.078, 112, vmin),
        finishMarkerPx: clampPx(70, 0.075, 108, vmin),
        // Vehicle WIDTH (length). Larger so it reads as a guided buggy, not a dot.
        vehiclePx: clampPx(58, 0.06, 88, vmin),
    };
};

// ─────────────────────────────────────────────────────────────────────────
// Scoring & feedback tuning — DELIBERATELY separate from the visuals above.
// ─────────────────────────────────────────────────────────────────────────

export interface TracingTuning {
    /**
     * Scoring corridor half-width as a multiple of the painted lane's half
     * width. > 1 means the corridor is slightly more forgiving than the lane
     * looks, which suits large, shaky air gestures. The activity's own
     * `tolerancePx` still sets the base; this scales the visual relationship.
     */
    corridorToVisualRatio: number;
    /**
     * How far OUTSIDE the corridor (px) before we begin the "returning"
     * hint. Creates hysteresis with `reEntrySlackPx` so the vehicle doesn't
     * flicker between on/off at the boundary.
     */
    offPathSlackPx: number;
    /** Distance (px) inside which a drifting child counts as back on track. */
    reEntrySlackPx: number;
    /**
     * Minimum continuous time off-path (ms) before the gentle "Back to the
     * road" coaching appears. Brief window: 500–800ms.
     */
    offPathWarningDelayMs: number;
    /** After returning on-path, keep/clear the message for this long (ms). 800–1200. */
    messageDismissDelayMs: number;
    /** Grace window (ms) where a dropped pinch is still treated as pinching. */
    pinchGraceMs: number;
    /**
     * A child must begin a stroke within this many px of the stroke's start
     * point. Enforces correct formation start without being finicky.
     */
    startZoneRadiusPx: number;
    /** Max fraction of a single stroke that progress may advance per frame. */
    maxProgressPerFrame: number;
    /** Tracking-loss grace (ms): hand briefly out of frame keeps completed strokes. */
    trackingLossGraceMs: number;
    /** Direction-preview duration (ms) shown before a child may start. 1500–2500. */
    previewDurationMs: number;
}

/**
 * One tuning profile for the whole mode. Values chosen to match the brief's
 * recommended ranges and the existing engine's forgiving feel.
 */
export const TRACING_TUNING: TracingTuning = {
    corridorToVisualRatio: 1.15,
    offPathSlackPx: 14,
    reEntrySlackPx: 6,
    offPathWarningDelayMs: 650,
    messageDismissDelayMs: 1000,
    pinchGraceMs: 200,
    startZoneRadiusPx: 70,
    maxProgressPerFrame: 0.02,
    trackingLossGraceMs: 900,
    previewDurationMs: 2000,
};

/**
 * Scoring corridor half-width in px for an activity on a given canvas. The
 * corridor is derived from the activity's authored `tolerancePx` (scaled for
 * resolution) and widened by `corridorToVisualRatio`. Pack 1–2 get a small
 * extra allowance, matching the legacy engine's kindness to beginners.
 */
export const corridorHalfWidthPx = (
    tolerancePx: number,
    pack: number,
    width: number,
    height: number
): number => {
    const vmin = vminOf(width, height);
    // tolerancePx is authored against a ~1080p reference; scale to this vmin.
    const scaled = tolerancePx * (vmin / 1080) * 1.0;
    const beginnerBonus = pack <= 2 ? 1.15 : 1.0;
    return Math.max(tolerancePx * 0.6, scaled) * TRACING_TUNING.corridorToVisualRatio * beginnerBonus;
};

// ─────────────────────────────────────────────────────────────────────────
// Per-device quality scaling + reduced motion
// ─────────────────────────────────────────────────────────────────────────

export type PerfTier = 'low' | 'medium' | 'high';

export interface QualityProfile {
    /** Whether to run continuous animations (preview sweep, exhaust, pulses). */
    animate: boolean;
    /** Max simultaneous particles in the trail. */
    maxParticles: number;
    /** Allow soft glow / shadowBlur. */
    glow: boolean;
    /** Multiplier applied to any shadowBlur radii. */
    shadowScale: number;
    /** Draw the dashed centre guide (skipped on low tier to save fills). */
    centreGuide: boolean;
    /** Cache static layers (background + base track) to an offscreen canvas. */
    cacheStaticLayers: boolean;
}

/**
 * Resolve the quality profile from the device tier and the user's reduced
 * motion preference. Reduced motion always wins for *motion* (no sweeps,
 * minimal particles) while keeping all functional feedback intact.
 */
export const resolveQuality = (tier: PerfTier, reducedMotion: boolean): QualityProfile => {
    const base: Record<PerfTier, QualityProfile> = {
        low: {
            animate: true,
            maxParticles: 0,
            glow: false,
            shadowScale: 0,
            centreGuide: false,
            cacheStaticLayers: true,
        },
        medium: {
            animate: true,
            maxParticles: 10,
            glow: true,
            shadowScale: 0.8,
            centreGuide: true,
            cacheStaticLayers: true,
        },
        high: {
            animate: true,
            maxParticles: 22,
            glow: true,
            shadowScale: 1.0,
            centreGuide: true,
            cacheStaticLayers: true,
        },
    };
    const q = { ...base[tier] };
    if (reducedMotion) {
        q.animate = false;
        q.maxParticles = Math.min(q.maxParticles, 4);
        q.shadowScale = Math.min(q.shadowScale, 0.5);
    }
    return q;
};

// ─────────────────────────────────────────────────────────────────────────
// Themes — a small set of coherent worlds, not 52 bespoke scenes.
// ─────────────────────────────────────────────────────────────────────────

export interface BackgroundTheme {
    /** Vertical gradient stops (top → bottom). */
    skyTop: string;
    skyBottom: string;
    /** Ground band colour (lower portion of the scene). */
    ground: string;
    /** Subtle accent dotted along the horizon (flowers, signs, etc.). */
    accent: string;
}

export interface TrackTheme {
    /** Inner road surface. */
    surface: string;
    /** Soft lane edge. */
    edge: string;
    /** Dashed centre guide. */
    centreGuide: string;
    /** Completed-section fill (distinct, high-contrast). */
    completed: string;
    /** Glow colour used around the completed section / vehicle on-path. */
    glow: string;
}

export interface MarkerTheme {
    fill: string;
    ring: string;
    /** Emoji/icon used as the destination or launch glyph. */
    glyph: string;
}

export interface ParticleTheme {
    /** Particle fill colours, sampled at random. */
    colors: string[];
    /** 'sparkle' | 'petal' | 'star' | 'puff' — renderer chooses the shape. */
    style: 'sparkle' | 'petal' | 'star' | 'puff';
}

export interface CharacterTheme {
    /** Vehicle body colour. */
    body: string;
    /** Roof/cabin colour. */
    cabin: string;
    /** Accent (wheels, stars). */
    accent: string;
    /** Exhaust/trail tint. */
    trail: string;
}

export interface TracingTheme {
    id: string;
    background: BackgroundTheme;
    track: TrackTheme;
    character: CharacterTheme;
    startMarker: MarkerTheme;
    finishMarker: MarkerTheme;
    particles: ParticleTheme;
}

const MEADOW: TracingTheme = {
    id: 'meadow',
    background: { skyTop: '#DCF1FF', skyBottom: '#EAF7FF', ground: '#CFEBD3', accent: colors.coral },
    track: {
        surface: '#FFFDF6',
        edge: colors.softLavender,
        centreGuide: 'rgba(138,102,240,0.35)',
        completed: colors.meadowGreen,
        glow: 'rgba(91,206,154,0.55)',
    },
    character: { body: colors.coral, cabin: colors.aqua, accent: colors.sunshine, trail: 'rgba(255,200,61,0.5)' },
    startMarker: { fill: colors.meadowGreen, ring: '#FFFFFF', glyph: '⭐' },
    finishMarker: { fill: colors.sunshine, ring: '#FFFFFF', glyph: '🏁' },
    particles: { colors: ['#FFC83D', '#F07A5C', '#7BD9A8', '#FFFFFF'], style: 'petal' },
};

const ALPHABET: TracingTheme = {
    id: 'alphabet',
    background: { skyTop: '#E7E0FF', skyBottom: '#F4EFFF', ground: '#E0D6FF', accent: colors.deepPlum },
    track: {
        surface: '#FFFDF6',
        edge: colors.softLavender,
        centreGuide: 'rgba(138,102,240,0.40)',
        completed: colors.aqua,
        glow: 'rgba(123,182,255,0.55)',
    },
    character: { body: colors.deepPlum, cabin: '#FFFFFF', accent: colors.sunshine, trail: 'rgba(123,182,255,0.5)' },
    startMarker: { fill: colors.meadowGreen, ring: '#FFFFFF', glyph: '⭐' },
    finishMarker: { fill: colors.sunshine, ring: '#FFFFFF', glyph: '🌟' },
    particles: { colors: ['#8A66F0', '#7BB6FF', '#FFC83D', '#FFFFFF'], style: 'star' },
};

const NUMBER: TracingTheme = {
    id: 'number',
    background: { skyTop: '#DDEEFF', skyBottom: '#EAF7FF', ground: '#CFE6FF', accent: colors.aqua },
    track: {
        surface: '#FFFDF6',
        edge: colors.bubbleBlue,
        centreGuide: 'rgba(123,182,255,0.45)',
        completed: colors.warmOrange,
        glow: 'rgba(255,155,126,0.55)',
    },
    character: { body: colors.aqua, cabin: '#FFFFFF', accent: colors.sunshine, trail: 'rgba(255,200,61,0.5)' },
    startMarker: { fill: colors.meadowGreen, ring: '#FFFFFF', glyph: '⭐' },
    finishMarker: { fill: colors.sunshine, ring: '#FFFFFF', glyph: '🏆' },
    particles: { colors: ['#7BB6FF', '#FF9B7E', '#FFC83D', '#FFFFFF'], style: 'sparkle' },
};

const THEMES: Record<string, TracingTheme> = {
    meadow: MEADOW,
    alphabet: ALPHABET,
    number: NUMBER,
};

/** Look up a theme by id, falling back to Meadow if unknown. */
export const getTheme = (themeId: string): TracingTheme => THEMES[themeId] ?? MEADOW;

export const ALL_THEME_IDS = Object.keys(THEMES);

// ─────────────────────────────────────────────────────────────────────────
// Safe tracing region — the box the track lives in, clear of the HUD.
// Shared by the live HUD and the preview harness so they agree on layout
// (Responsive requirements: avoid progress bar, activity card, restart).
// ─────────────────────────────────────────────────────────────────────────

export const getSafeRegion = (width: number, height: number): SafeRegion => {
    const vmin = vminOf(width, height);
    const compact = width <= 900;
    // Top: progress bar + padding. Bottom: restart button + start hint.
    const top = clampPx(70, 0.1, 120, vmin);
    const bottom = clampPx(84, 0.12, 140, vmin);
    // Left: the activity card footprint on wide layouts; a slim inset when compact.
    const left = compact ? clampPx(56, 0.08, 96, vmin) : clampPx(150, 0.16, 300, vmin);
    // Right: adult-gate / sound control.
    const right = clampPx(64, 0.08, 110, vmin);
    return {
        x: left,
        y: top,
        width: Math.max(80, width - left - right),
        height: Math.max(80, height - top - bottom),
    };
};
