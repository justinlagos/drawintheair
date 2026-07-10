/**
 * POST /functions/v1/announce
 *
 * One-off announcement broadcaster. Reuses the platform's existing Resend
 * setup (same RESEND_API_KEY / EMAIL_FROM secrets as email-dispatch) to
 * send a single branded product-update email to parents + teachers, from
 * the verified domain sender.
 *
 * Auth: NOT user-JWT gated. Guarded by the x-cron-key header, validated
 * against app_private.secrets via the service-role-only RPC
 * get_email_cron_key (same gate as email-dispatch) — no new secret.
 *
 * Body (all optional):
 *   { campaign?: string,        // ledger key; default 'product-update-2026-06'
 *     dryRun?: boolean,         // if true, send only to testTo and DO NOT log
 *     testTo?: string,          // single address for a dry run
 *     limit?: number }          // safety cap on recipients in a real run
 *
 * Idempotency: every successful real send is written to public.broadcast_log
 * (campaign, email). Recipients already logged for the campaign are skipped,
 * so a re-invoke never double-sends.
 */

// @ts-ignore esm.sh URL imports are valid in Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4?target=deno';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get(key: string): string | undefined };
};

const SITE = 'https://drawintheair.com';
const LOGO = `${SITE}/logo.png`;
const CAMPAIGN_DEFAULT = 'product-update-2026-06';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Known-bad address in the data (typo of a real domain). Never email it.
const HARD_EXCLUDE = new Set<string>(['67@gail.com']);

function buildHtml(toEmail: string): string {
  const unsub = `mailto:hello@drawintheair.com?subject=${encodeURIComponent('Unsubscribe ' + toEmail)}`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#FFFDF7;font-family:'Outfit','Nunito',Helvetica,Arial,sans-serif;color:#1F1B2E;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF7;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 24px 20px;" align="left">
          <img src="${LOGO}" alt="Draw in the Air" width="140" style="display:block;height:auto;border:0;color:#8A66F0;font-size:22px;font-weight:800;font-family:'Outfit','Nunito',Helvetica,Arial,sans-serif;letter-spacing:-0.2px;" />
        </td></tr>
        <tr><td style="padding:0 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid rgba(138,102,240,0.18);border-radius:20px;">
            <tr><td style="height:6px;background:#8A66F0;border-radius:20px 20px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr><td style="padding:32px 32px 6px;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#1F1B2E;">We've updated your Draw in the Air</h1>
            </td></tr>
            <tr><td style="padding:12px 32px 8px;font-size:15px;line-height:1.7;color:#3E3A4E;">
              <p style="margin:0 0 14px;">Hi there,</p>
              <p style="margin:0 0 14px;">A quick note to let you know what's changed in your account over the last few weeks. You don't need to do anything. The next time you open it, here's what you'll notice:</p>
              <p style="margin:0 0 12px;">Drawing feels instant. We fixed the lag, so the line follows your child's hand right away. There are also two new things on the canvas: a Draw This challenge to copy, and a colouring book to fill in.</p>
              <p style="margin:0 0 12px;">Children can do more on their own. They can open menus and move around using gestures, so there's less reaching for the mouse.</p>
              <p style="margin:0 0 4px;">If you run a classroom, your dashboard is cleaner, your class roster now carries over between sessions, and join codes work reliably.</p>
            </td></tr>
            <tr><td style="padding:20px 32px 8px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3E3A4E;">You'll find it all where you left it.</p>
              <a href="${SITE}" style="display:inline-block;background:#8A66F0;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 30px;border-radius:999px;">Open Draw in the Air</a>
            </td></tr>
            <tr><td style="padding:18px 32px 28px;font-size:14px;line-height:1.7;color:#3E3A4E;">
              <p style="margin:0;">If anything looks off, just reply to this email and we'll help.</p>
              <p style="margin:14px 0 0;">Warmly,<br/>The Draw in the Air team</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:22px 28px;font-size:12px;line-height:1.6;color:#8B8798;" align="center">
          You're receiving this because you have a Draw in the Air account. It's a service update about changes to the product you use.<br/><br/>
          Draw in the Air, movement-first learning for ages 3 to 7.<br/>
          <a href="${SITE}" style="color:#8A66F0;text-decoration:none;">drawintheair.com</a> ·
          <a href="${SITE}/parent/login?next=%2Fparent%2Faccount" style="color:#8A66F0;text-decoration:none;">Manage account</a> ·
          <a href="${unsub}" style="color:#8A66F0;text-decoration:none;">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendOne(to: string, subject: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' };
  const from = Deno.env.get('EMAIL_FROM') || 'Draw in the Air <hello@drawintheair.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: buildHtml(to),
      headers: {
        'List-Unsubscribe': `<mailto:hello@drawintheair.com?subject=unsubscribe>`,
      },
    }),
  });
  if (!res.ok) return { ok: false, error: `resend ${res.status}: ${await res.text()}` };
  const json = await res.json().catch(() => ({}));
  return { ok: true, id: (json as { id?: string }).id };
}

Deno.serve(async (req: Request) => {
  const headers = { 'Content-Type': 'application/json' };
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // Cron-key gate (same as email-dispatch).
  const { data: expected } = await supabase.rpc('get_email_cron_key');
  if (!expected || req.headers.get('x-cron-key') !== expected) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
  }
  if (!Deno.env.get('RESEND_API_KEY')) {
    return new Response(JSON.stringify({ error: 'Email not configured: set RESEND_API_KEY.' }), { status: 503, headers });
  }

  const body = await req.json().catch(() => ({}));
  const campaign: string = typeof body.campaign === 'string' && body.campaign ? body.campaign : CAMPAIGN_DEFAULT;
  const subject = "We've updated your Draw in the Air";

  // ── Dry run: single recipient, never logged ─────────────────────────
  if (body.dryRun || body.testTo) {
    const to = String(body.testTo || '').trim().toLowerCase();
    if (!EMAIL_RE.test(to)) {
      return new Response(JSON.stringify({ error: 'dryRun requires a valid testTo' }), { status: 400, headers });
    }
    const r = await sendOne(to, subject);
    return new Response(JSON.stringify({ mode: 'dryRun', to, ...r }), { status: r.ok ? 200 : 502, headers });
  }

  // ── Real run: parents + teachers, deduped, validated, idempotent ────
  const [{ data: parents }, { data: teachers }, { data: already }] = await Promise.all([
    supabase.from('parent_profiles').select('email'),
    supabase.from('teachers').select('email'),
    supabase.from('broadcast_log').select('email').eq('campaign', campaign),
  ]);

  const sentSet = new Set((already ?? []).map((r: { email: string }) => r.email.toLowerCase()));
  const recipients = new Set<string>();
  for (const row of [...(parents ?? []), ...(teachers ?? [])]) {
    const e = String((row as { email?: string }).email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(e) || HARD_EXCLUDE.has(e) || sentSet.has(e)) continue;
    recipients.add(e);
  }

  let list = [...recipients];
  if (typeof body.limit === 'number' && body.limit > 0) list = list.slice(0, body.limit);

  const out = { campaign, attempted: list.length, sent: 0, failed: 0, errors: [] as string[] };
  for (const to of list) {
    const r = await sendOne(to, subject);
    if (r.ok) {
      await supabase.from('broadcast_log').insert({ campaign, email: to, status: 'sent', provider_id: r.id ?? null });
      out.sent++;
    } else {
      out.failed++;
      if (out.errors.length < 5) out.errors.push(`${to}: ${r.error}`);
    }
  }

  return new Response(JSON.stringify(out), { status: 200, headers });
});
