import { describe, expect, it } from 'vitest';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { buildAssertion, parseServiceAccount, GSC_READONLY_SCOPE } from '../scripts/seo-engine/google-auth';
import { evidenceWindows, fetchSearchRows } from '../scripts/seo-engine/gsc';
import { FUNNEL_DEFINITION, resolveConnectionString } from '../scripts/seo-engine/funnel';
import { loadSiteMetadata } from '../scripts/seo-engine/metadata';

describe('google service-account auth', () => {
  it('rejects a key file without the fields it needs, without echoing it', () => {
    expect(() => parseServiceAccount('not json')).toThrow(/not valid JSON/);
    expect(() => parseServiceAccount('{"client_email":"x"}')).toThrow(/missing/);
  });

  it('signs an RS256 assertion the public key verifies, scoped read-only', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const key = parseServiceAccount(JSON.stringify({
      client_email: 'seo-engine@example.iam.gserviceaccount.com',
      private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
      token_uri: 'https://oauth2.googleapis.com/token',
    }));
    const jwt = buildAssertion(key, GSC_READONLY_SCOPE, 1_700_000_000);
    const [h, c, s] = jwt.split('.');
    const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(claims.scope).toBe(GSC_READONLY_SCOPE);
    expect(claims.exp - claims.iat).toBe(3600);
    const v = createVerify('RSA-SHA256');
    v.update(`${h}.${c}`);
    expect(v.verify(publicKey, Buffer.from(s, 'base64url'))).toBe(true);
  });
});

describe('search console reader', () => {
  it('paginates with startRow and maps keys to page/query', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      calls.push(body);
      const rowsPage = body.startRow === 0
        ? [{ keys: ['https://drawintheair.com/a', 'q1'], clicks: 1, impressions: 10, ctr: 0.1, position: 3 }, { keys: ['https://drawintheair.com/b', 'q2'], clicks: 0, impressions: 5, ctr: 0, position: 9 }]
        : [{ keys: ['https://drawintheair.com/c', 'q3'], clicks: 2, impressions: 2, ctr: 1, position: 1 }];
      return new Response(JSON.stringify({ rows: rowsPage }), { status: 200 });
    }) as typeof fetch;
    const rows = await fetchSearchRows('tok', { property: 'sc-domain:drawintheair.com', startDate: '2026-08-01', endDate: '2026-08-28', rowLimit: 2, fetchImpl });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ page: 'https://drawintheair.com/a', query: 'q1', clicks: 1, impressions: 10, ctr: 0.1, position: 3 });
    expect(calls.map((c) => c.startRow)).toEqual([0, 2]);
    expect(calls[0].dimensions).toEqual(['page', 'query']);
    expect(calls[0].dataState).toBe('final');
  });

  it('fails loudly on a non-2xx without retrying forever', async () => {
    const fetchImpl = (async () => new Response('nope', { status: 403 })) as typeof fetch;
    await expect(fetchSearchRows('tok', { property: 'p', startDate: 'a', endDate: 'b', fetchImpl })).rejects.toThrow(/HTTP 403/);
  });

  it('builds a lagged 28-day window and the equal-length previous window', () => {
    const w = evidenceWindows(28, 3, new Date('2026-09-10T12:00:00Z'));
    expect(w.current).toEqual({ from: '2026-08-11', to: '2026-09-07' });
    expect(w.previous).toEqual({ from: '2026-07-14', to: '2026-08-10' });
  });
});

describe('funnel reader config', () => {
  it('passes a full connection string through and composes one from a bare password', () => {
    const full = 'postgresql://seo_engine_ro.ref:pw@aws-1-eu-west-2.pooler.supabase.com:5432/postgres';
    expect(resolveConnectionString(full, 'https://ref.supabase.co')).toBe(full);
    expect(resolveConnectionString('p@ss', 'https://fmrsfjxwswzhvicylaph.supabase.co'))
      .toBe('postgresql://seo_engine_ro.fmrsfjxwswzhvicylaph:p%40ss@aws-1-eu-west-2.pooler.supabase.com:5432/postgres');
  });

  it('funnel definition matches the locked conversion hierarchy', () => {
    expect(FUNNEL_DEFINITION.signup).toContain('teacher_signup_completed');
    expect(FUNNEL_DEFINITION.enquiry).toContain('school_pack_form_submit');
    expect(FUNNEL_DEFINITION.qualifiedDemoStart.ctaClickFunnelStep).toBe('qualified_demo_start');
  });
});

describe('site metadata model', () => {
  it('loads every PAGE_META entry keyed by canonical path, including the hub and audience pages', () => {
    const m = loadSiteMetadata();
    expect(m['/letter-tracing'].title.length).toBeGreaterThan(10);
    expect(m['/teachers']).toBeDefined();
    expect(m['/parents']).toBeDefined();
    expect(m['/']).toBeDefined();
    expect(Object.keys(m).length).toBeGreaterThanOrEqual(20);
  });
});
