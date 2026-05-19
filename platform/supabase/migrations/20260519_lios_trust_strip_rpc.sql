-- ═══════════════════════════════════════════════════════════════════
-- LIOS Sprint 1 close — dashboard_trust_strip RPC
-- ═══════════════════════════════════════════════════════════════════
--
-- Single RPC the Insights dashboard calls to render the data-quality
-- strip above every chart. Returns the global A/B/C composition for
-- the lookback window plus a per-game-mode breakdown (so the
-- pre-writing-vs-rest disparity surfaces immediately).
--
-- Shape (JSONB):
--   {
--     "days":   30,
--     "as_of":  "2026-05-19T..Z",
--     "total":  5435,
--     "tier_a": 5257, "tier_b": 178, "tier_c": 0,
--     "pct_a":  96.7, "pct_b": 3.3, "pct_c": 0.0,
--     "mean_score": 0.98,
--     "by_mode": [
--       { "game_mode": "pre-writing", "total": 710,
--         "tier_a": 539, "tier_b": 171, "tier_c": 0,
--         "pct_a": 75.9, "pct_b": 24.1, "pct_c": 0.0 },
--       ...
--     ],
--     "top_reasons": [
--       { "reason": "stuck_recent",         "n": 172 },
--       { "reason": "timing_distraction",   "n": 171 },
--       { "reason": "tab_hidden_during_window", "n": 6 },
--       { "reason": "timing_reflex_floor",  "n": 3 }
--     ]
--   }

CREATE OR REPLACE FUNCTION public.dashboard_trust_strip(
    in_days int DEFAULT 30
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
    WITH win AS (
        SELECT id, game_mode, credibility_tier, credibility_score, credibility_reasons
        FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
          AND credibility_tier IS NOT NULL
    ),
    totals AS (
        SELECT
            count(*)::int                                       AS total,
            count(*) FILTER (WHERE credibility_tier='A')::int   AS tier_a,
            count(*) FILTER (WHERE credibility_tier='B')::int   AS tier_b,
            count(*) FILTER (WHERE credibility_tier='C')::int   AS tier_c,
            avg(credibility_score)                              AS mean_score
        FROM win
    ),
    by_mode AS (
        SELECT
            game_mode,
            count(*)::int                                       AS total,
            count(*) FILTER (WHERE credibility_tier='A')::int   AS tier_a,
            count(*) FILTER (WHERE credibility_tier='B')::int   AS tier_b,
            count(*) FILTER (WHERE credibility_tier='C')::int   AS tier_c
        FROM win
        GROUP BY game_mode
    ),
    reasons_exploded AS (
        SELECT jsonb_array_elements_text(credibility_reasons) AS reason
        FROM win
        WHERE credibility_tier <> 'A'
    ),
    top_reasons AS (
        SELECT reason, count(*)::int AS n
        FROM reasons_exploded
        GROUP BY reason
        ORDER BY n DESC
    )
    SELECT jsonb_build_object(
        'days',       in_days,
        'as_of',      now(),
        'total',      t.total,
        'tier_a',     t.tier_a,
        'tier_b',     t.tier_b,
        'tier_c',     t.tier_c,
        'pct_a',      round(100.0 * t.tier_a / nullif(t.total, 0), 1),
        'pct_b',      round(100.0 * t.tier_b / nullif(t.total, 0), 1),
        'pct_c',      round(100.0 * t.tier_c / nullif(t.total, 0), 1),
        'mean_score', round(coalesce(t.mean_score, 0)::numeric, 2),
        'by_mode',    coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'game_mode', game_mode,
                'total',     total,
                'tier_a',    tier_a,
                'tier_b',    tier_b,
                'tier_c',    tier_c,
                'pct_a',     round(100.0 * tier_a / nullif(total, 0), 1),
                'pct_b',     round(100.0 * tier_b / nullif(total, 0), 1),
                'pct_c',     round(100.0 * tier_c / nullif(total, 0), 1)
            ) ORDER BY total DESC)
            FROM by_mode
        ), '[]'::jsonb),
        'top_reasons', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'reason', reason,
                'n',      n
            ) ORDER BY n DESC)
            FROM top_reasons
        ), '[]'::jsonb)
    )
    FROM totals t;
$fn$;

COMMENT ON FUNCTION public.dashboard_trust_strip(int) IS
    'LIOS Trust v1 — composition strip data for the dashboards. Global A/B/C tier counts + per-mode breakdown + Tier-B/C reason ranking for the lookback window.';

REVOKE ALL ON FUNCTION public.dashboard_trust_strip(int) FROM public;
GRANT EXECUTE ON FUNCTION public.dashboard_trust_strip(int) TO authenticated;
