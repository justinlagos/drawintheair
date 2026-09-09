-- ════════════════════════════════════════════════════════════════════
-- 20260703000001_dashboard_funnel_honesty.sql
--
-- Dashboard funnel honesty (2026-07-03 activation-funnel audit).
--
-- Two dishonesties in dashboard_executive_summary produced the
-- "24 sessions → 0 completions" reading:
--
--   1. sessions_started counted ANY session with ANY event — including
--      sessions whose only rows are session_heartbeat, csp_violation or
--      tab visibility flips, and including internal/QA/bot traffic.
--      That inflated the funnel denominator (top bar) while the real
--      child steps stayed small.
--
--   2. No traffic_type filter at all: founder/QA devices counted as
--      product usage. (Client-side stamping shipped in
--      20260626_analytics_traffic_type; this is the read-side half.)
--
-- Changes (read-path only, no data touched, fully reversible by
-- re-running the previous CREATE OR REPLACE from
-- platform/supabase/migrations/20260513_executive_summary_perf.sql):
--
--   • Exclude traffic_type in ('internal','qa','bot') everywhere.
--     NULL is kept: legacy clients predate stamping and are real users.
--     'demo' is kept: demo mode is a real prospect interacting.
--   • sessions_started requires at least one NON-noise event
--     (noise = session_heartbeat, tracker_quality_sample, tab_hidden,
--     tab_visible, csp_violation).
--   • Additive fields mode_start_sessions / completed_sessions-style
--     distinct counts so the funnel UI can show per-session steps
--     without mixing raw event counts and distinct-session counts
--     in one ladder (the "8 > 3" confusion).
--   • Sparkline gets the same filters so the trend matches the headline.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.dashboard_executive_summary(in_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 SET statement_timeout TO '30s'
AS $function$
WITH
  curr_range AS (SELECT now() - make_interval(days => in_days) AS lo, now() AS hi),
  prev_range AS (SELECT now() - make_interval(days => in_days * 2) AS lo, now() - make_interval(days => in_days) AS hi),

  -- Headline-eligible events: real (or pre-stamping legacy) traffic only.
  eligible AS (
    SELECT e.session_id, e.device_id, e.event_name, e.occurred_at
    FROM public.analytics_events e
    WHERE (e.traffic_type IS NULL OR e.traffic_type NOT IN ('internal', 'qa', 'bot'))
  ),

  -- Sessions that did something beyond background noise. Only these
  -- count toward sessions_started (the funnel denominator).
  noise AS (
    SELECT unnest(ARRAY[
      'session_heartbeat', 'tracker_quality_sample',
      'tab_hidden', 'tab_visible', 'csp_violation'
    ]) AS event_name
  ),

  curr AS (
    SELECT e.* FROM eligible e, curr_range r
    WHERE e.occurred_at >= r.lo AND e.occurred_at < r.hi
  ),
  prev AS (
    SELECT e.* FROM eligible e, prev_range r
    WHERE e.occurred_at >= r.lo AND e.occurred_at < r.hi
  ),

  curr_metrics AS (
    SELECT
      count(distinct session_id) FILTER (WHERE event_name NOT IN (SELECT event_name FROM noise)) AS sessions_started,
      count(distinct device_id)  FILTER (WHERE event_name NOT IN (SELECT event_name FROM noise)) AS distinct_devices,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_completed') AS sessions_completed,
      count(*) FILTER (WHERE event_name = 'mode_completed') AS mode_completions,
      count(*) FILTER (WHERE event_name = 'mode_started') AS mode_starts,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_started') AS mode_start_sessions,
      count(*) FILTER (WHERE event_name = 'camera_granted') AS cam_granted,
      count(*) FILTER (WHERE event_name = 'camera_denied') AS cam_denied,
      count(*) FILTER (WHERE event_name = 'tracker_init_succeeded') AS tracker_ok,
      count(*) FILTER (WHERE event_name = 'tracker_init_failed') AS tracker_fail,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY dur_s)
         FROM (
           SELECT extract(epoch FROM (max(occurred_at)-min(occurred_at))) AS dur_s
           FROM curr
           WHERE event_name NOT IN ('session_heartbeat', 'tab_hidden', 'tab_visible')
           GROUP BY session_id
           HAVING extract(epoch FROM (max(occurred_at)-min(occurred_at))) > 0
         ) s) AS median_session_s
    FROM curr
  ),
  prev_metrics AS (
    SELECT
      count(distinct session_id) FILTER (WHERE event_name NOT IN (SELECT event_name FROM noise)) AS sessions_started,
      count(distinct device_id)  FILTER (WHERE event_name NOT IN (SELECT event_name FROM noise)) AS distinct_devices,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_completed') AS sessions_completed,
      count(*) FILTER (WHERE event_name = 'mode_completed') AS mode_completions,
      count(*) FILTER (WHERE event_name = 'mode_started') AS mode_starts,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_started') AS mode_start_sessions,
      count(*) FILTER (WHERE event_name = 'camera_granted') AS cam_granted,
      count(*) FILTER (WHERE event_name = 'camera_denied') AS cam_denied,
      count(*) FILTER (WHERE event_name = 'tracker_init_succeeded') AS tracker_ok,
      count(*) FILTER (WHERE event_name = 'tracker_init_failed') AS tracker_fail,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY dur_s)
         FROM (
           SELECT extract(epoch FROM (max(occurred_at)-min(occurred_at))) AS dur_s
           FROM prev
           WHERE event_name NOT IN ('session_heartbeat', 'tab_hidden', 'tab_visible')
           GROUP BY session_id
           HAVING extract(epoch FROM (max(occurred_at)-min(occurred_at))) > 0
         ) s) AS median_session_s
    FROM prev
  ),
  spark AS (
    SELECT date_trunc('day', occurred_at) AS day,
           count(distinct session_id) AS sessions
    FROM eligible
    WHERE occurred_at > now() - interval '14 days'
      AND event_name NOT IN (SELECT event_name FROM noise)
    GROUP BY 1 ORDER BY 1
  ),
  spark_array AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('day', day, 'n', sessions) ORDER BY day), '[]'::jsonb) AS arr
    FROM spark
  )
SELECT jsonb_build_object(
  'days', in_days,
  'as_of', now(),
  'semantics', jsonb_build_object(
    'traffic_filter', 'internal/qa/bot excluded; NULL (pre-stamping legacy clients) and demo kept',
    'sessions_started', 'distinct session_id with at least one NON-noise event in a ROLLING window ending now(); noise = heartbeat/tracker_quality_sample/tab_*/csp_violation',
    'sparkline_sessions_14d', 'same filters as sessions_started, per CALENDAR day (UTC); may not sum to the rolling-window headline',
    'median_session_s', 'median active span per session; session_heartbeat/tab_hidden/tab_visible excluded',
    'mode_completions', 'mode_completed EVENTS (pre-writing emits one per traced path, not one per mode run)',
    'mode_start_sessions', 'distinct sessions with a mode_started — use this for per-session funnel steps, mode_starts is raw event count'
  ),
  'sparkline_sessions_14d', (SELECT arr FROM spark_array),
  'current', (SELECT to_jsonb(c) FROM curr_metrics c),
  'previous', (SELECT to_jsonb(p) FROM prev_metrics p),
  'deltas', jsonb_build_object(
    'sessions_started_pct', CASE WHEN (SELECT sessions_started FROM prev_metrics) > 0
                                 THEN round(100.0 * ((SELECT sessions_started FROM curr_metrics) - (SELECT sessions_started FROM prev_metrics))::numeric
                                            / (SELECT sessions_started FROM prev_metrics)::numeric, 1) ELSE NULL END,
    'distinct_devices_pct', CASE WHEN (SELECT distinct_devices FROM prev_metrics) > 0
                                 THEN round(100.0 * ((SELECT distinct_devices FROM curr_metrics) - (SELECT distinct_devices FROM prev_metrics))::numeric
                                            / (SELECT distinct_devices FROM prev_metrics)::numeric, 1) ELSE NULL END,
    'mode_completions_pct', CASE WHEN (SELECT mode_completions FROM prev_metrics) > 0
                                 THEN round(100.0 * ((SELECT mode_completions FROM curr_metrics) - (SELECT mode_completions FROM prev_metrics))::numeric
                                            / (SELECT mode_completions FROM prev_metrics)::numeric, 1) ELSE NULL END,
    'median_session_s_delta_s', CASE WHEN (SELECT median_session_s FROM prev_metrics) IS NOT NULL
                                          AND (SELECT median_session_s FROM curr_metrics) IS NOT NULL
                                     THEN round(((SELECT median_session_s FROM curr_metrics) - (SELECT median_session_s FROM prev_metrics))::numeric, 0) ELSE NULL END,
    'cam_grant_rate_curr_pct', CASE WHEN ((SELECT cam_granted FROM curr_metrics) + (SELECT cam_denied FROM curr_metrics)) > 0
                                    THEN round(100.0 * (SELECT cam_granted FROM curr_metrics)::numeric
                                               / ((SELECT cam_granted FROM curr_metrics) + (SELECT cam_denied FROM curr_metrics))::numeric, 1) ELSE NULL END,
    'cam_grant_rate_prev_pct', CASE WHEN ((SELECT cam_granted FROM prev_metrics) + (SELECT cam_denied FROM prev_metrics)) > 0
                                    THEN round(100.0 * (SELECT cam_granted FROM prev_metrics)::numeric
                                               / ((SELECT cam_granted FROM prev_metrics) + (SELECT cam_denied FROM prev_metrics))::numeric, 1) ELSE NULL END,
    'tracker_success_curr_pct', CASE WHEN ((SELECT tracker_ok FROM curr_metrics) + (SELECT tracker_fail FROM curr_metrics)) > 0
                                     THEN round(100.0 * (SELECT tracker_ok FROM curr_metrics)::numeric
                                                / ((SELECT tracker_ok FROM curr_metrics) + (SELECT tracker_fail FROM curr_metrics))::numeric, 1) ELSE NULL END,
    'completion_rate_curr_pct', CASE WHEN (SELECT sessions_started FROM curr_metrics) > 0
                                     THEN round(100.0 * (SELECT sessions_completed FROM curr_metrics)::numeric
                                                / (SELECT sessions_started FROM curr_metrics)::numeric, 1) ELSE NULL END,
    'completion_rate_prev_pct', CASE WHEN (SELECT sessions_started FROM prev_metrics) > 0
                                     THEN round(100.0 * (SELECT sessions_completed FROM prev_metrics)::numeric
                                                / (SELECT sessions_started FROM prev_metrics)::numeric, 1) ELSE NULL END
  )
);
$function$;
