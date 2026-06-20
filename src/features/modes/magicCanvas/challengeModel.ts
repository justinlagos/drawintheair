/**
 * Magic Canvas — Challenge model (pure, render-agnostic).
 *
 * This is the data contract for Quick Challenge + Finish-the-World. Challenge
 * success is judged ONLY from measurable drawing BEHAVIOURS (stroke counts,
 * colours used, coverage, time, zones reached, etc.) — never from faked object
 * recognition. The product may say "You used three colours" or "You filled the
 * sky", but never "That's a perfect cat".
 *
 * No canvas, no React — safe to unit test and import anywhere.
 */

// ─────────────────────────────────────────────────────────────────────────
// Zones (normalized 0..1 rectangles on the drawing surface)
// ─────────────────────────────────────────────────────────────────────────

export interface Zone {
    id: string;
    /** Top-left + size, normalized 0..1 of the canvas. */
    x: number;
    y: number;
    w: number;
    h: number;
    label?: string;
}

export const pointInZone = (px: number, py: number, z: Zone): boolean =>
    px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h;

// ─────────────────────────────────────────────────────────────────────────
// Challenge taxonomy
// ─────────────────────────────────────────────────────────────────────────

export type AgeBand = '3-4' | '5-7' | 'all';

export type ChallengeCategory =
    | 'movement'
    | 'colour'
    | 'coverage'
    | 'pattern'
    | 'imagination'
    | 'scene'
    | 'continuous'
    | 'spatial';

/** Internal-only learning metadata — never shown to the child. */
export type LearningGoal =
    | 'continuous-movement'
    | 'colour-choice'
    | 'spatial-awareness'
    | 'pattern-recognition'
    | 'hand-eye-coordination'
    | 'fine-motor'
    | 'planning'
    | 'creative-confidence'
    | 'direction-changes'
    | 'large-arm-movement';

// ─────────────────────────────────────────────────────────────────────────
// Rules — each maps to a measurable signal
// ─────────────────────────────────────────────────────────────────────────

export type ChallengeRule =
    | { type: 'strokeCount'; minimum: number }
    | { type: 'colourCount'; minimum: number }
    | { type: 'coverage'; minimum: number; zone?: string } // minimum is a 0..1 fraction
    | { type: 'activeTime'; minimumSeconds: number }
    | { type: 'continuousStroke'; minimumSeconds: number }
    | { type: 'reachZone'; zone: string }
    | { type: 'markCountInZone'; zone: string; minimum: number }
    | { type: 'directionChanges'; minimum: number }
    | { type: 'pathLength'; minimum: number } // normalized units (canvas is 1×1; diagonal ≈ 1.41)
    | { type: 'selectedColours'; colours: string[] } // must use ALL of these
    | { type: 'brushUsed'; brushId: string };

export type ChallengeRuleType = ChallengeRule['type'];

export interface PaintChallenge {
    id: string;
    title: string;
    instruction: string;
    ageBand: AgeBand;
    category: ChallengeCategory;
    /** Finish-the-World scenes reference a world; free challenges may too. */
    worldId?: string;
    successRules: ChallengeRule[];
    /** Optional positive-framed soft timer (seconds). Never a fail state. */
    timeLimit?: number;
    rewardId?: string;
    learningGoals: LearningGoal[];
    /** Zones referenced by zone-based rules. */
    zones?: Zone[];
}

// ─────────────────────────────────────────────────────────────────────────
// Measurable drawing signals — produced by the engine, read by evaluation
// ─────────────────────────────────────────────────────────────────────────

export interface DrawingSignals {
    strokeCount: number;
    /** Distinct colours used (hex strings). */
    coloursUsed: string[];
    /** Distinct brush ids used. */
    brushesUsed: string[];
    /** Whole-canvas coverage 0..1 (grid-based). */
    coverage: number;
    /** Per-zone coverage 0..1. */
    zoneCoverage: Record<string, number>;
    /** Count of drawn marks (points) that fell inside each zone. */
    marksInZone: Record<string, number>;
    /** Zones the pointer has entered while drawing. */
    reachedZones: string[];
    /** Total active drawing time (seconds). */
    activeSeconds: number;
    /** Longest single continuous stroke (seconds). */
    longestContinuousSeconds: number;
    /** Total significant heading changes across all strokes. */
    directionChanges: number;
    /** Total drawn path length in normalized units. */
    pathLength: number;
}

export const emptySignals = (): DrawingSignals => ({
    strokeCount: 0,
    coloursUsed: [],
    brushesUsed: [],
    coverage: 0,
    zoneCoverage: {},
    marksInZone: {},
    reachedZones: [],
    activeSeconds: 0,
    longestContinuousSeconds: 0,
    directionChanges: 0,
    pathLength: 0,
});

// ─────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────

export interface ChallengeIssue {
    challengeId: string;
    code:
        | 'no-rules'
        | 'bad-minimum'
        | 'missing-zone'
        | 'empty-colours'
        | 'duplicate-id'
        | 'bad-zone-rect';
    message: string;
}

const zoneRuleZoneId = (r: ChallengeRule): string | undefined => {
    if (r.type === 'coverage') return r.zone;
    if (r.type === 'reachZone' || r.type === 'markCountInZone') return r.zone;
    return undefined;
};

export const validateChallenge = (c: PaintChallenge): ChallengeIssue[] => {
    const issues: ChallengeIssue[] = [];
    const push = (code: ChallengeIssue['code'], message: string) =>
        issues.push({ challengeId: c.id, code, message });

    if (c.successRules.length === 0) push('no-rules', 'Challenge has no success rules');

    const zoneIds = new Set((c.zones ?? []).map((z) => z.id));
    for (const z of c.zones ?? []) {
        if (z.w <= 0 || z.h <= 0 || z.x < 0 || z.y < 0 || z.x + z.w > 1.0001 || z.y + z.h > 1.0001) {
            push('bad-zone-rect', `Zone "${z.id}" is outside the 0..1 canvas`);
        }
    }

    for (const r of c.successRules) {
        if ('minimum' in r && (!Number.isFinite(r.minimum) || r.minimum <= 0)) {
            push('bad-minimum', `Rule ${r.type} has a non-positive minimum`);
        }
        if (r.type === 'activeTime' && r.minimumSeconds <= 0) push('bad-minimum', 'activeTime minimumSeconds must be > 0');
        if (r.type === 'continuousStroke' && r.minimumSeconds <= 0) push('bad-minimum', 'continuousStroke minimumSeconds must be > 0');
        if (r.type === 'selectedColours' && r.colours.length === 0) push('empty-colours', 'selectedColours is empty');
        const zid = zoneRuleZoneId(r);
        if (zid && !zoneIds.has(zid)) push('missing-zone', `Rule ${r.type} references unknown zone "${zid}"`);
    }
    return issues;
};

export const validateChallenges = (list: PaintChallenge[]): ChallengeIssue[] => {
    const issues: ChallengeIssue[] = [];
    const seen = new Set<string>();
    for (const c of list) {
        if (seen.has(c.id)) issues.push({ challengeId: c.id, code: 'duplicate-id', message: `Duplicate challenge id "${c.id}"` });
        seen.add(c.id);
        issues.push(...validateChallenge(c));
    }
    return issues;
};
