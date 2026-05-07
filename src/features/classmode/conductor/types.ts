/**
 * Shared types for the Conductor (class-mode v2) flow.
 * Single source of truth for the wire format coming back from
 * Supabase and the new class_* RPCs.
 */

import type { GameModeId } from '../scoreMapping';

export type ClassState =
    | 'lobby'
    | 'in_activity'
    | 'between_activities'
    | 'ended';

export type ActivityState =
    | 'starting'
    | 'playing'
    | 'paused'
    | 'results'
    | 'ended';

/** Row in public.sessions — matches the live schema after the
 *  conductor_v1 migration. */
export interface SessionRow {
    id: string;
    teacher_id: string;
    code: string;
    activity: string | null;
    class_state: ClassState;
    current_activity_id: string | null;
    class_name: string | null;
    scoreboard_visible: boolean;
    timer_seconds: number;
    started_at: string | null;
    ended_at: string | null;
    created_at: string;
    updated_at: string | null;
}

/** Row in public.session_activities. */
export interface SessionActivityRow {
    id: string;
    session_id: string;
    activity: GameModeId;
    state: ActivityState;
    ordinal: number;
    started_at: string;
    ended_at: string | null;
    metadata: Record<string, unknown>;
}

/** Row in public.session_students. */
export interface StudentRow {
    id: string;
    session_id: string;
    name: string;
    avatar_seed: string | null;
    joined_at: string;
    left_at: string | null;
    is_active: boolean;
    is_connected: boolean;
    kicked_at: string | null;
    kicked_reason: string | null;
}

/** Result shape returned by class_student_stats RPC. */
export interface StudentStats {
    student_id: string;
    name: string;
    avatar_seed: string | null;
    joined_at: string;
    is_active: boolean;
    kicked_at: string | null;
    kicked_reason: string | null;
    activities: Array<{
        session_activity_id: string;
        activity: GameModeId;
        ordinal: number;
        state: ActivityState;
        started_at: string;
        ended_at: string | null;
        rounds: Array<{
            round: number;
            stars: number;
            raw_score: number;
            duration_seconds: number;
            completed: boolean;
            submitted_at: string;
        }> | null;
    }>;
    totals: {
        rounds: number;
        stars: number;
        time_on_task_s: number;
    };
}

/** Result shape returned by class_summary RPC. */
export interface ClassSummary {
    session: {
        id: string;
        class_name: string | null;
        code: string;
        started_at: string | null;
        ended_at: string | null;
        duration_minutes: number | null;
    };
    students: Array<{
        student_id: string;
        name: string;
        avatar_seed: string | null;
        kicked: boolean;
        rounds: number;
        stars: number;
        time_on_task_s: number;
    }> | null;
    activities: Array<{
        activity: GameModeId;
        ordinal: number;
        started_at: string;
        ended_at: string | null;
        duration_seconds: number | null;
        rounds_count: number;
        avg_stars: number | null;
    }> | null;
    totals: {
        rounds_completed: number;
        total_stars: number;
        avg_stars: number | null;
        students_active: number;
        students_total: number;
    } | null;
}

/** Engagement bucket — the only three states the teacher actually
 *  needs to see on a roster card. Anything more is cognitive load. */
export type EngagementStatus = 'engaged' | 'stuck' | 'offline';
