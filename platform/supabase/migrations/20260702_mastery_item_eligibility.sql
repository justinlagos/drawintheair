-- ═══════════════════════════════════════════════════════════════════
-- Mastery item eligibility — curriculum skills only
-- ═══════════════════════════════════════════════════════════════════
--
-- STATUS: NOT YET APPLIED. Validate on a Supabase preview branch before
-- applying to production. Independent of 20260626_analytics_traffic_type
-- and 20260626_metric_definition_fixes (no ordering requirement), but
-- ships in the same approval batch.
--
-- PROBLEM (verified in the 2026-07-02 lios-v1 export): the WIN_EVENTS
-- mirror in src/lib/analytics.ts falls back to the EVENT NAME as
-- item_key when an event carries no content meta. Technical events
-- (mode_completed, stage_completed, bubblepop_round_complete,
-- balloonmath_balloon_popped, rainbowbridge_match_made, …) therefore
-- enter learning_attempts as always-correct "attempts", flow into
-- skill_state, and the mastery state machine promotes them exactly like
-- curriculum skills. 32 of 52 (61.5%) "strong" states and a material
-- share of the "81 mastered skills" headline are such technical events,
-- overstating learning evidence.
--
-- FIX (read-path + detection, non-destructive):
--   1. lios_is_technical_item_key(text) — canonical eligibility test.
--   2. lios_detect_mastery_episodes_v1 — stops emitting NEW transitions
--      for technical item_keys.
--   3. dashboard_mastery_v2 — excludes technical keys from all counts,
--      so historical technical facts stop inflating dashboards.
--   4. dashboard_export_headline — mastered_skills counts curriculum
--      pairs only, and is explicitly labelled as learner-item states.
--
-- Historical mastery_episode_fact rows for technical keys are KEPT
-- (append-only audit table); they are excluded at read time. A separate
-- reviewed backfill may archive them later if ever needed.
--
-- The client counterpart (same change set) stamps meta._item_kind =
-- 'technical' | 'content' on every mirrored learning_attempts row so
-- future audits do not depend on this denylist alone.

-- ── 1. Eligibility helper ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lios_is_technical_item_key(k text)
RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $fn$
    SELECT k IS NULL
        OR k ~ '^(mode|stage|session)_'          -- mode_completed, stage_completed, …
        OR k = ANY (ARRAY[
            'bubblepop_round_complete',
            'balloonmath_balloon_popped',
            'rainbowbridge_match_made',
            'colourbuilder_match_made',
            'wordsearch_word_found',
            'wordsearch_level_complete',
            'spellingstars_word_complete',
            'build_object_completed',
            'successful_snap',
            'tracing_letter_completed'
        ]);
$fn$;

COMMENT ON FUNCTION public.lios_is_technical_item_key(text) IS
    'TRUE when an item_key is a technical/engagement event name rather than a curriculum or content skill. Technical keys are excluded from mastery detection and mastery dashboards.';

-- ── 2. Detection: stop promoting technical keys ────────────────────
-- Byte-for-byte the 20260519 body with ONE added predicate on the
-- current_state CTE (marked ★).

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
        WHERE NOT public.lios_is_technical_item_key(s.item_key)   -- ★ eligibility
    ),
    scored AS (
        SELECT
            cs.*,
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
            (SELECT to_state FROM mastery_episode_fact m
             WHERE m.device_id = s.device_id
               AND m.item_key  = s.item_key
               AND m.game_mode = s.game_mode
             ORDER BY m.transition_at DESC
             LIMIT 1) AS previous_state,
            EXISTS (
                SELECT 1 FROM mastery_episode_fact m
                WHERE m.device_id = s.device_id
                  AND m.item_key  = s.item_key
                  AND m.game_mode = s.game_mode
                  AND m.to_state  = 'Mastered'
            ) AS ever_mastered,
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM mastery_episode_fact m
                    WHERE m.device_id = s.device_id
                      AND m.item_key  = s.item_key
                      AND m.game_mode = s.game_mode
                      AND m.to_state  = 'Mastered'
                ) AND COALESCE(s.last5_acc, 0) < 0.60 THEN 'Decayed'

                WHEN s.n_credible_attempts >= 6
                     AND COALESCE(s.last6_acc, 0) >= s.acc_threshold
                     AND s.theta > COALESCE(s.b, 0)
                     AND s.distinct_sessions >= 2
                     AND s.days_active >= 1 THEN 'Mastered'

                WHEN s.n_credible_attempts >= 6
                     AND COALESCE(s.last6_acc, 0) >= s.acc_threshold
                     AND s.theta > COALESCE(s.b, 0) THEN 'Acquired'

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
    'LIOS mastery state-machine (v1.1). Idempotent. Technical/engagement item_keys are ineligible — only curriculum, content and motor-skill items can transition.';

REVOKE ALL ON FUNCTION public.lios_detect_mastery_episodes_v1() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lios_detect_mastery_episodes_v1()
    TO authenticated, service_role;

-- ── 3. dashboard_mastery_v2: exclude technical keys at read time ───

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
        WHERE NOT public.lios_is_technical_item_key(item_key)     -- ★ eligibility
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
          AND NOT public.lios_is_technical_item_key(item_key)     -- ★ eligibility
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
        'item_scope', 'curriculum_only',
        'count_semantics', 'learner_item_states',
        'totals', (SELECT row_to_json(t) FROM totals t),
        'by_state_mode',   COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_state_mode b), '[]'::jsonb),
        'by_age_state',    COALESCE((SELECT jsonb_agg(row_to_json(a)) FROM by_age_state a), '[]'::jsonb),
        'recent_transitions', COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY transition_at DESC) FROM recent_transitions r), '[]'::jsonb),
        'top_mastered',    COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM top_mastered_items t), '[]'::jsonb)
    );
$fn$;

COMMENT ON FUNCTION public.dashboard_mastery_v2(int) IS
    'LIOS four-state mastery RPC (v1.1). Curriculum/content items only — technical event keys excluded via lios_is_technical_item_key(). Counts are learner-item states, not distinct skills.';

REVOKE ALL ON FUNCTION public.dashboard_mastery_v2(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_mastery_v2(int) TO authenticated;

-- ── 4. Export headline: honest mastered count ──────────────────────

CREATE OR REPLACE FUNCTION public.dashboard_export_headline(
    in_days int DEFAULT 30
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
    SELECT jsonb_build_object(
        'export_version',     'lios-v1',
        'generated_at',       now(),
        'window_days',        in_days,
        'product',            'draw-in-the-air',
        'environment',        'production',
        'headline', jsonb_build_object(
            'attempts_in_window',  (SELECT count(*) FROM learning_attempts WHERE occurred_at > now() - (in_days || ' days')::interval),
            'sessions_in_window',  (SELECT count(DISTINCT session_id) FROM analytics_events WHERE occurred_at > now() - (in_days || ' days')::interval),
            'learners_in_window',  (SELECT count(DISTINCT device_id) FROM learning_attempts WHERE occurred_at > now() - (in_days || ' days')::interval AND device_id IS NOT NULL),
            -- Learner-item mastery states on CURRICULUM items only.
            -- Renamed semantics: this was never a count of distinct
            -- skills; the key below says exactly what it counts.
            'mastered_skills',     (SELECT count(*) FROM (
                                        SELECT DISTINCT ON (device_id, item_key, game_mode) to_state
                                        FROM mastery_episode_fact
                                        WHERE NOT public.lios_is_technical_item_key(item_key)
                                        ORDER BY device_id, item_key, game_mode, transition_at DESC
                                    ) latest WHERE latest.to_state = 'Mastered'),
            'mastered_semantics',  'learner_item_states_curriculum_only',
            'observations_in_window', (SELECT count(*) FROM human_observation_fact WHERE recorded_at > now() - (in_days || ' days')::interval),
            'adaptive_decisions_in_window', (SELECT count(*) FROM lios_adaptive_decisions WHERE made_at > now() - (in_days || ' days')::interval),
            'cron_runs_24h',       (SELECT count(*) FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours'),
            'cron_failed_24h',     (SELECT count(*) FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours' AND error_message IS NOT NULL)
        )
    );
$fn$;

REVOKE ALL ON FUNCTION public.dashboard_export_headline(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_export_headline(int) TO authenticated;

COMMENT ON FUNCTION public.dashboard_export_headline(int) IS
    'LIOS unified export headline (v1.1). mastered_skills counts learner-item states on curriculum items only.';

-- ── 5. dashboard_mastery_summary: same eligibility filter ──────────
-- This is where the worst inflation lived: 32 of 52 (61.5%) "strong"
-- learner-item states in the 2026-07-02 export were technical events,
-- because this RPC classifies straight from learning_attempts with no
-- item_key eligibility. Byte-for-byte the 20260512 body with the ★
-- predicate added and an item_scope label.

CREATE OR REPLACE FUNCTION public.dashboard_mastery_summary(in_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
WITH per_device_item AS (
    SELECT game_mode, item_key, device_id,
        count(*) AS attempts,
        avg(CASE WHEN was_correct THEN 1 ELSE 0 END)::numeric * 100 AS acc_pct
    FROM public.learning_attempts
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND NOT public.lios_is_technical_item_key(item_key)          -- ★ eligibility
    GROUP BY game_mode, item_key, device_id
), classified AS (
    SELECT game_mode, item_key, device_id, attempts, acc_pct,
        CASE WHEN attempts >= 5 AND acc_pct >= 80 THEN 'strong'
             WHEN attempts >= 3 AND acc_pct >= 50 THEN 'practising'
             ELSE 'new' END AS bucket
    FROM per_device_item
), per_item AS (
    SELECT game_mode, item_key,
        count(*) FILTER (WHERE bucket = 'strong') AS strong,
        count(*) FILTER (WHERE bucket = 'practising') AS practising,
        count(*) FILTER (WHERE bucket = 'new') AS new_,
        count(*) AS total_devices,
        round(avg(acc_pct)::numeric, 1) AS mean_acc_pct,
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY acc_pct)::numeric, 1) AS median_acc_pct,
        round(avg(attempts)::numeric, 1) AS mean_attempts
    FROM classified GROUP BY game_mode, item_key
), totals AS (
    SELECT count(*) FILTER (WHERE strong > 0) AS items_with_mastery,
        sum(strong)::int AS total_strong, sum(practising)::int AS total_practising,
        sum(new_)::int AS total_new,
        count(DISTINCT (game_mode, item_key))::int AS distinct_items,
        count(DISTINCT game_mode)::int AS distinct_modes
    FROM per_item
)
SELECT jsonb_build_object(
    'days', in_days, 'as_of', now(),
    'item_scope', 'curriculum_only',
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'items', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key,
        'strong', strong, 'practising', practising, 'new', new_,
        'total_devices', total_devices, 'mean_acc_pct', mean_acc_pct,
        'median_acc_pct', median_acc_pct, 'mean_attempts', mean_attempts
    ) ORDER BY total_devices DESC, mean_acc_pct DESC) FROM per_item), '[]'::jsonb),
    'struggling', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key,
        'total_devices', total_devices, 'median_acc_pct', median_acc_pct,
        'mean_attempts', mean_attempts
    ) ORDER BY median_acc_pct ASC, total_devices DESC) FROM per_item
       WHERE median_acc_pct < 60 AND total_devices >= 3 LIMIT 12), '[]'::jsonb),
    'top_strong', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key, 'strong', strong,
        'total_devices', total_devices, 'mean_acc_pct', mean_acc_pct
    ) ORDER BY strong DESC, mean_acc_pct DESC) FROM per_item
       WHERE strong >= 1 LIMIT 12), '[]'::jsonb)
);
$function$;

GRANT EXECUTE ON FUNCTION public.dashboard_mastery_summary(integer) TO anon, authenticated;

-- ─── ROLLBACK ─────────────────────────────────────────────────────
-- Restore the four functions verbatim from
-- 20260519_lios_mastery_episodes_v1.sql, 20260519_lios_unified_export.sql
-- and 20260512_insights_v2_deep_dives.sql, then:
-- DROP FUNCTION IF EXISTS public.lios_is_technical_item_key(text);
-- (No data is modified by this migration; rollback is function-only.)
