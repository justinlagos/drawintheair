/**
 * Tracing Activities — educational content for the playful tracing redesign.
 *
 * Every activity is expressed as one or more ORDERED strokes in the
 * canonical design box (normalized 0..1, top-left origin) using a single,
 * consistent print-handwriting convention:
 *   • Vertical strokes are drawn top → bottom.
 *   • Horizontal strokes are drawn left → right.
 *   • Tall down-strokes come before crossbars / bowls (e.g. B, D, E, F, P, R).
 *   • Round letters/numbers start near the top and travel counter-clockwise,
 *     matching common US pre-K instruction (Zaner-Bloser family).
 *
 * IDs are kept identical to the legacy tracingContent.ts paths so saved
 * learner progress (keyed by id + pack in tracingProgress.ts) stays valid.
 *
 * This file contains ZERO rendering logic — only data + tiny pure helpers
 * to build polylines. Validation runs once at module load in DEV.
 */

import {
    makeStroke,
    validateActivities,
    type StrokePoint,
    type TracingActivity,
    type TracingStroke,
    type ActivityType,
} from './tracingStrokeModel';

// ─────────────────────────────────────────────────────────────────────────
// Authoring helpers (pure)
// ─────────────────────────────────────────────────────────────────────────

const P = (x: number, y: number): StrokePoint => ({ x, y });

/**
 * Sample an elliptical arc in the design box. Angles in radians, y-down
 * screen convention: a = -PI/2 is the top, 0 is right, +PI/2 is bottom,
 * PI is left. Increasing `a` sweeps clockwise; decreasing sweeps CCW.
 */
const arc = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    a0: number,
    a1: number,
    segs = 24
): StrokePoint[] => {
    const pts: StrokePoint[] = [];
    for (let i = 0; i <= segs; i++) {
        const a = a0 + (a1 - a0) * (i / segs);
        pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
    }
    return pts;
};

const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;

// Per-pack defaults pulled from the legacy content so difficulty curve and
// completion gates are unchanged by the data migration.
interface ActivityDefaults {
    type: ActivityType;
    themeId: string;
    tolerancePx: number;
    completionPercent: number;
    assistStrength: number;
}

/** Builder that wires order/start/end and applies defaults. */
const activity = (
    id: string,
    label: string,
    pack: number,
    level: number,
    defaults: ActivityDefaults,
    strokePolylines: StrokePoint[][],
    overrides: Partial<ActivityDefaults> = {}
): TracingActivity => {
    const strokes: TracingStroke[] = strokePolylines.map((poly, i) =>
        makeStroke(`${id}-s${i + 1}`, poly, i + 1)
    );
    return {
        id,
        type: defaults.type,
        label,
        pack,
        level,
        strokes,
        themeId: overrides.themeId ?? defaults.themeId,
        tolerancePx: overrides.tolerancePx ?? defaults.tolerancePx,
        completionPercent: overrides.completionPercent ?? defaults.completionPercent,
        assistStrength: overrides.assistStrength ?? defaults.assistStrength,
    };
};

// ─────────────────────────────────────────────────────────────────────────
// Pack 1 — Warm-up Lines (theme: meadow)
// ─────────────────────────────────────────────────────────────────────────

const LINE_DEF: ActivityDefaults = {
    type: 'prewriting',
    themeId: 'meadow',
    tolerancePx: 24,
    completionPercent: 0.82,
    assistStrength: 0.65,
};

// Pack 1 is intentionally a single warm-up (Vertical Line) — a quick primer
// before Shapes → Letters → Numbers.
const buildWarmupPack = (): TracingActivity[] => [
    activity('warmup-v1', 'Vertical Line', 1, 1, LINE_DEF, [
        [P(0.5, 0.05), P(0.5, 0.95)],
    ]),
];

// ─────────────────────────────────────────────────────────────────────────
// Pack 2 — Shapes (theme: meadow / garden)
// ─────────────────────────────────────────────────────────────────────────

const SHAPE_DEF: ActivityDefaults = {
    type: 'shape',
    themeId: 'meadow',
    tolerancePx: 18,
    completionPercent: 0.85,
    assistStrength: 0.55,
};

// Pack 2 — the four core shapes: Circle, Square, Triangle, Star.
const buildShapesPack = (): TracingActivity[] => {
    const star: StrokePoint[] = [];
    for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * TAU - HALF_PI;
        const r = i % 2 === 0 ? 0.48 : 0.2;
        star.push(P(0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r));
    }

    return [
        activity('shape-circle', 'Circle', 2, 1, SHAPE_DEF, [
            arc(0.5, 0.5, 0.47, 0.47, -HALF_PI, -HALF_PI - TAU, 48), // top, CCW
        ]),
        activity('shape-square', 'Square', 2, 2, SHAPE_DEF, [
            [P(0.06, 0.06), P(0.94, 0.06), P(0.94, 0.94), P(0.06, 0.94), P(0.06, 0.06)],
        ]),
        activity('shape-triangle', 'Triangle', 2, 3, SHAPE_DEF, [
            [P(0.5, 0.05), P(0.95, 0.95), P(0.05, 0.95), P(0.5, 0.05)],
        ]),
        activity('shape-star', 'Star', 2, 4, SHAPE_DEF, [star], { assistStrength: 0.5 }),
    ];
};

// ─────────────────────────────────────────────────────────────────────────
// Pack 3 — Letters A–Z (theme: alphabet). Multi-stroke, correct formation.
// ─────────────────────────────────────────────────────────────────────────

const LETTER_DEF: ActivityDefaults = {
    type: 'letter',
    themeId: 'alphabet',
    tolerancePx: 18,
    completionPercent: 0.88,
    assistStrength: 0.5,
};

/** Stroke polylines per letter, in formation order. */
const LETTER_STROKES: Record<string, StrokePoint[][]> = {
    A: [
        [P(0.12, 0.96), P(0.5, 0.05)],            // left leg, base → apex
        [P(0.5, 0.05), P(0.88, 0.96)],            // right leg, apex → base
        [P(0.27, 0.6), P(0.73, 0.6)],             // crossbar, left → right
    ],
    B: [
        [P(0.18, 0.05), P(0.18, 0.95)],                       // stem
        arc(0.18, 0.275, 0.46, 0.225, -HALF_PI, HALF_PI, 14), // top bowl (smooth)
        arc(0.18, 0.725, 0.52, 0.225, -HALF_PI, HALF_PI, 16), // bottom bowl (smooth)
    ],
    C: [arc(0.52, 0.5, 0.42, 0.46, -0.33 * Math.PI, -1.67 * Math.PI, 28)],
    D: [
        [P(0.16, 0.05), P(0.16, 0.95)],                   // stem
        arc(0.16, 0.5, 0.72, 0.45, -HALF_PI, HALF_PI, 22), // smooth bowl
    ],
    E: [
        [P(0.16, 0.05), P(0.16, 0.95)],           // stem
        [P(0.16, 0.05), P(0.82, 0.05)],           // top
        [P(0.16, 0.5), P(0.66, 0.5)],             // middle
        [P(0.16, 0.95), P(0.82, 0.95)],           // bottom
    ],
    F: [
        [P(0.18, 0.05), P(0.18, 0.95)],           // stem
        [P(0.18, 0.05), P(0.82, 0.05)],           // top
        [P(0.18, 0.5), P(0.66, 0.5)],             // middle
    ],
    G: [
        // C-body ending at lower-right so the hook connects (reads as G, not C).
        [P(0.80, 0.18), P(0.64, 0.06), P(0.42, 0.05), P(0.24, 0.14), P(0.12, 0.32),
         P(0.09, 0.5), P(0.12, 0.68), P(0.24, 0.86), P(0.44, 0.95), P(0.64, 0.93),
         P(0.80, 0.82), P(0.86, 0.64)],
        [P(0.86, 0.64), P(0.86, 0.54), P(0.56, 0.54)],   // inward hook from the C end
    ],
    H: [
        [P(0.16, 0.05), P(0.16, 0.95)],           // left stem
        [P(0.84, 0.05), P(0.84, 0.95)],           // right stem
        [P(0.16, 0.5), P(0.84, 0.5)],             // crossbar
    ],
    I: [
        [P(0.2, 0.05), P(0.8, 0.05)],             // top serif
        [P(0.5, 0.05), P(0.5, 0.95)],             // stem
        [P(0.2, 0.95), P(0.8, 0.95)],             // bottom serif
    ],
    J: [
        [P(0.7, 0.05), P(0.7, 0.78), P(0.6, 0.92), P(0.42, 0.96), P(0.24, 0.86), P(0.2, 0.72)],
    ],
    K: [
        [P(0.16, 0.05), P(0.16, 0.95)],           // stem
        [P(0.82, 0.05), P(0.16, 0.52)],           // upper diagonal in
        [P(0.32, 0.42), P(0.84, 0.95)],           // lower diagonal out
    ],
    L: [
        [P(0.2, 0.05), P(0.2, 0.95), P(0.84, 0.95)],
    ],
    M: [
        [P(0.1, 0.95), P(0.1, 0.05)],             // left stem up
        [P(0.1, 0.05), P(0.5, 0.6)],              // down to middle
        [P(0.5, 0.6), P(0.9, 0.05)],              // up to right top
        [P(0.9, 0.05), P(0.9, 0.95)],             // right stem down
    ],
    N: [
        [P(0.14, 0.95), P(0.14, 0.05)],           // left stem up
        [P(0.14, 0.05), P(0.86, 0.95)],           // diagonal
        [P(0.86, 0.95), P(0.86, 0.05)],           // right stem up
    ],
    O: [arc(0.5, 0.5, 0.44, 0.46, -HALF_PI, -HALF_PI - TAU, 40)],
    P: [
        [P(0.16, 0.05), P(0.16, 0.95)],                  // stem
        arc(0.16, 0.28, 0.5, 0.23, -HALF_PI, HALF_PI, 16), // smooth bowl
    ],
    Q: [
        arc(0.5, 0.48, 0.44, 0.46, -HALF_PI, -HALF_PI - TAU, 40), // bowl
        [P(0.6, 0.66), P(0.92, 0.98)],            // tail
    ],
    R: [
        [P(0.16, 0.05), P(0.16, 0.95)],                  // stem
        arc(0.16, 0.28, 0.5, 0.23, -HALF_PI, HALF_PI, 16), // smooth bowl
        [P(0.42, 0.5), P(0.86, 0.95)],                   // leg from bowl junction
    ],
    S: [[
        P(0.80, 0.22), P(0.70, 0.09), P(0.50, 0.06), P(0.30, 0.10), P(0.22, 0.24),
        P(0.34, 0.39), P(0.52, 0.48), P(0.70, 0.58), P(0.78, 0.74), P(0.68, 0.90),
        P(0.48, 0.94), P(0.28, 0.90), P(0.20, 0.77),
    ]],
    T: [
        [P(0.08, 0.05), P(0.92, 0.05)],           // top bar
        [P(0.5, 0.05), P(0.5, 0.95)],             // stem
    ],
    U: [
        [P(0.14, 0.05), P(0.14, 0.66), P(0.26, 0.9), P(0.5, 0.96), P(0.74, 0.9), P(0.86, 0.66), P(0.86, 0.05)],
    ],
    V: [
        [P(0.08, 0.05), P(0.5, 0.95)],            // left leg down
        [P(0.5, 0.95), P(0.92, 0.05)],            // right leg up
    ],
    W: [
        [P(0.06, 0.05), P(0.28, 0.95)],
        [P(0.28, 0.95), P(0.5, 0.4)],
        [P(0.5, 0.4), P(0.72, 0.95)],
        [P(0.72, 0.95), P(0.94, 0.05)],
    ],
    X: [
        [P(0.1, 0.05), P(0.9, 0.95)],             // top-left → bottom-right
        [P(0.9, 0.05), P(0.1, 0.95)],             // top-right → bottom-left
    ],
    Y: [
        [P(0.1, 0.05), P(0.5, 0.5)],              // left arm in
        [P(0.9, 0.05), P(0.5, 0.5)],              // right arm in
        [P(0.5, 0.5), P(0.5, 0.95)],              // stem down
    ],
    Z: [
        [P(0.1, 0.05), P(0.9, 0.05)],             // top
        [P(0.9, 0.05), P(0.1, 0.95)],             // diagonal
        [P(0.1, 0.95), P(0.9, 0.95)],             // bottom
    ],
};

const buildLettersPack = (): TracingActivity[] => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lvl = 1;
    return letters.split('').map((letter) => {
        const level = lvl++;
        return activity(`letter-${letter}`, letter, 3, level, LETTER_DEF, LETTER_STROKES[letter], {
            tolerancePx: level <= 10 ? 18 : 16,
            completionPercent: level <= 10 ? 0.88 : 0.9,
            assistStrength: level <= 10 ? 0.5 : 0.4,
        });
    });
};

// ─────────────────────────────────────────────────────────────────────────
// Pack 4 — Numbers 1–10 (theme: number)
// ─────────────────────────────────────────────────────────────────────────

const NUMBER_DEF: ActivityDefaults = {
    type: 'number',
    themeId: 'number',
    tolerancePx: 18,
    completionPercent: 0.9,
    assistStrength: 0.4,
};

const NUMBER_STROKES: Record<number, StrokePoint[][]> = {
    1: [[P(0.32, 0.22), P(0.52, 0.05)], [P(0.52, 0.05), P(0.52, 0.95)]],
    2: [[
        P(0.16, 0.26), P(0.32, 0.08), P(0.62, 0.06), P(0.82, 0.22),
        P(0.78, 0.46), P(0.16, 0.92), P(0.86, 0.92),
    ]],
    3: [[
        P(0.18, 0.2), P(0.42, 0.06), P(0.72, 0.12), P(0.74, 0.36), P(0.5, 0.5),
        P(0.78, 0.62), P(0.76, 0.86), P(0.46, 0.96), P(0.18, 0.82),
    ]],
    4: [
        [P(0.66, 0.05), P(0.1, 0.66), P(0.92, 0.66)], // diagonal + bar
        [P(0.7, 0.05), P(0.7, 0.95)],                 // stem
    ],
    5: [
        [P(0.26, 0.06), P(0.24, 0.46), P(0.56, 0.42), P(0.8, 0.62), P(0.66, 0.92), P(0.3, 0.96), P(0.14, 0.84)],
        [P(0.26, 0.06), P(0.8, 0.06)],                // top bar
    ],
    6: [[
        P(0.76, 0.14), P(0.5, 0.06), P(0.26, 0.2), P(0.18, 0.5), P(0.2, 0.74),
        P(0.42, 0.95), P(0.7, 0.92), P(0.8, 0.68), P(0.6, 0.5), P(0.28, 0.54),
    ]],
    7: [[P(0.12, 0.07), P(0.86, 0.07), P(0.44, 0.95)]],
    // Single-stroke figure-eight: top→centre (right side of upper loop),
    // full lower loop, centre→top (left side of upper loop). Reads as "8".
    8: [[
        ...arc(0.5, 0.29, 0.19, 0.21, -HALF_PI, HALF_PI, 14),            // top loop, right half (top→centre)
        ...arc(0.5, 0.72, 0.24, 0.22, -HALF_PI, -HALF_PI + TAU, 28),     // full lower loop
        ...arc(0.5, 0.29, 0.19, 0.21, HALF_PI, HALF_PI + Math.PI, 14),   // top loop, left half (centre→top)
    ]],
    9: [[
        P(0.78, 0.42), P(0.58, 0.5), P(0.3, 0.42), P(0.26, 0.24), P(0.46, 0.08),
        P(0.7, 0.12), P(0.8, 0.34), P(0.78, 0.6), P(0.6, 0.96),
    ]],
    10: [
        [P(0.16, 0.06), P(0.16, 0.94)],                                  // "1" stem
        arc(0.62, 0.5, 0.22, 0.44, -HALF_PI, -HALF_PI - TAU, 32),        // "0" oval
    ],
};

const buildNumbersPack = (): TracingActivity[] => {
    let lvl = 1;
    const out: TracingActivity[] = [];
    for (let n = 1; n <= 10; n++) {
        out.push(activity(`number-${n}`, String(n), 4, lvl++, NUMBER_DEF, NUMBER_STROKES[n]));
    }
    return out;
};

// ─────────────────────────────────────────────────────────────────────────
// Assembly + lookups
// ─────────────────────────────────────────────────────────────────────────

export const ALL_TRACING_ACTIVITIES: TracingActivity[] = [
    ...buildWarmupPack(),
    ...buildShapesPack(),
    ...buildLettersPack(),
    ...buildNumbersPack(),
];

export const getActivitiesByPack = (pack: number): TracingActivity[] =>
    ALL_TRACING_ACTIVITIES.filter((a) => a.pack === pack);

export const getActivityById = (id: string): TracingActivity | undefined =>
    ALL_TRACING_ACTIVITIES.find((a) => a.id === id);

export const PACK_INFO: Record<number, { name: string; icon: string; description: string; themeId: string }> = {
    1: { name: 'Warm-up Lines', icon: '📏', description: 'Simple lines to get started', themeId: 'meadow' },
    2: { name: 'Shapes', icon: '🔷', description: 'Circles, squares, stars, and more', themeId: 'meadow' },
    3: { name: 'Letters', icon: '🔤', description: 'A to Z', themeId: 'alphabet' },
    4: { name: 'Numbers', icon: '🔢', description: '1 to 10', themeId: 'number' },
};

/**
 * Validate the full activity set. Exposed (rather than run as a module
 * side-effect) so it stays node/test-friendly and so the engine + preview
 * harness can surface issues without coupling to Vite's `import.meta.env`.
 * Returns an empty array when all activities are well-formed.
 */
export const getActivityValidationIssues = () => validateActivities(ALL_TRACING_ACTIVITIES);
