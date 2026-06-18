/**
 * Stuck-trigger state machine (pure, framework-free, unit-tested).
 *
 * The feedback system's first job is to RESCUE a confused user, not to
 * poll them. This module decides — given a snapshot of the onboarding
 * screen's state — which rescue prompt (if any) should be on screen.
 *
 * It is deliberately pure: no React, no timers, no DOM. The owning
 * component samples its live state on an interval and feeds a snapshot
 * in; this function returns the prompt to show. That makes every
 * threshold and priority rule trivially testable.
 *
 * Triggers covered here (time/state-based):
 *   1. dwell_help   — >10s on the screen with no progress at all.
 *   2. gesture_demo — hand detected but wave not completed after 15s.
 *   3. camera_help  — camera permission denied / errored.
 *
 * Trigger 4 (exit micro-survey) is navigation-driven, and trigger 5
 * (post-success happiness) is success-driven; both are handled by their
 * own components rather than this selector.
 */

export type StuckPrompt =
    | 'none'
    | 'dwell_help'
    | 'gesture_demo'
    | 'camera_help';

/** Thresholds in one place so they are easy to tune from data. */
export const STUCK_THRESHOLDS = {
    /** Trigger 1: time on the onboarding screen before offering help. */
    dwellMs: 10_000,
    /** Trigger 2: time after a hand is first seen before showing the demo. */
    handNoWaveMs: 15_000,
} as const;

export type CameraStatus = 'idle' | 'requesting' | 'running' | 'error';

export interface StuckInput {
    /** Milliseconds since the onboarding screen mounted. */
    elapsedMs: number;
    /** Current camera/permission status from tracking diagnostics. */
    cameraStatus: CameraStatus;
    /** Has a hand ever been detected since mount? */
    handEverDetected: boolean;
    /** Elapsed-ms timestamp when the hand was FIRST detected (or null). */
    handDetectedAtMs: number | null;
    /** Has the wave gate been cleared? When true, nothing is shown. */
    waveCompleted: boolean;
    /** Prompts the user has explicitly dismissed — never re-shown. */
    dismissed: Partial<Record<StuckPrompt, boolean>>;
}

/**
 * Decide which rescue prompt should be visible.
 *
 * Priority order (highest first):
 *   camera_help  → a broken camera blocks everything else.
 *   gesture_demo → they're trying (hand seen) but not succeeding.
 *   dwell_help   → they've done nothing for a while; offer a hand.
 */
export function selectStuckPrompt(input: StuckInput): StuckPrompt {
    if (input.waveCompleted) return 'none';

    const dismissed = input.dismissed ?? {};

    // Trigger 3 — camera denied / errored. Highest priority: without a
    // working camera, no amount of gesture coaching helps.
    if (input.cameraStatus === 'error' && !dismissed.camera_help) {
        return 'camera_help';
    }

    // Trigger 2 — hand detected but the wave never completes. They are
    // engaged and trying; show them exactly what the gesture looks like.
    if (
        input.handDetectedAtMs !== null &&
        input.elapsedMs - input.handDetectedAtMs >= STUCK_THRESHOLDS.handNoWaveMs &&
        !dismissed.gesture_demo
    ) {
        return 'gesture_demo';
    }

    // Trigger 1 — sitting on the screen with no hand ever seen. They may
    // not realise the camera needs to see their hand. Offer help.
    if (
        input.elapsedMs >= STUCK_THRESHOLDS.dwellMs &&
        !input.handEverDetected &&
        !dismissed.dwell_help
    ) {
        return 'dwell_help';
    }

    return 'none';
}
