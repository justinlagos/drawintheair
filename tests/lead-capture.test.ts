import { describe, it, expect } from 'vitest';
import { validateLead, isAllowedOrigin } from '../supabase/functions/lead-capture/validate';

// WP2B.2 (DIA-013): the edge function's pure rules.
describe('lead-capture validateLead', () => {
  it('rejects non-object bodies', () => {
    expect(validateLead(null)).toEqual({ ok: false, error: 'Body must be a JSON object' });
    expect(validateLead([])).toEqual({ ok: false, error: 'Body must be a JSON object' });
    expect(validateLead('x')).toEqual({ ok: false, error: 'Body must be a JSON object' });
  });

  it('rejects unknown form types', () => {
    expect(validateLead({ type: 'evil', email: 'a@b.co' })).toEqual({ ok: false, error: 'Invalid form type' });
    expect(validateLead({ email: 'a@b.co' })).toEqual({ ok: false, error: 'Invalid form type' });
  });

  it('rejects malformed email addresses', () => {
    const v = validateLead({ type: 'contact', email: 'not-an-email', message: 'hi' });
    expect(v).toEqual({ ok: false, error: 'Invalid email address' });
  });

  it('requires an email or a message', () => {
    expect(validateLead({ type: 'contact', name: 'Jo' })).toEqual({ ok: false, error: 'Provide an email address or a message' });
  });

  it('treats a filled honeypot as silent success with nothing to store', () => {
    const v = validateLead({ type: 'contact', email: 'a@b.co', website: 'http://spam' });
    expect(v).toEqual({ ok: true, lead: null, honeypot: true });
  });

  it('normalises a good school pack request and keeps extra fields as metadata', () => {
    const v = validateLead({
      type: 'school_pack_request',
      email: '  Jane@School.EDU ',
      name: ' Jane ',
      school: 'Elm Park',
      role: 'Head Teacher',
      message: '',
      yearGroup: 'Reception',
      deviceType: 'iPad',
      timestamp: '2026-09-07T00:00:00Z',
      url: 'https://drawintheair.com/schools',
      count: 3,
      flag: true,
      nested: { not: 'allowed' },
      empty: '   ',
    });
    expect(v.ok).toBe(true);
    if (!v.ok || v.honeypot) throw new Error('expected lead');
    expect(v.lead.form_type).toBe('school_pack_request');
    expect(v.lead.email).toBe('jane@school.edu');
    expect(v.lead.name).toBe('Jane');
    expect(v.lead.message).toBeNull();
    expect(v.lead.metadata).toEqual({
      yearGroup: 'Reception',
      deviceType: 'iPad',
      timestamp: '2026-09-07T00:00:00Z',
      url: 'https://drawintheair.com/schools',
      count: 3,
      flag: true,
    });
  });

  it('caps long fields instead of failing', () => {
    const v = validateLead({ type: 'feedback', message: 'x'.repeat(10_000), extra: 'y'.repeat(5_000) });
    if (!v.ok || v.honeypot) throw new Error('expected lead');
    expect(v.lead.message?.length).toBe(4000);
    expect((v.lead.metadata.extra as string).length).toBe(1000);
  });

  it('caps the number of metadata keys', () => {
    const body: Record<string, unknown> = { type: 'feedback', message: 'hi' };
    for (let i = 0; i < 100; i++) body[`k${i}`] = 'v';
    const v = validateLead(body);
    if (!v.ok || v.honeypot) throw new Error('expected lead');
    expect(Object.keys(v.lead.metadata).length).toBe(40);
  });
});

describe('lead-capture isAllowedOrigin', () => {
  it('allows the production site and previews of the drawintheair project', () => {
    expect(isAllowedOrigin('https://drawintheair.com')).toBe(true);
    expect(isAllowedOrigin('https://www.drawintheair.com')).toBe(true);
    expect(isAllowedOrigin('https://drawintheair.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://drawintheair-git-wp-2b2-justins-projects.vercel.app')).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
  });

  it('rejects the retired app host and anything else', () => {
    expect(isAllowedOrigin('https://app.drawintheair.com')).toBe(false);
    expect(isAllowedOrigin('https://evil.com')).toBe(false);
    expect(isAllowedOrigin('https://drawintheair.com.evil.com')).toBe(false);
    expect(isAllowedOrigin('https://notdrawintheair.vercel.app')).toBe(false);
    expect(isAllowedOrigin(null)).toBe(false);
  });
});
