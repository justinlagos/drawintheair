/**
 * class-join-token: mints the short lived, session scoped student JWT.
 *
 * WP2A.3 / DIA-007 Stage B. A child proves they hold a live class code
 * (and, for the roster path, a join token), and gets back a JWT whose
 * claims name exactly one session and one roster row. RLS then keys on
 * those claims instead of the world readable "status <> 'ended'" rule.
 *
 * The project JWT secret is only ever read here, in the function
 * runtime. It is deliberately never placed in Postgres: a database that
 * holds its own signing secret can be made to forge service_role tokens
 * by any one over privileged SECURITY DEFINER function.
 *
 * Deploy with verify_jwt = false. Children have no Supabase auth
 * session, so the gateway anon apikey check is the only front door.
 *
 * Actions (JSON body):
 *   { action: "lookup",     code }                  -> { session }
 *   { action: "join",       code, name }            -> { token, session, student }
 *   { action: "token_join", session_id, join_token } -> { token, session, student }
 *   { action: "refresh" }  + Authorization: Bearer <student token>
 *                                                   -> { token, session, student }
 */

import {
  buildStudentClaims,
  importHmacKey,
  signStudentToken,
  verifyStudentToken,
} from './token.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error(`${fn} ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function restSelect<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`select ${path} ${res.status}`);
  return (await res.json()) as T;
}

type SessionRow = Record<string, unknown> & { id: string; tenant_id?: string | null };
type StudentRow = Record<string, unknown> & { id: string };

/**
 * A very small per instance leaky bucket. It is not a security control
 * on its own (Edge instances are not shared state), it only blunts a
 * single client hammering one warm instance. The real limits stay in
 * class_validate_join's advisory lock and the gateway.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;

function rateLimited(key: string, now: number): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

async function loadSession(sessionId: string): Promise<SessionRow | null> {
  const full = await rpc<SessionRow | null>('class_get_session', { in_session_id: sessionId });
  if (full) return full;
  const rows = await restSelect<SessionRow[]>(`sessions?id=eq.${sessionId}&select=*`);
  return rows[0] ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Health probe. Reports only whether configuration is present, never
  // any part of it, so an uptime monitor can prove the function is up
  // without creating a roster row.
  if (req.method === 'GET') {
    return json({
      ok: Boolean(SUPABASE_URL && SERVICE_ROLE_KEY && JWT_SECRET),
      has_url: Boolean(SUPABASE_URL),
      has_service_role: Boolean(SERVICE_ROLE_KEY),
      has_jwt_secret: Boolean(JWT_SECRET),
    });
  }

  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !JWT_SECRET) {
    return json({ error: 'NOT_CONFIGURED' }, 500);
  }

  const now = Date.now();
  const clientKey =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(clientKey, now)) return json({ error: 'RATE_LIMITED' }, 429);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }

  const key = await importHmacKey(JWT_SECRET);
  const nowSeconds = Math.floor(now / 1000);

  const action =
    typeof body.action === 'string'
      ? body.action
      : body.join_token
        ? 'token_join'
        : body.name
          ? 'join'
          : 'lookup';

  try {
    if (action === 'lookup') {
      const validated = await rpc<{ valid: boolean; code?: string; session?: SessionRow }>(
        'class_validate_join',
        { in_code: String(body.code ?? ''), in_network_fingerprint: null },
      );
      if (!validated?.valid || !validated.session) {
        return json({ error: validated?.code ?? 'INVALID_CODE' }, 400);
      }
      return json({ session: validated.session });
    }

    if (action === 'refresh') {
      const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
      const verified = await verifyStudentToken(bearer, key, nowSeconds);
      if (!verified.ok) return json({ error: verified.reason }, 401);
      const rows = await restSelect<Array<Record<string, unknown>>>(
        `session_students?id=eq.${verified.claims.student_id}` +
          `&session_id=eq.${verified.claims.session_id}&select=*`,
      );
      const student = rows[0] as StudentRow | undefined;
      if (!student || student.kicked_at) return json({ error: 'NOT_IN_SESSION' }, 403);
      const session = await loadSession(verified.claims.session_id);
      if (!session || session.status === 'ended') return json({ error: 'SESSION_ENDED' }, 403);
      const claims = buildStudentClaims({
        sessionId: verified.claims.session_id,
        studentId: verified.claims.student_id,
        tenantId: (session.tenant_id as string | null) ?? null,
        nowSeconds,
      });
      return json({ token: await signStudentToken(claims, key), session, student });
    }

    let sessionId: string;
    let student: StudentRow;

    if (action === 'token_join') {
      sessionId = String(body.session_id ?? '');
      student = await rpc<StudentRow>('class_join_with_token', {
        in_session_id: sessionId,
        in_token: String(body.join_token ?? ''),
      });
      if (!student?.id) return json({ error: 'INVALID_TOKEN' }, 400);
    } else if (action === 'join') {
      const validated = await rpc<{ valid: boolean; code?: string; session?: SessionRow }>(
        'class_validate_join',
        { in_code: String(body.code ?? ''), in_network_fingerprint: null },
      );
      if (!validated?.valid || !validated.session) {
        return json({ error: validated?.code ?? 'INVALID_CODE' }, 400);
      }
      sessionId = String(validated.session.id);
      const name = String(body.name ?? '').trim();
      if (!name) return json({ error: 'NAME_REQUIRED' }, 400);
      student = await rpc<StudentRow>('class_join', {
        in_session_id: sessionId,
        in_name: name.slice(0, 40),
      });
      if (!student?.id) return json({ error: 'JOIN_FAILED' }, 400);
    } else {
      return json({ error: 'UNKNOWN_ACTION' }, 400);
    }

    const session = await loadSession(sessionId);
    if (!session) return json({ error: 'SESSION_NOT_FOUND' }, 404);
    const claims = buildStudentClaims({
      sessionId,
      studentId: student.id,
      tenantId: (session.tenant_id as string | null) ?? null,
      nowSeconds,
    });
    return json({ token: await signStudentToken(claims, key), session, student });
  } catch (e) {
    console.error('class-join-token', action, (e as Error).message);
    return json({ error: 'UPSTREAM_FAILED' }, 502);
  }
});
