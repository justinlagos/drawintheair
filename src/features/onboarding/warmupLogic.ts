/**
 * Warm-up tutorial logic (pure, unit-tested).
 *
 * "Can you pop 3 balloons?" — wave, point, pinch. Doing each gesture
 * once, successfully, teaches the entire interaction vocabulary with no
 * text and no language dependency. The first guaranteed success is the
 * psychological hook activation depends on, so every step is FORGIVING:
 * loose thresholds, and an auto-advance safety net so a child is never
 * stuck (the tutorial's job is to make them feel capable, not to test).
 *
 * This module is gesture-detection state only — no React, no DOM.
 */

export type WarmupGesture = 'wave' | 'point' | 'pinch';

export const WARMUP_STEPS: readonly WarmupGesture[] = ['wave', 'point', 'pinch'];

export const WARMUP_TUNING = {
    /** Direction reversals of the hand needed to count as a wave. */
    waveReversals: 3,
    /** Min horizontal delta (normalised) to count as intentional motion. */
    waveMinDelta: 0.03,
    /** Hold a still, open hand this long to count as a point. */
    pointHoldMs: 700,
    /** Horizontal motion below this counts as "still" for pointing. */
    pointStillDelta: 0.02,
    /** Hold a pinch this long to count it. */
    pinchHoldMs: 150,
    /** Safety net: satisfy the current step after this long regardless,
     *  so nobody is ever stuck. Guarantees the first success. */
    autoAdvanceMs: 9000,
} as const;

/** A normalised per-frame sample the component feeds in. */
export interface WarmupFrame {
    hasHand: boolean;
    /** Index-finger-tip x in 0..1 (mirrored), or null when no hand. */
    indexX: number | null;
    pinchActive: boolean;
}

export interface WarmupState {
    stepIndex: number;
    completed: boolean;
    /** ms timestamp the current step began (for auto-advance + holds). */
    stepStartedAt: number;
    // wave accumulators
    prevX: number | null;
    lastDir: number; // -1, 0, 1
    reversals: number;
    // hold accumulators (point / pinch)
    holdStartedAt: number | null;
}

export function createWarmupState(now: number): WarmupState {
    return {
        stepIndex: 0,
        completed: false,
        stepStartedAt: now,
        prevX: null,
        lastDir: 0,
        reversals: 0,
        holdStartedAt: null,
    };
}

/** The gesture the user is currently being asked to perform. */
export function currentGesture(s: WarmupState): WarmupGesture | null {
    return WARMUP_STEPS[s.stepIndex] ?? null;
}

function resetStep(s: WarmupState, now: number): WarmupState {
    return {
        ...s,
        stepStartedAt: now,
        prevX: null,
        lastDir: 0,
        reversals: 0,
        holdStartedAt: null,
    };
}

/**
 * Advance the machine by one frame. Returns a new state. When the current
 * gesture is satisfied (or auto-advances), stepIndex increments; when the
 * last step is satisfied, `completed` flips true.
 */
export function advanceWarmup(
    state: WarmupState,
    frame: WarmupFrame,
    now: number,
): WarmupState {
    if (state.completed) return state;
    const gesture = currentGesture(state);
    if (!gesture) return { ...state, completed: true };

    let s = state;
    let satisfied = false;

    if (gesture === 'wave') {
        if (frame.hasHand && frame.indexX !== null) {
            if (s.prevX !== null) {
                const dx = frame.indexX - s.prevX;
                if (Math.abs(dx) >= WARMUP_TUNING.waveMinDelta) {
                    const dir = dx > 0 ? 1 : -1;
                    if (s.lastDir !== 0 && dir !== s.lastDir) {
                        s = { ...s, reversals: s.reversals + 1 };
                    }
                    s = { ...s, lastDir: dir };
                }
            }
            s = { ...s, prevX: frame.indexX };
        }
        satisfied = s.reversals >= WARMUP_TUNING.waveReversals;
    } else if (gesture === 'point') {
        // A still, open (non-pinching) hand.
        const still =
            frame.hasHand &&
            !frame.pinchActive &&
            (s.prevX === null ||
                frame.indexX === null ||
                Math.abs((frame.indexX ?? 0) - (s.prevX ?? 0)) < WARMUP_TUNING.pointStillDelta);
        if (still) {
            const startedAt = s.holdStartedAt ?? now;
            s = { ...s, holdStartedAt: startedAt, prevX: frame.indexX };
            satisfied = now - startedAt >= WARMUP_TUNING.pointHoldMs;
        } else {
            s = { ...s, holdStartedAt: null, prevX: frame.indexX };
        }
    } else {
        // pinch
        if (frame.pinchActive) {
            const startedAt = s.holdStartedAt ?? now;
            s = { ...s, holdStartedAt: startedAt };
            satisfied = now - startedAt >= WARMUP_TUNING.pinchHoldMs;
        } else {
            s = { ...s, holdStartedAt: null };
        }
    }

    // Safety net — never let a child be stuck.
    if (!satisfied && now - s.stepStartedAt >= WARMUP_TUNING.autoAdvanceMs) {
        satisfied = true;
    }

    if (satisfied) {
        const nextIndex = s.stepIndex + 1;
        if (nextIndex >= WARMUP_STEPS.length) {
            return { ...s, stepIndex: nextIndex, completed: true };
        }
        return resetStep({ ...s, stepIndex: nextIndex }, now);
    }

    return s;
}
