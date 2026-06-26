import { callRpc, dbSelect } from '../../../lib/supabase';
import type {
  JoinValidationResult,
  ActivityAssignment,
  AssignActivityRequest,
} from './joinTypes';

export interface StudentAssignmentResult {
  count: number;
}

const JOINABLE_STATUSES = ['waiting', 'active', 'paused', 'lobby'];
const JOINABLE_CLASS_STATES = ['lobby', 'in_activity'];

function isJoinable(status: string | null | undefined, allowed: string[]): boolean {
  return status != null && allowed.includes(status);
}

/** Supabase Functions URL — constructed from the project URL so it works
 *  in production and in any dev environment that has a functions endpoint. */
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? '';
const FUNCTIONS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '';

/**
 * Network-UNAWARE code validation. Only used as a dev/preview fallback when the
 * Functions endpoint isn't configured. Production validation always goes
 * through the edge (see joinApi.validateCode) so the network gate is enforced.
 */
async function validateCodeFallback(code: string): Promise<JoinValidationResult> {
  const { data: session } = await callRpc<Record<string, unknown> | null>(
    'session_lookup_by_code',
    { in_code: code },
  );
  const row = session
    ?? (await dbSelect<Record<string, unknown>[]>(
      'sessions',
      `code=eq.${encodeURIComponent(code)}&select=id,code,activity,status,class_state,current_activity_id,timer_seconds&limit=1`,
    )).data?.[0];
  if (!row) return { valid: false, code: 'INVALID_CODE' };

  const status = (row.status as string) ?? '';
  const classState = (row.class_state as string) ?? '';
  if (!isJoinable(status, JOINABLE_STATUSES) && !isJoinable(classState, JOINABLE_CLASS_STATES)) {
    return { valid: false, code: 'SESSION_NOT_JOINABLE' };
  }
  return {
    valid: true,
    code: 'OK',
    session: {
      id: row.id as string,
      code: row.code as string,
      activity: (row.activity as string) ?? null,
      class_state: classState || 'waiting',
      current_activity_id: (row.current_activity_id as string) ?? null,
      timer_seconds: (row.timer_seconds as number) ?? 90,
    },
  };
}

export const joinApi = {
  /**
   * Validate a class code AND the student's network in ONE server round-trip.
   *
   * This goes through the join-class Edge Function so the network check runs
   * server-side (the browser never sees or sends an IP) and so we never reveal
   * whether a class exists until BOTH the code and the network have passed —
   * the edge returns NETWORK_MISMATCH / INVALID_CODE / RATE_LIMITED, etc.
   *
   * Falls back to a direct (network-unaware) lookup ONLY when the Functions
   * endpoint isn't configured (local dev / preview without `supabase functions
   * serve`). Production always has FUNCTIONS_URL.
   */
  validateCode: async (code: string): Promise<JoinValidationResult> => {
    if (FUNCTIONS_URL) {
      try {
        const res = await fetch(`${FUNCTIONS_URL}/join-class`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'validate', code }),
        });
        const data = await res.json().catch(() => null) as
          | (JoinValidationResult & { session?: Record<string, unknown> })
          | null;
        if (data && typeof data.valid === 'boolean') {
          if (!data.valid || !data.session) {
            return { valid: false, code: data.code, retry_after_seconds: data.retry_after_seconds };
          }
          const s = data.session as Record<string, unknown>;
          return {
            valid: true,
            code: 'OK',
            session: {
              id: s.id as string,
              code: (s.code as string) ?? code,
              activity: (s.activity as string) ?? null,
              class_state: ((s.class_state as string) || 'waiting'),
              current_activity_id: (s.current_activity_id as string) ?? null,
              timer_seconds: (s.timer_seconds as number) ?? 90,
            },
          };
        }
        // Malformed response — fall through to the dev fallback below.
      } catch {
        return { valid: false, code: 'JOIN_FAILED' };
      }
    }
    return validateCodeFallback(code);
  },

  /** Call the join-class Supabase Edge Function — the server resolves
   *  the client IP, generates the network fingerprint, and calls
   *  class_join_with_network. The browser never touches the raw IP. */
  joinWithNetwork: async (sessionId: string, name: string) => {
    if (!FUNCTIONS_URL) {
      return { data: null, error: { message: 'Functions not configured', code: 'CONFIG_ERROR' } };
    }
    try {
      const res = await fetch(`${FUNCTIONS_URL}/join-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'join', sessionId, name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'JOIN_FAILED' }));
        const errorCode = (err as { error?: string }).error ?? 'JOIN_FAILED';
        return {
          data: null,
          error: { message: errorCode, code: String(res.status) },
        };
      }
      const data = await res.json();
      return {
        data: {
          id: data.id as string,
          session_id: data.session_id as string,
          name: data.name as string,
          avatar_seed: data.avatar_seed as string | null,
        },
        error: null,
      };
    } catch (e) {
      return {
        data: null,
        error: { message: 'JOIN_FAILED', code: 'FETCH_ERROR' },
      };
    }
  },

  getStudentAssignments: async (studentId: string, sessionId: string) => {
    const { data } = await callRpc<ActivityAssignment[]>(
      'get_student_assignments',
      { in_student_id: studentId, in_session_id: sessionId },
    );
    return data;
  },

  setStudentAssignments: async (
    sessionId: string,
    studentId: string,
    activities: AssignActivityRequest[],
  ) => {
    // in_activities is a jsonb parameter — pass the array DIRECTLY. Sending a
    // JSON.stringify'd string makes PostgREST bind a scalar jsonb string, and
    // the function's jsonb_array_elements() then errors ("cannot extract
    // elements from a scalar"), which silently broke every assignment save.
    return callRpc<StudentAssignmentResult>('set_student_assignments', {
      in_session_id: sessionId,
      in_student_id: studentId,
      in_activities: activities,
    });
  },

  setClassroomDefaults: async (sessionId: string, activities: string[]) => {
    return callRpc<{ session_id: string; count: number }>(
      'set_classroom_default_activities',
      { in_session_id: sessionId, in_activities: activities },
    );
  },

  setNetworkFingerprint: async (sessionId: string) => {
    // Resolve the teacher IP server-side via the geo endpoint, then
    // pass it to the RPC for fingerprint generation. The teacher is
    // authenticated, so the risk is lower than the anonymous join case.
    let teacherIp = '';
    try {
      const res = await fetch('/api/geo');
      if (res.ok) {
        const geo = await res.json() as { ip?: string };
        if (geo.ip) teacherIp = geo.ip;
      }
    } catch { /* use empty IP — will generate no fingerprint */ }
    const { data } = await callRpc<{ session_id: string; has_fingerprint: boolean }>(
      'session_set_network_fingerprint',
      { in_session_id: sessionId, in_teacher_ip: teacherIp },
    );
    return data;
  },
};
