-- ═══════════════════════════════════════════════════════════════════════════
-- WP2A.2 follow-up — dashboard_public_proof must never compute on the anon path
--
-- APPLIED TO PRODUCTION 2026-09-09, minutes after 20260914000002.
--
-- The `anon` role carries statement_timeout = 3s. The underlying proof query
-- scans ~813k analytics_events rows and measured 1.4s to 3.1s, so before the
-- lock-down it failed roughly one anonymous call in three (57014). The 60s
-- memo added in 20260914000002 cannot rescue that on its own: the cache is
-- populated by the very call that has to succeed first, so once the compute
-- consistently exceeds 3s the cache is never written and every call fails.
-- Observed on production: two consecutive anon calls, both 500 at ~3.07s.
--
-- Fix: the anonymous path becomes a primary-key lookup and nothing else.
--   * app_private.refresh_public_proof_cache() computes and upserts. It runs
--     from pg_cron as the job owner, where the 3s anon limit does not apply.
--   * dashboard_public_proof() reads the cache and returns whatever is there,
--     however old. Serving a slightly stale count is strictly better than a
--     500 on a public page and a paging uptime monitor.
--   * Only when the cache is completely empty does it compute inline, which is
--     the cold-start case and self-heals on the next cron tick.
--
-- Measured after: 4 consecutive anon calls, all 200, 50ms to 278ms.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function app_private.refresh_public_proof_cache()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb;
begin
  v := public._dashboard_public_proof_impl();

  insert into public.dashboard_public_cache (key, payload, computed_at)
  values ('public_proof', v, now())
  on conflict (key) do update
    set payload = excluded.payload, computed_at = excluded.computed_at;

  return jsonb_build_object('refreshed_at', now());
end
$$;
revoke all on function app_private.refresh_public_proof_cache() from public;
revoke all on function app_private.refresh_public_proof_cache() from anon, authenticated;

create or replace function public.dashboard_public_proof()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb;
begin
  -- Serve the cached payload regardless of age. A stale count beats a 500.
  select payload into v
    from public.dashboard_public_cache
   where key = 'public_proof';
  if v is not null then
    return v;
  end if;

  -- Cold start only. May exceed the anon statement timeout; the cron tick
  -- below repairs it within the minute.
  v := public._dashboard_public_proof_impl();

  insert into public.dashboard_public_cache (key, payload, computed_at)
  values ('public_proof', v, now())
  on conflict (key) do update
    set payload = excluded.payload, computed_at = excluded.computed_at;

  return v;
end
$$;
grant execute on function public.dashboard_public_proof() to public, anon, authenticated, service_role;

select app_private.refresh_public_proof_cache();

do $$
begin
  if exists (select 1 from cron.job where jobname = 'refresh-public-proof-cache') then
    perform cron.unschedule('refresh-public-proof-cache');
  end if;
  perform cron.schedule(
    'refresh-public-proof-cache',
    '* * * * *',
    $cron$select app_private.refresh_public_proof_cache()$cron$
  );
end $$;

do $$
declare v_age interval;
begin
  select now() - computed_at into v_age
    from public.dashboard_public_cache where key = 'public_proof';
  if v_age is null then
    raise exception 'public_proof cache was not warmed';
  end if;
  if not exists (select 1 from cron.job where jobname = 'refresh-public-proof-cache' and active) then
    raise exception 'public_proof cache refresh job is missing or inactive';
  end if;
end $$;
