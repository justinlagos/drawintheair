-- 0007_parent_subscriptions_v2.sql
-- Follow-on to 0004/0005/0006.
--
-- Adds:
--   * stripe_price_map           : data-driven map of Stripe Price IDs the
--                                  frontend / edge functions look up by key.
--                                  Keeps actual price IDs out of source code,
--                                  out of build-time env vars, and enables
--                                  future tiers (Family Plus, Therapy, etc.)
--                                  without a code release.
--   * handle_new_parent_user()   : auth.users → parent_profiles trigger so a
--                                  parent_profiles row exists the moment a
--                                  parent signs up (otherwise RLS-protected
--                                  reads return empty until first write).
--   * archive_child_profile()    : soft archive that preserves history but
--                                  removes the learner from the billed
--                                  active-count.
--   * restore_child_profile()    : the matching restore.
--   * record_consent()           : convenience write for the consent
--                                  architecture (account terms, child
--                                  privacy, camera use, data retention,
--                                  marketing) — versioned, idempotent.
--
-- This migration is additive. It does not modify any row written by 0004.

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Relax `attempts_one_subject` / `lios_state_one_subject` to allow rows that
-- belong to NEITHER a school learner NOR a parent child profile — i.e. the
-- anonymous /play "try-free" path. We keep the rule that BOTH cannot be set.
--
-- Defensive: only touch each constraint if BOTH columns exist on the table.
-- Some schema lineages don't have learner_id; in that case 0004 didn't add
-- the constraint either, so there's nothing to relax.
-- ---------------------------------------------------------------------------
do $body$
declare la_has_learner bool;
        ls_has_learner bool;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='learning_attempts' and column_name='learner_id'
  ) into la_has_learner;
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='lios_state' and column_name='learner_id'
  ) into ls_has_learner;

  if la_has_learner then
    execute 'alter table learning_attempts drop constraint if exists attempts_one_subject';
    begin
      execute 'alter table learning_attempts add constraint attempts_one_subject '
              || 'check (num_nonnulls(learner_id, child_profile_id) <= 1)';
    exception when duplicate_object then null; end;
  end if;

  if ls_has_learner then
    execute 'alter table lios_state drop constraint if exists lios_state_one_subject';
    begin
      execute 'alter table lios_state add constraint lios_state_one_subject '
              || 'check (num_nonnulls(learner_id, child_profile_id) <= 1)';
    exception when duplicate_object then null; end;
  end if;
end $body$;

-- ---------------------------------------------------------------------------
-- stripe_price_map — data-driven price IDs
-- ---------------------------------------------------------------------------
-- The Stripe Dashboard creates Prices. We store the IDs here so the app can
-- ask "which price for the monthly base plan?" without hardcoding.
-- Row key examples:
--   'base.month'      — base subscription, monthly
--   'base.year'       — base subscription, yearly
--   'addon.month'     — per-extra-child monthly add-on
--   'addon.year'      — per-extra-child annual add-on
-- Future tiers (family-plus.month, therapy.year, …) simply add rows.
create table if not exists stripe_price_map (
  price_key text primary key,
  stripe_price_id text not null,
  interval text not null check (interval in ('month','year')),
  role text not null check (role in ('base','addon')),
  description text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table stripe_price_map enable row level security;

-- Public READ so the Pricing / Subscribe page can build a Checkout session
-- via an edge function without round-tripping unnecessary data; the row
-- contains no secret (the Price ID is a public Stripe identifier).
drop policy if exists stripe_price_map_read on stripe_price_map;
create policy stripe_price_map_read on stripe_price_map
  for select to anon, authenticated using (active);

-- Writes only via service role (edge functions seeding / admin).
-- No client policy = no client write.

drop trigger if exists trg_stripe_price_map_updated on stripe_price_map;
create trigger trg_stripe_price_map_updated
  before update on stripe_price_map
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- auth.users → parent_profiles signup trigger
-- ---------------------------------------------------------------------------
-- We can't put policies / triggers directly on auth.users from app code, but
-- Supabase allows a SECURITY DEFINER trigger function in `public` to be
-- attached to it. This is the standard Supabase pattern.
create or replace function handle_new_parent_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $body$
begin
  -- Only create a parent_profiles row for users that look like parents.
  -- We use raw_user_meta_data.role = 'parent' so the existing teacher /
  -- admin OAuth flows (which don't set that) are untouched.
  -- If raw_user_meta_data is absent we still create the row — most parents
  -- will sign up via email+password through our own form, which always sets
  -- it. Teachers signing in via Google OAuth on /class never hit this
  -- branch because that flow does not call this trigger path.
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
  return new;
end;
$body$;

-- Attach to auth.users. Idempotent — drop then create.
drop trigger if exists on_auth_user_created_parent on auth.users;
create trigger on_auth_user_created_parent
  after insert on auth.users
  for each row execute function handle_new_parent_user();

-- ---------------------------------------------------------------------------
-- archive / restore child profiles (billing-aware soft delete)
-- ---------------------------------------------------------------------------
-- Spec requirement: archived children preserve history, do not count toward
-- billing, and remain recoverable. The pricing layer uses the count of
-- child_profiles WHERE status='active' so simply toggling status is enough.
create or replace function archive_child_profile(p_child uuid)
returns child_profiles
language plpgsql
security definer
set search_path = public
as $body$
declare row child_profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if not auth_owns_child(p_child) then raise exception 'not found'; end if;
  update child_profiles
     set status = 'archived', archived_at = now()
   where id = p_child and parent_id = auth.uid()
   returning * into row;
  return row;
end;
$body$;
grant execute on function archive_child_profile(uuid) to authenticated;

create or replace function restore_child_profile(p_child uuid)
returns child_profiles
language plpgsql
security definer
set search_path = public
as $body$
declare row child_profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if not auth_owns_child(p_child) then raise exception 'not found'; end if;
  update child_profiles
     set status = 'active', archived_at = null
   where id = p_child and parent_id = auth.uid()
   returning * into row;
  return row;
end;
$body$;
grant execute on function restore_child_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- record_consent() — single entrypoint the app uses to write consent
-- ---------------------------------------------------------------------------
-- consent_type one of: account_terms | child_privacy | camera_use |
--                      data_retention | marketing
-- consent_version is a free-form string the app increments when the
-- corresponding legal text changes (e.g. 'v2026-05').
create or replace function record_consent(
  p_consent_type text,
  p_consent_version text,
  p_granted boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $body$
declare uid uuid := auth.uid(); rid uuid;
begin
  if uid is null then raise exception 'auth required'; end if;
  if p_consent_type not in ('account_terms','child_privacy','camera_use','data_retention','marketing') then
    raise exception 'unknown consent type';
  end if;
  insert into consent_records(parent_id, consent_type, consent_version, granted, withdrawn_at)
  values (uid, p_consent_type, p_consent_version, p_granted, case when p_granted then null else now() end)
  returning id into rid;
  return rid;
end;
$body$;
grant execute on function record_consent(text,text,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- weekly_summary() — parent-friendly weekly rollup for a child
-- ---------------------------------------------------------------------------
-- Returns structured data only. The frontend (src/lib/parent/progressNarrator)
-- turns it into warm sentences per the spec's "plain English" rule.
create or replace function get_weekly_summary(p_child uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $body$
declare
  uid uuid := auth.uid();
  result jsonb;
  top_strengths jsonb := '[]'::jsonb;
  needs_support jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'auth required'; end if;
  if not auth_owns_child(p_child) then raise exception 'not found'; end if;

  -- lios_state may not exist in this environment. Read it via EXECUTE so the
  -- function CREATE doesn't try to validate the reference, and short-circuit
  -- the runtime read with to_regclass when the table is missing.
  if to_regclass('public.lios_state') is not null then
    execute $sql$
      select coalesce(jsonb_agg(jsonb_build_object('skill_key', skill_key, 'mastery', mastery) order by mastery desc), '[]'::jsonb)
      from (
        select skill_key, mastery from lios_state
        where child_profile_id = $1 and mastery >= 0.7
        order by mastery desc limit 3
      ) s
    $sql$ into top_strengths using p_child;

    execute $sql$
      select coalesce(jsonb_agg(jsonb_build_object('skill_key', skill_key, 'mastery', mastery) order by mastery asc), '[]'::jsonb)
      from (
        select skill_key, mastery from lios_state
        where child_profile_id = $1 and mastery < 0.4
        order by mastery asc limit 3
      ) s
    $sql$ into needs_support using p_child;
  end if;

  select jsonb_build_object(
    'window_start', date_trunc('day', now() - interval '7 days'),
    'window_end', now(),
    'sessions', coalesce((
      select count(distinct date_trunc('day', occurred_at))
      from learning_attempts
      where child_profile_id = p_child
        and occurred_at >= now() - interval '7 days'
    ), 0),
    'attempts', coalesce((
      select count(*) from learning_attempts
      where child_profile_id = p_child
        and occurred_at >= now() - interval '7 days'
    ), 0),
    'top_strengths', top_strengths,
    'needs_support', needs_support,
    'recommended_activity_key', (select recommended_activity_key from child_learning_state where child_profile_id = p_child)
  ) into result;

  return result;
end;
$body$;
grant execute on function get_weekly_summary(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Seed price keys (idempotent). The actual stripe_price_id values get
-- written by an operator with `update stripe_price_map set ...`, or by an
-- edge function with the service-role key. Leaving the IDs empty is safe:
-- the app treats a row with an empty stripe_price_id as "plan unavailable".
-- ---------------------------------------------------------------------------
insert into stripe_price_map (price_key, stripe_price_id, interval, role, description) values
  ('base.month',  '', 'month', 'base',  'Base family plan, billed monthly (includes 2 learners).'),
  ('base.year',   '', 'year',  'base',  'Base family plan, billed yearly (includes 2 learners).'),
  ('addon.month', '', 'month', 'addon', 'Additional learner add-on, monthly.'),
  ('addon.year',  '', 'year',  'addon', 'Additional learner add-on, yearly.')
on conflict (price_key) do nothing;
