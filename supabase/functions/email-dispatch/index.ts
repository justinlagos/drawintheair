/**
 * POST /functions/v1/email-dispatch
 *
 * The platform's transactional email engine. Invoked every 15 minutes by
 * pg_cron (see migration 0015_email_dispatch.sql). On each run it:
 *
 *   1. Sends the WELCOME email to parents who haven't received one
 *      (parent_subscriptions.welcome_sent_at is null).
 *   2. Sends the TRIAL REMINDER when 2 days or less remain
 *      (reminder_2d_sent_at is null).
 *   3. Sends the TRIAL ENDED email after expiry
 *      (reminder_expired_sent_at is null).
 *
 * Each send is recorded so no email is ever sent twice.
 *
 * Provider: Resend (https://resend.com). Requires secret:
 *   RESEND_API_KEY      re_...           (resend.com/api-keys)
 * Optional:
 *   EMAIL_FROM          defaults to "Draw in the Air <hello@drawintheair.com>"
 *
 * Auth: NOT user-JWT gated (cron has no user). Guarded by the
 * x-cron-key header, validated against app_private.secrets row
 * 'email_cron_key' (created by migration 0015) via the service-role
 * client, so no extra env secret is needed.
 */

// @ts-ignore esm.sh URL imports are valid in Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4?target=deno';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get(key: string): string | undefined };
};

const SITE = 'https://drawintheair.com';
const LOGO = `${SITE}/logo.png`;

// ── Branded template (Calm design: cream, lavender, Outfit-ish stack) ──
function brandEmail(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FFFDF7;font-family:'Outfit','Nunito',Helvetica,Arial,sans-serif;color:#1F1B2E;">
    <span style="display:none;max-height:0;overflow:hidden;">${opts.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF7;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr><td style="padding:0 24px 20px;" align="left">
            <img src="${LOGO}" alt="Draw in the Air" width="140" style="display:block;height:auto;" />
          </td></tr>
          <tr><td style="padding:0 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#FFFFFF;border:1px solid rgba(138,102,240,0.18);border-radius:20px;">
              <tr><td style="height:6px;background:#8A66F0;border-radius:20px 20px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
              <tr><td style="padding:32px 32px 8px;">
                <h1 style="margin:0;font-size:24px;line-height:1.3;color:#1F1B2E;">${opts.heading}</h1>
              </td></tr>
              <tr><td style="padding:8px 32px 8px;font-size:15px;line-height:1.65;color:#3E3A4E;">
                ${opts.bodyHtml}
              </td></tr>
              <tr><td style="padding:16px 32px 36px;">
                <a href="${opts.ctaUrl}"
                   style="display:inline-block;background:#8A66F0;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px;">
                  ${opts.ctaLabel}
                </a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:22px 28px;font-size:12px;line-height:1.6;color:#8B8798;" align="center">
            Draw in the Air, movement-first learning for ages 3 to 7.<br/>
            <a href="${SITE}" style="color:#8A66F0;text-decoration:none;">drawintheair.com</a> ·
            <a href="${SITE}/parent/login?next=%2Fparent%2Faccount" style="color:#8A66F0;text-decoration:none;">Manage account</a> ·
            <a href="${SITE}/privacy" style="color:#8A66F0;text-decoration:none;">Privacy</a><br/>
            You're receiving this because you created a Draw in the Air family account.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return false;
  const from = Deno.env.get('EMAIL_FROM') || 'Draw in the Air <hello@drawintheair.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  return res.ok;
}

Deno.serve(async (req: Request) => {
  const headers = { 'Content-Type': 'application/json' };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // Cron-key gate: validate the x-cron-key header against the value in
  // app_private.secrets, read via the service-role-only RPC
  // get_email_cron_key (migration 0016).
  const { data: expected } = await supabase.rpc('get_email_cron_key');
  if (!expected || req.headers.get('x-cron-key') !== expected) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
  }
  if (!Deno.env.get('RESEND_API_KEY')) {
    return new Response(JSON.stringify({ error: 'Email not configured: set RESEND_API_KEY secret.' }), { status: 503, headers });
  }

  const { data: subs, error } = await supabase
    .from('parent_subscriptions')
    .select('parent_id, status, trial_end, welcome_sent_at, reminder_2d_sent_at, reminder_expired_sent_at, parent_profiles(email, display_name)')
    .in('status', ['trialing']);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }

  const now = Date.now();
  const out = { welcome: 0, reminder: 0, expired: 0, failed: 0 };

  for (const s of subs ?? []) {
    const profile = (s as { parent_profiles?: { email?: string; display_name?: string } }).parent_profiles;
    const to = profile?.email;
    if (!to) continue;
    const first = (profile?.display_name || '').split(' ')[0] || 'there';
    const trialEnd = s.trial_end ? new Date(s.trial_end).getTime() : null;
    const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / 86_400_000)) : null;

    try {
      // 1. Welcome
      if (!s.welcome_sent_at) {
        const ok = await sendEmail(to, 'Welcome to Draw in the Air. Your 7-day free trial has started', brandEmail({
          preheader: 'Everything is unlocked for the next 7 days.',
          heading: `Welcome, ${first}!`,
          bodyHtml: `<p>Your family account is ready and your <strong>7-day free trial</strong> has started. Everything is unlocked: the full activity library, plain-English progress reports, and gentle parental controls for up to 2 learners.</p>
<p>The best first step takes about a minute: open the dashboard, add your child, then let them wave at the camera and draw their first letter in the air.</p>
<p>No card is needed during the trial. We'll remind you before it ends.</p>`,
          ctaLabel: 'Open your family dashboard',
          ctaUrl: `${SITE}/parent/dashboard`,
        }));
        if (ok) {
          await supabase.from('parent_subscriptions').update({ welcome_sent_at: new Date().toISOString() }).eq('parent_id', s.parent_id);
          out.welcome++;
        } else out.failed++;
      }

      // 2. Two days (or less) left
      if (!s.reminder_2d_sent_at && trialEnd && trialEnd > now && daysLeft !== null && daysLeft <= 2) {
        const ok = await sendEmail(to, `Your free trial ends in ${daysLeft === 0 ? 'less than a day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}`, brandEmail({
          preheader: 'Keep the learning going with the Family plan.',
          heading: `${first}, your trial is almost over`,
          bodyHtml: `<p>Your free trial ends ${daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}. After that, the activities and progress reports pause until you choose a plan.</p>
<p>The Family plan is $4.99 a month or $54.99 a year, includes up to 2 learners, and you can cancel anytime in one tap.</p>`,
          ctaLabel: 'Choose a plan',
          ctaUrl: `${SITE}/parent/billing`,
        }));
        if (ok) {
          await supabase.from('parent_subscriptions').update({ reminder_2d_sent_at: new Date().toISOString() }).eq('parent_id', s.parent_id);
          out.reminder++;
        } else out.failed++;
      }

      // 3. Trial expired
      if (!s.reminder_expired_sent_at && trialEnd && trialEnd <= now) {
        const ok = await sendEmail(to, 'Your free trial has ended', brandEmail({
          preheader: 'Pick up right where your child left off.',
          heading: `${first}, your trial has ended`,
          bodyHtml: `<p>Your 7-day free trial has finished, so access to the activities and reports is paused. Everything your child built is saved and waiting.</p>
<p>Choose the Family plan to pick up exactly where they left off: $4.99 a month or $54.99 a year, up to 2 learners, cancel anytime.</p>`,
          ctaLabel: 'Restore access',
          ctaUrl: `${SITE}/parent/billing`,
        }));
        if (ok) {
          await supabase.from('parent_subscriptions').update({ reminder_expired_sent_at: new Date().toISOString() }).eq('parent_id', s.parent_id);
          out.expired++;
        } else out.failed++;
      }
    } catch {
      out.failed++;
    }
  }

  return new Response(JSON.stringify({ ok: true, ...out }), { status: 200, headers });
});
