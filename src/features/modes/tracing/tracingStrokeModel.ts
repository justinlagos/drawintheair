/**
 * Tracing Stroke Model — reusable, render-agnostic data model for the
 * playful tracing redesign (feature flag: tracingPlayfulUiV1).
 *
 * WHY THIS EXISTS
 * The legacy content model (tracingContent.ts) encodes every activity —
 * including multi-stroke letters like A, E, K — as a SINGLE continuous
 * polyline with invisible "pen-up" jumps baked in. That makes correct
 * letter formation impossible to teach: there is no notion of stroke
 * order, per-stroke start zones, or "finish this stroke before the next".
 *
 * This module introduces an explicit, ordered, multi-stroke model and the
 * pure geometry + validation helpers that the engine, renderer, direction
 * preview and dev preview-harness all share. It contains NO rendering and
 * NO React — educational/path data stays separate from pixels on purpose.
 *
 * Coordinate convention
 * ---------------------
 * Strokes are authored in a canonical "design box": normalized [0,1] on
 * both axes, where (0,0) is top-left and (1,1) is bottom-right of the box.
 * The design box is mapped onto the on-screen safe region at runtime by
 * `layoutActivity()` — this keeps the educational data resolution- and
 * HUD-independent (Workstream 2 + responsive requirements).
 */

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

/** A point in the canonical design box (normalized 0..1, top-left origin). */
export interface StrokePoint {
    x: number;
    y: number;
}

/**
 * Stroke traversal direction. Today every stroke is authored so that
 * `points[0]` is the pedagogically-correct starting end, hence 'forward'.
 * Kept as a field (not implied) so the validator and future reversed
 * strokes have an explicit contract.
 */
export type StrokeDirection = 'forward';

export interface TracingStroke {
    /** Unique within its activity, e.g. "A-s1". */
    id: string;
    /** Ordered polyline, length >= 2. points[0] is the start end. */
    points: StrokePoint[];
    /** Convenience mirror of points[0]. Validated to match. */
    startPoint: StrokePoint;
    /** Convenience mirror of points[points.length-1]. Validated to match. */
    endPoint: StrokePoint;
    /** 1-based position in the formation sequence. */
    order: number;
    direction: StrokeDirection;
    /** Optional per-stroke tolerance override (px); falls back to activity. */
    tolerance?: number;
    /** Optional per-stroke completion threshold (0..1); falls back to activity. */
    completionThreshold?: number;
}

export type ActivityType = 'prewriting' | 'shape' | 'letter' | 'number';

export interface TracingActivity {
    /** Stable id — MUST match the legacy path id so saved learner progress
     *  (keyed by id in tracingProgress.ts) stays valid. */
    id: string;
    type: ActivityType;
    /** Human/child-facing label, e.g. "A", "5", "Circle". */
    label: string;
    pack: number;
    level: number;
    strokes: TracingStroke[];
    /** Theme key (see tracingThemes.ts), e.g. "meadow" | "alphabet" | "number". */
    themeId: string;
    /** Default scoring corridor half-width in px (at a 1080p reference). */
    tolerancePx: number;
    /** Default per-stroke completion threshold (0..1). */
    completionPercent: number;
    /** Visual/assist attraction strength (0..1) — consumed by the engine. */
    assistStrength: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Stroke construction
// ─────────────────────────────────────────────────────────────────────────

export interface StrokeOptions {
    tolerance?: number;
    completionThreshold?: number;
    direction?: StrokeDirection;
}

/**
 * Build a fully-formed TracingStroke from a raw ordered polyline. Fills in
 * startPoint/endPoint so call sites can't drift them out of sync.
 */
export const makeStroke = (
    id: string,
    points: StrokePoint[],
    order: number,
    opts: StrokeOptions = {}
): TracingStroke => {
    if (points.length < 2) {
        // Degenerate strokes are caught by validateActivity, but guard here
        // so startPoint/endPoint never read `undefined`.
        const only = points[0] ?? { x: 0.5, y: 0.5 };
        return {
            id,
            points: [only, only],
            startPoint: only,
            endPoint: only,
            order,
            direction: opts.direction ?? 'forward',
            tolerance: opts.tolerance,
            completionThreshold: opts.completionThreshold,
        };
    }
    return {
        id,
        points,
        startPoint: points[0],
        endPoint: points[points.length - 1],
        order,
        direction: opts.direction ?? 'forward',
        tolerance: opts.tolerance,
        completionThreshold: opts.completionThreshold,
    };
};

// ─────────────────────────────────────────────────────────────────────────
// Geometry helpers (pure). All operate in screen pixels unless noted.
// ─────────────────────────────────────────────────────────────────────────

/** Length of a normalized polyline measured in pixels for a given canvas. */
export const polylineLengthPx = (
    points: StrokePoint[],
    width: number,
    height: number
): number => {
    let len = 0;
    for (let i = 0; i < points.length - 1; i++) {
        len += Math.hypot(
            (points[i + 1].x - points[i].x) * width,
            (points[i + 1].y - points[i].y) * height
        );
    }
    return len;
};

export interface NearestResult {
    /** Nearest point on the polyline, in normalized coords. */
    nearest: StrokePoint;
    /** Parameter 0..1 along the WHOLE polyline (arc-length weighted). */
    overallT: number;
    /** Distance from the query point to the polyline, in pixels. */
    distancePx: number;
    /** Index of the segment the nearest point lies on. */
    segmentIndex: number;
}

/**
 * Project a normalized point onto a normalized polyline. Distances are
 * computed in pixels (so tolerance comparisons are resolution-correct).
 * This is the scoring primitive shared by the engine and the harness.
 */
export const nearestOnPolyline = (
    point: StrokePoint,
    points: StrokePoint[],
    width: number,
    height: number
): NearestResult => {
    if (points.length === 0) {
        return { nearest: { x: point.x, y: point.y }, overallT: 0, distancePx: Infinity, segmentIndex: 0 };
    }
    if (points.length === 1) {
        const d = Math.hypot((point.x - points[0].x) * width, (point.y - points[0].y) * height);
        return { nearest: points[0], overallT: 0, distancePx: d, segmentIndex: 0 };
    }

    const total = polylineLengthPx(points, width, height);
    let minDist = Infinity;
    let nearest = points[0];
    let bestOverallT = 0;
    let bestSeg = 0;
    let accumulated = 0;

    for (let i = 0; i < points.length - 1; i++) {
        const ax = points[i].x * width;
        const ay = points[i].y * height;
        const bx = points[i + 1].x * width;
        const by = points[i + 1].y * height;
        const dx = bx - ax;
        const dy = by - ay;
        const segLen = Math.hypot(dx, dy);
        if (segLen === 0) continue;

        const px = point.x * width - ax;
        const py = point.y * height - ay;
        const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (segLen * segLen)));
        const nx = ax + t * dx;
        const ny = ay + t * dy;
        const dist = Math.hypot(point.x * width - nx, point.y * height - ny);

        if (dist < minDist) {
            minDist = dist;
            nearest = { x: nx / width, y: ny / height };
            bestOverallT = total > 0 ? (accumulated + t * segLen) / total : 0;
            bestSeg = i;
        }
        accumulated += segLen;
    }

    return { nearest, overallT: bestOverallT, distancePx: minDist, segmentIndex: bestSeg };
};

/**
 * Point at arc-length fraction `t` (0..1) along a normalized polyline.
 * Used for direction preview, marker placement and the ideal-path replay
 * in the harness. Returns normalized coords.
 */
export const pointAtT = (
    points: StrokePoint[],
    t: number,
    width: number,
    height: number
): StrokePoint => {
    if (points.length === 0) return { x: 0.5, y: 0.5 };
    if (points.length === 1) return points[0];
    const clamped = Math.max(0, Math.min(1, t));
    const total = polylineLengthPx(points, width, height);
    if (total === 0) return points[0];
    const target = clamped * total;

    let accumulated = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const segLen = Math.hypot(
            (points[i + 1].x - points[i].x) * width,
            (points[i + 1].y - points[i].y) * height
        );
        if (accumulated + segLen >= target) {
            const local = segLen === 0 ? 0 : (target - accumulated) / segLen;
            return {
                x: points[i].x + (points[i + 1].x - points[i].x) * local,
                y: points[i].y + (points[i + 1].y - points[i].y) * local,
            };
        }
        accumulated += segLen;
    }
    return points[points.length - 1];
};

/**
 * Tangent angle (radians) at arc-length fraction `t`, pointing in the
 * direction of travel. Used to rotate the guide vehicle and orient arrows.
 */
export const tangentAtT = (
    points: StrokePoint[],
    t: number,
    width: number,
    height: number
): number => {
    if (points.length < 2) return 0;
    const eps = 0.01;
    const a = pointAtT(points, Math.max(0, t - eps), width, height);
    const b = pointAtT(points, Math.min(1, t + eps), width, height);
    return Math.atan2((b.y - a.y) * height, (b.x - a.x) * width);
};

// ─────────────────────────────────────────────────────────────────────────
// Responsive layout — map the canonical design box into a safe pixel region
// ─────────────────────────────────────────────────────────────────────────

export interface SafeRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Compute a centered, aspect-preserving box inside `region` for the design
 * box, leaving a small inner padding so glow/markers/the vehicle never clip
 * the HUD or screen edge. Returns a mapper from normalized design coords to
 * normalized CANVAS coords (0..1 of the full canvas), which is what the
 * scoring + rendering code consume.
 */
export const layoutActivity = (
    region: SafeRegion,
    canvasWidth: number,
    canvasHeight: number,
    paddingRatio = 0.08
): { toCanvas: (p: StrokePoint) => StrokePoint; boxPx: SafeRegion } => {
    const padX = region.width * paddingRatio;
    const padY = region.height * paddingRatio;
    const innerX = region.x + padX;
    const innerY = region.y + padY;
    const innerW = Math.max(1, region.width - padX * 2);
    const innerH = Math.max(1, region.height - padY * 2);

    // Preserve a square aspect for the design box so letters aren't stretched.
    const side = Math.min(innerW, innerH);
    const boxX = innerX + (innerW - side) / 2;
    const boxY = innerY + (innerH - side) / 2;
    const boxPx: SafeRegion = { x: boxX, y: boxY, width: side, height: side };

    const toCanvas = (p: StrokePoint): StrokePoint => ({
        x: (boxX + p.x * side) / canvasWidth,
        y: (boxY + p.y * side) / canvasHeight,
    });

    return { toCanvas, boxPx };
};

// ─────────────────────────────────────────────────────────────────────────
// Validation — catches authoring mistakes early (Workstream 2 requirement)
// ─────────────────────────────────────────────────────────────────────────

export interface ValidationIssue {
    activityId: string;
    strokeId?: string;
    code:
        | 'too-few-points'
        | 'non-finite-point'
        | 'out-of-bounds-point'
        | 'start-mismatch'
        | 'end-mismatch'
        | 'zero-length-stroke'
        | 'duplicate-stroke-id'
        | 'bad-order-sequence'
        | 'identical-start-finish'
        | 'duplicate-activity-id'
        | 'no-strokes'
        | 'bad-threshold';
    message: string;
}

const isFinitePoint = (p: StrokePoint): boolean =>
    Number.isFinite(p.x) && Number.isFinite(p.y);

// Small epsilon so points authored exactly on the [0,1] border still pass.
const BOUND_EPS = 1e-6;
const inBounds = (p: StrokePoint): boolean =>
    p.x >= -BOUND_EPS && p.x <= 1 + BOUND_EPS && p.y >= -BOUND_EPS && p.y <= 1 + BOUND_EPS;

const samePoint = (a: StrokePoint, b: StrokePoint): boolean =>
    Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

/** Validate a single activity; returns an array of issues (empty = valid). */
export const validateActivity = (activity: TracingActivity): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const push = (code: ValidationIssue['code'], message: string, strokeId?: string) =>
        issues.push({ activityId: activity.id, strokeId, code, message });

    if (activity.strokes.length === 0) {
        push('no-strokes', 'Activity has no strokes');
        return issues;
    }

    if (
        !Number.isFinite(activity.completionPercent) ||
        activity.completionPercent <= 0 ||
        activity.completionPercent > 1
    ) {
        push('bad-threshold', `completionPercent ${activity.completionPercent} must be in (0,1]`);
    }

    const seenStrokeIds = new Set<string>();
    const orders: number[] = [];

    for (const s of activity.strokes) {
        if (seenStrokeIds.has(s.id)) {
            push('duplicate-stroke-id', `Duplicate stroke id "${s.id}"`, s.id);
        }
        seenStrokeIds.add(s.id);
        orders.push(s.order);

        if (s.points.length < 2) {
            push('too-few-points', `Stroke "${s.id}" has < 2 points`, s.id);
            continue;
        }
        for (const p of s.points) {
            if (!isFinitePoint(p)) {
                push('non-finite-point', `Stroke "${s.id}" has a non-finite point`, s.id);
                break;
            }
        }
        for (const p of s.points) {
            if (!inBounds(p)) {
                push('out-of-bounds-point', `Stroke "${s.id}" has a point outside [0,1]`, s.id);
                break;
            }
        }
        if (!samePoint(s.startPoint, s.points[0])) {
            push('start-mismatch', `Stroke "${s.id}" startPoint != points[0]`, s.id);
        }
        if (!samePoint(s.endPoint, s.points[s.points.length - 1])) {
            push('end-mismatch', `Stroke "${s.id}" endPoint != last point`, s.id);
        }
        if (samePoint(s.startPoint, s.endPoint) && s.points.length === 2) {
            // A 2-point stroke that starts and ends at the same place is a
            // zero-length / impossible stroke. (Closed loops with >2 points
            // — e.g. a circle returning to start — are legitimate.)
            push('zero-length-stroke', `Stroke "${s.id}" has zero length`, s.id);
        }
        if (
            s.completionThreshold !== undefined &&
            (s.completionThreshold <= 0 || s.completionThreshold > 1)
        ) {
            push('bad-threshold', `Stroke "${s.id}" completionThreshold out of (0,1]`, s.id);
        }
    }

    // Orders must be the exact sequence 1..n with no gaps or repeats.
    const sorted = [...orders].sort((a, b) => a - b);
    const expected = sorted.every((v, i) => v === i + 1);
    if (!expected) {
        push('bad-order-sequence', `Stroke orders [${orders.join(', ')}] are not 1..${orders.length}`);
    }

    return issues;
};

/** Validate a whole set; also checks activity-id uniqueness. */
export const validateActivities = (activities: TracingActivity[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const seen = new Set<string>();
    for (const a of activities) {
        if (seen.has(a.id)) {
            issues.push({
                activityId: a.id,
                code: 'duplicate-activity-id',
                message: `Duplicate activity id "${a.id}"`,
            });
        }
        seen.add(a.id);
        issues.push(...validateActivity(a));
    }
    return issues;
};

// ─────────────────────────────────────────────────────────────────────────
// Derivations
// ─────────────────────────────────────────────────────────────────────────

/** Total pixel length across all strokes of an activity. */
export const activityLengthPx = (
    activity: TracingActivity,
    width: number,
    height: number
): number =>
    activity.strokes.reduce((sum, s) => sum + polylineLengthPx(s.points, width, height), 0);

/**
 * Strokes sorted by their formation order. The engine, preview and arrows
 * all read sequence from here so they can never disagree.
 */
export const orderedStrokes = (activity: TracingActivity): TracingStroke[] =>
    [...activity.strokes].sort((a, b) => a.order - b.order);
