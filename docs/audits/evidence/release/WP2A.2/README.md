# WP2A.2 — dashboard_* RPC access lock-down (DIA-006)

Status: **rehearsed on staging, awaiting Justin's written go for production.**
Nothing has been applied to production. Branch `wp/2a-db`.

Design: `DASHBOARD_RPC_CLASSIFICATION_DIA-006.md` in this directory.

## What changed and why

All 37 `public.dashboard_*` functions are `SECURITY DEFINER` and every one is
EXECUTE-able by `authenticated`. Only `dashboard_growth` had an in-body admin
guard. Any signed-in parent or teacher could therefore call the admin analytics
RPCs with their own JWT, including three that return per-learner rows:

| function | what it returned to any signed-in account |
|---|---|
| `dashboard_progression_top_learners` | one row per `device_id`: attempts, accuracy, first/last seen, age band, items mastered. A ranked list of children. |
| `dashboard_progression_for_learner` | one `device_id`'s full history: 20 recent attempts with timestamps, theta trajectories, mastery transitions, age band. |
| `dashboard_latest_sessions` | one row per analytics session with `device_id`, `age_band`, `browser`, `device_type`, exact start and last-seen times. |

The classification was not applied as one blanket guard:

* **31 admin-only** get an in-body guard and keep `anon` revoked.
* **3 deliberately public** (`dashboard_public_proof`,
  `dashboard_transparency_report`, `dashboard_transparency_signals`) stay
  anon-callable and are rewritten so the output is aggregate-only with
  small-cohort suppression.
* **4 unused** (`dashboard_classrooms`, `dashboard_gesture_quality`,
  `dashboard_ingest_latency`, `dashboard_pipeline_status`) are dropped.

`dashboard_growth` already carried the guard and is not touched by this package.

### Method

Renaming each admin-only function to `_<name>_impl` and creating a thin guarded
wrapper under the original name and signature. Body, volatility, `SECURITY
DEFINER` and `search_path` travel with the rename, so the JSON contract the
admin Insights UI reads is byte-identical. The rollback is a rename back.

The guard admits three callers:

1. no request JWT at all (pg_cron, psql, the SQL editor as `postgres`);
2. `service_role` (the `analytics-digest` Edge Function, cron jobs 5 and 6);
3. a platform admin via `is_platform_admin()`.

(2) matters. Under `service_role` `auth.uid()` is NULL, so a naive
`is_platform_admin()` guard would have broken the nightly digest and the
15-minute anomaly alert. That is the July `is_admin_user` failure mode repeated,
and it is why the guard is not just one function call.

`authenticated` keeps EXECUTE on the wrappers, because platform admins are also
`authenticated` and PostgREST needs the privilege to reach the function at all.
The wrapper body is what enforces admin.

### The public three

* `dashboard_public_proof`: six global 90-day counts, no cohort split, nothing
  to suppress. It ran two full scans of `analytics_events` per call and is
  polled by a Better Stack **p1** monitor with the anon key
  (`config/betterstack.monitors.json`), so it is now memoised for 60 seconds in
  `public.dashboard_public_cache` (RLS on, no policies, no API role has any
  privilege on it). The monitor still sees the same 200 and the same JSON.
* `dashboard_transparency_report`: per-mode rows were already suppressed below
  k=5 distinct devices and totals rounded to 100. Added: the window is clamped
  to 7..365 days so an anonymous caller cannot ask for an unbounded scan, and
  the whole `by_game_mode` array is dropped when the window holds fewer than 5
  distinct learners in total. With one or two learners, "the modes that survived
  k=5" is still a description of those learners.
* `dashboard_transparency_signals`: same clamp. `classrooms_engaged` (a count of
  distinct join codes) is nulled below 5, because below that it narrows to a
  named classroom. The three single-mode signal objects
  (`top_engaging_mode`, `strongest_signal`, `calibration_in_progress`) are
  nulled when fewer than 2 modes pass k=5, because the same mode being both the
  strongest and the weakest says more about the handful of learners in it than
  about the mode.

Both keep their **default window of 90 days**, which is what `/transparency`
requests. The design draft had them at 30; that would have silently changed the
live page.

### Client changes in this package

`/transparency` is live, so the suppression could not be shipped without making
the page tolerate it:

* `src/pages/admin/insights/types.ts`: `impact.classrooms_engaged` is now
  `number | null`.
* `src/pages/TransparencyPage.tsx`: the "Where children are practising" section
  survives a null classroom count and hides that one stat instead of calling
  `.toLocaleString()` on null.

`by_game_mode: []` needed no change; the page already renders an empty array.

## Files

| file | sha256 (at authoring) |
|---|---|
| `supabase/migrations/20260914000002_dashboard_rpc_lockdown.sql` | `32235bc1bf307c689b7babd8c9363f035d51e100d760acc339c27b6f2b515088` |
| `supabase/migrations/rollbacks/20260914000002_dashboard_rpc_lockdown_rollback.sql` | `a6121f229216e982861dfd33e725f63174c6799a85fb748d16895e7bce0f9bff` |
| `tests/dashboard-rpc-lockdown.test.ts` | 19 vitest cases |

**The production SQL is the migration file, applied verbatim.** There is no
separate production variant. Check the hash before applying.

## Staging rehearsal, 2026-09-08 (project `dcivdrhxeaiulbbhsgfv`)

Forward, then rollback, then forward again. Every step verified.

| metric | before | after forward | after rollback | after re-apply |
|---|---|---|---|---|
| `public.dashboard_*` functions | 37 | 33 | 33 | 33 |
| callable by `anon` | 3 | 3 | 3 | 3 |
| carrying an admin guard | 1 | 30 | 1 | 30 |
| `_dashboard_*_impl` functions | 0 | 32 | 0 | 32 |

30 guarded = 29 new wrappers + `dashboard_growth`.
33 functions = 37 minus the 4 dropped. The rollback deliberately leaves the four
dropped functions dropped; restore them from
`supabase/baseline/prod_public_schema.sql` if they are ever wanted back.

### Behavioural checks (all passed)

1. Non-admin `authenticated` JWT calling `dashboard_progression_top_learners`
   raises `42501`.
2. `anon` JWT calling `dashboard_latest_sessions` raises `42501` (and has no
   EXECUTE, so PostgREST refuses before the body runs).
3. `service_role` JWT calling `dashboard_daily_digest` returns 200 with
   `classrooms.schools = []` and the full key set.
4. No request JWT (cron, psql) calling `dashboard_today` returns normally.
5. A platform admin JWT calling `dashboard_progression_top_learners` and
   `dashboard_latest_sessions` returns normally.
6. Two `dashboard_public_proof` calls inside 60 seconds share one
   `computed_at`, so the second is served from cache.
7. Smoke test of all 33 functions with default arguments: 32 returned, and
   `dashboard_growth` raised `forbidden`, which is its own pre-existing
   behaviour when there is no JWT (it has no service_role or no-JWT exemption).
8. `dashboard_transparency_signals` output on staging changed only in
   `impact.classrooms_engaged`, `0` becoming `null` under the k=5 rule. The
   `dashboard_public_proof` payload is byte-identical.

## Verification queries to run after applying to production

```sql
-- 1. Only the deliberately public three are callable by anon. Expect exactly
--    dashboard_public_proof, dashboard_transparency_report,
--    dashboard_transparency_signals.
select p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname like 'dashboard\_%'
   and has_function_privilege('anon', p.oid, 'EXECUTE')
 order by 1;

-- 2. Every remaining admin-only function carries a guard. Expect 0 rows.
select p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname like 'dashboard\_%'
   and p.proname not in ('dashboard_public_proof','dashboard_transparency_report',
                         'dashboard_transparency_signals')
   and p.prosrc !~ '_dashboard_guard|is_platform_admin';

-- 3. The impl functions are not reachable over the API. Expect 0 rows.
select p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname ~ '^_dashboard_.*_impl$'
   and (has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE'));

-- 4. Counts. Expect 33 / 3 / 30 / 32.
select
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname like 'dashboard\_%') as dashboard_fns,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname like 'dashboard\_%'
     and has_function_privilege('anon',p.oid,'EXECUTE')) as anon_exec,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname like 'dashboard\_%'
     and p.prosrc ~ 'is_platform_admin|_dashboard_guard') as guarded,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname ~ '^_dashboard_.*_impl$') as impls;

-- 5. The public surface still answers. Both must return JSON.
select public.dashboard_public_proof() ? 'items_mastered';
select public.dashboard_transparency_signals(90) ? 'impact';

-- 6. The cache is not readable by any API role. Expect false, false.
select has_table_privilege('anon','public.dashboard_public_cache','SELECT'),
       has_table_privilege('authenticated','public.dashboard_public_cache','SELECT');
```

Then, outside SQL:

* Load `https://drawintheair.com/transparency` and switch between 30, 90 and 180
  days. Every section must render.
* Confirm the Better Stack monitor "Supabase health — public proof RPC" is still
  green after two poll intervals.
* Sign in to `/admin/insights` as a platform admin and check every tab loads.
* Confirm the next `dita-daily-digest` run (07:00 UTC) delivers.

## Rollback

Run `supabase/migrations/rollbacks/20260914000002_dashboard_rpc_lockdown_rollback.sql`
by hand. It renames every `_impl` back, drops the guard and the cache table, and
restores the public three. It deliberately does not re-grant `anon` on the
admin-only functions (WP0.5.2 revoked four of those in production on 7 September
and that change stands on its own), and it does not resurrect the four dropped
functions.

Rehearsed on staging: after the rollback, 33 functions, 3 anon-callable, 1
guarded, 0 impls, and `dashboard_public_proof`, `dashboard_transparency_signals`
and `dashboard_daily_digest` all still returned.

## What the founder must do by hand

1. Give written go, then apply
   `supabase/migrations/20260914000002_dashboard_rpc_lockdown.sql` to production
   (`fmrsfjxwswzhvicylaph`) and run the verification queries above.
2. Reload the PostgREST schema cache. The migration ends with
   `notify pgrst, 'reload schema'`; if the admin UI 404s on a dashboard RPC
   straight after applying, that notify did not land and the project needs a
   restart from the Supabase dashboard.
3. Watch the Better Stack p1 monitor and `/transparency` for one hour.
4. Decide separately whether the Insights UI should keep rendering
   `dashboard_progression_for_learner` history keyed by raw `device_id` in any
   exportable form (WP2A.1 §1.6). This package gates who can call it; it does
   not change what an admin sees.

## Out of scope, logged not fixed

* `src/pages/admin/insights/rpc.ts` sends `in_limit` to `dashboard_errors` and
  `dashboard_latest_sessions`, whose server-side parameters are `row_limit`.
  PostgREST 404s on a name mismatch, so those two panels are almost certainly
  already broken in production. The wrapper preserves the server-side names, so
  this is pre-existing and unchanged either way. Findings log entry 43.
* Findings log entry 22 (no `traffic_type` filter on 25 of the 28 public
  functions that read `analytics_events`) is a metric-definition problem, not an
  access-control one. This package does not change what any function counts, so
  it stays open.
