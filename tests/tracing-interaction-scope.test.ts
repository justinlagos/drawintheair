/**
 * Tracing interaction-scope — unit tests.
 *
 * Guards the category-selection UX fix: while the category picker is up the
 * tracing engine must be DISARMED — it renders nothing and consumes no input,
 * so there is exactly one active interaction scope and no trace appears behind
 * the cards. Once the child picks a category the engine is armed and processes
 * input. See tracingPlayfulFrame.ts (`setPlayfulActive`) + TracingModePlayful.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
    initPlayfulTracing,
    playfulTracingFrame,
    setPlayfulActive,
    isPlayfulActive,
    playfulInitFailed,
} from '../src/features/modes/tracing/tracingPlayfulFrame';
import { setSection } from '../src/features/modes/tracing/playfulProgress';

const W = 1280;
const H = 720;

/** A permissive recording 2D context that survives the engine's render(). */
function makeRecordingCtx() {
    const calls: string[] = [];
    const handler: ProxyHandler<object> = {
        get(_t, prop) {
            const name = String(prop);
            if (name === 'canvas') return { width: W, height: H };
            if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') {
                return () => ({ addColorStop() { /* noop */ } });
            }
            if (name === 'measureText') return () => ({ width: 10 });
            if (name === 'getImageData') return () => ({ data: [] });
            return (..._args: unknown[]) => { calls.push(name); return undefined; };
        },
        set() { return true; },
    };
    return { ctx: new Proxy({}, handler) as unknown as CanvasRenderingContext2D, calls };
}

function frame(now: number, pinch = true) {
    return {
        filteredPoint: { x: 0.5, y: 0.5 },
        rawPoint: { x: 0.5, y: 0.5 },
        pinchActive: pinch,
        hasHand: true,
        timestamp: now,
    } as never;
}

describe('tracing interaction scope', () => {
    beforeEach(() => {
        setSection(1, 0); // Warm-up Lines
        initPlayfulTracing(W, H);
    });

    it('engine initialises cleanly', () => {
        expect(playfulInitFailed()).toBe(false);
    });

    it('DISARMED (category picker up): clears the canvas and runs no engine render', () => {
        setPlayfulActive(false);
        expect(isPlayfulActive()).toBe(false);
        const { ctx, calls } = makeRecordingCtx();
        playfulTracingFrame(ctx, frame(1000), W, H, null);
        // Only the clear happened — the engine never drew a trace behind the cards.
        expect(calls).toEqual(['clearRect']);
    });

    it('ARMED (draw phase): the engine renders the scene', () => {
        setPlayfulActive(true);
        expect(isPlayfulActive()).toBe(true);
        const { ctx, calls } = makeRecordingCtx();
        playfulTracingFrame(ctx, frame(2000), W, H, null);
        // Real rendering produces many more canvas ops than a bare clear.
        expect(calls.length).toBeGreaterThan(1);
    });

    it('re-disarming (back to picker) stops engine rendering again', () => {
        setPlayfulActive(true);
        playfulTracingFrame(makeRecordingCtx().ctx, frame(3000), W, H, null);

        setPlayfulActive(false);
        const { ctx, calls } = makeRecordingCtx();
        playfulTracingFrame(ctx, frame(3016), W, H, null);
        expect(calls).toEqual(['clearRect']);
    });
});
