-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 2 Day 4 — Scheduled pipeline (pg_cron)
-- ═══════════════════════════════════════════════════════════════════
--
-- Stitches Trust v1, Elo v1, Mastery Episodes v1, and Friction v1 into
-- a single ordered orchestrator and schedules it every 5 minutes via
-- pg_cron. The order matters:
--
--   1. Trust       — scores new attempts (credibility)
--   2. Elo         — updates θ / b on Trust-scored attempts
--                    (filters credibility_score IS NOT NULL itself)
--   3. Mastery     — re-evaluates state machine (reads skill_state)
--   4. Friction    — detects session-level friction patterns
--                    (independent of 1-3, but runs last)
--
-- All four functions are individually idempotent. The orchestrator
-- writes one summary row to `lios_pipeline_runs` per execution so
-- engineering can verify the schedule is firing.

-- ── 1. Observability table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lios_pipeline_runs (
    id                       bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_at                   timestamptz   NOT NULL DEFAULT now(),
    duration_ms              int,

    trust_scored             bigint,
    trust_tier_a             bigint,
    trust_tier_b             bigint,
    trust_tier_c             bigint,

    elo_processed            bigint,
    elo_distinct_learners    bigint,
    elo_distinct_items       bigint,

    mastery_pairs            bigint,
    mastery_transitions      bigint,
    mastery_by_state         jsonb,

    friction_sessions        bigint,
    friction_detectors_fired bigint,
    friction_by_detector     jsonb,

    error_message            text
);

CREATE INDEX IF NOT EXISTS lios_pipeline_runs_time_idx
    ON public.lios_pipeline_runs (run_at DESC);

COMMENT ON TABLE public.lios_pipeline_runs IS
    'One row per execution of lios_run_pipeline(). Provides observable proof the scheduled pipeline is healthy and producing the expected throughput.';

ALTER TABLE public.lios_pipeline_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated select lios_pipeline_runs"
    ON public.lios_pipeline_runs;
CREATE POLICY "Authenticated select lios_pipeline_runs"
    ON public.lios_pipeline_runs FOR SELECT TO authenticated USING (true);

-- ── 2. The orchestrator ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lios_run_pipeline(
    p_lookback interval DEFAULT '15 minutes'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_started_at timestamptz := clock_timestamp();
    v_run_id     bigint;

    v_trust    record;
    v_elo      record;
    v_mastery  record;
    v_friction record;

    v_error_message text := NULL;
BEGIN
    -- 1. Trust scoring
    BEGIN
        SELECT * INTO v_trust
        FROM public.lios_score_unscored_attempts(p_lookback);
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') ||
            'trust=' || SQLERRM || '; ';
        v_trust := ROW(NULL, NULL, NULL, NULL)::record;
    END;

    -- 2. Elo update
    BEGIN
        SELECT * INTO v_elo
        FROM public.lios_update_elo_v1(p_lookback);
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') ||
            'elo=' || SQLERRM || '; ';
        v_elo := ROW(NULL, NULL, NULL)::record;
    END;

    -- 3. Mastery state-machine
    BEGIN
        SELECT * INTO v_mastery
        FROM public.lios_detect_mastery_episodes_v1();
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') ||
            'mastery=' || SQLERRM || '; ';
        v_mastery := ROW(NULL, NULL, NULL)::record;
    END;

    -- 4. Friction detectors (looks at sessions independently)
    BEGIN
        SELECT * INTO v_friction
        FROM public.lios_detect_friction_v1(p_lookback);
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') ||
            'friction=' || SQLERRM || '; ';
        v_friction := ROW(NULL, NULL, NULL)::record;
    END;

    -- Record the run
    INSERT INTO lios_pipeline_runs (
        run_at, duration_ms,
        trust_scored, trust_tier_a, trust_tier_b, trust_tier_c,
        elo_processed, elo_distinct_learners, elo_distinct_items,
        mastery_pairs, mastery_transitions, mastery_by_state,
        friction_sessions, friction_detectors_fired, friction_by_detector,
        error_message
    ) VALUES (
        v_started_at,
        EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started_at))::int +
            EXTRACT(SECOND   FROM (clock_timestamp() - v_started_at))::int * 1000,
        (v_trust).scored_rows, (v_trust).tier_a, (v_trust).tier_b, (v_trust).tier_c,
        (v_elo).processed_attempts, (v_elo).distinct_learners, (v_elo).distinct_items,
        (v_mastery).pairs_processed, (v_mastery).transitions_emitted, (v_mastery).by_to_state,
        (v_friction).sessions_processed, (v_friction).detectors_fired, (v_friction).by_detector,
        v_error_message
    ) RETURNING id INTO v_run_id;

    RETURN jsonb_build_object(
        'run_id',   v_run_id,
        'ok',       v_error_message IS NULL,
        'started',  v_started_at,
        'duration_ms', EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started_at))::int +
                       EXTRACT(SECOND   FROM (clock_timestamp() - v_started_at))::int * 1000,
        'trust',    jsonb_build_object(
            'scored', (v_trust).scored_rows,
            'tier_a', (v_trust).tier_a,
            'tier_b', (v_trust).tier_b,
            'tier_c', (v_trust).tier_c
        ),
        'elo',      jsonb_build_object(
            'processed',         (v_elo).processed_attempts,
            'distinct_learners', (v_elo).distinct_learners,
            'distinct_items',    (v_elo).distinct_items
        ),
        'mastery',  jsonb_build_object(
            'pairs_processed',    (v_mastery).pairs_processed,
            'transitions_emitted',(v_mastery).transitions_emitted,
            'by_state',           (v_mastery).by_to_state
        ),
        'friction', jsonb_build_object(
            'sessions_processed', (v_friction).sessions_processed,
            'detectors_fired',    (v_friction).detectors_fired,
            'by_detector',        (v_friction).by_detector
        ),
        'error',    v_error_message
    );
END;
$fn$;

COMMENT ON FUNCTION public.lios_run_pipeline(interval) IS
    'LIOS scheduled pipeline orchestrator. Runs Trust → Elo → Mastery → Friction in dependency order, isolates failures so a single failing stage does not abort the rest, writes a row to lios_pipeline_runs for observability.';

REVOKE ALL ON FUNCTION public.lios_run_pipeline(interval) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lios_run_pipeline(interval)
    TO authenticated, service_role;

-- ── 3. The schedule ────────────────────────────────────────────────
--
-- Every 5 minutes, 15-minute lookback (3x overlap protection). Idempotent
-- functions absorb the overlap as no-ops. Unschedule any prior job with
-- the same name so re-running the migration is safe.

DO $$
BEGIN
    -- Remove any prior LIOS pipeline schedule
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'lios-pipeline-every-5min';
END $$;

SELECT cron.schedule(
    'lios-pipeline-every-5min',
    '*/5 * * * *',
    $$SELECT public.lios_run_pipeline('15 minutes'::interval);$$
);

-- ── 4. Engineering observability RPC ──────────────────────────────

CREATE OR REPLACE FUNCTION public.dashboard_pipeline_status(
    in_limit int DEFAULT 20
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
    WITH recent AS (
        SELECT * FROM lios_pipeline_runs
        ORDER BY run_at DESC
        LIMIT in_limit
    ),
    last_24h AS (
        SELECT
            count(*) AS runs,
            count(*) FILTER (WHERE error_message IS NOT NULL) AS failed,
            sum(trust_scored)        AS total_trust_scored,
            sum(elo_processed)       AS total_elo_processed,
            sum(mastery_transitions) AS total_mastery_transitions,
            sum(friction_detectors_fired) AS total_friction_fires,
            round(avg(duration_ms)::numeric, 0) AS avg_duration_ms,
            max(duration_ms)         AS max_duration_ms
        FROM lios_pipeline_runs
        WHERE run_at > now() - interval '24 hours'
    ),
    cron_job AS (
        SELECT jobid, jobname, schedule, active, command
        FROM cron.job
        WHERE jobname = 'lios-pipeline-every-5min'
    )
    SELECT jsonb_build_object(
        'as_of', now(),
        'cron_job',    (SELECT row_to_json(c) FROM cron_job c),
        'last_24h',    (SELECT row_to_json(l) FROM last_24h l),
        'recent_runs', COALESCE((
            SELECT jsonb_agg(row_to_json(r) ORDER BY run_at DESC)
            FROM recent r
        ), '[]'::jsonb)
    );
$fn$;

COMMENT ON FUNCTION public.dashboard_pipeline_status(int) IS
    'LIOS scheduled pipeline status: cron job state, last-24h throughput, recent run rows. Engineering observability for Trust/Elo/Mastery/Friction pipeline health.';

REVOKE ALL ON FUNCTION public.dashboard_pipeline_status(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_pipeline_status(int) TO authenticated;
