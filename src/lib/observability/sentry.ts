/**
 * Sentry — frontend error tracking for Draw in the Air.
 *
 * Owns: uncaught JS errors, React render errors (via ErrorBoundary),
 * route-level crashes, camera permission failures, MediaPipe / hand
 * tracker failures, Supabase RPC failures, classroom sync failures,
 * dynamic-import failures, mobile-specific crashes.
 *
 * Does NOT own: product analytics (PostHog) or learning telemetry (LIOS).
 *
 * Privacy contract — enforced in this file, not by convention:
 *   • Never sends child names, raw camera frames, or PII.
 *   • beforeSend strips any property whose key matches a denylist.
 *   • URLs are pruned to pathname (no query, no hash).
 *   • Breadcrumb console messages are redacted to {level, length} only.
 *   • IPs and request bodies are stripped server-side via Sentry's
 *     scrubbers as a second line of defence.
 *
 * No-op behaviour:
 *   • If VITE_SENTRY_DSN is missing or empty, init() is a no-op.
 *   • captureError / setObservabilityContext / clearObservabilityContext
 *     all work as silent no-ops in that mode. The rest of the app can
 *     call them without guards.
 */

import * as Sentry from '@sentry/react';
import { recordCriticalError } from './health';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Context that should accompany every error. Set once per session
 * (or whenever it changes) via setObservabilityContext.
 *
 * Strict whitelist — adding a field here is a privacy review.
 */
export interface ObservabilityContext {
    /** Pseudonymous device UUID. Stable in localStorage. NEVER a child name. */
    deviceId?: string;
    /** Per-tab session UUID. NEVER tied to identity. */
    sessionId?: string;
    /** Class session UUID where relevant. NEVER a class name. */
    classSessionId?: string;
    /** 'free' | 'pre-writing' | 'tracing' | etc. */
    gameMode?: string;
    /** Coarse age bucket like '4-5'. Never an exact age, never a birthday. */
    ageBand?: string;
    /** Current route pathname only — no query, no hash. */
    route?: string;
    /** Coarse device class: 'mobile' | 'tablet' | 'desktop'. */
    deviceType?: string;
    /** Browser family: 'chrome' | 'safari' | 'firefox' | 'edge' | 'other'. */
    browser?: string;
    /** 'home' | 'classroom' — surface context, not personal data. */
    surface?: string;
}

export interface CaptureErrorOptions {
    /** Scope tag — which subsystem caught this. */
    scope?:
        | 'boundary'
        | 'camera'
        | 'tracker'
        | 'mediapipe'
        | 'supabase'
        | 'classmode'
        | 'router'
        | 'dynamic_import'
        | 'asset_load'
        | 'auth'
        | 'gamemode'
        | 'insights'
        | 'landing'
        | 'parent'
        | 'unknown';
    /** Free-form extras. Sanitized by beforeSend; do NOT pass PII here. */
    extras?: Record<string, string | number | boolean | null | undefined>;
    /** Fingerprint hint so similar errors group together. */
    fingerprint?: string[];
    /** Severity. Default 'error'. Use 'fatal' for things that break the app. */
    level?: 'fatal' | 'error' | 'warning' | 'info';
}

// ─── Internal state ──────────────────────────────────────────────────────────

let initialized = false;
let active = false;

// Keys whose VALUES we never want to leak. Matched case-insensitively
// against any property name in event extras / contexts / tags / request
// data / breadcrumb data. If you add a new sensitive field anywhere in
// the codebase, add the key prefix here too.
const PII_KEY_DENYLIST = [
    'name', 'fullName', 'firstName', 'lastName', 'childName', 'studentName',
    'email', 'phone', 'address', 'dob', 'birthday', 'birthdate',
    'password', 'pwd', 'pin', 'secret', 'token', 'authorization',
    'cookie', 'session_token', 'access_token', 'refresh_token',
    'frame', 'frameData', 'imageData', 'image', 'camera_frame',
    'landmark', 'landmarks', 'gestureSample', 'rawCoords', 'coords',
];

// Properties we keep on URLs — strip everything else.
function sanitizeUrl(raw?: string): string | undefined {
    if (!raw) return raw;
    try {
        const u = new URL(raw, 'http://x.invalid');
        return u.pathname; // no query, no hash, no host (host is captured separately)
    } catch {
        return undefined;
    }
}

function isPiiKey(key: string): boolean {
    const lower = key.toLowerCase();
    return PII_KEY_DENYLIST.some((bad) => lower === bad.toLowerCase() || lower.includes(bad.toLowerCase()));
}

function scrubObject<T extends Record<string, unknown> | undefined | null>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (isPiiKey(k)) {
            out[k] = '[redacted]';
            continue;
        }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            out[k] = scrubObject(v as Record<string, unknown>);
        } else {
            out[k] = v;
        }
    }
    return out as T;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize Sentry. Idempotent — safe to call more than once.
 * No-op when VITE_SENTRY_DSN is empty (dev without a DSN, or any
 * environment where error tracking is deliberately disabled).
 */
export function initSentry(): void {
    if (initialized) return;
    initialized = true;

    const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
    if (!dsn) {
        // Silent no-op — app continues to work.
        return;
    }

    const release = (import.meta.env.VITE_APP_VERSION as string | undefined) || '0.0.0-dev';
    const environment = (import.meta.env.VITE_APP_ENV as string | undefined) || 'development';

    // Performance tracing — gives us page-load timing, TTFB, and outgoing
    // request latency. This is exactly the signal we need to SEE that a
    // region (e.g. Nigeria) is slow rather than guessing. Default 0.1
    // (10% of sessions) keeps quota modest; override via VITE_SENTRY_TRACES_RATE.
    const tracesRate = Number(
        (import.meta.env.VITE_SENTRY_TRACES_RATE as string | undefined)?.trim() || '0.1',
    );

    // Session replay — OFF by default. This is a children's app with a live
    // webcam, so full session recording is a privacy non-starter. When a team
    // explicitly opts in via VITE_SENTRY_REPLAY=on, replay runs ONLY on errors
    // and with EVERYTHING masked/blocked: no webcam frames (blockAllMedia),
    // no text (maskAllText), no inputs (maskAllInputs). It captures the few
    // seconds of DOM mutations before a crash, never the camera feed.
    const enableReplay =
        (import.meta.env.VITE_SENTRY_REPLAY as string | undefined)?.trim() === 'on';

    Sentry.init({
        dsn,
        release,
        environment,
        integrations: [
            // Page-load + request latency. tracePropagationTargets is left at
            // its same-origin default so we never inject trace headers into
            // cross-origin (Supabase) requests and trip their CORS preflight.
            Sentry.browserTracingIntegration(),
            ...(enableReplay
                ? [
                      Sentry.replayIntegration({
                          maskAllText: true,
                          maskAllInputs: true,
                          blockAllMedia: true,
                      }),
                  ]
                : []),
        ],
        // Fraction of sessions traced for performance/latency (0..1).
        tracesSampleRate: Number.isFinite(tracesRate)
            ? Math.min(Math.max(tracesRate, 0), 1)
            : 0.1,
        // Never record full sessions — only the lead-up to an error, and only
        // when replay is explicitly enabled.
        replaysSessionSampleRate: 0.0,
        replaysOnErrorSampleRate: enableReplay ? 1.0 : 0.0,
        // Default integrations include BrowserApiErrors, Breadcrumbs,
        // HttpContext, etc. We override Breadcrumbs to scrub.
        sendDefaultPii: false,
        beforeSend(event) {
            // 1) Strip request URL down to pathname.
            if (event.request?.url) {
                event.request.url = sanitizeUrl(event.request.url) || '[invalid]';
            }
            // Drop request body — could contain form input.
            if (event.request) {
                delete event.request.data;
                delete event.request.cookies;
                delete event.request.headers;
                delete event.request.query_string;
            }
            // 2) Scrub contexts, extras, tags, user fields.
            if (event.contexts) {
                event.contexts = scrubObject(event.contexts) as typeof event.contexts;
            }
            if (event.extra) {
                event.extra = scrubObject(event.extra);
            }
            if (event.tags) {
                event.tags = scrubObject(event.tags) as typeof event.tags;
            }
            // We never identify users by name/email. Anything more
            // than a pseudonymous id is unwelcome.
            if (event.user) {
                event.user = { id: event.user.id };
            }
            // 3) Walk exception values and strip frame vars (potential PII).
            if (event.exception?.values) {
                for (const ex of event.exception.values) {
                    if (ex.stacktrace?.frames) {
                        for (const f of ex.stacktrace.frames) {
                            if (f.vars) delete f.vars;
                            if (f.filename) f.filename = sanitizeUrl(f.filename) ?? f.filename;
                        }
                    }
                }
            }
            return event;
        },
        beforeBreadcrumb(crumb) {
            // Drop UI breadcrumbs that capture text content — kid drawings,
            // teacher form inputs, etc. We'd rather lose context than leak.
            if (crumb.category === 'ui.input' || crumb.category === 'ui.click') {
                return null;
            }
            if (crumb.data) {
                crumb.data = scrubObject(crumb.data) as typeof crumb.data;
            }
            if (typeof crumb.message === 'string' && crumb.message.length > 200) {
                crumb.message = crumb.message.slice(0, 200) + '…';
            }
            return crumb;
        },
        ignoreErrors: [
            // Browser noise we can't act on.
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed with undelivered notifications',
            'Non-Error promise rejection captured',
            // Common extension noise.
            /^chrome-extension:\/\//,
            /^moz-extension:\/\//,
        ],
    });

    active = true;
}

/**
 * Attach context that should accompany every subsequent error.
 * Safe to call repeatedly — the latest values win.
 */
export function setObservabilityContext(ctx: ObservabilityContext): void {
    if (!active) return;
    Sentry.setTag('game_mode', ctx.gameMode ?? 'unknown');
    Sentry.setTag('route', ctx.route ?? 'unknown');
    Sentry.setTag('device_type', ctx.deviceType ?? 'unknown');
    Sentry.setTag('browser', ctx.browser ?? 'unknown');
    Sentry.setTag('surface', ctx.surface ?? 'unknown');
    Sentry.setTag('age_band', ctx.ageBand ?? 'unknown');
    Sentry.setContext('session', {
        device_id: ctx.deviceId ?? null,
        session_id: ctx.sessionId ?? null,
        class_session_id: ctx.classSessionId ?? null,
    });
    if (ctx.deviceId) {
        // Pseudonymous id only. No name, no email.
        Sentry.setUser({ id: ctx.deviceId });
    }
}

/** Clear the per-session Sentry context. Use on session end / sign-out. */
export function clearObservabilityContext(): void {
    if (!active) return;
    Sentry.setUser(null);
    Sentry.setContext('session', null);
}

/**
 * Report an error to Sentry with a scope tag. Mirrors the error into
 * the in-memory health registry so the System Health panel can show a
 * count and last-message without needing Sentry's API on the client.
 *
 * Safe to call before init / when Sentry is disabled — it still
 * records into the health registry.
 */
export function captureError(err: unknown, opts: CaptureErrorOptions = {}): void {
    const scope = opts.scope ?? 'unknown';
    const level = opts.level ?? 'error';

    // Always record locally so the in-app health panel can show counts
    // even when Sentry is offline / disabled.
    try {
        const message = err instanceof Error ? err.message : String(err);
        recordCriticalError({ scope, message, level, at: Date.now() });
    } catch {
        // Health registry should never break error reporting.
    }

    if (!active) return;
    try {
        Sentry.withScope((s) => {
            s.setTag('scope', scope);
            s.setLevel(level);
            if (opts.fingerprint) s.setFingerprint(opts.fingerprint);
            if (opts.extras) s.setExtras(scrubObject(opts.extras) as Record<string, unknown>);
            if (err instanceof Error) {
                Sentry.captureException(err);
            } else {
                Sentry.captureMessage(typeof err === 'string' ? err : JSON.stringify(err));
            }
        });
    } catch {
        // Never let a reporting failure crash the app.
    }
}

/** Test helper — returns whether Sentry is currently active. */
export function isSentryActive(): boolean {
    return active;
}
