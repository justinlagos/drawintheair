-- Rollback for 20260914000003_wp2a3_session_scoped_claims_expand.sql
-- (WP2A.3 / DIA-007 Stage B, expand half).
--
-- No data change. Drops the additive policies, the column guard and the
-- claim helpers, and restores the five student RPCs to the bodies they
-- had before the expand migration (verified against production and
-- staging on 2026-09-08).
--
-- Safe to run at any time while the expand migration is the newest
-- WP2A.3 object in the database. Do NOT run it after the contract
-- migration: contract removes the broad policies and depends on these
-- objects. Roll contract back first.

begin;

drop policy if exists sessions_select_student on public.sessions;
drop policy if exists session_students_select_student_self on public.session_students;
drop policy if exists session_students_update_student_self on public.session_students;
drop policy if exists session_activities_select_student on public.session_activities;
drop policy if exists round_scores_select_student on public.round_scores;
drop policy if exists round_scores_insert_student on public.round_scores;

drop trigger if exists trg_student_update_guard on public.session_students;
drop function if exists public.student_update_guard();

create or replace function public.class_get_session(in_session_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
declare r record;
begin
  if in_session_id is null then return null; end if;
  select s.id, s.code, s.session_code, s.activity, s.status, s.class_state,
         s.current_activity_id, s.class_name, s.scoreboard_visible,
         s.scoreboard_mode, s.round, s.timer_seconds, s.max_students,
         s.activity_version, s.updated_at
    into r
  from public.sessions s
  where s.id = in_session_id and s.status <> 'ended' and s.class_state <> 'ended'
  limit 1;
  if not found then return null; end if;
  return to_jsonb(r);
end $function$;

create or replace function public.class_get_self(in_student_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE r record;
BEGIN
    IF in_student_id IS NULL THEN RETURN NULL; END IF;
    SELECT ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.joined_at,
           ss.left_at, ss.is_active, ss.is_connected, ss.kicked_at, ss.kicked_reason
      INTO r
      FROM public.session_students ss
     WHERE ss.id = in_student_id
     LIMIT 1;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN to_jsonb(r);
END $function$;

create or replace function public.class_get_activity(in_activity_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE r record;
BEGIN
    IF in_activity_id IS NULL THEN RETURN NULL; END IF;
    SELECT sa.id, sa.session_id, sa.activity, sa.state, sa.ordinal,
           sa.started_at, sa.ended_at, COALESCE(sa.metadata, '{}'::jsonb) AS metadata
      INTO r
      FROM public.session_activities sa
     WHERE sa.id = in_activity_id
     LIMIT 1;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN to_jsonb(r);
END $function$;

create or replace function public.class_student_heartbeat(in_student_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
    update public.session_students ss
    set updated_at   = now(),
        is_connected = true,
        left_at      = null
    where ss.id = in_student_id
      and ss.kicked_at is null
      and exists (
          select 1 from public.sessions s
          where s.id = ss.session_id
            and s.status <> 'ended'
            and (s.class_state is null or s.class_state <> 'ended')
      );
    -- Silently a no-op for unknown ids, kicked students or ended sessions.
end;
$function$;

create or replace function public.class_set_readiness(in_student_id uuid, in_state text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_session uuid;
  v_kicked  timestamptz;
  v_class_state text;
begin
  if in_state not in (
    'camera_permission_needed','camera_ready','hand_detected','ready',
    'playing','tracking_lost','needs_help','completed','disconnected'
  ) then
    raise exception 'invalid or non-self-settable readiness state: %', in_state
      using errcode = '22023';
  end if;

  select ss.session_id, ss.kicked_at into v_session, v_kicked
    from public.session_students ss where ss.id = in_student_id;
  if v_session is null then
    raise exception 'student not found' using errcode = 'P0002';
  end if;
  if v_kicked is not null then
    raise exception 'student removed' using errcode = 'P0001';
  end if;

  select s.class_state into v_class_state from public.sessions s where s.id = v_session;
  if v_class_state is null or v_class_state = 'ended' then
    raise exception 'session not active' using errcode = 'P0001';
  end if;

  update public.session_students
     set readiness_state = in_state,
         readiness_changed_at = case
           when readiness_state is distinct from in_state then now()
           else readiness_changed_at
         end
   where id = in_student_id;

  return in_state;
end $function$;

drop function if exists public.assert_student_scope(uuid, uuid);
drop function if exists public.student_session_id();
drop function if exists public.student_row_id();

commit;
