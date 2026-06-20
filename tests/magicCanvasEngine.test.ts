import { describe, it, expect } from 'vitest';
import { MagicCanvasEngine } from '../src/features/modes/magicCanvas/magicCanvasEngine';
import { getChallengeById } from '../src/features/modes/magicCanvas/paintChallenges';

const W = 1000, H = 700;
const cfg = { perfTier: 'high' as const, reducedMotion: false };
const mk = () => new MagicCanvasEngine('magicpaper', W, H, cfg);

describe('live-ink pen logic', () => {
    it('pen-down starts a stroke immediately, pen-up ends it cleanly', () => {
        const e = mk();
        e.setColour('#ff0000');
        e.update({ pointer: { x: 0.5, y: 0.5 }, pinch: false, hasHand: true, now: 0 });
        e.update({ pointer: { x: 0.5, y: 0.5 }, pinch: true, hasHand: true, now: 16 });
        expect(e.drawing).toBe(true);
        e.update({ pointer: { x: 0.55, y: 0.5 }, pinch: true, hasHand: true, now: 32 });
        e.update({ pointer: { x: 0.6, y: 0.5 }, pinch: false, hasHand: true, now: 48 });
        expect(e.drawing).toBe(false);
        expect(e.canUndo).toBe(true);
    });

    it('tracking loss ends the stroke and does NOT reconnect across the canvas', () => {
        const e = mk();
        e.setColour('#ff0000');
        e.update({ pointer: { x: 0.1, y: 0.1 }, pinch: false, hasHand: true, now: 0 });
        e.update({ pointer: { x: 0.1, y: 0.1 }, pinch: true, hasHand: true, now: 16 });
        e.update({ pointer: { x: 0.15, y: 0.12 }, pinch: true, hasHand: true, now: 32 });
        // Hand disappears mid-stroke.
        e.update({ pointer: null, pinch: false, hasHand: false, now: 48 });
        expect(e.drawing).toBe(false);
        // Recover far away with a fresh pinch → a NEW stroke, no bridging line.
        e.update({ pointer: { x: 0.9, y: 0.9 }, pinch: true, hasHand: true, now: 64 });
        e.update({ pointer: { x: 0.92, y: 0.9 }, pinch: true, hasHand: true, now: 80 });
        const s = e.update({ pointer: { x: 0.94, y: 0.9 }, pinch: false, hasHand: true, now: 96 });
        expect(s.strokeCount).toBe(2);
        // No giant ~1.1 diagonal jump in the path length.
        expect(s.signals.pathLength).toBeLessThan(0.5);
    });

    it('undo removes the last stroke and rebuilds signals; clear empties', () => {
        const e = mk();
        const stroke = (colour: string, x: number, t: number) => {
            e.setColour(colour);
            e.update({ pointer: { x, y: 0.5 }, pinch: false, hasHand: true, now: t });
            e.update({ pointer: { x, y: 0.5 }, pinch: true, hasHand: true, now: t + 16 });
            e.update({ pointer: { x: x + 0.1, y: 0.5 }, pinch: true, hasHand: true, now: t + 32 });
            e.update({ pointer: { x: x + 0.2, y: 0.5 }, pinch: false, hasHand: true, now: t + 48 });
        };
        stroke('#ff0000', 0.2, 0);
        stroke('#00ff00', 0.5, 100);
        expect(e.getSnapshot().strokeCount).toBe(2);
        e.undo();
        expect(e.getSnapshot().strokeCount).toBe(1);
        expect(e.getSnapshot().coloursUsed).toBe(1);
        e.clear();
        expect(e.getSnapshot().strokeCount).toBe(0);
        expect(e.canUndo).toBe(false);
    });
});

describe('challenge completion from drawing', () => {
    it('"two colours" completes once when a second colour is used', () => {
        const e = mk();
        e.setChallenge(getChallengeById('two-colours')!);
        let completedFires = 0;
        const stroke = (colour: string, x: number, t: number) => {
            e.setColour(colour);
            e.update({ pointer: { x, y: 0.5 }, pinch: false, hasHand: true, now: t });
            let s = e.update({ pointer: { x, y: 0.5 }, pinch: true, hasHand: true, now: t + 16 });
            if (s.challengeJustCompleted) completedFires++;
            s = e.update({ pointer: { x: x + 0.1, y: 0.5 }, pinch: true, hasHand: true, now: t + 32 });
            if (s.challengeJustCompleted) completedFires++;
            s = e.update({ pointer: { x: x + 0.2, y: 0.5 }, pinch: false, hasHand: true, now: t + 48 });
            if (s.challengeJustCompleted) completedFires++;
        };
        stroke('#7BB6FF', 0.2, 0);
        expect(e.getSnapshot().challenge!.completed).toBe(false);
        stroke('#FFC83D', 0.5, 100);
        expect(e.getSnapshot().challenge!.completed).toBe(true);
        expect(completedFires).toBe(1); // fires exactly once
    });

    it('brush selection applies to the next stroke', () => {
        const e = mk();
        e.setBrush('glow');
        e.update({ pointer: { x: 0.3, y: 0.3 }, pinch: false, hasHand: true, now: 0 });
        e.update({ pointer: { x: 0.3, y: 0.3 }, pinch: true, hasHand: true, now: 16 });
        e.update({ pointer: { x: 0.4, y: 0.4 }, pinch: false, hasHand: true, now: 32 });
        expect(e.getSnapshot().brushesUsed).toBe(1);
        expect(e.getSnapshot().signals.brushesUsed).toEqual(['glow']);
    });
});
