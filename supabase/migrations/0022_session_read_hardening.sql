-- ═══════════════════════════════════════════════════════════════════════════
-- 0022_session_read_hardening.sql
--
-- H1: classroom data was readable by anyone (role `public`, incl. anon) via the
-- `status <> 'ended'` disjunct on sessions / round_scores / session_students.
-- That let an unauthenticated visitor enumerate every active session across all
-- schools, including teacher_id / school_id / tenant_id linkage and children's
-- first names.
--
-- This was the planned-but-unfinished follow-up the team documented in
-- platform/supabase/migrations/20260521_security_lockdown.sql ("gate every
-- read through SECURITY DEFINER … Tracked against audit C1").
--
-- Approach (faithful to the live student flow in StudentClassClient.tsx, which
-- keeps Supabase Realtime — so anon retains a *column-restricted* row read):
--   1. round_scores: lock SELECT to owner/admin. The live student client never
--      reads round_scores, so this is a pure server-side closure.
--   2. sessions / session_students / session_activities: anon loses table-wide
--      SELECT and is re-granted SELECT only on the NON-sensitive columns the
--      Realtime handlers actually use. Cross-tenant linkage (teacher_id,
--      school_id, tenant_id, metadata) and children's names/avatars are no
--      longer readable by anon via REST or Realtime.
--   3. Provide SECURITY DEFINER RPCs, keyed on the session/student id the
--      student already holds (capability), that return the full safe data the
--      client needs (join+dedupe, self, session, activity). The client reads go
--      through these instead of broad table reads.
--
-- Residual (documented): anon can still observe non-PII columns (status,
-- code, activity, round) of *active* sessions via the retained Realtime row
-- read. Eliminating that entirely requires Realtime Authorization / Broadcast
-- or moving students fully to RPC polling — a deliberate follow-up, not this
-- change.
--
-- BEHAVIOUR: the student join → play → kick → end → reconnect flow is preserved
-- (reads return the same shapes via RPC). Teacher/parent/admin paths are
-- unchanged (they use the `authenticated` role, which keeps full grants; RLS
-- still scopes rows to the owner/admin).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. round_scores — remove the open `status <> 'ended'` read.
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "round_scores_select_scoped" on public.round_scores;
create policy "round_scores_select_scoped" on public.round_scores
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = round_scores.session_id
        and s.teacher_id = (select auth.uid())
    )
    or is_admin_user((select auth.uid()))
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Column-restricted anon SELECT (keeps Realtime working, drops sensitive
--    columns). authenticated/service_role keep full access; RLS row policies
--    are unchanged so teachers/admins still only see their own rows.
-- ─────────────────────────────────────────────────────────────────────────

-- sessions: anon may read only the non-sensitive columns the Realtime session
-- handler uses. Drops teacher_id, school_id, tenant_id, metadata from anon.
revoke select on public.sessions from anon;
grant select (
  id, code, session_code, activity, status, class_state, current_activity_id,
  class_name, scoreboard_visible, scoreboard_mode, round, timer_seconds,
  max_students, playlist_id, created_at, started_at, updated_at, ended_at
) on public.sessions to anon;

-- session_students: anon may read only the columns the self / kick Realtime
-- handler uses. Drops name, student_name, student_avatar, avatar_seed,
-- tenant_id, class_child_id from anon (children's PII no longer enumerable).
revoke select on public.session_students from anon;
grant select (
  id, session_id, is_active, is_connected, joined_at, left_at, updated_at,
  kicked_at, kicked_reason
) on public.session_students to anon;

-- session_activities: anon keeps render fields; drops tenant_id.
revoke select on public.session_activities from anon;
grant select (
  id, session_id, activity, state, ordinal, started_at, ended_at, metadata
) on public.session_activities to anon;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Capability-scoped SECURITY DEFINER RPCs for the student client.
--    Each returns the full safe projection the client needs, keyed on an id
--    the student already holds. All anon-callable, search_path locked.
-- ─────────────────────────────────────────────────────────────────────────

-- 3a. class_get_session(in_session_id) — safe session projection for a
--     non-ended session. No teacher_id / school_id / tenant_id / metadata.
drop function if exists public.class_get_session(uuid);
create function public.class_get_session(in_session_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare r record;
begin
  if in_session_id is null then return null; end if;
  select s.id, s.code, s.session_code, s.activity, s.status, s.class_state,
         s.current_activity_id, s.class_name, s.scoreboard_visible,
         s.scoreboard_mode, s.round, s.timer_seconds, s.max_students
    into r
  from public.sessions s
  where s.id = in_session_id and s.status <> 'ended' and s.class_state <> 'ended'
  limit 1;
  if not found then return null; end if;
  return to_jsonb(r);
end $$;
revoke all on function public.class_get_session(uuid) from public;
grant execute on function public.class_get_session(uuid) to anon, authenticated, service_role;

-- 3b. class_get_activity(in_activity_id) — activity row for rendering.
drop function if exists public.class_get_activity(uuid);
create function public.class_get_activity(in_activity_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare r record;
begin
  if in_activity_id is null then return null; end if;
  select a.id, a.session_id, a.activity, a.state, a.ordinal,
         a.started_at, a.ended_at, a.metadata
    into r
  from public.session_activities a
  where a.id = in_activity_id
  limit 1;
  if not found then return null; end if;
  return to_jsonb(r);
end $$;
revoke all on function public.class_get_activity(uuid) from public;
grant execute on function public.class_get_activity(uuid) to anon, authenticated, service_role;

-- 3c. class_get_self(in_student_id) — a student's own row (incl. name + kick
--     state). Definer so it works even though anon can't read the name column.
drop function if exists public.class_get_self(uuid);
create function public.class_get_self(in_student_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare r record;
begin
  if in_student_id is null then return null; end if;
  select ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.is_active,
         ss.kicked_at, ss.kicked_reason
    into r
  from public.session_students ss
  where ss.id = in_student_id
  limit 1;
  if not found then return null; end if;
  return to_jsonb(r);
end $$;
revoke all on function public.class_get_self(uuid) from public;
grant execute on function public.class_get_self(uuid) to anon, authenticated, service_role;

-- 3d. class_join(in_session_id, in_name) — server-side join. Validates the
--     session is joinable, dedupes the display name against the roster, inserts
--     the row, and returns it. Replaces the client-side roster read + insert,
--     so anon no longer needs to read other children's names.
drop function if exists public.class_join(uuid, text);
create function public.class_join(in_session_id uuid, in_name text)
returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_state  text;
  v_base   text;
  v_final  text;
  v_i      int := 2;
  v_id     uuid;
  r        record;
begin
  if in_session_id is null or coalesce(btrim(in_name), '') = '' then
    raise exception 'invalid join request' using errcode = '22023';
  end if;

  select s.status, s.class_state into v_status, v_state
  from public.sessions s where s.id = in_session_id limit 1;
  if not found or v_status = 'ended' or v_state = 'ended' then
    raise exception 'session not joinable' using errcode = 'P0002';
  end if;

  v_base  := left(btrim(in_name), 40);
  v_final := v_base;
  -- Dedupe against existing roster names for this session (server-side).
  while exists (
    select 1 from public.session_students ss
    where ss.session_id = in_session_id and ss.name = v_final
  ) and v_i <= 50 loop
    v_final := v_base || v_i::text;
    v_i := v_i + 1;
  end loop;

  -- avatar_seed is deterministic in the client (avatarForStudent):
  -- `${sessionId}:${name.toLowerCase().trim()}`. Reproduce it exactly so the
  -- teacher view and the student render the same avatar.
  insert into public.session_students (session_id, name, avatar_seed)
  values (in_session_id, v_final, in_session_id::text || ':' || lower(btrim(v_final)))
  returning id into v_id;

  select ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.is_active,
         ss.kicked_at, ss.kicked_reason
    into r
  from public.session_students ss where ss.id = v_id;
  return to_jsonb(r);
end $$;
revoke all on function public.class_join(uuid, text) from public;
grant execute on function public.class_join(uuid, text) to anon, authenticated, service_role;

comment on function public.class_join(uuid, text) is
  'Anon-callable class join: validates joinable session, dedupes name, inserts roster row, returns it. Part of H1 (0022).';
