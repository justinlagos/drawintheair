-- ═══════════════════════════════════════════════════════════════════════════
-- ingest_canary_test.sql  (WP2B.6 regression test)
--
-- Run AFTER applying 20260914000006_wp2b6_observability_canary.sql on
-- STAGING (never production: it writes one canary row, then removes it).
-- Asserts:
--   * the canary writes exactly one row through public.ingest_analytics_events
--     and the trigger promotes meta.traffic_type to the column;
--   * the dashboard exclusion predicate drops the canary row;
--   * canary_status() flips healthy/unhealthy on the 45-minute rule and
--     exposes only the two agreed keys;
--   * anon can execute canary_status() but not the writer;
--   * the dead refresh job is gone and the canary job is scheduled;
--   * dashboard_anomaly_check no longer references session_started.
--
-- Usage (psql): \i supabase/migrations/tests/ingest_canary_test.sql
-- Any failed assertion raises and aborts; "WP2B.6 CANARY TEST PASSED" prints
-- on success. Everything runs in one transaction that is rolled back.
-- ═══════════════════════════════════════════════════════════════════════════
begin;

do $$
declare
  canary_session constant uuid := 'c0a7a7a7-0000-4000-8000-000000000001';
  before_n bigint;
  after_n  bigint;
  s jsonb;
begin
  select count(*) into before_n from public.analytics_events where event_name = 'ingest_canary';

  assert app_private.run_ingest_canary() = 1, 'canary writer must insert exactly one row';

  select count(*) into after_n from public.analytics_events where event_name = 'ingest_canary';
  assert after_n = before_n + 1, 'exactly one new canary row expected';

  -- Stamping via meta -> column promotion, same path as the browser.
  assert exists (
    select 1 from public.analytics_events
     where event_name = 'ingest_canary' and session_id = canary_session
       and traffic_type = 'internal' and environment = 'production'
       and device_id is null
       and occurred_at > now() - interval '1 minute'
  ), 'canary row must carry traffic_type=internal, environment=production, NULL device_id';

  -- The dashboard predicate (dashboard_executive_summary / dashboard_funnel)
  -- must drop every canary row.
  assert (
    select count(*) from public.analytics_events e
     where e.event_name = 'ingest_canary'
       and (e.traffic_type is null or e.traffic_type not in ('internal', 'qa', 'bot'))
  ) = 0, 'canary rows must be excluded by the internal/qa/bot filter';

  -- Status: healthy now, only the two agreed keys.
  s := public.canary_status();
  assert (s->>'healthy')::boolean = true, 'canary_status must be healthy right after a write';
  assert (s->>'age_seconds')::int between 0 and 60, 'age_seconds must be near zero';
  assert (select count(*) from jsonb_object_keys(s)) = 2, 'canary_status must expose exactly healthy and age_seconds';

  -- Age the newest row past the threshold: status must go unhealthy.
  update public.analytics_events
     set occurred_at = now() - interval '46 minutes'
   where event_name = 'ingest_canary' and occurred_at > now() - interval '45 minutes';
  s := public.canary_status();
  assert (s->>'healthy')::boolean = false, 'canary_status must be unhealthy when newest row is older than 45 min';
  assert (s->>'age_seconds')::int >= 2760, 'age_seconds must reflect the aged row';

  -- Grants: anon may poll status, may not write.
  assert has_function_privilege('anon', 'public.canary_status()', 'EXECUTE'),
    'anon must be able to execute canary_status()';
  assert not has_function_privilege('anon', 'app_private.run_ingest_canary()', 'EXECUTE'),
    'anon must NOT execute the canary writer';

  -- Cron state.
  assert exists (select 1 from cron.job where jobname = 'ingest-canary-15m' and active),
    'ingest-canary-15m must be scheduled';
  assert not exists (select 1 from cron.job where jobname = 'refresh-materialized-views'),
    'refresh-materialized-views must be unscheduled';

  -- Anomaly check semantics.
  assert position('session_started' in pg_get_functiondef('public.dashboard_anomaly_check()'::regprocedure)) = 0
      or position('retired session_started' in pg_get_functiondef('public.dashboard_anomaly_check()'::regprocedure)) > 0,
    'dashboard_anomaly_check must not count the retired session_started event';
  assert (public.dashboard_anomaly_check()->'window_summary') ? 'new_sessions',
    'anomaly window_summary must still expose new_sessions';

  -- Digest keys.
  assert (public.dashboard_daily_digest()) ? 'genuine_sessions_24h', 'digest must expose genuine_sessions_24h';
  assert (public.dashboard_daily_digest()) ? 'ingest_canary', 'digest must expose ingest_canary';

  raise notice 'WP2B.6 CANARY TEST PASSED';
end $$;

rollback;
