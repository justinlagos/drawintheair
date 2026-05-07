-- ════════════════════════════════════════════════════════════════════
-- Gaps 4 / 5 / 6 — mastery thresholds, daily digest, anomaly check,
-- 12-month auto-prune, and digest-cron schedules.
-- ════════════════════════════════════════════════════════════════════
--
-- Already applied to production via apply_migration. Captured here
-- for git history and fresh-project rebuilds.

-- ── Gap 6: per-(device, item) mastery threshold ───────────────────
DROP FUNCTION IF EXISTS public.dashboard_mastery_milestones(int, int, int);
CREATE FUNCTION public.dashboard_mastery_milestones(
    in_days int DEFAULT 60,
    in_min_attempts int DEFAULT 5,
    in_threshold_pct int DEFAULT 80
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH ranked AS (
    SELECT device_id, game_mode, item_key, was_correct, occurred_at,
           row_number() OVER (PARTITION BY device_id, game_mode, item_key ORDER BY occurred_at DESC) AS rn,
           count(*) OVER (PARTITION BY device_id, game_mode, item_key) AS attempts_total
    FROM public.learning_attempts
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND device_id IS NOT NULL
), last_n AS (
    SELECT device_id, game_mode, item_key,
           sum(CASE WHEN was_correct THEN 1 ELSE 0 END)::int AS correct_in_window,
           count(*)::int AS attempts_in_window,
           min(attempts_total)::int AS attempts_total
    FROM ranked
    WHERE rn <= in_min_attempts
    GROUP BY device_id, game_mode, item_key
), classified AS (
    SELECT device_id, game_mode, item_key, attempts_total,
           CASE WHEN attempts_in_window >= in_min_attempts
                  AND (100.0 * correct_in_window / attempts_in_window) >= in_threshold_pct
                THEN true ELSE false END AS mastered,
           round(100.0 * correct_in_window / attempts_in_window, 1) AS recent_accuracy_pct
    FROM last_n
), per_item AS (
    SELECT game_mode, item_key,
           count(*) filter (where mastered) AS mastered_devices,
           count(*) filter (where not mastered) AS practising_devices,
           count(*) AS touched_devices,
           round(avg(recent_accuracy_pct)::numeric, 1) AS avg_recent_accuracy
    FROM classified
    GROUP BY game_mode, item_key
)
SELECT jsonb_build_object(
    'days', in_days,
    'min_attempts', in_min_attempts,
    'threshold_pct', in_threshold_pct,
    'as_of', now(),
    'items', coalesce(jsonb_agg(
        jsonb_build_object(
            'game_mode', game_mode,
            'item_key', item_key,
            'mastered_devices', mastered_devices,
            'practising_devices', practising_devices,
            'touched_devices', touched_devices,
            'mastery_pct', CASE WHEN touched_devices > 0
                                THEN round(100.0 * mastered_devices / touched_devices, 1)
                                ELSE 0 END,
            'avg_recent_accuracy', avg_recent_accuracy
        ) ORDER BY mastered_devices DESC, touched_devices DESC
    ), '[]'::jsonb)
) FROM per_item;
$$;
GRANT EXECUTE ON FUNCTION public.dashboard_mastery_milestones(int, int, int) TO anon, authenticated;

-- ── Gap 4: dashboard_daily_digest ─────────────────────────────────
DROP FUNCTION IF EXISTS public.dashboard_daily_digest();
CREATE FUNCTION public.dashboard_daily_digest()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- ── Gap 4: dashboard_anomaly_check ────────────────────────────────
DROP FUNCTION IF EXISTS public.dashboard_anomaly_check();
CREATE FUNCTION public.dashboard_anomaly_check()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH window15 AS (
    SELECT * FROM public.analytics_events
    WHERE occurred_at > now() - interval '15 minutes'
), counts AS (
    SELECT
        count(*) filter (where event_name = 'tracker_init_failed') AS init_fail,
        count(*) filter (where event_name = 'camera_denied')        AS cam_denied,
        count(*) filter (where event_name = 'csp_violation')        AS csp,
        count(*) filter (where event_name = 'system_error')         AS sys_err,
        count(*) filter (where event_name = 'tracker_init_succeeded') AS init_ok,
        count(distinct session_id) filter (where event_name = 'session_started') AS new_sessions
    FROM window15
), checks AS (
    SELECT * FROM (VALUES
        ('tracker_init_failed', (SELECT init_fail FROM counts)::int, 3, 'tracker_init_failed count exceeded threshold in last 15 min'),
        ('camera_denied',       (SELECT cam_denied FROM counts)::int, 5, 'camera_denied count exceeded threshold'),
        ('csp_violation',       (SELECT csp FROM counts)::int,        5, 'csp_violation count exceeded threshold'),
        ('system_error',        (SELECT sys_err FROM counts)::int,    1, 'uncaught system_error in last 15 min')
    ) AS t(metric, observed, threshold, message)
)
SELECT jsonb_build_object(
    'as_of', now(),
    'breaches', coalesce(jsonb_agg(
        jsonb_build_object('metric', metric, 'observed', observed, 'threshold', threshold, 'message', message)
    ) FILTER (WHERE observed >= threshold), '[]'::jsonb),
    'window_summary', (SELECT to_jsonb(c) FROM counts c)
) FROM checks;
$$;

-- ── Gap 5: 12-month auto-prune via pg_cron ────────────────────────
-- pg_cron is already installed on the project.
DO $$
DECLARE rec record;
BEGIN
    FOR rec IN SELECT jobname FROM cron.job WHERE jobname IN
        ('dita-prune-analytics-events', 'dita-prune-learning-attempts',
         'dita-daily-digest', 'dita-anomaly-check')
    LOOP
        PERFORM cron.unschedule(rec.jobname);
    END LOOP;
END
$$;

SELECT cron.schedule(
    'dita-prune-analytics-events',
    '0 3 * * *',
    $$DELETE FROM public.analytics_events WHERE occurred_at < now() - interval '365 days'$$
);

SELECT cron.schedule(
    'dita-prune-learning-attempts',
    '5 3 * * *',
    $$DELETE FROM public.learning_attempts WHERE occurred_at < now() - interval '365 days'$$
);

-- ── Gap 4: schedule the analytics-digest Edge Function ────────────
-- Daily 07:00 UTC + every 15 min for anomaly check. The Edge Function
-- reads RESEND_API_KEY, DIGEST_EMAIL_TO, DIGEST_EMAIL_FROM from
-- supabase secrets; it must be deployed (see
-- platform/supabase/functions/analytics-digest/index.ts).
SELECT cron.schedule(
    'dita-daily-digest',
    '0 7 * * *',
    $$
    SELECT net.http_post(
        url := 'https://fmrsfjxwswzhvicylaph.supabase.co/functions/v1/analytics-digest?mode=daily',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
    );
    $$
);

SELECT cron.schedule(
    'dita-anomaly-check',
    '*/15 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://fmrsfjxwswzhvicylaph.supabase.co/functions/v1/analytics-digest?mode=anomaly',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 15000
    );
    $$
);
