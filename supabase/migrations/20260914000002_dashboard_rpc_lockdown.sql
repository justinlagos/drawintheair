-- ═══════════════════════════════════════════════════════════════════════════
-- WP2A.2 / DIA-006 — dashboard_* RPC access lock-down
--
-- Problem: all 37 public.dashboard_* functions are SECURITY DEFINER and every
-- one of them is EXECUTE-able by `authenticated`. Only dashboard_growth has an
-- in-body admin guard. Any signed-in parent or teacher can therefore call the
-- admin analytics RPCs with their own JWT, including three that return
-- per-learner rows:
--   dashboard_progression_top_learners  ranked list of device_ids
--   dashboard_progression_for_learner   one device_id's full attempt history
--   dashboard_latest_sessions           one row per analytics session
--
-- Classification (see docs/audits/evidence/release/WP2A.2/):
--   31 admin-only   ->  in-body guard, anon revoked (WP0.5.2 already revoked
--                       anon on four of them in production; this migration is
--                       written to be correct either way)
--    3 public       ->  rewritten as aggregate-only with small-cohort
--                       suppression and a short cache
--    4 unused       ->  dropped
--
-- Method for the 29 unguarded admin-only functions: rename the original to
-- _<name>_impl (body, volatility and search_path preserved) and create a thin
-- guarded wrapper under the original name and signature. The JSON contract the
-- admin Insights UI reads is unchanged. Rollback is a rename back.
--
-- dashboard_growth already carries the guard and is left untouched.
-- The Supabase CLI runs each migration inside a single transaction, so this
-- file deliberately has no explicit begin/commit.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Guard helper ────────────────────────────────────────────────────────
-- Admits three callers:
--   a) no JWT at all (pg_cron, psql, the SQL editor as postgres)
--   b) the service role (the analytics-digest Edge Function)
--   c) a platform admin
-- Everyone else gets 42501, which PostgREST returns as 403.
--
-- (b) matters: under service_role auth.uid() is NULL, so a naive
-- is_platform_admin() guard would break the nightly digest and the anomaly
-- alert, which is the July is_admin_user failure mode repeated.

create or replace function public._dashboard_guard()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
begin
  if v_claims is null then
    return;
  end if;
  if v_claims->>'role' = 'service_role' then
    return;
  end if;
  if public.is_platform_admin() then
    return;
  end if;
  raise exception 'forbidden' using errcode = '42501';
end
$$;

revoke all on function public._dashboard_guard() from public;
revoke all on function public._dashboard_guard() from anon, authenticated, service_role;

-- ── 2. Wrap the 29 unguarded admin-only functions ──────────────────────────

do $wrap$
declare
  f          record;
  v_argnames text;
  v_impl     text;
  v_expected int := 29;
  v_made     int := 0;
begin
  for f in
    select p.proname,
           pg_get_function_identity_arguments(p.oid) as ident_args,
           pg_get_function_arguments(p.oid)          as full_args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'dashboard_ab_results','dashboard_adaptive_decisions','dashboard_anomaly_check',
         'dashboard_cohort_curves','dashboard_cohort_retention','dashboard_context_split',
         'dashboard_curriculum_coverage','dashboard_daily_digest','dashboard_engagement_deep',
         'dashboard_errors','dashboard_executive_summary','dashboard_export_headline',
         'dashboard_friction_engineering','dashboard_funnel','dashboard_latest_sessions',
         'dashboard_live','dashboard_mastery','dashboard_mastery_milestones',
         'dashboard_mastery_summary','dashboard_mastery_v2','dashboard_observability',
         'dashboard_observations','dashboard_progression_for_learner',
         'dashboard_progression_top_learners','dashboard_retention_deep','dashboard_today',
         'dashboard_top_modes','dashboard_tracker_health','dashboard_trust_strip')
     order by p.proname
  loop
    v_impl := '_' || f.proname || '_impl';

    -- 2a. Rename the original. Body, volatility, SECURITY DEFINER and
    --     search_path all travel with it.
    execute format('alter function public.%I(%s) rename to %I',
                   f.proname, f.ident_args, v_impl);

    -- 2b. The impl must not be reachable over the REST API under any role.
    --     The wrapper calls it as its owner (postgres), so this costs nothing.
    execute format('revoke all on function public.%I(%s) from public', v_impl, f.ident_args);
    execute format('revoke all on function public.%I(%s) from anon, authenticated, service_role',
                   v_impl, f.ident_args);

    -- 2c. Argument pass-through list: "in_days integer, in_limit integer"
    --     becomes "in_days, in_limit".
    select string_agg(split_part(btrim(a), ' ', 1), ', ')
      into v_argnames
      from regexp_split_to_table(f.ident_args, ',') a
     where btrim(a) <> '';

    -- 2d. Guarded wrapper under the original name, with the original argument
    --     list including DEFAULTs, returning jsonb, marked STABLE to match the
    --     functions it replaces (dashboard_daily_digest is STABLE SQL and calls
    --     several of these by name).
    execute format($fmt$
      create function public.%I(%s)
      returns jsonb
      language plpgsql
      stable
      security definer
      set search_path = public, pg_temp
      as $body$
      begin
        perform public._dashboard_guard();
        return public.%I(%s);
      end
      $body$
    $fmt$, f.proname, f.full_args, v_impl, coalesce(v_argnames, ''));

    -- 2e. Grants: authenticated keeps EXECUTE so PostgREST can reach the
    --     wrapper at all (admins are `authenticated` too); the wrapper body is
    --     what enforces admin. anon never gets EXECUTE.
    execute format('revoke all on function public.%I(%s) from public', f.proname, f.ident_args);
    execute format('revoke all on function public.%I(%s) from anon', f.proname, f.ident_args);
    execute format('grant execute on function public.%I(%s) to authenticated, service_role',
                   f.proname, f.ident_args);

    v_made := v_made + 1;
  end loop;

  if v_made <> v_expected then
    raise exception 'WP2A.2: wrapped % functions, expected %', v_made, v_expected;
  end if;
end
$wrap$;

-- ── 3. Unused functions ────────────────────────────────────────────────────
-- dashboard_daily_digest is the only caller of dashboard_classrooms, and
-- school_id is not populated so it always returned an empty schools array.
-- Replace that key with the same empty shape before dropping the function, so
-- the digest payload the Edge Function reads keeps its key set.

create or replace function public._dashboard_daily_digest_impl()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'as_of', now(),
    'today',        (select public.dashboard_today()),
    'funnel_24h',   (select public.dashboard_funnel(1)),
    'funnel_7d',    (select public.dashboard_funnel(7)),
    'tracker_7d',   (select public.dashboard_tracker_health(7)),
    'top_modes_7d', (select public.dashboard_top_modes(7)),
    'errors',       (select public.dashboard_errors(20)),
    'cohort',       (select public.dashboard_cohort_retention(8)),
    'mastery',      (select public.dashboard_mastery(30, 5)),
    'milestones',   (select public.dashboard_mastery_milestones(60, 5, 80)),
    'classrooms',   jsonb_build_object('days', 30, 'as_of', now(), 'schools', '[]'::jsonb),
    'yesterday_count', (select count(*) from public.analytics_events
                         where occurred_at >= date_trunc('day', now() - interval '1 day')
                           and occurred_at <  date_trunc('day', now())),
    'last7_avg_count', (select round(count(*) / 7.0, 0)::int from public.analytics_events
                         where occurred_at >= date_trunc('day', now() - interval '8 days')
                           and occurred_at <  date_trunc('day', now() - interval '1 day'))
  );
$$;

drop function if exists public.dashboard_classrooms(integer);
drop function if exists public.dashboard_gesture_quality(integer);
drop function if exists public.dashboard_ingest_latency(integer);
drop function if exists public.dashboard_pipeline_status(integer);

-- ── 4. The three deliberately public functions ─────────────────────────────
-- These stay anon-callable: the live /transparency page reads two of them and
-- a Better Stack p1 monitor polls the third with the anon key. They are
-- rewritten so the output is aggregate-only, with small-cohort suppression,
-- and so a monitor storm cannot repeatedly full-scan analytics_events.

create table if not exists public.dashboard_public_cache (
  key         text primary key,
  payload     jsonb not null,
  computed_at timestamptz not null default now()
);
comment on table public.dashboard_public_cache is
  'WP2A.2: memoised payloads for the anon-callable dashboard_* functions. Not exposed to any API role.';
alter table public.dashboard_public_cache enable row level security;
revoke all on table public.dashboard_public_cache from public;
revoke all on table public.dashboard_public_cache from anon, authenticated;

-- 4a. dashboard_public_proof: six global counts over 90 days, no cohort split,
--     so there is nothing to suppress. Memoised for 60 seconds.
alter function public.dashboard_public_proof() rename to _dashboard_public_proof_impl;
revoke all on function public._dashboard_public_proof_impl() from public;
revoke all on function public._dashboard_public_proof_impl() from anon, authenticated, service_role;

create function public.dashboard_public_proof()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb;
begin
  select payload into v
    from public.dashboard_public_cache
   where key = 'public_proof'
     and computed_at > now() - interval '60 seconds';
  if v is not null then
    return v;
  end if;

  v := public._dashboard_public_proof_impl();

  insert into public.dashboard_public_cache (key, payload, computed_at)
  values ('public_proof', v, now())
  on conflict (key) do update
    set payload = excluded.payload, computed_at = excluded.computed_at;

  return v;
end
$$;
grant execute on function public.dashboard_public_proof() to public, anon, authenticated, service_role;

-- 4b. dashboard_transparency_report: per-mode rows are already suppressed below
--     k=5 distinct devices and totals are rounded to 100. Added here: clamp the
--     window so an anonymous caller cannot ask for an unbounded scan, and drop
--     the whole by_game_mode array when the window contains fewer than 5
--     distinct learners in total (with one or two learners, "the modes that
--     survived k=5" is still a description of those learners).
alter function public.dashboard_transparency_report(integer) rename to _dashboard_transparency_report_impl;
revoke all on function public._dashboard_transparency_report_impl(integer) from public;
revoke all on function public._dashboard_transparency_report_impl(integer) from anon, authenticated, service_role;

create function public.dashboard_transparency_report(in_days integer default 90)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_days int := greatest(7, least(coalesce(in_days, 90), 365));
  v      jsonb;
  n      int;
begin
  v := public._dashboard_transparency_report_impl(v_days);

  select count(distinct device_id) into n
    from public.learning_attempts
   where occurred_at > now() - make_interval(days => v_days)
     and device_id is not null;

  if n < 5 then
    v := v || jsonb_build_object('by_game_mode', '[]'::jsonb, 'suppressed', true);
  end if;

  return v;
end
$$;
grant execute on function public.dashboard_transparency_report(integer) to anon, authenticated, service_role;

-- 4c. dashboard_transparency_signals: same clamp, plus two suppressions.
--     classrooms_engaged is a count of distinct join codes; below 5 it narrows
--     to a named classroom, so it is nulled. The three single-mode "signal"
--     objects each name one mode; when fewer than 2 modes pass k=5 the same
--     mode is trivially both the strongest and the weakest, which says more
--     about the handful of learners in it than about the mode, so all three are
--     nulled.
alter function public.dashboard_transparency_signals(integer) rename to _dashboard_transparency_signals_impl;
revoke all on function public._dashboard_transparency_signals_impl(integer) from public;
revoke all on function public._dashboard_transparency_signals_impl(integer) from anon, authenticated, service_role;

create function public.dashboard_transparency_signals(in_days integer default 90)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_days  int := greatest(7, least(coalesce(in_days, 90), 365));
  v       jsonb;
  n_modes int;
  n_class int;
begin
  v := public._dashboard_transparency_signals_impl(v_days);

  select count(*) into n_modes
    from (
      select game_mode
        from public.learning_attempts
       where occurred_at > now() - make_interval(days => v_days)
         and device_id is not null
       group by game_mode
      having count(distinct device_id) >= 5
    ) m;

  n_class := coalesce((v #>> '{impact,classrooms_engaged}')::int, 0);
  if n_class < 5 then
    v := jsonb_set(v, '{impact,classrooms_engaged}', 'null'::jsonb);
  end if;

  if n_modes < 2 then
    v := v || jsonb_build_object(
                'top_engaging_mode', null,
                'strongest_signal', null,
                'calibration_in_progress', null,
                'suppressed', true);
  end if;

  return v;
end
$$;
grant execute on function public.dashboard_transparency_signals(integer) to anon, authenticated, service_role;

-- ── 5. Post-conditions, asserted inside the transaction ────────────────────

do $check$
declare
  v_anon    text;
  v_missing text;
  v_impl    text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into v_anon
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname like 'dashboard\_%'
     and has_function_privilege('anon', p.oid, 'EXECUTE')
     and p.proname not in ('dashboard_public_proof','dashboard_transparency_report',
                           'dashboard_transparency_signals');
  if v_anon is not null then
    raise exception 'WP2A.2: anon still holds EXECUTE on %', v_anon;
  end if;

  select string_agg(p.proname, ', ' order by p.proname) into v_missing
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname like 'dashboard\_%'
     and p.proname not in ('dashboard_public_proof','dashboard_transparency_report',
                           'dashboard_transparency_signals')
     and p.prosrc !~ '_dashboard_guard|is_platform_admin';
  if v_missing is not null then
    raise exception 'WP2A.2: unguarded admin function(s): %', v_missing;
  end if;

  select string_agg(p.proname, ', ' order by p.proname) into v_impl
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname ~ '^_dashboard_.*_impl$'
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
          or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_impl is not null then
    raise exception 'WP2A.2: impl function(s) still reachable: %', v_impl;
  end if;
end
$check$;

-- PostgREST caches the function catalogue; the renames are invisible to it
-- until it reloads.
notify pgrst, 'reload schema';
