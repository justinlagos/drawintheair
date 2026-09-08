-- WP2A.3 / DIA-007 Stage B, EXPAND half of expand and contract.
--
-- Adds session-scoped capability policies ALONGSIDE the existing broad
-- anonymous ones. Nothing is removed here, so the currently deployed
-- client keeps working unchanged. The contract migration
-- (20260921000001_wp2a3_session_scoped_claims_contract.sql) removes the
-- broad policies, and must not run until a client that ships the student
-- token is verified live.
--
-- The claim arrives in a short-lived HS256 JWT minted by the
-- class-join-token Edge Function. It has no `sub`, so auth.uid() stays
-- NULL and a student token can never satisfy a teacher or admin branch.
--
-- Realtime evaluates RLS as the subscriber's role with the token's
-- claims (realtime.apply_rls). Every function these policies call is
-- therefore granted to anon and authenticated: a missing EXECUTE grant
-- makes the policy raise, which is what killed postgres_changes in the
-- July is_admin_user incident.

begin;

-- ── Claim helpers ────────────────────────────────────────────────────
-- Both return NULL for any caller that is not carrying a student token,
-- so every policy below is simply false for ordinary anon traffic.

create or replace function public.student_session_id()
returns uuid
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select case
    when (auth.jwt() ->> 'kind') = 'student'
    then nullif(auth.jwt() ->> 'session_id', '')::uuid
  end;
$$;

create or replace function public.student_row_id()
returns uuid
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select case
    when (auth.jwt() ->> 'kind') = 'student'
    then nullif(auth.jwt() ->> 'student_id', '')::uuid
  end;
$$;

comment on function public.student_session_id() is
  'WP2A.3: session id from a student capability token, NULL otherwise.';
comment on function public.student_row_id() is
  'WP2A.3: roster row id from a student capability token, NULL otherwise.';

grant execute on function public.student_session_id() to anon, authenticated;
grant execute on function public.student_row_id() to anon, authenticated;

-- ── Additive policies ────────────────────────────────────────────────
-- Permissive policies are OR-ed, so these widen nothing: the existing
-- status <> 'ended' policies already allow strictly more.

drop policy if exists sessions_select_student on public.sessions;
create policy sessions_select_student on public.sessions
  for select to anon, authenticated
  using (id = public.student_session_id());

-- Self only. StudentClassClient subscribes to its own roster row and
-- nothing else, so a child never needs to read a classmate's name.
drop policy if exists session_students_select_student_self on public.session_students;
create policy session_students_select_student_self on public.session_students
  for select to anon, authenticated
  using (
    id = public.student_row_id()
    and session_id = public.student_session_id()
  );

drop policy if exists session_students_update_student_self on public.session_students;
create policy session_students_update_student_self on public.session_students
  for update to anon, authenticated
  using (
    id = public.student_row_id()
    and session_id = public.student_session_id()
  )
  with check (
    id = public.student_row_id()
    and session_id = public.student_session_id()
  );

drop policy if exists session_activities_select_student on public.session_activities;
create policy session_activities_select_student on public.session_activities
  for select to anon, authenticated
  using (session_id = public.student_session_id());

drop policy if exists round_scores_select_student on public.round_scores;
create policy round_scores_select_student on public.round_scores
  for select to anon, authenticated
  using (
    session_id = public.student_session_id()
    and student_id = public.student_row_id()
  );

drop policy if exists round_scores_insert_student on public.round_scores;
create policy round_scores_insert_student on public.round_scores
  for insert to anon, authenticated
  with check (
    session_id = public.student_session_id()
    and student_id = public.student_row_id()
    and exists (
      select 1 from public.sessions s
      where s.id = round_scores.session_id
        and s.status in ('active', 'playing')
    )
  );

-- ── Column guard for the student self-update ─────────────────────────
-- RLS cannot restrict columns. Without this a token holder could rename
-- itself, move to another session, or clear its own kick.

create or replace function public.student_update_guard()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if public.student_row_id() is not null then
    if new.name           is distinct from old.name
    or new.session_id     is distinct from old.session_id
    or new.class_child_id is distinct from old.class_child_id
    or new.kicked_at      is distinct from old.kicked_at
    or new.kicked_reason  is distinct from old.kicked_reason
    or new.tenant_id      is distinct from old.tenant_id
    or new.avatar_seed    is distinct from old.avatar_seed
    or new.joined_at      is distinct from old.joined_at then
      raise exception 'students may only update presence and readiness'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.student_update_guard() is
  'WP2A.3: a student capability token may only change presence and readiness columns.';

drop trigger if exists trg_student_update_guard on public.session_students;
create trigger trg_student_update_guard
  before update on public.session_students
  for each row execute function public.student_update_guard();

-- ── Scope assertion for the student RPCs ─────────────────────────────
-- The class_* RPCs are SECURITY DEFINER and bypass RLS, so scoping the
-- tables is not enough. During expand the assertion only bites when a
-- claim is present, which keeps the deployed client working. The
-- contract migration makes the claim mandatory.

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
    return;  -- expand phase: untokened callers keep the old behaviour
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

comment on function public.assert_student_scope(uuid, uuid) is
  'WP2A.3: a student capability token may only address its own session and roster row.';

grant execute on function public.assert_student_scope(uuid, uuid) to anon, authenticated;

create or replace function public.class_get_session(in_session_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
declare r record;
begin
  if in_session_id is null then return null; end if;
  perform public.assert_student_scope(in_session_id);
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
declare r record;
begin
    IF in_student_id IS NULL THEN RETURN NULL; END IF;
    perform public.assert_student_scope(
      (select ss.session_id from public.session_students ss where ss.id = in_student_id),
      in_student_id);
    SELECT ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.joined_at,
           ss.left_at, ss.is_active, ss.is_connected, ss.kicked_at, ss.kicked_reason
      INTO r
      FROM public.session_students ss
     WHERE ss.id = in_student_id
     LIMIT 1;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN to_jsonb(r);
end $function$;

create or replace function public.class_get_activity(in_activity_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
declare r record;
begin
    IF in_activity_id IS NULL THEN RETURN NULL; END IF;
    perform public.assert_student_scope(
      (select sa.session_id from public.session_activities sa where sa.id = in_activity_id));
    SELECT sa.id, sa.session_id, sa.activity, sa.state, sa.ordinal,
           sa.started_at, sa.ended_at, COALESCE(sa.metadata, '{}'::jsonb) AS metadata
      INTO r
      FROM public.session_activities sa
     WHERE sa.id = in_activity_id
     LIMIT 1;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN to_jsonb(r);
end $function$;

create or replace function public.class_student_heartbeat(in_student_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
    perform public.assert_student_scope(
      (select ss.session_id from public.session_students ss where ss.id = in_student_id),
      in_student_id);
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

  perform public.assert_student_scope(v_session, in_student_id);

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

commit;
