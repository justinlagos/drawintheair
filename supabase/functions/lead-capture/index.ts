/**
 * POST /functions/v1/lead-capture
 *
 * Owned endpoint for every marketing form on drawintheair.com
 * (school pack, school pilot, parent trial, newsletter, contact, feedback).
 * Replaces https://app.drawintheair.com/api/form-submission, which lived on
 * the retired platform project and now 404s (DIA-013).
 *
 * Flow:
 *   1. CORS: only drawintheair.com, www, Vercel previews of the
 *      `drawintheair` project, and localhost.
 *   2. Validate the body (type whitelist, email shape, length caps,
 *      honeypot field `website`).
 *   3. Rate limit by hashed client IP through the service-role-only RPC
 *      lead_capture_rate_check (migration 20260907130000).
 *   4. Insert into public.form_submissions with the service role.
 *   5. Founder notification is NOT sent here. The email-dispatch cron
 *      (every 15 minutes) picks up rows with founder_notified_at null and
 *      emails LEAD_NOTIFY_TO (default partnership@drawintheair.com).
 *
 * Auth: called with the anon key (apikey + Authorization headers). Deploy
 * with --no-verify-jwt is NOT needed; the anon JWT satisfies the gateway.
 *
 * Responses are honest: 200 only after the row is stored. The client shows
 * an error otherwise; nothing is reported as "sent" that was not stored.
 */

// @ts-ignore esm.sh URL imports are valid in Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4?target=deno';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get(key: string): string | undefined };
};

import { isAllowedOrigin, validateLead, ALLOWED_ORIGINS, RATE_LIMIT, RATE_WINDOW_SECONDS } from './validate.ts';

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? (origin as string) : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    'Content-Type': 'application/json',
  };
}

async function hashIp(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  const first = xff.split(',')[0]?.trim();
  return first || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(async (req: Request) => {
    const origin = req.headers.get('Origin');
    const headers = corsHeaders(origin);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }
    if (origin && !isAllowedOrigin(origin)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
    }

    const v = validateLead(body);
    if (!v.ok) return new Response(JSON.stringify({ error: v.error }), { status: 400, headers });
    if (v.honeypot) return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!serviceKey || !supabaseUrl) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 503, headers });
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const ipHash = await hashIp(clientIp(req), serviceKey);
    const { data: allowed, error: rlError } = await supabase.rpc('lead_capture_rate_check', {
      p_ip_hash: ipHash,
      p_limit: RATE_LIMIT,
      p_window_seconds: RATE_WINDOW_SECONDS,
    });
    if (rlError) {
      console.error('[lead-capture] rate check failed:', rlError.message);
      return new Response(JSON.stringify({ error: 'Temporarily unavailable' }), { status: 503, headers });
    }
    if (allowed === false) {
      return new Response(JSON.stringify({ error: 'Too many submissions. Please try again later.' }), { status: 429, headers });
    }

    const { error: dbError } = await supabase.from('form_submissions').insert({
      ...v.lead,
      ip_hash: ipHash,
      // Feedback is stored but not emailed to the founder; mark it handled.
      founder_notified_at: v.lead.form_type === 'feedback' ? new Date().toISOString() : null,
    });
    if (dbError) {
      console.error('[lead-capture] insert failed:', dbError.message);
      return new Response(JSON.stringify({ error: 'Could not save your details' }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  });
}
