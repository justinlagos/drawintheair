/**
 * Student session token: claim shape, signing and verification.
 *
 * Pure logic, no Deno or Node specifics, so the same file runs in the
 * Edge Function runtime and under vitest. Only Web Crypto, TextEncoder
 * and atob/btoa are used, all of which exist in both.
 *
 * The token is a plain HS256 JWT signed with the project JWT secret so
 * that PostgREST and Realtime both accept it and expose its claims to
 * RLS through auth.jwt(). It carries no `sub`, so auth.uid() stays NULL
 * and a student token can never satisfy a teacher or admin policy
 * branch.
 */

export const TOKEN_ISSUER = 'dia-class';
export const TOKEN_KIND = 'student';
/** Five hours. class_validate_join already caps a session at four. */
export const DEFAULT_TTL_SECONDS = 5 * 60 * 60;
/** Never mint longer than this, whatever the caller asks for. */
export const MAX_TTL_SECONDS = 6 * 60 * 60;
/** Refresh when this much life or less remains. */
export const REFRESH_THRESHOLD_SECONDS = 15 * 60;

export interface StudentClaims {
  iss: string;
  aud: string;
  role: 'anon';
  kind: 'student';
  session_id: string;
  student_id: string;
  tenant_id: string | null;
  iat: number;
  exp: number;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function encodeSegment(value: unknown): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

/**
 * Build the claim set for one student in one session.
 * Throws on anything that is not a well-formed identifier, so a bad
 * upstream response can never turn into a token with a junk scope.
 */
export function buildStudentClaims(input: {
  sessionId: string;
  studentId: string;
  tenantId?: string | null;
  nowSeconds: number;
  ttlSeconds?: number;
}): StudentClaims {
  if (!isUuid(input.sessionId)) throw new Error('session_id must be a uuid');
  if (!isUuid(input.studentId)) throw new Error('student_id must be a uuid');
  if (input.tenantId != null && !isUuid(input.tenantId)) {
    throw new Error('tenant_id must be a uuid or null');
  }
  if (!Number.isFinite(input.nowSeconds) || input.nowSeconds <= 0) {
    throw new Error('nowSeconds must be a positive number');
  }
  const requested = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  if (!Number.isFinite(requested) || requested <= 0) {
    throw new Error('ttlSeconds must be a positive number');
  }
  const ttl = Math.min(Math.floor(requested), MAX_TTL_SECONDS);
  const iat = Math.floor(input.nowSeconds);
  return {
    iss: TOKEN_ISSUER,
    aud: 'authenticated',
    role: 'anon',
    kind: TOKEN_KIND,
    session_id: input.sessionId,
    student_id: input.studentId,
    tenant_id: input.tenantId ?? null,
    iat,
    exp: iat + ttl,
  };
}

export async function importHmacKey(secret: string): Promise<CryptoKey> {
  if (!secret) throw new Error('jwt secret is empty');
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signStudentToken(
  claims: StudentClaims,
  key: CryptoKey,
): Promise<string> {
  const signingInput =
    `${encodeSegment({ alg: 'HS256', typ: 'JWT' })}.${encodeSegment(claims)}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput)),
  );
  return `${signingInput}.${bytesToBase64Url(signature)}`;
}

export type VerifyResult =
  | { ok: true; claims: StudentClaims }
  | { ok: false; reason: VerifyFailure };

export type VerifyFailure =
  | 'MALFORMED'
  | 'BAD_SIGNATURE'
  | 'BAD_CLAIMS'
  | 'EXPIRED';

/**
 * Verify signature first, then shape, then expiry. Returning the
 * reason lets the caller answer 401 for expired and 400 for forged
 * without leaking which part of the token was wrong to the child.
 */
export async function verifyStudentToken(
  token: string,
  key: CryptoKey,
  nowSeconds: number,
): Promise<VerifyResult> {
  if (typeof token !== 'string') return { ok: false, reason: 'MALFORMED' };
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
    return { ok: false, reason: 'MALFORMED' };
  }
  let signatureValid: boolean;
  try {
    signatureValid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }
  if (!signatureValid) return { ok: false, reason: 'BAD_SIGNATURE' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }
  const claims = parsed as Partial<StudentClaims> | null;
  if (
    !claims ||
    claims.iss !== TOKEN_ISSUER ||
    claims.kind !== TOKEN_KIND ||
    claims.role !== 'anon' ||
    !isUuid(claims.session_id) ||
    !isUuid(claims.student_id) ||
    typeof claims.exp !== 'number' ||
    typeof claims.iat !== 'number'
  ) {
    return { ok: false, reason: 'BAD_CLAIMS' };
  }
  if (claims.exp <= nowSeconds) return { ok: false, reason: 'EXPIRED' };
  return { ok: true, claims: claims as StudentClaims };
}

/** True when the token is close enough to expiry that the 5s poll should swap it. */
export function needsRefresh(
  claims: Pick<StudentClaims, 'exp'>,
  nowSeconds: number,
  thresholdSeconds: number = REFRESH_THRESHOLD_SECONDS,
): boolean {
  return claims.exp - nowSeconds <= thresholdSeconds;
}

/** Read claims without verifying. Client-side only, for expiry checks. */
export function decodeClaimsUnsafe(token: string): StudentClaims | null {
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(parts[1])),
    ) as Partial<StudentClaims>;
    if (!isUuid(claims.session_id) || !isUuid(claims.student_id)) return null;
    if (typeof claims.exp !== 'number') return null;
    return claims as StudentClaims;
  } catch {
    return null;
  }
}
