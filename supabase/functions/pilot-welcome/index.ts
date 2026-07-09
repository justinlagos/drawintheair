/**
 * POST /functions/v1/pilot-welcome
 *
 * Pilot welcome broadcaster. Reuses the platform's existing Resend setup
 * (same RESEND_API_KEY / EMAIL_FROM secrets as announce / email-dispatch) to
 * send the "set up your class in four steps" welcome email to pilot teachers,
 * from the verified domain sender (hello@drawintheair.com).
 *
 * Auth: NOT user-JWT gated. Guarded by the x-cron-key header, validated
 * against app_private.secrets via the service-role-only RPC get_email_cron_key
 * (same gate as announce / email-dispatch) — no new secret.
 *
 * Body (all optional):
 *   { campaign?: string,        // ledger key; default 'pilot-welcome-2026-06'
 *     dryRun?: boolean,         // if true, send only to testTo and DO NOT log
 *     testTo?: string,          // single address for a dry run
 *     recipients?: string[],    // explicit recipient list for a real run
 *     limit?: number }          // safety cap on recipients in a real run
 *
 * Recipients for a real run: body.recipients if provided, else every address
 * in public.teachers. Deduped, validated, and idempotent — each successful
 * send is written to public.broadcast_log (campaign, email); addresses already
 * logged for the campaign are skipped, so a re-invoke never double-sends.
 */

// @ts-ignore esm.sh URL imports are valid in Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4?target=deno';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get(key: string): string | undefined };
};

const SITE = 'https://drawintheair.com';
const LOGO = `${SITE}/logo.png`;
const CAMPAIGN_DEFAULT = 'pilot-welcome-2026-06';
const SUBJECT = 'Welcome to Draw in the Air: set up your class in four steps';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const HARD_EXCLUDE = new Set<string>(['67@gail.com']);

function buildHtml(toEmail: string): string {
  const unsub = `mailto:hello@drawintheair.com?subject=${encodeURIComponent('Unsubscribe ' + toEmail)}`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#FBF8F2;font-family:'Outfit','Nunito',Helvetica,Arial,sans-serif;color:#1F1B2E;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FBF8F2" style="background:#FBF8F2;">
    <tr><td align="center" style="padding:28px 0;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E7DEF9;border-radius:20px;">

        <tr><td align="center" style="padding:28px 32px 6px;">
          <img src="${LOGO}" alt="Draw in the Air" width="158" style="display:block;width:158px;max-width:158px;height:auto;border:0;color:#6B4FC4;font-size:24px;font-weight:800;font-family:'Outfit','Nunito',Helvetica,Arial,sans-serif;" />
        </td></tr>

        <tr><td style="padding:14px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr style="line-height:0;font-size:0;">
            <td height="6" bgcolor="#8A66F0" style="border-radius:6px 0 0 6px;line-height:6px;">&nbsp;</td>
            <td height="6" bgcolor="#FFC83D">&nbsp;</td>
            <td height="6" bgcolor="#F07A5C">&nbsp;</td>
            <td height="6" bgcolor="#5BCE9A" style="border-radius:0 6px 6px 0;">&nbsp;</td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:24px 34px 6px;">
          <h1 style="margin:0 0 12px;font-size:25px;line-height:1.25;color:#1F1B2E;font-weight:800;">Welcome to your Draw in the Air pilot</h1>
          <p style="margin:0;font-size:16px;line-height:1.6;color:#43405A;">Children wave to begin, pinch to draw and choose, and open a hand to pause. You guide the whole class from your screen, and setting up takes about two minutes.</p>
        </td></tr>

        <tr><td style="padding:16px 30px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="32%" align="center" valign="top" bgcolor="#F2ECFF" style="background:#F2ECFF;border-radius:12px;padding:14px 6px;">
              <div style="font-size:15px;color:#5C3FB0;font-weight:800;">Wave</div>
              <div style="font-size:13px;color:#6B6880;">to begin</div>
            </td>
            <td width="2%">&nbsp;</td>
            <td width="32%" align="center" valign="top" bgcolor="#FFEDE7" style="background:#FFEDE7;border-radius:12px;padding:14px 6px;">
              <div style="font-size:15px;color:#C0492E;font-weight:800;">Pinch</div>
              <div style="font-size:13px;color:#6B6880;">to draw and choose</div>
            </td>
            <td width="2%">&nbsp;</td>
            <td width="32%" align="center" valign="top" bgcolor="#E6F7EF" style="background:#E6F7EF;border-radius:12px;padding:14px 6px;">
              <div style="font-size:15px;color:#1E6B4C;font-weight:800;">Open hand</div>
              <div style="font-size:13px;color:#6B6880;">to pause</div>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:20px 34px 2px;">
          <h2 style="margin:0;font-size:19px;line-height:1.3;color:#1F1B2E;font-weight:800;">Set up your class in four steps</h2>
        </td></tr>

        <tr><td style="padding:12px 34px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="40" valign="top"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="30" height="30" align="center" valign="middle" bgcolor="#8A66F0" style="background:#8A66F0;border-radius:15px;color:#FFFFFF;font-size:15px;font-weight:800;">1</td></tr></table></td>
            <td valign="top" style="padding:2px 0 0 10px;font-size:15px;line-height:1.55;color:#43405A;"><strong style="color:#1F1B2E;">Start a class.</strong> A four-digit code appears. Pop it on the board.</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:13px 34px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="40" valign="top"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="30" height="30" align="center" valign="middle" bgcolor="#F07A5C" style="background:#F07A5C;border-radius:15px;color:#FFFFFF;font-size:15px;font-weight:800;">2</td></tr></table></td>
            <td valign="top" style="padding:2px 0 0 10px;font-size:15px;line-height:1.55;color:#43405A;"><strong style="color:#1F1B2E;">Add children and give each a picture.</strong> Tap Pictures, add each child, then give them a picture such as Star, Flower, Moon or Sun.</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:13px 34px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="40" valign="top"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="30" height="30" align="center" valign="middle" bgcolor="#FFB020" style="background:#FFB020;border-radius:15px;color:#1F1B2E;font-size:15px;font-weight:800;">3</td></tr></table></td>
            <td valign="top" style="padding:2px 0 0 10px;font-size:15px;line-height:1.55;color:#43405A;"><strong style="color:#1F1B2E;">Tell each child their picture.</strong> Quietly say or show each child which one is theirs. The class list stays private.</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:13px 34px 2px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="40" valign="top"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="30" height="30" align="center" valign="middle" bgcolor="#5BCE9A" style="background:#5BCE9A;border-radius:15px;color:#1F1B2E;font-size:15px;font-weight:800;">4</td></tr></table></td>
            <td valign="top" style="padding:2px 0 0 10px;font-size:15px;line-height:1.55;color:#43405A;"><strong style="color:#1F1B2E;">Children join.</strong> On their own device they open the pupil page at <span style="color:#5C3FB0;font-weight:700;">drawintheair.com/join</span>, enter the code, and tap their picture. They are in, with no names to type and no logins.</td>
          </tr></table>
        </td></tr>

        <tr><td align="center" style="padding:28px 34px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td align="center" bgcolor="#6B4FC4" style="background:#6B4FC4;border-radius:999px;">
              <a href="${SITE}/teacher/resources" style="display:inline-block;padding:14px 38px;color:#FFFFFF;font-weight:700;font-size:16px;text-decoration:none;">Open your teacher resources</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td align="center" style="padding:0 34px 4px;"><p style="margin:0;font-size:13px;color:#8A87A0;">Sign in with your teacher account</p></td></tr>
        <tr><td align="center" style="padding:0 40px 18px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#43405A;">Your complete guide, lesson plans, EYFS and curriculum mapping, SEND support and printable letter sheets, all free.</p></td></tr>

        <tr><td style="padding:6px 34px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F2ECFF" style="background:#F2ECFF;border-radius:14px;"><tr><td bgcolor="#F2ECFF" style="background:#F2ECFF;border-radius:14px;padding:16px 20px;font-size:14px;line-height:1.6;color:#43405A;">
            <strong style="color:#1F1B2E;font-size:15px;">We are here whenever you need us.</strong><br/>
            Reply to this email any time, or write to <a href="mailto:hello@drawintheair.com" style="color:#5C3FB0;font-weight:700;text-decoration:none;">hello@drawintheair.com</a>, and a real person will get back to you quickly, whether it is setup, a device, or planning your first lesson.
          </td></tr></table>
        </td></tr>

        <tr><td style="padding:0 34px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#E6F7EF" style="background:#E6F7EF;border-radius:14px;"><tr><td bgcolor="#E6F7EF" style="background:#E6F7EF;border-radius:14px;padding:15px 20px;font-size:14px;line-height:1.6;color:#1E6B4C;">
            <strong>Safe by design.</strong> Webcam video stays on the device, and we only ever keep a first name or nickname.
          </td></tr></table>
        </td></tr>

        <tr><td style="padding:0 34px 28px;font-size:15px;line-height:1.6;color:#43405A;">
          <p style="margin:0 0 14px;">Thank you for piloting with us. We would love to hear how your first class goes.</p>
          <p style="margin:0;color:#1F1B2E;font-weight:700;">The Draw in the Air team</p>
        </td></tr>

      </table>

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;"><tr><td align="center" style="padding:20px 28px;font-size:12px;line-height:1.6;color:#8B8798;">
        Draw in the Air, movement-first learning for ages 3 to 7.<br/>
        <a href="${SITE}" style="color:#8A66F0;text-decoration:none;">drawintheair.com</a> ·
        <a href="${SITE}/privacy" style="color:#8A66F0;text-decoration:none;">Privacy</a> ·
        <a href="${unsub}" style="color:#8A66F0;text-decoration:none;">Unsubscribe</a>
      </td></tr></table>

    </td></tr>
  </table>
</body></html>`;
}

async function sendOne(to: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' };
  const from = Deno.env.get('EMAIL_FROM') || 'Draw in the Air <hello@drawintheair.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: SUBJECT,
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

  // Cron-key gate (same as announce / email-dispatch).
  const { data: expected } = await supabase.rpc('get_email_cron_key');
  if (!expected || req.headers.get('x-cron-key') !== expected) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
  }
  if (!Deno.env.get('RESEND_API_KEY')) {
    return new Response(JSON.stringify({ error: 'Email not configured: set RESEND_API_KEY.' }), { status: 503, headers });
  }

  const body = await req.json().catch(() => ({}));
  const campaign: string = typeof body.campaign === 'string' && body.campaign ? body.campaign : CAMPAIGN_DEFAULT;

  // ── Dry run: single recipient, never logged ─────────────────────────
  if (body.dryRun || body.testTo) {
    const to = String(body.testTo || '').trim().toLowerCase();
    if (!EMAIL_RE.test(to)) {
      return new Response(JSON.stringify({ error: 'dryRun requires a valid testTo' }), { status: 400, headers });
    }
    const r = await sendOne(to);
    return new Response(JSON.stringify({ mode: 'dryRun', to, ...r }), { status: r.ok ? 200 : 502, headers });
  }

  // ── Real run: explicit recipients or all teachers, deduped, idempotent ──
  let source: { email?: string }[];
  if (Array.isArray(body.recipients) && body.recipients.length > 0) {
    source = body.recipients.map((e: unknown) => ({ email: String(e) }));
  } else {
    const { data: teachers } = await supabase.from('teachers').select('email');
    source = teachers ?? [];
  }
  const { data: already } = await supabase.from('broadcast_log').select('email').eq('campaign', campaign);

  const sentSet = new Set((already ?? []).map((r: { email: string }) => r.email.toLowerCase()));
  const recipients = new Set<string>();
  for (const row of source) {
    const e = String(row.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(e) || HARD_EXCLUDE.has(e) || sentSet.has(e)) continue;
    recipients.add(e);
  }

  let list = [...recipients];
  if (typeof body.limit === 'number' && body.limit > 0) list = list.slice(0, body.limit);

  const out = { campaign, attempted: list.length, sent: 0, failed: 0, errors: [] as string[] };
  for (const to of list) {
    const r = await sendOne(to);
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
