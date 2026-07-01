/**
 * Activation funnel — pure helpers (unit-tested).
 *
 * Activation is the one metric everything optimises toward:
 *   ★ a child successfully completes their first activity ★
 * (the first `mode_completed` event in a session).
 *
 * This module turns the already-computed executive metrics into an
 * ordered funnel with step-to-step conversion, and computes the headline
 * activation rate. No React, no network — just arithmetic.
 */

export interface ActivationMetrics {
    sessions_started: number;
    cam_granted: number;
    tracker_ok: number;
    mode_starts?: number;
    /** Count of `mode_completed` EVENTS (fires per stage/letter, so it
     *  can exceed the number of sessions). Use only for raw volume — NOT
     *  as an activation numerator. */
    mode_completions: number;
    /** Distinct SESSIONS with at least one `mode_completed` (each session
     *  counted once). This is the honest activation numerator; it can
     *  never exceed `sessions_started`. Returned by
     *  dashboard_executive_summary.curr_metrics.sessions_completed. */
    sessions_completed?: number;
}

export interface ActivationStep {
    label: string;
    n: number;
    /** % of the top of the funnel (sessions started). */
    pctOfTop: number;
    /** % converted from the previous step. */
    pctOfPrev: number;
    /** True for the activation step itself. */
    isActivation?: boolean;
}

const pct = (num: number, den: number): number =>
    den > 0 ? +((num / den) * 100).toFixed(1) : 0;

/** Build the ordered activation funnel from executive metrics. */
export function buildActivationFunnel(m: ActivationMetrics): ActivationStep[] {
    const raw = [
        { label: 'Sessions started', n: m.sessions_started },
        { label: 'Camera granted', n: m.cam_granted },
        { label: 'Tracker ready', n: m.tracker_ok },
        { label: 'Activity started', n: m.mode_starts ?? m.mode_completions },
        {
            label: '★ First activity completed',
            // Distinct activated sessions, so the activation step can never
            // exceed the top of the funnel (was mode_completions = events,
            // which produced the impossible 106% / 105.7%).
            n: m.sessions_completed ?? m.mode_completions,
            isActivation: true,
        },
    ];
    const top = raw[0].n;
    return raw.map((s, i) => ({
        label: s.label,
        n: s.n,
        isActivation: s.isActivation,
        pctOfTop: pct(s.n, top),
        pctOfPrev: i === 0 ? 100 : pct(s.n, raw[i - 1].n),
    }));
}

/**
 * Activation rate = distinct sessions that completed their first activity
 * ÷ distinct sessions started, as a %.
 *
 * Uses `sessions_completed` (distinct sessions), NOT `mode_completions`
 * (event count) — the latter fires per stage/letter and produced the
 * impossible 105.7%. Each session counts once, so the rate is bounded
 * to [0, 100]; the clamp is a defensive guard, not a fudge (a child
 * completing five activities is still one activated session).
 */
export function activationRate(m: ActivationMetrics): number {
    const activated = m.sessions_completed ?? m.mode_completions;
    return Math.min(100, pct(activated, m.sessions_started));
}

/** The single biggest drop in the funnel — where to focus next. */
export function biggestDropStep(steps: ActivationStep[]): ActivationStep | null {
    let worst: ActivationStep | null = null;
    for (let i = 1; i < steps.length; i++) {
        if (worst === null || steps[i].pctOfPrev < worst.pctOfPrev) {
            worst = steps[i];
        }
    }
    return worst;
}
