/**
 * POST /functions/v1/sync-subscription
 *
 * Reconciles the parent's Stripe subscription with their CURRENT count of
 * active child_profiles. Called from the frontend whenever the parent adds,
 * archives, restores, or deletes a learner. Returns { ok, billed_addon_quantity }.
 *
 * No body required — auth.uid() is the only input.
 *
 * Why call this instead of letting the webhook handle it? Because the user
 * just saw a "you'll now be billed $X/month" preview in the UI and needs the
 * change to take effect immediately — a webhook round-trip on the next
 * Stripe event would be too slow.
 */

import { preflight, corsHeaders } from '../_shared/cors.ts';
import { getStripe, getServiceSupabase, requireUser } from '../_shared/stripe.ts';

declare const Deno: { serve: (handler: (req: Request) => Promise<Response> | Response) => void };

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  const headers = { ...corsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' };

  try {
    const { userId } = await requireUser(req);
    const stripe = getStripe();
    const supabase = getServiceSupabase();

    const { data: sub } = await supabase
      .from('parent_subscriptions')
      .select('stripe_subscription_id, plan_interval')
      .eq('parent_id', userId)
      .single();

    if (!sub?.stripe_subscription_id || !sub.plan_interval) {
      return new Response(JSON.stringify({ ok: false, error: 'No active subscription.' }), {
        status: 400,
        headers,
      });
    }

    const { count: activeChildren } = await supabase
      .from('child_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', userId)
      .eq('status', 'active');

    const { data: cfg } = await supabase
      .from('pricing_config')
      .select('base_included_slots')
      .eq('id', 'default')
      .single();

    const includedSlots = cfg?.base_included_slots ?? 2;
    const extra = Math.max(0, (activeChildren ?? 0) - includedSlots);

    const { data: priceRow } = await supabase
      .from('stripe_price_map')
      .select('stripe_price_id')
      .eq('price_key', `addon.${sub.plan_interval}`)
      .eq('active', true)
      .maybeSingle();

    if (!priceRow?.stripe_price_id) {
      return new Response(JSON.stringify({ ok: false, error: 'Addon price not configured.' }), {
        status: 500,
        headers,
      });
    }

    // Fetch the live subscription so we can either update the addon item's
    // quantity or add/remove it.
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    // deno-lint-ignore no-explicit-any
    const addonItem = stripeSub.items.data.find((i: any) => i.price.id === priceRow.stripe_price_id);

    if (extra === 0 && addonItem) {
      await stripe.subscriptionItems.del(addonItem.id, { proration_behavior: 'create_prorations' });
    } else if (extra > 0 && addonItem) {
      await stripe.subscriptionItems.update(addonItem.id, {
        quantity: extra,
        proration_behavior: 'create_prorations',
      });
    } else if (extra > 0 && !addonItem) {
      await stripe.subscriptionItems.create({
        subscription: sub.stripe_subscription_id,
        price: priceRow.stripe_price_id,
        quantity: extra,
        proration_behavior: 'create_prorations',
      });
    }

    await supabase
      .from('parent_subscriptions')
      .update({ billed_addon_quantity: extra, updated_at: new Date().toISOString() })
      .eq('parent_id', userId);

    return new Response(JSON.stringify({ ok: true, billed_addon_quantity: extra }), {
      status: 200,
      headers,
    });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers });
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers });
  }
});
