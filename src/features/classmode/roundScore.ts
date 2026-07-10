/**
 * Round-score submission helpers (P0 2026-07-09). Pure and node-testable:
 * deliberately NO import from scoreMapping — that module pulls every game
 * engine (canvas polyfills included) and cannot load outside a browser.
 * The caller computes stars via rawToStars and passes them in.
 */

export interface RoundScoreArgs {
    sessionId: string;
    studentId: string;
    /** session_activities.id — stored so results group per activity. */
    sessionActivityId?: string;
    /** Activity ordinal used as the round number. round=1-for-everything
     *  collided with UNIQUE(session_id, student_id, round) and silently
     *  lost every score after a session's first activity. */
    round: number;
    activity: string;
    rawScore: number;
    /** 1-5, precomputed by the caller (rawToStars). */
    stars: number;
    startedAtMs: number;
    nowMs: number;
}

export interface RoundScoreRow {
    session_id: string;
    student_id: string;
    session_activity_id?: string;
    round: number;
    stars: number;
    raw_score: number;
    activity: string;
    duration_seconds: number;
    completed: boolean;
}

/** Build the exact round_scores insert payload. */
export function buildRoundScoreRow(args: RoundScoreArgs): RoundScoreRow {
    return {
        session_id: args.sessionId,
        student_id: args.studentId,
        ...(args.sessionActivityId ? { session_activity_id: args.sessionActivityId } : {}),
        round: args.round,
        stars: Math.max(1, Math.min(5, Math.round(args.stars))),
        raw_score: args.rawScore,
        activity: args.activity,
        duration_seconds: Math.max(0, Math.round((args.nowMs - args.startedAtMs) / 1000)),
        completed: true,
    };
}

/**
 * Single-acquisition guard for the submit path. Synchronous acquire, so a
 * burst of terminal events (timer expiry + activity-ended prop + realtime
 * echo + unmount) can never double-submit — unlike a React state flag,
 * which updates asynchronously and lets racers through.
 */
export function createOnceGuard(): { tryAcquire: () => boolean; acquired: () => boolean } {
    let taken = false;
    return {
        tryAcquire: () => {
            if (taken) return false;
            taken = true;
            return true;
        },
        acquired: () => taken,
    };
}
