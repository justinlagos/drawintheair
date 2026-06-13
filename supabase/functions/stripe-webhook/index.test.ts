// Deno integration test for the Stripe webhook decision logic (H3).
// Run with:  deno test supabase/functions/stripe-webhook/index.test.ts
//
// The pure idempotency/ordering helpers are also covered by the Node/vitest
// suite (tests/ordering.test.ts); this file documents the end-to-end intent
// and runs the same assertions in the Deno runtime the function ships on.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { isDuplicateEventError, isStaleEvent } from './ordering.ts';

Deno.test('duplicate event (replay) is acknowledged once', () => {
  // First delivery: no error → processed.
  assertEquals(isDuplicateEventError(undefined), false);
  // Replay: unique violation on stripe_event_id → treated as duplicate, 200.
  assertEquals(isDuplicateEventError('23505'), true);
});

Deno.test('out-of-order events: stale past_due after active is skipped', () => {
  const active = '2026-06-13T11:00:00.000Z';
  const latePastDue = '2026-06-13T10:00:00.000Z';
  assertEquals(isStaleEvent(latePastDue, active), true);   // skip
  assertEquals(isStaleEvent(active, latePastDue), false);  // apply
});

Deno.test('first event for a parent always applies', () => {
  assertEquals(isStaleEvent('2026-06-13T10:00:00.000Z', null), false);
});
