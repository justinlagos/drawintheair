-- =====================================================================
-- 0013_tenant_isolation.sql
--
-- Multi-tenant data architecture + role isolation.
--
-- Problems fixed:
--   1. handle_new_user() created a public.teachers row for EVERY new
--      auth user, so parent accounts silently became "teachers" and
--      could open the classroom area with parent credentials.
--   2. handle_new_parent_user() created a parent_profiles row for
--      every user too, so teachers silently became "parents".
--   3. No tenant concept: tables could not say which organisation or
--      category (parent / teacher / school) a row belongs to.
--   4. Several LIOS tables were readable by ANY authenticated user
--      ("using (true)") - a cross-tenant read leak.
--
-- Design:
--   * tenants + tenant_members. One tenant per parent account, per
--     teacher account, per school. A user may belong to several
--     tenants, but ONLY by explicitly signing up for that role
--     (register_parent / register_teacher, or the role-scoped signup
--     triggers). Parent credentials alone no longer grant teacher
--     access, and vice versa.
--   * tenant_id column on every public table (nullable: NULL means
--     platform-scope or anonymous-play data with no tenant).
--   * BEFORE INSERT stamping triggers derive tenant_id automatically.
--   * RLS tightened: classroom writes require a real teacher account;
--     LIOS fact tables are admin-only (apps use SECURITY DEFINER RPCs).
--
-- Anonymous flows are intentionally preserved: /play analytics
-- inserts, student join-by-code, and the public transparency RPCs
-- continue to work exactly as before.
-- =====================================================================

-- ── 1. Tenants ───────────────────────────────────────────────────────

create table if not exists public.tenants (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('parent','teacher','school','platform')),
  owner_user_id uuid references auth.users(id) on delete set null,
  name          text,
  created_at    timestamptz not null default now()
);
alter table public.tenants enable row level security;

create table if not exists public.tenant_members (
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'owner',
  created_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
alter table public.tenant_members enable row level security;

-- Members can see their own tenants/memberships. No client-side writes:
-- tenant rows are only created by SECURITY DEFINER functions below.
drop policy if exists tenants_select_member on public.tenants;
create policy tenants_select_member on public.tenants
  for select to authenticated
  using (exists (select 1 from public.tenant_members m
                 where m.tenant_id = tenants.id and m.user_id = (select auth.uid())));

drop policy if exists tenant_members_select_own on public.tenant_members;
create policy tenant_members_select_own on public.tenant_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ── 2. Role helpers ──────────────────────────────────────────────────

create or replace function public.has_parent_role() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from parent_profiles p where p.id = auth.uid());
$$;

create or replace function public.has_teacher_role() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from teacher_profiles t where t.auth_user_id = auth.uid());
$$;

create or replace function public.user_tenant_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from tenant_members where user_id = auth.uid();
$$;

-- One round-trip role probe for the frontend gates.
create or replace function public.get_account_roles() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'parent',  exists (select 1 from parent_profiles p where p.id = auth.uid()),
    'teacher', exists (select 1 from teacher_profiles t where t.auth_user_id = auth.uid()),
    'admin',   coalesce((select is_admin from teachers tr where tr.id = auth.uid()), false)
  );
$$;
revoke execute on function public.get_account_roles() from anon;
grant  execute on function public.get_account_roles() to authenticated;

-- ── 3. Tenant provisioning (idempotent) ──────────────────────────────

create or replace function public._ensure_tenant(
  in_kind text, in_owner uuid, in_name text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare t_id uuid;
begin
  select id into t_id from tenants where kind = in_kind and owner_user_id = in_owner limit 1;
  if t_id is null then
    insert into tenants (kind, owner_user_id, name) values (in_kind, in_owner, in_name)
    returning id into t_id;
  end if;
  insert into tenant_members (tenant_id, user_id) values (t_id, in_owner)
  on conflict do nothing;
  return t_id;
end;
$$;
revoke all on function public._ensure_tenant(text, uuid, text) from public, anon, authenticated;

-- Explicit role registration. Calling one of these IS the explicit
-- signup the isolation rule allows ("except that account has
-- explicitly signed up with that email").
create or replace function public.register_parent() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u record; t_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select id, email, raw_user_meta_data into u from auth.users where id = auth.uid();
  insert into parent_profiles (id, email, display_name)
  values (
    u.id, u.email,
    coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name',
             split_part(coalesce(u.email,''), '@', 1))
  )
  on conflict (id) do nothing;
  t_id := public._ensure_tenant('parent', u.id, coalesce(u.raw_user_meta_data->>'display_name', u.email));
  update parent_profiles set tenant_id = t_id where id = u.id and tenant_id is null;
  return jsonb_build_object('ok', true, 'tenant_id', t_id);
end;
$$;
revoke execute on function public.register_parent() from anon;
grant  execute on function public.register_parent() to authenticated;

create or replace function public.register_teacher(
  in_full_name text default null, in_school_name text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u record; t_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select id, email, raw_user_meta_data into u from auth.users where id = auth.uid();
  insert into teacher_profiles (auth_user_id, full_name, school_name)
  values (
    u.id,
    coalesce(in_full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
    coalesce(in_school_name, u.raw_user_meta_data->>'school_name')
  )
  on conflict (auth_user_id) do nothing;
  -- The teachers row carries tier/trial state for class mode.
  insert into teachers (id, email, name, avatar_url)
  values (
    u.id, coalesce(u.email, ''),
    coalesce(in_full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
    coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do nothing;
  t_id := public._ensure_tenant('teacher', u.id, coalesce(in_full_name, u.email));
  update teacher_profiles set tenant_id = t_id where auth_user_id = u.id and tenant_id is null;
  update teachers set tenant_id = t_id where id = u.id and tenant_id is null;
  return jsonb_build_object('ok', true, 'tenant_id', t_id);
end;
$$;
revoke execute on function public.register_teacher(text, text) from anon;
grant  execute on function public.register_teacher(text, text) to authenticated;

-- ── 4. Role-correct signup triggers ──────────────────────────────────
-- Previously: EVERY new auth user got a teachers row (handle_new_user)
-- and a parent_profiles row (handle_new_parent_user). That is the root
-- cause of parents reaching the teacher area. Now each trigger only
-- fires for its explicitly declared role.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.raw_user_meta_data ->> 'role') = 'teacher' then
    insert into public.teachers (id, email, name, avatar_url)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
      coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_parent_user()
returns trigger language plpgsql security definer set search_path = 'public' as $$
begin
  if (new.raw_user_meta_data ->> 'role') = 'parent' then
    insert into parent_profiles (id, email, display_name)
    values (
      new.id,
      new.email,
      coalesce(
        new.raw_user_meta_data->>'display_name',
        new.raw_user_meta_data->>'full_name',
        split_part(coalesce(new.email,''), '@', 1)
      )
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

-- ── 5. tenant_id on every table ──────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'teachers','sessions','session_students','round_scores','schools',
    'school_teachers','school_invites','playlists','teacher_insights',
    'platform_insights','client_errors','admin_alerts','form_submissions',
    'newsletter_subscribers','analytics_events','learning_attempts',
    'session_activities','item_difficulty','skill_state','skill_state_history',
    'mastery_episode_fact','lios_pipeline_runs','lios_adaptive_decisions',
    'human_observation_fact','lios_anomaly_fact','pricing_config',
    'parent_profiles','parent_subscriptions','child_profiles',
    'child_learning_state','child_activity_summary','parent_controls',
    'billing_events','consent_records','data_deletion_requests',
    'stripe_price_map','teacher_profiles'
  ] loop
    execute format(
      'alter table public.%I add column if not exists tenant_id uuid references public.tenants(id)', t);
  end loop;
end $$;

create index if not exists idx_sessions_tenant          on public.sessions (tenant_id) where tenant_id is not null;
create index if not exists idx_child_profiles_tenant    on public.child_profiles (tenant_id) where tenant_id is not null;
create index if not exists idx_learning_attempts_tenant on public.learning_attempts (tenant_id) where tenant_id is not null;
create index if not exists idx_session_students_tenant  on public.session_students (tenant_id) where tenant_id is not null;

-- ── 6. Backfill ──────────────────────────────────────────────────────

-- 6a. Grandfather REAL teachers: anyone who actually ran a class or is
-- an admin gets a teacher_profiles row (their explicit usage is the
-- signup). Auto-created teachers rows for parents who never used class
-- mode are NOT grandfathered; those users can opt in from /class.
insert into public.teacher_profiles (auth_user_id, full_name)
select tr.id, nullif(tr.name, '')
from public.teachers tr
where (tr.is_admin or exists (select 1 from public.sessions s where s.teacher_id = tr.id))
  and not exists (select 1 from public.teacher_profiles tp where tp.auth_user_id = tr.id);

-- 6b. Tenants for every parent profile, teacher profile, school.
insert into public.tenants (kind, owner_user_id, name)
select 'parent', p.id, coalesce(p.display_name, p.email)
from public.parent_profiles p
where not exists (select 1 from public.tenants t where t.kind = 'parent' and t.owner_user_id = p.id);

insert into public.tenants (kind, owner_user_id, name)
select 'teacher', tp.auth_user_id, tp.full_name
from public.teacher_profiles tp
where not exists (select 1 from public.tenants t where t.kind = 'teacher' and t.owner_user_id = tp.auth_user_id);

insert into public.tenants (kind, owner_user_id, name)
select 'school', s.admin_user_id, s.name
from public.schools s
where s.admin_user_id is not null
  and not exists (select 1 from public.tenants t where t.kind = 'school' and t.owner_user_id = s.admin_user_id);

insert into public.tenant_members (tenant_id, user_id)
select t.id, t.owner_user_id from public.tenants t
where t.owner_user_id is not null
on conflict do nothing;

-- 6c. Stamp tenant_id on existing rows.
with pt as (select owner_user_id u, id t from public.tenants where kind = 'parent')
update public.parent_profiles p set tenant_id = pt.t from pt where p.id = pt.u and p.tenant_id is null;

with pt as (select owner_user_id u, id t from public.tenants where kind = 'parent')
update public.parent_subscriptions x set tenant_id = pt.t from pt where x.parent_id = pt.u and x.tenant_id is null;

with pt as (select owner_user_id u, id t from public.tenants where kind = 'parent')
update public.child_profiles x set tenant_id = pt.t from pt where x.parent_id = pt.u and x.tenant_id is null;

update public.child_learning_state x set tenant_id = c.tenant_id
from public.child_profiles c where x.child_profile_id = c.id and x.tenant_id is null;

update public.child_activity_summary x set tenant_id = c.tenant_id
from public.child_profiles c where x.child_profile_id = c.id and x.tenant_id is null;

with pt as (select owner_user_id u, id t from public.tenants where kind = 'parent')
update public.parent_controls x set tenant_id = pt.t from pt where x.parent_id = pt.u and x.tenant_id is null;

with pt as (select owner_user_id u, id t from public.tenants where kind = 'parent')
update public.billing_events x set tenant_id = pt.t from pt where x.parent_id = pt.u and x.tenant_id is null;

with pt as (select owner_user_id u, id t from public.tenants where kind = 'parent')
update public.consent_records x set tenant_id = pt.t from pt where x.parent_id = pt.u and x.tenant_id is null;

with pt as (select owner_user_id u, id t from public.tenants where kind = 'parent')
update public.data_deletion_requests x set tenant_id = pt.t from pt where x.parent_id = pt.u and x.tenant_id is null;

update public.learning_attempts x set tenant_id = c.tenant_id
from public.child_profiles c where x.child_profile_id = c.id and x.tenant_id is null;

with tt as (select owner_user_id u, id t from public.tenants where kind = 'teacher')
update public.teachers x set tenant_id = tt.t from tt where x.id = tt.u and x.tenant_id is null;

with tt as (select owner_user_id u, id t from public.tenants where kind = 'teacher')
update public.teacher_profiles x set tenant_id = tt.t from tt where x.auth_user_id = tt.u and x.tenant_id is null;

with tt as (select owner_user_id u, id t from public.tenants where kind = 'teacher')
update public.sessions x set tenant_id = tt.t from tt where x.teacher_id = tt.u and x.tenant_id is null;

update public.session_students x set tenant_id = s.tenant_id
from public.sessions s where x.session_id = s.id and x.tenant_id is null;

update public.session_activities x set tenant_id = s.tenant_id
from public.sessions s where x.session_id = s.id and x.tenant_id is null;

update public.round_scores x set tenant_id = s.tenant_id
from public.sessions s where x.session_id = s.id and x.tenant_id is null;

with tt as (select owner_user_id u, id t from public.tenants where kind = 'teacher')
update public.playlists x set tenant_id = tt.t from tt where x.teacher_id = tt.u and x.tenant_id is null;

with tt as (select owner_user_id u, id t from public.tenants where kind = 'teacher')
update public.teacher_insights x set tenant_id = tt.t from tt where x.teacher_id = tt.u and x.tenant_id is null;

with st as (select owner_user_id u, id t from public.tenants where kind = 'school')
update public.schools x set tenant_id = st.t from st where x.admin_user_id = st.u and x.tenant_id is null;

update public.school_teachers x set tenant_id = s.tenant_id
from public.schools s where x.school_id = s.id and x.tenant_id is null;

update public.school_invites x set tenant_id = s.tenant_id
from public.schools s where x.school_id = s.id and x.tenant_id is null;

-- ── 7. Stamping triggers (BEFORE INSERT, only when tenant_id is null) ─

create or replace function public._stamp_parent_tenant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tenant_id is null then
    select id into new.tenant_id from tenants
    where kind = 'parent' and owner_user_id = coalesce(new.parent_id, auth.uid()) limit 1;
  end if;
  return new;
end;
$$;

create or replace function public._stamp_parent_profile_tenant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tenant_id is null then
    select id into new.tenant_id from tenants
    where kind = 'parent' and owner_user_id = new.id limit 1;
  end if;
  return new;
end;
$$;

create or replace function public._stamp_child_tenant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tenant_id is null and new.child_profile_id is not null then
    select tenant_id into new.tenant_id from child_profiles where id = new.child_profile_id;
  end if;
  return new;
end;
$$;

create or replace function public._stamp_teacher_tenant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tenant_id is null then
    select id into new.tenant_id from tenants
    where kind = 'teacher' and owner_user_id = coalesce(new.teacher_id, auth.uid()) limit 1;
  end if;
  return new;
end;
$$;

create or replace function public._stamp_session_tenant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tenant_id is null and new.session_id is not null then
    select tenant_id into new.tenant_id from sessions where id = new.session_id;
  end if;
  return new;
end;
$$;

do $$
begin
  -- parent-owned tables (have parent_id)
  execute 'drop trigger if exists stamp_tenant on public.child_profiles';
  execute 'create trigger stamp_tenant before insert on public.child_profiles for each row execute function public._stamp_parent_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.parent_controls';
  execute 'create trigger stamp_tenant before insert on public.parent_controls for each row execute function public._stamp_parent_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.consent_records';
  execute 'create trigger stamp_tenant before insert on public.consent_records for each row execute function public._stamp_parent_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.data_deletion_requests';
  execute 'create trigger stamp_tenant before insert on public.data_deletion_requests for each row execute function public._stamp_parent_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.parent_subscriptions';
  execute 'create trigger stamp_tenant before insert on public.parent_subscriptions for each row execute function public._stamp_parent_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.billing_events';
  execute 'create trigger stamp_tenant before insert on public.billing_events for each row execute function public._stamp_parent_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.parent_profiles';
  execute 'create trigger stamp_tenant before insert on public.parent_profiles for each row execute function public._stamp_parent_profile_tenant()';
  -- child-linked tables
  execute 'drop trigger if exists stamp_tenant on public.child_learning_state';
  execute 'create trigger stamp_tenant before insert on public.child_learning_state for each row execute function public._stamp_child_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.child_activity_summary';
  execute 'create trigger stamp_tenant before insert on public.child_activity_summary for each row execute function public._stamp_child_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.learning_attempts';
  execute 'create trigger stamp_tenant before insert on public.learning_attempts for each row execute function public._stamp_child_tenant()';
  -- teacher-owned tables
  execute 'drop trigger if exists stamp_tenant on public.sessions';
  execute 'create trigger stamp_tenant before insert on public.sessions for each row execute function public._stamp_teacher_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.playlists';
  execute 'create trigger stamp_tenant before insert on public.playlists for each row execute function public._stamp_teacher_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.teacher_insights';
  execute 'create trigger stamp_tenant before insert on public.teacher_insights for each row execute function public._stamp_teacher_tenant()';
  -- session-derived tables
  execute 'drop trigger if exists stamp_tenant on public.session_students';
  execute 'create trigger stamp_tenant before insert on public.session_students for each row execute function public._stamp_session_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.session_activities';
  execute 'create trigger stamp_tenant before insert on public.session_activities for each row execute function public._stamp_session_tenant()';
  execute 'drop trigger if exists stamp_tenant on public.round_scores';
  execute 'create trigger stamp_tenant before insert on public.round_scores for each row execute function public._stamp_session_tenant()';
end $$;

-- ── 8. RLS tightening: block cross-tenant / cross-role access ────────

-- 8a. Becoming a "teacher" now requires an explicit teacher signup
-- (teacher_profiles row), not just any authenticated session.
drop policy if exists "teachers_insert_own" on public.teachers;
create policy teachers_insert_teacher_role on public.teachers
  for insert to authenticated
  with check (id = (select auth.uid()) and public.has_teacher_role());

-- 8b. Classroom sessions: teacher role required on top of the tier gate.
drop policy if exists "sessions_insert_pro" on public.sessions;
create policy sessions_insert_teacher on public.sessions
  for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and public.has_teacher_role()
    and public.get_effective_tier((select auth.uid())) = any (array['trial','pro','admin'])
  );

-- 8c. LIOS fact tables: were readable by ANY authenticated user.
-- Dashboards and the adaptive engine use SECURITY DEFINER RPCs, so
-- direct reads are admin-only. (Anon/auth INSERT paths untouched.)
drop policy if exists "Authenticated select learning attempts" on public.learning_attempts;
create policy attempts_select_scoped on public.learning_attempts
  for select to authenticated
  using (
    public.is_admin_user((select auth.uid()))
    or (child_profile_id is not null and public.auth_owns_child(child_profile_id))
  );

drop policy if exists "Authenticated select skill_state" on public.skill_state;
create policy skill_state_select_admin on public.skill_state
  for select to authenticated using (public.is_admin_user((select auth.uid())));

drop policy if exists "Authenticated select skill_state_history" on public.skill_state_history;
create policy skill_state_history_select_admin on public.skill_state_history
  for select to authenticated using (public.is_admin_user((select auth.uid())));

drop policy if exists "Authenticated select mastery_episode_fact" on public.mastery_episode_fact;
create policy mastery_select_admin on public.mastery_episode_fact
  for select to authenticated using (public.is_admin_user((select auth.uid())));

drop policy if exists "Authenticated select lios_pipeline_runs" on public.lios_pipeline_runs;
create policy lios_runs_select_admin on public.lios_pipeline_runs
  for select to authenticated using (public.is_admin_user((select auth.uid())));

drop policy if exists "Authenticated select adaptive_decisions" on public.lios_adaptive_decisions;
create policy adaptive_select_admin on public.lios_adaptive_decisions
  for select to authenticated using (public.is_admin_user((select auth.uid())));

drop policy if exists "Authenticated select anomalies" on public.lios_anomaly_fact;
create policy anomaly_select_admin on public.lios_anomaly_fact
  for select to authenticated using (public.is_admin_user((select auth.uid())));
