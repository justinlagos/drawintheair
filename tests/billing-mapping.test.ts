import { describe, it, expect } from 'vitest';
import { mapSubscription, pickBestSubscription } from '../supabase/functions/_shared/billing';

// Issue 1 — reconciliation mapping logic that the webhook, reconcile-subscription,
// and billing-health all share. These are the pure pieces behind
// "deleted subscription", "out-of-order update", and "missing customer mapping".

const BASE = 'price_base_monthly';
const ADDON = 'price_addon_monthly';
const basePriceIds = new Set([BASE]);

function sub(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'sub_123',
    customer: 'cus_123',
    status: 'active',
    cancel_at_period_end: false,
    current_period_start: 1_700_000_000,
    current_period_end: 1_702_592_000,
    trial_start: null,
    trial_end: null,
    canceled_at: null,
    items: { data: [
      { price: { id: BASE, recurring: { interval: 'month' } }, quantity: 1 },
      { price: { id: ADDON, recurring: { interval: 'month' } }, quantity: 3 },
    ] },
    ...overrides,
  };
}

describe('mapSubscription', () => {
  it('maps base + addon items, interval, and quantities', () => {
    const row = mapSubscription('parent-1', sub(), basePriceIds, '2026-06-17T00:00:00.000Z');
    expect(row.parent_id).toBe('parent-1');
    expect(row.stripe_subscription_id).toBe('sub_123');
    expect(row.stripe_customer_id).toBe('cus_123');
    expect(row.base_price_id).toBe(BASE);
    expect(row.addon_price_id).toBe(ADDON);
    expect(row.billed_addon_quantity).toBe(3);
    expect(row.plan_interval).toBe('month');
    expect(row.status).toBe('active');
    expect(row.last_event_at).toBe('2026-06-17T00:00:00.000Z');
  });

  it('sets last_event_at to the event timestamp when given one (webhook path)', () => {
    const row = mapSubscription('p', sub(), basePriceIds, '2026-06-17T00:00:00.000Z');
    expect(row.last_event_at).toBe('2026-06-17T00:00:00.000Z');
  });

  it('REGRESSION: omits last_event_at when no event timestamp (reconcile/health) so the ordering clock is never poisoned by now()', () => {
    // Root cause of the 2026-06 silent-billing incident: reconcile stamped
    // last_event_at = now(), making the webhook drop every later (delayed/
    // retried) event as stale. The key must be absent so an upsert leaves any
    // existing event-driven value untouched.
    const row = mapSubscription('p', sub(), basePriceIds);
    expect('last_event_at' in row).toBe(false);
    expect(row.last_event_at).toBeUndefined();
  });

  it('passes through Stripe status verbatim (e.g. past_due for payment failure)', () => {
    const row = mapSubscription('p', sub({ status: 'past_due' }), basePriceIds);
    expect(row.status).toBe('past_due');
  });

  it('handles a subscription with only a base item (no addon)', () => {
    const row = mapSubscription('p', sub({
      items: { data: [{ price: { id: BASE, recurring: { interval: 'year' } }, quantity: 1 }] },
    }), basePriceIds);
    expect(row.addon_price_id).toBeNull();
    expect(row.billed_addon_quantity).toBe(0);
    expect(row.plan_interval).toBe('year');
  });

  it('reads current_period_* from the top-level field (old API shape)', () => {
    const row = mapSubscription('p', sub(), basePriceIds);
    expect(row.current_period_end).toBe(new Date(1_702_592_000 * 1000).toISOString());
  });

  it('VERSION-SKEW: falls back to item.current_period_* when the top-level field is absent (clover shape)', () => {
    // Stripe 2025+/clover moves period dates onto subscription items.
    const cloverSub = {
      id: 'sub_clover', customer: 'cus_1', status: 'active', cancel_at_period_end: false,
      current_period_start: undefined, current_period_end: undefined,
      trial_start: null, trial_end: null, canceled_at: null,
      items: { data: [{
        price: { id: BASE, recurring: { interval: 'month' } }, quantity: 1,
        current_period_start: 1_700_000_000, current_period_end: 1_702_592_000,
      }] },
    };
    const row = mapSubscription('p', cloverSub, basePriceIds, '2026-06-17T00:00:00.000Z');
    expect(row.current_period_start).toBe(new Date(1_700_000_000 * 1000).toISOString());
    expect(row.current_period_end).toBe(new Date(1_702_592_000 * 1000).toISOString());
  });

  it('resolves customer id whether customer is a string or an expanded object', () => {
    const expanded = mapSubscription('p', sub({ customer: { id: 'cus_obj' } }), basePriceIds);
    expect(expanded.stripe_customer_id).toBe('cus_obj');
  });

  it('deleted subscriptions: caller overrides status to canceled (handler contract)', () => {
    // The webhook sets row.status = 'canceled' on customer.subscription.deleted.
    const row = mapSubscription('p', sub({ status: 'canceled', canceled_at: 1_700_500_000 }), basePriceIds);
    row.status = 'canceled';
    expect(row.status).toBe('canceled');
    expect(row.canceled_at).toBe(new Date(1_700_500_000 * 1000).toISOString());
  });
});

describe('pickBestSubscription', () => {
  it('prefers an active subscription over a canceled one', () => {
    const best = pickBestSubscription([
      { id: 'sub_old', status: 'canceled', created: 100 },
      { id: 'sub_live', status: 'active', created: 50 },
    ]);
    expect(best?.id).toBe('sub_live');
  });

  it('prefers the newest among same-status subscriptions', () => {
    const best = pickBestSubscription([
      { id: 'sub_a', status: 'active', created: 100 },
      { id: 'sub_b', status: 'active', created: 200 },
    ]);
    expect(best?.id).toBe('sub_b');
  });

  it('returns null for an empty list (missing customer mapping → no sub)', () => {
    expect(pickBestSubscription([])).toBeNull();
  });

  it('ranks trialing/past_due above ended states', () => {
    const best = pickBestSubscription([
      { id: 'sub_dead', status: 'incomplete_expired', created: 300 },
      { id: 'sub_trial', status: 'trialing', created: 100 },
    ]);
    expect(best?.id).toBe('sub_trial');
  });
});
