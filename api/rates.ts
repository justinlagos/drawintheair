/**
 * GET /api/rates  — daily USD→X exchange rates for INDICATIVE display only.
 *
 * Rates are fetched server-side from a free, no-key source and cached for a
 * day at the edge. We never hardcode FX in the codebase (spec §3b). The actual
 * charge currency + amount are handled by Stripe Adaptive Pricing at checkout,
 * not by these numbers, so a slightly stale indicative figure is harmless.
 *
 * Falls back to an empty rate set (frontend then shows USD) if the upstream is
 * unreachable — never throws, never blocks the page.
 */
export const config = { runtime: 'edge' };

export default async function handler(): Promise<Response> {
  try {
    // open.er-api.com is a free, key-less USD-base rates endpoint.
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      // Cache a day at the edge.
      headers: { 'Accept': 'application/json' },
    });
    const json = await res.json().catch(() => ({}));
    const rates = (json && json.result === 'success' && json.rates) ? json.rates : {};
    return new Response(JSON.stringify({ base: 'USD', rates }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new Response(JSON.stringify({ base: 'USD', rates: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
    });
  }
}
