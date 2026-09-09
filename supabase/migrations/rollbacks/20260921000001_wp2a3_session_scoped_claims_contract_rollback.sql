-- Rollback for 20260921000001_wp2a3_session_scoped_claims_contract.sql
-- (WP2A.3 / DIA-007 Stage B, contract half).
--
-- Restores the broad anonymous policies and grants exactly as they stood
-- on production and staging on 2026-09-08, verified against pg_policies
-- and pg_class.relacl. No data change.
--
-- This re-opens the DIA-007 exposure. Run it only if the contract
-- migration has broken live classrooms, and re-apply contract as soon as
-- the client is fixed.

begin;

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select
  using (
    teacher_id = (select auth.uid())
    or is_admin_user((select auth.uid()))
    or status <> 'ended'
  );

drop policy if exists session_students_select_scoped on public.session_students;
create policy session_students_select_scoped on public.session_students
  for select
  using (
    exists (select 1 from public.sessions s
            where s.id = session_students.session_id
              and s.teacher_id = (select auth.uid()))
    or is_admin_user((select auth.uid()))
    or exists (select 1 from public.sessions s
               where s.id = session_students.session_id
                 and s.status <> 'ended')
  );

create policy join_active_session_only on public.session_students
  for insert
  with check (
    exists (select 1 from public.sessions s
            where s.id = session_students.session_id
              and s.status = any (array['lobby','active','playing']))
  );

create policy students_update_own_in_active_session on public.session_students
  for update
  using (
    exists (select 1 from public.sessions s
            where s.id = session_students.session_id and s.status <> 'ended')
  )
  with check (
    exists (select 1 from public.sessions s
            where s.id = session_students.session_id and s.status <> 'ended')
  );

drop policy if exists session_activities_select_teacher on public.session_activities;
create policy "Read session activities by session" on public.session_activities
  for select using (true);

drop policy if exists round_scores_select_teacher on public.round_scores;
create policy round_scores_select_scoped on public.round_scores
  for select
  using (
    exists (select 1 from public.sessions s
            where s.id = round_scores.session_id
              and s.teacher_id = (select auth.uid()))
    or is_admin_user((select auth.uid()))
    or exists (select 1 from public.sessions s
               where s.id = round_scores.session_id and s.status <> 'ended')
  );

create policy submit_score_active_session_only on public.round_scores
  for insert
  with check (
    exists (select 1 from public.sessions s
            where s.id = round_scores.session_id
              and s.status = any (array['active','playing']))
  );

grant insert, update, delete, truncate, references, trigger
  on public.sessions, public.session_activities, public.class_children to anon;
grant insert, delete, truncate, references, trigger
  on public.session_students to anon;
grant update, delete, truncate, references, trigger
  on public.round_scores to anon;

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
    return;
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

grant execute on function public.session_lookup_by_code(text) to anon, authenticated;
grant execute on function public.class_validate_join(text, text) to anon, authenticated;
grant execute on function public.class_join(uuid, text) to anon, authenticated;
grant execute on function public.class_join_with_token(uuid, text) to anon, authenticated;

commit;
