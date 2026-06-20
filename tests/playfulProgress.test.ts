import { describe, it, expect, beforeEach } from 'vitest';
import {
    getCurrentActivity,
    getCurrentPack,
    setSection,
    advance,
    getSections,
    getPackProgress,
    completeCurrent,
    resetPlayfulProgress,
} from '../src/features/modes/tracing/playfulProgress';

beforeEach(() => resetPlayfulProgress());

describe('playful tracing progression (single source of truth)', () => {
    it('exposes all four sections with correct totals', () => {
        const s = getSections();
        expect(s.map((x) => x.total)).toEqual([1, 4, 26, 10]); // warm-up, shapes, letters, numbers
    });

    it('jumps straight to any section', () => {
        setSection(3, 0); // letters
        expect(getCurrentPack()).toBe(3);
        expect(getCurrentActivity()?.id).toBe('letter-A');
        setSection(4, 0); // numbers
        expect(getCurrentActivity()?.id).toBe('number-1');
    });

    it('advances through a whole section and never gets stuck (wraps around)', () => {
        setSection(4, 0); // numbers (10) — the "stuck on 10" case
        const seen: string[] = [];
        for (let i = 0; i < 10; i++) { seen.push(getCurrentActivity()!.id); advance(); }
        expect(seen).toEqual(['number-1','number-2','number-3','number-4','number-5','number-6','number-7','number-8','number-9','number-10']);
        // After number-10, advance must move on (wrap to pack 1), not stall.
        expect(getCurrentPack()).toBe(1);
        expect(getCurrentActivity()?.id).toBe('warmup-v1');
    });

    it('advancing the very last pack/item wraps to the first section', () => {
        setSection(4, 9); // number-10 (last activity overall)
        advance();
        expect(getCurrentPack()).toBe(1);
    });

    it('tracks completion per section', () => {
        setSection(2, 0);
        completeCurrent();
        expect(getPackProgress(2).completed).toBe(1);
    });
});
