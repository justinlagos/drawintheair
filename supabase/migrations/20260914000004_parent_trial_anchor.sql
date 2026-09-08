-- ═══════════════════════════════════════════════════════════════════════════
-- WP2A.4 / DIA-012 — anchor the parent trial to parent-profile creation
--
-- Root cause, traced across every signup path:
--
--   * Parent email+password  (src/lib/supabase.ts signUpWithEmail) sends
--     data.role = 'parent'  -> profile + trial. Correct.
--   * Teacher email+password (src/lib/teacherApi.ts signUpTeacher) sends
--     data.role = 'teacher' -> teachers + teacher_profiles. Correct, except it
--     also picked up a stray parent_profiles row (see below).
--   * Google OAuth (src/lib/supabase.ts signInWithGoogle) hits
--     GET /auth/v1/authorize, which has no place to carry user metadata. The
--     role intent is stashed in sessionStorage only, so the account is created
--     with raw_user_meta_data.role absent. This is the path that stopped
--     stamping role metadata, and every affected production account has
--     raw_app_meta_data.provider = 'google' with role NULL.
--
-- Why the client-side rescue never ran: handle_new_parent_user() inserted a
-- parent_profiles row for EVERY new auth user, including teachers and role-less
-- OAuth users. get_account_roles().parent is "a parent_profiles row exists", so
-- RequireParentAuth saw roles.parent = true, returned early, and never reached
-- consumeRoleIntent('parent') -> register_parent(), the only remaining caller of
-- start_parent_trial(). Result: a profile, a dashboard, and no subscription row.
-- All nine affected production accounts have tenant_id NULL, which confirms
-- register_parent() never ran for them.
--
-- The defect is one trigger doing two things on different conditions: the
-- profile unconditionally, the trial conditionally. This migration makes the
-- trial follow the profile, and stops creating profiles for accounts that did
-- not sign up as parents.
--
-- Role-less accounts are NOT defaulted to parent anywhere. A role-less account
-- gets a parent profile and a trial only when it reaches register_parent(),
-- which the client calls only after an explicit parent-flow intent.
--
-- The Supabase CLI runs each migration inside a single transaction, so this
-- file deliberately has no explicit begin/commit.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. One eligibility rule, in one place ──────────────────────────────────

create or replace function public._parent_trial_eligible(p_parent uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- A teacher account never receives a parent trial, however its
  -- parent_profiles row came to exist.
  select not (
       exists (select 1 from public.teachers t where t.id = p_parent)
    or exists (select 1 from public.teacher_profiles tp where tp.auth_user_id = p_parent)
    or exists (select 1 from auth.users u
                where u.id = p_parent
                  and lower(trim(coalesce(u.raw_user_meta_data->>'role',''))) = 'teacher')
  );
$$;
revoke all on function public._parent_trial_eligible(uuid) from public;
revoke all on function public._parent_trial_eligible(uuid) from anon, authenticated;

create or replace function public._start_parent_trial_if_eligible(p_parent uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public._parent_trial_eligible(p_parent) then
    -- start_parent_trial is `on conflict (parent_id) do nothing`, so an existing
    -- subscription row of any status is left untouched.
    perform public.start_parent_trial(p_parent);
  end if;
end
$$;
revoke all on function public._start_parent_trial_if_eligible(uuid) from public;
revoke all on function public._start_parent_trial_if_eligible(uuid) from anon, authenticated;

-- ── 2. The anchor: a parent profile implies a parent trial ─────────────────

create or replace function public._parent_profile_start_trial()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public._start_parent_trial_if_eligible(new.id);
  return new;
end
$$;

drop trigger if exists trg_parent_profile_start_trial on public.parent_profiles;
create trigger trg_parent_profile_start_trial
  after insert on public.parent_profiles
  for each row execute function public._parent_profile_start_trial();

-- ── 3. Stop creating parent profiles for non-parent signups ────────────────
-- Restores the gate that 0017_signup_role_hardening.sql intended and that
-- 20260701000001 removed. Role matching is normalised (lower/trim) so " Parent "
-- still provisions and nothing else ever does.
--
-- Consequence for role-less Google OAuth users: no parent_profiles row is
-- created at signup, so get_account_roles().parent is false, RequireParentAuth
-- falls through to consumeRoleIntent('parent') -> register_parent(), and that
-- creates profile + tenant + trial. Users arriving without a parent intent see
-- the existing "This area is for families" opt-in, which is the documented 0013
-- role-isolation behaviour.

create or replace function public.handle_new_parent_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_role text := lower(trim(coalesce(new.raw_user_meta_data ->> 'role', '')));
begin
  if claimed_role = 'parent' then
    insert into public.parent_profiles (id, email, display_name)
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

    -- The AFTER INSERT trigger on parent_profiles has already started the trial
    -- for a fresh row. This call covers the on-conflict case (profile already
    -- present) and keeps the path readable. It is idempotent.
    perform public._start_parent_trial_if_eligible(new.id);
  end if;
  return new;
end
$$;

-- ── 4. register_parent: stamp the role metadata the OAuth path could not ───
-- Without this, a Google-signup parent stays role-less forever and every later
-- query that reads raw_user_meta_data->>'role' misclassifies them. Only stamped
-- when the role is currently absent and the account is not a teacher, so a
-- teacher who opts into the family area is never relabelled.

create or replace function public.register_parent()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u    record;
  t_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

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

  perform public._start_parent_trial_if_eligible(u.id);

  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'parent')
   where id = u.id
     and coalesce(raw_user_meta_data->>'role', '') = ''
     and public._parent_trial_eligible(u.id);

  return jsonb_build_object('ok', true, 'tenant_id', t_id);
end
$$;

-- ── 5. Backfill the accounts the defect stranded ───────────────────────────
-- Criteria-based, not a hard-coded id list, with an expected-count assertion so
-- the migration aborts rather than touching a set that drifted since the dry
-- run. Production dry run 2026-09-07 and re-verified 2026-09-08: 9 candidates.
--
-- These accounts never received the trial they were entitled to, so the trial
-- runs from now rather than from signup. Backdating it instead would put all
-- nine straight into the WP2A.5 expired flow, which is a product decision, not
-- a data-correctness one; see the evidence README.

do $$
declare
  v_expected int := 9;
  v_n        int;
  v_after    int;
begin
  create temp table _wp2a4_backfill on commit drop as
    select pp.id
      from public.parent_profiles pp
      join auth.users u on u.id = pp.id
     where not exists (select 1 from public.parent_subscriptions ps where ps.parent_id = pp.id)
       and not exists (select 1 from public.teachers t where t.id = pp.id)
       and not exists (select 1 from public.teacher_profiles tp where tp.auth_user_id = pp.id)
       and coalesce(u.raw_user_meta_data->>'role','') = '';

  select count(*) into v_n from _wp2a4_backfill;
  if v_n <> v_expected then
    raise exception 'WP2A.4 backfill: % candidates, expected %. Re-run the dry run and update v_expected.',
      v_n, v_expected;
  end if;

  perform public._start_parent_trial_if_eligible(id) from _wp2a4_backfill;

  update auth.users u
     set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'parent')
   where u.id in (select id from _wp2a4_backfill);

  select count(*) into v_after
    from _wp2a4_backfill b
   where exists (select 1 from public.parent_subscriptions ps where ps.parent_id = b.id);
  if v_after <> v_expected then
    raise exception 'WP2A.4 backfill: only % of % accounts have a subscription afterwards', v_after, v_expected;
  end if;
end $$;

-- ── 6. Post-conditions ─────────────────────────────────────────────────────

do $$
declare v_n int;
begin
  if not exists (
    select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
     where c.relname = 'parent_profiles' and t.tgname = 'trg_parent_profile_start_trial'
  ) then
    raise exception 'WP2A.4: trial anchor trigger is missing';
  end if;

  select count(*) into v_n
    from public.parent_profiles pp
    join auth.users u on u.id = pp.id
   where not exists (select 1 from public.parent_subscriptions ps where ps.parent_id = pp.id)
     and not exists (select 1 from public.teachers t where t.id = pp.id)
     and not exists (select 1 from public.teacher_profiles tp where tp.auth_user_id = pp.id)
     and coalesce(u.raw_user_meta_data->>'role','') = '';
  if v_n <> 0 then
    raise exception 'WP2A.4: % stranded parent profiles remain', v_n;
  end if;
end $$;
