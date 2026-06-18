import { describe, it, expect } from 'vitest';
import { buildWebhookLog } from '../supabase/functions/stripe-webhook/log';

// Issue 1, task 7 — structured webhook logging.
describe('buildWebhookLog', () => {
  it('emits a single-line JSON object tagged stripe-webhook with a step + ts', () => {
    const line = buildWebhookLog('received');
    expect(line).not.toContain('\n');
    const parsed = JSON.parse(line);
    expect(parsed.tag).toBe('stripe-webhook');
    expect(parsed.step).toBe('received');
    expect(typeof parsed.ts).toBe('string');
    expect(Number.isNaN(Date.parse(parsed.ts))).toBe(false);
  });

  it('includes the operational fields needed to debug a silent outage', () => {
    const parsed = JSON.parse(buildWebhookLog('subscription_sync_ok', {
      eventId: 'evt_1', eventType: 'customer.subscription.updated',
      customerId: 'cus_1', subscriptionId: 'sub_1', parentId: 'p_1', status: 'active',
    }));
    expect(parsed).toMatchObject({
      step: 'subscription_sync_ok',
      eventId: 'evt_1', eventType: 'customer.subscription.updated',
      customerId: 'cus_1', subscriptionId: 'sub_1', parentId: 'p_1', status: 'active',
    });
  });

  it('drops null/undefined/empty fields so lines stay compact', () => {
    const parsed = JSON.parse(buildWebhookLog('parent_unresolved', {
      eventId: 'evt_2', parentId: null, customerId: undefined, subscriptionId: '',
    }));
    expect(parsed.eventId).toBe('evt_2');
    expect('parentId' in parsed).toBe(false);
    expect('customerId' in parsed).toBe(false);
    expect('subscriptionId' in parsed).toBe(false);
  });

  it('records httpStatus and error on failure steps', () => {
    const parsed = JSON.parse(buildWebhookLog('signature_failed', { error: 'bad sig', httpStatus: 400 }));
    expect(parsed.error).toBe('bad sig');
    expect(parsed.httpStatus).toBe(400);
  });
});
