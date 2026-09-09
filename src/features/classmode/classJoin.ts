/**
 * Class join through the class-join-token Edge Function.
 *
 * WP2A.3 (DIA-007 Stage B). Joining used to be two anonymous RPCs
 * (session_lookup_by_code then class_join) against tables that any
 * anonymous caller could also read directly. Both now sit behind one
 * Edge Function that runs them with the service role and hands the child
 * back a JWT scoped to exactly one session and one roster row.
 *
 * The token is stored through setStudentToken(), which puts it on every
 * later PostgREST call and pushes it into the realtime socket.
 */

import {
    getAnonKey,
    getSupabaseUrl,
    setStudentToken,
    getStudentToken,
} from '../../lib/supabase';
import type { SessionRow, StudentRow } from './conductor/types';

export interface JoinResult {
    session: SessionRow;
    student: StudentRow;
}

export type JoinError =
    /** The code is not a live joinable class. */
    | 'INVALID_CODE'
    /** The class exists but is over, full, or past its four-hour cap. */
    | 'NOT_JOINABLE'
    /** Could not reach the join service. Distinct from a wrong code. */
    | 'UNREACHABLE';

const FUNCTION_PATH = '/functions/v1/class-join-token';

interface FunctionResponse {
    token?: string;
    session?: SessionRow;
    student?: StudentRow;
    error?: string;
}

async function callJoinFunction(
    body: Record<string, unknown>,
    bearer?: string,
): Promise<{ data: FunctionResponse | null; status: number }> {
    try {
        const res = await fetch(`${getSupabaseUrl()}${FUNCTION_PATH}`, {
            method: 'POST',
            headers: {
                apikey: getAnonKey(),
                Authorization: `Bearer ${bearer ?? getAnonKey()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => null)) as FunctionResponse | null;
        return { data, status: res.status };
    } catch {
        return { data: null, status: 0 };
    }
}

/**
 * Map a function error to something the child screen can say. Anything
 * that is not clearly a bad code is reported as unreachable, so a child
 * is never told to re-type a code that was correct.
 */
function toJoinError(status: number, code: string | undefined): JoinError {
    if (status === 0 || status >= 500) return 'UNREACHABLE';
    if (code === 'INVALID_CODE') return 'INVALID_CODE';
    if (
        code === 'SESSION_NOT_JOINABLE' ||
        code === 'SESSION_EXPIRED' ||
        code === 'NETWORK_MISMATCH' ||
        code === 'RATE_LIMITED'
    ) {
        return 'NOT_JOINABLE';
    }
    return 'UNREACHABLE';
}

/** Resolve a class code to a session, without creating a roster row. */
export async function lookupClassCode(
    code: string,
): Promise<{ session: SessionRow } | { error: JoinError }> {
    const { data, status } = await callJoinFunction({ action: 'lookup', code });
    if (data?.session) return { session: data.session };
    return { error: toJoinError(status, data?.error) };
}

/** Join by first name. On success the student token is stored. */
export async function joinClassWithName(
    code: string,
    name: string,
): Promise<JoinResult | { error: JoinError }> {
    const { data, status } = await callJoinFunction({ action: 'join', code, name });
    if (data?.token && data.session && data.student) {
        setStudentToken(data.token);
        return { session: data.session, student: data.student };
    }
    return { error: toJoinError(status, data?.error) };
}

/** Join through a roster link or QR token. On success the token is stored. */
export async function joinClassWithToken(
    sessionId: string,
    joinToken: string,
): Promise<JoinResult | { error: JoinError }> {
    const { data, status } = await callJoinFunction({
        action: 'token_join',
        session_id: sessionId,
        join_token: joinToken,
    });
    if (data?.token && data.session && data.student) {
        setStudentToken(data.token);
        return { session: data.session, student: data.student };
    }
    return { error: toJoinError(status, data?.error) };
}

/**
 * Swap a near-expiry token for a fresh one. Returns false when the
 * child is no longer in the class (kicked, or the class ended), which
 * the caller should treat exactly as it treats a null session.
 */
export async function refreshStudentToken(): Promise<boolean> {
    const current = getStudentToken();
    if (!current) return false;
    const { data } = await callJoinFunction({ action: 'refresh' }, current);
    if (!data?.token) return false;
    setStudentToken(data.token);
    return true;
}

export function isJoinError(
    value: JoinResult | { error: JoinError },
): value is { error: JoinError } {
    return 'error' in value;
}
