/**
 * POST /functions/v1/stripe-portal
 *
 * Opens a Stripe Customer Portal session for the calling parent. All
 * payment-method / cancellation / receipt actions happen there so we keep
 * the PCI surface area tiny.
 */

import { preflight, corsHeaders } from '../_shared/cors.ts';
import { getStripe, getServiceSupabase, requireUser, getEnv } from '../_shared/stripe.ts';

declare const Deno: { serve: (handler: (req: Request) => Promise<Response> | Response) => void };

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  const headers = { ...corsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' };

  try {
    const { userId } = await requireUser(req);
    const stripe = getStripe();
    const supabase = getServiceSupabase();
    const appUrl = getEnv('PARENT_APP_URL');

    const { data: parent } = await supabase
      .from('parent_profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!parent?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No Stripe customer yet.' }), { status: 400, headers });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: parent.stripe_customer_id,
      return_url: `${appUrl}/parent/billing`,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers });
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers });
  }
});
