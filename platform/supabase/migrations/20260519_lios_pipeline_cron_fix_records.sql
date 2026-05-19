-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 2 hotfix — pipeline orchestrator record-type bug
-- ═══════════════════════════════════════════════════════════════════
--
-- The first version of `lios_run_pipeline` declared each stage's
-- output as a bare `record`. Postgres parses function bodies eagerly
-- and cannot resolve `record.column_name` at parse time, so the
-- function failed at runtime with:
--   ERROR: could not identify column "scored_rows" in record data type
--
-- Fix: replace records with concrete scalar variables. Each stage now
-- SELECTs ... INTO named scalars matching the function's TABLE return
-- shape. Same semantics, fully resolvable at parse time. Idempotent —
-- can be re-applied without side effects.

CREATE OR REPLACE FUNCTION public.lios_run_pipeline(
    p_lookback interval DEFAULT '15 minutes'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
    v_started_at timestamptz := clock_timestamp();
    v_run_id     bigint;

    v_trust_scored   bigint;
    v_trust_tier_a   bigint;
    v_trust_tier_b   bigint;
    v_trust_tier_c   bigint;

    v_elo_processed  bigint;
    v_elo_learners   bigint;
    v_elo_items      bigint;

    v_mastery_pairs        bigint;
    v_mastery_transitions  bigint;
    v_mastery_by_state     jsonb;

    v_friction_sessions    bigint;
    v_friction_fires       bigint;
    v_friction_by_detector jsonb;

    v_error_message text := NULL;
    v_duration_ms   int;
BEGIN
    BEGIN
        SELECT scored_rows, tier_a, tier_b, tier_c
        INTO   v_trust_scored, v_trust_tier_a, v_trust_tier_b, v_trust_tier_c
        FROM   public.lios_score_unscored_attempts(p_lookback);
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') || 'trust=' || SQLERRM || '; ';
    END;

    BEGIN
        SELECT processed_attempts, distinct_learners, distinct_items
        INTO   v_elo_processed, v_elo_learners, v_elo_items
        FROM   public.lios_update_elo_v1(p_lookback);
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') || 'elo=' || SQLERRM || '; ';
    END;

    BEGIN
        SELECT pairs_processed, transitions_emitted, by_to_state
        INTO   v_mastery_pairs, v_mastery_transitions, v_mastery_by_state
        FROM   public.lios_detect_mastery_episodes_v1();
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') || 'mastery=' || SQLERRM || '; ';
    END;

    BEGIN
        SELECT sessions_processed, detectors_fired, by_detector
        INTO   v_friction_sessions, v_friction_fires, v_friction_by_detector
        FROM   public.lios_detect_friction_v1(p_lookback);
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') || 'friction=' || SQLERRM || '; ';
    END;

    v_duration_ms :=
        EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started_at))::int +
        EXTRACT(SECOND      FROM (clock_timestamp() - v_started_at))::int * 1000;

    INSERT INTO lios_pipeline_runs (
        run_at, duration_ms,
        trust_scored, trust_tier_a, trust_tier_b, trust_tier_c,
        elo_processed, elo_distinct_learners, elo_distinct_items,
        mastery_pairs, mastery_transitions, mastery_by_state,
        friction_sessions, friction_detectors_fired, friction_by_detector,
        error_message
    ) VALUES (
        v_started_at, v_duration_ms,
        v_trust_scored, v_trust_tier_a, v_trust_tier_b, v_trust_tier_c,
        v_elo_processed, v_elo_learners, v_elo_items,
        v_mastery_pairs, v_mastery_transitions, v_mastery_by_state,
        v_friction_sessions, v_friction_fires, v_friction_by_detector,
        v_error_message
    ) RETURNING id INTO v_run_id;

    RETURN jsonb_build_object(
        'run_id',      v_run_id,
        'ok',          v_error_message IS NULL,
        'started',     v_started_at,
        'duration_ms', v_duration_ms,
        'trust',    jsonb_build_object(
            'scored', v_trust_scored, 'tier_a', v_trust_tier_a,
            'tier_b', v_trust_tier_b, 'tier_c', v_trust_tier_c),
        'elo',      jsonb_build_object(
            'processed',         v_elo_processed,
            'distinct_learners', v_elo_learners,
            'distinct_items',    v_elo_items),
        'mastery',  jsonb_build_object(
            'pairs_processed',     v_mastery_pairs,
            'transitions_emitted', v_mastery_transitions,
            'by_state',            v_mastery_by_state),
        'friction', jsonb_build_object(
            'sessions_processed', v_friction_sessions,
            'detectors_fired',    v_friction_fires,
            'by_detector',        v_friction_by_detector),
        'error',    v_error_message
    );
END;
$fn$;

REVOKE ALL ON FUNCTION public.lios_run_pipeline(interval) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lios_run_pipeline(interval)
    TO authenticated, service_role;
