-- Conductor hotfix #2 — pause/resume self-healing + legacy field clear
--
-- Surfaced in the live classroom test (2026-05-11, code 1823):
-- clicking Pause returned HTTP 400 "no active activity" while the UI
-- still showed "Balloon Math · playing". Root cause: class_end_activity
-- ran first (likely an inadvertent click on the End Activity button
-- adjacent to Pause), cleared sessions.current_activity_id to NULL,
-- but LEFT sessions.activity (legacy field) set to 'balloon-math'.
--
-- The teacher console's NOW PLAYING panel reads from sessions.activity,
-- so it kept rendering "Balloon Math · playing" even though the real
-- state was 'between_activities'. The header reads class_state and
-- correctly showed "Between activities · 2 ready", producing the
-- contradictory UI.
--
-- Three changes here:
--
-- 1. class_end_activity ALSO clears sessions.activity to NULL so the
--    legacy field can't cause stale-panel renders going forward.
-- 2. class_pause_activity self-heals: if current_activity_id is NULL
--    but a non-ended session_activities row exists, adopt it and
--    re-sync sessions.current_activity_id + class_state, then pause.
-- 3. class_resume_activity gets the same self-heal.
--
-- Net: even if End and Pause race, or someone clears the FK
-- mid-flight, the conductor recovers without surfacing a 400 to the
-- teacher. The right architectural fix is also to update
-- TeacherClassConsole to hide the Pause/End buttons when
-- class_state !== 'in_activity'; that lives in a separate commit.

CREATE OR REPLACE FUNCTION public.class_end_activity(in_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE cur uuid;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN
        SELECT id INTO cur FROM public.session_activities
        WHERE session_id = in_session_id AND state IN ('starting','playing','paused','results')
        ORDER BY started_at DESC LIMIT 1;
    END IF;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities
    SET state = 'ended', ended_at = COALESCE(ended_at, now())
    WHERE id = cur;
    UPDATE public.sessions
    SET class_state = 'between_activities',
        current_activity_id = NULL,
        activity = NULL,
        updated_at = now()
    WHERE id = in_session_id;
    RETURN jsonb_build_object('session_activity_id', cur, 'state', 'ended', 'class_state', 'between_activities');
END;
$function$;

CREATE OR REPLACE FUNCTION public.class_pause_activity(in_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE cur uuid;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN
        SELECT id INTO cur FROM public.session_activities
        WHERE session_id = in_session_id AND state IN ('starting','playing','paused')
        ORDER BY started_at DESC LIMIT 1;
        IF cur IS NOT NULL THEN
            UPDATE public.sessions
            SET current_activity_id = cur,
                class_state = 'in_activity',
                updated_at = now()
            WHERE id = in_session_id;
        END IF;
    END IF;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities SET state = 'paused'
      WHERE id = cur AND state IN ('playing','starting');
    UPDATE public.sessions SET updated_at = now() WHERE id = in_session_id;
    RETURN jsonb_build_object('session_activity_id', cur, 'state', 'paused');
END;
$function$;

CREATE OR REPLACE FUNCTION public.class_resume_activity(in_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE cur uuid;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN
        SELECT id INTO cur FROM public.session_activities
        WHERE session_id = in_session_id AND state IN ('paused','playing','starting')
        ORDER BY started_at DESC LIMIT 1;
        IF cur IS NOT NULL THEN
            UPDATE public.sessions
            SET current_activity_id = cur,
                class_state = 'in_activity',
                updated_at = now()
            WHERE id = in_session_id;
        END IF;
    END IF;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities SET state = 'playing'
      WHERE id = cur AND state IN ('paused','starting');
    UPDATE public.sessions SET updated_at = now() WHERE id = in_session_id;
    RETURN jsonb_build_object('session_activity_id', cur, 'state', 'playing');
END;
$function$;
