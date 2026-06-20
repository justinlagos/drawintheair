import { describe, it, expect } from 'vitest';
import {
    makeStroke,
    polylineLengthPx,
    nearestOnPolyline,
    pointAtT,
    tangentAtT,
    layoutActivity,
    validateActivity,
    validateActivities,
    orderedStrokes,
    activityLengthPx,
    type TracingActivity,
    type StrokePoint,
} from '../src/features/modes/tracing/tracingStrokeModel';
import {
    ALL_TRACING_ACTIVITIES,
    getActivitiesByPack,
    getActivityById,
    getActivityValidationIssues,
} from '../src/features/modes/tracing/tracingActivities';

const W = 1000;
const H = 1000;

const mkActivity = (over: Partial<TracingActivity> = {}): TracingActivity => ({
    id: 'test-1',
    type: 'letter',
    label: 'T',
    pack: 3,
    level: 1,
    themeId: 'alphabet',
    tolerancePx: 18,
    completionPercent: 0.9,
    assistStrength: 0.5,
    strokes: [
        makeStroke('test-1-s1', [{ x: 0, y: 0 }, { x: 1, y: 0 }], 1),
        makeStroke('test-1-s2', [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }], 2),
    ],
    ...over,
});

describe('makeStroke', () => {
    it('mirrors start/end from the polyline', () => {
        const s = makeStroke('x', [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }, { x: 0.9, y: 0.9 }], 1);
        expect(s.startPoint).toEqual({ x: 0.1, y: 0.2 });
        expect(s.endPoint).toEqual({ x: 0.9, y: 0.9 });
        expect(s.direction).toBe('forward');
    });
});

describe('geometry', () => {
    it('polylineLengthPx measures arc length in pixels', () => {
        const len = polylineLengthPx([{ x: 0, y: 0 }, { x: 1, y: 0 }], W, H);
        expect(len).toBeCloseTo(1000, 5);
    });

    it('nearestOnPolyline finds perpendicular distance and overallT', () => {
        const line: StrokePoint[] = [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }];
        const r = nearestOnPolyline({ x: 0.5, y: 0.6 }, line, W, H);
        expect(r.distancePx).toBeCloseTo(100, 4); // 0.1 * 1000
        expect(r.overallT).toBeCloseTo(0.5, 4);
    });

    it('pointAtT samples by arc length', () => {
        const line: StrokePoint[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
        expect(pointAtT(line, 0, W, H).x).toBeCloseTo(0, 5);
        expect(pointAtT(line, 0.25, W, H).x).toBeCloseTo(0.25, 5);
        expect(pointAtT(line, 1, W, H).x).toBeCloseTo(1, 5);
    });

    it('tangentAtT points along the direction of travel', () => {
        const right: StrokePoint[] = [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }];
        expect(tangentAtT(right, 0.5, W, H)).toBeCloseTo(0, 4); // pointing +x
        const down: StrokePoint[] = [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }];
        expect(tangentAtT(down, 0.5, W, H)).toBeCloseTo(Math.PI / 2, 4); // +y (down)
    });
});

describe('layoutActivity', () => {
    it('maps the design box into the safe region, centered & padded, square aspect', () => {
        const region = { x: 100, y: 50, width: 800, height: 600 };
        const { toCanvas, boxPx } = layoutActivity(region, 1000, 1000, 0.1);
        // Square side = min(inner) = min(800*0.8, 600*0.8) = 480
        expect(boxPx.width).toBeCloseTo(480, 3);
        expect(boxPx.height).toBeCloseTo(480, 3);
        // Box stays within the region.
        expect(boxPx.x).toBeGreaterThanOrEqual(region.x);
        expect(boxPx.y).toBeGreaterThanOrEqual(region.y);
        expect(boxPx.x + boxPx.width).toBeLessThanOrEqual(region.x + region.width + 1e-6);
        // (0,0) and (1,1) map to opposite corners of the box (normalized to canvas).
        const tl = toCanvas({ x: 0, y: 0 });
        const br = toCanvas({ x: 1, y: 1 });
        expect(tl.x * 1000).toBeCloseTo(boxPx.x, 3);
        expect(br.x * 1000).toBeCloseTo(boxPx.x + boxPx.width, 3);
    });
});

describe('validation', () => {
    it('passes a well-formed activity', () => {
        expect(validateActivity(mkActivity())).toEqual([]);
    });

    it('flags too-few-points', () => {
        const a = mkActivity();
        // Bypass makeStroke guard to simulate corrupt authoring.
        a.strokes[0] = { ...a.strokes[0], points: [{ x: 0, y: 0 }] };
        const codes = validateActivity(a).map((i) => i.code);
        expect(codes).toContain('too-few-points');
    });

    it('flags start/end mismatch', () => {
        const a = mkActivity();
        a.strokes[0] = { ...a.strokes[0], startPoint: { x: 9, y: 9 } };
        expect(validateActivity(a).map((i) => i.code)).toContain('start-mismatch');
    });

    it('flags out-of-bounds points', () => {
        const a = mkActivity();
        a.strokes[0] = makeStroke('test-1-s1', [{ x: -0.2, y: 0 }, { x: 1.5, y: 0 }], 1);
        expect(validateActivity(a).map((i) => i.code)).toContain('out-of-bounds-point');
    });

    it('flags duplicate stroke ids', () => {
        const a = mkActivity();
        a.strokes[1] = makeStroke('test-1-s1', [{ x: 0, y: 0 }, { x: 0, y: 1 }], 2);
        expect(validateActivity(a).map((i) => i.code)).toContain('duplicate-stroke-id');
    });

    it('flags non-1..n order sequences', () => {
        const a = mkActivity();
        a.strokes[1] = { ...a.strokes[1], order: 5 };
        expect(validateActivity(a).map((i) => i.code)).toContain('bad-order-sequence');
    });

    it('flags zero-length 2-point strokes but allows closed loops', () => {
        const zero = mkActivity({
            strokes: [makeStroke('z-s1', [{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }], 1)],
        });
        expect(validateActivity(zero).map((i) => i.code)).toContain('zero-length-stroke');

        const loop = mkActivity({
            strokes: [
                makeStroke('l-s1', [
                    { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.5 }, { x: 0.5, y: 0.9 }, { x: 0.5, y: 0.1 },
                ], 1),
            ],
        });
        expect(validateActivity(loop)).toEqual([]);
    });

    it('flags duplicate activity ids across a set', () => {
        const dup = [mkActivity({ id: 'dup' }), mkActivity({ id: 'dup' })];
        expect(validateActivities(dup).map((i) => i.code)).toContain('duplicate-activity-id');
    });
});

describe('content set', () => {
    it('every shipped activity is valid', () => {
        expect(getActivityValidationIssues()).toEqual([]);
    });

    it('has the expected pack sizes and ids', () => {
        expect(getActivitiesByPack(1)).toHaveLength(1);  // single warm-up
        expect(getActivitiesByPack(2)).toHaveLength(4);  // circle, square, triangle, star
        expect(getActivitiesByPack(3)).toHaveLength(26); // A-Z
        expect(getActivitiesByPack(4)).toHaveLength(10); // 1-10
        expect(ALL_TRACING_ACTIVITIES).toHaveLength(41);
    });

    it('preserves legacy ids for progress compatibility', () => {
        expect(getActivityById('warmup-v1')).toBeDefined();
        expect(getActivityById('shape-circle')).toBeDefined();
        expect(getActivityById('letter-A')).toBeDefined();
        expect(getActivityById('number-10')).toBeDefined();
    });

    it('letter A is three ordered strokes: left leg, right leg, crossbar', () => {
        const a = getActivityById('letter-A')!;
        const strokes = orderedStrokes(a);
        expect(strokes).toHaveLength(3);
        expect(strokes.map((s) => s.order)).toEqual([1, 2, 3]);
        // S1 starts at the base-left and ends near the apex (top).
        expect(strokes[0].startPoint.y).toBeGreaterThan(0.8);
        expect(strokes[0].endPoint.y).toBeLessThan(0.15);
        // S2 starts at the apex and ends at the base-right.
        expect(strokes[1].startPoint.y).toBeLessThan(0.15);
        expect(strokes[1].endPoint.x).toBeGreaterThan(0.7);
        // S3 (crossbar) is roughly horizontal, left → right.
        expect(strokes[2].startPoint.x).toBeLessThan(strokes[2].endPoint.x);
        expect(Math.abs(strokes[2].startPoint.y - strokes[2].endPoint.y)).toBeLessThan(0.05);
    });

    it('known multi-stroke letters have the right stroke counts', () => {
        expect(getActivityById('letter-E')!.strokes).toHaveLength(4);
        expect(getActivityById('letter-T')!.strokes).toHaveLength(2);
        expect(getActivityById('letter-H')!.strokes).toHaveLength(3);
        expect(getActivityById('letter-O')!.strokes).toHaveLength(1);
        expect(getActivityById('letter-X')!.strokes).toHaveLength(2);
    });

    it('activity length is positive for every activity', () => {
        for (const a of ALL_TRACING_ACTIVITIES) {
            expect(activityLengthPx(a, W, H)).toBeGreaterThan(0);
        }
    });
});
