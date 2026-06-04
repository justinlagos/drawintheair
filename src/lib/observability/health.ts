/**
 * Health registry, the in-memory nervous system.
 *
 * Holds rolling counters and a small ring buffer of recent critical
 * events so the System Health panel can render without hitting an
 * external service. Lives in the browser, scoped to the current tab.
 *
 * Why client-side only:
 *   • Zero new infra to operate.
 *   • Fast, the panel just reads.
 *   • Sentry / PostHog / Supabase remain the authoritative stores;
 *     this is a convenience surface.
 *
 * Privacy: every field here is either a counter or a short scope tag.
 * No child names, no raw events, no PII. The `lastErrorMessage` is
 * limited to 200 chars and stripped of obvious PII patterns.
 */

const MAX_INCIDENT_LOG = 20;
const MAX_MESSAGE_LEN = 200;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HealthIncident {
    at: number; // epoch ms
    scope: string;
    level: 'fatal' | 'error' | 'warning' | 'info';
    message: string;
}

export interface HealthSnapshot {
    /** Number of unique error scopes seen this session, quick "is anything on fire" check. */
    openIssues: number;
    /** Total errors captured this session. */
    totalErrors: number;
    /** Most recent critical (error/fatal) message + scope, or null. */
    lastCriticalError: HealthIncident | null;

    /** Camera flow counters. */
    cameraRequested: number;
    cameraGranted: number;
    cameraDenied: number;
    /** Granted / requested, 0..1; null when no requests yet. */
    cameraGrantRate: number | null;

    /** Tracker counters. */
    trackerInitStarted: number;
    trackerInitSucceeded: number;
    trackerInitFailed: number;
    trackerSuccessRate: number | null;

    /** Supabase RPC failures, partitioned by RPC name. */
    supabaseRpcFailures: number;

    /** Classroom realtime sync failures. */
    classroomSyncFailures: number;

    /** Active class sessions observed this tab. */
    activeClassSessions: number;

    /** Last deployed release version (from VITE_APP_VERSION). */
    release: string;
    /** Environment tag (from VITE_APP_ENV). */
    environment: string;

    /** Last 20 incidents, newest first. */
    incidents: HealthIncident[];

    /** Wall-clock when the snapshot was taken. */
    snapshotAt: number;
}

// ─── Internal state ──────────────────────────────────────────────────────────

interface Counters {
    cameraRequested: number;
    cameraGranted: number;
    cameraDenied: number;
    trackerInitStarted: number;
    trackerInitSucceeded: number;
    trackerInitFailed: number;
    supabaseRpcFailures: number;
    classroomSyncFailures: number;
    activeClassSessions: number;
    totalErrors: number;
}

const counters: Counters = {
    cameraRequested: 0,
    cameraGranted: 0,
    cameraDenied: 0,
    trackerInitStarted: 0,
    trackerInitSucceeded: 0,
    trackerInitFailed: 0,
    supabaseRpcFailures: 0,
    classroomSyncFailures: 0,
    activeClassSessions: 0,
    totalErrors: 0,
};

const incidents: HealthIncident[] = [];
const seenScopes = new Set<string>();

// PII pattern scrubber, runs on every recorded message as defence in depth.
// We strip anything that looks like an email, a long token, or a path that
// might leak a username.
function sanitizeMessage(raw: string): string {
    let s = String(raw);
    // Emails
    s = s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]');
    // Long alphanumeric tokens (likely JWTs / keys)
    s = s.replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[token]');
    // Home-directory paths
    s = s.replace(/\/Users\/[^/\s]+/g, '/Users/[user]');
    s = s.replace(/\/home\/[^/\s]+/g, '/home/[user]');
    if (s.length > MAX_MESSAGE_LEN) s = s.slice(0, MAX_MESSAGE_LEN) + '…';
    return s;
}

// ─── Recording API ───────────────────────────────────────────────────────────

export function recordCriticalError(input: {
    scope: string;
    message: string;
    level: HealthIncident['level'];
    at: number;
}): void {
    counters.totalErrors += 1;
    seenScopes.add(input.scope);
    incidents.unshift({
        at: input.at,
        scope: input.scope,
        level: input.level,
        message: sanitizeMessage(input.message),
    });
    if (incidents.length > MAX_INCIDENT_LOG) incidents.length = MAX_INCIDENT_LOG;
}

export function recordCameraRequested(): void { counters.cameraRequested += 1; }
export function recordCameraGranted(): void { counters.cameraGranted += 1; }
export function recordCameraDenied(): void { counters.cameraDenied += 1; }

export function recordTrackerInitStarted(): void { counters.trackerInitStarted += 1; }
export function recordTrackerInitSucceeded(): void { counters.trackerInitSucceeded += 1; }
export function recordTrackerInitFailed(): void { counters.trackerInitFailed += 1; }

export function recordSupabaseRpcFailure(rpcName?: string): void {
    counters.supabaseRpcFailures += 1;
    if (rpcName) {
        recordCriticalError({
            scope: 'supabase',
            message: `RPC failed: ${rpcName}`,
            level: 'warning',
            at: Date.now(),
        });
    }
}

export function recordClassroomSyncFailure(): void {
    counters.classroomSyncFailures += 1;
}

export function setActiveClassSessions(n: number): void {
    counters.activeClassSessions = Math.max(0, Math.floor(n));
}

// ─── Read API ────────────────────────────────────────────────────────────────

export function getHealthSnapshot(): HealthSnapshot {
    const cameraGrantRate =
        counters.cameraRequested > 0
            ? counters.cameraGranted / counters.cameraRequested
            : null;
    const trackerSuccessRate =
        counters.trackerInitStarted > 0
            ? counters.trackerInitSucceeded / counters.trackerInitStarted
            : null;

    const lastCritical = incidents.find((i) => i.level === 'error' || i.level === 'fatal') ?? null;

    return {
        openIssues: seenScopes.size,
        totalErrors: counters.totalErrors,
        lastCriticalError: lastCritical,
        cameraRequested: counters.cameraRequested,
        cameraGranted: counters.cameraGranted,
        cameraDenied: counters.cameraDenied,
        cameraGrantRate,
        trackerInitStarted: counters.trackerInitStarted,
        trackerInitSucceeded: counters.trackerInitSucceeded,
        trackerInitFailed: counters.trackerInitFailed,
        trackerSuccessRate,
        supabaseRpcFailures: counters.supabaseRpcFailures,
        classroomSyncFailures: counters.classroomSyncFailures,
        activeClassSessions: counters.activeClassSessions,
        release: (import.meta.env.VITE_APP_VERSION as string | undefined) || '0.0.0-dev',
        environment: (import.meta.env.VITE_APP_ENV as string | undefined) || 'development',
        incidents: incidents.slice(),
        snapshotAt: Date.now(),
    };
}

/** Test/dev helper, wipes the registry. Never call from production paths. */
export function __resetHealthForTests(): void {
    counters.cameraRequested = 0;
    counters.cameraGranted = 0;
    counters.cameraDenied = 0;
    counters.trackerInitStarted = 0;
    counters.trackerInitSucceeded = 0;
    counters.trackerInitFailed = 0;
    counters.supabaseRpcFailures = 0;
    counters.classroomSyncFailures = 0;
    counters.activeClassSessions = 0;
    counters.totalErrors = 0;
    incidents.length = 0;
    seenScopes.clear();
}
