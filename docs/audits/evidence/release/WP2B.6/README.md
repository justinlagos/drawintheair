# WP2B.6 — Observability: synthetic ingest canary, not a silence alarm (DIA-029, DIA-031)

Status: DESIGN, NOT APPLIED. Rehearse on staging, founder go in writing, then apply. Evidence date 2026-09-07. Branch `wp/2b6`.

## 0. What was verified on production (read-only SELECT, 2026-09-07)

| Fact | Query | Result |
|---|---|---|
| Client ingest path | `src/lib/analytics.ts:1145` | browser flush calls RPC `ingest_analytics_events(in_events jsonb)`; plain insert only as fallback |
| traffic_type reaches the column | `pg_trigger` on `analytics_events` | `trg_analytics_events_promote_meta` copies `meta.traffic_type` and `meta.environment` into the columns when they are NULL; the RPC does not accept the columns directly, so meta is the only path, same as the browser |
| Exclusion predicate | `pg_get_functiondef` of `dashboard_executive_summary`, `dashboard_funnel` | both use `(traffic_type IS NULL OR traffic_type NOT IN ('internal','qa','bot'))`; "session" = distinct `session_id` with at least one non-noise event; noise = `session_heartbeat, tracker_quality_sample, tab_hidden, tab_visible, csp_violation` |
| Canary rows would be excluded | see §3 | 0 rows survive the predicate |
| Traffic mix, last 7 days | group by traffic_type | `real`: 5078 events / 34 sessions; `bot`: 9 / 9; no `internal` rows yet; no `ingest_canary` rows; canary session id unused |
| Genuine sessions, last 24 h | dashboard semantics | 11 |
| `refresh-materialized-views` | `cron.job` id 1, `cron.job_run_details` 14 d | 14/14 runs failed: `"v_teacher_session_stats" is not a table or materialized view` |
| Materialized views on production | `pg_matviews` | **none**. All five names in the job (`v_teacher_session_stats, v_activity_performance, v_engagement_metrics, v_school_overview, v_growth_metrics`) are plain views |
| Anomaly check semantics | `pg_get_functiondef('dashboard_anomaly_check')` | `new_sessions = count(distinct session_id) FILTER (WHERE event_name = 'session_started')`; `session_started` rows in the last 90 days: **0** |
| Digest and anomaly plumbing | `cron.job` ids 5 and 6 | both `net.http_post` to the `analytics-digest` edge function, which calls SQL `dashboard_daily_digest()` / `dashboard_anomaly_check()` and emails the JSON. The logic lives in SQL, so the fix is a migration |
| Other cron jobs | `cron.job_run_details` 14 d | all succeeded except id 2 `retention-purge` (14/14 failed, NOT NULL on `sessions.code`; that is DIA-008 / WP2A.1, not touched here) |

## 1. Design

A "zero events in 24 h" alarm cannot be made honest at 3 to 13 sessions/day: 11 genuine sessions in the last 24 h today, but a quiet Saturday can legitimately be 0. Volume and liveness are therefore separated:

- **Liveness (alarm):** pg_cron job `ingest-canary-15m` calls `app_private.run_ingest_canary()`, which builds one event shaped exactly like `buildRow()` in `src/lib/analytics.ts` and pushes it through `public.ingest_analytics_events(jsonb)`, the RPC the browser uses. The event is `event_name = 'ingest_canary'`, `session_id = c0a7a7a7-0000-4000-8000-000000000001` (fixed, obviously synthetic), `device_id NULL`, `meta.traffic_type = 'internal'`, `meta.environment = 'production'`, `context = 'canary'`, `page = '/internal/canary'`. If the RPC, trigger, table or cron breaks, the function raises (visible in `cron.job_run_details`) and no row lands. `public.canary_status()` returns `{healthy, age_seconds}` and nothing else; `healthy` is true while the newest canary row is younger than 45 min (three missed runs). It is anon-executable, like `dashboard_public_proof`, so Better Stack polls it with the anon key. The canary prunes its own rows after 7 days (96 rows/day).
- **Volume (notification):** `dashboard_daily_digest()` now includes `genuine_sessions_24h` (dashboard semantics) and, when it is 0, `genuine_sessions_note` saying quiet days are expected. It also includes the `ingest_canary` block. Nothing pages on this; it is a line in the 07:00 email. The repo copy of the edge function renders these two lines above the JSON dump (`renderIngestHealth`).
- **Digest counts corrected:** `yesterday_count` and `last7_avg_count` were unfiltered raw counts. With 96 canary rows/day they would be dominated by the canary, so they now exclude `internal/qa/bot` (the same predicate as the dashboards). Semantics are documented in the returned `semantics` key.
- **DIA-031:** the job is unscheduled. There is no statement to fix because there is no materialized view left; plain views are always current. Re-creating it is left commented in the rollback file.
- **Anomaly check:** `new_sessions` now equals "distinct sessions with at least one non-noise event, internal/qa/bot excluded" over the same 15-minute window. The four breach metrics are unchanged (raw, unfiltered) on purpose: internal reproductions of tracker failures or CSP blocks are still worth an email, and `ingest_canary` matches none of their event names, so the canary cannot trigger a breach.

Not changed: `dashboard_public_proof` (the p1 monitor). It has no traffic filter, but the canary carries `device_id NULL` and an event name it does not count, so its six numbers are unaffected. The wider "most dashboard_* RPCs do not filter traffic_type" finding is logged, not fixed (§7).

## 2. Files

| File | Purpose |
|---|---|
| `supabase/migrations/20260914000006_wp2b6_observability_canary.sql` | forward migration (index, writer, status fn, digest, anomaly check, unschedule dead job, schedule canary) |
| `supabase/migrations/rollbacks/20260914000006_wp2b6_observability_canary_rollback.sql` | rollback; restores both function bodies as read from production; lives under `rollbacks/` so the CLI never applies it forward |
| `supabase/migrations/tests/ingest_canary_test.sql` | staging assertion script (single rolled-back transaction) |
| `config/betterstack.monitors.json` | new monitor "Supabase health — ingest canary" |
| `platform/supabase/functions/analytics-digest/index.ts` | `renderIngestHealth()`; daily email shows the genuine-sessions line and canary state |
| `tests/ingest-canary-config.test.ts` | vitest: 45-min rule, exclusion contract, monitor spec, rollback completeness |

## 3. Dry-run SQL (read-only) and expected outputs

Run before applying, on production, to confirm nothing has drifted since 2026-09-07.

```sql
-- 3.1 Exclusion proof: a row shaped like the canary does not survive the dashboard predicate.
with sim as (
  select 'ingest_canary'::text as event_name, 'internal'::text as traffic_type,
         'c0a7a7a7-0000-4000-8000-000000000001'::uuid as session_id
)
select count(*) as canary_rows_surviving_filter
from sim e
where (e.traffic_type is null or e.traffic_type not in ('internal','qa','bot'));
-- expected: 0

-- 3.2 Nothing pre-exists under the canary name or session id.
select
  (select count(*) from analytics_events where event_name = 'ingest_canary') as canary_rows,
  (select count(*) from analytics_events where session_id = 'c0a7a7a7-0000-4000-8000-000000000001') as canary_session_rows,
  (select count(*) from pg_indexes where indexname = 'analytics_events_ingest_canary_idx') as idx,
  (select count(*) from cron.job where jobname = 'ingest-canary-15m') as job;
-- expected: 0, 0, 0, 0   (observed 2026-09-07: 0, 0, 0, 0)

-- 3.3 The dead job and the matview situation.
select jobid, jobname, active from cron.job where jobname = 'refresh-materialized-views';  -- expected: one row, active
select count(*) from pg_matviews;                                                          -- expected: 0
select status, count(*) from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname = 'refresh-materialized-views')
   and start_time > now() - interval '14 days' group by 1;                                 -- expected: failed only

-- 3.4 The retired event really is retired.
select count(*) from analytics_events where event_name = 'session_started' and occurred_at > now() - interval '90 days';
-- expected: 0

-- 3.5 Baseline for the digest line (dashboard semantics).
select count(distinct session_id) as genuine_sessions_24h
from analytics_events
where occurred_at > now() - interval '24 hours'
  and (traffic_type is null or traffic_type not in ('internal','qa','bot'))
  and event_name not in ('session_heartbeat','tracker_quality_sample','tab_hidden','tab_visible','csp_violation');
-- observed 2026-09-07: 11
```

Expected observations immediately after applying:

```sql
select public.canary_status();
-- {"healthy": false, "age_seconds": null}   until the first :03/:18/:33/:48 run
-- {"healthy": true,  "age_seconds": <0..900>} afterwards
select jobid, jobname, schedule, active from cron.job order by jobid;
-- refresh-materialized-views absent; ingest-canary-15m present, '3-59/15 * * * *'
select traffic_type, environment, device_id, context from analytics_events where event_name = 'ingest_canary' order by occurred_at desc limit 1;
-- internal | production | NULL | canary
select (public.dashboard_executive_summary(1)->'current'->>'sessions_started')::int;  -- unchanged by the canary
select public.dashboard_daily_digest() -> 'genuine_sessions_24h';                      -- integer, canary not counted
select public.dashboard_anomaly_check() -> 'window_summary' -> 'new_sessions';         -- integer, 0 on a quiet quarter hour
```

## 4. Staging rehearsal

1. On the synthetic staging project (WP1A.2), apply `20260914000006_wp2b6_observability_canary.sql` with `supabase db push` or the SQL editor. The migration creates a partial index on `analytics_events` inside the transaction; on production (about 800k rows) expect a 1 to 3 s write lock on the table, so apply outside school hours.
2. Run `supabase/migrations/tests/ingest_canary_test.sql` (psql `\i`). Expect `WP2B.6 CANARY TEST PASSED`. It writes one canary row and rolls everything back.
3. Wait for two scheduled runs (about 30 min). `select public.canary_status();` must show `healthy: true` and `cron.job_run_details` must show `succeeded` for `ingest-canary-15m`.
4. Hit the RPC the way Better Stack will: `curl -s -X POST "https://<ref>.supabase.co/rest/v1/rpc/canary_status" -H "apikey: <anon>" -H "Authorization: Bearer <anon>" -H "Content-Type: application/json" -d '{}'` and confirm the body contains `true` and nothing but the two keys.
5. Confirm `public.dashboard_daily_digest()` returns `genuine_sessions_24h` and that `select net.http_post(...)` of the digest still emails (or, with no Resend key on staging, that the function returns `ok`).
6. Deploy the edge function from the repo copy only if the deployed copy is confirmed to be a superset of it (see §6, founder step 4).

## 5. Rollback

Run `supabase/migrations/rollbacks/20260914000006_wp2b6_observability_canary_rollback.sql` by hand. It unschedules the canary, restores `dashboard_daily_digest()` and `dashboard_anomaly_check()` to the bodies read from production on 2026-09-07, drops `canary_status()`, `run_ingest_canary()` and the index, and deletes the synthetic rows (fixed session id only). Re-creating `refresh-materialized-views` is left commented out because it can only fail. Then pause the Better Stack canary monitor so it does not alert on the missing RPC. No user data is affected in either direction.

## 6. Founder-only steps (dashboards, not code)

1. Written go, then apply the forward migration to production (`supabase db push` from the release branch, or paste in the SQL editor). Verify with §3 "after" queries.
2. Better Stack: create the monitor from `config/betterstack.monitors.json` entry "Supabase health — ingest canary". Fill in the project ref and anon key as for the public-proof monitor. Set it to alert when the keyword `true` is **missing**, expected status 200, every 5 min, confirmation 10 min. Priority p2.
3. Gate 4 induced failure (§8): `select cron.unschedule('ingest-canary-15m');` then after the monitor alerts (45 to 55 min), `select cron.schedule('ingest-canary-15m', '3-59/15 * * * *', 'select app_private.run_ingest_canary()');` and confirm recovery. Record timestamps in this README.
4. Edge function `analytics-digest`: the repo copy is a stub that emails raw JSON; the deployed copy has an HTML renderer that was never committed (header comment in the file says so). Either (a) fetch the deployed source, add the `renderIngestHealth()` block from the repo copy, redeploy; or (b) accept that the new keys appear only in the JSON section of the email until the renderer is reconciled. Option (b) is safe; the notification is still present in the email body.

## 7. Findings outside this package (logged, not fixed)

Appended to `docs/audits/RELEASE_FINDINGS_LOG.md`:
- 25 of 28 functions that read `analytics_events` apply no `traffic_type` filter (only `dashboard_executive_summary`, `dashboard_funnel` and the trigger do). Includes `dashboard_public_proof`, `landing_public_proof`, `dashboard_today`, `dashboard_top_modes`, `dashboard_tracker_health`, `dashboard_errors`, `dashboard_classrooms`, `dashboard_cohort_*`, `dashboard_growth`, `lios_detect_friction_v1`. Internal, QA and bot traffic still feed those numbers. Belongs with WP2A.2 / DIA-006 rewrite or its own package.
- The deployed `analytics-digest` edge function source is not in the repo (renderer never committed).
- `retention-purge` still fails nightly (DIA-008), confirmed 14/14 in this window; owned by WP2A.1.

## 8. Gate 4 check

| Check | How | Pass condition | Result |
|---|---|---|---|
| Canary appears on schedule | `select occurred_at from analytics_events where event_name='ingest_canary' order by 1 desc limit 8;` after 2 h | 8 rows, 15 min apart, at :03/:18/:33/:48 | pending (apply first) |
| Canary invisible to product analytics | `dashboard_executive_summary(1)`, `dashboard_funnel(1)` before and 1 h after apply | `sessions_started` and every funnel step unchanged by the canary; `select count(*) ... traffic_type='internal' and event_name='ingest_canary'` grows while dashboard numbers do not | pending |
| Monitor green | Better Stack monitor "Supabase health — ingest canary" | up for 24 h with no incident | pending |
| Induced failure | `cron.unschedule('ingest-canary-15m')` for 1 h | `canary_status()` flips to `healthy: false` at 45 min; Better Stack opens an incident within the confirmation window; re-schedule; monitor recovers within 20 min | pending |
| Dead job gone | `select * from cron.job where jobname='refresh-materialized-views'` | 0 rows; no new failed rows for jobid 1 in `cron.job_run_details` | pending |
| Anomaly check honest | `dashboard_anomaly_check()->'window_summary'->'new_sessions'` during a real session | non-zero while someone is playing; the old definition was always 0 | pending |
| Quiet-day notification | 07:00 digest on a day with 0 genuine sessions | email contains "Genuine sessions in last 24h: 0" plus the note, and "Ingest canary: healthy"; no page | pending |

## 9. Local checks

Recorded in the final report to the orchestrator (`npm ci`, `npm run type-check`, `npm run lint`, `npm test`, `npm run build`).
