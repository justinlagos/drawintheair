-- 0015_email_dispatch_cron.sql
-- Applied to production 2026-06-04 via Supabase MCP.
-- Schedules the email-dispatch edge function (welcome + trial reminder +
-- trial expired emails) every 15 minutes via pg_cron + pg_net.
--
-- The function is guarded by an x-cron-key header. The key lives in
-- app_private.secrets (schema not exposed via PostgREST) and the SAME
-- value must be set as the EMAIL_CRON_SECRET function secret, along with
-- RESEND_API_KEY and EMAIL_FROM, for emails to actually send:
--
--   supabase secrets set RESEND_API_KEY=re_...
--   supabase secrets set EMAIL_FROM="Draw in the Air <hello@drawintheair.com>"
--   supabase secrets set EMAIL_CRON_SECRET=<value of app_private.secrets/email_cron_key>

create schema if not exists app_private;

create table if not exists app_private.secrets (
  name  text primary key,
  value text not null
);

insert into app_private.secrets (name, value)
values ('email_cron_key', encode(gen_random_bytes(24), 'hex'))
on conflict (name) do nothing;

create or replace function app_private.run_email_dispatch()
returns void language plpgsql security definer set search_path = app_private, net, public as $$
declare k text;
begin
  select value into k from app_private.secrets where name = 'email_cron_key';
  perform net.http_post(
    url := 'https://fmrsfjxwswzhvicylaph.supabase.co/functions/v1/email-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', k),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'email-dispatch-15m') then
    perform cron.unschedule('email-dispatch-15m');
  end if;
  perform cron.schedule('email-dispatch-15m', '*/15 * * * *', 'select app_private.run_email_dispatch()');
end $$;
