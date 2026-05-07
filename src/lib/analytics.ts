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
    | 'cta_click'                   // meta.source: 'hero' | 'nav' | 'final_banner' | 'mobile_menu' | 'activities' | 'mode_tile' | 'privacy_section'

    // ── Activation funnel (every kid passes through this) ──
    | 'try_free_clicked'            // TryFreeModal opens
    | 'age_band_selected'           // Age picker submitted
    | 'demo_loading_view'
    | 'demo_loading_complete'
    | 'camera_requested'            // getUserMedia called
    | 'camera_granted'
    | 'camera_denied'
    | 'tracker_init_started'        // handTracker.initialize() invoked
    | 'tracker_init_succeeded'      // meta: { delegate, init_duration_ms }
    | 'tracker_init_failed'         // meta: { code, message, tried_delegates }
    | 'wave_screen_view'
    | 'wave_first_hand_seen'        // First MediaPipe landmark detected
    | 'wave_completed'              // Wave gate cleared

    // ── Menu + game start ──
    | 'menu_opened'
    | 'mode_selected'               // game_mode: which game picked
    | 'mode_started'                // First frame of gameplay
    | 'mode_completed'              // Stage / round cleared inside the mode
    | 'mode_abandoned'              // Exit before round completion
    | 'mode_switched'               // Jumped from one mode straight into another
    | 'stage_started'               // meta.stage_id, .stage_index
    | 'stage_completed'             // meta.stage_id, time_to_first_correct_ms, time_to_all_correct_ms
    | 'chapter_unlocked'

    // ── Adult gate ──
    | 'adult_gate_attempt'          // Hold begun
    | 'adult_gate_passed'           // Hold completed → menu shown
    | 'adult_gate_failed'           // Hold released early

    // ── Page / navigation lifecycle ──
    | 'tab_hidden'
    | 'tab_visible'
    | 'nav_back'                    // popstate fired

    // ── Per-game events ──
    | 'item_grabbed'                // generic across Sort&Place, Colour Builder, Word Search
    | 'item_dropped'                // meta.{ isCorrect, itemKey, binId, expected_*, actual_*, action_duration_ms }
    | 'hint_shown'                  // any in-game hint surfaced (bounce-back, glow, etc.)
    | 'bubblepop_round_complete'
    | 'wordsearch_word_found'
    | 'wordsearch_level_complete'
    | 'tracing_letter_completed'
    | 'colourbuilder_match_made'
    | 'balloonmath_balloon_popped'
    | 'rainbowbridge_match_made'
    | 'spellingstars_word_complete'

    // ── Motor / tracking quality (sampled) ──
    | 'tracker_quality_sample'      // 1Hz sample: fps, missing_frame_pct, viewport_quadrant
    | 'two_hands_detected'          // First time MediaPipe reports >1 landmark set in a session

    // ── Reliability / error stream ──
    | 'system_error'                // Uncaught exception
    | 'csp_violation'               // securitypolicyviolation event
    | 'tracker_low_confidence'      // hasHand=false sustained >5s

    // ── Session lifecycle ──
    | 'session_started'
    | 'session_heartbeat'
    | 'session_ended'               // value_number = duration_ms; meta.fatigue_score

    // ── Experimentation ──
    | 'feature_flag_exposed'        // meta.flag_name, .variant — fires once per session per flag

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
    device_id: string | null;
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

/** One row in the learning_attempts table. The mode logic files don't
 *  insert directly — every item_dropped event with the right meta
 *  shape gets mirrored to learning_attempts inside logEvent so the
 *  call sites stay clean. */
interface LearningRow {
    occurred_at: string;
    session_id: string;
    device_id: string | null;
    game_mode: string;
    stage_id: string | null;
    stage_index: number | null;
    item_key: string;
    age_band: string | null;
    was_correct: boolean;
    attempt_number: number | null;
    ms_to_attempt: number | null;
    expected_value: string | null;
    actual_value: string | null;
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
const DEVICE_KEY = 'dita_device_id';
const FLUSH_INTERVAL_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const FLUSH_BATCH_SIZE = 20;

let session: SessionContext | null = null;
let eventQueue: EventRow[] = [];
let learningQueue: LearningRow[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let flushing = false;

// ── Per-session attempt counter ────────────────────────────────
// Lets each learning_attempts row carry its 1-indexed attempt_number
// per (session, item_key) so we can answer "how many tries until
// correct" without joining the events table on the dashboard.
const attemptCounters = new Map<string, number>();
function nextAttemptNumber(itemKey: string): number {
    const n = (attemptCounters.get(itemKey) ?? 0) + 1;
    attemptCounters.set(itemKey, n);
    return n;
}

// ── Fatigue + per-action timing ─────────────────────────────────
// We capture every `item_dropped` action duration in this rolling
// buffer (per session, capped at 200 to bound memory) and compute a
// fatigue score at session end: ratio of last-quartile mean action
// time to first-quartile mean action time. >1 means the kid was
// slowing down — usually fatigue or boredom.
const actionTimings: number[] = [];
function recordActionTiming(ms: number): void {
    if (!Number.isFinite(ms) || ms <= 0) return;
    actionTimings.push(ms);
    if (actionTimings.length > 200) actionTimings.shift();
}
function computeFatigueScore(): number | null {
    if (actionTimings.length < 8) return null;
    const q = Math.max(2, Math.floor(actionTimings.length / 4));
    const first = actionTimings.slice(0, q);
    const last  = actionTimings.slice(-q);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const f = mean(first), l = mean(last);
    if (f <= 0) return null;
    return Math.round((l / f) * 100) / 100;
}
function resetActionTimings(): void { actionTimings.length = 0; }

// ── Per-flag exposure dedupe ─────────────────────────────────────
// feature_flag_exposed should fire at most once per session per flag.
const exposedFlags = new Set<string>();

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

/**
 * Per-device anonymous identifier. Stable in localStorage so we can
 * see returning kids across sessions and compute D1 / D7 retention
 * without identifying anyone. Not a fingerprint — explicitly
 * generated, scoped to this origin, cleared by the user's browser
 * when they wipe site data.
 */
function getOrCreateDeviceId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        let id = localStorage.getItem(DEVICE_KEY);
        if (!id) {
            id = generateUUID();
            localStorage.setItem(DEVICE_KEY, id);
        }
        return id;
    } catch {
        return null; // private mode etc.
    }
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
        device_id: getOrCreateDeviceId(),
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
    if (flushing) return;
    if (eventQueue.length === 0 && learningQueue.length === 0) return;
    flushing = true;

    // Mirror flush of learning_attempts. Same return=minimal trick as
    // analytics_events to dodge the SELECT-after-INSERT RLS rollback.
    if (learningQueue.length > 0) {
        const learningBatch = learningQueue.splice(0, FLUSH_BATCH_SIZE);
        persistLearningQueue();
        try {
            const { error } = await dbInsert(
                'learning_attempts',
                learningBatch as unknown as Record<string, unknown>,
                { returning: false },
            );
            if (error) {
                learningQueue = [...learningBatch, ...learningQueue];
                persistLearningQueue();
                // eslint-disable-next-line no-console
                console.warn('[analytics] learning flush failed:', error.code, error.message);
            }
        } catch (e) {
            learningQueue = [...learningBatch, ...learningQueue];
            persistLearningQueue();
            // eslint-disable-next-line no-console
            console.warn('[analytics] learning flush threw:', (e as Error).message);
        }
    }
    if (eventQueue.length === 0) {
        flushing = false;
        return;
    }

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
        if (eventQueue.length > 0 || learningQueue.length > 0) flush();
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

// ── Page lifecycle + nav ─────────────────────────────────────────
// tab_hidden / tab_visible from document.visibilitychange — huge
// signal for "did the kid get distracted vs actually finish".
// nav_back catches popstate (browser back button on mobile / desktop).
function setupPageListeners(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
        // Skip if no active session — no point logging tab events on the
        // marketing landing page where we haven't started a session yet.
        if (!session && !loadSession()) return;
        logEvent(document.hidden ? 'tab_hidden' : 'tab_visible', {
            meta: { visibility_state: document.visibilityState },
        });
    });

    window.addEventListener('popstate', () => {
        logEvent('nav_back', {
            page: typeof window !== 'undefined' ? window.location.pathname : null,
        });
    });
}

// ════════════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════════════

/** Log an event. Fire-and-forget — flushes asynchronously. */
export function logEvent(name: EventName, opts: EventOptions = {}): void {
    // Side-effect: harvest action timing for fatigue analysis.
    if (name === 'item_dropped') {
        const dur = (opts.meta?.action_duration_ms as number | undefined);
        if (typeof dur === 'number') recordActionTiming(dur);
    }
    eventQueue.push(buildRow(name, opts));
    persistQueue();

    // Mirror item_dropped into the learning_attempts table when the
    // meta carries the necessary fields. Mode logic files therefore
    // never have to know about that table.
    if (name === 'item_dropped') {
        const m = opts.meta ?? {};
        const itemKey = (m.itemKey ?? m.item_key) as unknown;
        const correct = m.isCorrect as unknown;
        if (typeof itemKey === 'string' && typeof correct === 'boolean' && opts.game_mode) {
            const ctx = getOrCreateSession();
            const expected =
                (m.expected_color as string | undefined) ??
                (m.expected_bin_id as string | undefined) ??
                (m.expected_letter as string | undefined) ??
                null;
            const actual =
                (m.actual_color as string | undefined) ??
                (m.actual_bin_id as string | undefined) ??
                (m.actual_letter as string | undefined) ??
                null;
            learningQueue.push({
                occurred_at: new Date().toISOString(),
                session_id: ctx.sessionId,
                device_id: getOrCreateDeviceId(),
                game_mode: opts.game_mode,
                stage_id: opts.stage_id ?? null,
                stage_index: (m.stage_index as number | undefined) ?? null,
                item_key: itemKey,
                age_band: ctx.ageBand,
                was_correct: correct,
                attempt_number: nextAttemptNumber(itemKey),
                ms_to_attempt: (m.action_duration_ms as number | undefined) ?? null,
                expected_value: expected,
                actual_value: actual,
                meta: m as Record<string, unknown>,
            });
            persistLearningQueue();
        }
    }

    if (eventQueue.length >= FLUSH_BATCH_SIZE) flush();
}

const LEARNING_QUEUE_KEY = 'dita_learning_queue';
function persistLearningQueue(): void {
    if (typeof window === 'undefined') return;
    try {
        const capped = learningQueue.slice(-200);
        localStorage.setItem(LEARNING_QUEUE_KEY, JSON.stringify(capped));
    } catch {
        if (learningQueue.length > 50) {
            learningQueue = learningQueue.slice(-50);
            try { localStorage.setItem(LEARNING_QUEUE_KEY, JSON.stringify(learningQueue)); } catch { /* give up */ }
        }
    }
}
function loadLearningQueueFromStorage(): LearningRow[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LEARNING_QUEUE_KEY);
        return raw ? (JSON.parse(raw) as LearningRow[]) : [];
    } catch { return []; }
}

// ── Per-game timing helpers ─────────────────────────────────────
// Mode logic files call markGrabAt(itemId) on grab and
// elapsedSinceGrab(itemId) on drop to attach action_duration_ms to
// the item_dropped event without each mode rolling its own timer.
const grabTimers = new Map<string, number>();
export function markGrab(key: string): void {
    grabTimers.set(key, Date.now());
}
export function elapsedSinceGrab(key: string): number | undefined {
    const t = grabTimers.get(key);
    if (t === undefined) return undefined;
    grabTimers.delete(key);
    return Date.now() - t;
}

// ── Two-hands dedupe ─────────────────────────────────────────────
// The vision loop calls noteTwoHandsSeen() each frame it observes
// >1 landmark set; this fires `two_hands_detected` at most once per
// session.
let twoHandsLogged = false;
export function noteTwoHandsSeen(): void {
    if (twoHandsLogged) return;
    twoHandsLogged = true;
    logEvent('two_hands_detected');
}

// ── Feature flag exposure ───────────────────────────────────────
// Components call exposeFeatureFlag('flag_name', 'variant') when a
// flag actually affects rendering. Dedupes per session so a flag
// that's read every render only logs once.
export function exposeFeatureFlag(name: string, variant: string | boolean | number): void {
    const key = `${name}:${variant}`;
    if (exposedFlags.has(key)) return;
    exposedFlags.add(key);
    logEvent('feature_flag_exposed', { meta: { flag_name: name, variant } });
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
    // Reset per-session derived state so a fresh session doesn't
    // inherit fatigue / two-hands state from the previous one.
    resetActionTimings();
    twoHandsLogged = false;
    exposedFlags.clear();
    grabTimers.clear();
    attemptCounters.clear();
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
    const fatigueScore = computeFatigueScore();
    logEvent('session_ended', {
        meta: {
            reason,
            fatigue_score: fatigueScore,            // null if <8 actions
            action_count: actionTimings.length,
        },
        value_number: durationMs,
    });

    flush();

    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }

    persistSession(null);
    session = null;
    resetActionTimings();
    twoHandsLogged = false;
    exposedFlags.clear();
    grabTimers.clear();
    attemptCounters.clear();
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
    learningQueue = loadLearningQueueFromStorage();

    startFlushTimer();
    if (session) startHeartbeat();

    setupBeforeUnload();
    setupCSPListener();
    setupPageListeners();

    // Materialise the device_id on app boot so it's always present in
    // every event row even before the first explicit logEvent call.
    getOrCreateDeviceId();

    // Expose a lightweight global for one-off debugging from devtools.
    // Not used by gtag — that lives in index.html and runs independently.
    (window as { dita_analytics?: unknown }).dita_analytics = {
        logEvent, startSession, endSession, hasActiveSession, getSessionId,
        markGrab, elapsedSinceGrab, noteTwoHandsSeen, exposeFeatureFlag,
        getQueueSize: () => eventQueue.length,
        getDeviceId: getOrCreateDeviceId,
        getActionTimings: () => [...actionTimings],
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
    markGrab,
    elapsedSinceGrab,
    noteTwoHandsSeen,
    exposeFeatureFlag,
    getDeviceId: getOrCreateDeviceId,
};
