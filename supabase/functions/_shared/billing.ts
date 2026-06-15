/**
 * Shared billing helpers — the SINGLE source of truth for turning a Stripe
 * subscription into a parent_subscriptions row, sending the activation email,
 * and shouting loudly when anything goes wrong.
 *
 * Imported by: stripe-webhook, reconcile-subscription, billing-health.
 * Keeping the mapping here means the webhook and the reconcile/health paths
 * can never drift apart.
 */

declare const Deno: { env: { get(key: string): string | undefined } };

// deno-lint-ignore no-explicit-any
type AnyObj = any;

const SITE = 'https://drawintheair.com';
const LOGO = `${SITE}/logo.png`;

// ── Email + alerting ────────────────────────────────────────────────────────

export function adminAlertEmail(): string {
  return Deno.env.get('ADMIN_ALERT_EMAIL') || 'mrjustinukaegbu@gmail.com';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) {
    console.error('[email] RESEND_API_KEY missing — cannot send:', subject);
    return false;
  }
  const from = Deno.env.get('EMAIL_FROM') || 'Draw in the Air <hello@drawintheair.com>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) console.error('[email] send failed:', subject, await res.text().catch(() => ''));
    return res.ok;
  } catch (e) {
    console.error('[email] send threw:', (e as Error).message);
    return false;
  }
}

export function brandEmail(opts: {
  preheader: string; heading: string; bodyHtml: string; ctaLabel: string; ctaUrl: string;
}): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#FFFDF7;font-family:'Outfit','Nunito',Helvetica,Arial,sans-serif;color:#1F1B2E;">
  <span style="display:none;max-height:0;overflow:hidden;">${opts.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF7;padding:32px 0;">
    <tr><td align="center"><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
      <tr><td style="padding:0 24px 20px;" align="left"><img src="${LOGO}" alt="Draw in the Air" width="140" style="display:block;height:auto;" /></td></tr>
      <tr><td style="padding:0 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid rgba(138,102,240,0.18);border-radius:20px;">
        <tr><td style="height:6px;background:#8A66F0;border-radius:20px 20px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 32px 8px;"><h1 style="margin:0;font-size:24px;line-height:1.3;color:#1F1B2E;">${opts.heading}</h1></td></tr>
        <tr><td style="padding:8px 32px 8px;font-size:15px;line-height:1.65;color:#3E3A4E;">${opts.bodyHtml}</td></tr>
        <tr><td style="padding:16px 32px 36px;"><a href="${opts.ctaUrl}" style="display:inline-block;background:#8A66F0;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px;">${opts.ctaLabel}</a></td></tr>
      </table></td></tr>
      <tr><td style="padding:22px 28px;font-size:12px;line-height:1.6;color:#8B8798;" align="center">
        Draw in the Air, movement-first learning for ages 3 to 7.<br/>
        <a href="${SITE}" style="color:#8A66F0;text-decoration:none;">drawintheair.com</a> ·
        <a href="${SITE}/parent/login?next=%2Fparent%2Faccount" style="color:#8A66F0;text-decoration:none;">Manage account</a> ·
        <a href="${SITE}/privacy" style="color:#8A66F0;text-decoration:none;">Privacy</a>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`;
}

/** Loud failure: log to stderr (shows in Supabase function logs) AND email the admin. */
export async function alertAdmin(subject: string, detail: string): Promise<void> {
  console.error('[BILLING-ALERT]', subject, '::', detail);
  const html = `<p style="font-family:Helvetica,Arial,sans-serif">A billing flow needs attention:</p>
    <pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">${escapeHtml(detail)}</pre>`;
  try { await sendEmail(adminAlertEmail(), `[Draw in the Air] BILLING ALERT: ${subject}`, html); } catch { /* best-effort */ }
}

// ── Stripe subscription → DB row mapping ────────────────────────────────────

function iso(sec: number | null | undefined): string | null {
  return sec ? new Date(sec * 1000).toISOString() : null;
}

/** Load the set of "base" Stripe price ids (vs the per-child addon prices). */
export async function loadBasePriceIds(supabase: AnyObj): Promise<Set<string>> {
  const { data } = await supabase
    .from('stripe_price_map')
    .select('price_key, stripe_price_id')
    .like('price_key', 'base.%');
  return new Set((data ?? []).map((r: AnyObj) => r.stripe_price_id));
}

/** Map a Stripe subscription object to a parent_subscriptions row. */
export function mapSubscription(
  parentId: string,
  sub: AnyObj,
  basePriceIds: Set<string>,
  eventTs?: string,
): Record<string, unknown> {
  const items = sub.items?.data ?? [];
  const baseItem = items.find((i: AnyObj) => basePriceIds.has(i.price?.id)) ?? items[0];
  const addonItem = items.find((i: AnyObj) => i !== baseItem);
  const interval = baseItem?.price?.recurring?.interval ?? items[0]?.price?.recurring?.interval ?? null;
  return {
    parent_id: parentId,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
    stripe_subscription_id: sub.id,
    base_price_id: baseItem?.price?.id ?? null,
    addon_price_id: addonItem?.price?.id ?? null,
    status: sub.status, // trialing | active | past_due | canceled | unpaid | incomplete
    plan_interval: interval,
    billed_addon_quantity: addonItem?.quantity ?? 0,
    trial_start: iso(sub.trial_start),
    trial_end: iso(sub.trial_end),
    current_period_start: iso(sub.current_period_start),
    current_period_end: iso(sub.current_period_end),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    canceled_at: iso(sub.canceled_at),
    last_event_at: eventTs ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Upsert subscription state. CHECKS the write error (the old webhook did not,
 * which is how a missing column silently swallowed every payment). Returns
 * { error } so callers can fail loudly / return 500.
 */
export async function upsertSubscription(
  supabase: AnyObj,
  row: Record<string, unknown>,
): Promise<{ error: { message: string; code?: string } | null }> {
  const { error } = await supabase
    .from('parent_subscriptions')
    .upsert(row, { onConflict: 'parent_id' });
  return { error: error ? { message: error.message, code: error.code } : null };
}

function ppOf(s: AnyObj): { email?: string; display_name?: string } | null {
  const pp = s?.parent_profiles;
  if (!pp) return null;
  return Array.isArray(pp) ? (pp[0] ?? null) : pp;
}

/**
 * Send the "payment received / you're subscribed" email exactly once per
 * activation (guarded by activated_sent_at). Safe to call on every relevant
 * event; it no-ops unless status is active and the email hasn't been sent.
 */
export async function maybeSendActivationEmail(supabase: AnyObj, parentId: string): Promise<void> {
  const { data: s } = await supabase
    .from('parent_subscriptions')
    .select('status, activated_sent_at, plan_interval, current_period_end, parent_profiles(email, display_name)')
    .eq('parent_id', parentId)
    .maybeSingle();
  if (!s || s.status !== 'active' || s.activated_sent_at) return;
  const pp = ppOf(s);
  const email = pp?.email;
  if (!email) return;

  const first = (pp?.display_name || '').split(' ')[0] || 'there';
  const renews = s.current_period_end
    ? new Date(s.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const html = brandEmail({
    preheader: 'Your Draw in the Air subscription is active.',
    heading: `You're all set, ${first}!`,
    bodyHtml: `<p>Thank you — your payment went through and your Draw in the Air family plan is now <strong>active</strong>.</p>
      <p>Your parent dashboard is unlocked: progress in plain English, gentle limits, and the full activity library.${
        renews ? ` Your ${s.plan_interval === 'year' ? 'yearly' : 'monthly'} plan renews on ${renews}.` : ''
      }</p>
      <p>You can manage or cancel anytime from your account.</p>`,
    ctaLabel: 'Open my dashboard',
    ctaUrl: `${SITE}/parent/dashboard`,
  });
  const ok = await sendEmail(email, 'Your Draw in the Air subscription is active', html);
  if (ok) {
    await supabase
      .from('parent_subscriptions')
      .update({ activated_sent_at: new Date().toISOString() })
      .eq('parent_id', parentId);
  }
}

/**
 * Pull a parent's most relevant subscription straight from Stripe and write it
 * into the DB. Webhook-independent — this is what makes activation instant on
 * the checkout-success page and what billing-health uses to self-heal drift.
 * Returns the resulting status, or null if no Stripe subscription was found.
 */
export async function reconcileParentFromStripe(
  stripe: AnyObj,
  supabase: AnyObj,
  parentId: string,
  opts?: { customerId?: string | null; email?: string | null },
): Promise<{ status: string | null; subscriptionId: string | null }> {
  let sub: AnyObj | null = null;

  // 1. Most precise: subscriptions carrying our parent_id metadata.
  try {
    const search = await stripe.subscriptions.search({
      query: `metadata['parent_id']:'${parentId}'`,
      limit: 10,
    });
    sub = pickBestSubscription(search?.data ?? []);
  } catch { /* search may be disabled on some accounts — fall through */ }

  // 2. By known customer id.
  if (!sub && opts?.customerId) {
    const list = await stripe.subscriptions.list({ customer: opts.customerId, status: 'all', limit: 10 });
    sub = pickBestSubscription(list?.data ?? []);
  }

  // 3. By email → customer → subscriptions.
  if (!sub && opts?.email) {
    const customers = await stripe.customers.list({ email: opts.email, limit: 5 });
    for (const c of customers?.data ?? []) {
      const list = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 10 });
      const best = pickBestSubscription(list?.data ?? []);
      if (best) { sub = best; break; }
    }
  }

  if (!sub) return { status: null, subscriptionId: null };

  const basePriceIds = await loadBasePriceIds(supabase);
  const row = mapSubscription(parentId, sub, basePriceIds);
  const { error } = await upsertSubscription(supabase, row);
  if (error) {
    await alertAdmin('reconcile upsert failed', `parent_id=${parentId}\nsub=${sub.id}\nerror=${error.message}`);
    throw new Error(`Failed to write subscription: ${error.message}`);
  }

  // Keep the customer id on the parent profile in sync too (portal needs it).
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (customerId) {
    await supabase.from('parent_profiles').update({ stripe_customer_id: customerId }).eq('id', parentId);
  }

  await maybeSendActivationEmail(supabase, parentId);
  return { status: sub.status, subscriptionId: sub.id };
}

/** Prefer a live subscription (active/trialing/past_due) over ended ones, newest first. */
export function pickBestSubscription(subs: AnyObj[]): AnyObj | null {
  if (!subs.length) return null;
  const rank: Record<string, number> = { active: 0, trialing: 1, past_due: 2, unpaid: 3, incomplete: 4, canceled: 5, incomplete_expired: 6 };
  return [...subs].sort((a, b) =>
    (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || (b.created ?? 0) - (a.created ?? 0),
  )[0];
}
