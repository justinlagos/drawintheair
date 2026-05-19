-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 3 — Learner Progression RPCs
-- ═══════════════════════════════════════════════════════════════════
--
-- Backs the new Progression tab (Document A §7.1 Learner Progression
-- Dashboard, v1 scope).
--
--   1. dashboard_progression_top_learners
--        — Most-active pseudonymous learners. Used by the picker
--          at the top of the Progression tab. Includes the current
--          count of items Mastered per learner.
--   2. dashboard_progression_for_learner
--        — Full per-learner profile for the selected device_id:
--          summary stats, mastery state totals, top-practised items,
--          θ-over-time trajectories from skill_state_history, recent
--          mastery transitions, and recent attempts.
--
-- Both RPCs are SECURITY DEFINER + authenticated-only (the admin
-- allow-list gates access at the React layer).

CREATE OR REPLACE FUNCTION public.dashboard_progression_top_learners(
    in_days  int DEFAULT 30,
    in_limit int DEFAULT 25
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
    WITH activity AS (
        SELECT
            a.device_id,
            count(*)::int                              AS n_attempts,
            count(DISTINCT a.item_key || '|' || a.game_mode)::int AS n_distinct_items,
            count(DISTINCT a.session_id)::int          AS n_sessions,
            min(a.occurred_at)                         AS first_seen,
            max(a.occurred_at)                         AS last_seen,
            avg(a.was_correct::int)::numeric(4, 3)     AS accuracy,
            (array_agg(a.age_band) FILTER (WHERE a.age_band IS NOT NULL))[1] AS age_band
        FROM learning_attempts a
        WHERE a.device_id IS NOT NULL
          AND a.occurred_at > now() - (in_days || ' days')::interval
        GROUP BY a.device_id
    ),
    with_mastery AS (
        SELECT
            ac.*,
            (
                SELECT count(*)
                FROM (
                    SELECT DISTINCT ON (m.device_id, m.item_key, m.game_mode)
                        m.to_state
                    FROM mastery_episode_fact m
                    WHERE m.device_id = ac.device_id
                    ORDER BY m.device_id, m.item_key, m.game_mode, m.transition_at DESC
                ) latest
                WHERE latest.to_state = 'Mastered'
            )::int AS n_mastered
        FROM activity ac
    )
    SELECT jsonb_build_object(
        'days', in_days, 'limit', in_limit, 'as_of', now(),
        'learners', COALESCE((
            SELECT jsonb_agg(row_to_json(w) ORDER BY n_attempts DESC)
            FROM (
                SELECT * FROM with_mastery
                ORDER BY n_attempts DESC
                LIMIT in_limit
            ) w
        ), '[]'::jsonb)
    );
$fn$;

REVOKE ALL ON FUNCTION public.dashboard_progression_top_learners(int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_progression_top_learners(int, int) TO authenticated;


CREATE OR REPLACE FUNCTION public.dashboard_progression_for_learner(
    in_device_id text
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
    WITH summary AS (
        SELECT
            count(*)::int                                    AS n_attempts,
            count(DISTINCT item_key || '|' || game_mode)::int AS n_distinct_items,
            count(DISTINCT session_id)::int                  AS n_sessions,
            min(occurred_at)                                 AS first_seen,
            max(occurred_at)                                 AS last_seen,
            avg(was_correct::int)::numeric(4, 3)             AS accuracy,
            avg(credibility_score)::numeric(4, 3)            AS mean_credibility,
            (array_agg(age_band) FILTER (WHERE age_band IS NOT NULL))[1] AS age_band
        FROM learning_attempts
        WHERE device_id = in_device_id
    ),
    current_states AS (
        SELECT DISTINCT ON (device_id, item_key, game_mode)
            item_key, game_mode, to_state AS current_state
        FROM mastery_episode_fact
        WHERE device_id = in_device_id
        ORDER BY device_id, item_key, game_mode, transition_at DESC
    ),
    state_totals AS (
        SELECT
            count(*) FILTER (WHERE current_state = 'Exposed')  AS exposed,
            count(*) FILTER (WHERE current_state = 'Acquired') AS acquired,
            count(*) FILTER (WHERE current_state = 'Mastered') AS mastered,
            count(*) FILTER (WHERE current_state = 'Decayed')  AS decayed,
            count(*)                                           AS total_pairs
        FROM current_states
    ),
    top_items AS (
        SELECT item_key, game_mode, n_attempts FROM skill_state
        WHERE device_id = in_device_id
        ORDER BY n_attempts DESC, last_attempt_at DESC
        LIMIT 6
    ),
    trajectories AS (
        SELECT
            h.item_key, h.game_mode,
            jsonb_agg(jsonb_build_object(
                'day', h.day,
                'theta', h.theta,
                'n_attempts', h.n_attempts
            ) ORDER BY h.day) AS series
        FROM skill_state_history h
        JOIN top_items t USING (item_key, game_mode)
        WHERE h.device_id = in_device_id
        GROUP BY h.item_key, h.game_mode
    ),
    transitions AS (
        SELECT item_key, game_mode, from_state, to_state, transition_at, evidence
        FROM mastery_episode_fact
        WHERE device_id = in_device_id
        ORDER BY transition_at DESC
        LIMIT 25
    ),
    recent_attempts AS (
        SELECT a.occurred_at, a.game_mode, a.item_key, a.was_correct,
               a.ms_to_attempt, a.credibility_score, a.credibility_tier
        FROM learning_attempts a
        WHERE a.device_id = in_device_id
        ORDER BY a.occurred_at DESC
        LIMIT 20
    )
    SELECT jsonb_build_object(
        'device_id', in_device_id, 'as_of', now(),
        'summary',  (SELECT row_to_json(s) FROM summary s),
        'state_totals', (SELECT row_to_json(st) FROM state_totals st),
        'top_items', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM top_items t), '[]'::jsonb),
        'trajectories', COALESCE((SELECT jsonb_agg(row_to_json(tr)) FROM trajectories tr), '[]'::jsonb),
        'transitions', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM transitions t), '[]'::jsonb),
        'recent_attempts', COALESCE((SELECT jsonb_agg(row_to_json(r)) FROM recent_attempts r), '[]'::jsonb)
    );
$fn$;

REVOKE ALL ON FUNCTION public.dashboard_progression_for_learner(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_progression_for_learner(text) TO authenticated;
