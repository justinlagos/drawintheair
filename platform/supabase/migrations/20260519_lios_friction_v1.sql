-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 2 — Cognitive Friction Detectors v1
-- ═══════════════════════════════════════════════════════════════════
--
-- The eight detectors specified in Document B §4.1. They examine each
-- session's attempt pattern + ambient analytics_events and emit one
-- `friction_*_detected` row into analytics_events per (session,
-- detector). Deterministic event_uid makes the function idempotent:
-- re-runs collapse onto the same row via ON CONFLICT DO NOTHING.
--
-- v1 is OFFLINE / batch. The detectors look at a session's signals
-- after the fact. Document B §4.2 describes them as runtime mutually-
-- exclusive predicates, but the runtime version belongs to the
-- adaptive engine (later sprint). For now, multiple detectors can
-- co-fire on the same session — that's the engineering signal we
-- use to calibrate thresholds and discover overlaps.
--
-- Thresholds calibrated on 2026-05-19 against 192 sessions with >=4
-- attempts. Notable adjustments from the spec defaults:
--   • tab_hidden discarded as a primary detector input — fires on
--     99% of sessions (normal tab-switching, not signal). Kept as a
--     sub-signal where contextually meaningful.
--   • stuck_detected (count per session) becomes the strongest
--     friction proxy — avg 10/session.
--   • Boredom requires >=8 attempts (raw "≥4 attempts at 100%" was
--     dominating at 53% of all sessions, which is calibration noise).
--   • Distraction threshold lowered from credibility <0.5 to <0.85
--     because Trust v1's distribution is sharply right-skewed.
--
-- Eight detectors:
--   D1 successful_learning   — accuracy 0.65-0.90, n>=6, low stuck,
--                              mean_credibility>=0.85, completed
--   D2 productive_struggle   — accuracy 0.50-0.65, n>=6,
--                              mean_credibility>=0.70, completed
--   D3 cognitive_overload    — accuracy<0.5, n_stuck>=3, n>=4
--   D4 decision_fatigue      — n_stuck>=5, n>=8, accuracy 0.40-0.80
--   D5 attention_collapse    — not completed, n_stuck>=3, n<8
--   D6 over_challenge        — accuracy<0.40, n>=4
--   D7 boredom               — accuracy>0.95, n>=8
--   D8 distraction           — mean_credibility<0.85, n>=4

-- ── Detector function ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lios_detect_friction_v1(
    p_lookback interval DEFAULT '24 hours'
) RETURNS TABLE(
    sessions_processed bigint,
    detectors_fired    bigint,
    by_detector        jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_sessions bigint := 0;
    v_fires    bigint := 0;
    v_by_det   jsonb;
BEGIN
    -- session_stats CTE drives one pass per session.
    WITH session_stats AS (
        SELECT
            a.session_id,
            a.game_mode,
            min(a.occurred_at) AS first_at,
            max(a.occurred_at) AS last_at,
            count(*)                                         AS n_attempts,
            avg(a.was_correct::int)::numeric(4,3)            AS accuracy,
            avg(a.credibility_score)::numeric(4,3)           AS mean_cred,
            -- Per-session counts of contextual signals
            (SELECT count(*) FROM analytics_events e
             WHERE e.session_id = a.session_id
               AND e.event_name = 'stuck_detected')          AS n_stuck,
            (SELECT count(*) FROM analytics_events e
             WHERE e.session_id = a.session_id
               AND e.event_name = 'tab_hidden')              AS n_tab_hidden,
            (SELECT count(*) FROM analytics_events e
             WHERE e.session_id = a.session_id
               AND e.event_name = 'mode_completed') > 0      AS reached_completion,
            (SELECT count(*) FROM analytics_events e
             WHERE e.session_id = a.session_id
               AND e.event_name = 'mode_abandoned') > 0      AS abandoned,
            -- Pull device_id, age_band from any one row for the synth event
            (array_agg(a.device_id) FILTER (WHERE a.device_id IS NOT NULL))[1] AS device_id,
            (array_agg(a.age_band)  FILTER (WHERE a.age_band  IS NOT NULL))[1] AS age_band,
            (array_agg(a.context)   FILTER (WHERE a.context   IS NOT NULL))[1] AS context
        FROM learning_attempts a
        WHERE a.occurred_at > now() - p_lookback
        GROUP BY a.session_id, a.game_mode
        HAVING count(*) >= 4
    ),
    -- Match each detector against each session
    fires AS (
        SELECT
            s.session_id,
            s.game_mode,
            s.first_at,
            s.device_id,
            s.age_band,
            s.context,
            d.detector_name,
            d.matched,
            s.n_attempts,
            s.accuracy,
            s.mean_cred,
            s.n_stuck,
            s.reached_completion,
            s.abandoned
        FROM session_stats s
        CROSS JOIN LATERAL (
            VALUES
                ('friction_successful_learning_detected',
                    s.accuracy BETWEEN 0.65 AND 0.90
                    AND s.n_attempts >= 6
                    AND s.n_stuck <= 2
                    AND s.mean_cred >= 0.85
                    AND s.reached_completion
                ),
                ('friction_productive_struggle_detected',
                    s.accuracy BETWEEN 0.50 AND 0.65
                    AND s.n_attempts >= 6
                    AND s.mean_cred >= 0.70
                    AND s.reached_completion
                ),
                ('friction_cognitive_overload_detected',
                    s.accuracy < 0.50
                    AND s.n_stuck >= 3
                    AND s.n_attempts >= 4
                ),
                ('friction_decision_fatigue_detected',
                    s.n_stuck >= 5
                    AND s.n_attempts >= 8
                    AND s.accuracy BETWEEN 0.40 AND 0.80
                ),
                ('friction_attention_collapse_detected',
                    NOT s.reached_completion
                    AND s.n_stuck >= 3
                    AND s.n_attempts < 8
                ),
                ('friction_over_challenge_detected',
                    s.accuracy < 0.40
                    AND s.n_attempts >= 4
                ),
                ('friction_boredom_detected',
                    s.accuracy > 0.95
                    AND s.n_attempts >= 8
                ),
                ('friction_distraction_detected',
                    s.mean_cred < 0.85
                    AND s.n_attempts >= 4
                )
        ) AS d(detector_name, matched)
        WHERE d.matched
    ),
    -- Insert one analytics_events row per fire. Deterministic
    -- event_uid (md5 of session+detector) gives idempotent re-runs.
    inserted AS (
        INSERT INTO analytics_events (
            session_id, event_name, occurred_at,
            game_mode, device_id, age_band, context,
            event_uid, client_seq, client_ts,
            build_version, meta
        )
        SELECT
            f.session_id,
            f.detector_name,
            f.first_at + interval '1 second',  -- after the first attempt
            f.game_mode,
            f.device_id,
            f.age_band,
            COALESCE(f.context, 'unknown'),
            md5(f.session_id::text || '|' || f.detector_name || '|v1')::uuid,
            NULL,  -- server-synth events don't carry client_seq
            NULL,
            'lios-friction-v1',
            jsonb_build_object(
                'detector_version',    'v1',
                'detector_name',       replace(f.detector_name, 'friction_', ''),
                'n_attempts',          f.n_attempts,
                'accuracy',            f.accuracy,
                'mean_credibility',    f.mean_cred,
                'n_stuck',             f.n_stuck,
                'reached_completion',  f.reached_completion,
                'abandoned',           f.abandoned
            )
        FROM fires f
        ON CONFLICT (event_uid) DO NOTHING
        RETURNING event_name
    )
    SELECT
        (SELECT count(DISTINCT session_id) FROM session_stats),
        (SELECT count(*)                   FROM inserted),
        (SELECT jsonb_object_agg(event_name, n)
         FROM (SELECT event_name, count(*) AS n FROM inserted GROUP BY event_name) g)
    INTO v_sessions, v_fires, v_by_det;

    RETURN QUERY SELECT v_sessions, v_fires, COALESCE(v_by_det, '{}'::jsonb);
END;
$fn$;

COMMENT ON FUNCTION public.lios_detect_friction_v1(interval) IS
    'LIOS Cognitive Friction Detectors v1. Eight rule-based detectors over learning_attempts + analytics_events. Idempotent: deterministic event_uid per (session, detector) collapses re-runs onto the same row.';

REVOKE ALL ON FUNCTION public.lios_detect_friction_v1(interval) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lios_detect_friction_v1(interval)
    TO authenticated, service_role;

-- ── Engineering observability RPC ──────────────────────────────────
--
-- Surface used by the Insights "Friction" tab (engineering-only,
-- behind the existing admin allow-list). Teacher-facing version
-- comes later once thresholds calibrated.

CREATE OR REPLACE FUNCTION public.dashboard_friction_engineering(
    in_days int DEFAULT 30
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
    WITH win AS (
        SELECT e.session_id, e.event_name, e.game_mode, e.age_band,
               e.context, e.occurred_at, e.meta
        FROM analytics_events e
        WHERE e.event_name LIKE 'friction\_%\_detected' ESCAPE '\'
          AND e.occurred_at > now() - (in_days || ' days')::interval
    ),
    by_det AS (
        SELECT event_name AS detector, count(*)::int AS n
        FROM win
        GROUP BY event_name
    ),
    by_mode_det AS (
        SELECT game_mode, event_name AS detector, count(*)::int AS n
        FROM win
        GROUP BY game_mode, event_name
    ),
    by_age_det AS (
        SELECT age_band, event_name AS detector, count(*)::int AS n
        FROM win
        WHERE age_band IS NOT NULL
        GROUP BY age_band, event_name
    ),
    recent AS (
        SELECT session_id, event_name AS detector, game_mode,
               age_band, context, occurred_at, meta
        FROM win
        ORDER BY occurred_at DESC
        LIMIT 50
    )
    SELECT jsonb_build_object(
        'days',     in_days,
        'as_of',    now(),
        'total',    (SELECT count(*) FROM win),
        'by_detector', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('detector', detector, 'n', n)
                             ORDER BY n DESC)
            FROM by_det
        ), '[]'::jsonb),
        'by_mode',  COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'game_mode', game_mode,
                'detector',  detector,
                'n',         n
            ))
            FROM by_mode_det
        ), '[]'::jsonb),
        'by_age',   COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'age_band', age_band,
                'detector', detector,
                'n',        n
            ))
            FROM by_age_det
        ), '[]'::jsonb),
        'recent',   COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'session_id',  session_id,
                'detector',    detector,
                'game_mode',   game_mode,
                'age_band',    age_band,
                'context',     context,
                'occurred_at', occurred_at,
                'meta',        meta
            ) ORDER BY occurred_at DESC)
            FROM recent
        ), '[]'::jsonb)
    );
$fn$;

COMMENT ON FUNCTION public.dashboard_friction_engineering(int) IS
    'LIOS friction engineering surface. Per-detector counts, per-mode + per-age breakdown, recent firings with full meta. Engineering observability — not teacher-facing.';

REVOKE ALL ON FUNCTION public.dashboard_friction_engineering(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_friction_engineering(int) TO authenticated;
