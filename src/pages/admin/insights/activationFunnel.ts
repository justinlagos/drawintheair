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
    mode_completions: number;
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
        { label: '★ First activity completed', n: m.mode_completions, isActivation: true },
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

/** Activation rate = first completions ÷ sessions started, as a %. */
export function activationRate(m: ActivationMetrics): number {
    return pct(m.mode_completions, m.sessions_started);
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
