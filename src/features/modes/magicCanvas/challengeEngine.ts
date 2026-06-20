/**
 * Magic Canvas — Challenge evaluation + a pure signals accumulator.
 *
 * `SignalsAccumulator` ingests stroke events (begin / point / end) and derives
 * the measurable DrawingSignals. `evaluateChallenge` scores a challenge against
 * those signals. Both are pure (no canvas / no React) so the rules can be
 * unit-tested deterministically and reused by the live engine + dev harness.
 */

import {
    pointInZone,
    type ChallengeRule,
    type DrawingSignals,
    type PaintChallenge,
    type Zone,
} from './challengeModel';

// ─────────────────────────────────────────────────────────────────────────
// Evaluation
// ─────────────────────────────────────────────────────────────────────────

export interface RuleProgress {
    rule: ChallengeRule;
    done: boolean;
    current: number;
    target: number;
    /** Short, child-friendly progress label (count-based, never a percentage). */
    label: string;
}

export interface ChallengeProgress {
    rules: RuleProgress[];
    completed: boolean;
    /** 0..1 average across rules (for a soft progress bar). */
    overallProgress: number;
    /** The single most relevant line to show (the next unfinished rule). */
    label: string;
}

const norm = (c: string): string => c.trim().toLowerCase();

const evaluateRule = (rule: ChallengeRule, s: DrawingSignals): RuleProgress => {
    const mk = (current: number, target: number, label: string): RuleProgress => ({
        rule,
        current,
        target,
        done: current >= target,
        label,
    });

    switch (rule.type) {
        case 'strokeCount':
            return mk(s.strokeCount, rule.minimum, `${Math.min(s.strokeCount, rule.minimum)} of ${rule.minimum} marks`);
        case 'colourCount':
            return mk(s.coloursUsed.length, rule.minimum, `${s.coloursUsed.length} ${s.coloursUsed.length === 1 ? 'colour' : 'colours'} used`);
        case 'coverage': {
            const frac = rule.zone ? s.zoneCoverage[rule.zone] ?? 0 : s.coverage;
            // Boolean-ish: scale to 0..100 internally but show friendly words.
            const cur = Math.round(frac * 100);
            const tgt = Math.round(rule.minimum * 100);
            const label = cur >= tgt ? 'Filled it!' : cur > tgt * 0.5 ? 'Almost there' : 'Keep filling';
            return mk(cur, tgt, label);
        }
        case 'activeTime':
            return mk(Math.floor(s.activeSeconds), rule.minimumSeconds, 'Keep drawing');
        case 'continuousStroke':
            return mk(Math.floor(s.longestContinuousSeconds), rule.minimumSeconds, 'Keep your finger down');
        case 'reachZone': {
            const done = s.reachedZones.includes(rule.zone);
            return mk(done ? 1 : 0, 1, done ? 'You reached it!' : 'Reach the other side');
        }
        case 'markCountInZone': {
            const cur = s.marksInZone[rule.zone] ?? 0;
            return mk(cur, rule.minimum, `${Math.min(cur, rule.minimum)} of ${rule.minimum}`);
        }
        case 'directionChanges':
            return mk(s.directionChanges, rule.minimum, 'Make zigzags');
        case 'pathLength': {
            const cur = Math.round(s.pathLength * 100) / 100;
            return mk(cur, rule.minimum, cur >= rule.minimum ? 'Nice long line!' : 'Make it longer');
        }
        case 'selectedColours': {
            const used = new Set(s.coloursUsed.map(norm));
            const have = rule.colours.filter((c) => used.has(norm(c))).length;
            return mk(have, rule.colours.length, `${have} of ${rule.colours.length} colours`);
        }
        case 'brushUsed': {
            const done = s.brushesUsed.includes(rule.brushId);
            return mk(done ? 1 : 0, 1, done ? 'Brush used' : `Use the ${rule.brushId} brush`);
        }
    }
};

export const evaluateChallenge = (challenge: PaintChallenge, signals: DrawingSignals): ChallengeProgress => {
    const rules = challenge.successRules.map((r) => evaluateRule(r, signals));
    const completed = rules.length > 0 && rules.every((r) => r.done);
    const overallProgress =
        rules.length === 0
            ? 0
            : rules.reduce((sum, r) => sum + Math.min(1, r.target > 0 ? r.current / r.target : 0), 0) / rules.length;
    const nextUnfinished = rules.find((r) => !r.done);
    const label = completed ? 'Challenge complete!' : nextUnfinished?.label ?? challenge.instruction;
    return { rules, completed, overallProgress, label };
};

// ─────────────────────────────────────────────────────────────────────────
// Signals accumulator
// ─────────────────────────────────────────────────────────────────────────

const GRID_COLS = 40;
const GRID_ROWS = 24;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;
const DIR_CHANGE_RAD = 1.2; // ~70°
const DIR_MIN_MOVE = 0.02; // normalized distance before re-sampling heading
const MAX_DT_MS = 120; // clamp gaps so a paused/lost frame can't inflate time

interface StrokeState {
    brushId: string;
    colour: string;
    startNow: number;
    lastNow: number;
    last: { x: number; y: number } | null;
    headingAnchor: { x: number; y: number } | null;
    lastHeading: number | null;
    zonesMarked: Set<string>;
}

export class SignalsAccumulator {
    private zones: Zone[];
    private touched = new Set<number>();
    private colours = new Set<string>();
    private brushes = new Set<string>();
    private marksInZone: Record<string, number> = {};
    private reached = new Set<string>();
    private strokeCount = 0;
    private activeMs = 0;
    private longestMs = 0;
    private directionChanges = 0;
    private pathLength = 0;
    private stroke: StrokeState | null = null;

    constructor(zones: Zone[] = []) {
        this.zones = zones;
    }

    reset(zones: Zone[] = this.zones): void {
        this.zones = zones;
        this.touched.clear();
        this.colours.clear();
        this.brushes.clear();
        this.marksInZone = {};
        this.reached.clear();
        this.strokeCount = 0;
        this.activeMs = 0;
        this.longestMs = 0;
        this.directionChanges = 0;
        this.pathLength = 0;
        this.stroke = null;
    }

    beginStroke(brushId: string, colour: string, now: number): void {
        // Close any dangling stroke first.
        if (this.stroke) this.endStroke(now);
        this.strokeCount += 1;
        this.colours.add(norm(colour));
        this.brushes.add(brushId);
        this.stroke = {
            brushId,
            colour: norm(colour),
            startNow: now,
            lastNow: now,
            last: null,
            headingAnchor: null,
            lastHeading: null,
            zonesMarked: new Set(),
        };
    }

    /** Add a point in normalized canvas coords (0..1). */
    addPoint(x: number, y: number, now: number): void {
        const st = this.stroke;
        if (!st) return;

        // Active time (clamped).
        this.activeMs += Math.min(MAX_DT_MS, Math.max(0, now - st.lastNow));
        st.lastNow = now;

        // Coverage grid.
        const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(x * GRID_COLS)));
        const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y * GRID_ROWS)));
        this.touched.add(row * GRID_COLS + col);

        // Zones: one mark per zone per stroke; also "reached".
        for (const z of this.zones) {
            if (pointInZone(x, y, z)) {
                this.reached.add(z.id);
                if (!st.zonesMarked.has(z.id)) {
                    st.zonesMarked.add(z.id);
                    this.marksInZone[z.id] = (this.marksInZone[z.id] ?? 0) + 1;
                }
            }
        }

        // Path length + direction changes.
        if (st.last) {
            this.pathLength += Math.hypot(x - st.last.x, y - st.last.y);
        }
        if (!st.headingAnchor) {
            st.headingAnchor = { x, y };
        } else {
            const dx = x - st.headingAnchor.x;
            const dy = y - st.headingAnchor.y;
            if (Math.hypot(dx, dy) >= DIR_MIN_MOVE) {
                const heading = Math.atan2(dy, dx);
                if (st.lastHeading !== null) {
                    let diff = Math.abs(heading - st.lastHeading);
                    if (diff > Math.PI) diff = Math.PI * 2 - diff;
                    if (diff >= DIR_CHANGE_RAD) this.directionChanges += 1;
                }
                st.lastHeading = heading;
                st.headingAnchor = { x, y };
            }
        }
        st.last = { x, y };
    }

    endStroke(now: number): void {
        const st = this.stroke;
        if (!st) return;
        const dur = Math.max(0, now - st.startNow);
        this.longestMs = Math.max(this.longestMs, dur);
        this.stroke = null;
    }

    private coverageFor(filter?: Zone): number {
        if (!filter) return this.touched.size / TOTAL_CELLS;
        let total = 0;
        let hit = 0;
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const cx = (col + 0.5) / GRID_COLS;
                const cy = (row + 0.5) / GRID_ROWS;
                if (pointInZone(cx, cy, filter)) {
                    total += 1;
                    if (this.touched.has(row * GRID_COLS + col)) hit += 1;
                }
            }
        }
        return total === 0 ? 0 : hit / total;
    }

    getSignals(now?: number): DrawingSignals {
        const zoneCoverage: Record<string, number> = {};
        for (const z of this.zones) zoneCoverage[z.id] = this.coverageFor(z);

        // Include the in-progress stroke's running continuous duration.
        let longest = this.longestMs;
        if (this.stroke && now !== undefined) {
            longest = Math.max(longest, now - this.stroke.startNow);
        }

        return {
            strokeCount: this.strokeCount,
            coloursUsed: [...this.colours],
            brushesUsed: [...this.brushes],
            coverage: this.coverageFor(),
            zoneCoverage,
            marksInZone: { ...this.marksInZone },
            reachedZones: [...this.reached],
            activeSeconds: this.activeMs / 1000,
            longestContinuousSeconds: longest / 1000,
            directionChanges: this.directionChanges,
            pathLength: this.pathLength,
        };
    }
}
