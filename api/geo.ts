/**
 * GET /api/geo  — coarse country + suggested currency from the Vercel edge.
 *
 * Returns ONLY the ISO country code Vercel already attaches at the edge
 * (`x-vercel-ip-country`) plus a suggested ISO-4217 currency. No IP, no
 * precise location, nothing stored — used purely to pick the indicative
 * display currency on the pricing pages. The user can always override via the
 * on-page switcher.
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
  return new Response(JSON.stringify({ country: country || null, currency }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Vary per country so the CDN caches correctly; short TTL.
      'Cache-Control': 'public, max-age=300',
      'Vary': 'x-vercel-ip-country',
    },
  });
}
