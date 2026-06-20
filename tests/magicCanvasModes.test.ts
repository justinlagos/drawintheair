import { describe, it, expect } from 'vitest';
import {
    COLOURING_PAGES,
    getColouringPage,
    pointInPolygon,
    regionAt,
    getColouringValidationIssues,
} from '../src/features/modes/magicCanvas/colouringPages';
import { ColouringEngine } from '../src/features/modes/magicCanvas/colouringEngine';
import { DRAW_THIS_PROMPTS, getDrawThisPrompt } from '../src/features/modes/magicCanvas/drawThisPrompts';

const cfg = { perfTier: 'high' as const, reducedMotion: true };

describe('colouring pages', () => {
    it('ships 6 valid pages with the expected ids', () => {
        expect(COLOURING_PAGES.map((p) => p.id)).toEqual(['apple', 'star', 'fish', 'house', 'flower', 'balloon']);
        expect(getColouringValidationIssues()).toEqual([]);
    });

    it('point-in-polygon + regionAt resolve correctly', () => {
        const square = [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }];
        expect(pointInPolygon(0.5, 0.5, square)).toBe(true);
        expect(pointInPolygon(0.05, 0.05, square)).toBe(false);
        const house = getColouringPage('house')!;
        expect(regionAt(house, 0.5, 0.75)?.id).toBe('house-door'); // door sits on top of wall
        expect(regionAt(house, 0.05, 0.05)).toBeNull();             // outside everything
    });
});

describe('ColouringEngine — paint clips to regions + completion', () => {
    const sweepInside = (e: ColouringEngine, startInside: { x: number; y: number }) => {
        let now = 0;
        e.update({ pointer: startInside, pinch: false, hasHand: true, now: now++ });
        e.update({ pointer: startInside, pinch: true, hasHand: true, now: now++ }); // pen-down sets region
        for (let y = 0.06; y <= 0.94; y += 0.01) {
            for (let x = 0.06; x <= 0.94; x += 0.01) {
                e.update({ pointer: { x, y }, pinch: true, hasHand: true, now: now++ });
            }
        }
        e.update({ pointer: startInside, pinch: false, hasHand: true, now: now++ });
    };

    it('completes a single-region page when the region is coloured', () => {
        const e = new ColouringEngine(getColouringPage('star')!, 1000, 1000, cfg);
        let completed = 0;
        e.setCompletionCallback(() => { completed++; });
        sweepInside(e, { x: 0.5, y: 0.5 });
        expect(e.getSnapshot().completed).toBe(true);
        expect(e.getSnapshot().done).toBe(1);
        expect(completed).toBe(1); // fires once
    });

    it('does nothing when painting starts outside every region', () => {
        const e = new ColouringEngine(getColouringPage('star')!, 1000, 1000, cfg);
        let now = 0;
        e.update({ pointer: { x: 0.02, y: 0.02 }, pinch: false, hasHand: true, now: now++ });
        e.update({ pointer: { x: 0.02, y: 0.02 }, pinch: true, hasHand: true, now: now++ });
        e.update({ pointer: { x: 0.03, y: 0.03 }, pinch: true, hasHand: true, now: now++ });
        e.update({ pointer: { x: 0.03, y: 0.03 }, pinch: false, hasHand: true, now: now++ });
        expect(e.getSnapshot().done).toBe(0);
        expect(e.canUndo).toBe(false);
    });

    it('a multi-region page needs every region coloured to complete', () => {
        const e = new ColouringEngine(getColouringPage('house')!, 1000, 1000, cfg); // wall, roof, door
        // Colour just the roof.
        let now = 0;
        e.update({ pointer: { x: 0.5, y: 0.38 }, pinch: false, hasHand: true, now: now++ });
        e.update({ pointer: { x: 0.5, y: 0.38 }, pinch: true, hasHand: true, now: now++ });
        for (let x = 0.3; x <= 0.7; x += 0.01) for (let y = 0.3; y <= 0.49; y += 0.01) e.update({ pointer: { x, y }, pinch: true, hasHand: true, now: now++ });
        e.update({ pointer: { x: 0.5, y: 0.38 }, pinch: false, hasHand: true, now: now++ });
        const s = e.getSnapshot();
        expect(s.done).toBeGreaterThanOrEqual(1);
        expect(s.completed).toBe(false); // wall + door still empty
    });

    it('undo removes the last stroke', () => {
        const e = new ColouringEngine(getColouringPage('balloon')!, 1000, 1000, cfg);
        let now = 0;
        e.update({ pointer: { x: 0.5, y: 0.4 }, pinch: false, hasHand: true, now: now++ });
        e.update({ pointer: { x: 0.5, y: 0.4 }, pinch: true, hasHand: true, now: now++ });
        e.update({ pointer: { x: 0.52, y: 0.42 }, pinch: true, hasHand: true, now: now++ });
        e.update({ pointer: { x: 0.52, y: 0.42 }, pinch: false, hasHand: true, now: now++ });
        expect(e.canUndo).toBe(true);
        e.undo();
        expect(e.canUndo).toBe(false);
    });
});

describe('Draw This prompts', () => {
    it('ships the 6 prompts with sensible timers', () => {
        expect(DRAW_THIS_PROMPTS.map((p) => p.id)).toEqual(['sun', 'balloon', 'house', 'flower', 'fish', 'star']);
        for (const p of DRAW_THIS_PROMPTS) {
            expect(p.timerSeconds).toBeGreaterThanOrEqual(30);
            expect(typeof p.draw).toBe('function');
        }
        expect(getDrawThisPrompt('sun')?.instruction).toBe('Draw a sun');
    });
});
