/**
 * Analytics, single source of truth for product telemetry.
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
import { recordActivityCompleted } from './activationCounter';
import {
    trackEvent as obsTrackEvent,
    identifyPseudonymous,
    setObservabilityContext as obsSetContext,
    recordCameraRequested,
    recordCameraGranted,
    recordCameraDenied,
    recordTrackerInitStarted,
    recordTrackerInitSucceeded,
    recordTrackerInitFailed,
    recordClassroomSyncFailure,
    setActiveClassSessions,
    trackMeta as obsTrackMeta,
    safeInvoke,
} from './observability';

// ════════════════════════════════════════════════════════════════════
// Event vocabulary
// ════════════════════════════════════════════════════════════════════

/**
 * The full canonical list of events. Adding new events: add to this
 * union, document below, instrument at the call site. Do not introduce
 * new event-tracking systems, funnel everything through this.
 */
export type EventName =
    // ── Acquisition / landing ──
    | 'landing_view'                // Landing route mounted (top-of-funnel)
    | 'landing_engaged'             // First meaningful engagement: scroll past hero OR CTA hover
    | 'landing_unload'              // meta.time_on_page_ms, .scroll_depth_pct, to see WHERE bouncers leave
    | 'nav_click'
    | 'cta_click'                   // meta.source: 'hero' | 'nav' | 'final_banner' | 'mobile_menu' | 'activities' | 'mode_tile' | 'privacy_section'

    // ── Activation funnel (every kid passes through this) ──
    | 'try_free_clicked'            // TryFreeModal opens
    | 'age_band_selected'           // Age picker submitted
    | 'demo_loading_view'
    | 'demo_loading_complete'
    | 'camera_requested'            // getUserMedia called
    | 'camera_granted'
    | 'camera_denied'               // Fired at most once per session, first denial
    | 'camera_retry_failed'         // Subsequent denials in the same session (Retry button or auto-restart loop)
    | 'tracker_init_started'        // handTracker.initialize() invoked
    | 'tracker_init_succeeded'      // meta: { delegate, init_duration_ms }
    | 'tracker_init_failed'         // meta: { code, message, tried_delegates }

    // ── Camera permission flow (A/B experiment camera_explainer_v1) ──
    | 'camera_explainer_shown'      // Pre-prompt rendered (treatment arm only)
    | 'camera_explainer_continue'   // User tapped "Allow camera"
    | 'camera_explainer_dismissed'  // User tapped "Tell me more first"
    | 'camera_recovery_shown'       // Error-state recovery screen rendered; meta.cause/browser/os
    | 'camera_recovery_retry'       // User tapped "Try again" on recovery screen
    | 'camera_recovery_dismissed'   // User tapped "Back to home" on recovery screen
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

    // ── Building mode ──
    | 'build_world_selected'        // meta.world_id
    | 'build_object_started'        // stage_id = object id; meta.world, .build_type
    | 'piece_hovered'               // debounced 400ms; meta.piece_id, .semantic_role, .dwell_ms
    | 'piece_grabbed'               // meta.piece_id
    | 'placement_attempt'           // meta.piece_id, .target_zone_id, .distance_to_target
    | 'successful_snap'             // meta.piece_id, .target_zone_id, .time_since_grab_ms, .was_first_attempt
    | 'wrong_piece_attempt'         // meta.piece_id, .attempted_zone_id, .attempted_zone_role
    | 'hesitation_detected'         // meta.available_pieces[]
    | 'assist_escalated'            // meta.piece_id, .new_tolerance
    | 'build_object_completed'      // value_number = duration_ms; meta.world, .build_type, .total_attempts, .time_to_first_snap_ms
    | 'build_abandoned'             // meta.world, .build_type, .progress_pct, .reason
    | 'sandbox_combination_created' // Phase 3+; meta.combination_signature
    | 'sandbox_animated'            // Phase 3+; meta.combination_signature

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
    | 'stuck_detected'              // 30s of no productive action mid-stage; meta.idle_ms, .stage_id
    | 'bubblepop_round_complete'
    | 'wordsearch_word_found'
    | 'wordsearch_level_complete'
    | 'tracing_letter_completed'
    | 'tracing_activity_loaded'     // playful_v1: activity mounted; meta.type, .strokes
    | 'tracing_stroke_completed'    // playful_v1: a stroke finished; meta.stroke
    | 'tracing_off_path'            // playful_v1: gentle off-path correction shown
    | 'tracing_recovered'           // playful_v1: returned to path after off-path
    | 'colourbuilder_match_made'
    | 'balloonmath_balloon_popped'
    | 'rainbowbridge_match_made'
    | 'spellingstars_word_complete'

    // ── Motor / tracking quality (sampled) ──
    | 'tracker_quality_sample'      // 1Hz sample: fps, missing_frame_pct, viewport_quadrant
    | 'tracker_warmup_timing'       // meta.camera_to_hand_ms, diagnoses slow-tracker vs out-of-frame
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
    | 'feature_flag_exposed'        // meta.flag_name, .variant, fires once per session per flag

    // ── Conversion (B2B) ──
    | 'school_pack_form_view'
    | 'school_pack_form_submit'
    | 'feedback_widget_opened'
    | 'feedback_submitted'
    | 'pilot_pack_downloaded'       // PDF pack download (link click)
    | 'demo_request_form_view'
    | 'demo_request_form_submit'
    | 'for_teachers_page_view'
    | 'for_parents_page_view'
    | 'share_button_clicked'        // social share / colleague share

    // ── Parent subscription funnel (no child PII; only ids / counts) ──
    | 'parent_signup_started'       // Email/Password form submitted
    | 'parent_signup_completed'     // Account created (auth.users insert succeeded)
    | 'parent_login_success'
    | 'parent_login_failed'
    | 'parent_password_reset_requested'
    | 'parent_password_reset_completed'
    | 'teacher_password_reset_completed'
    | 'parent_trial_started'        // Stripe Checkout session created in trial mode
    | 'parent_subscription_started' // Webhook: customer.subscription.created → active/trialing
    | 'parent_subscription_cancelled'
    | 'parent_paywall_viewed'       // meta.reason: 'save_progress' | 'dashboard' | 'trial_ended' | 'premium_mode'
    | 'parent_checkout_started'     // Redirect to Stripe Checkout fired
    | 'parent_checkout_completed'   // checkout.session.completed webhook
    | 'parent_checkout_returned'    // Back from Stripe on the success URL
    | 'parent_subscription_activated' // Reconcile confirmed an active subscription
    | 'parent_portal_opened'        // Customer Portal redirect fired
    | 'parent_child_profile_created'   // meta.active_count (NOT nickname)
    | 'parent_child_profile_archived'
    | 'parent_child_profile_restored'
    | 'parent_child_profile_deleted'
    | 'parent_child_session_saved'  // Game session attached to a child profile
    | 'parent_dashboard_viewed'
    | 'parent_report_viewed'        // Weekly summary opened
    | 'parent_controls_updated'
    | 'parent_data_exported'
    | 'parent_account_deletion_requested'

    // ── Teacher funnel (no learner PII; only teacher contact info) ──
    | 'teacher_signup_started'
    | 'teacher_signup_completed'
    | 'teacher_login_success'
    | 'teacher_login_failed'

    // ── Stuck-state help + feedback system ──
    // The feedback system's primary job is comprehension + rescue, not
    // satisfaction polling. These events let every drop-off carry a reason.
    | 'stuck_help_shown'        // A rescue prompt was shown; meta.prompt, .onboarding_step
    | 'stuck_help_action'       // User acted on a prompt; meta.prompt, .action
    | 'feedback_submitted'      // Any structured feedback submitted; meta.kind, .reason/.rating
    | 'exit_reason_submitted'   // Trigger 4 exit micro-survey; meta.reason
    | 'happiness_rating'        // Trigger 5 post-success survey; value_number = 1-4

    // ── Warm-up tutorial (learn-by-doing; first success = activation) ──
    | 'tutorial_offered'        // "Quick warm-up?" offer shown
    | 'tutorial_started'        // User accepted the warm-up
    | 'tutorial_step_completed' // meta.gesture: 'wave' | 'point' | 'pinch'
    | 'tutorial_completed'      // All 3 balloons popped; value_number = duration_ms
    | 'tutorial_skipped'        // User declined the warm-up

    // ── Sprint 2: intent, expectation gap, in-app handoff ──
    | 'intent_captured'         // meta.intent — what the user came to do
    | 'expectation_rating'      // Expectation gap after 1st success; value_number = 1-3
    | 'inapp_browser_detected'  // FB/IG webview on a camera-first page; meta.browser
    | 'inapp_open_external_clicked' // User tapped "open in your browser"

    // ── Sprint 3: personalised paths ──
    | 'returning_visitor'       // Device seen before; meta.visit_count
    | 'audience_identified'     // Inferred home/school from acquisition; meta.audience
    | 'audience_selected'       // User confirmed home/school; meta.audience
    | 'audience_path_clicked';  // User followed the tailored next-step CTA

export type AgeBand = '4-5' | '6-7' | '8-9' | '10-11' | '12+';

/**
 * Session context, first-class LIOS dimension. Set at session
 * start via startSession() or upgraded later via setSessionContext()
 * when a classroom code is redeemed. Defaults to 'unknown' so we
 * never silently mis-attribute a home session as classroom.
 */
export type SessionContextKind = 'home' | 'classroom' | 'unknown';

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

    // ── LIOS Sprint 1 envelope ─────────────────────────────────
    // event_uid: client-generated UUID at event creation. UNIQUE
    //   constraint on the table (migration 20260519) makes inserts
    //   idempotent, offline-queue retries don't double-write.
    // client_seq: monotonic per-session integer for true event
    //   ordering, independent of flush / arrival order.
    // client_ts: client wall clock at event creation. occurred_at
    //   remains the server's view; the pair lets downstream jobs
    //   estimate clock skew and reconcile latency timings.
    // context: 'home' | 'classroom' | 'unknown'. Powers the
    //   home-vs-classroom dimension required by the LIOS strategy.
    event_uid: string;
    client_seq: number;
    client_ts: string;
    context: SessionContextKind;
}

/** One row in the learning_attempts table. The mode logic files don't
 *  insert directly, every item_dropped event with the right meta
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

    // LIOS envelope mirrors the originating event so the
    // mastery-fact pipeline shares the same idempotency guarantees
    // as the raw event log.
    event_uid: string;
    client_seq: number;
    client_ts: string;
    context: SessionContextKind;

    // Parent subscription layer (migration 0004). NULL for school /
    // anonymous learners, RLS policy `attempts_school_rows` covers
    // those. When a parent picks a child profile from the dashboard,
    // the selected id is mirrored here so progress saves to the right
    // learner. Reads from sessionStorage to stay decoupled from React.
    child_profile_id: string | null;

    // LIOS Sprint 3, gesture-quality scalars (Document A §2.1).
    // Computed locally on-device by GestureSampler (or by the game
    // mode's own logic). Raw coordinates NEVER leave the device,
    // only these scalars transit. NULL for events without gesture
    // quality (most modes, until each is integrated).
    gq_path_accuracy_pct:          number | null;
    gq_path_efficiency:            number | null;
    gq_spatial_error_mean_px:      number | null;
    gq_velocity_variance:          number | null;
    gq_pause_count:                number | null;
    gq_directional_changes:        number | null;
    gq_time_to_first_movement_ms:  number | null;
    gq_time_to_completion_ms:      number | null;
    gq_corrections_in_stroke:      number | null;
    gq_n_samples:                  number | null;
}

/**
 * Shape callers (game modes, GestureSampler.finalize) put on
 * opts.meta.gesture_quality. The analytics mirror reads this block
 * to populate the gq_* columns on learning_attempts.
 */
interface GestureQualityBlock {
    path_accuracy_pct?:          number | null;
    path_efficiency?:            number | null;
    spatial_error_mean_px?:      number | null;
    velocity_variance?:          number | null;
    pause_count?:                number | null;
    directional_changes?:        number | null;
    time_to_first_movement_ms?:  number | null;
    time_to_completion_ms?:      number | null;
    corrections_in_stroke?:      number | null;
    n_samples?:                  number | null;
}
function gqOrNull(v: unknown): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// ════════════════════════════════════════════════════════════════════
// Session state, UUID per tab, persisted in sessionStorage
// ════════════════════════════════════════════════════════════════════

interface SessionContext {
    sessionId: string;
    ageBand: AgeBand | null;
    schoolId: string;
    classId: string;
    startedAt: string;
    /**
     * LIOS context flag. 'home' is the default for sessions that
     * begin without a classroom code; flipped to 'classroom' when
     * a classroom redemption flow runs (sprint 4). Persisted in
     * sessionStorage so a tab refresh doesn't lose it.
     */
    context: SessionContextKind;
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

// ── LIOS Sprint 1: per-session monotonic event sequence ─────────
// client_seq is incremented for every event in the session and
// recorded on the row so downstream jobs can reconstruct true
// ordering even when the offline queue flushes out of order.
// Resets to 0 on every new session.
let clientSeq = 0;
function nextClientSeq(): number {
    clientSeq += 1;
    return clientSeq;
}

// ── Fatigue + per-action timing ─────────────────────────────────
// We capture every `item_dropped` action duration in this rolling
// buffer (per session, capped at 200 to bound memory) and compute a
// fatigue score at session end: ratio of last-quartile mean action
// time to first-quartile mean action time. >1 means the kid was
// slowing down, usually fatigue or boredom.
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

// ── Stuck-detection watcher ─────────────────────────────────────
// The strongest "this isn't working for the kid" signal is "30s of
// no productive action". Each mode logic file calls
// noteProductiveAction() on every grab / drop / pop / hit, and the
// watcher fires stuck_detected once at 30s of silence (then again
// every 60s if they keep idling). Resets on next action.
const STUCK_THRESHOLD_MS = 30_000;
const STUCK_REPEAT_MS = 60_000;
let stuckCtx: { gameMode: string | null; stageId: string | null; lastActionAt: number; firedCount: number } | null = null;
let stuckTimer: ReturnType<typeof setInterval> | null = null;

function startStuckWatcher(): void {
    if (stuckTimer) return;
    stuckTimer = setInterval(() => {
        if (!stuckCtx) return;
        const idle = Date.now() - stuckCtx.lastActionAt;
        const threshold = stuckCtx.firedCount === 0 ? STUCK_THRESHOLD_MS : STUCK_REPEAT_MS * stuckCtx.firedCount;
        if (idle >= threshold) {
            const c = stuckCtx;  // snapshot for the log call below
            c.firedCount += 1;
            logEvent('stuck_detected', {
                game_mode: c.gameMode ?? undefined,
                stage_id: c.stageId ?? undefined,
                value_number: idle,
                meta: { idle_ms: idle, fired_count: c.firedCount },
            });
        }
    }, 5_000);
}

/**
 * Call from a mode logic file when a productive action happens
 * (grab, drop, pop, hit, place). Resets the idle clock and (re)arms
 * the stuck-detection watcher. Pass the current game_mode + stage_id
 * so the resulting event has context.
 */
export function noteProductiveAction(gameMode: string, stageId?: string): void {
    stuckCtx = {
        gameMode,
        stageId: stageId ?? null,
        lastActionAt: Date.now(),
        firedCount: 0,
    };
    startStuckWatcher();
}

/** Called when a stage/round ends so we don't keep ticking idle on
 *  the celebration screen or after navigation away. */
export function clearStuckWatcher(): void {
    stuckCtx = null;
}

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
 * without identifying anyone. Not a fingerprint, explicitly
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
        // Older restored sessions may not carry the LIOS context
        // field, synthesise the default so the type stays narrow.
        if (!restored.context) restored.context = resolveDefaultContext();
        session = restored;
        return session;
    }
    session = {
        sessionId: generateUUID(),
        ageBand: null,
        schoolId: '',
        classId: '',
        startedAt: new Date().toISOString(),
        context: resolveDefaultContext(),
    };
    persistSession(session);
    return session;
}

// ── LIOS Sprint 3: classroom-code redemption flow ──────────────
// Resolution order (highest priority first):
//   1. ?join=<CODE> URL param   → classroom-context, code captured
//   2. ?classroom=<CODE> alias  → same as #1
//   3. ?context=home|classroom  → explicit ops override (no code)
//   4. localStorage stored class_code or context preference
//   5. Default 'home'
//
// Once a kid lands on the platform with /?join=XYZ, the device is
// flagged as classroom-context for the lifetime of the localStorage
// (a school session is sticky across page reloads). Every event
// thereafter carries context='classroom' AND the class_code in meta,
// so the dashboard's home-vs-classroom split is accurate from the
// first action.
const CONTEXT_KEY    = 'dita_session_context';
const CLASS_CODE_KEY = 'dita_class_code';

function resolveDefaultContext(): SessionContextKind {
    if (typeof window === 'undefined') return 'unknown';
    try {
        const params = new URLSearchParams(window.location.search);

        // 1+2. Classroom code redemption, flips context AND captures code
        const joinCode = params.get('join') ?? params.get('classroom');
        if (joinCode && joinCode.trim().length > 0 && joinCode.trim().length <= 32) {
            const code = joinCode.trim().toUpperCase();
            try {
                localStorage.setItem(CONTEXT_KEY, 'classroom');
                localStorage.setItem(CLASS_CODE_KEY, code);
            } catch { /* private mode */ }
            return 'classroom';
        }

        // 3. Explicit ?context override (legacy testing path)
        const param = params.get('context');
        if (param === 'home' || param === 'classroom') {
            try { localStorage.setItem(CONTEXT_KEY, param); } catch { /* ignore */ }
            // If switching to home, clear any stale class code
            if (param === 'home') {
                try { localStorage.removeItem(CLASS_CODE_KEY); } catch { /* ignore */ }
            }
            return param;
        }

        // 4. Sticky preference
        const stored = localStorage.getItem(CONTEXT_KEY);
        if (stored === 'home' || stored === 'classroom') return stored;
    } catch { /* private mode etc. */ }
    return 'home';
}

/**
 * Read the redeemed classroom code (if any). Returned on every
 * event's meta when context='classroom' so the dashboard can
 * group by which class did what. Returns null in home / unknown
 * contexts and when no code was redeemed.
 */
function getClassCode(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const code = localStorage.getItem(CLASS_CODE_KEY);
        return code && code.length > 0 ? code : null;
    } catch {
        return null;
    }
}

/**
 * Clear a redeemed classroom code (e.g. teacher ending the session
 * or a kid going home for the day on a shared device). Optional,
 * the code is also auto-cleared when context flips to 'home'.
 */
export function clearClassCode(): void {
    if (typeof window === 'undefined') return;
    try { localStorage.removeItem(CLASS_CODE_KEY); } catch { /* ignore */ }
}

/**
 * Flip the current session's context (e.g. after a classroom code
 * is redeemed). Persists to sessionStorage so subsequent events
 * carry the new context. Idempotent, calling with the current
 * context is a no-op.
 */
export function setSessionContext(kind: SessionContextKind): void {
    const s = session ?? loadSession();
    if (!s) return;
    if (s.context === kind) return;
    s.context = kind;
    session = s;
    persistSession(s);
    try { localStorage.setItem(CONTEXT_KEY, kind); } catch { /* ignore */ }
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
    // The LIOS envelope is computed at the moment of event creation,
    // NEVER at flush time, so retries of the same event preserve
    // identity and ordering even if the flush is delayed by hours.
    const now = new Date().toISOString();

    // Inject class_code into meta whenever a classroom-context
    // session was redeemed via /?join=CODE. The dashboard's
    // home-vs-classroom split is keyed on the `context` column,
    // but per-classroom drilldowns join on this meta field.
    const classCode = ctx.context === 'classroom' ? getClassCode() : null;
    const eventMeta: Record<string, unknown> = classCode
        ? { ...(opts.meta || {}), class_code: classCode }
        : (opts.meta || {});
    return {
        session_id: ctx.sessionId,
        device_id: getOrCreateDeviceId(),
        occurred_at: now,
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
        meta: eventMeta,

        // LIOS envelope. event_uid is the idempotency key,
        // generated at event creation so retried inserts collapse
        // on the unique index. client_seq orders events within the
        // session independent of flush order. client_ts is the
        // wall clock at creation; occurred_at is preserved as the
        // canonical timestamp (it's now identical at creation,
        // but if/when the server starts overwriting it on insert
        // these two will diverge and downstream jobs need both).
        event_uid: generateUUID(),
        client_seq: nextClientSeq(),
        client_ts: now,
        context: ctx.context,
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
        // Storage full, drop oldest
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
    //
    // LIOS: ignoreDuplicates makes the bulk insert tolerant of
    // event_uid collisions, when an offline-queue retry races a
    // partial-success flush, the duplicate rows are silently
    // skipped instead of aborting the whole batch.
    if (learningQueue.length > 0) {
        const learningBatch = learningQueue.splice(0, FLUSH_BATCH_SIZE);
        persistLearningQueue();
        try {
            const { error } = await dbInsert(
                'learning_attempts',
                learningBatch as unknown as Record<string, unknown>,
                { returning: false, ignoreDuplicates: true },
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

    // Take a snapshot, anything that arrives during the network call
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
        // don't need the inserted rows back, fire-and-forget telemetry.
        const { error } = await dbInsert(
            'analytics_events',
            batch as unknown as Record<string, unknown>,
            { returning: false, ignoreDuplicates: true },
        );
        if (error) {
            // Put the batch back at the front of the queue and retry next tick
            eventQueue = [...batch, ...eventQueue];
            persistQueue();
            // Surface the failure, analytics has been silently broken
            // for too long. We can quiet this back down once the pipeline
            // is stable.
            // eslint-disable-next-line no-console
            console.warn('[analytics] flush failed:', error.code, error.message, '| queued:', eventQueue.length);
        } else {
            // eslint-disable-next-line no-console
            console.debug('[analytics] flushed', batch.length, 'events; remaining:', eventQueue.length);
        }
    } catch (e) {
        // Network down or Supabase unreachable, keep events for retry
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
    // The ENTIRE handler runs through safeInvoke so nothing thrown during page
    // teardown — a destroyed bridge, a missing API, a serialization error —
    // can surface as an uncaught error (see Issue 2 RCA: instrumentation must
    // never crash or degrade the page, least of all while it is unloading).
    window.addEventListener('beforeunload', () => {
        safeInvoke(() => {
            // Use sendBeacon for reliable last-gasp delivery during page unload.
            // dbInsert won't work here because the page is being torn down.
            //
            // LIOS: sendBeacon doesn't expose the Prefer header (the body
            // is a Blob and the browser sets Content-Type only). We append
            // the resolution preference as a URL hint that PostgREST also
            // accepts on the query string, same effect, duplicate
            // event_uids are silently ignored instead of failing the batch.
            if (eventQueue.length === 0) return;
            const url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
            const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
            if (!url || !key) return;
            const body = new Blob([JSON.stringify(eventQueue)], { type: 'application/json' });
            navigator.sendBeacon(
                `${url}/rest/v1/analytics_events?apikey=${encodeURIComponent(key)}&on_conflict=event_uid`,
                body,
            );
            eventQueue = [];
            persistQueue();
        }, {
            label: 'analytics.beforeunload',
            // Feature-detect sendBeacon (and the window) before touching it; an
            // in-app browser mid-teardown may have already torn the API away.
            available: () => typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function',
        });
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
// tab_hidden / tab_visible from document.visibilitychange, huge
// signal for "did the kid get distracted vs actually finish".
// nav_back catches popstate (browser back button on mobile / desktop).
function setupPageListeners(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
        // Skip if no active session, no point logging tab events on the
        // marketing landing page where we haven't started a session yet.
        if (!session && !loadSession()) return;
        logEvent(document.hidden ? 'tab_hidden' : 'tab_visible', {
            meta: { visibility_state: document.visibilityState },
        });
    });

    window.addEventListener('popstate', () => {
        logEvent('nav_back', {
            page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        });
    });
}

// ════════════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════════════

// Once-per-session event guard. Some events (camera_denied being the
// first) only carry meaning the first time they fire in a session, a
// browser with permission permanently set to "Block" can otherwise
// generate dozens of identical denial events through the
// CameraRecovery "Try again" loop or page-visibility re-fires. We rewrite
// those subsequent fires to a distinct event name so the primary metric
// stays clean while we still keep the retry signal.
const oncePerSessionFired = new Set<EventName>();
const ONCE_PER_SESSION: Readonly<Record<string, EventName>> = {
    camera_denied: 'camera_retry_failed',
};

/** Log an event. Fire-and-forget, flushes asynchronously. */
// ── Meta Pixel event mapping (spec §1a) ──────────────────────────────────────
// Only these internal events are mirrored to the Pixel from the fan-out, and
// only as Pixel-ONLY events. Deduplicated events that pair with a server CAPI
// event (Lead / CompleteRegistration / StartTrial / Subscribe / Purchase) are
// fired at their own call-sites with a SHARED event_id, never here, so Meta
// shows them "Deduplicated".
const META_EVENT_MAP: Record<string, string> = {
    parent_child_profile_created: 'AddChild',     // custom
    mode_started: 'StartActivity',                // custom
    parent_checkout_started: 'InitiateCheckout',  // standard
};

function maybeTrackMeta(eventName: string, opts: EventOptions): void {
    const metaEvent = META_EVENT_MAP[eventName];
    if (!metaEvent) return;
    const params: { content_name?: string } = {};
    const cn = opts.meta?.content_name;
    if (typeof cn === 'string') params.content_name = cn;
    obsTrackMeta(metaEvent, params, generateUUID());
}

export function logEvent(name: EventName, opts: EventOptions = {}): void {
    // Dedupe once-per-session events to avoid the alert-storm pattern
    // we saw 2026-05-12 (single device fired 46 camera_denied events
    // in 9 minutes via Retry-button retry loop). After the first fire,
    // subsequent attempts log under the *_retry_failed name instead.
    const dedupTo = ONCE_PER_SESSION[name];
    if (dedupTo) {
        if (oncePerSessionFired.has(name)) {
            name = dedupTo;
        } else {
            oncePerSessionFired.add(name);
        }
    }

    // Side-effect: harvest action timing for fatigue analysis.
    if (name === 'item_dropped') {
        const dur = (opts.meta?.action_duration_ms as number | undefined);
        if (typeof dur === 'number') recordActionTiming(dur);
    }

    // Side-effect: any of these "productive action" events resets
    // the stuck-detection idle clock. Mode logic files don't have
    // to call noteProductiveAction explicitly when they're already
    // firing one of these.
    if (name === 'item_grabbed' || name === 'item_dropped'
        || name === 'bubblepop_round_complete' || name === 'wordsearch_word_found'
        || name === 'tracing_letter_completed' || name === 'colourbuilder_match_made'
        || name === 'balloonmath_balloon_popped' || name === 'rainbowbridge_match_made'
        || name === 'spellingstars_word_complete') {
        if (opts.game_mode) {
            noteProductiveAction(opts.game_mode, opts.stage_id);
        }
    }
    // stage_started arms the watcher; stage_completed disarms it.
    if (name === 'stage_started' && opts.game_mode) {
        noteProductiveAction(opts.game_mode, opts.stage_id);
    }
    if (name === 'stage_completed' || name === 'mode_completed' || name === 'mode_abandoned') {
        clearStuckWatcher();
    }
    // A completed activity is the activation unit. Bump the session
    // counter so the UI can fire the expectation (1st) / happiness (3rd)
    // surveys. Guarded so analytics never breaks on a counter error.
    if (name === 'mode_completed') {
        try { recordActivityCompleted(); } catch { /* never break analytics */ }
    }
    const row = buildRow(name, opts);
    eventQueue.push(row);
    persistQueue();

    // ── Observability fan-out ──────────────────────────────────────────────
    // Mirror funnel-relevant events to PostHog and bump the in-memory
    // health registry. PostHog drops anything not on its allow-list, so
    // safe to fan out indiscriminately. LIOS / analytics_events behaviour
    // is unchanged, this is purely additive.
    try {
        // Update health counters for the events the System Health
        // panel cares about.
        // String compare (not `case` against the EventName union)
        // because the fan-out is forward-compatible with new event
        // names, e.g. `classroom_sync_failure` may be added to the
        // LIOS vocabulary later without breaking this switch today.
        const n: string = name;
        if (n === 'camera_requested')           recordCameraRequested();
        else if (n === 'camera_granted')        recordCameraGranted();
        else if (n === 'camera_denied' || n === 'camera_retry_failed') recordCameraDenied();
        else if (n === 'tracker_init_started')   recordTrackerInitStarted();
        else if (n === 'tracker_init_succeeded') recordTrackerInitSucceeded();
        else if (n === 'tracker_init_failed')    recordTrackerInitFailed();
        else if (n === 'classroom_sync_failure') recordClassroomSyncFailure();

        // Mirror to PostHog with a small, privacy-vetted property set.
        // PostHog itself enforces the property allow-list, we still
        // pass coarse fields only, never raw meta.
        obsTrackEvent(name as string, {
            game_mode: opts.game_mode,
            stage_id: opts.stage_id,
            // Pseudonymous IDs only, never names.
            session_id: getOrCreateSession().sessionId,
            // Surface a few well-known meta keys but nothing free-form.
            duration_ms: opts.meta?.duration_ms as number | undefined,
            init_duration_ms: opts.meta?.init_duration_ms as number | undefined,
            delegate: opts.meta?.delegate as string | undefined,
            code: opts.meta?.code as string | undefined,
            world_id: opts.meta?.world_id as string | undefined,
            object_id: opts.meta?.object_id as string | undefined,
            piece_id: opts.meta?.piece_id as string | undefined,
            target_zone_id: opts.meta?.target_zone_id as string | undefined,
            was_first_attempt: opts.meta?.was_first_attempt as boolean | undefined,
            reason: opts.meta?.reason as string | undefined,
            cta_source: opts.meta?.source as string | undefined,
        });

        // Mirror vetted funnel events to the Meta Pixel (Pixel-only events;
        // deduplicated ones fire at their call-sites). No-op unless the pixel
        // is configured. Never forwards raw meta.
        maybeTrackMeta(name as string, opts);

        // setActiveClassSessions is exported only so callers OUTSIDE
        // analytics.ts (e.g. the class conductor) can mutate it. Silence
        // unused-import warnings for tree-shaking.
        void setActiveClassSessions;
    } catch {
        // Observability must NEVER break LIOS.
    }

    // Mirror item_dropped into the learning_attempts table when the
    // meta carries the necessary fields. Mode logic files therefore
    // never have to know about that table.
    //
    // CRITICAL: the mirrored row reuses the parent event's LIOS
    // envelope (event_uid, client_seq, client_ts, context) so the
    // two rows can be joined cleanly downstream AND so the unique
    // event_uid index on learning_attempts gives us the same
    // idempotency guarantee as analytics_events.
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
            // Gesture-quality scalars (LIOS Sprint 3). The game mode
            // attaches its `gesture_quality` block to opts.meta.
            // We flatten that block onto the row's gq_* columns so
            // it's queryable without a JSON traversal.
            const gq = (m.gesture_quality ?? {}) as GestureQualityBlock;

            // Read the selected child id from sessionStorage so we
            // don't have to pipe React state through every call site.
            // Falsy / missing ⇒ NULL ⇒ the row falls under the
            // attempts_school_rows RLS policy (school / anonymous).
            let childProfileId: string | null = null;
            try {
                const raw = sessionStorage.getItem('dita-selected-child');
                if (raw && /^[0-9a-f-]{36}$/i.test(raw)) childProfileId = raw;
            } catch { /* private mode etc. */ }

            learningQueue.push({
                occurred_at: row.occurred_at,
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

                // Inherit the LIOS envelope from the parent event
                // so analytics_events.event_uid ⇔ learning_attempts.event_uid
                // joins are 1:1, and offline-queue retries dedupe.
                event_uid: row.event_uid,
                client_seq: row.client_seq,
                client_ts: row.client_ts,
                context: row.context,

                // Parent-subscription wiring: attach the selected child
                // when one is set. The RLS check `attempts_one_subject`
                // enforces that exactly one of learner_id / child_profile_id
                // is non-null per row.
                child_profile_id: childProfileId,

                // Gesture-quality columns, null when the game mode
                // didn't supply a gesture_quality block. NEVER store
                // raw coordinates; the block is scalar-only.
                gq_path_accuracy_pct:         gqOrNull(gq.path_accuracy_pct),
                gq_path_efficiency:           gqOrNull(gq.path_efficiency),
                gq_spatial_error_mean_px:     gqOrNull(gq.spatial_error_mean_px),
                gq_velocity_variance:         gqOrNull(gq.velocity_variance),
                gq_pause_count:               gqOrNull(gq.pause_count),
                gq_directional_changes:       gqOrNull(gq.directional_changes),
                gq_time_to_first_movement_ms: gqOrNull(gq.time_to_first_movement_ms),
                gq_time_to_completion_ms:     gqOrNull(gq.time_to_completion_ms),
                gq_corrections_in_stroke:     gqOrNull(gq.corrections_in_stroke),
                gq_n_samples:                 gqOrNull(gq.n_samples),
            });
            persistLearningQueue();
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // EXTENDED MIRROR, many game modes don't fire `item_dropped`. To
    // keep the parent dashboard's child_activity_summary populated for
    // EVERY mode, also mirror well-defined "win" events into
    // learning_attempts as a single was_correct=true row.
    //
    // Aggregation triggers (bump_child_activity_summary /
    // bump_child_learning_state) roll these rows up into the dashboard
    // tables. Only fires when a child is selected, anonymous /play is
    // unaffected.
    // ─────────────────────────────────────────────────────────────────
    const WIN_EVENTS = new Set<EventName>([
        'mode_completed',
        'stage_completed',
        'tracing_letter_completed',
        'wordsearch_word_found',
        'wordsearch_level_complete',
        'bubblepop_round_complete',
        'colourbuilder_match_made',
        'balloonmath_balloon_popped',
        'rainbowbridge_match_made',
        'spellingstars_word_complete',
        'build_object_completed',
        'successful_snap',
    ]);
    if (WIN_EVENTS.has(name) && opts.game_mode) {
        let childProfileId: string | null = null;
        try {
            const raw = sessionStorage.getItem('dita-selected-child');
            if (raw && /^[0-9a-f-]{36}$/i.test(raw)) childProfileId = raw;
        } catch { /* private mode etc. */ }

        // Only mirror when a child is bound, otherwise the row would
        // duplicate work the existing item_dropped mirror handles for
        // school/anonymous attribution.
        if (childProfileId) {
            const m = opts.meta ?? {};
            const itemKey =
                (m.itemKey as string | undefined) ??
                (m.item_key as string | undefined) ??
                (m.stage_id as string | undefined) ??
                (m.piece_id as string | undefined) ??
                (m.word as string | undefined) ??
                (m.letter as string | undefined) ??
                (m.balloon_id as string | undefined) ??
                name; // last resort: event name itself
            const ctx = getOrCreateSession();
            learningQueue.push({
                occurred_at: row.occurred_at,
                session_id: ctx.sessionId,
                device_id: getOrCreateDeviceId(),
                game_mode: opts.game_mode,
                stage_id: opts.stage_id ?? (m.stage_id as string | undefined) ?? null,
                stage_index: (m.stage_index as number | undefined) ?? null,
                item_key: String(itemKey),
                age_band: ctx.ageBand,
                was_correct: true,
                attempt_number: nextAttemptNumber(String(itemKey)),
                ms_to_attempt: (m.action_duration_ms as number | undefined)
                              ?? (m.duration_ms as number | undefined)
                              ?? (m.time_to_first_correct_ms as number | undefined)
                              ?? null,
                expected_value: null,
                actual_value: null,
                meta: { ...(m as Record<string, unknown>), _mirror_source: name },
                event_uid: row.event_uid,
                client_seq: row.client_seq,
                client_ts: row.client_ts,
                context: row.context,
                child_profile_id: childProfileId,
                gq_path_accuracy_pct: null,
                gq_path_efficiency: null,
                gq_spatial_error_mean_px: null,
                gq_velocity_variance: null,
                gq_pause_count: null,
                gq_directional_changes: null,
                gq_time_to_first_movement_ms: null,
                gq_time_to_completion_ms: null,
                gq_corrections_in_stroke: null,
                gq_n_samples: null,
            });
            persistLearningQueue();
        }
    }

    // Surface a lightweight window-level event so other UI surfaces (e.g.
    // the SaveProgressNudge for anonymous /play conversion) can listen
    // without importing the whole analytics pipeline. No PII, just the
    // event name. Wrap in try so a missing CustomEvent polyfill never
    // breaks the analytics path.
    try {
        if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('dita:analytics-event', { detail: { name } }));
        }
    } catch { /* never break logEvent */ }

    if (eventQueue.length >= FLUSH_BATCH_SIZE) flush();

    // LIOS Sprint 4, Adaptive Engine auto-shadow trigger.
    // When the lios_adaptive_mode feature flag is on ('shadow' or
    // 'live'), every item_dropped resolution fires a background
    // call to the rule-based recommendation engine. The decision
    // is logged into lios_adaptive_decisions for engineering review;
    // game-mode item selection is unaffected in shadow mode. The
    // dynamic import keeps the engine code out of the critical
    // logEvent path and out of bundles that don't need it.
    if (name === 'item_dropped' && opts.game_mode) {
        const m = opts.meta ?? {};
        const itemKey  = (m.itemKey ?? m.item_key) as unknown;
        const wasCorrect = m.isCorrect as unknown;
        if (typeof itemKey === 'string' && typeof wasCorrect === 'boolean') {
            // Fire and forget, never block the analytics path.
            void (async () => {
                try {
                    const mod = await import('./useAdaptiveEngine');
                    if (mod.getAdaptiveEngineMode() === 'off') return;
                    await mod.requestAdaptiveRecommendation(
                        opts.game_mode as string, itemKey, wasCorrect,
                    );
                } catch { /* engine unavailable, silent */ }
            })();
        }
    }
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
 *
 * LIOS Sprint 1: accepts an optional `context` override so that the
 * (future) classroom-code redemption flow can set the session as
 * classroom-context at the moment it begins, rather than relying on
 * a post-hoc setSessionContext() call. Defaults to whatever
 * resolveDefaultContext() decides (URL param > localStorage > 'home').
 */
export function startSession(input: {
    ageBand: AgeBand;
    schoolId?: string;
    classId?: string;
    context?: SessionContextKind;
}): string {
    session = {
        sessionId: generateUUID(),
        ageBand: input.ageBand,
        schoolId: input.schoolId ?? '',
        classId: input.classId ?? '',
        startedAt: new Date().toISOString(),
        context: input.context ?? resolveDefaultContext(),
    };
    persistSession(session);
    // Reset per-session derived state so a fresh session doesn't
    // inherit fatigue / two-hands state from the previous one.
    resetActionTimings();
    twoHandsLogged = false;
    exposedFlags.clear();
    grabTimers.clear();
    attemptCounters.clear();
    oncePerSessionFired.clear();
    clientSeq = 0;  // LIOS: per-session monotonic counter restart
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
    if (stuckTimer) { clearInterval(stuckTimer); stuckTimer = null; }

    persistSession(null);
    session = null;
    resetActionTimings();
    twoHandsLogged = false;
    exposedFlags.clear();
    grabTimers.clear();
    attemptCounters.clear();
    clientSeq = 0;  // LIOS: counter resets with the session
    clearStuckWatcher();
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
    const deviceId = getOrCreateDeviceId();

    // Hand the pseudonymous IDs to the observability layer so Sentry
    // events and PostHog identities carry them. No names, no PII,
    // pseudonymous device id only.
    try {
        if (deviceId) identifyPseudonymous(deviceId);
        obsSetContext({
            deviceId: deviceId ?? undefined,
            sessionId: session?.sessionId,
        });
    } catch {
        /* never let observability break analytics init */
    }

    // Expose a lightweight global for one-off debugging from devtools.
    // Not used by gtag, that lives in index.html and runs independently.
    (window as { dita_analytics?: unknown }).dita_analytics = {
        logEvent, startSession, endSession, hasActiveSession, getSessionId,
        markGrab, elapsedSinceGrab, noteTwoHandsSeen, exposeFeatureFlag,
        noteProductiveAction, clearStuckWatcher, setSessionContext,
        getQueueSize: () => eventQueue.length,
        getDeviceId: getOrCreateDeviceId,
        getActionTimings: () => [...actionTimings],
        getClientSeq: () => clientSeq,
        getContext: () => (session ?? loadSession())?.context ?? 'unknown',
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
    noteProductiveAction,
    clearStuckWatcher,
    setSessionContext,
    clearClassCode,
    getDeviceId: getOrCreateDeviceId,
};
