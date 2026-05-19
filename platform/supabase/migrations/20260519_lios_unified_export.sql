-- ═══════════════════════════════════════════════════════════════════
-- LIOS Unified Export — headline RPC (client bundles the rest)
-- ═══════════════════════════════════════════════════════════════════
--
-- Initial design rolled every dashboard RPC into one server-side call.
-- It worked logically but hit the Supabase gateway timeout (~8s) when
-- the heaviest sections (executive_summary, engagement_deep,
-- retention_deep) ran serially.
--
-- New architecture: the client bundles. The "Export Everything" action
-- in the Insights top bar fetches each dashboard RPC in parallel (so
-- each runs within its own timeout budget), shows progress per
-- section, recovers gracefully from per-section failures, and
-- composes the bundle in-browser.
--
-- This RPC is the lightweight "headline" — what every export needs
-- but small enough to never time out. The client always fetches it
-- first as the bundle's preamble.

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
            'mastered_skills',     (SELECT count(*) FROM (
                                        SELECT DISTINCT ON (device_id, item_key, game_mode) to_state
                                        FROM mastery_episode_fact
                                        ORDER BY device_id, item_key, game_mode, transition_at DESC
                                    ) latest WHERE latest.to_state = 'Mastered'),
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
    'LIOS unified export — lightweight headline. Client bundles the full payload by fetching each dashboard RPC in parallel.';
