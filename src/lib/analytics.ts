/**
 * Analytics — single source of truth for product telemetry.
 *
 * Writes events to the Supabase analytics_events table via dbInsert.
 * Replaces the previous three-system mess:
 *   • The dead /api/track POST queue (endpoint never existed in prod)
 *   • The Google-Sheets-backed pilotAnalytics
 *   • Ad-hoc gtag calls scattered across components
 *
 * gtag and Microsoft Clarity remain in index.html for the marketing
 * funnel (pageviews, heatmaps), but product-level events route here.
 *
 * Privacy: no PII ever. session_id is a per-browser-tab UUID, never
 * tied to identity. age_band is a coarse 4-year bucket. Every field
 * is documented in docs/ANALYTICS_PLAN.md.
 *
 * Usage:
 *   import { analytics } from '@/lib/analytics';
 *
 *   analytics.logEvent('mode_started', { game_mode: 'tracing' });
 *   analytics.startSession({ ageBand: '4-5', schoolId: '', classId: '' });
 *   analytics.endSession('back_to_landing');
 */

import { dbInsert } from './supabase';

// ════════════════════════════════════════════════════════════════════
// Event vocabulary
// ════════════════════════════════════════════════════════════════════

/**
 * The full canonical list of events. Adding new events: add to this
 * union, document below, instrument at the call site. Do not introduce
 * new event-tracking systems — funnel everything through this.
 */
export type EventName =
    // ── Acquisition / landing ──
    | 'landing_view'
    | 'nav_click'
    | 'cta_click'

    // ── Activation funnel (every kid passes through this) ──
    | 'try_free_clicked'        // TryFreeModal opens
    | 'age_band_selected'       // Age picker submitted
    | 'demo_loading_view'
    | 'demo_loading_complete'
    | 'camera_requested'        // getUserMedia called
    | 'camera_granted'
    | 'camera_denied'
    | 'tracker_init_started'    // handTracker.initialize() invoked
    | 'tracker_init_succeeded'  // meta: { delegate, init_duration_ms }
    | 'tracker_init_failed'     // meta: { code, message, tried_delegates }
    | 'wave_screen_view'
    | 'wave_first_hand_seen'    // First MediaPipe landmark detected
    | 'wave_completed'          // Wave gate cleared

    // ── Menu + game start ──
    | 'menu_opened'
    | 'mode_selected'           // game_mode: which game picked
    | 'mode_started'            // First frame of gameplay
    | 'mode_completed'          // Stage / round / chapter cleared
    | 'mode_abandoned'          // Exit before completion
    | 'chapter_unlocked'

    // ── Per-game events ──
    | 'item_grabbed'                // generic across Sort&Place, Colour Builder, Word Search
    | 'item_dropped'                // meta: { isCorrect, itemKey, binId }
    | 'bubblepop_round_complete'
    | 'wordsearch_word_found'
    | 'wordsearch_level_complete'
    | 'tracing_letter_completed'
    | 'colourbuilder_match_made'
    | 'balloonmath_balloon_popped'
    | 'rainbowbridge_match_made'
    | 'spellingstars_word_complete'

    // ── Reliability / error stream ──
    | 'system_error'                // Uncaught exception
    | 'csp_violation'               // securitypolicyviolation event
    | 'tracker_low_confidence'      // hasHand=false sustained >5s

    // ── Session lifecycle ──
    | 'session_started'
    | 'session_heartbeat'
    | 'session_ended'

    // ── Conversion (B2B) ──
    | 'school_pack_form_view'
    | 'school_pack_form_submit'
    | 'feedback_widget_opened'
    | 'feedback_submitted';

export type AgeBand = '4-5' | '6-7' | '8-9' | '10-11' | '12+';

/** Optional fields on every event. Anything not in this shape goes in `meta`. */
export interface EventOptions {
    page?: string;
    component?: string;
    game_mode?: string;
    stage_id?: string;
    chapter?: number;
    level?: number;
    value_number?: number;
    meta?: Record<string, unknown>;
}

interface EventRow {
    session_id: string;
    occurred_at: string;
    event_name: EventName;
    page: string | null;
    component: string | null;
    game_mode: string | null;
    stage_id: string | null;
    chapter: number | null;
    level: number | null;
    age_band: string | null;
    school_id: string | null;
    class_id: string | null;
    build_version: string | null;
    device_type: string | null;
    browser: string | null;
    browser_version: string | null;
    viewport_w: number | null;
    viewport_h: number | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    referrer: string | null;
    value_number: number | null;
    meta: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════════
// Session state — UUID per tab, persisted in sessionStorage
// ════════════════════════════════════════════════════════════════════

interface SessionContext {
    sessionId: string;
    ageBand: AgeBand | null;
    schoolId: string;
    classId: string;
    startedAt: string;
}

const SESSION_KEY = 'dita_analytics_session';
const QUEUE_KEY = 'dita_analytics_queue';
const FLUSH_INTERVAL_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const FLUSH_BATCH_SIZE = 20;

let session: SessionContext | null = null;
let eventQueue: EventRow[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let flushing = false;

function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function loadSession(): SessionContext | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as SessionContext;
    } catch {
        return null;
    }
}

function persistSession(s: SessionContext | null): void {
    if (typeof window === 'undefined') return;
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
}

function getOrCreateSession(): SessionContext {
    if (session) return session;
    const restored = loadSession();
    if (restored) {
        session = restored;
        return session;
    }
    session = {
        sessionId: generateUUID(),
        ageBand: null,
        schoolId: '',
        classId: '',
        startedAt: new Date().toISOString(),
    };
    persistSession(session);
    return session;
}

// ════════════════════════════════════════════════════════════════════
// Context capture (browser, device, UTM, etc.)
// ════════════════════════════════════════════════════════════════════

interface BrowserInfo {
    browser: string;
    version: string;
}

function detectBrowser(): BrowserInfo {
    if (typeof navigator === 'undefined') return { browser: 'unknown', version: 'unknown' };
    const ua = navigator.userAgent;
    if (ua.includes('Edg')) {
        const m = ua.match(/Edg\/(\d+)/);
        return { browser: 'Edge', version: m ? m[1] : 'unknown' };
    }
    if (ua.includes('Chrome')) {
        const m = ua.match(/Chrome\/(\d+)/);
        return { browser: 'Chrome', version: m ? m[1] : 'unknown' };
    }
    if (ua.includes('Firefox')) {
        const m = ua.match(/Firefox\/(\d+)/);
        return { browser: 'Firefox', version: m ? m[1] : 'unknown' };
    }
    if (ua.includes('Safari')) {
        const m = ua.match(/Version\/(\d+)/);
        return { browser: 'Safari', version: m ? m[1] : 'unknown' };
    }
    return { browser: 'unknown', version: 'unknown' };
}

function detectDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    if (w >= 1920) return 'desktop-large';
    return 'desktop';
}

function getUTMParams(): { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null } {
    if (typeof window === 'undefined') {
        return { utm_source: null, utm_medium: null, utm_campaign: null };
    }
    const params = new URLSearchParams(window.location.search);
    return {
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
    };
}

function getBuildVersion(): string {
    return (import.meta.env.VITE_BUILD_VERSION as string) || 'dev';
}

// ════════════════════════════════════════════════════════════════════
// Event row construction
// ════════════════════════════════════════════════════════════════════

function buildRow(name: EventName, opts: EventOptions = {}): EventRow {
    const ctx = getOrCreateSession();
    const { browser, version } = detectBrowser();
    const utm = getUTMParams();
    return {
        session_id: ctx.sessionId,
        occurred_at: new Date().toISOString(),
        event_name: name,
        page: opts.page || (typeof window !== 'undefined' ? window.location.pathname : null),
        component: opts.component || null,
        game_mode: opts.game_mode || null,
        stage_id: opts.stage_id || null,
        chapter: opts.chapter ?? null,
        level: opts.level ?? null,
        age_band: ctx.ageBand,
        school_id: ctx.schoolId || null,
        class_id: ctx.classId || null,
        build_version: getBuildVersion(),
        device_type: detectDeviceType(),
        browser,
        browser_version: version,
        viewport_w: typeof window !== 'undefined' ? window.innerWidth : null,
        viewport_h: typeof window !== 'undefined' ? window.innerHeight : null,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        referrer: typeof document !== 'undefined' ? (document.referrer || null) : null,
        value_number: opts.value_number ?? null,
        meta: opts.meta || {},
    };
}

// ════════════════════════════════════════════════════════════════════
// Queue + flush
// ════════════════════════════════════════════════════════════════════

function loadQueueFromStorage(): EventRow[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? (JSON.parse(raw) as EventRow[]) : [];
    } catch {
        return [];
    }
}

function persistQueue(): void {
    if (typeof window === 'undefined') return;
    try {
        // Cap at 200 events to avoid runaway storage growth offline
        const capped = eventQueue.slice(-200);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(capped));
    } catch {
        // Storage full — drop oldest
        if (eventQueue.length > 50) {
            eventQueue = eventQueue.slice(-50);
            try { localStorage.setItem(QUEUE_KEY, JSON.stringify(eventQueue)); } catch { /* give up */ }
        }
    }
}

async function flush(): Promise<void> {
    if (flushing || eventQueue.length === 0) return;
    flushing = true;

    // Take a snapshot — anything that arrives during the network call
    // remains in eventQueue and flushes on the next tick.
    const batch = eventQueue.splice(0, FLUSH_BATCH_SIZE);
    persistQueue();

    try {
        // dbInsert accepts a single row OR an array. PostgREST does bulk
        // insert when the body is a JSON array.
        //
        // CRITICAL: returning: false sends `Prefer: return=minimal`. With
        // the default (return=representation) PostgREST executes an
        // implicit SELECT after the INSERT to return the new rows, and
        // the SELECT side runs under RLS. Our SELECT policy only allows
        // the `authenticated` role, so anon-role inserts get rolled back
        // with 42501 even though the INSERT policy is wide open. We
        // don't need the inserted rows back — fire-and-forget telemetry.
        const { error } = await dbInsert(
            'analytics_events',
            batch as unknown as Record<string, unknown>,
            { returning: false },
        );
        if (error) {
            // Put the batch back at the front of the queue and retry next tick
            eventQueue = [...batch, ...eventQueue];
            persistQueue();
            // Surface the failure — analytics has been silently broken
            // for too long. We can quiet this back down once the pipeline
            // is stable.
            // eslint-disable-next-line no-console
            console.warn('[analytics] flush failed:', error.code, error.message, '| queued:', eventQueue.length);
        } else {
            // eslint-disable-next-line no-console
            console.debug('[analytics] flushed', batch.length, 'events; remaining:', eventQueue.length);
        }
    } catch (e) {
        // Network down or Supabase unreachable — keep events for retry
        eventQueue = [...batch, ...eventQueue];
        persistQueue();
        // eslint-disable-next-line no-console
        console.warn('[analytics] flush threw:', (e as Error).message, '| queued:', eventQueue.length);
    } finally {
        flushing = false;
    }
}

function startFlushTimer(): void {
    if (flushTimer) return;
    flushTimer = setInterval(() => {
        if (eventQueue.length > 0) flush();
    }, FLUSH_INTERVAL_MS);
}

function startHeartbeat(): void {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(() => {
        logEvent('session_heartbeat');
    }, HEARTBEAT_INTERVAL_MS);
}

function setupBeforeUnload(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeunload', () => {
        // Use sendBeacon for reliable last-gasp delivery during page unload.
        // dbInsert won't work here because the page is being torn down.
        if (eventQueue.length === 0 || typeof navigator.sendBeacon !== 'function') return;
        const url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
        const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
        if (!url || !key) return;
        const body = new Blob([JSON.stringify(eventQueue)], { type: 'application/json' });
        try {
            navigator.sendBeacon(
                `${url}/rest/v1/analytics_events?apikey=${encodeURIComponent(key)}`,
                body,
            );
            eventQueue = [];
            persistQueue();
        } catch { /* best effort */ }
    });
}

// ════════════════════════════════════════════════════════════════════
// CSP-violation listener (catches bugs like the May 2026 regression)
// ════════════════════════════════════════════════════════════════════

function setupCSPListener(): void {
    if (typeof document === 'undefined') return;
    document.addEventListener('securitypolicyviolation', (e) => {
        logEvent('csp_violation', {
            meta: {
                blocked_uri: e.blockedURI,
                violated_directive: e.violatedDirective,
                source_file: e.sourceFile,
                line_number: e.lineNumber,
            },
        });
    });
}

// ════════════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════════════

/** Log an event. Fire-and-forget — flushes asynchronously. */
export function logEvent(name: EventName, opts: EventOptions = {}): void {
    eventQueue.push(buildRow(name, opts));
    persistQueue();
    if (eventQueue.length >= FLUSH_BATCH_SIZE) flush();
}

/**
 * Start a session and capture the age-band context that subsequent
 * events should inherit. Called from TryFreeModal.handleStart().
 */
export function startSession(input: { ageBand: AgeBand; schoolId?: string; classId?: string }): string {
    session = {
        sessionId: generateUUID(),
        ageBand: input.ageBand,
        schoolId: input.schoolId ?? '',
        classId: input.classId ?? '',
        startedAt: new Date().toISOString(),
    };
    persistSession(session);
    startFlushTimer();
    startHeartbeat();
    logEvent('session_started');
    return session.sessionId;
}

/** End the current session with a reason. Flushes immediately. */
export function endSession(reason: string = 'unspecified'): void {
    if (!session) session = loadSession();
    if (!session) return;

    const durationMs = Date.now() - new Date(session.startedAt).getTime();
    logEvent('session_ended', {
        meta: { reason },
        value_number: durationMs,
    });

    flush();

    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }

    persistSession(null);
    session = null;
}

export function hasActiveSession(): boolean {
    return session !== null || loadSession() !== null;
}

export function getSessionId(): string | null {
    if (session) return session.sessionId;
    const restored = loadSession();
    return restored?.sessionId ?? null;
}

// ════════════════════════════════════════════════════════════════════
// Initialise on import (browser only)
// ════════════════════════════════════════════════════════════════════

export function initAnalytics(): void {
    if (typeof window === 'undefined') return;

    // Restore a session from sessionStorage if one survived a navigation.
    session = loadSession();

    // Restore any unsent events from a prior tab.
    eventQueue = loadQueueFromStorage();

    startFlushTimer();
    if (session) startHeartbeat();

    setupBeforeUnload();
    setupCSPListener();

    // Expose a lightweight global for one-off debugging from devtools.
    // Not used by gtag — that lives in index.html and runs independently.
    (window as { dita_analytics?: unknown }).dita_analytics = {
        logEvent, startSession, endSession, hasActiveSession, getSessionId,
        getQueueSize: () => eventQueue.length,
        flushNow: flush,
    };
}

// Auto-initialise when imported in a browser context.
if (typeof window !== 'undefined') {
    initAnalytics();
}

// Convenience namespaced export for `import { analytics } from '@/lib/analytics'`.
export const analytics = {
    logEvent,
    startSession,
    endSession,
    hasActiveSession,
    getSessionId,
};
