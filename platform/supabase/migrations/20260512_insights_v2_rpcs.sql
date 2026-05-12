-- Insights v2 — new RPCs that power the investor-grade dashboard
-- See: src/pages/admin/insights/* for the consumers.
--
-- Migration was applied live to production; this commit pins it.

CREATE OR REPLACE FUNCTION public.dashboard_executive_summary(in_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
WITH
  curr_range AS (SELECT now() - make_interval(days => in_days) AS lo, now() AS hi),
  prev_range AS (SELECT now() - make_interval(days => in_days * 2) AS lo, now() - make_interval(days => in_days) AS hi),
  curr AS (
    SELECT e.* FROM public.analytics_events e, curr_range r
    WHERE e.occurred_at >= r.lo AND e.occurred_at < r.hi
  ),
  prev AS (
    SELECT e.* FROM public.analytics_events e, prev_range r
    WHERE e.occurred_at >= r.lo AND e.occurred_at < r.hi
  ),
  curr_metrics AS (
    SELECT
      count(distinct session_id) AS sessions_started,
      count(distinct device_id)  AS distinct_devices,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_completed') AS sessions_completed,
      count(*) FILTER (WHERE event_name = 'mode_completed') AS mode_completions,
      count(*) FILTER (WHERE event_name = 'mode_started') AS mode_starts,
      count(*) FILTER (WHERE event_name = 'camera_granted') AS cam_granted,
      count(*) FILTER (WHERE event_name = 'camera_denied') AS cam_denied,
      count(*) FILTER (WHERE event_name = 'tracker_init_succeeded') AS tracker_ok,
      count(*) FILTER (WHERE event_name = 'tracker_init_failed') AS tracker_fail,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY dur_s)
         FROM (
           SELECT extract(epoch FROM (max(occurred_at)-min(occurred_at))) AS dur_s
           FROM curr GROUP BY session_id
           HAVING extract(epoch FROM (max(occurred_at)-min(occurred_at))) > 0
         ) s) AS median_session_s
    FROM curr
  ),
  prev_metrics AS (
    SELECT
      count(distinct session_id) AS sessions_started,
      count(distinct device_id) AS distinct_devices,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_completed') AS sessions_completed,
      count(*) FILTER (WHERE event_name = 'mode_completed') AS mode_completions,
      count(*) FILTER (WHERE event_name = 'camera_granted') AS cam_granted,
      count(*) FILTER (WHERE event_name = 'camera_denied') AS cam_denied,
      count(*) FILTER (WHERE event_name = 'tracker_init_succeeded') AS tracker_ok,
      count(*) FILTER (WHERE event_name = 'tracker_init_failed') AS tracker_fail,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY dur_s)
         FROM (
           SELECT extract(epoch FROM (max(occurred_at)-min(occurred_at))) AS dur_s
           FROM prev GROUP BY session_id
           HAVING extract(epoch FROM (max(occurred_at)-min(occurred_at))) > 0
         ) s) AS median_session_s
    FROM prev
  ),
  spark AS (
    SELECT date_trunc('day', occurred_at) AS day,
           count(distinct session_id) AS sessions
    FROM public.analytics_events
    WHERE occurred_at > now() - interval '14 days'
    GROUP BY 1 ORDER BY 1
  ),
  spark_array AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('day', day, 'n', sessions) ORDER BY day), '[]'::jsonb) AS arr
    FROM spark
  )
SELECT jsonb_build_object(
  'days', in_days,
  'as_of', now(),
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

CREATE OR REPLACE FUNCTION public.dashboard_ab_results(in_flag text DEFAULT 'camera_explainer_v1')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
WITH exposures AS (
    SELECT DISTINCT session_id, meta->>'variant' AS variant
    FROM public.analytics_events
    WHERE event_name = 'feature_flag_exposed' AND meta->>'flag_name' = in_flag
      AND occurred_at > now() - interval '30 days'
), funnel AS (
    SELECT e.variant,
        count(*) AS exposed_sessions,
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.analytics_events x WHERE x.session_id = e.session_id AND x.event_name = 'camera_granted')) AS granted,
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.analytics_events x WHERE x.session_id = e.session_id AND x.event_name IN ('camera_granted','camera_denied'))) AS requested,
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.analytics_events x WHERE x.session_id = e.session_id AND x.event_name = 'mode_completed')) AS reached_completion
    FROM exposures e GROUP BY e.variant
), with_rates AS (
    SELECT *,
        CASE WHEN requested > 0 THEN granted::numeric / requested::numeric ELSE NULL END AS grant_rate,
        CASE WHEN exposed_sessions > 0 THEN reached_completion::numeric / exposed_sessions::numeric ELSE NULL END AS complete_rate
    FROM funnel
), c AS (SELECT * FROM with_rates WHERE variant = 'control' LIMIT 1),
   t AS (SELECT * FROM with_rates WHERE variant = 'treatment' LIMIT 1),
   z AS (
    SELECT CASE
        WHEN c.requested IS NULL OR t.requested IS NULL OR c.requested = 0 OR t.requested = 0 THEN NULL
        ELSE (
            (t.grant_rate - c.grant_rate) /
            NULLIF(
                sqrt(
                    (((t.granted + c.granted)::numeric / (t.requested + c.requested)::numeric)
                     * (1 - ((t.granted + c.granted)::numeric / (t.requested + c.requested)::numeric)))
                    * ((1.0/NULLIF(t.requested,0)::numeric) + (1.0/NULLIF(c.requested,0)::numeric))
                ), 0
            )
        )
    END AS z_score
    FROM c, t
)
SELECT jsonb_build_object(
    'flag', in_flag, 'as_of', now(),
    'control', (SELECT to_jsonb(c) FROM c),
    'treatment', (SELECT to_jsonb(t) FROM t),
    'lift_pp', CASE WHEN c.grant_rate IS NOT NULL AND t.grant_rate IS NOT NULL
                    THEN round((t.grant_rate - c.grant_rate)::numeric * 100, 2) ELSE NULL END,
    'z_score', round(coalesce((SELECT z_score FROM z), 0)::numeric, 2),
    'verdict', CASE
                  WHEN c.requested IS NULL OR t.requested IS NULL OR c.requested < 30 OR t.requested < 30 THEN 'sample too small'
                  WHEN abs(coalesce((SELECT z_score FROM z), 0)) > 1.96 AND t.grant_rate > c.grant_rate THEN 'treatment winning'
                  WHEN abs(coalesce((SELECT z_score FROM z), 0)) > 1.96 AND t.grant_rate < c.grant_rate THEN 'control winning'
                  ELSE 'inconclusive'
               END
) FROM c, t;
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_cohort_curves(in_weeks integer DEFAULT 6)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
WITH first_seen AS (
    SELECT device_id, min(occurred_at) AS first_at
    FROM public.analytics_events
    WHERE device_id IS NOT NULL AND occurred_at > now() - make_interval(weeks => in_weeks + 3)
    GROUP BY device_id
), cohorts AS (
    SELECT device_id, date_trunc('week', first_at) AS cohort_week, first_at
    FROM first_seen WHERE first_at > now() - make_interval(weeks => in_weeks)
), days AS (SELECT generate_series(0, 14) AS d),
   points AS (
    SELECT c.cohort_week, d.d,
        count(distinct c.device_id) AS cohort_size,
        count(distinct CASE
            WHEN EXISTS (
                SELECT 1 FROM public.analytics_events e
                WHERE e.device_id = c.device_id
                  AND e.occurred_at >= c.first_at + make_interval(days => d.d)
                  AND e.occurred_at <  c.first_at + make_interval(days => d.d + 1)
            ) THEN c.device_id END) AS returned
    FROM cohorts c CROSS JOIN days d
    GROUP BY c.cohort_week, d.d
), pct AS (
    SELECT cohort_week, d,
        CASE WHEN cohort_size > 0 THEN round(100.0 * returned / cohort_size, 1) ELSE NULL END AS return_pct,
        max(cohort_size) OVER (PARTITION BY cohort_week) AS cohort_size
    FROM points
), agg AS (
    SELECT cohort_week, cohort_size,
        jsonb_agg(jsonb_build_object('d', d, 'pct', return_pct) ORDER BY d) AS curve
    FROM pct GROUP BY cohort_week, cohort_size
)
SELECT jsonb_build_object(
    'weeks', in_weeks, 'as_of', now(),
    'cohorts', coalesce(jsonb_agg(
        jsonb_build_object('cohort_week', cohort_week, 'size', cohort_size, 'curve', curve)
        ORDER BY cohort_week DESC
    ), '[]'::jsonb)
) FROM agg;
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_live()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
WITH active AS (
    SELECT session_id,
        max(game_mode) FILTER (WHERE game_mode IS NOT NULL) AS last_mode,
        max(occurred_at) AS last_event,
        max(device_type) AS device_type,
        max(age_band) AS age_band
    FROM public.analytics_events
    WHERE occurred_at > now() - interval '5 minutes'
    GROUP BY session_id
)
SELECT jsonb_build_object(
    'as_of', now(),
    'active_count', (SELECT count(*) FROM active),
    'by_mode', (SELECT coalesce(jsonb_object_agg(coalesce(last_mode, 'between'), n), '{}'::jsonb)
                  FROM (SELECT last_mode, count(*) AS n FROM active GROUP BY last_mode) t),
    'sessions', (SELECT coalesce(jsonb_agg(
        jsonb_build_object('session_id', session_id, 'last_mode', last_mode,
                           'device_type', device_type, 'age_band', age_band,
                           'last_event', last_event) ORDER BY last_event DESC
    ), '[]'::jsonb) FROM active)
);
$function$;
