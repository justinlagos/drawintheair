-- 0004_parent_subscriptions.sql
-- Parent subscription layer for Draw in the Air.
--
-- Design goals:
--   * Parent accounts own everything; children NEVER have their own auth account.
--   * Coexist cleanly with the existing school/classroom `learners` model (0001-0003).
--   * Child data is pseudonymous and minimal (privacy by design / COPPA / GDPR).
--   * Pricing is data-driven (pricing_config), never hardcoded into business tables,
--     so future tiers (Family Plus, Therapy Support, etc.) can be added without migrations.
--
-- All RLS policies live in 0005_rls.sql. Dashboard/data-rights RPCs live in 0006_rpcs.sql.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Dynamic pricing configuration (single source of truth, editable as data)
-- ---------------------------------------------------------------------------
-- Stripe Price IDs themselves live in edge-function env vars (they are created in
-- the Stripe dashboard). This table holds the *display + quantity* logic so the app
-- and dashboard can compute amounts without hardcoding numbers.
create table if not exists pricing_config (
  id text primary key default 'default',
  currency text not null default 'usd',
  base_included_slots int not null default 2,           -- learners included in base plan
  base_monthly_cents int not null default 499,          -- $4.99 / month
  base_annual_cents int not null default 5499,          -- $54.99 / year
  addon_monthly_cents_per_child int not null default 200,-- +$2 / month per extra learner
  addon_annual_cents_per_child int not null default 2199,-- proportional discounted yearly add-on
  trial_days int not null default 14,
  max_children int,                                      -- null = unlimited
  active boolean not null default true,
  effective_from timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into pricing_config (id) values ('default')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Parent profiles (1:1 with Supabase auth.users)
-- ---------------------------------------------------------------------------
create table if not exists parent_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  stripe_customer_id text unique,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Parent subscriptions (one row per parent; mirror of Stripe truth)
-- ---------------------------------------------------------------------------
-- `status` mirrors Stripe subscription status. The richer product states from the
-- spec (anonymous / trial active / trial expired / active monthly / active annual /
-- payment failed / cancelled-but-active / expired) are DERIVED in parent_subscription_state().
create table if not exists parent_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references parent_profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'none',  -- none|trialing|active|past_due|canceled|incomplete|incomplete_expired|unpaid
  plan_interval text,                   -- month | year | null
  base_price_id text,
  addon_price_id text,
  included_child_slots int not null default 2,
  billed_addon_quantity int not null default 0,  -- extra learners currently billed
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id)
);

create index if not exists idx_parent_subscriptions_parent on parent_subscriptions(parent_id);
create index if not exists idx_parent_subscriptions_customer on parent_subscriptions(stripe_customer_id);

-- ---------------------------------------------------------------------------
-- Child profiles (pseudonymous learner identity)
-- ---------------------------------------------------------------------------
-- Minimal data only. No full name, no DOB, no school. id IS the pseudonymous learner id.
create table if not exists child_profiles (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references parent_profiles(id) on delete cascade,
  nickname text not null,                       -- first name or nickname only
  age_band text,                                -- e.g. '3-4','5-6','7-8','9-11'
  learning_focus text,                          -- optional, e.g. 'letters','numbers','shapes'
  avatar text,                                  -- avatar key/emoji, NEVER a photo
  accessibility_prefs jsonb not null default '{}'::jsonb,
  preferred_hand text,                          -- 'left'|'right'|null
  status text not null default 'active',        -- active | archived
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_child_profiles_parent on child_profiles(parent_id);
create index if not exists idx_child_profiles_status on child_profiles(parent_id, status);

-- ---------------------------------------------------------------------------
-- Extend the existing learning model to support child profiles WITHOUT
-- duplicating learning_attempts or lios_state. School learners keep working.
--
-- FULLY DEFENSIVE: prior migrations may or may not have created either of:
--   * a `learner_id` column on learning_attempts / lios_state
--   * the `lios_state` table itself
-- We:
--   * always add child_profile_id to learning_attempts
--   * only touch learner_id / add the CHECK constraint if that column exists
--   * only touch lios_state if the TABLE exists
-- This lets the parent layer apply cleanly on top of any schema lineage.
-- The 0005 RLS policies and 0006 RPCs check the same way.
-- ---------------------------------------------------------------------------
alter table learning_attempts add column if not exists child_profile_id uuid references child_profiles(id) on delete cascade;
create index if not exists idx_attempts_child on learning_attempts(child_profile_id);

do $body$
declare la_has_learner bool;
        ls_exists      bool;
        ls_has_learner bool;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='learning_attempts' and column_name='learner_id'
  ) into la_has_learner;

  select exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='lios_state'
  ) into ls_exists;

  if la_has_learner then
    execute 'alter table learning_attempts alter column learner_id drop not null';
    begin
      execute 'alter table learning_attempts add constraint attempts_one_subject '
              || 'check (num_nonnulls(learner_id, child_profile_id) <= 1)';
    exception when duplicate_object then null; end;
  end if;

  if ls_exists then
    execute 'alter table lios_state add column if not exists child_profile_id uuid references child_profiles(id) on delete cascade';
    execute 'create unique index if not exists uq_lios_child_skill on lios_state(child_profile_id, skill_key) where child_profile_id is not null';

    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='lios_state' and column_name='learner_id'
    ) into ls_has_learner;

    if ls_has_learner then
      execute 'alter table lios_state alter column learner_id drop not null';
      begin
        execute 'alter table lios_state add constraint lios_state_one_subject '
                || 'check (num_nonnulls(learner_id, child_profile_id) <= 1)';
      exception when duplicate_object then null; end;
    end if;
  end if;
end $body$;

-- ---------------------------------------------------------------------------
-- Per-child overall learning state (the "memory" the spec describes)
-- ---------------------------------------------------------------------------
create table if not exists child_learning_state (
  child_profile_id uuid primary key references child_profiles(id) on delete cascade,
  mode_preferences jsonb not null default '{}'::jsonb,
  adaptive_difficulty jsonb not null default '{}'::jsonb, -- per-mode difficulty state
  confidence_overall numeric not null default 0,          -- 0..1
  streak_days int not null default 0,
  last_streak_date date,
  last_played_at timestamptz,
  recommended_activity_key text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Per-child, per-activity rollups (fast dashboard reads, no heavy aggregation)
-- ---------------------------------------------------------------------------
create table if not exists child_activity_summary (
  id uuid primary key default uuid_generate_v4(),
  child_profile_id uuid not null references child_profiles(id) on delete cascade,
  activity_key text not null,
  attempts int not null default 0,
  completions int not null default 0,
  completion_rate numeric not null default 0,  -- 0..1
  mastery numeric not null default 0,          -- 0..1
  status text not null default 'practising',   -- mastered | practising | struggling | new
  total_seconds int not null default 0,
  last_played_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (child_profile_id, activity_key)
);

create index if not exists idx_activity_summary_child on child_activity_summary(child_profile_id);

-- ---------------------------------------------------------------------------
-- Parental controls (per child)
-- ---------------------------------------------------------------------------
create table if not exists parent_controls (
  child_profile_id uuid primary key references child_profiles(id) on delete cascade,
  parent_id uuid not null references parent_profiles(id) on delete cascade,
  daily_play_limit_minutes int,                 -- null = no limit
  allowed_categories text[],                    -- null = all categories allowed
  paused boolean not null default false,
  sound_enabled boolean not null default true,
  camera_reassurance text not null default 'standard', -- 'standard'|'gentle'|'off'
  updated_at timestamptz not null default now()
);

create index if not exists idx_parent_controls_parent on parent_controls(parent_id);

-- ---------------------------------------------------------------------------
-- Billing events (audit log of Stripe webhooks; service-role writes only)
-- ---------------------------------------------------------------------------
create table if not exists billing_events (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid references parent_profiles(id) on delete set null,
  stripe_event_id text unique,
  type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_events_parent on billing_events(parent_id);

-- ---------------------------------------------------------------------------
-- Consent records (GDPR/COPPA consent architecture)
-- ---------------------------------------------------------------------------
create table if not exists consent_records (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references parent_profiles(id) on delete cascade,
  consent_type text not null,    -- account_terms | child_privacy | camera_use | data_retention | marketing
  consent_version text not null,
  granted boolean not null default true,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create index if not exists idx_consent_parent on consent_records(parent_id);

-- ---------------------------------------------------------------------------
-- Data rights: deletion/export requests (auditable trail)
-- ---------------------------------------------------------------------------
create table if not exists data_deletion_requests (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references parent_profiles(id) on delete cascade,
  scope text not null,             -- child_profile | parent_account
  target_child_id uuid references child_profiles(id) on delete set null,
  status text not null default 'pending', -- pending | processing | completed
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_deletion_parent on data_deletion_requests(parent_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $body$
begin
  new.updated_at = now();
  return new;
end; $body$;

do $body$
declare t text;
begin
  foreach t in array array[
    'parent_profiles','parent_subscriptions','child_profiles',
    'child_learning_state','child_activity_summary','parent_controls','pricing_config'
  ] loop
    execute format('drop trigger if exists trg_%s_updated on %s;', t, t);
    execute format('create trigger trg_%s_updated before update on %s for each row execute function set_updated_at();', t, t);
  end loop;
end $body$;
