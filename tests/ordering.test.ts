import { describe, it, expect } from 'vitest';
import { isDuplicateEventError, isStaleEvent, PG_UNIQUE_VIOLATION } from '../supabase/functions/stripe-webhook/ordering';

// H3 — Stripe webhook idempotency + ordering decision logic.
describe('isDuplicateEventError (idempotency gate)', () => {
  it('treats a unique-violation as a duplicate', () => {
    expect(isDuplicateEventError(PG_UNIQUE_VIOLATION)).toBe(true);
    expect(isDuplicateEventError('23505')).toBe(true);
  });
  it('does not treat other errors as duplicates', () => {
    expect(isDuplicateEventError('23503')).toBe(false); // FK violation
    expect(isDuplicateEventError(undefined)).toBe(false);
    expect(isDuplicateEventError(null)).toBe(false);
  });
});

describe('isStaleEvent (ordering guard)', () => {
  const T2 = '2026-06-13T10:00:00.000Z';
  const T3 = '2026-06-13T11:00:00.000Z';

  it('skips an event older than the last applied (late past_due after active)', () => {
    // active applied at T3; a delayed past_due created at T2 arrives → skip.
    expect(isStaleEvent(T2, T3)).toBe(true);
  });
  it('applies an event newer than the last applied', () => {
    expect(isStaleEvent(T3, T2)).toBe(false);
  });
  it('applies when nothing has been applied yet', () => {
    expect(isStaleEvent(T2, null)).toBe(false);
    expect(isStaleEvent(T2, undefined)).toBe(false);
  });
  it('does not treat an equal timestamp as stale (dupes handled by the id gate)', () => {
    expect(isStaleEvent(T3, T3)).toBe(false);
  });
});
