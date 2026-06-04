/**
 * LIOS Adaptive Engine, client hook.
 *
 * Calls `lios_recommend_next` server-side after each item attempt and
 * returns the engine's recommendation (next item / scaffold / reward /
 * break suggestion / regime / reasoning) plus the audit_id so the
 * caller can correlate.
 *
 * Feature-flag gated by default. Initial deployment mode is
 * SHADOW, the hook calls the engine and logs the recommendation
 * but the game mode keeps using its own item-selection logic. Once
 * the audit log shows stable, sensible decisions, the flag is flipped
 * to LIVE and the recommendation actually drives the next item.
 *
 * Privacy posture: the hook only sends device_id (pseudonymous),
 * session_id (per-tab UUID), and the last item attempted. No PII,
 * no coordinates, no learner identity ever transits.
 */

import { useCallback, useRef, useState } from 'react';
import { getSupabaseUrl, getAccessToken, getAnonKey } from './supabase';
import { analytics } from './analytics';

export type AdaptiveRegime =
    | 'fresh' | 'flow' | 'productive' | 'boredom' | 'frustration';
export type AdaptiveScaffold = 'none' | 'partial' | 'full';
export type AdaptiveReward = 'quiet' | 'standard' | 'big';

export interface AdaptiveDecision {
    audit_id: string;
    next_item: string | null;
    scaffold_level: AdaptiveScaffold;
    reward_intensity: AdaptiveReward;
    suggest_break: boolean;
    regime: AdaptiveRegime;
    recovery_step: number | null;
    p_expected: number | null;
    invariants_applied: string[];
    reasoning: string;
}

export interface UseAdaptiveEngineOptions {
    /**
     * Game mode key (e.g. 'pre-writing', 'gesture-spelling'). Required.
     */
    gameMode: string;
    /**
     * 'shadow'  → call the engine, log + return, but the caller does
     *             NOT have to use the recommendation. Safe default.
     * 'live'    → caller is expected to use the recommendation
     *             (UX choice, the hook itself behaves identically).
     */
    mode?: 'shadow' | 'live';
    /** Server-side RPC bind name (override only for testing). */
    rpcName?: string;
}

export interface AdaptiveEngineApi {
    /**
     * Call after each item attempt resolves. Returns the engine's
     * recommendation, or null if the call errored / the engine
     * isn't reachable. Failures are silent, the caller's existing
     * item-selection logic continues regardless.
     */
    recommend: (
        currentItem: string | null,
        wasCorrect: boolean | null,
    ) => Promise<AdaptiveDecision | null>;
    /** Most recent decision, or null. */
    lastDecision: AdaptiveDecision | null;
    /** Engine availability flag, driven by latest call. */
    available: boolean;
    /** Currently pending? */
    pending: boolean;
}

/**
 * Imperative version of the hook, call from anywhere without
 * React. Used by the analytics layer's auto-shadow trigger so every
 * `item_dropped` event invokes the engine when the feature flag is on.
 */
export async function requestAdaptiveRecommendation(
    gameMode: string,
    currentItem: string | null,
    wasCorrect: boolean | null,
): Promise<AdaptiveDecision | null> {
    const sessionId = analytics.getSessionId();
    const deviceId  = analytics.getDeviceId();
    if (!sessionId || !deviceId) return null;

    try {
        const res = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/lios_recommend_next`, {
            method: 'POST',
            headers: {
                apikey: getAnonKey(),
                Authorization: `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                p_device_id:    deviceId,
                p_session_id:   sessionId,
                p_game_mode:    gameMode,
                p_current_item: currentItem,
                p_was_correct:  wasCorrect,
            }),
        });
        if (!res.ok) return null;
        return await res.json() as AdaptiveDecision;
    } catch {
        return null;
    }
}

/**
 * Feature flag, resolved at call time. Sources, in order:
 *   1. URL param ?lios_adaptive=shadow|live|off
 *   2. localStorage key 'lios_adaptive_mode'
 *   3. default 'off'
 *
 * 'shadow' mode means: call the engine after every item_dropped and
 *  log the decision, but the game mode's own item selection is not
 *  overridden. This is the safe default for first rollout, the
 *  audit log fills with real decisions, engineering reviews them,
 *  and only then is the flag flipped to 'live'.
 */
export function getAdaptiveEngineMode(): 'shadow' | 'live' | 'off' {
    if (typeof window === 'undefined') return 'off';
    try {
        const param = new URLSearchParams(window.location.search).get('lios_adaptive');
        if (param === 'shadow' || param === 'live' || param === 'off') {
            try { localStorage.setItem('lios_adaptive_mode', param); } catch { /* ignore */ }
            return param;
        }
        const stored = localStorage.getItem('lios_adaptive_mode');
        if (stored === 'shadow' || stored === 'live') return stored;
    } catch { /* private mode */ }
    return 'off';
}

export function useAdaptiveEngine(opts: UseAdaptiveEngineOptions): AdaptiveEngineApi {
    const [lastDecision, setLastDecision] = useState<AdaptiveDecision | null>(null);
    const [available, setAvailable] = useState<boolean>(true);
    const [pending, setPending] = useState<boolean>(false);
    const inflight = useRef<Promise<AdaptiveDecision | null> | null>(null);

    const rpcName = opts.rpcName ?? 'lios_recommend_next';

    const recommend = useCallback(async (
        currentItem: string | null,
        wasCorrect: boolean | null,
    ): Promise<AdaptiveDecision | null> => {
        const sessionId = analytics.getSessionId();
        const deviceId  = analytics.getDeviceId();
        if (!sessionId || !deviceId) {
            // No session, the engine has nothing to reason about.
            return null;
        }
        // Prevent concurrent calls for the same hook instance,
        // a second `recommend` while one is in flight reuses it.
        if (inflight.current) return inflight.current;

        setPending(true);
        const url = `${getSupabaseUrl()}/rest/v1/rpc/${rpcName}`;
        const body = {
            p_device_id:    deviceId,
            p_session_id:   sessionId,
            p_game_mode:    opts.gameMode,
            p_current_item: currentItem,
            p_was_correct:  wasCorrect,
        };
        const promise = (async () => {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        apikey: getAnonKey(),
                        Authorization: `Bearer ${getAccessToken()}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });
                if (!res.ok) {
                    // 401 = not authenticated (anon role can't call the
                    // SECURITY DEFINER engine). 5xx = transient. Either
                    // way we silently surface "not available" so the
                    // caller keeps using its own item selection.
                    setAvailable(false);
                    return null;
                }
                const decision = (await res.json()) as AdaptiveDecision;
                setLastDecision(decision);
                setAvailable(true);

                // Mirror the decision into the local analytics event
                // stream as a 'feature_flag_exposed' marker so the
                // engagement/error dashboards can see when adaptive
                // calls happen alongside everything else. Keeps the
                // wiring observable from the existing dashboards.
                analytics.exposeFeatureFlag(
                    `adaptive_engine.${opts.mode ?? 'shadow'}`,
                    decision.regime,
                );
                return decision;
            } catch {
                setAvailable(false);
                return null;
            } finally {
                setPending(false);
                inflight.current = null;
            }
        })();
        inflight.current = promise;
        return promise;
    }, [opts.gameMode, opts.mode, rpcName]);

    return { recommend, lastDecision, available, pending };
}
