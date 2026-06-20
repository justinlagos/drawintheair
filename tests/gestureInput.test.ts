import { describe, it, expect } from 'vitest';
import { setGesturePointer, getGesturePointer } from '../src/core/gestureInput';

describe('gesture pointer source', () => {
    it('publishes the hand point with a timestamp when the hand is present', () => {
        const before = Date.now();
        setGesturePointer({ x: 0.3, y: 0.7 }, true, true);
        const p = getGesturePointer();
        expect(p.x).toBeCloseTo(0.3, 5);
        expect(p.y).toBeCloseTo(0.7, 5);
        expect(p.pinch).toBe(true);
        expect(p.hasHand).toBe(true);
        expect(p.ts).toBeGreaterThanOrEqual(before);
    });

    it('clears hand/pinch when the hand is lost (keeps last position)', () => {
        setGesturePointer({ x: 0.2, y: 0.2 }, true, true);
        setGesturePointer(null, true, false);
        const p = getGesturePointer();
        expect(p.hasHand).toBe(false);
        expect(p.pinch).toBe(false);
        expect(p.x).toBeCloseTo(0.2, 5); // last position retained
    });
});
