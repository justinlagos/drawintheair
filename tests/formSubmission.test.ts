import { describe, it, expect, vi } from 'vitest';
import {
  submitFormData,
  leadCaptureUrl,
  interpretLeadCaptureResponse,
  SUBMISSION_FAILED_MESSAGE,
} from '../src/lib/formSubmission';

// WP2B.2 (DIA-013): the client must call the owned lead-capture endpoint
// and must never report success when nothing remote accepted the lead.

const env = {
  supabaseUrl: 'https://example.supabase.co/',
  supabaseAnonKey: 'anon-key',
  sheetsEndpoint: '',
  leadsEndpoint: '',
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('leadCaptureUrl', () => {
  it('derives the function URL from the Supabase project URL', () => {
    expect(leadCaptureUrl('https://example.supabase.co')).toBe('https://example.supabase.co/functions/v1/lead-capture');
    expect(leadCaptureUrl('https://example.supabase.co//')).toBe('https://example.supabase.co/functions/v1/lead-capture');
  });

  it('never falls back to the retired app host', () => {
    expect(leadCaptureUrl('')).toBeNull();
    expect(leadCaptureUrl(undefined)).toBeNull();
  });
});

describe('interpretLeadCaptureResponse', () => {
  it('accepts 2xx', () => {
    expect(interpretLeadCaptureResponse(200, { })).toEqual({ accepted: true, retryable: false });
  });
  it('marks 400 and 429 as final, with a user-facing reason', () => {
    expect(interpretLeadCaptureResponse(400, { error: 'Invalid email address' })).toMatchObject({ accepted: false, retryable: false, error: 'Invalid email address' });
    expect(interpretLeadCaptureResponse(429, null)).toMatchObject({ accepted: false, retryable: false });
  });
  it('marks 5xx as retryable', () => {
    expect(interpretLeadCaptureResponse(503, null)).toMatchObject({ accepted: false, retryable: true, error: SUBMISSION_FAILED_MESSAGE });
  });
});

describe('submitFormData', () => {
  it('posts to lead-capture with the anon key headers and reports success on 200', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(200, { ok: true }));
    const store = vi.fn();
    const res = await submitFormData({ type: 'contact', email: 'a@b.co', message: 'hi' }, { env, fetchFn, storeLocallyFn: store });

    expect(res).toEqual({ success: true, method: 'lead_capture' });
    expect(store).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.supabase.co/functions/v1/lead-capture');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe('anon-key');
    expect(headers.Authorization).toBe('Bearer anon-key');
    const body = JSON.parse(init.body as string);
    expect(body.type).toBe('contact');
    expect(body.email).toBe('a@b.co');
    expect(typeof body.timestamp).toBe('string');
  });

  it('returns success false (not a fake sent) when every remote endpoint is down', async () => {
    const fetchFn = vi.fn(async () => { throw new TypeError('network down'); });
    const res = await submitFormData({ type: 'pilot_list', email: 'a@b.co' }, { env, fetchFn, storeLocallyFn: () => {} });
    expect(res.success).toBe(false);
    expect(res.method).toBe('local_only');
    expect(res.error).toBe(SUBMISSION_FAILED_MESSAGE);
  });

  it('returns success false when lead-capture is not configured and no fallback exists', async () => {
    const fetchFn = vi.fn();
    const res = await submitFormData({ type: 'pilot_list', email: 'a@b.co' }, {
      env: { supabaseUrl: '', supabaseAnonKey: '' }, fetchFn, storeLocallyFn: () => {},
    });
    expect(res.success).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('surfaces a 400 reason and does not retry legacy endpoints', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(400, { error: 'Invalid email address' }));
    const res = await submitFormData({ type: 'contact', email: 'bad', message: 'x' }, {
      env: { ...env, sheetsEndpoint: 'https://script.google.com/x' }, fetchFn, storeLocallyFn: () => {},
    });
    expect(res).toEqual({ success: false, method: 'local_only', error: 'Invalid email address' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('reports rate limiting honestly', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(429, { error: 'Too many' }));
    const res = await submitFormData({ type: 'contact', email: 'a@b.co', message: 'x' }, { env, fetchFn, storeLocallyFn: () => {} });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Too many submissions/);
  });

  it('falls back to the sheets endpoint on a 5xx from lead-capture', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: 'down' }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));
    const res = await submitFormData({ type: 'contact', email: 'a@b.co', message: 'x' }, {
      env: { ...env, sheetsEndpoint: 'https://script.google.com/x' }, fetchFn, storeLocallyFn: () => {},
    });
    expect(res).toEqual({ success: true, method: 'google_sheets' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
