-- 0025_classroom_realtime_restore_is_admin_user_execute.sql
--
-- P0 HOTFIX: restore classroom Realtime delivery.
--
-- Root cause (verified 2026-07-09 against production Realtime logs):
--   Supabase Realtime (walrus) evaluates row-level-security SELECT policies
--   for every subscriber, executing as that subscriber's claimed role
--   (anon for students, authenticated for teachers). The SELECT policies on
--   sessions / session_students / round_scores call
--   public.is_admin_user(uuid). Migration 0010 revoked anon EXECUTE on it,
--   so realtime.apply_rls -> walrus_rls_stmt -> list_changes raised
--   "permission denied for function is_admin_user" (42501) and the entire
--   postgres_changes batch was dropped — for ALL subscribers, teacher
--   included. Result: no join/pause/resume/end events reached any client.
--
-- Policy audit (live DB, 2026-07-09) of realtime-published tables:
--   public.sessions            SELECT sessions_select                  -> auth.uid(), is_admin_user(uuid)
--   public.session_students    SELECT session_students_select_scoped   -> auth.uid(), is_admin_user(uuid)
--   public.round_scores        SELECT round_scores_select_scoped       -> auth.uid(), is_admin_user(uuid)
--   public.session_activities  SELECT "Read session activities..."     -> (true), no functions
--   (INSERT/UPDATE/DELETE policies reference has_teacher_role() /
--    get_effective_tier(uuid), but Realtime only evaluates SELECT
--    policies, so they do not affect delivery.)
--
-- is_admin_user is SECURITY DEFINER and returns only a boolean; granting
-- EXECUTE leaks no data (it is already implicitly evaluated inside RLS for
-- authenticated users). This is the minimal, reversible unblocker.
--
-- Follow-up (separate PR, NOT part of this hotfix): consider splitting the
-- SELECT policies so the anon path never references admin helpers at all,
-- e.g. one policy for "active session, any role" and one for
-- "teacher/admin, authenticated only". Documented in the PR description.

BEGIN;

GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

COMMIT;

-- Verification (run after applying; both must return true):
--   SELECT has_function_privilege('anon', 'public.is_admin_user(uuid)', 'EXECUTE');
--   SELECT has_function_privilege('authenticated', 'public.is_admin_user(uuid)', 'EXECUTE');
-- Then watch the Realtime logs: the
--   "permission denied for function is_admin_user"
-- PoolingReplicationError must stop appearing, and a live two-browser
-- pause/resume must propagate in under a second.
