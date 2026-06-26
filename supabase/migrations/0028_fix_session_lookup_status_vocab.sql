-- ═══════════════════════════════════════════════════════════════════════════════
-- 0028 — Fix session_lookup_by_code joinable-status vocabulary drift
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- ROOT CAUSE
--   Teachers create every class with status='lobby' (see TeacherClassConsole.tsx,
--   TeacherDashboard.tsx). Migration 0027 aligned class_validate_join and
--   class_join_with_network to the canonical status vocabulary
--   ('lobby','playing','paused','results','ended') with the joinable rule:
--
--       status IN ('lobby','playing','paused')
--       OR class_state IN ('lobby','in_activity')
--
--   …but it MISSED session_lookup_by_code, which still carried the legacy
--   0025 clause `status IN ('waiting','active','paused')`. No live session
--   ever has those statuses, so the lookup returned NULL for every freshly
--   created class.
--
-- SYMPTOM (verified)
--   The deployed student join client calls
--   POST /rest/v1/rpc/session_lookup_by_code and shows "No active class with
--   that code" because the RPC returns NULL. Reproduced live with code 9110
--   (session 67196d91-…, status='lobby'); class_validate_join_by_ip returned
--   valid:true for the same code, confirming the discrepancy is isolated to
--   session_lookup_by_code.
--
-- FIX
--   Replace ONLY the WHERE status/class_state predicate with the canonical
--   joinable rule used by class_validate_join (0027). Additive, reversible,
--   no schema/data change. All returned columns, the 4-digit input guard,
--   grants and comment are preserved.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.session_lookup_by_code(in_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r record;
BEGIN
    -- Hard input shape check. Anything other than exactly 4 digits resolves
    -- to NULL so the caller can't probe with regexes / SQL wildcards.
    IF in_code IS NULL OR in_code !~ '^\d{4}$' THEN
        RETURN NULL;
    END IF;

    SELECT
        s.id,
        s.code,
        s.session_code,
        s.activity,
        s.status,
        s.class_state,
        s.round,
        s.timer_seconds,
        s.max_students,
        s.scoreboard_mode,
        s.class_name
    INTO r
    FROM public.sessions s
    WHERE (s.code = in_code OR s.session_code = in_code)
      -- Canonical joinable rule — must match class_validate_join (0027).
      -- Status vocabulary is ('lobby','playing','paused','results','ended').
      AND (s.status      IN ('lobby', 'playing', 'paused')
           OR s.class_state IN ('lobby', 'in_activity'))
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN to_jsonb(r);
END
$$;

REVOKE ALL ON FUNCTION public.session_lookup_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_lookup_by_code(text)
    TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.session_lookup_by_code(text) IS
    'Public student-join lookup. Returns minimal join-screen fields (no teacher_id, no school_id, no metadata) for joinable sessions. Joinable rule aligned with class_validate_join (0028): status IN (lobby,playing,paused) OR class_state IN (lobby,in_activity).';
