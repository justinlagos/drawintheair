/**
 * POST /functions/v1/stripe-checkout
 *
 * Body: { interval: 'month' | 'year' }
 *
 * Creates (or reuses) a Stripe customer for the calling parent, then opens a
 * Stripe Checkout session with a 14-day trial. Returns { url } the client
 * redirects to.
 *
 * The session ALWAYS includes:
 *   • 1 × base price (qty 1) — the family plan
 *   • 1 × addon price (qty = max(0, active_children − included_slots)) IF
 *         the parent already has more children than the included slots.
 *
 * Trial is forced to 14 days regardless of plan, matching the product spec.
 * Quantity adjustments after checkout happen via `sync-subscription`.
 */

import { preflight, corsHeaders } from '../_shared/cors.ts';
import {
  getStripe,
  getServiceSupabase,
  requireUser,
  getEnv,
} from '../_shared/stripe.ts';

declare const Deno: { serve: (handler: (req: Request) => Promise<Response> | Response) => void };

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  const headers = { ...corsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' };

  try {
    const { userId, email } = await requireUser(req);
    const body = await req.json().catch(() => ({})) as { interval?: 'month' | 'year' };
    const interval: 'month' | 'year' = body.interval === 'year' ? 'year' : 'month';

    const stripe = getStripe();
    const supabase = getServiceSupabase();
    const appUrl = getEnv('PARENT_APP_URL');

    // ── Look up the parent record + active child count ────────────────────
    const { data: parent } = await supabase
      .from('parent_profiles')
      .select('id, email, stripe_customer_id')
      .eq('id', userId)
      .single();

    const { count: activeChildren } = await supabase
      .from('child_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', userId)
      .eq('status', 'active');

    const { data: cfg } = await supabase
      .from('pricing_config')
      .select('base_included_slots, trial_days')
      .eq('id', 'default')
      .single();

    const includedSlots = cfg?.base_included_slots ?? 2;
    const trialDays = cfg?.trial_days ?? 14;
    const extraChildren = Math.max(0, (activeChildren ?? 0) - includedSlots);

    // ── Resolve Stripe price IDs from stripe_price_map ────────────────────
    const { data: priceRows } = await supabase
      .from('stripe_price_map')
      .select('price_key, stripe_price_id')
      .eq('active', true)
      .in('price_key', [`base.${interval}`, `addon.${interval}`]);

    const priceMap = Object.fromEntries((priceRows ?? []).map(r => [r.price_key, r.stripe_price_id]));
    const basePriceId = priceMap[`base.${interval}`];
    const addonPriceId = priceMap[`addon.${interval}`];
    if (!basePriceId) {
      return new Response(JSON.stringify({ error: 'Plan not configured.' }), { status: 500, headers });
    }

    // ── Ensure a Stripe customer exists for this parent ───────────────────
    let customerId = parent?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email || parent?.email || undefined,
        metadata: { parent_id: userId },
      });
      customerId = customer.id;
      await supabase
        .from('parent_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // ── Build line items ──────────────────────────────────────────────────
    const lineItems: Array<{ price: string; quantity: number }> = [
      { price: basePriceId, quantity: 1 },
    ];
    if (extraChildren > 0 && addonPriceId) {
      lineItems.push({ price: addonPriceId, quantity: extraChildren });
    }

    // ── Create the Checkout session ───────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: lineItems,
      subscription_data: {
        trial_period_days: trialDays,
        metadata: { parent_id: userId },
      },
      allow_promotion_codes: true,
      success_url: `${appUrl}/parent/billing?checkout=success`,
      cancel_url: `${appUrl}/parent/billing?checkout=cancelled`,
      client_reference_id: userId,
      metadata: { parent_id: userId, interval },
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers });
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers });
  }
});
