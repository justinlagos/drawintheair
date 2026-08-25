/**
 * Pure classroom reconciliation helpers (P0 2026-07-09).
 *
 * Kept free of React/DOM imports so they can be unit-tested in node and
 * shared by the student client and teacher console without pulling the
 * camera stack into either test environment.
 */

import type { SessionRow, SessionActivityRow, StudentRow, EngagementStatus } from './conductor/types';

/**
 * Decide whether freshly fetched session/activity state differs from what
 * the UI currently shows. The activity STATE comparison is the critical
 * part: pause/resume change session_activities.state without changing the
 * activity id, so an id-only comparison (the pre-incident behaviour)
 * silently discarded pauses the realtime channel had missed.
 */
export function classroomStateChanged(
    prevSession: SessionRow,
    prevActivity: SessionActivityRow | null,
    nextSession: SessionRow,
    nextActivity: SessionActivityRow | null,
): boolean {
    if ((prevSession.status ?? null) !== (nextSession.status ?? null)) return true;
    if (prevSession.class_state !== nextSession.class_state) return true;
    if ((prevSession.current_activity_id ?? null) !== (nextSession.current_activity_id ?? null)) return true;
    if ((prevSession.activity ?? null) !== (nextSession.activity ?? null)) return true;
    if ((prevSession.round ?? null) !== (nextSession.round ?? null)) return true;
    if (prevSession.timer_seconds !== nextSession.timer_seconds) return true;
    if ((prevActivity?.id ?? null) !== (nextActivity?.id ?? null)) return true;
    if ((prevActivity?.state ?? null) !== (nextActivity?.state ?? null)) return true;
    return false;
}

/** Presence staleness thresholds (ms). The student client heartbeats
 *  session_students.updated_at every ~5s while its tab is visible. */
export const PRESENCE_FRESH_MS = 15_000;
export const PRESENCE_STALE_MS = 20_000;

/**
 * Derive a student's engagement bucket from heartbeat staleness.
 * is_active/is_connected are write-once at join and CANNOT be trusted on
 * their own (closed tabs stayed "engaged" forever); they only arbitrate
 * the 15–20s grey zone to avoid flapping.
 */
export function engagementOf(student: StudentRow, nowMs: number = Date.now()): EngagementStatus {
    if (student.kicked_at) return 'offline';
    const lastBeat = student.updated_at ?? student.joined_at;
    const age = nowMs - new Date(lastBeat).getTime();
    if (age <= PRESENCE_FRESH_MS) return 'engaged';
    if (age >= PRESENCE_STALE_MS) return 'offline';
    if (student.is_active === false || student.is_connected === false) return 'offline';
    return 'engaged'; // 'stuck' is set externally via stuck_detected events
}
