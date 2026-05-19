-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 3 — gesture-quality scalar columns + RPC
-- ═══════════════════════════════════════════════════════════════════
--
-- Document A §2.1. The platform's first motor-precision telemetry.
-- All columns nullable + additive — backwards compatible with every
-- pre-Sprint-3 attempt row.
--
-- Privacy posture (critical): NEVER store coordinate paths. The
-- on-device GestureSampler computes scalar summaries from MediaPipe
-- samples and discards the raw coordinates in the same frame. Only
-- the scalars below transit the wire.

ALTER TABLE public.learning_attempts
    ADD COLUMN IF NOT EXISTS gq_path_accuracy_pct          numeric(5, 2),
    ADD COLUMN IF NOT EXISTS gq_path_efficiency            numeric(5, 3),
    ADD COLUMN IF NOT EXISTS gq_spatial_error_mean_px      numeric(7, 2),
    ADD COLUMN IF NOT EXISTS gq_velocity_variance          numeric(10, 3),
    ADD COLUMN IF NOT EXISTS gq_pause_count                int,
    ADD COLUMN IF NOT EXISTS gq_directional_changes        int,
    ADD COLUMN IF NOT EXISTS gq_time_to_first_movement_ms  int,
    ADD COLUMN IF NOT EXISTS gq_time_to_completion_ms      int,
    ADD COLUMN IF NOT EXISTS gq_corrections_in_stroke      int,
    ADD COLUMN IF NOT EXISTS gq_n_samples                  int;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conname = 'learning_attempts_gq_path_accuracy_range') THEN
        ALTER TABLE public.learning_attempts
            ADD CONSTRAINT learning_attempts_gq_path_accuracy_range
            CHECK (gq_path_accuracy_pct IS NULL
                   OR (gq_path_accuracy_pct >= 0 AND gq_path_accuracy_pct <= 100));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conname = 'learning_attempts_gq_path_efficiency_range') THEN
        ALTER TABLE public.learning_attempts
            ADD CONSTRAINT learning_attempts_gq_path_efficiency_range
            CHECK (gq_path_efficiency IS NULL
                   OR (gq_path_efficiency >= 0 AND gq_path_efficiency <= 1));
    END IF;
END $$;

COMMENT ON COLUMN public.learning_attempts.gq_path_accuracy_pct IS
    'Fraction of stroke frames within the ideal path zone (0-100). Path-tracing modes.';
COMMENT ON COLUMN public.learning_attempts.gq_path_efficiency IS
    'Net displacement / total path length (0-1). Lower = jitterier.';
COMMENT ON COLUMN public.learning_attempts.gq_spatial_error_mean_px IS
    'Mean distance (px) from ideal path samples.';
COMMENT ON COLUMN public.learning_attempts.gq_velocity_variance IS
    'Variance of frame-to-frame velocity. Higher = jerkier motion.';
COMMENT ON COLUMN public.learning_attempts.gq_pause_count IS
    'Count of within-stroke hesitations (velocity below threshold).';
COMMENT ON COLUMN public.learning_attempts.gq_directional_changes IS
    'Count of sharp direction reversals during the stroke.';
COMMENT ON COLUMN public.learning_attempts.gq_time_to_first_movement_ms IS
    'Latency from prompt to first detected motion. Confidence proxy.';
COMMENT ON COLUMN public.learning_attempts.gq_time_to_completion_ms IS
    'Total stroke duration (distinct from ms_to_attempt).';
COMMENT ON COLUMN public.learning_attempts.gq_corrections_in_stroke IS
    'In-stroke direction reversals that recovered toward target.';
COMMENT ON COLUMN public.learning_attempts.gq_n_samples IS
    'Number of MediaPipe samples used. Data-quality marker.';

CREATE OR REPLACE FUNCTION public.dashboard_gesture_quality(
    in_days int DEFAULT 30
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
    WITH win AS (
        SELECT * FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
    ),
    by_mode AS (
        SELECT
            game_mode,
            count(*)::int                                          AS n_attempts,
            count(gq_path_accuracy_pct)::int                       AS n_with_accuracy,
            count(gq_path_efficiency)::int                         AS n_with_efficiency,
            count(gq_velocity_variance)::int                       AS n_with_velocity,
            avg(gq_path_accuracy_pct)::numeric(5, 2)               AS mean_accuracy_pct,
            avg(gq_path_efficiency)::numeric(5, 3)                 AS mean_efficiency,
            avg(gq_time_to_completion_ms)::int                     AS mean_completion_ms,
            avg(gq_spatial_error_mean_px)::numeric(7, 2)           AS mean_spatial_error_px,
            percentile_cont(0.50) WITHIN GROUP (
                ORDER BY gq_path_accuracy_pct)::numeric(5, 2)      AS median_accuracy_pct
        FROM win
        GROUP BY game_mode
    )
    SELECT jsonb_build_object(
        'days', in_days, 'as_of', now(),
        'total_attempts', (SELECT count(*) FROM win),
        'total_with_gq',  (SELECT count(*) FROM win WHERE gq_n_samples IS NOT NULL
                                                      OR gq_path_accuracy_pct IS NOT NULL
                                                      OR gq_path_efficiency IS NOT NULL),
        'by_mode', COALESCE((SELECT jsonb_agg(row_to_json(b) ORDER BY n_attempts DESC) FROM by_mode b), '[]'::jsonb)
    );
$fn$;

REVOKE ALL ON FUNCTION public.dashboard_gesture_quality(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_gesture_quality(int) TO authenticated;
