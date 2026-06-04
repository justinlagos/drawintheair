-- 0016_email_cron_key_rpc.sql
-- Applied to production 2026-06-04 via Supabase MCP.
-- The email-dispatch edge function validates its x-cron-key header
-- against app_private.secrets. That schema is (correctly) not exposed
-- through the API, so provide a service-role-only RPC bridge.
create or replace function public.get_email_cron_key() returns text
language sql stable security definer set search_path = app_private as $$
  select value from app_private.secrets where name = 'email_cron_key';
$$;
revoke all on function public.get_email_cron_key() from public, anon, authenticated;
grant execute on function public.get_email_cron_key() to service_role;
