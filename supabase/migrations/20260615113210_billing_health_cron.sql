-- =====================================================================
-- 0024_billing_health_cron.sql
--
-- Schedules the billing-health edge function every 15 minutes via pg_cron +
-- pg_net. billing-health auto-repairs any drift between Stripe and the DB
-- (so a webhook outage can never lock a paying customer out for more than a
-- few minutes) and fires a dead-man-switch admin alert if the webhook goes
-- silent. Gated by the SAME x-cron-key as email-dispatch (app_private.secrets
-- 'email_cron_key'); the function validates it via get_email_cron_key().
--
-- ROLLBACK: select cron.unschedule('billing-health-15m');
--           drop function if exists app_private.run_billing_health();
-- =====================================================================

create or replace function app_private.run_billing_health()
returns void language plpgsql security definer set search_path = app_private, net, public as $$
declare k text;
begin
  select value into k from app_private.secrets where name = 'email_cron_key';
  perform net.http_post(
    url := 'https://fmrsfjxwswzhvicylaph.supabase.co/functions/v1/billing-health',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', k),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'billing-health-15m') then
    perform cron.unschedule('billing-health-15m');
  end if;
  -- Offset by a few minutes from the email cron to spread load.
  perform cron.schedule('billing-health-15m', '7-59/15 * * * *', 'select app_private.run_billing_health()');
end $$;