/**
 * POST /functions/v1/reconcile-subscription
 *
 * Pull the caller's subscription straight from Stripe and write the full
 * state into parent_subscriptions — WITHOUT waiting for a webhook. This is
 * what makes the checkout-success page activate the account instantly, and
 * it is the manual "fix this customer" button for admins.
 *
 * Body (optional): { parent_id }  — only honoured for platform admins, who can
 * reconcile any parent. Everyone else reconciles themselves.
 *
 * Returns { ok, status, subscription_id }.
 */

import { preflight, corsHeaders } from '../_shared/cors.ts';
import { getStripe, getServiceSupabase, requireUser } from '../_shared/stripe.ts';
import { reconcileParentFromStripe, alertAdmin } from '../_shared/billing.ts';

declare const Deno: { serve: (handler: (req: Request) => Promise<Response> | Response) => void };

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  const headers = { ...corsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' };

  try {
    const { userId, email, supabase: userClient } = await requireUser(req);
    const body = await req.json().catch(() => ({})) as { parent_id?: string };

    // Default to the caller. Admins may target another parent.
    let targetId = userId;
    if (body.parent_id && body.parent_id !== userId) {
      const { data: isAdmin } = await userClient.rpc('is_platform_admin');
      if (!isAdmin) {
        return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), { status: 403, headers });
      }
      targetId = body.parent_id;
    }

    const stripe = getStripe();
    const supabase = getServiceSupabase();

    const { data: parent } = await supabase
      .from('parent_profiles')
      .select('email, stripe_customer_id')
      .eq('id', targetId)
      .maybeSingle();

    const result = await reconcileParentFromStripe(stripe, supabase, targetId, {
      customerId: parent?.stripe_customer_id ?? null,
      email: parent?.email ?? email,
    });

    if (!result.status) {
      // No subscription in Stripe yet (e.g. checkout abandoned). Not an error.
      return new Response(JSON.stringify({ ok: false, status: null, reason: 'no_subscription' }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ ok: true, status: result.status, subscription_id: result.subscriptionId }), {
      status: 200, headers,
    });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers });
    await alertAdmin('reconcile-subscription threw', (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500, headers });
  }
});
