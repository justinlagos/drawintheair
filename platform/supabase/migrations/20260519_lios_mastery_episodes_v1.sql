-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 2 Day 3 — Mastery Episodes v1 (state machine)
-- ═══════════════════════════════════════════════════════════════════
--
-- Document A §4.4 four-state model:
--
--   Exposed  ─ has attempted, not yet meeting acquisition criteria
--   Acquired ─ recent accuracy + θ > b, but not yet stable across time
--   Mastered ─ Acquired + multi-session evidence + days elapsed
--   Decayed  ─ was Mastered, recent accuracy dropped below threshold
--
-- v1 calibration (Document A §5.2-5.5):
--
--   Acquisition (per age band, on last 6 credible attempts):
--     4-5    accuracy ≥ 0.65
--     6-7    accuracy ≥ 0.75
--     8-9    accuracy ≥ 0.80
--     10-11  accuracy ≥ 0.80
--     12+    accuracy ≥ 0.85
--     NULL   accuracy ≥ 0.75
--   AND n_credible_attempts ≥ 6
--   AND θ > b   (the learner is above the item's difficulty)
--
--   Mastery: Acquired criteria + distinct_sessions ≥ 2 +
--            days_active ≥ 1 (any retention signal)
--
--   Decay: was previously Mastered AND last-5 raw accuracy < 0.60
--
-- The function is idempotent — only emits a transition row when the
-- newly-computed state differs from the most recently recorded state
-- for that (learner, item, mode) tuple. Re-running on unchanged data
-- emits zero new rows.

-- ── 1. mastery_episode_fact ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mastery_episode_fact (
    id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       text          NOT NULL,
    item_key        text          NOT NULL,
    game_mode       text          NOT NULL,
    from_state      text,
    to_state        text          NOT NULL,
    transition_at   timestamptz   NOT NULL DEFAULT now(),
    age_band        text,
    theta_at_event  numeric(6, 3),
    b_at_event      numeric(6, 3),
    evidence        jsonb         NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT mastery_episode_to_state_check
        CHECK (to_state IN ('Exposed', 'Acquired', 'Mastered', 'Decayed')),
    CONSTRAINT mastery_episode_from_state_check
        CHECK (from_state IS NULL
               OR from_state IN ('Exposed', 'Acquired', 'Mastered', 'Decayed'))
);

CREATE INDEX IF NOT EXISTS mastery_episode_learner_idx
    ON public.mastery_episode_fact (device_id, item_key, game_mode, transition_at DESC);
CREATE INDEX IF NOT EXISTS mastery_episode_state_idx
    ON public.mastery_episode_fact (to_state, transition_at DESC);
CREATE INDEX IF NOT EXISTS mastery_episode_time_idx
    ON public.mastery_episode_fact (transition_at DESC);

ALTER TABLE public.mastery_episode_fact ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated select mastery_episode_fact"
    ON public.mastery_episode_fact;
CREATE POLICY "Authenticated select mastery_episode_fact"
    ON public.mastery_episode_fact FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.mastery_episode_fact IS
    'LIOS state-transition log. Append-only. One row per (learner, item, mode, state) transition. Powers progression timelines and the headline "X items mastered" metric.';

-- ── 2. The state-machine function ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.lios_detect_mastery_episodes_v1()
RETURNS TABLE(
    pairs_processed    bigint,
    transitions_emitted bigint,
    by_to_state        jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_pairs       bigint := 0;
    v_emitted     bigint := 0;
    v_by_state    jsonb;
BEGIN
    -- Score every (learner, item, mode) in skill_state, compare to
    -- the most recent recorded state, and INSERT a transition row
    -- if the state changed.
    WITH current_state AS (
        SELECT
            s.device_id,
            s.item_key,
            s.game_mode,
            s.age_band,
            s.theta,
            s.n_attempts,
            s.n_credible_attempts,
            i.b,
            -- Last-6 credible accuracy (the acquisition signal)
            (SELECT avg(was_correct::int)
             FROM (
                SELECT was_correct
                FROM learning_attempts
                WHERE device_id = s.device_id
                  AND item_key  = s.item_key
                  AND game_mode = s.game_mode
                  AND credibility_score >= 0.4
                ORDER BY occurred_at DESC
                LIMIT 6
             ) x) AS last6_acc,
            -- Last-5 raw accuracy (the decay signal)
            (SELECT avg(was_correct::int)
             FROM (
                SELECT was_correct
                FROM learning_attempts
                WHERE device_id = s.device_id
                  AND item_key  = s.item_key
                  AND game_mode = s.game_mode
                ORDER BY occurred_at DESC
                LIMIT 5
             ) x) AS last5_acc,
            (SELECT count(DISTINCT session_id)
             FROM learning_attempts
             WHERE device_id = s.device_id
               AND item_key  = s.item_key
               AND game_mode = s.game_mode) AS distinct_sessions,
            (SELECT EXTRACT(EPOCH FROM (now() - min(occurred_at)))/86400
             FROM learning_attempts
             WHERE device_id = s.device_id
               AND item_key  = s.item_key
               AND game_mode = s.game_mode) AS days_active
        FROM skill_state s
        LEFT JOIN item_difficulty i USING (item_key, game_mode)
    ),
    scored AS (
        SELECT
            cs.*,
            -- Age-band accuracy threshold for Acquired/Mastered
            CASE cs.age_band
                WHEN '4-5'   THEN 0.65
                WHEN '6-7'   THEN 0.75
                WHEN '8-9'   THEN 0.80
                WHEN '10-11' THEN 0.80
                WHEN '12+'   THEN 0.85
                ELSE              0.75
            END AS acc_threshold
        FROM current_state cs
    ),
    classified AS (
        SELECT
            s.*,
            -- Most recent recorded state for this pair (NULL if never seen)
            (SELECT to_state FROM mastery_episode_fact m
             WHERE m.device_id = s.device_id
               AND m.item_key  = s.item_key
               AND m.game_mode = s.game_mode
             ORDER BY m.transition_at DESC
             LIMIT 1) AS previous_state,
            -- Has this pair EVER been Mastered? (for decay detection)
            EXISTS (
                SELECT 1 FROM mastery_episode_fact m
                WHERE m.device_id = s.device_id
                  AND m.item_key  = s.item_key
                  AND m.game_mode = s.game_mode
                  AND m.to_state  = 'Mastered'
            ) AS ever_mastered,
            CASE
                -- Decay check first (only if was previously Mastered)
                WHEN EXISTS (
                    SELECT 1 FROM mastery_episode_fact m
                    WHERE m.device_id = s.device_id
                      AND m.item_key  = s.item_key
                      AND m.game_mode = s.game_mode
                      AND m.to_state  = 'Mastered'
                ) AND COALESCE(s.last5_acc, 0) < 0.60 THEN 'Decayed'

                -- Mastered: Acquired criteria + multi-session + day-elapsed
                WHEN s.n_credible_attempts >= 6
                     AND COALESCE(s.last6_acc, 0) >= s.acc_threshold
                     AND s.theta > COALESCE(s.b, 0)
                     AND s.distinct_sessions >= 2
                     AND s.days_active >= 1 THEN 'Mastered'

                -- Acquired
                WHEN s.n_credible_attempts >= 6
                     AND COALESCE(s.last6_acc, 0) >= s.acc_threshold
                     AND s.theta > COALESCE(s.b, 0) THEN 'Acquired'

                -- Default
                ELSE 'Exposed'
            END AS current_state
        FROM scored s
    ),
    transitions AS (
        SELECT *
        FROM classified
        WHERE current_state IS DISTINCT FROM previous_state
    ),
    inserted AS (
        INSERT INTO mastery_episode_fact (
            device_id, item_key, game_mode,
            from_state, to_state, transition_at,
            age_band, theta_at_event, b_at_event, evidence
        )
        SELECT
            t.device_id, t.item_key, t.game_mode,
            t.previous_state, t.current_state, now(),
            t.age_band,
            t.theta::numeric(6, 3),
            t.b::numeric(6, 3),
            jsonb_build_object(
                'n_attempts',           t.n_attempts,
                'n_credible_attempts',  t.n_credible_attempts,
                'last6_accuracy',       round(COALESCE(t.last6_acc, 0)::numeric, 3),
                'last5_accuracy',       round(COALESCE(t.last5_acc, 0)::numeric, 3),
                'distinct_sessions',    t.distinct_sessions,
                'days_active',          round(t.days_active::numeric, 2),
                'acc_threshold',        t.acc_threshold,
                'theta_minus_b',        round((t.theta - COALESCE(t.b, 0))::numeric, 3),
                'ever_mastered',        t.ever_mastered
            )
        FROM transitions t
        RETURNING to_state
    )
    SELECT
        (SELECT count(*) FROM classified),
        (SELECT count(*) FROM inserted),
        (SELECT jsonb_object_agg(to_state, n)
         FROM (SELECT to_state, count(*) AS n FROM inserted GROUP BY to_state) g)
    INTO v_pairs, v_emitted, v_by_state;

    RETURN QUERY SELECT v_pairs, v_emitted, COALESCE(v_by_state, '{}'::jsonb);
END;
$fn$;

COMMENT ON FUNCTION public.lios_detect_mastery_episodes_v1() IS
    'LIOS Sprint 2 mastery state-machine. Idempotent — only emits a row when the computed state differs from the most-recent recorded state.';

REVOKE ALL ON FUNCTION public.lios_detect_mastery_episodes_v1() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lios_detect_mastery_episodes_v1()
    TO authenticated, service_role;

-- ── 3. dashboard_mastery_v2 RPC ───────────────────────────────────
--
-- The new four-state vocabulary. Returns:
--   • totals       — current head-state count across all pairs
--   • by_state_mode  — count per (current state, game_mode)
--   • recent_transitions — last 20 transition rows
--   • by_age_state — count per (age_band, state)

CREATE OR REPLACE FUNCTION public.dashboard_mastery_v2(
    in_days int DEFAULT 30
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
    WITH latest AS (
        SELECT DISTINCT ON (device_id, item_key, game_mode)
            device_id, item_key, game_mode, to_state AS current_state,
            transition_at, age_band, theta_at_event, b_at_event
        FROM mastery_episode_fact
        ORDER BY device_id, item_key, game_mode, transition_at DESC
    ),
    totals AS (
        SELECT
            count(*) FILTER (WHERE current_state = 'Exposed')  AS exposed,
            count(*) FILTER (WHERE current_state = 'Acquired') AS acquired,
            count(*) FILTER (WHERE current_state = 'Mastered') AS mastered,
            count(*) FILTER (WHERE current_state = 'Decayed')  AS decayed,
            count(*)                                           AS total_pairs
        FROM latest
    ),
    by_state_mode AS (
        SELECT game_mode, current_state, count(*)::int AS n
        FROM latest
        WHERE game_mode IS NOT NULL
        GROUP BY game_mode, current_state
    ),
    by_age_state AS (
        SELECT age_band, current_state, count(*)::int AS n
        FROM latest
        WHERE age_band IS NOT NULL
        GROUP BY age_band, current_state
    ),
    recent_transitions AS (
        SELECT device_id, item_key, game_mode,
               from_state, to_state, transition_at,
               age_band, evidence
        FROM mastery_episode_fact
        WHERE transition_at > now() - (in_days || ' days')::interval
        ORDER BY transition_at DESC
        LIMIT 20
    ),
    top_mastered_items AS (
        SELECT item_key, game_mode, count(*)::int AS n_learners
        FROM latest
        WHERE current_state = 'Mastered'
        GROUP BY item_key, game_mode
        ORDER BY n_learners DESC
        LIMIT 15
    )
    SELECT jsonb_build_object(
        'days',  in_days,
        'as_of', now(),
        'totals', (SELECT row_to_json(t) FROM totals t),
        'by_state_mode',   COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_state_mode b), '[]'::jsonb),
        'by_age_state',    COALESCE((SELECT jsonb_agg(row_to_json(a)) FROM by_age_state a), '[]'::jsonb),
        'recent_transitions', COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY transition_at DESC) FROM recent_transitions r), '[]'::jsonb),
        'top_mastered',    COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM top_mastered_items t), '[]'::jsonb)
    );
$fn$;

COMMENT ON FUNCTION public.dashboard_mastery_v2(int) IS
    'LIOS four-state mastery RPC. Returns Exposed/Acquired/Mastered/Decayed counts, per-mode and per-age breakdowns, recent transitions, top mastered items.';

REVOKE ALL ON FUNCTION public.dashboard_mastery_v2(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_mastery_v2(int) TO authenticated;
