/**
 * Typed wrappers around the conductor's class_* RPCs.
 *
 * Centralised here so every component calls the same canonical
 * function with the same auth headers. The dashboard insights RPCs
 * are anon-callable; these are authenticated-only (each RPC asserts
 * auth.uid() == sessions.teacher_id internally), which is why we
 * always pass the user's JWT on Authorization.
 */

import { getSupabaseUrl, getAccessToken, getAnonKey } from '../../../lib/supabase';

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const url = `${getSupabaseUrl()}/rest/v1/rpc/${fn}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            apikey: getAnonKey(),
            Authorization: `Bearer ${getAccessToken()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${fn} → HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
}

export interface StartActivityResult {
    session_id: string;
    activity: string;
    session_activity_id: string;
    ordinal: number;
    state: 'playing';
}

export interface StateChangeResult {
    session_activity_id: string;
    state: 'paused' | 'playing' | 'ended';
    class_state?: 'in_activity' | 'between_activities' | 'ended';
}

export interface KickResult {
    student_id: string;
    name: string;
    kicked_at: string;
}

export const conductorApi = {
    startActivity: (sessionId: string, activity: string) =>
        rpc<StartActivityResult>('class_start_activity', {
            in_session_id: sessionId,
            in_activity: activity,
        }),

    pauseActivity: (sessionId: string) =>
        rpc<StateChangeResult>('class_pause_activity', { in_session_id: sessionId }),

    resumeActivity: (sessionId: string) =>
        rpc<StateChangeResult>('class_resume_activity', { in_session_id: sessionId }),

    endActivity: (sessionId: string) =>
        rpc<StateChangeResult>('class_end_activity', { in_session_id: sessionId }),

    kickStudent: (sessionId: string, studentId: string, reason?: string) =>
        rpc<KickResult>('class_kick_student', {
            in_session_id: sessionId,
            in_student_id: studentId,
            in_reason: reason ?? null,
        }),

    endSession: (sessionId: string) =>
        rpc<{ session_id: string; class_state: 'ended' }>('class_end_session', {
            in_session_id: sessionId,
        }),

    studentStats: <T>(sessionId: string, studentId: string) =>
        rpc<T>('class_student_stats', {
            in_session_id: sessionId,
            in_student_id: studentId,
        }),

    summary: <T>(sessionId: string) =>
        rpc<T>('class_summary', { in_session_id: sessionId }),

    setScoreboardVisibility: (sessionId: string, visible: boolean) =>
        rpc<{ scoreboard_visible: boolean }>('class_set_scoreboard_visibility', {
            in_session_id: sessionId,
            in_visible: visible,
        }),
};
