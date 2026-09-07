-- ═══════════════════════════════════════════════════════════════════════════
-- 20260914000006_wp2b6_observability_canary.sql
-- WP2B.6 (DIA-029, DIA-031): synthetic ingest canary, not a silence alarm.
--
-- STATUS: NOT APPLIED. Rehearse on staging, then founder go, then apply.
-- Rollback: supabase/migrations/rollbacks/20260914000006_wp2b6_observability_canary_rollback.sql
-- Evidence: docs/audits/evidence/release/WP2B.6/README.md
--
-- Verified against production (read-only, 2026-09-07) before writing this:
--   * analytics_events has first-class traffic_type / environment columns and
--     the BEFORE INSERT trigger trg_analytics_events_promote_meta copies
--     meta.traffic_type into the column. The client RPC
--     public.ingest_analytics_events(jsonb) does not accept traffic_type
--     directly; it arrives via meta, exactly as the browser sends it.
--   * dashboard_executive_summary and dashboard_funnel exclude
--     traffic_type IN ('internal','qa','bot'). A row with traffic_type =
--     'internal' therefore never reaches product or pilot headline numbers.
--   * cron.job 'refresh-materialized-views' has failed every night for the
--     whole retained history: "v_teacher_session_stats is not a table or
--     materialized view". pg_matviews is EMPTY on production; all five names
--     in the job are plain views. There is nothing left to refresh.
--   * dashboard_anomaly_check counts distinct sessions with a
--     'session_started' event. Zero such rows exist in the last 90 days;
--     the event is retired. The dashboards define a session as a distinct
--     session_id with at least one non-noise event.
--
-- What this migration does (all reversible):
--   1. Canary writer app_private.run_ingest_canary(), scheduled every 15
--      minutes, which calls the SAME RPC the browser calls.
--   2. public.canary_status() -> {healthy, age_seconds}; anon-executable so
--      the existing Better Stack anon-key monitor pattern can poll it.
--   3. dashboard_daily_digest gains genuine_sessions_24h (a notification,
--      never an alarm) and an ingest_canary block; its raw event counts now
--      exclude internal/qa/bot so the canary cannot inflate them.
--   4. Unschedules 'refresh-materialized-views'.
--   5. dashboard_anomaly_check: new_sessions uses the dashboard semantics.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Canary writer ─────────────────────────────────────────────────────

-- Fast lookup of the newest canary row; the monitor polls every 60 s.
-- Partial index: only canary rows, so it stays a few KB.
create index if not exists analytics_events_ingest_canary_idx
  on public.analytics_events (occurred_at desc)
  where event_name = 'ingest_canary';

comment on index public.analytics_events_ingest_canary_idx is
  'WP2B.6: serves public.canary_status(); partial on event_name = ingest_canary.';

create or replace function app_private.run_ingest_canary()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
set statement_timeout = '10s'
as $$
declare
  inserted integer;
  -- Fixed, obviously synthetic session id. Never collides with a browser
  -- session (those are random v4 uuids).
  canary_session constant uuid := 'c0a7a7a7-0000-4000-8000-000000000001';
  payload jsonb;
begin
  -- Shape mirrors src/lib/analytics.ts buildRow(): traffic_type and
  -- environment travel inside meta and are promoted to columns by the
  -- existing trigger. device_id is NULL on purpose so the un-filtered
  -- public-proof counters (distinct devices) cannot see it either.
  payload := jsonb_build_array(jsonb_build_object(
    'session_id',   canary_session,
    'device_id',    null,
    'occurred_at',  now(),
    'event_name',   'ingest_canary',
    'page',         '/internal/canary',
    'component',    'pg_cron',
    'context',      'canary',
    'build_version','canary',
    'meta',         jsonb_build_object(
                      'traffic_type', 'internal',
                      'environment',  'production',
                      'canary',       true,
                      'source',       'app_private.run_ingest_canary'),
    'event_uid',    gen_random_uuid(),
    'client_seq',   floor(extract(epoch from now()))::bigint,
    'client_ts',    now()
  ));

  -- Same entry point as the browser flush (src/lib/analytics.ts callRpc
  -- 'ingest_analytics_events'). If the RPC is broken the exception surfaces
  -- in cron.job_run_details and the monitor goes unhealthy within 45 min.
  inserted := public.ingest_analytics_events(payload);
  if inserted <> 1 then
    raise exception 'ingest canary: expected 1 row inserted, got %', inserted;
  end if;

  -- Keep the canary footprint small: 96 rows/day, retain 7 days.
  delete from public.analytics_events
   where event_name = 'ingest_canary'
     and occurred_at < now() - interval '7 days';

  return inserted;
end;
$$;

revoke all on function app_private.run_ingest_canary() from public, anon, authenticated;

comment on function app_private.run_ingest_canary() is
  'WP2B.6 synthetic ingest canary. Inserts one traffic_type=internal event through public.ingest_analytics_events every 15 min; prunes canary rows older than 7 days.';

-- ─── 2. Narrow status function for the uptime monitor ─────────────────────

create or replace function public.canary_status()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
set statement_timeout = '5s'
as $$
  with newest as (
    select max(occurred_at) as ts
      from public.analytics_events
     where event_name = 'ingest_canary'
  )
  select jsonb_build_object(
    'healthy',
      coalesce(ts > now() - interval '45 minutes', false),
    'age_seconds',
      case when ts is null then null
           else floor(extract(epoch from (now() - ts)))::int end
  )
  from newest;
$$;

-- Deliberately anon-executable: returns two scalars, no event data, and
-- follows the same pattern as the dashboard_public_proof monitor.
revoke all on function public.canary_status() from public;
grant execute on function public.canary_status() to anon, authenticated, service_role;

comment on function public.canary_status() is
  'WP2B.6: {healthy, age_seconds} for the ingest canary. healthy = newest ingest_canary row younger than 45 min (3 missed 15-min runs). Polled by Better Stack with the anon key.';

-- ─── 3. Daily digest: genuine sessions notification + canary block ────────
-- Replaces the definition read from production on 2026-09-07 (kept verbatim
-- in the rollback file). Existing keys are unchanged except yesterday_count
-- and last7_avg_count, which now exclude internal/qa/bot rows so the canary
-- (96 rows/day) cannot swamp a 3 to 13 session day.

create or replace function public.dashboard_daily_digest()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with
  noise as (
    select unnest(array[
      'session_heartbeat', 'tracker_quality_sample',
      'tab_hidden', 'tab_visible', 'csp_violation'
    ]) as event_name
  ),
  genuine as (
    -- Same definition as dashboard_executive_summary.sessions_started:
    -- distinct session_id with at least one non-noise event, internal/qa/bot
    -- excluded, NULL (legacy) and demo kept.
    select count(distinct e.session_id) as n
      from public.analytics_events e
     where e.occurred_at > now() - interval '24 hours'
       and (e.traffic_type is null or e.traffic_type not in ('internal', 'qa', 'bot'))
       and e.event_name not in (select event_name from noise)
  ),
  canary as (
    select public.canary_status() as s
  )
select jsonb_build_object(
    'as_of', now(),
    'today',         (select public.dashboard_today()),
    'funnel_24h',    (select public.dashboard_funnel(1)),
    'funnel_7d',     (select public.dashboard_funnel(7)),
    'tracker_7d',    (select public.dashboard_tracker_health(7)),
    'top_modes_7d',  (select public.dashboard_top_modes(7)),
    'errors',        (select public.dashboard_errors(20)),
    'cohort',        (select public.dashboard_cohort_retention(8)),
    'mastery',       (select public.dashboard_mastery(30, 5)),
    'milestones',    (select public.dashboard_mastery_milestones(60, 5, 80)),
    'classrooms',    (select public.dashboard_classrooms(30)),
    'yesterday_count', (
        select count(*) from public.analytics_events
        where occurred_at >= date_trunc('day', now() - interval '1 day')
          and occurred_at <  date_trunc('day', now())
          and (traffic_type is null or traffic_type not in ('internal', 'qa', 'bot'))
    ),
    'last7_avg_count', (
        select round(count(*) / 7.0, 0)::int
        from public.analytics_events
        where occurred_at >= date_trunc('day', now() - interval '8 days')
          and occurred_at <  date_trunc('day', now() - interval '1 day')
          and (traffic_type is null or traffic_type not in ('internal', 'qa', 'bot'))
    ),
    -- WP2B.6: low-traffic NOTIFICATION. Zero genuine sessions on a quiet
    -- day is normal at current volume and is reported, not paged.
    'genuine_sessions_24h', (select n from genuine),
    'genuine_sessions_note',
      case when (select n from genuine) = 0
           then 'No genuine sessions in the last 24 hours. This is expected on quiet days; the ingest canary below says whether the pipeline itself is alive.'
           else null end,
    -- Pipeline liveness comes from the canary, never from user volume.
    'ingest_canary', (select s from canary),
    'semantics', jsonb_build_object(
      'genuine_sessions_24h', 'distinct session_id with at least one non-noise event in the rolling 24 h; internal/qa/bot excluded (same as dashboard_executive_summary.sessions_started)',
      'yesterday_count', 'raw events, internal/qa/bot excluded (WP2B.6: previously unfiltered)',
      'ingest_canary', 'public.canary_status(): healthy when the newest synthetic ingest_canary row is younger than 45 min'
    )
);
$$;

-- ─── 4. Retire the dead materialized-view refresh job ─────────────────────
-- Justification: pg_matviews is empty on production (verified 2026-09-07).
-- v_teacher_session_stats, v_activity_performance, v_engagement_metrics,
-- v_school_overview and v_growth_metrics are all plain views, which are
-- always current and cannot be refreshed. The job has failed on 100% of
-- runs in the retained history (14/14 in the 14-day window read on
-- 2026-09-07; the audit saw 30/30). Fixing the statement is impossible
-- because there is no matview to name; unscheduling removes a nightly
-- guaranteed failure that masks real ones in cron.job_run_details.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'refresh-materialized-views') then
    perform cron.unschedule('refresh-materialized-views');
  end if;
end $$;

-- ─── 5. Anomaly check: retired session_started event ──────────────────────
-- Only new_sessions changes. The four breach metrics keep their raw
-- (unfiltered) semantics: internal reproductions of tracker failures or CSP
-- blocks are still worth an email. The canary event name matches none of
-- them, so it cannot trigger a breach.

create or replace function public.dashboard_anomaly_check()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with window15 as (
    select * from public.analytics_events
    where occurred_at > now() - interval '15 minutes'
), counts as (
    select
        count(distinct device_id) filter (where event_name = 'tracker_init_failed') as init_fail_devices,
        count(distinct device_id) filter (where event_name = 'camera_denied')        as cam_denied_devices,
        count(distinct device_id) filter (where event_name = 'csp_violation')        as csp_devices,
        count(*)                   filter (where event_name = 'system_error')         as sys_err,
        count(*)                   filter (where event_name = 'tracker_init_succeeded') as init_ok,
        count(*)                   filter (where event_name = 'camera_denied')        as cam_denied_raw,
        count(*)                   filter (where event_name = 'camera_retry_failed')  as cam_retry_failed_raw,
        -- WP2B.6: the session_started event is retired. A session is a
        -- distinct session_id with at least one non-noise event, internal/
        -- qa/bot excluded, matching dashboard_executive_summary and
        -- dashboard_funnel.
        count(distinct session_id) filter (
            where (traffic_type is null or traffic_type not in ('internal', 'qa', 'bot'))
              and event_name not in (
                'session_heartbeat', 'tracker_quality_sample',
                'tab_hidden', 'tab_visible', 'csp_violation'
              )
        ) as new_sessions
    from window15
), checks as (
    select * from (values
        ('tracker_init_failed_devices', (select init_fail_devices from counts)::int, 5,
         'tracker_init_failed seen on N distinct devices in last 15 min'),
        ('camera_denied_devices',       (select cam_denied_devices from counts)::int, 10,
         'camera_denied (first-time per session) on N distinct devices'),
        ('csp_violation_devices',       (select csp_devices from counts)::int, 10,
         'csp_violation on N distinct devices: something is being blocked'),
        ('system_error',                (select sys_err from counts)::int, 3,
         'uncaught system_error events in last 15 min')
    ) as t(metric, observed, threshold, message)
)
select jsonb_build_object(
    'as_of', now(),
    'breaches', coalesce(jsonb_agg(
        jsonb_build_object(
            'metric', metric,
            'observed', observed,
            'threshold', threshold,
            'message', message
        )
    ) filter (where observed >= threshold), '[]'::jsonb),
    'window_summary', (select to_jsonb(c) from counts c),
    'semantics', jsonb_build_object(
        'new_sessions', 'distinct sessions with at least one non-noise event in the last 15 min, internal/qa/bot excluded (WP2B.6; replaces the retired session_started event)'
    )
) from checks;
$$;

-- ─── 6. Schedule the canary ───────────────────────────────────────────────
-- Offset 3 minutes from the :00/:15/:30/:45 jobs (anomaly check, email
-- dispatch) and from billing-health (:07). Every 15 min; the status function
-- tolerates two missed runs before reporting unhealthy.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ingest-canary-15m') then
    perform cron.unschedule('ingest-canary-15m');
  end if;
  perform cron.schedule('ingest-canary-15m', '3-59/15 * * * *',
                        'select app_private.run_ingest_canary()');
end $$;
