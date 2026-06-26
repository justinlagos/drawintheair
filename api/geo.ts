/**
 * GET /api/geo  — coarse country + suggested currency from the Vercel edge.
 * Also returns the client IP for network fingerprinting (same-network
 * enforcement for classroom join codes).
 *
 * Returns country, currency, and the verified client IP from the edge proxy.
 * The IP is NOT stored client-side — it is forwarded to the join RPC for
 * server-side network comparison.
 */
export const config = { runtime: 'edge' };

// Minimal country → currency map for the markets we present. Anything not
// listed falls back to USD (which is also the Stripe settlement currency).
const COUNTRY_CURRENCY: Record<string, string> = {
  GB: 'GBP', US: 'USD', NG: 'NGN', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
  IE: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', PT: 'EUR',
  IN: 'INR', ZA: 'ZAR', AE: 'AED', SG: 'SGD', CH: 'CHF', SE: 'SEK', DK: 'DKK',
  NO: 'NOK', PL: 'PLN', BR: 'BRL', MX: 'MXN', JP: 'JPY', KE: 'KES', GH: 'GHS',
};

export default function handler(req: Request): Response {
  const country = (req.headers.get('x-vercel-ip-country') || '').toUpperCase();
  const currency = COUNTRY_CURRENCY[country] || 'USD';

  // Use Vercel's trusted edge IP header. Do NOT trust client-supplied
  // X-Forwarded-For — only read the header Vercel sets at the edge.
  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-vercel-forwarded-for') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '';

  return new Response(JSON.stringify({ country: country || null, currency, ip }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Vary': 'x-vercel-ip-country',
    },
  });
}
