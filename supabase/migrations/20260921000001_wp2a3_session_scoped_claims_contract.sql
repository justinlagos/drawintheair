-- WP2A.3 / DIA-007 Stage B, CONTRACT half of expand and contract.
--
-- NOT APPLIED. Written now so it can be reviewed with the expand half,
-- but it must not run until all three of these are true:
--   1. 20260914000003_wp2a3_session_scoped_claims_expand.sql is applied.
--   2. A client build that sends the student token on PostgREST calls AND
--      as `access_token` in the realtime phx_join payload is live, and
--      the teacher console sends the teacher JWT the same way.
--   3. That build is confirmed live in production (build_version in
--      analytics_events) and a real classroom join has been observed.
--
-- Running this before (2) removes the only policy branch the deployed
-- client can satisfy. Every student screen and the teacher lobby stop
-- receiving postgres_changes. That is the July is_admin_user failure
-- mode with a different cause.
--
-- Rollback: supabase/migrations/rollbacks/20260921000001_wp2a3_session_scoped_claims_contract_rollback.sql

begin;

-- ── sessions: drop the world-readable branch ─────────────────────────
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select to anon, authenticated
  using (
    teacher_id = (select auth.uid())
    or public.is_admin_user((select auth.uid()))
  );
-- Student access now comes only from sessions_select_student.

-- ── session_students: roster is teacher, admin or self only ──────────
drop policy if exists session_students_select_scoped on public.session_students;
create policy session_students_select_scoped on public.session_students
  for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_students.session_id
        and s.teacher_id = (select auth.uid())
    )
    or public.is_admin_user((select auth.uid()))
  );

-- Anonymous inserts and blanket updates go away. Joining is only
-- possible through class_join / class_join_with_token, which the
-- Edge Function calls with the service role.
drop policy if exists join_active_session_only on public.session_students;
drop policy if exists students_update_own_in_active_session on public.session_students;

-- ── session_activities: was `using (true)` ───────────────────────────
drop policy if exists "Read session activities by session" on public.session_activities;
create policy session_activities_select_teacher on public.session_activities
  for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_activities.session_id
        and s.teacher_id = (select auth.uid())
    )
    or public.is_admin_user((select auth.uid()))
  );

-- ── round_scores ─────────────────────────────────────────────────────
drop policy if exists round_scores_select_scoped on public.round_scores;
create policy round_scores_select_teacher on public.round_scores
  for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = round_scores.session_id
        and s.teacher_id = (select auth.uid())
    )
    or public.is_admin_user((select auth.uid()))
  );
drop policy if exists submit_score_active_session_only on public.round_scores;

-- ── Table grants ─────────────────────────────────────────────────────
-- RLS is the fence, but anon holds table privileges it has never needed.
-- session_students keeps UPDATE (the student self-update policy needs
-- it) and round_scores keeps INSERT (score submission).
revoke insert, update, delete, truncate, references, trigger
  on public.sessions, public.session_activities, public.class_children from anon;
revoke insert, delete, truncate, references, trigger
  on public.session_students from anon;
revoke update, delete, truncate, references, trigger
  on public.round_scores from anon;

-- ── Make the student claim mandatory in the student RPCs ─────────────
create or replace function public.assert_student_scope(
  in_session_id uuid,
  in_student_id uuid default null
)
returns void
language plpgsql
stable
set search_path to 'public', 'pg_temp'
as $$
begin
  if public.student_session_id() is null then
    raise exception 'student token required' using errcode = '42501';
  end if;
  if in_session_id is distinct from public.student_session_id() then
    raise exception 'session scope mismatch' using errcode = '42501';
  end if;
  if in_student_id is not null
     and in_student_id is distinct from public.student_row_id() then
    raise exception 'student scope mismatch' using errcode = '42501';
  end if;
end;
$$;

-- ── Join RPCs move behind the Edge Function ──────────────────────────
-- After this only the service role may resolve a code into a session or
-- create a roster row, so a bare anon key cannot enumerate join codes.
revoke execute on function public.session_lookup_by_code(text) from anon, authenticated;
revoke execute on function public.class_validate_join(text, text) from anon, authenticated;
revoke execute on function public.class_join(uuid, text) from anon, authenticated;
revoke execute on function public.class_join_with_token(uuid, text) from anon, authenticated;

-- is_admin_user keeps its anon EXECUTE grant on purpose. The teacher and
-- admin branches above call it, and realtime evaluates those branches as
-- the subscriber's role. Revoking it is what broke realtime in July.

commit;
