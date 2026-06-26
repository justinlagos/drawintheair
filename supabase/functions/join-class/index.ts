// join-class — the single trusted server boundary for the classroom join flow.
//
// Two actions, both anonymous-callable (anon JWT satisfies verify_jwt):
//   { action: 'validate', code }            → validate code + network, reveal
//                                              nothing about the class until
//                                              both pass.
//   { action: 'join', sessionId, name }     → create / reconnect the student.
//
// The client never sends an IP or a network fingerprint. This function
// resolves the TRUSTED client IP server-side and passes it to the *_by_ip
// RPCs, which derive the HMAC fingerprint in SQL (single source of truth) and
// run all validation/insert logic atomically. No raw IP is ever stored or
// logged.

import { preflight, corsHeaders } from '../_shared/cors.ts';
import { resolveTrustedClientIp, ipRateLimitKey } from '../_shared/network.ts';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get(key: string): string | undefined };
};

type JoinErrorCode =
  | 'INVALID_CODE'
  | 'CODE_EXPIRED'
  | 'SESSION_NOT_JOINABLE'
  | 'SESSION_EXPIRED'
  | 'NETWORK_MISMATCH'
  | 'STUDENT_NOT_FOUND'
  | 'INVALID_NAME'
  | 'RATE_LIMITED'
  | 'JOIN_FAILED';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const rpcHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/** Call a Postgres RPC with the service-role key. Returns parsed JSON on
 *  success, or a typed error describing the SQL failure. */
async function callRpc(
  fn: string,
  args: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: rpcHeaders,
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, status: res.status, message: String((body as { message?: string }).message ?? res.statusText) };
  }
  return { ok: true, data: await res.json() };
}

/** Map a Postgres RAISE EXCEPTION message to a typed, client-safe error code.
 *  Never leak the raw SQL message to the client. */
function mapSqlError(message: string): JoinErrorCode {
  const m = message.toLowerCase();
  if (m.includes('network mismatch')) return 'NETWORK_MISMATCH';
  if (m.includes('not joinable')) return 'SESSION_NOT_JOINABLE';
  if (m.includes('expired')) return 'SESSION_EXPIRED';
  if (m.includes('invalid join') || m.includes('invalid name')) return 'INVALID_NAME';
  return 'JOIN_FAILED';
}

/** PII-safe structured log line for Supabase edge logs. No raw IP, no name,
 *  no tokens. */
function logEvent(fields: Record<string, unknown>) {
  try { console.log(JSON.stringify({ fn: 'join-class', ...fields })); } catch { /* never break the request */ }
}

/** Fire-and-forget audit row. Stores only the event, result code, and a
 *  network-match boolean — never the IP, name, or fingerprint. */
async function audit(
  sessionId: string | null,
  studentId: string | null,
  event: string,
  resultCode: string,
  metadata: Record<string, unknown>,
) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/join_audit_log`, {
      method: 'POST',
      headers: { ...rpcHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        session_id: sessionId,
        student_id: studentId,
        event,
        result_code: resultCode,
        metadata,
      }),
    });
  } catch { /* audit must never break the join */ }
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  const headers = { ...corsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' };

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method !== 'POST') return json({ error: 'JOIN_FAILED' }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) {
    logEvent({ event: 'config_error' });
    return json({ error: 'JOIN_FAILED' }, 500);
  }

  let body: { action?: string; code?: string; sessionId?: string; name?: string };
  try { body = await req.json(); } catch { return json({ error: 'JOIN_FAILED' }, 400); }

  // Infer the action for back-compat (older clients posted { sessionId, name }).
  const action = body.action ?? (body.code && !body.sessionId ? 'validate' : 'join');

  // Trusted client IP + PII-safe rate-limit bucket key.
  const clientIp = resolveTrustedClientIp(req.headers);
  const ipKey = await ipRateLimitKey(clientIp);

  try {
    // ── VALIDATE ────────────────────────────────────────────────────────────
    if (action === 'validate') {
      const code = (body.code ?? '').trim();
      if (!code) return json({ valid: false, code: 'INVALID_CODE' });

      const r = await callRpc('class_validate_join_by_ip', { in_code: code, in_client_ip: clientIp });
      if (!r.ok) {
        logEvent({ event: 'validate', result: 'JOIN_FAILED', status: r.status });
        return json({ valid: false, code: 'JOIN_FAILED' }, 500);
      }
      const result = r.data as { valid: boolean; code: string; session?: { id?: string } };

      // Anti-guessing: only spend a rate-limit token on a FAILED code lookup,
      // so a whole class entering the correct code (sharing one school NAT IP)
      // never trips the limit, but brute-forcing wrong codes does.
      if (!result.valid && result.code === 'INVALID_CODE') {
        const rl = await callRpc('check_join_rate_limit', { in_ip_hash: ipKey });
        if (rl.ok) {
          const { allowed, retry_after_seconds } = rl.data as { allowed: boolean; retry_after_seconds: number };
          if (!allowed) {
            logEvent({ event: 'validate', result: 'RATE_LIMITED' });
            return json({ valid: false, code: 'RATE_LIMITED', retry_after_seconds });
          }
        }
      }

      logEvent({
        event: 'validate',
        result: result.code,
        sessionId: result.session?.id ?? null,
        networkChecked: clientIp !== '',
      });
      await audit(result.session?.id ?? null, null, 'validate', result.code, { networkChecked: clientIp !== '' });
      return json(result);
    }

    // ── JOIN ──────────────────────────────────────────────────────────────────
    const sessionId = (body.sessionId ?? '').trim();
    const name = (body.name ?? '').trim();
    if (!sessionId) return json({ error: 'JOIN_FAILED' }, 400);
    if (!name || name.length > 40) return json({ error: 'INVALID_NAME' }, 400);

    const r = await callRpc('class_join_by_ip', {
      in_session_id: sessionId,
      in_name: name,
      in_client_ip: clientIp,
    });

    if (!r.ok) {
      const code = mapSqlError(r.message);
      logEvent({ event: 'join', result: code, sessionId, status: r.status });
      await audit(sessionId, null, 'join', code, { networkChecked: clientIp !== '' });
      return json({ error: code }, code === 'JOIN_FAILED' ? 500 : 400);
    }

    const student = r.data as { id: string; session_id: string; name: string; avatar_seed: string | null };
    logEvent({ event: 'join', result: 'OK', sessionId, studentId: student.id, networkChecked: clientIp !== '' });
    await audit(sessionId, student.id, 'join', 'OK', { networkChecked: clientIp !== '' });
    return json({
      id: student.id,
      session_id: student.session_id,
      name: student.name,
      avatar_seed: student.avatar_seed,
    });
  } catch (e) {
    logEvent({ event: action, result: 'JOIN_FAILED', error: e instanceof Error ? e.name : 'unknown' });
    return json(action === 'validate' ? { valid: false, code: 'JOIN_FAILED' } : { error: 'JOIN_FAILED' }, 500);
  }
});
