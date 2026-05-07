-- ════════════════════════════════════════════════════════════════════
-- conductor v1 hotfix — three production bugs from first real session
-- ════════════════════════════════════════════════════════════════════
--
-- Already applied to production via apply_migration. Captured for git.
--
-- 1. class_kick_student fails because session_students.is_active is a
--    GENERATED STORED column (mirrors is_connected). Generated columns
--    can only be UPDATEd to DEFAULT. Drop the explicit assignment.
-- 2. sessions.activity was NOT NULL with no default — the new
--    "Start Class" path creates a session before any activity is
--    chosen, so activity has to be nullable.
-- 3. Teachers had no way to clear stale lobby sessions, saturating
--    the free-tier cap. Add class_delete_session +
--    class_end_stale_sessions RPCs.

-- ── 1. activity column must be nullable ───────────────────────────
ALTER TABLE public.sessions ALTER COLUMN activity DROP NOT NULL;

-- ── 2. fix class_kick_student ────────────────────────────────────
DROP FUNCTION IF EXISTS public.class_kick_student(uuid, uuid, text);
CREATE FUNCTION public.class_kick_student(in_session_id uuid, in_student_id uuid, in_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE name_at_kick text;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    UPDATE public.session_students
    SET kicked_at     = COALESCE(kicked_at, now()),
        kicked_reason = in_reason,
        is_connected  = false,
        left_at       = COALESCE(left_at, now())
    WHERE id = in_student_id AND session_id = in_session_id
    RETURNING name INTO name_at_kick;
    IF name_at_kick IS NULL THEN
        RAISE EXCEPTION 'student not found in session' USING ERRCODE = 'P0002';
    END IF;
    RETURN jsonb_build_object(
        'student_id', in_student_id, 'name', name_at_kick, 'kicked_at', now()
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_kick_student(uuid, uuid, text) TO authenticated;

-- ── 3. class_delete_session ──────────────────────────────────────
DROP FUNCTION IF EXISTS public.class_delete_session(uuid);
CREATE FUNCTION public.class_delete_session(in_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE owner uuid;
BEGIN
    SELECT teacher_id INTO owner FROM public.sessions WHERE id = in_session_id;
    IF owner IS NULL THEN
        RETURN jsonb_build_object('session_id', in_session_id, 'deleted', false, 'note', 'not found');
    END IF;
    IF auth.uid() IS NULL OR auth.uid() <> owner THEN
        RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
    END IF;
    DELETE FROM public.sessions WHERE id = in_session_id;
    RETURN jsonb_build_object('session_id', in_session_id, 'deleted', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_delete_session(uuid) TO authenticated;

-- ── 4. class_end_stale_sessions ──────────────────────────────────
DROP FUNCTION IF EXISTS public.class_end_stale_sessions();
CREATE FUNCTION public.class_end_stale_sessions()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n int;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501'; END IF;
    WITH ended AS (
        UPDATE public.sessions
        SET class_state = 'ended', ended_at = COALESCE(ended_at, now()),
            current_activity_id = NULL, status = 'ended', updated_at = now()
        WHERE teacher_id = auth.uid()
          AND class_state IN ('lobby','between_activities')
        RETURNING id
    )
    SELECT count(*)::int INTO n FROM ended;
    RETURN jsonb_build_object('ended_count', n);
END;
$$;
GRANT EXECUTE ON FUNCTION public.class_end_stale_sessions() TO authenticated;
