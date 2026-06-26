// Shared, dependency-free network helpers for the classroom join flow.
//
// Pure functions only (no Deno/Node globals beyond Web Crypto, which exists in
// both Supabase Edge runtime and the Vitest/Node test runtime) so the exact
// same code is exercised by unit tests and by the deployed Edge Function.

export interface HeaderLike {
  get(name: string): string | null;
}

/**
 * Resolve the client IP that the TRUSTED platform proxy observed.
 *
 * Security: a browser can freely set `X-Forwarded-For`, so we must never take
 * the first (client-controllable) hop. Preference order:
 *   1. `cf-connecting-ip`  — set by Cloudflare in front of Supabase Edge;
 *                            Cloudflare overwrites any client-supplied value,
 *                            so it cannot be spoofed.
 *   2. `x-real-ip`         — set by the Supabase/Kong gateway.
 *   3. last hop of `x-forwarded-for` — the entry appended by the trusted
 *                            proxy (NOT the first, which the client controls).
 *
 * Returns '' when nothing trustworthy is present.
 */
export function resolveTrustedClientIp(headers: HeaderLike): string {
  const cf = headers.get('cf-connecting-ip');
  if (cf && cf.trim()) return cf.trim();

  const real = headers.get('x-real-ip');
  if (real && real.trim()) return real.trim();

  const xff = headers.get('x-forwarded-for');
  if (xff && xff.trim()) {
    const hops = xff.split(',').map((h) => h.trim()).filter(Boolean);
    // The proxy appends the real client IP as the LAST hop. Anything before it
    // may have been injected by the client and must be ignored.
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return '';
}

/** Lowercase hex SHA-256 of the input. Used to derive a PII-safe rate-limit
 *  bucket key from an IP — never stores or logs the raw IP. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Derive the rate-limit bucket key for an IP. Versioned prefix so the
 *  hashing scheme can be rotated without colliding with old rows. */
export async function ipRateLimitKey(ip: string): Promise<string> {
  if (!ip) return '';
  return sha256Hex(`dia-join-v1:${ip}`);
}
