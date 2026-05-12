-- Insights v2.1 — deeper RPCs for Engagement / Learning / Retention.
-- Powers the v2.1 dashboard rebuild (real logo, dedicated print report,
-- 10x'd retention, expanded engagement, restructured mastery).
-- Already applied to production database; this commit pins.

CREATE OR REPLACE FUNCTION public.dashboard_engagement_deep(in_days integer DEFAULT 7)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
WITH win AS (
    SELECT * FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days) AND game_mode IS NOT NULL
), per_session AS (
    SELECT game_mode, session_id,
        bool_or(event_name = 'mode_started') AS did_start,
        bool_or(event_name = 'mode_completed') AS did_complete,
        bool_or(event_name = 'mode_abandoned') AS did_abandon,
        bool_or(event_name = 'stuck_detected') AS did_stuck,
        extract(epoch from (max(occurred_at) - min(occurred_at))) AS dur_s
    FROM win GROUP BY game_mode, session_id
), per_mode AS (
    SELECT game_mode,
        count(*) FILTER (WHERE did_start) AS started,
        count(*) FILTER (WHERE did_complete AND did_start) AS completed,
        count(*) FILTER (WHERE did_abandon AND did_start) AS abandoned,
        count(*) FILTER (WHERE did_stuck AND did_start) AS stuck,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY dur_s) FILTER (WHERE did_start AND dur_s > 0) AS median_s,
        percentile_cont(0.9) WITHIN GROUP (ORDER BY dur_s) FILTER (WHERE did_start AND dur_s > 0) AS p90_s,
        count(DISTINCT session_id) FILTER (WHERE did_start) AS distinct_starters,
        (game_mode IN ('free')) AS is_open_ended
    FROM per_session GROUP BY game_mode
), daily AS (
    SELECT game_mode, date_trunc('day', occurred_at)::date AS day, count(distinct session_id) AS sessions
    FROM win WHERE event_name = 'mode_started' GROUP BY game_mode, day
), daily_array AS (
    SELECT game_mode, jsonb_agg(jsonb_build_object('day', day, 'n', sessions) ORDER BY day) AS trend
    FROM daily GROUP BY game_mode
)
SELECT jsonb_build_object(
    'days', in_days, 'as_of', now(),
    'modes', coalesce(jsonb_agg(jsonb_build_object(
        'game_mode', m.game_mode, 'started', m.started, 'completed', m.completed,
        'abandoned', m.abandoned, 'stuck', m.stuck,
        'median_seconds', round(coalesce(m.median_s, 0)::numeric, 0),
        'p90_seconds', round(coalesce(m.p90_s, 0)::numeric, 0),
        'distinct_devices', m.distinct_starters, 'is_open_ended', m.is_open_ended,
        'completion_rate_pct', CASE WHEN m.is_open_ended THEN NULL
                                    WHEN m.started > 0 THEN round(100.0 * m.completed / m.started, 1) ELSE NULL END,
        'stuck_rate_pct',   CASE WHEN m.started > 0 THEN round(100.0 * m.stuck / m.started, 1) ELSE 0 END,
        'abandon_rate_pct', CASE WHEN m.started > 0 THEN round(100.0 * m.abandoned / m.started, 1) ELSE 0 END,
        'daily', coalesce(d.trend, '[]'::jsonb)
    ) ORDER BY m.started DESC), '[]'::jsonb)
) FROM per_mode m LEFT JOIN daily_array d USING (game_mode);
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_mastery_summary(in_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
WITH per_device_item AS (
    SELECT game_mode, item_key, device_id,
        count(*) AS attempts,
        avg(CASE WHEN was_correct THEN 1 ELSE 0 END)::numeric * 100 AS acc_pct
    FROM public.learning_attempts
    WHERE occurred_at > now() - make_interval(days => in_days)
    GROUP BY game_mode, item_key, device_id
), classified AS (
    SELECT game_mode, item_key, device_id, attempts, acc_pct,
        CASE WHEN attempts >= 5 AND acc_pct >= 80 THEN 'strong'
             WHEN attempts >= 3 AND acc_pct >= 50 THEN 'practising'
             ELSE 'new' END AS bucket
    FROM per_device_item
), per_item AS (
    SELECT game_mode, item_key,
        count(*) FILTER (WHERE bucket = 'strong') AS strong,
        count(*) FILTER (WHERE bucket = 'practising') AS practising,
        count(*) FILTER (WHERE bucket = 'new') AS new_,
        count(*) AS total_devices,
        round(avg(acc_pct)::numeric, 1) AS mean_acc_pct,
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY acc_pct)::numeric, 1) AS median_acc_pct,
        round(avg(attempts)::numeric, 1) AS mean_attempts
    FROM classified GROUP BY game_mode, item_key
), totals AS (
    SELECT count(*) FILTER (WHERE strong > 0) AS items_with_mastery,
        sum(strong)::int AS total_strong, sum(practising)::int AS total_practising,
        sum(new_)::int AS total_new,
        count(DISTINCT (game_mode, item_key))::int AS distinct_items,
        count(DISTINCT game_mode)::int AS distinct_modes
    FROM per_item
)
SELECT jsonb_build_object(
    'days', in_days, 'as_of', now(),
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'items', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key,
        'strong', strong, 'practising', practising, 'new', new_,
        'total_devices', total_devices, 'mean_acc_pct', mean_acc_pct,
        'median_acc_pct', median_acc_pct, 'mean_attempts', mean_attempts
    ) ORDER BY total_devices DESC, mean_acc_pct DESC) FROM per_item), '[]'::jsonb),
    'struggling', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key,
        'total_devices', total_devices, 'median_acc_pct', median_acc_pct,
        'mean_attempts', mean_attempts
    ) ORDER BY median_acc_pct ASC, total_devices DESC) FROM per_item
       WHERE median_acc_pct < 60 AND total_devices >= 3 LIMIT 12), '[]'::jsonb),
    'top_strong', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key, 'strong', strong,
        'total_devices', total_devices, 'mean_acc_pct', mean_acc_pct
    ) ORDER BY strong DESC, mean_acc_pct DESC) FROM per_item
       WHERE strong >= 1 LIMIT 12), '[]'::jsonb)
);
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_retention_deep()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
WITH device_first AS (
    SELECT device_id, min(occurred_at) AS first_at
    FROM public.analytics_events WHERE device_id IS NOT NULL GROUP BY device_id
), daily AS (
    SELECT date_trunc('day', e.occurred_at)::date AS day, e.device_id,
        date_trunc('day', df.first_at)::date AS first_day
    FROM public.analytics_events e JOIN device_first df USING (device_id)
    WHERE e.occurred_at > now() - interval '30 days' AND e.device_id IS NOT NULL
    GROUP BY day, e.device_id, df.first_at
), per_day AS (
    SELECT day, count(DISTINCT device_id) AS active,
        count(DISTINCT device_id) FILTER (WHERE day = first_day) AS new_devs,
        count(DISTINCT device_id) FILTER (WHERE day > first_day) AS returning_devs
    FROM daily GROUP BY day
), days_array AS (
    SELECT jsonb_agg(jsonb_build_object(
        'day', day, 'active', active, 'new_devices', new_devs, 'returning', returning_devs
    ) ORDER BY day) AS arr FROM per_day
), stickiness AS (
    SELECT
        (SELECT count(distinct device_id) FROM public.analytics_events WHERE occurred_at > now() - interval '1 day') AS dau,
        (SELECT count(distinct device_id) FROM public.analytics_events WHERE occurred_at > now() - interval '7 days') AS wau,
        (SELECT count(distinct device_id) FROM public.analytics_events WHERE occurred_at > now() - interval '30 days') AS mau
), returning_hooks AS (
    SELECT e.game_mode, count(distinct e.device_id) AS devices
    FROM public.analytics_events e JOIN device_first df USING (device_id)
    WHERE e.event_name = 'mode_started'
      AND e.occurred_at > df.first_at + interval '20 hours'
      AND e.occurred_at > now() - interval '30 days' AND e.game_mode IS NOT NULL
    GROUP BY e.game_mode
), cohorts AS (
    SELECT device_id, date_trunc('week', first_at)::date AS cohort_week
    FROM device_first WHERE first_at > now() - interval '8 weeks'
), cohort_sizes AS (
    SELECT cohort_week, count(*) AS cohort_size FROM cohorts GROUP BY cohort_week
), weeks AS (SELECT generate_series(0, 6) AS w),
matrix AS (
    SELECT c.cohort_week, w.w, cs.cohort_size,
        count(distinct CASE WHEN EXISTS (
            SELECT 1 FROM public.analytics_events e
            WHERE e.device_id = c.device_id
              AND date_trunc('week', e.occurred_at)::date = c.cohort_week + (w.w * 7)
        ) THEN c.device_id END) AS active
    FROM cohorts c CROSS JOIN weeks w
    JOIN cohort_sizes cs USING (cohort_week)
    GROUP BY c.cohort_week, w.w, cs.cohort_size
), heatmap AS (
    SELECT cohort_week, cohort_size,
        jsonb_agg(jsonb_build_object(
            'w', w,
            'pct', CASE WHEN cohort_size > 0 THEN round(100.0 * active / cohort_size, 1) ELSE NULL END,
            'active', active
        ) ORDER BY w) AS cells
    FROM matrix GROUP BY cohort_week, cohort_size
), heatmap_arr AS (
    SELECT jsonb_agg(jsonb_build_object(
        'cohort_week', cohort_week, 'cohort_size', cohort_size, 'cells', cells
    ) ORDER BY cohort_week DESC) AS arr FROM heatmap
)
SELECT jsonb_build_object(
    'as_of', now(),
    'daily', coalesce((SELECT arr FROM days_array), '[]'::jsonb),
    'dau', (SELECT dau FROM stickiness),
    'wau', (SELECT wau FROM stickiness),
    'mau', (SELECT mau FROM stickiness),
    'stickiness_dau_mau', CASE WHEN (SELECT mau FROM stickiness) > 0
                                THEN round(100.0 * (SELECT dau FROM stickiness)::numeric / (SELECT mau FROM stickiness)::numeric, 1)
                                ELSE 0 END,
    'returning_hooks', coalesce((SELECT jsonb_agg(jsonb_build_object('game_mode', game_mode, 'devices', devices) ORDER BY devices DESC) FROM returning_hooks), '[]'::jsonb),
    'cohort_heatmap', coalesce((SELECT arr FROM heatmap_arr), '[]'::jsonb)
);
$function$;
