/**
 * Tracing Feedback — the coaching/correction state machine.
 *
 * Pure, deterministic, and unit-testable. It decides the ONE coaching
 * message shown at any moment (never several at once) and the vehicle's
 * visual state, applying hysteresis + minimum durations so nothing flickers
 * (Workstream 5). There are no harsh "red" failure states here — off-path is
 * a gentle nudge, and the message only appears after a meaningful delay.
 */

import type { VehicleState } from './tracingCharacter';
import { TRACING_TUNING } from './tracingThemes';

export type CoachId =
    | null
    | 'start'
    | 'pinch'
    | 'offpath'
    | 'lost'
    | 'encourage'
    | 'complete';

export interface FeedbackInput {
    now: number;
    /** Effective pinch (after grace window) — is the child "holding" the car. */
    pinching: boolean;
    /** Hand visible to the tracker this frame. */
    hasHand: boolean;
    /** Pointer is within the scoring corridor. */
    onPath: boolean;
    /** The current stroke has been started (left its start zone). */
    started: boolean;
    /** Pointer is within the current stroke's start zone. */
    nearStart: boolean;
    /** Activity finished. */
    completed: boolean;
    /** Whether the child is actively moving (for encouragement). */
    moving: boolean;
}

export interface FeedbackResult {
    coach: CoachId;
    message: string | null;
    vehicleState: VehicleState;
}

const MESSAGES: Record<NonNullable<CoachId>, string> = {
    start: 'Start at the green star!',
    pinch: 'Pinch your fingers to drive',
    offpath: 'Back to the road!',
    lost: 'Show me your hand 👋',
    encourage: 'Keep going!',
    complete: 'You traced it!',
};

export class FeedbackMachine {
    private offPathSince: number | null = null;
    private onPathSince: number | null = null;
    private lostSince: number | null = null;
    private lastCoach: CoachId = null;
    private lastEncourageAt = 0;
    private offPathMessageVisible = false;

    reset(): void {
        this.offPathSince = null;
        this.onPathSince = null;
        this.lostSince = null;
        this.lastCoach = null;
        this.lastEncourageAt = 0;
        this.offPathMessageVisible = false;
    }

    update(input: FeedbackInput): FeedbackResult {
        const {
            now,
            pinching,
            hasHand,
            onPath,
            started,
            nearStart,
            completed,
            moving,
        } = input;

        // Track off/on-path dwell for hysteresis.
        if (onPath) {
            if (this.onPathSince === null) this.onPathSince = now;
            this.offPathSince = null;
        } else {
            if (this.offPathSince === null) this.offPathSince = now;
            this.onPathSince = null;
        }

        // Track tracking-loss dwell.
        if (!hasHand) {
            if (this.lostSince === null) this.lostSince = now;
        } else {
            this.lostSince = null;
        }

        // Off-path message uses BOTH an appear delay and a dismiss delay so it
        // can't strobe at the corridor boundary.
        const offDwell = this.offPathSince !== null ? now - this.offPathSince : 0;
        const onDwell = this.onPathSince !== null ? now - this.onPathSince : 0;
        if (!onPath && started && pinching && offDwell >= TRACING_TUNING.offPathWarningDelayMs) {
            this.offPathMessageVisible = true;
        } else if (onPath && onDwell >= TRACING_TUNING.messageDismissDelayMs) {
            this.offPathMessageVisible = false;
        }

        // ── Priority ladder. Exactly one wins. ──────────────────────────────
        let coach: CoachId = null;
        let vehicleState: VehicleState = 'idle';

        if (completed) {
            coach = 'complete';
            vehicleState = 'celebrating';
        } else if (!hasHand && this.lostSince !== null && now - this.lostSince > TRACING_TUNING.trackingLossGraceMs) {
            // Hand has been gone past the grace window.
            coach = 'lost';
            vehicleState = 'idle';
        } else if (!pinching) {
            coach = 'pinch';
            vehicleState = 'ready';
        } else if (!started) {
            // Pinching but hasn't begun the stroke yet.
            coach = nearStart ? null : 'start';
            vehicleState = 'ready';
        } else if (this.offPathMessageVisible) {
            coach = 'offpath';
            vehicleState = 'returning';
        } else if (!onPath) {
            // Off-path but within the gentle grace before the message: just a
            // wobble, no words yet.
            coach = null;
            vehicleState = 'offPath';
        } else {
            // Happily on-path.
            vehicleState = moving ? 'moving' : 'idle';
            // Occasional, low-frequency encouragement (never nagging).
            if (moving && now - this.lastEncourageAt > 6000) {
                coach = 'encourage';
                this.lastEncourageAt = now;
            } else {
                coach = null;
            }
        }

        this.lastCoach = coach;
        return {
            coach,
            message: coach ? MESSAGES[coach] : null,
            vehicleState,
        };
    }

    get current(): CoachId {
        return this.lastCoach;
    }
}
