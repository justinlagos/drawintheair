-- ════════════════════════════════════════════════════════════════════
-- Dashboard data-quality fixes — 2026-05-11
-- ════════════════════════════════════════════════════════════════════
--
-- Three bugs the dashboards were lying about:
--
-- 1. Multi-complete double-count
--    mode_completed fires per stage/letter in most modes, so the old
--    dashboard_top_modes calculation (sum(completed) / sum(started))
--    pushed completion rates over 100% (Colour Builder 145%,
--    Balloon Math 180%, Pre-Writing 210%, Calibration 165%, etc.).
--    Fix: collapse to (game_mode, session_id) before counting, so a
--    session contributes at most one start and one complete per mode.
--
-- 2. Free Paint zero-completion drag
--    Free Paint ("free") is open-ended — there's no mode_completed
--    event by design. The old query rolled it into the average as
--    0%, dragging dashboard_today.completion_rate_pct down.
--    Fix: classify open-ended modes via a sentinel set and return
--    completion_rate_pct = NULL with is_open_ended = true for them.
--    Dashboard renders "—" instead of 0%.
--
-- 3. 'unknown_word' polluting Word Search mastery
--    wordSearchLogic.ts had `itemKey: result.wordFound || 'unknown_word'`
--    which inserted 35 junk rows into learning_attempts. The code is
--    fixed separately; this migration purges the bad rows so the
--    mastery dashboard stops showing 'unknown_word' as a top item.
-- ════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 1 + 2. Rewrite dashboard_top_modes — per-session collapsing
--                                      + open-ended classification
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dashboard_top_modes(in_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
WITH per_session AS (
    -- Collapse multiple mode_started / mode_completed events
    -- inside a single (mode, session) to a boolean. A session that
    -- finishes 5 letters of Tracing then contributes one "completed",
    -- not five.
    SELECT
        game_mode,
        session_id,
        bool_or(event_name = 'mode_started')   AS did_start,
        bool_or(event_name = 'mode_completed') AS did_complete
    FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND game_mode IS NOT NULL
    GROUP BY game_mode, session_id
), per_mode AS (
    SELECT
        game_mode,
        count(*)                                  FILTER (WHERE did_start)                   AS started,
        count(*)                                  FILTER (WHERE did_complete AND did_start)  AS completed,
        count(DISTINCT session_id)                FILTER (WHERE did_start)                   AS distinct_starters,
        -- "Open-ended" = the mode has no completion event by design.
        -- Add new sandbox modes here if any get built. Today: free paint.
        (game_mode IN ('free'))                                                              AS is_open_ended
    FROM per_session
    GROUP BY game_mode
)
SELECT jsonb_build_object(
    'days',  in_days,
    'as_of', now(),
    'modes', coalesce(jsonb_agg(
        jsonb_build_object(
            'game_mode',         game_mode,
            'started',           started,
            'completed',         completed,
            'distinct_starters', distinct_starters,
            'is_open_ended',     is_open_ended,
            'completion_rate_pct',
                CASE
                    WHEN is_open_ended            THEN NULL
                    WHEN started > 0              THEN round(100.0 * completed / started, 1)
                    ELSE NULL
                END
        ) ORDER BY started DESC
    ), '[]'::jsonb)
) FROM per_mode;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- 2 (cont). Rewrite dashboard_today — exclude open-ended modes from
--           the completion-rate denominator, so a session that only
--           did Free Paint doesn't count against us.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dashboard_today()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
WITH today AS (
    SELECT *
    FROM public.analytics_events
    WHERE occurred_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
), per_session AS (
    SELECT
        session_id,
        min(occurred_at) AS first_at,
        max(occurred_at) AS last_at,
        -- Did this session start at least one *non-open-ended* mode?
        -- Only those count toward the completion-rate denominator.
        bool_or(event_name = 'mode_started'
                AND COALESCE(game_mode, '') NOT IN ('free'))            AS reached_eligible_start,
        bool_or(event_name = 'mode_completed')                          AS reached_completion,
        extract(epoch from (max(occurred_at) - min(occurred_at)))       AS dur_s
    FROM today
    GROUP BY session_id
)
SELECT jsonb_build_object(
    'sessions_started',       (SELECT count(*) FROM per_session),
    'sessions_completed',     (SELECT count(*) FROM per_session WHERE reached_completion),
    'completion_rate_pct',
        (SELECT round(
            100.0 * count(*) FILTER (WHERE reached_completion AND reached_eligible_start)
                  / NULLIF(count(*) FILTER (WHERE reached_eligible_start), 0),
            1)
         FROM per_session),
    'median_session_seconds', (SELECT round((percentile_cont(0.5) within group (order by dur_s))::numeric, 0)
                                 FROM per_session WHERE dur_s > 0),
    'mode_completions',       (SELECT count(*) FROM today WHERE event_name = 'mode_completed'),
    'mode_starts',             (SELECT count(*) FROM today WHERE event_name = 'mode_started'),
    'total_events',            (SELECT count(*) FROM today),
    'as_of',                   now()
);
$function$;

-- ──────────────────────────────────────────────────────────────────
-- 3. Purge the 35 'unknown_word' rows leaking into mastery dashboard.
--    The source bug (wordSearchLogic.ts line 181) is fixed in the
--    same commit; this DELETE cleans up the existing pollution so
--    the mastery RPC stops surfacing it.
-- ──────────────────────────────────────────────────────────────────
DELETE FROM public.learning_attempts
WHERE game_mode = 'word-search' AND item_key = 'unknown_word';

-- Belt-and-braces: stop any future leakage with a CHECK constraint.
-- (If wordSearchLogic regresses later, the insert will fail loudly
--  instead of silently polluting the dashboard for weeks.)
ALTER TABLE public.learning_attempts
    DROP CONSTRAINT IF EXISTS learning_attempts_no_unknown_key;
ALTER TABLE public.learning_attempts
    ADD  CONSTRAINT learning_attempts_no_unknown_key
    CHECK (item_key NOT IN ('unknown_word','unknown','null','undefined',''));
