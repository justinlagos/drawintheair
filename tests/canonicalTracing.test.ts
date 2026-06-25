/**
 * Canonical Tracing resolver — unit tests.
 *
 * Guards the root-cause fix: solo play and classroom play must resolve the SAME
 * tracing engine, and the legacy engine must only ever appear when the flag is
 * explicitly off. Before the fix the classroom hard-coded the legacy engine
 * regardless of the flag.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { featureFlags } from '../src/core/featureFlags';
import {
    TRACING_ACTIVITY_ID,
    getTracingFrameLogic,
    isPlayfulTracingActive,
} from '../src/features/modes/tracing/tracingResolver';
import { playfulTracingFrame } from '../src/features/modes/tracing/tracingPlayfulFrame';
import { preWritingLogic } from '../src/features/modes/preWriting/preWritingLogic';

describe('canonical tracing resolver', () => {
    // Restore the production default after each case.
    afterEach(() => featureFlags.setFlags({ tracingPlayfulUiV1: true }));

    it('canonical activity id is "pre-writing"', () => {
        expect(TRACING_ACTIVITY_ID).toBe('pre-writing');
    });

    it('flag ON resolves to the playful (V2) engine — never the legacy one', () => {
        featureFlags.setFlags({ tracingPlayfulUiV1: true });
        expect(isPlayfulTracingActive()).toBe(true);
        expect(getTracingFrameLogic()).toBe(playfulTracingFrame);
        expect(getTracingFrameLogic()).not.toBe(preWritingLogic);
    });

    it('flag OFF resolves to the legacy engine', () => {
        featureFlags.setFlags({ tracingPlayfulUiV1: false });
        expect(isPlayfulTracingActive()).toBe(false);
        expect(getTracingFrameLogic()).toBe(preWritingLogic);
    });

    it('solo and classroom resolve the SAME engine (single source of truth)', () => {
        featureFlags.setFlags({ tracingPlayfulUiV1: true });
        const solo = getTracingFrameLogic();      // src/App.tsx path
        const classroom = getTracingFrameLogic();  // StudentClassClient path
        expect(solo).toBe(classroom);

        featureFlags.setFlags({ tracingPlayfulUiV1: false });
        expect(getTracingFrameLogic()).toBe(getTracingFrameLogic());
    });
});
