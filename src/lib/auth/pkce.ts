/**
 * PKCE + redirect helpers for the OAuth flow (H4 Phase A).
 *
 * Kept as a small pure module so the crypto/encoding logic is unit-testable
 * without importing the whole supabase client.
 */

/** base64url (no padding) encode raw bytes. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Create a PKCE (verifier, S256 challenge) pair. The verifier is a random
 * 32-byte base64url string; the challenge is base64url(SHA-256(verifier)).
 */
export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const verifier = base64UrlEncode(random);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64UrlEncode(new Uint8Array(digest)) };
}

/**
 * Allow only internal, same-origin paths as redirect targets. Rejects
 * absolute URLs and protocol-relative `//host` paths (open-redirect guard).
 */
export function isSafeInternalPath(path: string | null | undefined): boolean {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}
