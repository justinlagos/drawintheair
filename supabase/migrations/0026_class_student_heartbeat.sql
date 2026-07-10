-- 0026_class_student_heartbeat.sql
--
-- Presence truth for the teacher roster.
--
-- Problem: session_students.is_active / is_connected are write-once at
-- join and never unset, so a child who closed the tab hours ago still
-- shows "engaged" on the teacher console forever.
--
-- Fix: a minimal anon-callable heartbeat RPC. The student client calls it
-- every ~5 s while the classroom tab is visible. The teacher console then
-- derives engagement from updated_at staleness (engaged if fresh within
-- 15 s, offline beyond 20 s) instead of trusting the static booleans.
--
-- Capability model matches the existing class_get_self RPC: the caller
-- must already hold the student's own uuid (handed out at join and kept
-- in sessionStorage). The function returns void and exposes no other
-- student's data. Rate/abuse surface: worst case an attacker who has a
-- student uuid can keep that one student looking online — harmless.

BEGIN;

CREATE OR REPLACE FUNCTION public.class_student_heartbeat(in_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.session_students ss
    SET updated_at   = now(),
        is_connected = true,
        is_active    = true,
        left_at      = null
    WHERE ss.id = in_student_id
      AND ss.kicked_at IS NULL
      AND EXISTS (
          SELECT 1 FROM public.sessions s
          WHERE s.id = ss.session_id
            AND s.status <> 'ended'
            AND (s.class_state IS NULL OR s.class_state <> 'ended')
      );
    -- Silently a no-op for unknown ids, kicked students or ended sessions.
END;
$$;

REVOKE ALL ON FUNCTION public.class_student_heartbeat(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.class_student_heartbeat(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.class_student_heartbeat(uuid) TO authenticated;

COMMIT;

-- Verification:
--   SELECT has_function_privilege('anon', 'public.class_student_heartbeat(uuid)', 'EXECUTE');  -- t
-- Behavioural check: call it with a live student id, confirm
-- session_students.updated_at advances; call with a kicked student id,
-- confirm the row is untouched.
