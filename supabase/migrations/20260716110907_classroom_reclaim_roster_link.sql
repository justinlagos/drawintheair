-- 20260716000001_classroom_reclaim_roster_link.sql
-- ============================================================================
-- Classroom join reconciliation: rejoin-reclaim + roster-aware name join,
-- and repair of the silently broken presence heartbeat.
--
-- CONTEXT (verified live 16 Jul 2026):
--  * class_student_heartbeat fails on EVERY call with 428C9 because it sets
--    is_active, a GENERATED ALWAYS (as is_connected) column. The client calls
--    it fire-and-forget, so the error is swallowed: session_students.updated_at
--    never moves after join and the teacher's engaged/offline pills read from
--    stale data. Fix: stop assigning the generated column.
--  * class_join dedupes typed names with a counter ("Kaito" -> "Kaito2") even
--    when the collision is the SAME child rejoining a long-lived session on a
--    later day (sessions are intentionally persistent: wall-poster join code).
--    Fix: a name that matches a row nobody is actively using RECLAIMS that row.
--  * class_join never consults the teacher's persistent roster
--    (class_children), so per-child insights stay empty. Fix: when the typed
--    name matches EXACTLY ONE unarchived roster child of the session's
--    teacher, link session_students.class_child_id. Ambiguous names (e.g. two
--    Evelyns on one roster) are never guessed - left NULL.
--
-- Product decisions (founder, 16 Jul 2026):
--  * code + typed name stays the only join path (pictures remain retired)
--  * sessions stay open across days on purpose; rejoin must reclaim
--  * ambiguity is never guessed server-side
--
-- Behaviour contract of class_join v2 (return shape UNCHANGED):
--  1. Validate session exists and is not ended (unchanged).
--  2. Walk candidate names: base, base2, base3 ... base50 (unchanged naming).
--     For each candidate, compare CASE-INSENSITIVELY against the session's
--     rows:
--       - no row           -> insert new row under this candidate
--       - row, kicked      -> skip candidate (kicked identity is never reused)
--       - row, stale       -> RECLAIM: refresh presence, return that row
--                             (stale = no heartbeat for 25s; heartbeat is 5s)
--       - row, fresh       -> candidate actively in use -> next candidate
--  3. On insert (or on reclaim of an unlinked row), attach class_child_id iff
--     exactly one roster match on the teacher's unarchived class_children
--     (first_name, nickname, or display_name; case/space-insensitive).
--
-- Rollback: re-run 0029_restore_class_join_function.sql (class_join) and
-- 0026 (class_student_heartbeat) definitions; both functions are replaced,
-- no schema/data changes in this migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Presence heartbeat: drop the generated-column assignment (is_active is
--    GENERATED ALWAYS AS (is_connected) STORED - setting is_connected is
--    enough and is what the pills actually need).
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. class_join v2: reclaim + roster link.
-- ----------------------------------------------------------------------------
create or replace function public.class_join(in_session_id uuid, in_name text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_status     text;
  v_state      text;
  v_teacher    uuid;
  v_base       text;
  v_candidate  text;
  v_i          int := 2;
  v_id         uuid;
  v_child      uuid;   -- unambiguous roster match (or null)
  v_matches    int;
  existing     record;
  r            record;
begin
  if in_session_id is null or coalesce(btrim(in_name), '') = '' then
    raise exception 'invalid join request' using errcode = '22023';
  end if;

  select s.status, s.class_state, s.teacher_id
    into v_status, v_state, v_teacher
  from public.sessions s where s.id = in_session_id limit 1;
  if not found or v_status = 'ended' or v_state = 'ended' then
    raise exception 'session not joinable' using errcode = 'P0002';
  end if;

  v_base := left(btrim(in_name), 40);

  -- Roster match: exactly one unarchived child of this teacher whose
  -- first_name, nickname or display_name equals the typed name
  -- (case/whitespace-insensitive). 0 or 2+ matches -> no link, never guessed.
  select count(*), min(cc.id::text)::uuid
    into v_matches, v_child
  from public.class_children cc
  where cc.teacher_id = v_teacher
    and cc.archived = false
    and lower(btrim(v_base)) in (
          lower(btrim(coalesce(cc.first_name,   ''))),
          lower(btrim(coalesce(cc.nickname,     ''))),
          lower(btrim(coalesce(cc.display_name, '')))
        )
    and lower(btrim(v_base)) <> '';
  if v_matches is distinct from 1 then
    v_child := null;
  end if;

  -- Candidate walk: base, base2, base3, ... (same naming scheme as v1).
  v_candidate := v_base;
  loop
    select ss.id, ss.kicked_at, ss.updated_at, ss.class_child_id
      into existing
    from public.session_students ss
    where ss.session_id = in_session_id
      and lower(btrim(ss.name)) = lower(btrim(v_candidate))
    order by ss.joined_at asc
    limit 1;

    if not found then
      -- Free name: new student row.
      insert into public.session_students (session_id, name, avatar_seed, class_child_id)
      values (
        in_session_id,
        v_candidate,
        in_session_id::text || ':' || lower(btrim(v_candidate)),
        v_child
      )
      returning id into v_id;
      exit;
    end if;

    if existing.kicked_at is null
       and existing.updated_at < now() - interval '25 seconds' then
      -- Same name, nobody actively using it: the child is rejoining.
      update public.session_students ss
      set updated_at     = now(),
          is_connected   = true,
          left_at        = null,
          class_child_id = coalesce(ss.class_child_id, v_child)
      where ss.id = existing.id
      returning ss.id into v_id;
      exit;
    end if;

    -- Name actively in use (fresh heartbeat) or belongs to a kicked child:
    -- fall through to the next suffixed candidate.
    if v_i > 50 then
      raise exception 'no free name available' using errcode = 'P0003';
    end if;
    v_candidate := v_base || v_i::text;
    v_i := v_i + 1;
  end loop;

  select ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.is_active,
         ss.kicked_at, ss.kicked_reason
    into r
  from public.session_students ss where ss.id = v_id;
  return to_jsonb(r);
end $function$;

revoke all on function public.class_student_heartbeat(uuid) from public;
grant execute on function public.class_student_heartbeat(uuid) to anon, authenticated, service_role;

revoke all on function public.class_join(uuid, text) from public;
grant execute on function public.class_join(uuid, text) to anon, authenticated, service_role;
