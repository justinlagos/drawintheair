import { describe, it, expect } from 'vitest';
import { PlayfulTracingEngine, type EngineSnapshot } from '../src/features/modes/tracing/playfulTracingEngine';
import { getActivityById } from '../src/features/modes/tracing/tracingActivities';

const W = 1000;
const H = 1000;
const REGION = { x: 0, y: 0, width: W, height: H };
// reducedMotion:true disables the preview gate so logic tests are deterministic.
const CONFIG = { perfTier: 'high' as const, reducedMotion: true };

const makeEngine = (id: string) => {
    const activity = getActivityById(id)!;
    return new PlayfulTracingEngine(activity, W, H, REGION, CONFIG);
};

/** Drive the engine along the ideal path until completion (or frame cap). */
const traceToCompletion = (engine: PlayfulTracingEngine, maxFrames = 1500) => {
    let now = 1000;
    let idx = 0;
    let localT = 0;
    let snap: EngineSnapshot = engine.update({ pointer: engine.idealPointer(0), pinch: true, hasHand: true, now });
    for (let i = 0; i < maxFrames && !snap.completed; i++) {
        now += 16;
        const ptr = engine.idealPointer(localT);
        snap = engine.update({ pointer: ptr, pinch: true, hasHand: true, now });
        if (snap.currentStrokeIndex !== idx) {
            idx = snap.currentStrokeIndex;
            localT = 0;
        } else {
            localT = Math.min(1, localT + 0.03);
        }
    }
    return snap;
};

describe('start-zone gating', () => {
    it('does not advance until tracing begins inside the start zone', () => {
        const engine = makeEngine('letter-A');
        // Pointer parked mid-stroke (on the path, but NOT at the start).
        const mid = engine.idealPointer(0.5)!;
        let snap = engine.update({ pointer: mid, pinch: true, hasHand: true, now: 1000 });
        for (let i = 0; i < 30; i++) {
            snap = engine.update({ pointer: mid, pinch: true, hasHand: true, now: 1000 + i * 16 });
        }
        expect(snap.overallProgress).toBe(0);
    });

    it('advances once the child starts at the stroke start', () => {
        const engine = makeEngine('warmup-v1');
        let now = 1000;
        let snap = engine.update({ pointer: engine.idealPointer(0), pinch: true, hasHand: true, now });
        for (let i = 0; i < 20; i++) {
            now += 16;
            snap = engine.update({ pointer: engine.idealPointer(Math.min(1, i * 0.03)), pinch: true, hasHand: true, now });
        }
        expect(snap.overallProgress).toBeGreaterThan(0);
    });
});

describe('progress rules', () => {
    it('does not advance when not pinching', () => {
        const engine = makeEngine('warmup-v1');
        let snap = engine.update({ pointer: engine.idealPointer(0), pinch: false, hasHand: true, now: 1000 });
        for (let i = 0; i < 40; i++) {
            snap = engine.update({ pointer: engine.idealPointer(i * 0.03), pinch: false, hasHand: true, now: 1500 + i * 16 });
        }
        expect(snap.overallProgress).toBe(0);
        expect(snap.paused).toBe(true);
    });

    it('does not advance when far off the path', () => {
        const engine = makeEngine('warmup-v1');
        let snap = engine.update({ pointer: { x: 0.02, y: 0.02 }, pinch: true, hasHand: true, now: 1000 });
        for (let i = 0; i < 40; i++) {
            snap = engine.update({ pointer: { x: 0.02, y: 0.02 }, pinch: true, hasHand: true, now: 1500 + i * 16 });
        }
        expect(snap.overallProgress).toBe(0);
    });

    it('is forward-only — progress never decreases frame to frame', () => {
        const engine = makeEngine('warmup-v1');
        let now = 1000;
        let prev = 0;
        let idx = 0;
        let localT = 0;
        let snap = engine.update({ pointer: engine.idealPointer(0), pinch: true, hasHand: true, now });
        for (let i = 0; i < 200 && !snap.completed; i++) {
            now += 16;
            snap = engine.update({ pointer: engine.idealPointer(localT), pinch: true, hasHand: true, now });
            if (snap.currentStrokeIndex !== idx) { idx = snap.currentStrokeIndex; localT = 0; }
            else localT = Math.min(1, localT + 0.04);
            expect(snap.overallProgress).toBeGreaterThanOrEqual(prev - 1e-9);
            prev = snap.overallProgress;
        }
    });
});

describe('multi-stroke sequencing', () => {
    it('letter A completes all three strokes in order', () => {
        const engine = makeEngine('letter-A');
        const snap = traceToCompletion(engine);
        expect(snap.completed).toBe(true);
        expect(snap.totalStrokes).toBe(3);
        expect(snap.overallProgress).toBe(1);
    });

    it('completion callback fires exactly once', () => {
        const engine = makeEngine('letter-A');
        let calls = 0;
        engine.setCompletionCallback(() => { calls += 1; });
        traceToCompletion(engine);
        // A few extra frames after completion must not re-fire.
        let now = 999999;
        for (let i = 0; i < 10; i++) {
            engine.update({ pointer: engine.idealPointer(1), pinch: true, hasHand: true, now: now + i * 16 });
        }
        expect(calls).toBe(1);
    });

    it('jumpToStroke marks prior strokes done', () => {
        const engine = makeEngine('letter-E'); // 4 strokes
        engine.jumpToStroke(2);
        const snap = engine.update({ pointer: null, pinch: false, hasHand: false, now: 5000 });
        expect(snap.currentStrokeIndex).toBe(2);
        expect(snap.overallProgress).toBeGreaterThan(0); // strokes 0 & 1 are done
        expect(snap.completed).toBe(false);
    });
});

describe('resilience', () => {
    it('a brief tracking loss preserves completed progress', () => {
        const engine = makeEngine('warmup-v1');
        let now = 1000;
        let snap = engine.update({ pointer: engine.idealPointer(0), pinch: true, hasHand: true, now });
        for (let i = 0; i < 15; i++) {
            now += 16;
            snap = engine.update({ pointer: engine.idealPointer(i * 0.03), pinch: true, hasHand: true, now });
        }
        const beforeLoss = snap.overallProgress;
        expect(beforeLoss).toBeGreaterThan(0);
        // Hand disappears for several frames.
        for (let i = 0; i < 20; i++) {
            now += 16;
            snap = engine.update({ pointer: null, pinch: false, hasHand: false, now });
        }
        expect(snap.overallProgress).toBeCloseTo(beforeLoss, 5);
    });

    it('reset returns to stroke one with zero progress', () => {
        const engine = makeEngine('letter-A');
        traceToCompletion(engine);
        engine.reset();
        const snap = engine.update({ pointer: null, pinch: false, hasHand: false, now: 10 });
        expect(snap.currentStrokeIndex).toBe(0);
        expect(snap.overallProgress).toBe(0);
        expect(snap.completed).toBe(false);
    });

    it('curved/multi-stroke glyphs (G, S, 8, B, D, P, R) are traceable to completion', () => {
        for (const id of ['letter-G', 'letter-S', 'number-8', 'letter-B', 'letter-D', 'letter-P', 'letter-R']) {
            const engine = makeEngine(id);
            const snap = traceToCompletion(engine, 4000);
            expect(snap.completed, `${id} should complete`).toBe(true);
        }
    });

    it('forceComplete completes once', () => {
        const engine = makeEngine('shape-circle');
        let calls = 0;
        engine.setCompletionCallback(() => { calls += 1; });
        engine.forceComplete();
        const snap = engine.update({ pointer: null, pinch: false, hasHand: false, now: 1 });
        expect(snap.completed).toBe(true);
        expect(calls).toBe(1);
    });
});
