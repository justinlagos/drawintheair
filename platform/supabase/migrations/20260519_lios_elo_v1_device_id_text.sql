-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 2 hotfix — align skill_state.device_id with text
-- ═══════════════════════════════════════════════════════════════════
--
-- The initial Elo migration (20260519_lios_elo_v1.sql) declared
-- skill_state.device_id and skill_state_history.device_id as `uuid`,
-- matching what the survey expected. The live learning_attempts
-- table actually stores device_id as `text` (legacy decision from a
-- pre-uuid analytics era), so the Elo updater's join blew up with
-- "operator does not exist: uuid = text".
--
-- Tables were empty at the time of the fix so a hard ALTER is safe.
-- The dependent view (dashboard_learner_progression) is dropped and
-- recreated identically because Postgres won't allow column-type
-- changes on columns referenced by a view.
--
-- Re-runnable: every operation is conditional / idempotent.

DROP VIEW IF EXISTS public.dashboard_learner_progression;

ALTER TABLE public.skill_state         ALTER COLUMN device_id TYPE text;
ALTER TABLE public.skill_state_history ALTER COLUMN device_id TYPE text;

CREATE OR REPLACE VIEW public.dashboard_learner_progression AS
SELECT
    s.device_id,
    s.item_key,
    s.game_mode,
    s.theta,
    s.n_attempts,
    s.n_credible_attempts,
    s.last_attempt_at,
    s.age_band,
    i.b                                   AS item_difficulty,
    s.theta - i.b                         AS expected_strength,
    1.0 / (1.0 + exp(-(s.theta - i.b)))   AS p_expected
FROM public.skill_state s
LEFT JOIN public.item_difficulty i USING (item_key, game_mode);

GRANT SELECT ON public.dashboard_learner_progression TO authenticated;
