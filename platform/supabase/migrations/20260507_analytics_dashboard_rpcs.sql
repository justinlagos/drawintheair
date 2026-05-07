-- ════════════════════════════════════════════════════════════════════
-- analytics_dashboard — read-only RPC functions for the insights view
-- ════════════════════════════════════════════════════════════════════
--
-- The "read-only badge" implementation. Each function below:
--
--   • Marked SECURITY DEFINER so it runs as the postgres owner. That
--     bypasses the analytics_events RLS without ever granting anon a
--     raw SELECT on the table.
--   • Granted EXECUTE to anon (and authenticated). The dashboard
--     calls them via PostgREST RPC using the public anon key already
--     baked into the production bundle. No new JWT to mint, no secret
--     to rotate.
--   • Returns aggregate / pre-anonymised JSON only. school_id and
--     class_id never leave the database. session_id is exposed (it
--     is a per-tab UUID, not PII).
--   • SET search_path = public, pg_temp defends against the classic
--     SECURITY DEFINER schema-hijack attack.
--
-- Add new dashboard panels by adding new functions here. Do NOT widen
-- the existing ones — narrow surface = a leak of the anon key never
-- exposes more than the dashboard itself already exposes.

-- ── Panel 1: Today ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.dashboard_today();
CREATE FUNCTION public.dashboard_today()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH today AS (
    SELECT *
    FROM public.analytics_events
    WHERE occurred_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
), per_session AS (
    SELECT session_id,
           min(occurred_at) AS first_at,
           max(occurred_at) AS last_at,
           bool_or(event_name = 'mode_completed') AS reached_completion,
           extract(epoch from (max(occurred_at) - min(occurred_at))) AS dur_s
    FROM today
    GROUP BY session_id
)
SELECT jsonb_build_object(
    'sessions_started',       (SELECT count(*) FROM per_session),
    'sessions_completed',     (SELECT count(*) FROM per_session WHERE reached_completion),
    'completion_rate_pct',    (SELECT round(100.0 * count(*) filter (where reached_completion) / nullif(count(*), 0), 1)
                                 FROM per_session),
    'median_session_seconds', (SELECT round((percentile_cont(0.5) within group (order by dur_s))::numeric, 0)
                                 FROM per_session WHERE dur_s > 0),
    'mode_completions',       (SELECT count(*) FROM today WHERE event_name = 'mode_completed'),
    'mode_starts',            (SELECT count(*) FROM today WHERE event_name = 'mode_started'),
    'total_events',           (SELECT count(*) FROM today),
    'as_of',                  now()
);
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_today() TO anon, authenticated;

-- ── Panel 2: Activation funnel ────────────────────────────────────
-- Drop-off across the canonical acquisition → activation steps.
-- Step counts are distinct sessions that fired each event in the
-- window. pct_of_top is the share of sessions that reached this step
-- relative to the highest step (the entry-point of the funnel).
DROP FUNCTION IF EXISTS public.dashboard_funnel(int);
CREATE FUNCTION public.dashboard_funnel(in_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH steps(step_order, step_name) AS (
    VALUES
        (1,  'try_free_clicked'),
        (2,  'age_band_selected'),
        (3,  'session_started'),
        (4,  'camera_requested'),
        (5,  'camera_granted'),
        (6,  'tracker_init_started'),
        (7,  'tracker_init_succeeded'),
        (8,  'wave_first_hand_seen'),
        (9,  'wave_completed'),
        (10, 'mode_started'),
        (11, 'mode_completed')
), counted AS (
    SELECT s.step_order, s.step_name,
           (SELECT count(distinct e.session_id)
              FROM public.analytics_events e
              WHERE e.event_name = s.step_name
                AND e.occurred_at > now() - make_interval(days => in_days)
           ) AS sessions
    FROM steps s
), with_pct AS (
    SELECT step_order, step_name, sessions,
           CASE WHEN max(sessions) OVER () = 0 THEN 0
                ELSE round(100.0 * sessions / max(sessions) OVER (), 1)
           END AS pct_of_top
    FROM counted
)
SELECT jsonb_build_object(
    'days', in_days,
    'as_of', now(),
    'steps', coalesce(jsonb_agg(
        jsonb_build_object(
            'step_order', step_order,
            'step_name', step_name,
            'sessions', sessions,
            'pct_of_top', pct_of_top
        ) ORDER BY step_order
    ), '[]'::jsonb)
) FROM with_pct;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_funnel(int) TO anon, authenticated;

-- ── Panel 3: Tracker health ───────────────────────────────────────
DROP FUNCTION IF EXISTS public.dashboard_tracker_health(int);
CREATE FUNCTION public.dashboard_tracker_health(in_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH window_data AS (
    SELECT *
    FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days)
), succ AS (
    SELECT (meta ->> 'delegate') AS delegate,
           value_number AS init_ms
    FROM window_data
    WHERE event_name = 'tracker_init_succeeded'
), fail AS (
    SELECT (meta ->> 'code') AS code,
           count(*)::int AS n
    FROM window_data
    WHERE event_name = 'tracker_init_failed'
    GROUP BY meta ->> 'code'
)
SELECT jsonb_build_object(
    'days',                  in_days,
    'gpu_success',           (SELECT count(*) FROM succ WHERE delegate = 'GPU'),
    'cpu_success',           (SELECT count(*) FROM succ WHERE delegate = 'CPU'),
    'failed',                (SELECT count(*) FROM window_data WHERE event_name = 'tracker_init_failed'),
    'median_init_ms_gpu',    (SELECT round((percentile_cont(0.5) within group (order by init_ms))::numeric, 0)
                                FROM succ WHERE delegate = 'GPU' AND init_ms IS NOT NULL),
    'median_init_ms_cpu',    (SELECT round((percentile_cont(0.5) within group (order by init_ms))::numeric, 0)
                                FROM succ WHERE delegate = 'CPU' AND init_ms IS NOT NULL),
    'failures_by_code',      coalesce((SELECT jsonb_agg(jsonb_build_object('code', code, 'count', n) ORDER BY n DESC)
                                         FROM fail), '[]'::jsonb),
    'as_of',                 now()
);
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_tracker_health(int) TO anon, authenticated;

-- ── Panel 4: Most-played modes ────────────────────────────────────
DROP FUNCTION IF EXISTS public.dashboard_top_modes(int);
CREATE FUNCTION public.dashboard_top_modes(in_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH per_mode AS (
    SELECT game_mode,
           count(*) filter (where event_name = 'mode_started')                       AS started,
           count(*) filter (where event_name = 'mode_completed')                     AS completed,
           count(distinct session_id) filter (where event_name = 'mode_started')     AS distinct_starters
    FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND game_mode IS NOT NULL
    GROUP BY game_mode
)
SELECT jsonb_build_object(
    'days', in_days,
    'as_of', now(),
    'modes', coalesce(jsonb_agg(
        jsonb_build_object(
            'game_mode', game_mode,
            'started', started,
            'completed', completed,
            'distinct_starters', distinct_starters,
            'completion_rate_pct',
                CASE WHEN started > 0
                     THEN round(100.0 * completed / started, 1)
                     ELSE 0 END
        ) ORDER BY started DESC
    ), '[]'::jsonb)
) FROM per_mode;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_top_modes(int) TO anon, authenticated;

-- ── Panel 5: Error stream ─────────────────────────────────────────
-- Returns recent error-shaped events with their meta intact (codes,
-- error names) but with no school_id / class_id leaking. The meta
-- column itself contains no PII by design — see analytics.ts.
DROP FUNCTION IF EXISTS public.dashboard_errors(int);
CREATE FUNCTION public.dashboard_errors(row_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH errs AS (
    SELECT occurred_at,
           event_name,
           browser,
           device_type,
           page,
           meta
    FROM public.analytics_events
    WHERE event_name IN ('system_error', 'csp_violation', 'tracker_init_failed', 'camera_denied')
    ORDER BY occurred_at DESC
    LIMIT row_limit
)
SELECT jsonb_build_object(
    'as_of', now(),
    'errors', coalesce(jsonb_agg(
        jsonb_build_object(
            'occurred_at', occurred_at,
            'event_name',  event_name,
            'browser',     browser,
            'device_type', device_type,
            'page',        page,
            'meta',        meta
        ) ORDER BY occurred_at DESC
    ), '[]'::jsonb)
) FROM errs;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_errors(int) TO anon, authenticated;

-- ── Panel 6: Latest sessions ──────────────────────────────────────
DROP FUNCTION IF EXISTS public.dashboard_latest_sessions(int);
CREATE FUNCTION public.dashboard_latest_sessions(row_limit int DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH per_session AS (
    SELECT session_id,
           min(occurred_at)  AS started_at,
           max(occurred_at)  AS last_at,
           extract(epoch from (max(occurred_at) - min(occurred_at)))::int AS dur_s,
           count(*)::int     AS event_count,
           bool_or(event_name = 'mode_completed')      AS reached_completion,
           bool_or(event_name = 'wave_completed')      AS reached_wave,
           bool_or(event_name = 'tracker_init_failed') AS tracker_failed,
           max(age_band)      AS age_band,
           max(browser)       AS browser,
           max(device_type)   AS device_type,
           max(build_version) AS build_version,
           array_agg(distinct game_mode) filter (where game_mode is not null) AS modes_played
    FROM public.analytics_events
    GROUP BY session_id
    ORDER BY max(occurred_at) DESC
    LIMIT row_limit
)
SELECT jsonb_build_object(
    'as_of', now(),
    'sessions', coalesce(jsonb_agg(
        jsonb_build_object(
            'session_id', session_id,
            'started_at', started_at,
            'last_at', last_at,
            'duration_seconds', dur_s,
            'event_count', event_count,
            'reached_wave', reached_wave,
            'reached_completion', reached_completion,
            'tracker_failed', tracker_failed,
            'age_band', age_band,
            'browser', browser,
            'device_type', device_type,
            'build_version', build_version,
            'modes_played', modes_played
        ) ORDER BY last_at DESC
    ), '[]'::jsonb)
) FROM per_session;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_latest_sessions(int) TO anon, authenticated;
