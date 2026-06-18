/**
 * POST /functions/v1/billing-diagnostics   (cron-key gated, on-demand)
 *
 * Answers, with evidence pulled live from Stripe + the DB, the ten questions
 * you actually need when billing goes quiet — instead of guessing:
 *
 *   1.  Did Stripe deliver events to the endpoint?         (Stripe events.list)
 *   2.  What HTTP status did Stripe receive?               (endpoint delivery state)
 *   3.  Did the Edge Function log receipt?                 (billing_events row exists)
 *   4.  Did signature verification pass?                   (logged ⇒ passed; insert is post-verify)
 *   5.  Did billing_events insert happen?                  (billing_events row exists)
 *   6.  If not, the exact error                            (pointer to structured logs)
 *   7.  Did subscription sync happen?                      (last_event_at advanced to event.created)
 *   8.  If not, the exact reason                           (stale-dropped vs upsert error)
 *   9.  Are Stripe keys live or test?                      (STRIPE_SECRET_KEY prefix)
 *   10. Is the subscription live or test?                  (sub.livemode)
 *
 * Plus: endpoint URL correctness, missing event subscriptions, and Stripe
 * active-subscription → app-account mapping gaps.
 *
 * Gated by the same x-cron-key as billing-health (app_private.secrets). Read
 * only — it never writes. Safe to call any time.
 */

// @ts-ignore esm.sh URL imports are valid in Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4?target=deno';
import { getStripe, getOptionalEnv } from '../_shared/stripe.ts';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get(key: string): string | undefined };
};

const LOOKBACK_HOURS = 24;

const RELEVANT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.payment_failed',
  'invoice.payment_succeeded',
]);

const REQUIRED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
];

Deno.serve(async (req: Request) => {
  const headers = { 'Content-Type': 'application/json' };

  const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Cron-key gate (reuses the email/billing-health cron key).
  const { data: expected } = await supabase.rpc('get_email_cron_key');
  if (!expected || req.headers.get('x-cron-key') !== expected) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
  }

  const expectedWebhookUrl = `${supabaseUrl}/functions/v1/stripe-webhook`;

  // Q9: live vs test is decided by the SECRET KEY actually in use.
  const secretKey = getOptionalEnv('STRIPE_SECRET_KEY') || '';
  const keyMode = secretKey.startsWith('sk_live_') ? 'live'
    : secretKey.startsWith('sk_test_') ? 'test'
    : secretKey ? 'unknown' : 'MISSING';

  const stripe = getStripe();
  const report: Record<string, unknown> = {
    generated_at: new Date().toISOString(),
    lookback_hours: LOOKBACK_HOURS,
    expected_webhook_url: expectedWebhookUrl,
  };
  const warnings: string[] = [];

  // ── Endpoint configuration (Q2 + wrong-URL + missing-events) ───────────────
  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const match = endpoints.data.find((e: { url: string }) => e.url === expectedWebhookUrl);
    const enabled = (match?.enabled_events as string[] | undefined) ?? [];
    const handlesAll = enabled.includes('*');
    const missingEvents = handlesAll ? [] : REQUIRED_EVENTS.filter((t) => !enabled.includes(t));
    report.endpoint = {
      found_for_expected_url: !!match,
      status: match?.status ?? null,                    // 'enabled' | 'disabled'
      api_version: match?.api_version ?? null,
      enabled_events: handlesAll ? ['*'] : enabled,
      missing_required_events: missingEvents,
      other_endpoints: endpoints.data
        .filter((e: { url: string }) => e.url !== expectedWebhookUrl)
        .map((e: { url: string; status: string }) => ({ url: e.url, status: e.status })),
    };
    if (!match) warnings.push(`No Stripe webhook endpoint matches expected URL ${expectedWebhookUrl}. Wrong/missing endpoint URL.`);
    if (match && match.status !== 'enabled') warnings.push(`Endpoint exists but status is "${match.status}".`);
    if (missingEvents.length) warnings.push(`Endpoint is missing required events: ${missingEvents.join(', ')}.`);
  } catch (e) {
    report.endpoint = { error: (e as Error).message };
    warnings.push(`Could not list webhook endpoints: ${(e as Error).message}`);
  }

  // ── Per-event delivery vs log vs sync (Q1,Q3,Q4,Q5,Q7,Q10) ─────────────────
  const sinceSec = Math.floor((Date.now() - LOOKBACK_HOURS * 3_600_000) / 1000);
  let deliveredRelevant = 0;
  let loggedCount = 0;
  let syncedCount = 0;
  const eventRows: Array<Record<string, unknown>> = [];
  let livemodeTrue = 0;
  let livemodeFalse = 0;

  try {
    const events = await stripe.events.list({ created: { gte: sinceSec }, limit: 100 });
    const relevant = events.data.filter((e: { type: string }) => RELEVANT_TYPES.has(e.type));
    deliveredRelevant = relevant.length;

    const ids = relevant.map((e: { id: string }) => e.id);
    const loggedSet = new Set<string>();
    if (ids.length) {
      const { data: logged } = await supabase
        .from('billing_events').select('stripe_event_id').in('stripe_event_id', ids);
      for (const r of logged ?? []) loggedSet.add((r as { stripe_event_id: string }).stripe_event_id);
    }

    for (const ev of relevant) {
      // deno-lint-ignore no-explicit-any
      const e = ev as any;
      if (e.livemode) livemodeTrue++; else livemodeFalse++;
      const isLogged = loggedSet.has(e.id);
      if (isLogged) loggedCount++;

      // Did sync happen? For subscription/invoice events tied to a customer,
      // check the parent_subscriptions row reflects an applied clock >= this
      // event's created. If last_event_at < event.created, the event was
      // dropped by the ordering guard (the 2026-06 failure mode).
      const obj = e.data?.object ?? {};
      const customerId: string | undefined = obj.customer;
      let synced: boolean | null = null;
      let syncDetail: string | null = null;
      if (customerId) {
        const { data: ps } = await supabase
          .from('parent_subscriptions')
          .select('last_event_at, status, stripe_subscription_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        if (!ps) {
          synced = false;
          syncDetail = 'no parent_subscriptions row for this customer (mapping gap)';
        } else {
          const evCreatedIso = new Date(e.created * 1000).toISOString();
          const applied = ps.last_event_at && ps.last_event_at >= evCreatedIso;
          synced = !!applied;
          if (!applied) {
            syncDetail = `last_event_at=${ps.last_event_at ?? 'null'} is older than event.created=${evCreatedIso} → event NOT applied (stale-dropped or never synced)`;
          }
        }
      }
      if (synced) syncedCount++;

      eventRows.push({
        id: e.id,
        type: e.type,
        livemode: e.livemode,                                   // Q10
        created: new Date(e.created * 1000).toISOString(),
        delivered_by_stripe: true,                              // Q1 (present in events.list)
        logged_in_billing_events: isLogged,                     // Q3/Q5
        signature_passed: isLogged ? true : null,               // Q4 (logged ⇒ passed)
        subscription_synced: synced,                            // Q7
        not_synced_reason: syncDetail,                          // Q8
      });
    }
  } catch (e) {
    report.events_error = (e as Error).message;
    warnings.push(`Could not list Stripe events: ${(e as Error).message}`);
  }

  // ── Active-subscription → account mapping gaps ─────────────────────────────
  const mappingGaps: Array<Record<string, unknown>> = [];
  try {
    for (const status of ['active', 'trialing', 'past_due'] as const) {
      const list = await stripe.subscriptions.list({ status, limit: 100 });
      for (const sub of list.data) {
        // deno-lint-ignore no-explicit-any
        const s = sub as any;
        const parentId = s.metadata?.parent_id
          || (typeof s.customer === 'object' ? s.customer?.metadata?.parent_id : undefined);
        let mapped = !!parentId;
        if (parentId) {
          const { data: ps } = await supabase
            .from('parent_subscriptions').select('parent_id').eq('parent_id', parentId).maybeSingle();
          mapped = !!ps;
        }
        if (!mapped) {
          mappingGaps.push({
            subscription_id: s.id, customer: typeof s.customer === 'string' ? s.customer : s.customer?.id,
            status: s.status, livemode: s.livemode, parent_id_in_metadata: parentId ?? null,
          });
        }
      }
    }
    if (mappingGaps.length) warnings.push(`${mappingGaps.length} live Stripe subscription(s) cannot be mapped to an app account.`);
  } catch (e) {
    report.mapping_error = (e as Error).message;
  }

  // ── Last logged event (Q3 timing) ──────────────────────────────────────────
  const { data: lastBe } = await supabase
    .from('billing_events').select('created_at, type, stripe_event_id')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  // ── The ten-question summary ───────────────────────────────────────────────
  report.answers = {
    q1_stripe_delivered_events: deliveredRelevant > 0,
    q1_delivered_count: deliveredRelevant,
    q2_http_status_note: 'Per-delivery HTTP status lives in Stripe Dashboard → Webhooks → endpoint → recent deliveries. This report infers success from billing_events rows (logged ⇒ endpoint returned 2xx past signature).',
    q3_function_logged_receipt: loggedCount > 0,
    q3_last_logged_event: lastBe ?? null,
    q4_signature_passed: deliveredRelevant === 0 ? null : loggedCount === deliveredRelevant,
    q5_billing_events_insert: { delivered: deliveredRelevant, logged: loggedCount, missing: deliveredRelevant - loggedCount },
    q6_insert_error_pointer: (deliveredRelevant - loggedCount) > 0
      ? 'Some delivered events were NOT logged. Check stripe-webhook logs for step=billing_event_insert_failed / signature_failed.'
      : null,
    q7_subscription_synced: syncedCount,
    q8_not_synced_pointer: eventRows.filter((r) => r.subscription_synced === false).map((r) => ({ id: r.id, reason: r.not_synced_reason })),
    q9_stripe_keys_mode: keyMode,
    q10_subscription_mode: { livemode_true: livemodeTrue, livemode_false: livemodeFalse },
  };
  report.events = eventRows;
  report.mapping_gaps = mappingGaps;
  report.warnings = warnings;
  report.ok = warnings.length === 0;

  return new Response(JSON.stringify(report, null, 2), { status: 200, headers });
});
