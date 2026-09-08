-- ═══════════════════════════════════════════════════════════════════════════
-- 0024_subscription_event_ordering.sql
--
-- H3 (Stripe webhook ordering guard).
--
-- Adds parent_subscriptions.last_event_at: the Stripe `event.created`
-- timestamp of the most recent webhook event we applied to this row. The
-- stripe-webhook edge function uses it to skip out-of-order events (Stripe
-- does not guarantee delivery order), so a delayed event cannot revert newer
-- subscription state.
--
-- Idempotency itself is enforced by the pre-existing UNIQUE constraint on
-- billing_events.stripe_event_id (no schema change needed for that half).
--
-- Behaviour: additive, nullable column. No existing row semantics change;
-- the first event after deploy simply stamps the column.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.parent_subscriptions
  add column if not exists last_event_at timestamptz;

comment on column public.parent_subscriptions.last_event_at is
  'Stripe event.created of the last webhook event applied to this row. Used by stripe-webhook to drop out-of-order events (H3).';
