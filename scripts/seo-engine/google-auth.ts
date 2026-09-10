// scripts/seo-engine/google-auth.ts
//
// Service-account auth for Google APIs with no SDK: build an RS256 JWT with
// node:crypto and exchange it for a short-lived access token. Read-only scope.
// The key JSON arrives via the GSC_SERVICE_ACCOUNT_JSON secret and is never
// logged or written anywhere.

import { createSign } from 'node:crypto';

export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export const GSC_READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

const b64url = (input: string | Buffer): string =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export function parseServiceAccount(json: string): ServiceAccountKey {
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { throw new Error('GSC_SERVICE_ACCOUNT_JSON is not valid JSON'); }
  const k = parsed as Partial<ServiceAccountKey>;
  if (!k || typeof k.client_email !== 'string' || typeof k.private_key !== 'string') {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON is missing client_email or private_key');
  }
  return { client_email: k.client_email, private_key: k.private_key, token_uri: k.token_uri };
}

/** Build and sign the JWT assertion (exported so the signature can be unit-tested with a throwaway key). */
export function buildAssertion(key: ServiceAccountKey, scope: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const aud = key.token_uri ?? 'https://oauth2.googleapis.com/token';
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: key.client_email, scope, aud, iat: nowSeconds, exp: nowSeconds + 3600 }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const sig = b64url(signer.sign(key.private_key));
  return `${header}.${claims}.${sig}`;
}

export async function fetchAccessToken(key: ServiceAccountKey, scope = GSC_READONLY_SCOPE): Promise<string> {
  const tokenUri = key.token_uri ?? 'https://oauth2.googleapis.com/token';
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: buildAssertion(key, scope),
  });
  const res = await fetch(tokenUri, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) throw new Error(`Google token exchange failed: HTTP ${res.status}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Google token exchange returned no access_token');
  return data.access_token;
}
