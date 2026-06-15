/**
 * POST /functions/v1/stripe-webhook
 *
 * Stripe → us. Verifies the stripe-signature header against
 * STRIPE_WEBHOOK_SECRET and mirrors the Stripe subscription state into
 * `parent_subscriptions`. Every event is also logged to `billing_events`.
 *
 * Hardened (2026-06): writes are ERROR-CHECKED. If a DB write fails we return
 * 500 so Stripe RETRIES (instead of the old behaviour, which ignored the
 * error, returned 200, and silently lost the payment), and we email the admin.
 * On invoice.payment_succeeded we reconcile straight from the Stripe
 * subscription so activation is robust even if a subscription.* event is
 * missed or arrives out of order. Activation triggers a confirmation email.
 *
 * Subscription state is the SERVER's source of truth — the frontend never
 * trusts a local flag.
 */

import { corsHeaders } from '../_shared/cors.ts';
import { getStripe, getServiceSupabase, getEnv } from '../_shared/stripe.ts';
import { isDuplicateEventError, isStaleEvent } from './ordering.ts';
import {
  loadBasePriceIds, mapSubscription, upsertSubscription,
  maybeSendActivationEmail, alertAdmin,
} from '../_shared/billing.ts';

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
  const headers = { ...corsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' };

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400, headers });

  const stripe = getStripe();
  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, getEnv('STRIPE_WEBHOOK_SECRET'));
  } catch (e) {
    // A signature failure usually means a misconfigured STRIPE_WEBHOOK_SECRET —
    // the single most common reason billing silently stops working. Shout.
    await alertAdmin('webhook signature verification failed',
      `Every Stripe event is being rejected. Check STRIPE_WEBHOOK_SECRET matches the endpoint's signing secret.\n${(e as Error).message}`);
    return new Response(`Bad signature: ${(e as Error).message}`, { status: 400, headers });
  }

  if (!RELEVANT_TYPES.has(event.type)) {
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200, headers });
  }

  const supabase = getServiceSupabase();

  // deno-lint-ignore no-explicit-any
  const obj = event.data.object as any;

  async function resolveParentId(): Promise<string | null> {
    const direct = obj?.metadata?.parent_id || obj?.subscription_data?.metadata?.parent_id;
    if (direct) return direct;
    const customerId = obj?.customer as string | undefined;
    if (!customerId) return null;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      // deno-lint-ignore no-explicit-any
      const pid = (customer as any)?.metadata?.parent_id;
      if (pid) return pid;
    } catch { /* fall through */ }
    const { data } = await supabase.from('parent_profiles').select('id').eq('stripe_customer_id', customerId).maybeSingle();
    return data?.id ?? null;
  }

  try {
    const parentId = await resolveParentId();

    // ── Idempotency gate: billing_events.stripe_event_id is UNIQUE ──────────
    const { error: logErr } = await supabase.from('billing_events').insert({
      parent_id: parentId, stripe_event_id: event.id, type: event.type, payload: event as unknown,
    });
    if (logErr) {
      if (isDuplicateEventError((logErr as { code?: string }).code)) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200, headers });
      }
      // Real logging failure → retry.
      await alertAdmin('webhook billing_events insert failed', `event=${event.type} ${event.id}\n${logErr.message}`);
      return new Response(`Log failure: ${logErr.message}`, { status: 500, headers });
    }

    if (!parentId) {
      // Logged but unattributable — don't retry forever, but make it visible.
      await alertAdmin('webhook could not resolve parent_id',
        `event=${event.type} ${event.id}. Subscription has no parent_id metadata and no matching customer.`);
      return new Response(JSON.stringify({ received: true, logged: true, no_parent: true }), { status: 200, headers });
    }

    // ── Ordering guard ──────────────────────────────────────────────────────
    const eventTs = new Date(event.created * 1000).toISOString();
    const { data: existingSub } = await supabase
      .from('parent_subscriptions').select('last_event_at').eq('parent_id', parentId).maybeSingle();
    if (isStaleEvent(eventTs, existingSub?.last_event_at)) {
      return new Response(JSON.stringify({ received: true, stale: true }), { status: 200, headers });
    }

    const basePriceIds = await loadBasePriceIds(supabase);

    // ── Subscription lifecycle events: mirror the full object ───────────────
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.trial_will_end'
    ) {
      const row = mapSubscription(parentId, obj, basePriceIds, eventTs);
      if (event.type === 'customer.subscription.deleted') row.status = 'canceled';
      const { error } = await upsertSubscription(supabase, row);
      if (error) {
        await alertAdmin('webhook subscription upsert failed', `parent=${parentId} event=${event.type}\n${error.message}`);
        return new Response(`Upsert failure: ${error.message}`, { status: 500, headers });
      }
      await maybeSendActivationEmail(supabase, parentId);
    }

    // ── Payment succeeded: reconcile from the live subscription ─────────────
    // Robust path — guarantees activation even if the subscription.updated
    // event is missed or arrives out of order.
    if (event.type === 'invoice.payment_succeeded') {
      const subId = obj?.subscription as string | undefined;
      if (subId) {
        const liveSub = await stripe.subscriptions.retrieve(subId);
        const row = mapSubscription(parentId, liveSub, basePriceIds, eventTs);
        const { error } = await upsertSubscription(supabase, row);
        if (error) {
          await alertAdmin('webhook payment_succeeded upsert failed', `parent=${parentId} sub=${subId}\n${error.message}`);
          return new Response(`Upsert failure: ${error.message}`, { status: 500, headers });
        }
        await maybeSendActivationEmail(supabase, parentId);
      }
    }

    // ── Payment failed: mark past_due ───────────────────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const { error } = await supabase
        .from('parent_subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString(), last_event_at: eventTs })
        .eq('parent_id', parentId);
      if (error) {
        await alertAdmin('webhook payment_failed update failed', `parent=${parentId}\n${error.message}`);
        return new Response(`Update failure: ${error.message}`, { status: 500, headers });
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers });
  } catch (e) {
    // Any unexpected error → 500 so Stripe retries, and shout to the admin.
    await alertAdmin('webhook handler threw', `event=${event?.type}\n${(e as Error).message}\n${(e as Error).stack ?? ''}`);
    return new Response(`Handler error: ${(e as Error).message}`, { status: 500, headers });
  }
});
