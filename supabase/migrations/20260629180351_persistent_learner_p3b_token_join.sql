-- ════════════════════════════════════════════════════════════════════
-- Persistent learner — P3b: teacher-assigned token join (Decision §11)
-- ════════════════════════════════════════════════════════════════════
-- STATUS: validated on STAGING (dcivdrhxeaiulbbhsgfv). NOT applied to prod.
-- Additive. Implements the keystone wiring of session_students.class_child_id
-- via the founder-approved model: the teacher assigns each rostered learner a
-- simple picture token for the session; the child enters the code then picks
-- THEIR picture from a fixed client-side palette. The roster (and its size) is
-- NEVER returned to anon — the server only confirms one specific token.
--
-- Flow: enter code → choose teacher-given picture → teacher sees join → start.
--
-- Privacy principle (§11): a valid session code grants only the minimum
-- capability to join, never roster visibility. Tokens are per-session
-- (re-assignable / resettable each session).
-- ════════════════════════════════════════════════════════════════════

-- ── Per-session token → persistent-learner map ───────────────────────
create table if not exists public.class_session_tokens (
    id                          uuid primary key default gen_random_uuid(),
    session_id                  uuid not null references public.sessions(id) on delete cascade,
    class_child_id              uuid not null references public.class_children(id) on delete cascade,
    token                       text not null,
    created_at                  timestamptz not null default now(),
    claimed_at                  timestamptz,
    claimed_session_student_id  uuid references public.session_students(id) on delete set null,
    tenant_id                   uuid references public.tenants(id),
    unique (session_id, token),
    unique (session_id, class_child_id)
);

alter table public.class_session_tokens enable row level security;

-- Teacher who owns the session may read/manage its token assignments.
-- Anon has NO direct access (no roster leak); anon joins only via the RPC.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public'
      and tablename='class_session_tokens' and policyname='cst_teacher_rw'
  ) then
    create policy cst_teacher_rw on public.class_session_tokens
      for all to authenticated
      using (exists (select 1 from public.sessions s
                      where s.id = class_session_tokens.session_id and s.teacher_id = auth.uid()))
      with check (exists (select 1 from public.sessions s
                      where s.id = class_session_tokens.session_id and s.teacher_id = auth.uid()));
  end if;
end $$;

-- ── Teacher: assign / re-assign a learner's token for a session ───────
create or replace function public.class_assign_token(
    in_session_id uuid, in_class_child_id uuid, in_token text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not exists (select 1 from sessions s where s.id = in_session_id and s.teacher_id = auth.uid()) then
    raise exception 'not session owner' using errcode = '42501';
  end if;
  if not exists (select 1 from class_children c where c.id = in_class_child_id and c.teacher_id = auth.uid()) then
    raise exception 'not your learner' using errcode = '42501';
  end if;
  insert into class_session_tokens (session_id, class_child_id, token)
    values (in_session_id, in_class_child_id, in_token)
    on conflict (session_id, class_child_id)
      do update set token = excluded.token, claimed_at = null, claimed_session_student_id = null
    returning id into v_id;
  return v_id;
end $$;

revoke all on function public.class_assign_token(uuid, uuid, text) from public;
grant execute on function public.class_assign_token(uuid, uuid, text) to authenticated;

-- ── Anon child: join by picking the teacher-given token ───────────────
create or replace function public.class_join_with_token(in_session_id uuid, in_token text)
returns public.session_students
language plpgsql security definer set search_path = public
as $$
declare
  v_child uuid; v_claimed uuid; v_class_state text;
  v_name text; v_avatar text; v_row public.session_students;
begin
  select class_state into v_class_state from sessions where id = in_session_id;
  if v_class_state is null or v_class_state = 'ended' then
    raise exception 'session not joinable' using errcode = 'P0001';
  end if;

  select cst.class_child_id, cst.claimed_session_student_id
    into v_child, v_claimed
    from class_session_tokens cst
    where cst.session_id = in_session_id and cst.token = in_token;

  -- Generic error: never reveal whether a token exists / who is on the roster.
  if v_child is null then
    raise exception 'could not join' using errcode = 'P0002';
  end if;

  -- Idempotent rejoin: token already claimed by a still-active student.
  if v_claimed is not null then
    select * into v_row from session_students where id = v_claimed;
    if found and v_row.kicked_at is null then
      return v_row;
    end if;
    raise exception 'could not join' using errcode = 'P0001';
  end if;

  select coalesce(nullif(cc.nickname,''), nullif(cc.display_name,''), 'Learner'), cc.avatar_seed
    into v_name, v_avatar
    from class_children cc where cc.id = v_child;

  begin
    insert into session_students (session_id, name, class_child_id, avatar_seed, readiness_state)
      values (in_session_id, v_name, v_child, v_avatar, 'joined')
      returning * into v_row;
  exception when unique_violation then
    -- display-name collision within the session: disambiguate, never merge.
    insert into session_students (session_id, name, class_child_id, avatar_seed, readiness_state)
      values (in_session_id, v_name || ' ' || right(v_child::text, 4), v_child, v_avatar, 'joined')
      returning * into v_row;
  end;

  update class_session_tokens
     set claimed_at = now(), claimed_session_student_id = v_row.id
   where session_id = in_session_id and token = in_token;

  return v_row;
end $$;

revoke all on function public.class_join_with_token(uuid, text) from public;
grant execute on function public.class_join_with_token(uuid, text) to anon, authenticated;

comment on table public.class_session_tokens is
  'P3b (§11): per-session teacher-assigned picture tokens mapping to persistent class_children. Never exposed to anon; child joins by confirming one token.';

-- ── ROLLBACK ──────────────────────────────────────────────────────────
-- drop function if exists public.class_join_with_token(uuid, text);
-- drop function if exists public.class_assign_token(uuid, uuid, text);
-- drop table if exists public.class_session_tokens;
