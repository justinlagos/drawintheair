/**
 * PostHog, product behaviour analytics for Draw in the Air.
 *
 * Owns: funnel telemetry (camera grant → tracker → first activity →
 * completion), classroom flows, building mode interactions. Strictly
 * COPPA/GDPR-conscious: no autocapture, no session recording, masked
 * inputs, respect_dnt, pseudonymous IDs only.
 *
 * Does NOT own: errors (Sentry) or learning telemetry (LIOS).
 *
 * The existing LIOS pipeline (src/lib/analytics.ts → Supabase
 * analytics_events) is untouched. PostHog runs ALONGSIDE LIOS to give
 * us live funnel visibility without rewriting the canonical event
 * vocabulary.
 *
 * Privacy contract:
 *   • No child names, no webcam footage, no raw landmark coordinates.
 *   • Only properties on PH_PROPERTY_ALLOWLIST are forwarded.
 *   • Identify by pseudonymous device_id only.
 *   • Respect Do-Not-Track and any saved cookie consent.
 *
 * No-op behaviour: if VITE_POSTHOG_KEY is empty, init is skipped and
 * trackEvent / identify silently no-op.
 */

import posthog from 'posthog-js';

// ─── Allow-lists (the privacy guarantee) ─────────────────────────────────────

/**
 * Events we forward to PostHog. The list mirrors a subset of LIOS
 * EventName, funnel and product-behaviour events only. Learning
 * telemetry stays in LIOS where it belongs.
 *
 * Adding to this list is a privacy review.
 */
export const PH_EVENT_ALLOWLIST = new Set<string>([
    // Acquisition
    'landing_view',
    'landing_engaged',
    'cta_click',
    'try_free_clicked',
    // Activation funnel
    'age_band_selected',
    'camera_explainer_shown',
    'camera_explainer_continue',
    'camera_explainer_dismissed',
    'camera_requested',
    'camera_granted',
    'camera_denied',
    'camera_retry_failed',
    'tracker_init_started',
    'tracker_init_succeeded',
    'tracker_init_failed',
    'wave_screen_view',
    'wave_first_hand_seen',
    'wave_completed',
    // Mode lifecycle
    'menu_opened',
    'mode_selected',
    'mode_started',
    'mode_completed',
    'mode_abandoned',
    'stage_started',
    'stage_completed',
    // Stuck / friction
    'stuck_detected',
    'activity_retry',
    // Classroom
    'class_session_created',
    'class_session_started',
    'class_session_ended',
    'class_student_joined',
    'class_student_disconnected',
    'class_student_reconnected',
    'class_activity_started',
    'class_activity_ended',
    'classroom_sync_failure',
    // Building mode
    'build_world_selected',
    'build_object_started',
    'piece_grabbed',
    'piece_placed',
    'successful_snap',
    'wrong_piece_attempt',
    'build_object_completed',
    'build_abandoned',
    // System health
    'route_view',
    'app_crash',
    'asset_load_failed',
    'dynamic_import_failed',
]);

/**
 * Properties we forward with events. Anything not in this set is
 * dropped at the trackEvent boundary. New properties require a
 * privacy review.
 */
export const PH_PROPERTY_ALLOWLIST = new Set<string>([
    // Context (set per-event)
    'route',
    'game_mode',
    'stage_id',
    'stage_index',
    'device_type',          // 'mobile' | 'tablet' | 'desktop'
    'browser',              // 'chrome' | 'safari' | 'firefox' | 'edge' | 'other'
    'os',                   // 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'other'
    'surface',              // 'home' | 'classroom'
    'age_band',             // '3-4' | '4-5' | '5-6' | '6-7' | etc.
    'country',              // ISO code, set by PostHog from IP
    'session_id',           // pseudonymous
    'class_session_id',     // pseudonymous
    'first_time',           // boolean
    'teacher_led',          // boolean
    'app_version',
    'environment',
    // Funnel-specific
    'cta_source',
    'duration_ms',
    'time_on_page_ms',
    'scroll_depth_pct',
    'init_duration_ms',
    'delegate',             // 'GPU' | 'CPU' for tracker
    'code',                 // failure code (no message, codes only)
    'mode',                 // game mode for build_world_selected etc.
    'world_id',
    'object_id',
    'piece_id',
    'target_zone_id',
    'was_first_attempt',
    'reason',               // 'back_button' | 'tab_hidden' etc., bounded set
    'attempt_count',
]);

// ─── Internal state ──────────────────────────────────────────────────────────

let initialized = false;
let active = false;

interface PhContext {
    deviceType?: string;
    browser?: string;
    os?: string;
    appVersion?: string;
    environment?: string;
}
const persistentContext: PhContext = {};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectDeviceType(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile';
    return 'desktop';
}

function detectBrowser(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return 'edge';
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'chrome';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari';
    if (/Firefox\//.test(ua)) return 'firefox';
    return 'other';
}

function detectOs(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Mac OS X/.test(ua)) return 'macos';
    if (/Windows/.test(ua)) return 'windows';
    if (/Linux/.test(ua)) return 'linux';
    return 'other';
}

function whitelistProps(props: Record<string, unknown> | undefined): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (!props) return out;
    for (const [k, v] of Object.entries(props)) {
        if (!PH_PROPERTY_ALLOWLIST.has(k)) continue;
        if (v === undefined) continue;
        // Coerce non-primitives to safe shapes, primitives + short strings + bounded arrays only.
        if (
            typeof v === 'string' ||
            typeof v === 'number' ||
            typeof v === 'boolean' ||
            v === null
        ) {
            out[k] = v;
        } else if (Array.isArray(v)) {
            // Allow short string/number arrays only.
            const filtered = v.filter(
                (x) => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean',
            );
            if (filtered.length <= 32) out[k] = filtered;
        }
        // Objects deliberately dropped, keep events flat.
    }
    return out;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function initPostHog(): void {
    if (initialized) return;
    initialized = true;

    const key = (import.meta.env.VITE_POSTHOG_KEY as string | undefined)?.trim();
    if (!key) return;

    const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined)?.trim() || 'https://eu.i.posthog.com';

    persistentContext.deviceType = detectDeviceType();
    persistentContext.browser = detectBrowser();
    persistentContext.os = detectOs();
    persistentContext.appVersion = (import.meta.env.VITE_APP_VERSION as string | undefined) || '0.0.0-dev';
    persistentContext.environment = (import.meta.env.VITE_APP_ENV as string | undefined) || 'development';

    posthog.init(key, {
        api_host: host,
        // Privacy-first defaults, every one of these matters.
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_performance: false,
        capture_dead_clicks: false,
        disable_session_recording: true,
        session_recording: {
            maskAllInputs: true,
            maskTextSelector: '*',
        },
        mask_all_text: true,
        mask_all_element_attributes: true,
        respect_dnt: true,
        // Pseudonymous IDs only.
        person_profiles: 'identified_only',
        // Never persist across tabs in a way that could pick up other users.
        persistence: 'memory',
        // Drop GET params from properties, they can carry tokens.
        sanitize_properties: (properties) => {
            if (properties.$current_url) {
                try {
                    const u = new URL(properties.$current_url as string);
                    properties.$current_url = u.origin + u.pathname;
                    properties.$pathname = u.pathname;
                } catch {
                    // ignore
                }
            }
            delete properties.$referrer;
            delete properties.$initial_referrer;
            return properties;
        },
        loaded: (ph) => {
            // Register session-level properties so every event carries
            // device/browser/version without each call having to pass them.
            ph.register({
                device_type: persistentContext.deviceType,
                browser: persistentContext.browser,
                os: persistentContext.os,
                app_version: persistentContext.appVersion,
                environment: persistentContext.environment,
            });
        },
    });

    active = true;
}

/**
 * Track a product-analytics event. Drops anything not on the
 * event/property allow-list. Safe to call before init / when PostHog
 * is disabled, it silently no-ops.
 */
export function trackEvent(
    name: string,
    properties: Record<string, unknown> = {},
): void {
    if (!active) return;
    if (!PH_EVENT_ALLOWLIST.has(name)) {
        // Unknown event, silently drop. We do NOT want a stray event
        // to leak through with un-vetted properties.
        return;
    }
    try {
        posthog.capture(name, whitelistProps(properties));
    } catch {
        // Never let analytics break the app.
    }
}

/**
 * Identify the current user. Only call with a pseudonymous device id.
 * Never call with a real name, email, or other PII.
 */
export function identifyPseudonymous(deviceId: string): void {
    if (!active) return;
    if (!deviceId || deviceId.length < 8) return;
    try {
        posthog.identify(deviceId);
    } catch {
        /* no-op */
    }
}

/** Reset PostHog identity, call on sign-out or class session end. */
export function resetPostHog(): void {
    if (!active) return;
    try {
        posthog.reset();
    } catch {
        /* no-op */
    }
}

/** Test helper. */
export function isPostHogActive(): boolean {
    return active;
}
