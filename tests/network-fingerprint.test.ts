import { describe, it, expect } from 'vitest';
import {
  resolveTrustedClientIp,
  ipRateLimitKey,
  sha256Hex,
} from '../supabase/functions/_shared/network';

/** Build a Headers object from a plain map (case-insensitive .get). */
function h(map: Record<string, string>): Headers {
  return new Headers(map);
}

describe('resolveTrustedClientIp — trusted proxy only', () => {
  it('prefers cf-connecting-ip (Cloudflare-set, unspoofable)', () => {
    const headers = h({
      'cf-connecting-ip': '203.0.113.10',
      'x-real-ip': '198.51.100.5',
      'x-forwarded-for': '10.0.0.1, 198.51.100.5',
    });
    expect(resolveTrustedClientIp(headers)).toBe('203.0.113.10');
  });

  it('falls back to x-real-ip when no cf header', () => {
    const headers = h({ 'x-real-ip': '198.51.100.5', 'x-forwarded-for': '10.0.0.1, 198.51.100.5' });
    expect(resolveTrustedClientIp(headers)).toBe('198.51.100.5');
  });

  it('uses the LAST hop of x-forwarded-for (proxy-appended), never the first', () => {
    const headers = h({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 203.0.113.99' });
    expect(resolveTrustedClientIp(headers)).toBe('203.0.113.99');
  });

  it('SECURITY: a client-supplied X-Forwarded-For cannot override the trusted IP', () => {
    // Attacker tries to spoof a "same network" IP in a header they control.
    const headers = h({
      'cf-connecting-ip': '203.0.113.10', // the real, Cloudflare-observed IP
      'x-forwarded-for': '192.168.1.50',  // attacker-injected (e.g. the teacher's LAN IP)
    });
    // Must resolve to the trusted IP, NOT the spoofed one.
    expect(resolveTrustedClientIp(headers)).toBe('203.0.113.10');
    expect(resolveTrustedClientIp(headers)).not.toBe('192.168.1.50');
  });

  it('returns empty string when no trustworthy header is present', () => {
    expect(resolveTrustedClientIp(h({}))).toBe('');
  });
});

describe('ipRateLimitKey — PII-safe bucket key', () => {
  it('is deterministic for the same IP', async () => {
    expect(await ipRateLimitKey('203.0.113.10')).toBe(await ipRateLimitKey('203.0.113.10'));
  });

  it('differs for different IPs', async () => {
    expect(await ipRateLimitKey('203.0.113.10')).not.toBe(await ipRateLimitKey('203.0.113.11'));
  });

  it('never contains the raw IP (one-way hash)', async () => {
    const key = await ipRateLimitKey('203.0.113.10');
    expect(key).not.toContain('203.0.113.10');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns empty string for an empty IP (no fingerprint → no rate-limit bucket)', async () => {
    expect(await ipRateLimitKey('')).toBe('');
  });
});

describe('sha256Hex', () => {
  it('matches a known vector', async () => {
    // SHA-256("abc")
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
