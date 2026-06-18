import { describe, it, expect } from 'vitest';
import {
    computeConfidence,
    TOO_CLOSE_SCALE,
    TOO_FAR_SCALE,
} from '../src/features/onboarding/confidence';
import {
    createWarmupState,
    advanceWarmup,
    currentGesture,
    WARMUP_TUNING,
    type WarmupState,
    type WarmupFrame,
} from '../src/features/onboarding/warmupLogic';
import {
    buildActivationFunnel,
    activationRate,
    biggestDropStep,
} from '../src/pages/admin/insights/activationFunnel';

describe('computeConfidence', () => {
    const ready = { cameraStatus: 'running' as const, trackerReady: true };

    it('red when the camera errored', () => {
        expect(computeConfidence({ ...ready, cameraStatus: 'error', hasHand: false, handScale: 0 }).level).toBe('red');
    });
    it('red when no hand is visible', () => {
        expect(computeConfidence({ ...ready, hasHand: false, handScale: 0 }).level).toBe('red');
    });
    it('yellow + "move back" when the hand is too close', () => {
        const c = computeConfidence({ ...ready, hasHand: true, handScale: TOO_CLOSE_SCALE + 0.05 });
        expect(c.level).toBe('yellow');
        expect(c.message.toLowerCase()).toContain('back');
    });
    it('yellow + "closer" when the hand is too far', () => {
        const c = computeConfidence({ ...ready, hasHand: true, handScale: TOO_FAR_SCALE / 2 });
        expect(c.level).toBe('yellow');
        expect(c.message.toLowerCase()).toContain('closer');
    });
    it('green at a comfortable distance', () => {
        const c = computeConfidence({ ...ready, hasHand: true, handScale: 0.09 });
        expect(c.level).toBe('green');
    });
    it('never leaks fps or system jargon into the message', () => {
        const c = computeConfidence({ ...ready, hasHand: true, handScale: 0.09 });
        expect(c.message.toLowerCase()).not.toContain('fps');
        expect(c.message.toLowerCase()).not.toContain('tracker');
    });
});

describe('warmupLogic — learn by doing', () => {
    const feed = (state: WarmupState, frame: WarmupFrame, t: number) => advanceWarmup(state, frame, t);

    it('starts on the wave step', () => {
        expect(currentGesture(createWarmupState(0))).toBe('wave');
    });

    it('advances wave → point when the hand reverses direction enough', () => {
        let s = createWarmupState(0);
        let t = 0;
        // Oscillate x to create direction reversals.
        const xs = [0.3, 0.6, 0.3, 0.6, 0.3, 0.6];
        for (const x of xs) {
            t += 50;
            s = feed(s, { hasHand: true, indexX: x, pinchActive: false }, t);
        }
        expect(currentGesture(s)).toBe('point');
    });

    it('completes the point step after holding still long enough', () => {
        let s = createWarmupState(0);
        // jump to point step
        s = { ...s, stepIndex: 1, stepStartedAt: 0, prevX: 0.5, holdStartedAt: null };
        let t = 100;
        s = feed(s, { hasHand: true, indexX: 0.5, pinchActive: false }, t); // starts hold
        t += WARMUP_TUNING.pointHoldMs + 50;
        s = feed(s, { hasHand: true, indexX: 0.5, pinchActive: false }, t); // hold satisfied
        expect(currentGesture(s)).toBe('pinch');
    });

    it('completes on a sustained pinch', () => {
        let s = createWarmupState(0);
        s = { ...s, stepIndex: 2, stepStartedAt: 0, holdStartedAt: null };
        let t = 100;
        s = feed(s, { hasHand: true, indexX: 0.5, pinchActive: true }, t);
        t += WARMUP_TUNING.pinchHoldMs + 20;
        s = feed(s, { hasHand: true, indexX: 0.5, pinchActive: true }, t);
        expect(s.completed).toBe(true);
    });

    it('auto-advances so a child is never stuck (guaranteed success)', () => {
        let s = createWarmupState(0);
        // No valid gesture input at all, just time passing.
        let t = 0;
        for (let i = 0; i < 3; i++) {
            t += WARMUP_TUNING.autoAdvanceMs + 100;
            s = feed(s, { hasHand: false, indexX: null, pinchActive: false }, t);
        }
        expect(s.completed).toBe(true);
    });
});

describe('activation funnel', () => {
    const m = {
        sessions_started: 100,
        cam_granted: 70,
        tracker_ok: 60,
        mode_starts: 20,
        mode_completions: 8,
    };

    it('builds an ordered funnel ending in the activation step', () => {
        const steps = buildActivationFunnel(m);
        expect(steps[0].label).toContain('Sessions');
        expect(steps[steps.length - 1].isActivation).toBe(true);
        expect(steps[steps.length - 1].n).toBe(8);
    });

    it('computes pct-of-top and pct-of-previous correctly', () => {
        const steps = buildActivationFunnel(m);
        expect(steps[1].pctOfTop).toBe(70);   // 70/100
        expect(steps[1].pctOfPrev).toBe(70);  // 70/100
        const activity = steps.find((s) => s.label === 'Activity started')!;
        expect(activity.pctOfPrev).toBeCloseTo((20 / 60) * 100, 0);
    });

    it('activation rate = first completions ÷ sessions', () => {
        expect(activationRate(m)).toBe(8);
    });

    it('flags the biggest step-to-step drop', () => {
        const steps = buildActivationFunnel(m);
        const drop = biggestDropStep(steps)!;
        // 20/60 = 33% is the worst conversion → "Activity started".
        expect(drop.label).toBe('Activity started');
    });

    it('never divides by zero on an empty funnel', () => {
        const z = buildActivationFunnel({ sessions_started: 0, cam_granted: 0, tracker_ok: 0, mode_completions: 0 });
        expect(z.every((s) => Number.isFinite(s.pctOfTop) && Number.isFinite(s.pctOfPrev))).toBe(true);
        expect(activationRate({ sessions_started: 0, cam_granted: 0, tracker_ok: 0, mode_completions: 0 })).toBe(0);
    });
});
