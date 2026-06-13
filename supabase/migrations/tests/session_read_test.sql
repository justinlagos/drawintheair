-- ═══════════════════════════════════════════════════════════════════════════
-- session_read_test.sql  (H1 regression test)
--
-- Run AFTER applying 0022_session_read_hardening.sql. Asserts that:
--   • anon can NO LONGER read cross-tenant linkage columns (teacher_id,
--     session metadata) or children's names;
--   • anon CAN still read the non-sensitive columns the Realtime handlers use
--     (status, current_activity_id, kicked_at) so class mode keeps working;
--   • anon CAN execute the capability-scoped join/read RPCs;
--   • round_scores SELECT no longer has the open `status <> 'ended'` disjunct.
--
-- Usage (psql, against a DB that has 0022 applied):
--   \i supabase/migrations/tests/session_read_test.sql
-- Any failed assertion raises and aborts; "H1 SESSION READ TEST PASSED" prints
-- on success.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  assert has_column_privilege('anon','public.sessions','teacher_id','SELECT') = false,
    'anon must NOT read sessions.teacher_id';
  assert has_column_privilege('anon','public.sessions','metadata','SELECT') = false,
    'anon must NOT read sessions.metadata';
  assert has_column_privilege('anon','public.session_students','name','SELECT') = false,
    'anon must NOT read session_students.name (children PII)';

  assert has_column_privilege('anon','public.sessions','status','SELECT') = true,
    'anon must still read sessions.status (Realtime)';
  assert has_column_privilege('anon','public.sessions','current_activity_id','SELECT') = true,
    'anon must still read sessions.current_activity_id (Realtime)';
  assert has_column_privilege('anon','public.session_students','kicked_at','SELECT') = true,
    'anon must still read session_students.kicked_at (kick Realtime)';

  assert has_function_privilege('anon','public.class_join(uuid,text)','EXECUTE') = true,
    'anon must be able to call class_join';
  assert has_function_privilege('anon','public.class_get_session(uuid)','EXECUTE') = true,
    'anon must be able to call class_get_session';
  assert has_function_privilege('anon','public.class_get_self(uuid)','EXECUTE') = true,
    'anon must be able to call class_get_self';

  assert (select bool_or(qual ~ 'ended') from pg_policies
          where tablename='round_scores' and policyname='round_scores_select_scoped') = false,
    'round_scores SELECT must not contain the open status<>ended disjunct';

  raise notice 'H1 SESSION READ TEST PASSED';
end $$;
