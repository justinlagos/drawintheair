-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 3 — home-vs-classroom split RPC
-- ═══════════════════════════════════════════════════════════════════
--
-- Backs the Learning tab's classroom context section now that the
-- ?join=CODE redemption flow flips context='classroom' and stamps
-- class_code into meta. Returns:
--   • per-context attempts, sessions, accuracy, credibility, trust mix
--   • per-class_code drilldown (top 25) for classroom rollups

CREATE OR REPLACE FUNCTION public.dashboard_context_split(
    in_days int DEFAULT 30
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
    WITH win AS (
        SELECT context, credibility_score, credibility_tier, was_correct
        FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
    ),
    by_ctx AS (
        SELECT
            COALESCE(context, 'unknown') AS context,
            count(*)::int                AS n_attempts,
            count(DISTINCT session_id)::int AS n_sessions,
            avg(was_correct::int)::numeric(4, 3) AS accuracy,
            avg(credibility_score)::numeric(4, 3) AS mean_credibility,
            count(*) FILTER (WHERE credibility_tier = 'A')::int AS tier_a,
            count(*) FILTER (WHERE credibility_tier = 'B')::int AS tier_b,
            count(*) FILTER (WHERE credibility_tier = 'C')::int AS tier_c
        FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
        GROUP BY COALESCE(context, 'unknown')
    ),
    class_codes AS (
        SELECT
            (meta->>'class_code')::text AS class_code,
            count(*)::int               AS n_attempts,
            count(DISTINCT session_id)::int AS n_sessions
        FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
          AND meta ? 'class_code'
        GROUP BY meta->>'class_code'
        ORDER BY n_attempts DESC
        LIMIT 25
    )
    SELECT jsonb_build_object(
        'days', in_days,
        'as_of', now(),
        'total_attempts', (SELECT count(*) FROM win),
        'by_context',  COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_ctx b), '[]'::jsonb),
        'class_codes', COALESCE((SELECT jsonb_agg(row_to_json(c)) FROM class_codes c), '[]'::jsonb)
    );
$fn$;

REVOKE ALL ON FUNCTION public.dashboard_context_split(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_context_split(int) TO authenticated;
