import { describe, it, expect } from 'vitest';
import {
    pointInZone,
    validateChallenge,
    emptySignals,
    type PaintChallenge,
    type DrawingSignals,
} from '../src/features/modes/magicCanvas/challengeModel';
import { SignalsAccumulator, evaluateChallenge } from '../src/features/modes/magicCanvas/challengeEngine';
import {
    PAINT_WORLDS,
    getWorldById,
    evaluateReactions,
    getWorldValidationIssues,
} from '../src/features/modes/magicCanvas/paintWorlds';
import {
    ALL_CHALLENGES,
    getChallengeById,
    getChallengesByAge,
    getSceneChallenges,
    getChallengeValidationIssues,
} from '../src/features/modes/magicCanvas/paintChallenges';

const sig = (over: Partial<DrawingSignals> = {}): DrawingSignals => ({ ...emptySignals(), ...over });

describe('zones', () => {
    it('detects points inside a zone', () => {
        const z = { id: 'a', x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
        expect(pointInZone(0.3, 0.3, z)).toBe(true);
        expect(pointInZone(0.05, 0.05, z)).toBe(false);
    });
});

describe('rule evaluation', () => {
    const ch = (rules: PaintChallenge['successRules'], zones?: PaintChallenge['zones']): PaintChallenge => ({
        id: 't', title: 't', instruction: 't', ageBand: 'all', category: 'movement', learningGoals: [], successRules: rules, zones,
    });

    it('strokeCount completes at the threshold', () => {
        const c = ch([{ type: 'strokeCount', minimum: 3 }]);
        expect(evaluateChallenge(c, sig({ strokeCount: 2 })).completed).toBe(false);
        expect(evaluateChallenge(c, sig({ strokeCount: 3 })).completed).toBe(true);
    });

    it('colourCount + label', () => {
        const c = ch([{ type: 'colourCount', minimum: 2 }]);
        const p = evaluateChallenge(c, sig({ coloursUsed: ['#fff'] }));
        expect(p.completed).toBe(false);
        expect(p.label).toContain('colour');
        expect(evaluateChallenge(c, sig({ coloursUsed: ['#fff', '#000'] })).completed).toBe(true);
    });

    it('selectedColours requires all listed colours (case-insensitive)', () => {
        const c = ch([{ type: 'selectedColours', colours: ['#FFC83D', '#FF9B7E'] }]);
        expect(evaluateChallenge(c, sig({ coloursUsed: ['#ffc83d'] })).completed).toBe(false);
        expect(evaluateChallenge(c, sig({ coloursUsed: ['#ffc83d', '#ff9b7e', '#000'] })).completed).toBe(true);
    });

    it('markCountInZone reads per-zone marks', () => {
        const c = ch([{ type: 'markCountInZone', zone: 'sky', minimum: 5 }], [{ id: 'sky', x: 0, y: 0, w: 1, h: 0.5 }]);
        expect(evaluateChallenge(c, sig({ marksInZone: { sky: 4 } })).completed).toBe(false);
        expect(evaluateChallenge(c, sig({ marksInZone: { sky: 5 } })).completed).toBe(true);
    });

    it('multiple rules must all pass; overallProgress averages', () => {
        const c = ch([{ type: 'strokeCount', minimum: 2 }, { type: 'colourCount', minimum: 2 }]);
        const p = evaluateChallenge(c, sig({ strokeCount: 2, coloursUsed: ['#a'] }));
        expect(p.completed).toBe(false);
        expect(p.overallProgress).toBeCloseTo(0.75, 5); // 1 + 0.5 over 2
    });
});

describe('SignalsAccumulator', () => {
    it('counts strokes, colours, brushes and path length', () => {
        const acc = new SignalsAccumulator();
        acc.beginStroke('crayon', '#ff0000', 0);
        acc.addPoint(0.1, 0.5, 0);
        acc.addPoint(0.9, 0.5, 100); // horizontal line, length 0.8
        acc.endStroke(120);
        acc.beginStroke('paint', '#00ff00', 200);
        acc.addPoint(0.5, 0.1, 200);
        acc.addPoint(0.5, 0.6, 260);
        acc.endStroke(280);
        const s = acc.getSignals();
        expect(s.strokeCount).toBe(2);
        expect(s.coloursUsed.sort()).toEqual(['#00ff00', '#ff0000']);
        expect(s.brushesUsed.sort()).toEqual(['crayon', 'paint']);
        expect(s.pathLength).toBeCloseTo(0.8 + 0.5, 2);
    });

    it('tracks continuous stroke seconds incl. the in-progress stroke', () => {
        const acc = new SignalsAccumulator();
        acc.beginStroke('crayon', '#fff', 1000);
        acc.addPoint(0.2, 0.2, 1000);
        acc.addPoint(0.3, 0.3, 4000); // dt clamped for activeTime, but continuous = wall time
        expect(acc.getSignals(5000).longestContinuousSeconds).toBeCloseTo(4, 1);
        acc.endStroke(6000);
        expect(acc.getSignals().longestContinuousSeconds).toBeCloseTo(5, 1);
    });

    it('counts one mark per zone per stroke and tracks reached zones', () => {
        const zones = [{ id: 'box', x: 0.4, y: 0.4, w: 0.2, h: 0.2 }];
        const acc = new SignalsAccumulator(zones);
        for (let i = 0; i < 3; i++) {
            acc.beginStroke('crayon', '#fff', i * 100);
            acc.addPoint(0.5, 0.5, i * 100);     // inside
            acc.addPoint(0.51, 0.51, i * 100 + 10); // still inside — must NOT double count
            acc.endStroke(i * 100 + 20);
        }
        const s = acc.getSignals();
        expect(s.marksInZone.box).toBe(3);
        expect(s.reachedZones).toContain('box');
    });

    it('counts direction changes on a zigzag', () => {
        const acc = new SignalsAccumulator();
        acc.beginStroke('crayon', '#fff', 0);
        let t = 0;
        // up-right, down-right, up-right, down-right ... sharp alternating turns
        const pts = [[0, 0.5], [0.1, 0.2], [0.2, 0.5], [0.3, 0.2], [0.4, 0.5], [0.5, 0.2]];
        for (const [x, y] of pts) acc.addPoint(x, y, (t += 50));
        acc.endStroke(t);
        expect(acc.getSignals().directionChanges).toBeGreaterThanOrEqual(3);
    });

    it('coverage rises with marks and supports per-zone coverage', () => {
        const zones = [{ id: 'top', x: 0, y: 0, w: 1, h: 0.5 }];
        const acc = new SignalsAccumulator(zones);
        acc.beginStroke('paint', '#fff', 0);
        for (let i = 0; i <= 40; i++) acc.addPoint(i / 40, 0.1, i); // sweep across the top band
        acc.endStroke(50);
        const s = acc.getSignals();
        expect(s.coverage).toBeGreaterThan(0);
        expect(s.zoneCoverage.top).toBeGreaterThan(s.coverage); // concentrated in the top zone
    });
});

describe('challenge content', () => {
    it('has at least 18 challenges and they all validate', () => {
        expect(ALL_CHALLENGES.length).toBeGreaterThanOrEqual(18);
        expect(getChallengeValidationIssues()).toEqual([]);
    });

    it('every zone-based rule references a defined zone', () => {
        for (const c of ALL_CHALLENGES) {
            expect(validateChallenge(c)).toEqual([]);
        }
    });

    it('lookups and filters work', () => {
        expect(getChallengeById('two-colours')).toBeDefined();
        expect(getChallengesByAge('3-4').length).toBeGreaterThan(0);
        expect(getSceneChallenges().every((c) => !!c.worldId)).toBe(true);
    });

    it('worlds validate, fall back, and reactions fire from signals', () => {
        expect(PAINT_WORLDS.length).toBeGreaterThanOrEqual(4);
        expect(getWorldValidationIssues()).toEqual([]);
        expect(getWorldById('does-not-exist').id).toBe('magicpaper'); // fallback
        const night = getWorldById('night');
        const off = evaluateReactions(night, sig(), 0);
        expect(off).toHaveLength(0);
        const on = evaluateReactions(night, sig({ marksInZone: { sky: 5 } }), 0.2);
        expect(on).toContain('sky-stars');
    });

    it('an end-to-end scene challenge completes from real signals', () => {
        const c = getChallengeById('sky-stars')!; // 10 marks in the sky zone
        const acc = new SignalsAccumulator(c.zones);
        for (let i = 0; i < 10; i++) {
            acc.beginStroke('sparkle', '#FFC83D', i * 100);
            acc.addPoint(0.1 + (i % 8) * 0.1, 0.2, i * 100); // inside sky band (y<0.5)
            acc.endStroke(i * 100 + 20);
        }
        expect(evaluateChallenge(c, acc.getSignals()).completed).toBe(true);
    });
});
