-- ════════════════════════════════════════════════════════════════════
-- 20260709000002_dashboard_funnel_real_ladder.sql
--
-- Make dashboard_funnel reflect the product that is actually deployed
-- (2026-07-09 funnel audit, companion to 20260709000001).
--
-- Three dishonesties in the previous ladder:
--
--   1. Dead top steps. try_free_clicked / age_band_selected /
--      session_started last fired 21–27 May: the landing "Try free"
--      CTAs now open anonymous /play directly (commit 85e43c9), so the
--      TryFreeModal that emitted all three is no longer on the primary
--      path. The funnel showed a permanent 0 → 0 → 0 head that read
--      as catastrophic drop-off but was dead instrumentation.
--
--   2. No traffic filter, while the executive summary excludes
--      internal/qa/bot (20260703000001). The two cards on the same
--      dashboard tab disagreed about what a "session" was.
--
--   3. The top of the funnel was the session_started EVENT (dead),
--      not the sessions_started METRIC the headline card shows. The
--      funnel top now uses the same definition as
--      dashboard_executive_summary: distinct sessions with at least
--      one non-noise event.
--
-- Read-path only, no data touched. Reversible by re-running the
-- previous CREATE OR REPLACE from the baseline
-- (supabase/baseline/prod_public_schema.sql, dashboard_funnel).
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.dashboard_funnel(in_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET statement_timeout TO '30s'
AS $$
WITH eligible AS (
    SELECT e.session_id, e.event_name
    FROM public.analytics_events e
    WHERE e.occurred_at > now() - make_interval(days => in_days)
      AND (e.traffic_type IS NULL OR e.traffic_type NOT IN ('internal', 'qa', 'bot'))
),
-- Top of the funnel: same definition as dashboard_executive_summary's
-- sessions_started, so the funnel and the headline card agree.
sessions_top AS (
    SELECT count(distinct session_id) AS n
    FROM eligible
    WHERE event_name NOT IN (
        'session_heartbeat', 'tracker_quality_sample',
        'tab_hidden', 'tab_visible', 'csp_violation'
    )
),
steps(step_order, step_name) AS (
    VALUES
        (2,  'camera_requested'),
        (3,  'camera_granted'),
        (4,  'tracker_init_started'),
        (5,  'tracker_init_succeeded'),
        (6,  'wave_screen_view'),
        (7,  'wave_first_hand_seen'),
        (8,  'wave_completed'),
        (9,  'mode_started'),
        (10, 'mode_completed')
),
counted AS (
    SELECT 1 AS step_order, 'session_started' AS step_name,
           (SELECT n FROM sessions_top)::bigint AS sessions
    UNION ALL
    SELECT s.step_order, s.step_name,
           (SELECT count(distinct e.session_id)
              FROM eligible e
              WHERE e.event_name = s.step_name) AS sessions
    FROM steps s
),
with_pct AS (
    SELECT step_order, step_name, sessions,
           CASE WHEN max(sessions) OVER () = 0 THEN 0
                ELSE round(100.0 * sessions / max(sessions) OVER (), 1)
           END AS pct_of_top
    FROM counted
)
SELECT jsonb_build_object(
    'days', in_days,
    'as_of', now(),
    'semantics', jsonb_build_object(
        'traffic_filter', 'internal/qa/bot excluded; NULL (pre-stamping legacy) and demo kept — matches dashboard_executive_summary',
        'session_started', 'distinct sessions with ≥1 non-noise event (same as the executive sessions_started card), NOT the retired session_started event',
        'steps', 'each step = distinct sessions that emitted the event at least once in the window'
    ),
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
