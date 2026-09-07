# WP2A.2 — `dashboard_*` RPC classification and lock-down (DIA-006)

Status: DESIGN — rehearse on staging first. Evidence date 2026-09-07, production catalogue.

## 0. Verified current state

- 37 functions `public.dashboard_*`, **all** `SECURITY DEFINER`, owner `postgres`, `search_path = public, pg_temp`.
- EXECUTE grants (from `proacl`): every one of the 37 is executable by **`authenticated`** and `service_role`. Only 3 are additionally executable by `anon`: `dashboard_public_proof` (also `PUBLIC`), `dashboard_transparency_report`, `dashboard_transparency_signals`. The 7 Sept revoke of anon on `engagement_deep`, `executive_summary`, `mastery_summary`, `ingest_latency` is confirmed in place.
- **In-body admin guard exists in exactly one function: `dashboard_growth`** (`if not public.is_platform_admin() then raise … 42501`). The other 36 have none. Therefore today **any signed-in parent or teacher can call all 34 admin-only RPCs** via `/rest/v1/rpc/…` with their own JWT. That is the DIA-006 finding.
- Admin helper in the DB: `public.is_platform_admin()` → `is_admin_user(auth.uid())` → `teachers.is_admin OR platform_admins.user_id`. (`public._is_admin()` also exists, checks `platform_admins` only.) Use `is_platform_admin()`.
- Service callers: `platform/supabase/functions/analytics-digest/index.ts` calls `dashboard_daily_digest` and `dashboard_anomaly_check` with `SUPABASE_SERVICE_ROLE_KEY` (cron jobs 5 & 6 → `net.http_post`). Under service_role, `auth.uid()` is NULL ⇒ `is_platform_admin()` is false ⇒ **a naive guard would break the daily digest and anomaly alerts**. The guard below admits `service_role` and non-API (cron/psql) contexts.
- Better Stack monitor `"Supabase health — public proof RPC"` (`config/betterstack.monitors.json:78`) POSTs `/rest/v1/rpc/dashboard_public_proof` with the anon key and expects 200. It must keep working.

## 1. Classification (37/37)

Caller evidence: `src/pages/admin/insights/rpc.ts` (admin Insights UI, route-guarded client-side only), `src/pages/TransparencyPage.tsx` (public page), `platform/supabase/functions/analytics-digest` (service role), `config/betterstack.monitors.json`, `scripts/*.sh` (historic push scripts, not runtime).

| # | function | class | caller evidence | returns per-account / per-learner rows? |
|---|---|---|---|---|
| 1 | dashboard_ab_results(in_flag) | Admin-only | insights/rpc.ts:44 | no (per-variant counts) |
| 2 | dashboard_adaptive_decisions(in_days) | Admin-only | rpc.ts:92 | no |
| 3 | dashboard_anomaly_check() | Admin-only (service caller) | analytics-digest:106 | no (distinct-device counts) |
| 4 | dashboard_classrooms(in_days) | **Unused** (only referenced inside `dashboard_daily_digest`; `school_id` is 0-populated so it always returns `[]`) | none in src/platform | yes — per `school_id` rows |
| 5 | dashboard_cohort_curves(in_weeks) | Admin-only | rpc.ts:47 | no (cohort aggregates) |
| 6 | dashboard_cohort_retention(in_weeks) | Admin-only | rpc.ts:140; daily_digest | no |
| 7 | dashboard_context_split(in_days) | Admin-only | rpc.ts:77 | no |
| 8 | dashboard_curriculum_coverage(in_days) | Admin-only | rpc.ts:143 | no (per-mode) |
| 9 | dashboard_daily_digest() | Admin-only (service caller) | analytics-digest:96 | inherits #19-style rows? No — composes 6,21,22,4 + counts; no per-device rows |
| 10 | dashboard_engagement_deep(in_days) | Admin-only | rpc.ts:53 | no |
| 11 | dashboard_errors(row_limit) | Admin-only | rpc.ts:139; daily_digest | **row-level**: raw `meta` of error events (may include `page`, `blocked_uri`, `source_file`); no learner id |
| 12 | dashboard_executive_summary(in_days) | Admin-only | rpc.ts:41, activationFunnel.ts | no |
| 13 | dashboard_export_headline(in_days) | Admin-only | rpc.ts:126 | no |
| 14 | dashboard_friction_engineering(in_days) | Admin-only | rpc.ts:132 | recent firings with full `meta` — session-level, no device id |
| 15 | dashboard_funnel(in_days) | Admin-only | rpc.ts:136; daily_digest | no |
| 16 | dashboard_gesture_quality(in_days) | **Unused** | none | no |
| 17 | dashboard_growth(in_days) | Admin-only (already guarded) | no caller found in src/platform | **yes — per `auth.users` row incl. email** (body selects `u.email`). Guard already present; keep. |
| 18 | dashboard_ingest_latency(in_days) | **Unused** | none | no |
| 19 | dashboard_latest_sessions(row_limit) | Admin-only | rpc.ts:148 | **yes — one row per analytics session with `device_id`, `age_band`, `browser`, `device_type`, exact `started_at`/`last_at`**. Device-level = learner-level. |
| 20 | dashboard_live() | Admin-only | rpc.ts:50 | no (counts, 5-min window) |
| 21 | dashboard_mastery(in_days,in_min_attempts) | Admin-only | rpc.ts:142; daily_digest | no (per item) |
| 22 | dashboard_mastery_milestones(…) | Admin-only | rpc.ts:145; daily_digest | no (per item; devices are counted, not listed) |
| 23 | dashboard_mastery_summary(in_days) | Admin-only | rpc.ts:56 | no |
| 24 | dashboard_mastery_v2(in_days) | Admin-only | rpc.ts:71 | no |
| 25 | dashboard_observability(in_days) | Admin-only | rpc.ts:97 | no |
| 26 | dashboard_observations(in_days) | Admin-only | rpc.ts:104 | reads `human_observation_fact` (teacher notes about a child by device) — **treat as per-learner** |
| 27 | dashboard_pipeline_status(in_limit) | **Unused** | none | no |
| 28 | dashboard_progression_for_learner(in_device_id) | Admin-only | rpc.ts:86 | **yes — full history for one `device_id`**: 20 recent attempts with timestamps, θ trajectories, mastery transitions, age band. This is a learner profile. |
| 29 | dashboard_progression_top_learners(in_days,in_limit) | Admin-only | rpc.ts:83 | **yes — one row per `device_id`** (attempts, accuracy, first/last seen, age band, n_mastered). A ranked list of children. |
| 30 | dashboard_public_proof() | Deliberately public | TransparencyPage? no — landing scripts + Better Stack monitor | no (6 global counts) |
| 31 | dashboard_retention_deep() | Admin-only | rpc.ts:59 | no |
| 32 | dashboard_today() | Admin-only | rpc.ts:135; daily_digest | no |
| 33 | dashboard_top_modes(in_days) | Admin-only | rpc.ts:138; daily_digest | no |
| 34 | dashboard_tracker_health(in_days) | Admin-only | rpc.ts:137; daily_digest | no |
| 35 | dashboard_transparency_report(in_days) | Deliberately public | TransparencyPage.tsx:39; rpc.ts:100 | no; k=5 per mode already |
| 36 | dashboard_transparency_signals(in_days) | Deliberately public | TransparencyPage.tsx:41 | no; k=5 per mode already; `classrooms_engaged` counts `meta.class_code` |
| 37 | dashboard_trust_strip(in_days) | Admin-only | rpc.ts:65, components.tsx:57 | no |

Totals: **31 Admin-only** (incl. 2 service-called, 1 already guarded), **3 Deliberately public**, **4 Unused** (classrooms, gesture_quality, ingest_latency, pipeline_status). Note `dashboard_classrooms` is called inside `dashboard_daily_digest`; the digest must drop that key before the function is removed (see migration §3.3).

Highest-risk today (any parent/teacher JWT): #28 and #29 expose per-child learning profiles; #19 exposes per-device session rows; #17 would expose emails but is guarded; #26 exposes observation notes.

## 2. Public-3 residual-risk review

- `dashboard_public_proof`: six global counts over 90 days; no cohort split → no small-cohort risk. Keep as-is, but it currently runs 2 full scans of `analytics_events` (804k rows) per call and is hit by a p1 monitor; add a 60-s cache (below) so a monitor storm cannot load the DB.
- `dashboard_transparency_report`: per-mode split suppressed at < 5 distinct devices; totals rounded to 100. Adequate.
- `dashboard_transparency_signals`: per-mode split k=5; `impact.learners_active` and `sessions_run` are global; `top_engaging_mode` / `strongest_signal` / `calibration_in_progress` name a single mode with its Tier-A % — fine because the mode passed k=5. One gap: `classrooms_engaged` is a count of distinct `meta.class_code` (join codes). A count is safe; but with 1–2 classrooms it reveals that "the 1 classroom" is the one whose code appears elsewhere. Suppress when < 5.

## 3. Migration — forward

File: `supabase/migrations/20260914000002_dashboard_rpc_lockdown.sql`

### 3.1 Guard helper (admits platform admins, service_role, and non-API/cron contexts)

```sql
begin;

create or replace function public._dashboard_guard()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
begin
  -- No JWT at all: cron, psql, dashboard SQL editor as postgres. Allowed.
  if v_claims is null then return; end if;
  -- Service role (Edge Functions: analytics-digest). Allowed.
  if v_claims->>'role' = 'service_role' then return; end if;
  -- Otherwise the caller must be a platform admin.
  if public.is_platform_admin() then return; end if;
  raise exception 'forbidden' using errcode = '42501';
end $$;
revoke all on function public._dashboard_guard() from public, anon, authenticated;
```

### 3.2 Wrap the 30 unguarded admin-only functions

The bodies are plain SQL (`LANGUAGE sql`) for most; the least invasive way to add a guard without retyping 30 bodies is to **rename each to `_dashboard_x_impl` and create a thin plpgsql wrapper under the original name and signature** that calls the guard then the impl. This keeps the exact JSON contract the admin UI expects, and the rollback is a rename back.

```sql
do $$
declare
  f record;
  v_args text;
  v_argnames text;
begin
  for f in
    select p.oid, p.proname,
           pg_get_function_identity_arguments(p.oid) as ident_args,
           pg_get_function_arguments(p.oid)           as full_args
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
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
  loop
    -- 1. rename original to _impl (keeps body, SECURITY DEFINER, search_path)
    execute format('alter function public.%I(%s) rename to %I',
                   f.proname, f.ident_args, '_' || f.proname || '_impl');
    execute format('revoke all on function public.%I(%s) from public, anon, authenticated',
                   '_' || f.proname || '_impl', f.ident_args);

    -- 2. build the argument pass-through list from the identity args ("in_days integer, in_limit integer" -> "in_days, in_limit")
    select string_agg(split_part(btrim(a), ' ', 1), ', ')
      into v_argnames
      from regexp_split_to_table(f.ident_args, ',') a
     where btrim(a) <> '';

    -- 3. create the guarded wrapper with the ORIGINAL name, full arg list (defaults preserved) and jsonb return
    execute format($fmt$
      create function public.%I(%s) returns jsonb
      language plpgsql security definer
      set search_path = public, pg_temp
      as $body$
      begin
        perform public._dashboard_guard();
        return public.%I(%s);
      end $body$
    $fmt$, f.proname, f.full_args, '_' || f.proname || '_impl', coalesce(v_argnames, ''));

    execute format('revoke all on function public.%I(%s) from public, anon', f.proname, f.ident_args);
    execute format('grant execute on function public.%I(%s) to authenticated, service_role', f.proname, f.ident_args);
  end loop;
end $$;
```

Notes:
- `dashboard_daily_digest` internally calls `dashboard_today`, `dashboard_funnel`, … by their public names; those are now wrappers whose guard passes in the same request context (service_role or admin). No behaviour change.
- `authenticated` keeps EXECUTE so PostgREST can reach the wrapper; the wrapper itself enforces admin. (Revoking `authenticated` would make the admin UI 404/401 because admins are also `authenticated`.)
- `dashboard_growth` already contains the guard; it is left untouched.

### 3.3 Unused functions: remove `classrooms` from the digest, then drop all four

```sql
-- daily_digest impl still references dashboard_classrooms(30). Replace that key with null first.
create or replace function public._dashboard_daily_digest_impl()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
SELECT jsonb_build_object(
    'as_of', now(),
    'today',         (SELECT public.dashboard_today()),
    'funnel_24h',    (SELECT public.dashboard_funnel(1)),
    'funnel_7d',     (SELECT public.dashboard_funnel(7)),
    'tracker_7d',    (SELECT public.dashboard_tracker_health(7)),
    'top_modes_7d',  (SELECT public.dashboard_top_modes(7)),
    'errors',        (SELECT public.dashboard_errors(20)),
    'cohort',        (SELECT public.dashboard_cohort_retention(8)),
    'mastery',       (SELECT public.dashboard_mastery(30, 5)),
    'milestones',    (SELECT public.dashboard_mastery_milestones(60, 5, 80)),
    'classrooms',    jsonb_build_object('days', 30, 'as_of', now(), 'schools', '[]'::jsonb),
    'yesterday_count', (SELECT count(*) FROM public.analytics_events
                        WHERE occurred_at >= date_trunc('day', now() - interval '1 day')
                          AND occurred_at <  date_trunc('day', now())),
    'last7_avg_count', (SELECT round(count(*) / 7.0, 0)::int FROM public.analytics_events
                        WHERE occurred_at >= date_trunc('day', now() - interval '8 days')
                          AND occurred_at <  date_trunc('day', now() - interval '1 day'))
);
$$;

drop function if exists public.dashboard_classrooms(integer);
drop function if exists public.dashboard_gesture_quality(integer);
drop function if exists public.dashboard_ingest_latency(integer);
drop function if exists public.dashboard_pipeline_status(integer);
```

### 3.4 Public-3: aggregate-only hardening with small-cohort suppression and a cache

```sql
-- Cache table so the p1 monitor and landing page cannot fan out full scans.
create table if not exists public.dashboard_public_cache (
  key         text primary key,
  payload     jsonb not null,
  computed_at timestamptz not null default now()
);
revoke all on public.dashboard_public_cache from public, anon, authenticated;

-- public_proof: same six global counts; memoised for 60 s. No per-cohort output, no change to shape.
alter function public.dashboard_public_proof() rename to _dashboard_public_proof_impl;
revoke all on function public._dashboard_public_proof_impl() from public, anon, authenticated;

create function public.dashboard_public_proof() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v jsonb;
begin
  select payload into v from public.dashboard_public_cache
   where key = 'public_proof' and computed_at > now() - interval '60 seconds';
  if v is not null then return v; end if;
  v := public._dashboard_public_proof_impl();
  insert into public.dashboard_public_cache(key, payload, computed_at) values ('public_proof', v, now())
  on conflict (key) do update set payload = excluded.payload, computed_at = excluded.computed_at;
  return v;
end $$;
grant execute on function public.dashboard_public_proof() to anon, authenticated, service_role;

-- transparency_report: already k=5 per mode and rounded totals. Add: suppress the whole
-- by_game_mode array when fewer than 5 distinct devices exist in the window at all.
-- (Sketch: wrap existing impl.)
alter function public.dashboard_transparency_report(integer) rename to _dashboard_transparency_report_impl;
revoke all on function public._dashboard_transparency_report_impl(integer) from public, anon, authenticated;
create function public.dashboard_transparency_report(in_days integer default 30) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v jsonb; n int;
begin
  v := public._dashboard_transparency_report_impl(greatest(7, least(coalesce(in_days,30), 365)));
  select count(distinct device_id) into n from public.learning_attempts
   where occurred_at > now() - make_interval(days => in_days) and device_id is not null;
  if n < 5 then
    v := v || jsonb_build_object('by_game_mode', '[]'::jsonb, 'suppressed', true);
  end if;
  return v;
end $$;
grant execute on function public.dashboard_transparency_report(integer) to anon, authenticated, service_role;

-- transparency_signals: same wrapper; additionally suppress classrooms_engaged < 5 and
-- the single-mode "signal" objects when the eligible-mode count < 2 (otherwise the one
-- eligible mode is trivially identifiable as both strongest and weakest).
alter function public.dashboard_transparency_signals(integer) rename to _dashboard_transparency_signals_impl;
revoke all on function public._dashboard_transparency_signals_impl(integer) from public, anon, authenticated;
create function public.dashboard_transparency_signals(in_days integer default 30) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v jsonb; n_modes int; n_class int;
begin
  v := public._dashboard_transparency_signals_impl(greatest(7, least(coalesce(in_days,30), 365)));
  select count(*) into n_modes from (
    select game_mode from public.learning_attempts
     where occurred_at > now() - make_interval(days => in_days) and device_id is not null
     group by game_mode having count(distinct device_id) >= 5) m;
  n_class := coalesce((v #>> '{impact,classrooms_engaged}')::int, 0);
  if n_class < 5 then
    v := jsonb_set(v, '{impact,classrooms_engaged}', 'null'::jsonb);
  end if;
  if n_modes < 2 then
    v := v || jsonb_build_object('top_engaging_mode', null, 'strongest_signal', null,
                                 'calibration_in_progress', null, 'suppressed', true);
  end if;
  return v;
end $$;
grant execute on function public.dashboard_transparency_signals(integer) to anon, authenticated, service_role;

commit;
```

Client impact: `TransparencyPage.tsx` must tolerate `by_game_mode = []`, `classrooms_engaged = null`, and null signal objects (it should already, but verify on staging). The public JSON shape is otherwise unchanged; the Better Stack monitor sees the same 200.

## 4. Verification queries (run on staging after applying)

```sql
-- No dashboard_* callable by anon except the public 3
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'dashboard\_%' and has_function_privilege('anon', p.oid, 'EXECUTE')
 order by 1;   -- expect exactly: dashboard_public_proof, dashboard_transparency_report, dashboard_transparency_signals

-- Every remaining admin-only wrapper contains the guard
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'dashboard\_%'
   and p.proname not in ('dashboard_public_proof','dashboard_transparency_report','dashboard_transparency_signals')
   and p.prosrc !~ '_dashboard_guard|is_platform_admin';  -- expect 0 rows

-- Impl functions are not reachable over the API
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like '\_dashboard\_%\_impl'
   and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE')); -- expect 0
```

Behavioural tests (staging, via curl):
1. Parent JWT → `POST /rest/v1/rpc/dashboard_progression_top_learners` → **401/403 (42501)**.
2. Platform-admin JWT → same call → 200.
3. Service-role key → `dashboard_daily_digest` → 200 and `classrooms.schools = []`.
4. Anon key → `dashboard_public_proof` → 200 twice; second call served from cache (`computed_at` unchanged).
5. Anon key → `dashboard_latest_sessions` → 404/401 (no EXECUTE).

## 5. Rollback

```sql
begin;
-- public 3
drop function if exists public.dashboard_transparency_signals(integer);
alter function public._dashboard_transparency_signals_impl(integer) rename to dashboard_transparency_signals;
grant execute on function public.dashboard_transparency_signals(integer) to anon, authenticated, service_role;
drop function if exists public.dashboard_transparency_report(integer);
alter function public._dashboard_transparency_report_impl(integer) rename to dashboard_transparency_report;
grant execute on function public.dashboard_transparency_report(integer) to anon, authenticated, service_role;
drop function if exists public.dashboard_public_proof();
alter function public._dashboard_public_proof_impl() rename to dashboard_public_proof;
grant execute on function public.dashboard_public_proof() to public, anon, authenticated, service_role;
drop table if exists public.dashboard_public_cache;

-- admin-only wrappers -> restore originals (grants restored to authenticated, service_role; anon stays revoked)
do $$
declare f record;
begin
  for f in select p.proname, pg_get_function_identity_arguments(p.oid) ident_args
             from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname='public' and p.proname ~ '^_dashboard_.*_impl$'
  loop
    execute format('drop function if exists public.%I(%s)', substr(f.proname, 2, length(f.proname) - 6), f.ident_args);
    execute format('alter function public.%I(%s) rename to %I', f.proname, f.ident_args, substr(f.proname, 2, length(f.proname) - 6));
    execute format('grant execute on function public.%I(%s) to authenticated, service_role', substr(f.proname, 2, length(f.proname) - 6), f.ident_args);
  end loop;
end $$;
drop function if exists public._dashboard_guard();
-- The four dropped unused functions are restored from supabase/baseline/prod_public_schema.sql if ever needed.
commit;
```

## 6. Open items for the implementer

- `src/pages/admin/insights/rpc.ts` passes `in_limit` to `dashboard_errors` but the function's parameter is `row_limit` (and `dashboard_latest_sessions` likewise). PostgREST would 404 on the mismatched name; either the UI is already broken for those two panels or a different overload exists. Verify on staging before and after — the wrapper preserves the server-side names, so this is pre-existing, not introduced.
- After lock-down, the Insights UI should stop rendering `progression_for_learner` history by raw `device_id` in any exportable form (WP2A.1 §1.6).
