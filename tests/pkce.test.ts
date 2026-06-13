import { describe, it, expect } from 'vitest';
import { base64UrlEncode, createPkcePair, isSafeInternalPath } from '../src/lib/auth/pkce';

// H4 Phase A — PKCE + redirect-safety helpers.
describe('base64UrlEncode', () => {
  it('produces URL-safe output with no padding', () => {
    const out = base64UrlEncode(new Uint8Array([251, 255, 191, 0, 1, 2]));
    expect(out).not.toMatch(/[+/=]/);
  });
});

describe('createPkcePair', () => {
  it('challenge is base64url(SHA-256(verifier))', async () => {
    const { verifier, challenge } = await createPkcePair();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    expect(challenge).toBe(base64UrlEncode(new Uint8Array(digest)));
  });
  it('verifier is within the RFC 7636 length range and URL-safe', async () => {
    const { verifier } = await createPkcePair();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(verifier).not.toMatch(/[+/=]/);
  });
  it('is non-deterministic (fresh verifier each call)', async () => {
    const a = await createPkcePair();
    const b = await createPkcePair();
    expect(a.verifier).not.toBe(b.verifier);
  });
});

describe('isSafeInternalPath (open-redirect guard)', () => {
  it('accepts internal absolute paths', () => {
    expect(isSafeInternalPath('/class')).toBe(true);
    expect(isSafeInternalPath('/admin/insights')).toBe(true);
  });
  it('rejects protocol-relative and absolute URLs', () => {
    expect(isSafeInternalPath('//evil.com')).toBe(false);
    expect(isSafeInternalPath('https://evil.com')).toBe(false);
    expect(isSafeInternalPath('javascript:alert(1)')).toBe(false);
  });
  it('rejects empty / nullish', () => {
    expect(isSafeInternalPath('')).toBe(false);
    expect(isSafeInternalPath(null)).toBe(false);
    expect(isSafeInternalPath(undefined)).toBe(false);
  });
});
