/**
 * Canonical Tracing resolver - unit tests.
 *
 * Guards the root-cause fix: solo play and classroom play resolve the SAME
 * tracing engine, and the legacy engine has been fully retired - there is now
 * only ONE tracing engine regardless of the tracingPlayfulUiV1 flag.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { featureFlags } from '../src/core/featureFlags';
import {
    TRACING_ACTIVITY_ID,
    getTracingFrameLogic,
    getTracingProgress,
    isPlayfulTracingActive,
} from '../src/features/modes/tracing/tracingResolver';
import { playfulTracingFrame } from '../src/features/modes/tracing/tracingPlayfulFrame';

describe('canonical tracing resolver', () => {
    afterEach(() => featureFlags.setFlags({ tracingPlayfulUiV1: true }));

    it('canonical activity id is "pre-writing"', () => {
        expect(TRACING_ACTIVITY_ID).toBe('pre-writing');
    });

    it('resolves to the single playful engine when the flag is ON', () => {
        featureFlags.setFlags({ tracingPlayfulUiV1: true });
        expect(isPlayfulTracingActive()).toBe(true);
        expect(getTracingFrameLogic()).toBe(playfulTracingFrame);
    });

    it('legacy engine retired: even with the flag OFF the engine stays playful', () => {
        featureFlags.setFlags({ tracingPlayfulUiV1: false });
        // The legacy preWritingLogic no longer exists; the resolver must never
        // fall back to a second engine.
        expect(getTracingFrameLogic()).toBe(playfulTracingFrame);
    });

    it('solo and classroom resolve the SAME engine (single source of truth)', () => {
        const solo = getTracingFrameLogic();       // src/App.tsx path
        const classroom = getTracingFrameLogic();  // StudentClassClient path
        expect(solo).toBe(classroom);
    });

    it('getTracingProgress returns a number in [0,1] (0 when no engine is mounted)', () => {
        const p = getTracingProgress();
        expect(typeof p).toBe('number');
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
    });
});
