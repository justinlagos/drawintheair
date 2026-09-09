-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK for 20260914000006_wp2b6_observability_canary.sql (WP2B.6)
--
-- Lives under migrations/rollbacks/ so the Supabase CLI never applies it as
-- a forward migration. Run by hand (psql or SQL editor) only if the forward
-- migration has to be reverted. Every step is reversible; no personal data
-- is touched (the only rows deleted are the synthetic canary rows).
--
-- Order matters: stop the writer first, then restore function definitions,
-- then drop the new objects.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Stop the canary job and its monitor endpoint.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ingest-canary-15m') then
    perform cron.unschedule('ingest-canary-15m');
  end if;
end $$;

-- 2. Restore dashboard_daily_digest exactly as read from production on
--    2026-09-07 (pre-WP2B.6). Must come before dropping canary_status(),
--    which the WP2B.6 version references.
CREATE OR REPLACE FUNCTION public.dashboard_daily_digest()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
SELECT jsonb_build_object(
    'as_of', now(),
    'today',         (SELECT public.dashboard_today()),
    'funnel_24h',    (SELECT public.dashboard_funnel(1)),
    'funnel_7d',     (SELECT public.dashboard_funnel(7)),
    'tracker_7d',    (SELECT public.dashboard_tracker_health(7)),
    'top_modes_7d',  (SELECT public.dashboard_top_modes(7)),
    'errors',        (SELECT public.dashboard_errors(20)),
    'cohort',        (SELECT public.dashboard_cohort_retention(8)),
    'mastery',       (SELECT public.dashboard_mastery(30, 5)),
    'milestones',    (SELECT public.dashboard_mastery_milestones(60, 5, 80)),
    'classrooms',    (SELECT public.dashboard_classrooms(30)),
    'yesterday_count', (
        SELECT count(*) FROM public.analytics_events
        WHERE occurred_at >= date_trunc('day', now() - interval '1 day')
          AND occurred_at <  date_trunc('day', now())
    ),
    'last7_avg_count', (
        SELECT round(count(*) / 7.0, 0)::int
        FROM public.analytics_events
        WHERE occurred_at >= date_trunc('day', now() - interval '8 days')
          AND occurred_at <  date_trunc('day', now() - interval '1 day')
    )
);
$function$;

-- 3. Restore dashboard_anomaly_check exactly as read from production on
--    2026-09-07 (pre-WP2B.6; still counts the retired session_started event).
--    One character differs from production: the dash in the csp_violation
--    message is a colon here (repo copy rule). Behaviour is identical.
CREATE OR REPLACE FUNCTION public.dashboard_anomaly_check()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
WITH window15 AS (
    SELECT * FROM public.analytics_events
    WHERE occurred_at > now() - interval '15 minutes'
), counts AS (
    SELECT
        count(distinct device_id) filter (where event_name = 'tracker_init_failed') AS init_fail_devices,
        count(distinct device_id) filter (where event_name = 'camera_denied')        AS cam_denied_devices,
        count(distinct device_id) filter (where event_name = 'csp_violation')        AS csp_devices,
        count(*)                   filter (where event_name = 'system_error')         AS sys_err,
        count(*)                   filter (where event_name = 'tracker_init_succeeded') AS init_ok,
        count(*)                   filter (where event_name = 'camera_denied')        AS cam_denied_raw,
        count(*)                   filter (where event_name = 'camera_retry_failed')  AS cam_retry_failed_raw,
        count(distinct session_id) filter (where event_name = 'session_started')      AS new_sessions
    FROM window15
), checks AS (
    SELECT * FROM (VALUES
        ('tracker_init_failed_devices', (SELECT init_fail_devices FROM counts)::int, 5,
         'tracker_init_failed seen on N distinct devices in last 15 min'),
        ('camera_denied_devices',       (SELECT cam_denied_devices FROM counts)::int, 10,
         'camera_denied (first-time per session) on N distinct devices'),
        ('csp_violation_devices',       (SELECT csp_devices FROM counts)::int, 10,
         'csp_violation on N distinct devices: something is being blocked'),
        ('system_error',                (SELECT sys_err FROM counts)::int, 3,
         'uncaught system_error events in last 15 min')
    ) AS t(metric, observed, threshold, message)
)
SELECT jsonb_build_object(
    'as_of', now(),
    'breaches', coalesce(jsonb_agg(
        jsonb_build_object(
            'metric', metric,
            'observed', observed,
            'threshold', threshold,
            'message', message
        )
    ) FILTER (WHERE observed >= threshold), '[]'::jsonb),
    'window_summary', (SELECT to_jsonb(c) FROM counts c)
) FROM checks;
$function$;

-- 4. Drop the new functions and index.
drop function if exists public.canary_status();
drop function if exists app_private.run_ingest_canary();

-- 5. Remove synthetic rows (no real data: fixed canary session id).
delete from public.analytics_events
 where event_name = 'ingest_canary'
   and session_id = 'c0a7a7a7-0000-4000-8000-000000000001';

drop index if exists public.analytics_events_ingest_canary_idx;

-- 6. Re-create the retired job ONLY for strict reversibility. It will fail
--    nightly again because no materialized view exists. Leave this block
--    commented out unless the founder explicitly wants the job back.
-- select cron.schedule('refresh-materialized-views', '0 3 * * *', $job$
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_teacher_session_stats;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_activity_performance;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_engagement_metrics;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_school_overview;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_growth_metrics;
-- $job$);

-- 7. Better Stack: pause or delete the "Supabase health — ingest canary"
--    monitor by hand, otherwise it alerts on the now-missing RPC (404).
