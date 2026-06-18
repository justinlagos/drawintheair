/**
 * POST /functions/v1/billing-health   (cron, every 15 min)
 *
 * The safety net that makes billing self-healing and loud:
 *
 *   1. DRIFT REPAIR — lists every live subscription in Stripe (active /
 *      trialing / past_due) and makes the DB match. If the webhook ever
 *      breaks again, accounts still activate within 15 minutes instead of
 *      staying locked. Sends the activation email for any newly-active parent.
 *   2. DEAD-MAN SWITCH — if Stripe has live subscriptions but billing_events
 *      has logged nothing recently, the webhook is almost certainly down.
 *      Email the admin so it never silently fails for days again.
 *
 * Gated by the same x-cron-key as email-dispatch (app_private.secrets).
 */

// @ts-ignore esm.sh URL imports are valid in Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4?target=deno';
import { getStripe } from '../_shared/stripe.ts';
import {
  loadBasePriceIds, mapSubscription, upsertSubscription,
  maybeSendActivationEmail, alertAdmin,
} from '../_shared/billing.ts';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get(key: string): string | undefined };
};

// Alert if Stripe has live subscriptions but billing_events has logged nothing
// for longer than this. Tightened from 6h → 2h (Issue 1, task 8) so a webhook
// outage is surfaced within at most 2h + one cron interval (~15 min).
const WEBHOOK_SILENCE_HOURS = 2;

// The exact production webhook endpoint the app expects Stripe to call.
// Surfaced in the dead-man alert so whoever gets paged can verify the Stripe
// Dashboard endpoint matches without digging. Derived from SUPABASE_URL so it
// stays correct across projects.
const WEBHOOK_URL = `${(Deno.env.get('SUPABASE_URL') || 'https://fmrsfjxwswzhvicylaph.supabase.co').replace(/\/$/, '')}/functions/v1/stripe-webhook`;

// Window used to cross-check Stripe's own event log against billing_events.
// A live, correctly-configured endpoint should have mirrored every relevant
// Stripe event in this window into billing_events.
const EVENT_CROSSCHECK_HOURS = 2;

// Relevant types must match stripe-webhook RELEVANT_TYPES.
const RELEVANT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.payment_failed',
  'invoice.payment_succeeded',
]);

Deno.serve(async (req: Request) => {
  const headers = { 'Content-Type': 'application/json' };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // Cron-key gate (reuses the email cron key).
  const { data: expected } = await supabase.rpc('get_email_cron_key');
  if (!expected || req.headers.get('x-cron-key') !== expected) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
  }

  const stripe = getStripe();
  const basePriceIds = await loadBasePriceIds(supabase);

  // Current DB state, keyed by parent_id.
  const { data: dbRows } = await supabase
    .from('parent_subscriptions')
    .select('parent_id, status, stripe_subscription_id');
  const dbByParent = new Map<string, { status: string; stripe_subscription_id: string | null }>(
    (dbRows ?? []).map((r: { parent_id: string; status: string; stripe_subscription_id: string | null }) =>
      [r.parent_id, { status: r.status, stripe_subscription_id: r.stripe_subscription_id }]),
  );

  const summary = {
    live_subs: 0, repaired: 0, unattributed: 0,
    webhook_silent: false, events_missing: 0, errors: 0,
  };
  const repairs: string[] = [];

  // ── 1. Drift repair ───────────────────────────────────────────────────────
  for (const status of ['active', 'trialing', 'past_due'] as const) {
    // deno-lint-ignore no-explicit-any
    let startingAfter: string | undefined;
    for (let page = 0; page < 10; page++) {
      const list = await stripe.subscriptions.list({ status, limit: 100, starting_after: startingAfter });
      for (const sub of list.data) {
        summary.live_subs++;
        const parentId = sub.metadata?.parent_id
          || (typeof sub.customer === 'object' ? sub.customer?.metadata?.parent_id : undefined);
        if (!parentId) { summary.unattributed++; continue; }

        const cur = dbByParent.get(parentId);
        const needsRepair = !cur || cur.status !== sub.status || cur.stripe_subscription_id !== sub.id;
        if (!needsRepair) continue;

        const row = mapSubscription(parentId, sub, basePriceIds);
        const { error } = await upsertSubscription(supabase, row);
        if (error) { summary.errors++; repairs.push(`FAILED ${parentId}: ${error.message}`); continue; }
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        if (customerId) await supabase.from('parent_profiles').update({ stripe_customer_id: customerId }).eq('id', parentId);
        await maybeSendActivationEmail(supabase, parentId);
        summary.repaired++;
        repairs.push(`${parentId}: ${cur?.status ?? 'none'} → ${sub.status}`);
      }
      if (!list.has_more) break;
      startingAfter = list.data[list.data.length - 1]?.id;
    }
  }

  // ── 2. Dead-man switch ────────────────────────────────────────────────────
  // Signal A: when did billing_events last log ANYTHING?
  const { data: lastEvent } = await supabase
    .from('billing_events').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle();
  const lastMs = lastEvent?.created_at ? new Date(lastEvent.created_at).getTime() : 0;
  const silentForHours = lastMs ? (Date.now() - lastMs) / 3_600_000 : Infinity;

  // Signal B (sharper): compare Stripe's OWN recent event log against
  // billing_events in the same window. This catches the case where a low
  // volume of subscriptions means "no events recently" is ambiguous — if
  // Stripe emitted relevant events and none reached billing_events, the
  // endpoint is definitely not delivering, regardless of wall-clock silence.
  const windowStartSec = Math.floor((Date.now() - EVENT_CROSSCHECK_HOURS * 3_600_000) / 1000);
  let stripeRecentRelevant = 0;
  const missingEventIds: string[] = [];
  try {
    const events = await stripe.events.list({ created: { gte: windowStartSec }, limit: 100 });
    const recent = events.data.filter((e) => RELEVANT_TYPES.has(e.type));
    stripeRecentRelevant = recent.length;
    if (recent.length > 0) {
      const ids = recent.map((e) => e.id);
      const { data: logged } = await supabase
        .from('billing_events').select('stripe_event_id').in('stripe_event_id', ids);
      const loggedSet = new Set((logged ?? []).map((r: { stripe_event_id: string }) => r.stripe_event_id));
      for (const id of ids) if (!loggedSet.has(id)) missingEventIds.push(id);
      summary.events_missing = missingEventIds.length;
    }
  } catch (e) {
    summary.errors++;
    repairs.push(`event-crosscheck failed: ${(e as Error).message}`);
  }

  const silentByClock = summary.live_subs > 0 && silentForHours > WEBHOOK_SILENCE_HOURS;
  // If most recent Stripe events never reached us, the endpoint is down even
  // if a stray event slipped through within the window.
  const silentByCrosscheck = stripeRecentRelevant > 0 && summary.events_missing >= stripeRecentRelevant;

  if (silentByClock || silentByCrosscheck) {
    summary.webhook_silent = true;
    const clockLine = `There are ${summary.live_subs} live subscriptions in Stripe but billing_events has logged nothing for ${
      lastMs ? Math.round(silentForHours) + ' hours' : 'ever'
    }.`;
    const crosscheckLine = stripeRecentRelevant > 0
      ? `\n\nCross-check: Stripe emitted ${stripeRecentRelevant} relevant event(s) in the last ${EVENT_CROSSCHECK_HOURS}h; ${summary.events_missing} of them are MISSING from billing_events.${
          missingEventIds.length ? ` Missing ids: ${missingEventIds.slice(0, 10).join(', ')}` : ''
        }`
      : '';
    await alertAdmin('Stripe webhook appears DOWN',
      `${clockLine}${crosscheckLine}\n\nThe webhook endpoint is probably missing or misconfigured in the Stripe Dashboard (expected: ${WEBHOOK_URL}), or STRIPE_WEBHOOK_SECRET is wrong. billing-health auto-repaired ${summary.repaired} account(s) this run, but please fix the webhook.`);
  }

  if (summary.repaired > 0 || summary.errors > 0) {
    await alertAdmin(`billing-health repaired ${summary.repaired} account(s)`,
      `Drift detected and fixed by the safety net:\n${repairs.join('\n')}\n\nIf this keeps happening the webhook is not delivering — check the Stripe Dashboard.`);
  }

  return new Response(JSON.stringify({ ok: true, ...summary }), { status: 200, headers });
});
