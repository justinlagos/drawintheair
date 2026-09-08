-- =====================================================================
-- 0023_billing_activation_email_flag.sql
--
-- Adds parent_subscriptions.activated_sent_at — the idempotency flag for the
-- new "payment received / subscription active" email. The app previously had
-- NO payment-confirmation email at all (email-dispatch only sent the trial
-- welcome + trial reminders). The webhook and reconcile paths set this once,
-- so the confirmation email is sent exactly once per activation.
--
-- Additive, nullable, no backfill. Pairs with 0022 (last_event_at).
-- ROLLBACK: alter table public.parent_subscriptions drop column if exists activated_sent_at;
-- =====================================================================
alter table public.parent_subscriptions
  add column if not exists activated_sent_at timestamptz;