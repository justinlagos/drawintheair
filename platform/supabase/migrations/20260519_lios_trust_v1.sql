-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 2 — Trust v1: rule-based attempt credibility
-- ═══════════════════════════════════════════════════════════════════
--
-- Every attempt now carries a credibility score in [0, 1] derived from
-- signals already in the event stream (no new client instrumentation).
-- Scores bucket into three tiers:
--
--   Tier A  ≥ 0.80   Full credibility. Used in every claim.
--   Tier B  0.40–0.80 Reduced weight. Excluded from external efficacy.
--   Tier C  < 0.40   Quarantined. Never updates skill ratings.
--
-- This is the single feature that protects the entire measurement
-- layer from quiet pollution: a child waving randomly, a tab in the
-- background mid-attempt, an adult-assisted attempt, a multi-hand
-- classroom moment — each lowers credibility automatically and the
-- Elo / mastery layer downstream can weight by it.
--
-- Rules in v1 (each is multiplicative penalty applied to base 1.0):
--
--   R1  ms_to_attempt plausibility (age-band-aware)
--         NULL                          -0.10
--         <300ms (below reflex floor)    -0.30
--         >age_band_ceiling             -0.20
--           4-5: 12s, 6-7: 10s, 8-9: 15s, 10-11: 15s, 12+: 8s, NULL: 12s
--
--   R2  tab_hidden event within 10s before the attempt (child
--       wasn't looking at the screen)   -0.30
--
--   R3  stuck_detected event within 60s before the attempt
--       (child was disengaged)          -0.10
--
--   R4  two_hands_detected at any point in the session before this
--       attempt (someone else in frame) -0.20
--
-- Final score = clamp(1.0 + Σ penalties, 0, 1)
-- Tier        = A | B | C from the cuts above
--
-- Thresholds were calibrated from the live distribution on
-- 2026-05-19 (5,435 attempts over 30 days, p95 timings per age band).
-- They live in the function body so they're versioned with this
-- migration; v2 will move them into a thresholds config table.

-- ── 1. Schema columns ──────────────────────────────────────────────

ALTER TABLE public.learning_attempts
    ADD COLUMN IF NOT EXISTS credibility_score      numeric(3, 2),
    ADD COLUMN IF NOT EXISTS credibility_tier       text,
    ADD COLUMN IF NOT EXISTS credibility_reasons    jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS credibility_scored_at  timestamptz;

-- Constraint: keep tier and score honest if anything ever bypasses
-- the scoring function.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'learning_attempts_credibility_score_range'
    ) THEN
        ALTER TABLE public.learning_attempts
            ADD CONSTRAINT learning_attempts_credibility_score_range
            CHECK (credibility_score IS NULL
                   OR (credibility_score >= 0 AND credibility_score <= 1));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'learning_attempts_credibility_tier_check'
    ) THEN
        ALTER TABLE public.learning_attempts
            ADD CONSTRAINT learning_attempts_credibility_tier_check
            CHECK (credibility_tier IS NULL
                   OR credibility_tier IN ('A','B','C'));
    END IF;
END $$;

-- Index for the sweep-the-unscored job (fast partial index)
CREATE INDEX IF NOT EXISTS learning_attempts_unscored_idx
    ON public.learning_attempts (occurred_at DESC)
    WHERE credibility_score IS NULL;

-- Index for the trust-composition dashboard queries
CREATE INDEX IF NOT EXISTS learning_attempts_tier_idx
    ON public.learning_attempts (credibility_tier, occurred_at DESC)
    WHERE credibility_tier IS NOT NULL;

COMMENT ON COLUMN public.learning_attempts.credibility_score IS
    'LIOS Trust v1 attempt credibility in [0,1]. NULL means the row has not been scored yet (the scorer is a deferred batch job, not a trigger). Down-weighted attempts must still surface in product analytics but are quarantined from external efficacy claims when score < 0.6.';
COMMENT ON COLUMN public.learning_attempts.credibility_tier IS
    'Trust tier derived from credibility_score: A (>=0.80) full, B (0.40-0.80) reduced, C (<0.40) quarantined.';
COMMENT ON COLUMN public.learning_attempts.credibility_reasons IS
    'JSON array of rule codes that fired, e.g. ["tab_hidden_during_window","timing_distraction"]. Audit trail — every credibility decision exports its inputs.';
COMMENT ON COLUMN public.learning_attempts.credibility_scored_at IS
    'When the scorer last ran on this row. Lets future calibration jobs re-score only rows scored under older threshold versions.';

-- ── 2. Bulk scorer function ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lios_score_unscored_attempts(
    p_lookback interval DEFAULT '24 hours'
) RETURNS TABLE(
    scored_rows bigint,
    tier_a      bigint,
    tier_b      bigint,
    tier_c      bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_scored bigint;
    v_a      bigint;
    v_b      bigint;
    v_c      bigint;
BEGIN
    WITH scoring AS (
        SELECT
            a.id,
            a.age_band,
            a.ms_to_attempt,
            a.session_id,
            a.occurred_at,
            EXISTS (
                SELECT 1 FROM analytics_events e
                WHERE e.session_id = a.session_id
                  AND e.event_name = 'tab_hidden'
                  AND e.occurred_at
                      BETWEEN a.occurred_at - interval '10 seconds'
                      AND a.occurred_at
            ) AS tab_hidden_recent,
            EXISTS (
                SELECT 1 FROM analytics_events e
                WHERE e.session_id = a.session_id
                  AND e.event_name = 'stuck_detected'
                  AND e.occurred_at
                      BETWEEN a.occurred_at - interval '60 seconds'
                      AND a.occurred_at
            ) AS stuck_recent,
            EXISTS (
                SELECT 1 FROM analytics_events e
                WHERE e.session_id = a.session_id
                  AND e.event_name = 'two_hands_detected'
                  AND e.occurred_at <= a.occurred_at
            ) AS two_hands_seen
        FROM learning_attempts a
        WHERE a.credibility_score IS NULL
          AND a.occurred_at > now() - p_lookback
    ),
    computed AS (
        SELECT
            s.id,
            -- R1: ms_to_attempt plausibility
            CASE
                WHEN s.ms_to_attempt IS NULL THEN -0.10
                WHEN s.ms_to_attempt < 300  THEN -0.30
                WHEN s.ms_to_attempt > CASE s.age_band
                    WHEN '4-5'   THEN 12000
                    WHEN '6-7'   THEN 10000
                    WHEN '8-9'   THEN 15000
                    WHEN '10-11' THEN 15000
                    WHEN '12+'   THEN  8000
                    ELSE              12000
                END                       THEN -0.20
                ELSE 0
            END AS p1_timing,
            -- R2 / R3 / R4 multiplicative penalties
            CASE WHEN s.tab_hidden_recent THEN -0.30 ELSE 0 END AS p2_tab,
            CASE WHEN s.stuck_recent      THEN -0.10 ELSE 0 END AS p3_stuck,
            CASE WHEN s.two_hands_seen    THEN -0.20 ELSE 0 END AS p4_hands,
            -- Reasons audit
            array_remove(ARRAY[
                CASE WHEN s.ms_to_attempt IS NULL              THEN 'timing_missing'              END,
                CASE WHEN s.ms_to_attempt < 300                THEN 'timing_reflex_floor'         END,
                CASE WHEN s.ms_to_attempt > CASE s.age_band
                    WHEN '4-5'   THEN 12000 WHEN '6-7'  THEN 10000
                    WHEN '8-9'   THEN 15000 WHEN '10-11' THEN 15000
                    WHEN '12+'   THEN  8000 ELSE          12000 END
                                                               THEN 'timing_distraction'         END,
                CASE WHEN s.tab_hidden_recent                  THEN 'tab_hidden_during_window'   END,
                CASE WHEN s.stuck_recent                       THEN 'stuck_recent'               END,
                CASE WHEN s.two_hands_seen                     THEN 'two_hands_session'          END
            ], NULL) AS reasons
        FROM scoring s
    ),
    finalised AS (
        SELECT
            id,
            GREATEST(
                0::numeric,
                LEAST(
                    1::numeric,
                    1.0 + p1_timing + p2_tab + p3_stuck + p4_hands
                )
            )::numeric(3, 2) AS score,
            reasons
        FROM computed
    )
    UPDATE learning_attempts la
    SET credibility_score  = f.score,
        credibility_tier   = CASE
                                 WHEN f.score >= 0.80 THEN 'A'
                                 WHEN f.score >= 0.40 THEN 'B'
                                 ELSE                       'C'
                             END,
        credibility_reasons   = to_jsonb(f.reasons),
        credibility_scored_at = now()
    FROM finalised f
    WHERE la.id = f.id;

    GET DIAGNOSTICS v_scored = ROW_COUNT;

    SELECT
        count(*) FILTER (WHERE credibility_tier = 'A'),
        count(*) FILTER (WHERE credibility_tier = 'B'),
        count(*) FILTER (WHERE credibility_tier = 'C')
    INTO v_a, v_b, v_c
    FROM learning_attempts
    WHERE credibility_scored_at > now() - interval '1 minute';

    RETURN QUERY SELECT v_scored, v_a, v_b, v_c;
END;
$fn$;

COMMENT ON FUNCTION public.lios_score_unscored_attempts(interval) IS
    'LIOS Trust v1 batch scorer. Scores every learning_attempts row written in the lookback window that does not yet have a credibility score. Idempotent — re-running won''t re-score already-scored rows.';

-- Lock down execution: service_role and authenticated only. The
-- anon role (in-app client) should not be invoking this.
REVOKE ALL ON FUNCTION public.lios_score_unscored_attempts(interval) FROM public;
REVOKE ALL ON FUNCTION public.lios_score_unscored_attempts(interval) FROM anon;
GRANT EXECUTE ON FUNCTION public.lios_score_unscored_attempts(interval) TO authenticated, service_role;

-- ── 3. Dashboard view ──────────────────────────────────────────────

CREATE OR REPLACE VIEW public.dashboard_trust_composition AS
SELECT
    date_trunc('day', occurred_at)         AS day,
    game_mode,
    context,
    credibility_tier,
    count(*)                               AS n,
    avg(credibility_score)::numeric(3, 2)  AS mean_score
FROM public.learning_attempts
WHERE credibility_tier IS NOT NULL
GROUP BY 1, 2, 3, 4;

COMMENT ON VIEW public.dashboard_trust_composition IS
    'LIOS Trust v1 composition strip. The view every dashboard chart hangs underneath so audiences can audit the data-quality mix behind the chart they''re looking at.';

GRANT SELECT ON public.dashboard_trust_composition TO authenticated;
