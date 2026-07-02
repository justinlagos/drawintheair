/**
 * ambientWarmupLogic — unit tests for the no-modal warm-up state machine.
 * Pure logic, no DOM: motion is a deterministic function of time, so we
 * can place the cursor exactly on a computed balloon centre.
 */
import { describe, it, expect } from 'vitest';
import {
    advanceAmbientWarmup,
    balloonCenterAt,
    createAmbientWarmupState,
    popBalloon,
    BALLOON_COUNT,
    DWELL_POP_MS,
    POP_RADIUS_PX,
    RISE_DURATION_MS,
    SPAWN_STAGGER_MS,
    type AmbientWarmupState,
    type Viewport,
} from '../src/features/onboarding/ambientWarmupLogic';

const VP: Viewport = { width: 1280, height: 800 };
const T0 = 1_000_000;

/** Cursor placed exactly on balloon `id` at time `now` (must be live). */
function cursorOn(state: AmbientWarmupState, id: number, now: number) {
    const c = balloonCenterAt(state.balloons[id], now, VP);
    if (!c) throw new Error(`balloon ${id} not live at ${now}`);
    return { cursorX: c.x, cursorY: c.y, pinchActive: false };
}

describe('createAmbientWarmupState', () => {
    it('creates three staggered, unpopped balloons', () => {
        const s = createAmbientWarmupState(T0);
        expect(s.balloons).toHaveLength(BALLOON_COUNT);
        expect(s.balloons.map(b => b.spawnedAt)).toEqual([
            T0, T0 + SPAWN_STAGGER_MS, T0 + 2 * SPAWN_STAGGER_MS,
        ]);
        expect(s.popCount).toBe(0);
        expect(s.completed).toBe(false);
    });
});

describe('balloonCenterAt', () => {
    it('is null before spawn and after pop', () => {
        const s = createAmbientWarmupState(T0);
        expect(balloonCenterAt(s.balloons[2], T0, VP)).toBeNull(); // not spawned yet
        const popped = { ...s.balloons[0], popped: true, poppedAt: T0 + 10 };
        expect(balloonCenterAt(popped, T0 + 20, VP)).toBeNull();
    });

    it('rises from below the bottom edge toward the top', () => {
        const s = createAmbientWarmupState(T0);
        const early = balloonCenterAt(s.balloons[0], T0 + 200, VP)!;
        const later = balloonCenterAt(s.balloons[0], T0 + RISE_DURATION_MS / 2, VP)!;
        expect(early.y).toBeGreaterThan(later.y);
        expect(early.y).toBeGreaterThan(VP.height * 0.8); // starts near/below bottom
    });

    it('wraps and rises again if never popped', () => {
        const s = createAmbientWarmupState(T0);
        const a = balloonCenterAt(s.balloons[0], T0 + 1000, VP)!;
        const b = balloonCenterAt(s.balloons[0], T0 + RISE_DURATION_MS + 1000, VP)!;
        expect(b.y).toBeCloseTo(a.y, 0); // same phase, same height
    });
});

describe('advanceAmbientWarmup', () => {
    it('does nothing without a hand', () => {
        const s = createAmbientWarmupState(T0);
        const r = advanceAmbientWarmup(
            s, { cursorX: null, cursorY: null, pinchActive: false }, T0 + 500, VP);
        expect(r.poppedIds).toEqual([]);
        expect(r.state.popCount).toBe(0);
    });

    it('pinch on a balloon pops it instantly', () => {
        const s = createAmbientWarmupState(T0);
        const now = T0 + 500;
        const input = { ...cursorOn(s, 0, now), pinchActive: true };
        const r = advanceAmbientWarmup(s, input, now, VP);
        expect(r.poppedIds).toEqual([0]);
        expect(r.state.popCount).toBe(1);
        expect(r.justCompleted).toBe(false);
    });

    it('touch pops only after the dwell threshold', () => {
        let s = createAmbientWarmupState(T0);
        const t1 = T0 + 500;
        // First touch starts the dwell clock, no pop.
        let r = advanceAmbientWarmup(s, cursorOn(s, 0, t1), t1, VP);
        expect(r.poppedIds).toEqual([]);
        s = r.state;
        // Still touching just before the threshold: no pop.
        const t2 = t1 + DWELL_POP_MS - 20;
        r = advanceAmbientWarmup(s, cursorOn(s, 0, t2), t2, VP);
        expect(r.poppedIds).toEqual([]);
        s = r.state;
        // Past the threshold: pop.
        const t3 = t1 + DWELL_POP_MS + 20;
        r = advanceAmbientWarmup(s, cursorOn(s, 0, t3), t3, VP);
        expect(r.poppedIds).toEqual([0]);
    });

    it('leaving the balloon resets the dwell clock', () => {
        let s = createAmbientWarmupState(T0);
        const t1 = T0 + 500;
        s = advanceAmbientWarmup(s, cursorOn(s, 0, t1), t1, VP).state;
        // Hand disappears — dwell resets.
        const t2 = t1 + 100;
        s = advanceAmbientWarmup(
            s, { cursorX: null, cursorY: null, pinchActive: false }, t2, VP).state;
        expect(s.dwellBalloonId).toBeNull();
        // Re-touch long after the original threshold would have passed: still no pop.
        const t3 = t1 + DWELL_POP_MS + 200;
        const r = advanceAmbientWarmup(s, cursorOn(s, 0, t3), t3, VP);
        expect(r.poppedIds).toEqual([]);
    });

    it('a cursor far from every balloon never pops anything', () => {
        const s = createAmbientWarmupState(T0);
        const now = T0 + 500;
        const c = balloonCenterAt(s.balloons[0], now, VP)!;
        const r = advanceAmbientWarmup(
            s,
            { cursorX: c.x + POP_RADIUS_PX * 3, cursorY: c.y, pinchActive: true },
            now, VP);
        expect(r.poppedIds).toEqual([]);
    });

    it('popping all three completes exactly once', () => {
        let s = createAmbientWarmupState(T0);
        // Pop 0 and 1 via pinch as they spawn; pop 2 last.
        let r = advanceAmbientWarmup(
            s, { ...cursorOn(s, 0, T0 + 300), pinchActive: true }, T0 + 300, VP);
        s = r.state;
        const t1 = T0 + SPAWN_STAGGER_MS + 300;
        r = advanceAmbientWarmup(s, { ...cursorOn(s, 1, t1), pinchActive: true }, t1, VP);
        s = r.state;
        expect(s.completed).toBe(false);
        const t2 = T0 + 2 * SPAWN_STAGGER_MS + 300;
        r = advanceAmbientWarmup(s, { ...cursorOn(s, 2, t2), pinchActive: true }, t2, VP);
        expect(r.justCompleted).toBe(true);
        expect(r.state.completed).toBe(true);
        expect(r.state.popCount).toBe(BALLOON_COUNT);
        // Further frames are inert.
        const after = advanceAmbientWarmup(
            r.state, { cursorX: 1, cursorY: 1, pinchActive: true }, t2 + 100, VP);
        expect(after.poppedIds).toEqual([]);
        expect(after.justCompleted).toBe(false);
    });
});

describe('popBalloon (pointer path)', () => {
    it('pops a live balloon and ignores unspawned/popped/duplicate pops', () => {
        const s = createAmbientWarmupState(T0);
        // Balloon 2 not spawned yet — ignored.
        expect(popBalloon(s, 2, T0 + 100).poppedIds).toEqual([]);
        // Balloon 0 pops.
        const r1 = popBalloon(s, 0, T0 + 100);
        expect(r1.poppedIds).toEqual([0]);
        // Double-pop protection.
        expect(popBalloon(r1.state, 0, T0 + 200).poppedIds).toEqual([]);
    });
});
