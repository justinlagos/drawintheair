-- ════════════════════════════════════════════════════════════════════
-- Tier C / D analytics expansion — device_id, learning_attempts,
-- and longitudinal + classroom RPCs.
-- ════════════════════════════════════════════════════════════════════
--
-- Tier C: per-device retention + mastery + curriculum coverage.
-- Tier D: classroom-level B2B analytics.
--
-- Already applied to production via apply_migration; this file is the
-- reproducible artifact for git history and fresh-project rebuilds.

-- ── 1. device_id column on analytics_events ──────────────────────
ALTER TABLE public.analytics_events
    ADD COLUMN IF NOT EXISTS device_id text;

CREATE INDEX IF NOT EXISTS analytics_events_device_idx
    ON public.analytics_events (device_id, occurred_at DESC)
    WHERE device_id IS NOT NULL;

-- ── 2. learning_attempts table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_attempts (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at     timestamptz NOT NULL DEFAULT now(),
    session_id      uuid        NOT NULL,
    device_id       text,
    game_mode       text        NOT NULL,
    stage_id        text,
    stage_index     int,
    item_key        text        NOT NULL,
    age_band        text,
    was_correct     boolean     NOT NULL,
    attempt_number  int,
    ms_to_attempt   int,
    expected_value  text,
    actual_value    text,
    meta            jsonb       DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS learning_attempts_device_item_idx
    ON public.learning_attempts (device_id, item_key, occurred_at DESC);
CREATE INDEX IF NOT EXISTS learning_attempts_session_idx
    ON public.learning_attempts (session_id, occurred_at);
CREATE INDEX IF NOT EXISTS learning_attempts_mode_idx
    ON public.learning_attempts (game_mode, occurred_at DESC);

ALTER TABLE public.learning_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anonymous insert learning attempts" ON public.learning_attempts;
CREATE POLICY "Anonymous insert learning attempts"
    ON public.learning_attempts
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated select learning attempts" ON public.learning_attempts;
CREATE POLICY "Authenticated select learning attempts"
    ON public.learning_attempts
    FOR SELECT
    TO authenticated
    USING (true);

-- ── 3. RPC: dashboard_cohort_retention ───────────────────────────
DROP FUNCTION IF EXISTS public.dashboard_cohort_retention(int);
CREATE FUNCTION public.dashboard_cohort_retention(in_weeks int DEFAULT 8)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH first_seen AS (
    SELECT device_id, min(occurred_at) AS first_at
    FROM public.analytics_events
    WHERE device_id IS NOT NULL
      AND occurred_at > now() - make_interval(weeks => in_weeks + 2)
    GROUP BY device_id
), cohorts AS (
    SELECT device_id, date_trunc('week', first_at) AS cohort_week, first_at
    FROM first_seen
    WHERE first_at > now() - make_interval(weeks => in_weeks)
), returns AS (
    SELECT c.cohort_week, c.device_id,
           bool_or(e.occurred_at >= c.first_at + interval '20 hours' AND e.occurred_at < c.first_at + interval '48 hours') AS d1,
           bool_or(e.occurred_at >= c.first_at + interval '2 days 20 hours' AND e.occurred_at < c.first_at + interval '4 days') AS d3,
           bool_or(e.occurred_at >= c.first_at + interval '6 days 20 hours' AND e.occurred_at < c.first_at + interval '8 days') AS d7
    FROM cohorts c
    LEFT JOIN public.analytics_events e
      ON e.device_id = c.device_id AND e.occurred_at > c.first_at
    GROUP BY c.cohort_week, c.device_id
), agg AS (
    SELECT cohort_week,
           count(*) AS new_devices,
           count(*) filter (where d1) AS d1_returns,
           count(*) filter (where d3) AS d3_returns,
           count(*) filter (where d7) AS d7_returns
    FROM returns
    GROUP BY cohort_week
)
SELECT jsonb_build_object(
    'weeks', in_weeks,
    'as_of', now(),
    'cohorts', coalesce(jsonb_agg(
        jsonb_build_object(
            'cohort_week', cohort_week,
            'new_devices', new_devices,
            'd1_returns', d1_returns,
            'd3_returns', d3_returns,
            'd7_returns', d7_returns,
            'd1_pct', CASE WHEN new_devices > 0 THEN round(100.0 * d1_returns / new_devices, 1) ELSE 0 END,
            'd3_pct', CASE WHEN new_devices > 0 THEN round(100.0 * d3_returns / new_devices, 1) ELSE 0 END,
            'd7_pct', CASE WHEN new_devices > 0 THEN round(100.0 * d7_returns / new_devices, 1) ELSE 0 END
        ) ORDER BY cohort_week DESC
    ), '[]'::jsonb)
) FROM agg;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_cohort_retention(int) TO anon, authenticated;

-- ── 4. RPC: dashboard_mastery ────────────────────────────────────
DROP FUNCTION IF EXISTS public.dashboard_mastery(int, int);
CREATE FUNCTION public.dashboard_mastery(in_days int DEFAULT 30, in_min_attempts int DEFAULT 5)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH per_item AS (
    SELECT game_mode, item_key,
           count(*) AS attempts,
           count(*) filter (where was_correct) AS correct,
           count(distinct device_id) filter (where device_id is not null) AS distinct_devices,
           round(avg(ms_to_attempt))::int AS avg_ms
    FROM public.learning_attempts
    WHERE occurred_at > now() - make_interval(days => in_days)
    GROUP BY game_mode, item_key
    HAVING count(*) >= in_min_attempts
)
SELECT jsonb_build_object(
    'days', in_days,
    'min_attempts', in_min_attempts,
    'as_of', now(),
    'items', coalesce(jsonb_agg(
        jsonb_build_object(
            'game_mode', game_mode,
            'item_key', item_key,
            'attempts', attempts,
            'correct', correct,
            'accuracy_pct', round(100.0 * correct / attempts, 1),
            'distinct_devices', distinct_devices,
            'avg_ms', avg_ms
        ) ORDER BY attempts DESC
    ), '[]'::jsonb)
) FROM per_item;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_mastery(int, int) TO anon, authenticated;

-- ── 5. RPC: dashboard_curriculum_coverage ────────────────────────
DROP FUNCTION IF EXISTS public.dashboard_curriculum_coverage(int);
CREATE FUNCTION public.dashboard_curriculum_coverage(in_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH per_device AS (
    SELECT device_id, game_mode,
           count(distinct item_key) AS distinct_items,
           count(*) AS total_attempts
    FROM public.learning_attempts
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND device_id IS NOT NULL
    GROUP BY device_id, game_mode
), totals AS (
    SELECT game_mode,
           count(distinct device_id) AS devices,
           round(avg(distinct_items)::numeric, 1) AS avg_distinct_items,
           round(avg(total_attempts)::numeric, 1) AS avg_attempts
    FROM per_device
    GROUP BY game_mode
)
SELECT jsonb_build_object(
    'days', in_days,
    'as_of', now(),
    'modes', coalesce(jsonb_agg(
        jsonb_build_object(
            'game_mode', game_mode,
            'devices', devices,
            'avg_distinct_items', avg_distinct_items,
            'avg_attempts', avg_attempts
        ) ORDER BY devices DESC
    ), '[]'::jsonb)
) FROM totals;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_curriculum_coverage(int) TO anon, authenticated;

-- ── 6. RPC: dashboard_classrooms (Tier D) ────────────────────────
DROP FUNCTION IF EXISTS public.dashboard_classrooms(int);
CREATE FUNCTION public.dashboard_classrooms(in_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH per_school_day AS (
    SELECT school_id, date_trunc('day', occurred_at) AS day,
           count(distinct session_id) AS distinct_sessions,
           count(distinct device_id) AS distinct_devices,
           count(*) filter (where event_name = 'mode_completed') AS mode_completions,
           count(*) filter (where event_name = 'session_started') AS session_starts,
           extract(epoch from (max(occurred_at) - min(occurred_at)))::int AS span_seconds
    FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND school_id IS NOT NULL AND school_id <> ''
    GROUP BY school_id, day
), per_school AS (
    SELECT school_id,
           sum(distinct_sessions) AS total_sessions,
           sum(distinct_devices) AS total_devices,
           sum(mode_completions) AS total_completions,
           count(*) AS active_days,
           max(day) AS last_active_day
    FROM per_school_day
    GROUP BY school_id
)
SELECT jsonb_build_object(
    'days', in_days,
    'as_of', now(),
    'schools', coalesce(jsonb_agg(
        jsonb_build_object(
            'school_id', school_id,
            'sessions', total_sessions,
            'devices', total_devices,
            'mode_completions', total_completions,
            'active_days', active_days,
            'last_active_day', last_active_day
        ) ORDER BY total_sessions DESC
    ), '[]'::jsonb)
) FROM per_school;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_classrooms(int) TO anon, authenticated;

-- ── 7. Update dashboard_latest_sessions to include device_id ─────
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
           min(device_id) AS device_id,
           min(occurred_at) AS started_at,
           max(occurred_at) AS last_at,
           extract(epoch from (max(occurred_at) - min(occurred_at)))::int AS dur_s,
           count(*)::int AS event_count,
           bool_or(event_name = 'mode_completed') AS reached_completion,
           bool_or(event_name = 'wave_completed') AS reached_wave,
           bool_or(event_name = 'tracker_init_failed') AS tracker_failed,
           bool_or(event_name = 'two_hands_detected') AS two_hands_seen,
           max(age_band) AS age_band,
           max(browser) AS browser,
           max(device_type) AS device_type,
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
            'device_id', device_id,
            'started_at', started_at,
            'last_at', last_at,
            'duration_seconds', dur_s,
            'event_count', event_count,
            'reached_wave', reached_wave,
            'reached_completion', reached_completion,
            'tracker_failed', tracker_failed,
            'two_hands_seen', two_hands_seen,
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
