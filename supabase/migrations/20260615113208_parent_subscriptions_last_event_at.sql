-- =====================================================================
-- 0022_parent_subscriptions_last_event_at.sql
-- Applied to production 2026-06-15 via Supabase MCP.
--
-- The stripe-webhook edge function reads and writes
-- parent_subscriptions.last_event_at (its out-of-order delivery guard), but
-- the column was never created. Because the webhook did not check the write
-- error, every subscription upsert that referenced it failed silently
-- (returned HTTP 200 to Stripe while writing nothing). Adding the column makes
-- the webhook's upsert succeed. Additive, nullable, no backfill.
--
-- ROLLBACK: alter table public.parent_subscriptions drop column if exists last_event_at;
-- =====================================================================
alter table public.parent_subscriptions
  add column if not exists last_event_at timestamptz;