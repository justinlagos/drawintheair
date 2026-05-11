/**
 * featureFlags — deterministic A/B assignment on device_id.
 *
 * The device_id is a per-browser UUID stored in localStorage by analytics.ts
 * (key 'dita_device_id'). Hashing it modulo 100 gives a stable bucket between
 * 0–99 — so every reload routes the same browser to the same variant for the
 * life of that UUID.
 *
 * We expose:
 *   - flag(name, splits)  → variant string
 *   - exposeOnce(name)    → fires feature_flag_exposed event exactly once per
 *                            session for the flag (use this when the flag's
 *                            UI actually renders, so attribution stays clean).
 *
 * Splits are declared as an object whose values sum to 100. Example:
 *   flag('camera_explainer_v1', { treatment: 50, control: 50 })
 *
 * Why deterministic-by-device, not coin-flip-on-load:
 *   1. A user who reloads must NOT bounce between arms.
 *   2. The A/B comparison is across people, not pageviews.
 *   3. analytics_events.device_id already carries this same ID, so a single
 *      SQL query can compute lift without an extra join.
 */

import { logEvent } from './analytics';

const DEVICE_KEY = 'dita_device_id';

/** Tiny stable string hash (FNV-1a 32-bit). Good enough for buckets. */
function hashString(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
}

function readDeviceId(): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        return localStorage.getItem(DEVICE_KEY);
    } catch {
        return null;
    }
}

/**
 * Resolve a variant for a flag. `splits` values must sum to 100.
 * Variants are sorted alphabetically for deterministic bucket assignment.
 * If device_id isn't available yet (e.g. SSR), returns the first variant —
 * caller should re-read once analytics is initialised.
 */
export function flag<T extends Record<string, number>>(name: string, splits: T): keyof T {
    const variants = Object.keys(splits).sort() as Array<keyof T>;
    if (variants.length === 0) {
        throw new Error(`featureFlags: empty splits for "${name}"`);
    }

    const sum = variants.reduce((acc, v) => acc + splits[v], 0);
    if (sum !== 100) {
        // Misconfigured flag — fall back to first variant rather than crash.
        // The dev should notice in the analytics dashboard.
        if (typeof console !== 'undefined') {
            console.warn(`featureFlags: splits for "${name}" sum to ${sum} not 100`);
        }
        return variants[0];
    }

    const id = readDeviceId();
    if (!id) return variants[0];

    const bucket = hashString(`${name}::${id}`) % 100;

    let cumulative = 0;
    for (const v of variants) {
        cumulative += splits[v];
        if (bucket < cumulative) return v;
    }
    return variants[variants.length - 1];
}

/** Fires feature_flag_exposed at most once per session per flag. */
const exposedThisSession = new Set<string>();
export function exposeOnce(name: string, variant: string): void {
    if (exposedThisSession.has(name)) return;
    exposedThisSession.add(name);
    logEvent('feature_flag_exposed', {
        meta: { flag_name: name, variant },
    });
}
