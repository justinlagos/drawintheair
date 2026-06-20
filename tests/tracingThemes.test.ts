import { describe, it, expect } from 'vitest';
import {
    clampPx,
    vminOf,
    getTrackMetrics,
    corridorHalfWidthPx,
    resolveQuality,
    getTheme,
    TRACING_TUNING,
    ALL_THEME_IDS,
} from '../src/features/modes/tracing/tracingThemes';

describe('clampPx', () => {
    it('respects lower/upper bounds and preferred fraction', () => {
        expect(clampPx(46, 0.055, 82, 200)).toBe(46); // 0.055*200=11 -> clamp up to min
        expect(clampPx(46, 0.055, 82, 2000)).toBe(82); // 0.055*2000=110 -> clamp down to max
        expect(clampPx(46, 0.055, 82, 1000)).toBeCloseTo(55, 5); // within range
    });
});

describe('getTrackMetrics', () => {
    it('produces sane, ordered metrics across viewport sizes', () => {
        for (const [w, h] of [[1366, 768], [1920, 1080], [1024, 768]] as const) {
            const m = getTrackMetrics(w, h);
            expect(m.trackWidthPx).toBeGreaterThanOrEqual(46);
            expect(m.trackWidthPx).toBeLessThanOrEqual(82);
            expect(m.trackBorderPx).toBeLessThan(m.trackWidthPx);
            expect(m.centreGuidePx).toBeLessThan(m.trackBorderPx + 4);
            expect(m.startMarkerPx).toBeGreaterThan(m.vehiclePx);
        }
    });

    it('vminOf returns the smaller dimension', () => {
        expect(vminOf(1920, 1080)).toBe(1080);
    });
});

describe('corridorHalfWidthPx', () => {
    it('is wider than visual tolerance and gives pack 1-2 a beginner bonus', () => {
        const p1 = corridorHalfWidthPx(24, 1, 1920, 1080);
        const p3 = corridorHalfWidthPx(24, 3, 1920, 1080);
        expect(p1).toBeGreaterThan(p3); // beginner bonus
        // Corridor exceeds the raw authored tolerance (more forgiving).
        expect(p3).toBeGreaterThan(24 * TRACING_TUNING.corridorToVisualRatio * 0.9);
    });
});

describe('resolveQuality', () => {
    it('low tier disables glow and particles', () => {
        const q = resolveQuality('low', false);
        expect(q.glow).toBe(false);
        expect(q.maxParticles).toBe(0);
        expect(q.cacheStaticLayers).toBe(true);
    });

    it('reduced motion stops animation and trims particles regardless of tier', () => {
        const q = resolveQuality('high', true);
        expect(q.animate).toBe(false);
        expect(q.maxParticles).toBeLessThanOrEqual(4);
    });
});

describe('getTheme', () => {
    it('returns known themes and falls back to meadow', () => {
        expect(getTheme('alphabet').id).toBe('alphabet');
        expect(getTheme('number').id).toBe('number');
        expect(getTheme('does-not-exist').id).toBe('meadow');
        expect(ALL_THEME_IDS).toContain('meadow');
    });
});
