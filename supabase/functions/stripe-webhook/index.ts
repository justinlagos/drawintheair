/**
 * POST /functions/v1/stripe-webhook
 *
 * Stripe → us. Verifies the stripe-signature header against
 * STRIPE_WEBHOOK_SECRET and mirrors the Stripe subscription state into
 * `parent_subscriptions`. Every event is also logged to `billing_events`
 * for audit + replay.
 *
 * Subscription state is the SERVER's source of truth — the frontend never
 * trusts a local flag (see CLAUDE.md / spec).
 */

import { corsHeaders } from '../_shared/cors.ts';
import { getStripe, getServiceSupabase, getEnv } from '../_shared/stripe.ts';
import { isDuplicateEventError, isStaleEvent } from './ordering.ts';

declare const Deno: { serve: (handler: (req: Request) => Promise<Response> | Response) => void };

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
  // Webhooks aren't CORS-bound, but we still send the headers back when the
  // Stripe Dashboard "Send test webhook" does a preflight from a browser.
  const headers = { ...corsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400, headers });

  const stripe = getStripe();
  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      getEnv('STRIPE_WEBHOOK_SECRET'),
    );
  } catch (e) {
    return new Response(`Bad signature: ${(e as Error).message}`, { status: 400, headers });
  }

  if (!RELEVANT_TYPES.has(event.type)) {
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200, headers });
  }

  const supabase = getServiceSupabase();

  // ── Resolve the parent_id ────────────────────────────────────────────────
  // We attach parent_id to every Checkout / subscription via metadata. Fall
  // back to the customer record's metadata, then to stripe_customer_id on
  // parent_profiles, before giving up.
  async function resolveParentId(): Promise<string | null> {
    // deno-lint-ignore no-explicit-any
    const obj = event.data.object as any;
    const direct = obj?.metadata?.parent_id || obj?.subscription_data?.metadata?.parent_id;
    if (direct) return direct;
    const customerId = obj?.customer as string | undefined;
    if (!customerId) return null;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      // deno-lint-ignore no-explicit-any
      const pid = (customer as any)?.metadata?.parent_id;
      if (pid) return pid;
    } catch { /* swallow — fall through */ }
    const { data } = await supabase
      .from('parent_profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    return data?.id ?? null;
  }

  const parentId = await resolveParentId();

  // ── Idempotency gate (H3) ────────────────────────────────────────────────
  // Stripe delivers at-least-once and retries, so the same event.id can arrive
  // multiple times. billing_events.stripe_event_id is UNIQUE — we use the
  // INSERT itself as the replay guard. A 23505 (unique violation) means we've
  // already processed this event: ACK with 200 and do NOT re-apply the
  // mutation. Any other insert error is a real failure → 500 so Stripe retries.
  const { error: logErr } = await supabase.from('billing_events').insert({
    parent_id: parentId,
    stripe_event_id: event.id,
    type: event.type,
    payload: event as unknown,
  });
  if (logErr) {
    // PostgREST surfaces the Postgres SQLSTATE in `code`.
    if (isDuplicateEventError((logErr as { code?: string }).code)) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200, headers });
    }
    return new Response(`Log failure: ${logErr.message}`, { status: 500, headers });
  }

  if (!parentId) {
    return new Response(JSON.stringify({ received: true, logged: true, no_parent: true }), {
      status: 200,
      headers,
    });
  }

  // ── Ordering guard (H3) ──────────────────────────────────────────────────
  // Stripe does not guarantee delivery order. We stamp parent_subscriptions
  // with the Stripe event timestamp we last applied. If this event is older
  // than what we've already applied, skip the mutation so a delayed event
  // (e.g. a late `past_due`) can't revert newer state (e.g. `active`).
  const eventTs = new Date(event.created * 1000).toISOString();
  const { data: existingSub } = await supabase
    .from('parent_subscriptions')
    .select('last_event_at')
    .eq('parent_id', parentId)
    .maybeSingle();
  if (isStaleEvent(eventTs, existingSub?.last_event_at)) {
    return new Response(JSON.stringify({ received: true, stale: true }), { status: 200, headers });
  }

  // ── Mirror the subscription into parent_subscriptions ───────────────────
  // deno-lint-ignore no-explicit-any
  const obj = event.data.object as any;

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted' ||
    event.type === 'customer.subscription.trial_will_end'
  ) {
    const sub = obj;
    // Determine interval + billed addon quantity from the subscription items.
    const items = sub.items?.data ?? [];
    // deno-lint-ignore no-explicit-any
    const addonItem = items.find((i: any) =>
      typeof i.price?.id === 'string' && i.price?.id !== sub.metadata?.base_price_id,
    );
    const interval = sub.items?.data?.[0]?.price?.recurring?.interval ?? null;
    const billedAddon = addonItem?.quantity ?? 0;

    await supabase
      .from('parent_subscriptions')
      .upsert(
        {
          parent_id: parentId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          status: event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status,
          plan_interval: interval,
          billed_addon_quantity: billedAddon,
          trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_start: sub.current_period_start
            ? new Date(sub.current_period_start * 1000).toISOString()
            : null,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: !!sub.cancel_at_period_end,
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
          last_event_at: eventTs,
        },
        { onConflict: 'parent_id' },
      );
  }

  if (event.type === 'invoice.payment_failed') {
    await supabase
      .from('parent_subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString(), last_event_at: eventTs })
      .eq('parent_id', parentId);
  }

  if (event.type === 'invoice.payment_succeeded') {
    // Stripe normally fires subscription.updated alongside this, but make
    // sure status reflects "active" if a past_due invoice has now cleared.
    await supabase
      .from('parent_subscriptions')
      .update({ status: 'active', updated_at: new Date().toISOString(), last_event_at: eventTs })
      .eq('parent_id', parentId)
      .eq('status', 'past_due');
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers });
});
