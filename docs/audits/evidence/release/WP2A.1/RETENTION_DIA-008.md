# WP2A.1 — Retention & anonymisation (DIA-008)

Status: DESIGN — nothing here has run against production. All SQL is to be rehearsed on staging first.
Evidence date: 2026-09-07. Source of truth: live production catalogue (`information_schema`, `pg_policies`, `cron.job`) and `/home/claude/dia-ro` (origin/master).

> Inputs flagged missing: `docs/audits/NEW_TERM_RELEASE_EXECUTION_BRIEF.md` and `docs/audits/NEW_TERM_READINESS_AUDIT_2026-08-15.md` do not exist in either worktree. This design is derived from the "known facts" in the task brief plus direct inspection of production.

## 0. What is broken today (verified)

The `retention-purge` cron job (`cron.job` id 2, `0 2 * * *`) runs one multi-statement command. Statement 4 is:

```sql
UPDATE public.sessions SET code = NULL
WHERE ended_at < now() - interval '30 days' AND code IS NOT NULL;
```

`sessions.code` is `text NOT NULL` (verified in `information_schema.columns`; `session_code` is `GENERATED ALWAYS AS (code)`). The UPDATE raises `23502` for the first qualifying row, the whole command aborts, and **every statement in the job is rolled back** — including the `teacher_insights` / `platform_insights` / `client_errors` deletes and the trial-data purge that precede/follow it. Consequence: none of the retention promises in the job have been kept for ~122 nights.

Other retention jobs are separate `cron.job` rows and are unaffected: `dita-prune-analytics-events` (365 d) and `dita-prune-learning-attempts` (365 d) run as their own transactions.

## 1. Anonymity definition (per column)

Legend — **K** keep as-is (not personal data or needed structurally), **A** aggregate (retain only in an aggregate/derived form, then destroy the row), **D** destroy (delete row or null/hash the column at the retention boundary).

Retention boundary used below: **30 days after `sessions.ended_at`** for classroom-session tables; **365 days after `occurred_at`** for analytics/attempt tables (existing jobs 3 & 4), with the changes to `meta` noted.

### 1.1 `public.sessions` (7 rows in prod)

| column | type | verdict | justification |
|---|---|---|---|
| id | uuid | D | Row is deleted at boundary (see §2 contract). Keeping the id keeps the join key to every child row. |
| teacher_id | uuid NOT NULL FK teachers | D | Direct pseudonymous identifier of an adult; joined to `teachers.email`. |
| code | text NOT NULL | D | 4-digit join code; reused across sessions so alone it is weak, but with `created_at` it re-identifies a class. Cannot be nulled (NOT NULL) — see contract. |
| activity | text | A | Aggregated into `v_activity_performance` (materialised view, refreshed nightly). Row copy destroyed. |
| status / class_state | text | K→D | Only `ended` rows are eligible; the value carries no information after that. Row deleted. |
| round, timer_seconds, max_students, scoreboard_mode, scoreboard_visible, activity_version | int/text/bool | A | Configuration only; roll up into per-teacher session stats before deletion. |
| created_at, started_at, ended_at, updated_at | timestamptz | D | **Unique-timestamp re-identification**: a single session's exact start time + school timetable identifies the class and therefore every child in it. Aggregate to day granularity in `v_teacher_session_stats`; destroy row. |
| school_id | uuid FK schools | D | Institutional identifier; with `created_at` it is a class identifier. |
| playlist_id | uuid | K→D | Not personal; goes with the row. |
| metadata | jsonb | D | Free-form; cannot be proven free of names. |
| session_code | generated | D | Mirror of `code`. |
| class_name | text | D | Teacher-typed label — frequently "Year 1 Oak", i.e. a class identifier, and occasionally a child's name. |
| tenant_id | uuid | D | Institutional identifier. |

### 1.2 `public.session_students` (33 rows)

| column | verdict | justification |
|---|---|---|
| id | D | Join key to `round_scores`, `student_activity_assignments`, `class_session_tokens.claimed_session_student_id` (all cascade / set-null). |
| session_id | D | Links to a class + date. |
| name, student_name (generated) | **D** | **Child's first name.** 28 of 33 rows match a roster first name exactly. This is the highest-sensitivity column in the database. |
| joined_at, left_at, updated_at, readiness_changed_at, kicked_at | D | Per-child timestamps at second precision — unique per child in a class; sufficient to re-identify from a register. |
| is_connected, is_active (generated) | D | Row goes. |
| student_avatar, avatar_seed | D | `avatar_seed` is literally `session_id || ':' || lower(name)` (see `class_join`) — it embeds the child's name. |
| kicked_reason | D | Free text written by a teacher about a named child. |
| tenant_id | D | Institutional identifier. |
| class_child_id | D | Links a transient session identity to a persistent roster identity. |
| readiness_state | A | Aggregate readiness funnel per session before deletion (counts only). |

### 1.3 `public.class_children` (34 rows; the persistent roster)

Retention here is **not time-based** — it is lifecycle-based (teacher archives/deletes; account deletion cascades). Existing RPCs `class_child_anonymise/archive/delete` and migration `20260629000005_persistent_learner_p4_deletion.sql` already implement the destroy path. Verdicts describe what the destroy path must clear.

| column | verdict | justification |
|---|---|---|
| id | K | Needed as FK target; opaque. |
| teacher_id, tenant_id | K | Ownership — required for RLS; pseudonymous adult, not a child. |
| first_name | **D** (on anonymise) | Child's name. 34/34 rows populated. |
| nickname, display_name | **D** (on anonymise) | Child-identifying labels. |
| notes | **D** (on anonymise) | Free text about a child (0 populated today; must still be cleared). |
| age_band | K | Coarse (band, not DOB). Safe only because the k-anonymity of an age band within a class is > 1 in practice; suppress in any per-child export. |
| avatar_seed | D (on anonymise) | May be derived from a name. |
| archived, created_at, updated_at | K | Not personal. `created_at` to day precision if ever exported. |

### 1.4 `public.learning_attempts` (7,558 rows; `dita-prune-learning-attempts` at 365 d)

Important verified fact: `learning_attempts.session_id` is a **client analytics session id**, not `sessions.id` — 0 rows join to `sessions`. The classroom linkage is only via `context = 'classroom'` (22 rows) and `device_id`.

| column | verdict | justification |
|---|---|---|
| id, event_uid, attempt_id, client_seq | K | Opaque. |
| occurred_at, client_ts, credibility_scored_at, elo_processed_at | K (365 d) → A | Millisecond timestamps are a linkage vector across tables; after 365 d only day-level aggregates survive (existing MVs / LIOS facts). |
| session_id | K (365 d) | Client-generated; not a classroom identifier. |
| device_id | **A** | Stable pseudonymous identifier (125 distinct). Pseudonymous ≠ anonymous: on a 1:1 device it is a child. Keep for the 365 d window (needed by LIOS/Elo), then destroy with the row. Never export raw. |
| child_profile_id | **D** at 365 d; **D immediately** on child-profile deletion (existing cascade) | Direct link to a named child in the family product. 1,411 rows carry it. |
| tenant_id | A | Institutional identifier. |
| game_mode, stage_id, stage_index, item_key, age_band, was_correct, attempt_number, ms_to_attempt, expected_value, actual_value, context | A | Pedagogic payload; safe in aggregate. `actual_value` is what the child produced — in tracing/writing modes it can be a name if the item asked for one; treat as **D** on export. |
| meta | **D** on export / A | Keys observed: `itemKey, isCorrect, action_duration_ms, expected_letter, actual_letter, word, …, _mirror_source`. No name keys seen, but free-form; strip to an allow-list before any export. |
| credibility_*, gq_* | A | Derived metrics; not identifying alone. |

### 1.5 `public.analytics_events` (804,286 rows; `dita-prune-analytics-events` at 365 d)

| column | verdict | justification |
|---|---|---|
| id, event_uid, client_seq, attempt_id | K | Opaque. |
| session_id | K (365 d) | Client analytics session, not classroom session (0 rows join to `sessions`). |
| occurred_at, client_ts, received_at | K (365 d) → A | As above. |
| event_name, page, component, game_mode, stage_id, chapter, level, age_band, value_number, context, environment, traffic_type, build_version | A | Product telemetry. |
| school_id, class_id, tenant_id | D | Institutional identifiers (all 0 populated today; keep the rule). |
| device_type, browser, browser_version, viewport_w, viewport_h | A | Fingerprint surface; individually coarse, jointly a device fingerprint. Aggregate only. |
| utm_source, utm_medium, utm_campaign | A | Marketing; 327 rows. |
| referrer | **D at 30 d** (new) | 687,347 rows. Full referrer URLs can carry school intranet hostnames, LMS deep links with student ids, or search queries. Truncate to origin at ingest going forward; null at 30 d for existing rows. |
| device_id | A | 582 distinct; same reasoning as attempts. |
| meta | **partial D at 30 d** | Contains `profile_id` (2,474 rows — a child-profile uuid) and `class_code` (1,462 rows — a classroom join code, i.e. a class identifier). Strip these two keys at 30 d; retain the rest to 365 d. |

### 1.6 Cross-cutting re-identification risks (must be stated in the policy)

1. **Small classes.** Production has sessions with 1, 1, 2 and 29 students. A session with 1–2 students plus a date is a named child even after `name` is destroyed. Rule: any per-session or per-class aggregate that survives the boundary must be **suppressed when `count(distinct session_students.id) < 5`** (k = 5, matching the existing `dashboard_transparency_*` policy).
2. **Unique timestamps.** Second-precision `joined_at` / `started_at` are unique per child/class. Rule: surviving aggregates use `date_trunc('day', …)` only.
3. **Residual identifiers.** `teacher_id`, `school_id`, `tenant_id`, `sessions.id`, `code + created_at`, `device_id`, `class_child_id`, `avatar_seed` are all *pseudonymous*, not anonymous: each is a stable key that a data controller can resolve. They are therefore **destroyed with the row**, never "kept because they aren't names".
4. **Materialised views** (`v_teacher_session_stats`, `v_school_overview`, `v_activity_performance`, `v_engagement_metrics`, `v_growth_metrics`) are refreshed nightly from base tables; after the purge they naturally shrink. They keep `teacher_id`/`school_id` at aggregate level — acceptable for the controller's own dashboards, not for export.

## 2. Contract change for `sessions.code` (required)

Current implicit contract: "after 30 days the join code is nulled and the session row is kept forever". This is unimplementable (NOT NULL) and undesirable (row keeps teacher_id, class_name, exact timestamps, and every child row under it).

**Proposed contract: delete the session row and all cascading children at `ended_at + 30 days`, after archiving an aggregate summary.**

Why delete rather than hash the code:
- Hashing `code` (4 digits, ~10k values) is trivially reversible; it protects nothing.
- Nulling only `code` leaves `name`, `joined_at`, `class_name`, `teacher_id` — the actually-sensitive columns — untouched.
- Every FK to `sessions` is `ON DELETE CASCADE` except `client_errors.session_id` (`SET NULL`) — verified. Delete is safe structurally.
- The teacher-facing value ("my past sessions") is served by `v_teacher_session_stats` / `class_summary` aggregates, which the archive step preserves in `session_archive` (below) at day granularity with k-suppression.

If product insists on keeping a row per session, the fallback is `ALTER TABLE sessions ALTER COLUMN code DROP NOT NULL` plus scrubbing `class_name/metadata/teacher_id`-preserving — **not recommended**, and the child rows would still have to be deleted.

## 3. Migration — forward

File: `supabase/migrations/20260914000001_retention_purge_v2.sql`

```sql
-- WP2A.1 / DIA-008 — retention purge v2
-- Rehearse on staging first. Idempotent. No data recovery is possible after this runs.
begin;

-- 3.1 Archive table: aggregate-only, no child identifiers, day granularity, k>=5 suppression.
create table if not exists public.session_archive (
  archived_at        timestamptz not null default now(),
  session_id         uuid        primary key,      -- kept ONLY as an idempotency key; never joinable after purge
  teacher_id         uuid        not null,         -- controller's own aggregate; not exported
  tenant_id          uuid,
  session_day        date        not null,         -- date_trunc('day', started_at or created_at)
  duration_minutes   int,
  activity_count     int         not null default 0,
  student_count      int         not null,         -- suppressed (null) when < 5
  scores_count       int,
  readiness_completed_count int,
  activities         text[]                        -- activity names only
);
alter table public.session_archive enable row level security;
revoke all on public.session_archive from anon, authenticated;
-- teachers read their own archived aggregates; admins read all
drop policy if exists session_archive_select on public.session_archive;
create policy session_archive_select on public.session_archive
  for select to authenticated
  using (teacher_id = (select auth.uid()) or public.is_platform_admin());
grant select on public.session_archive to authenticated;

-- 3.2 Purge log (counts only)
create table if not exists public.retention_purge_log (
  id            bigint generated always as identity primary key,
  ran_at        timestamptz not null default now(),
  cutoff        timestamptz not null,
  sessions_archived int not null,
  sessions_deleted  int not null,
  students_deleted  int not null,
  scores_deleted    int not null,
  activities_deleted int not null,
  referrers_scrubbed int not null,
  meta_keys_scrubbed int not null,
  ok            boolean not null,
  detail        text
);
revoke all on public.retention_purge_log from anon, authenticated;

-- 3.3 The purge function: archive -> verify -> delete, single transaction, aborts on any mismatch.
create or replace function app_private.run_retention_purge(in_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cutoff      timestamptz := now() - make_interval(days => greatest(in_days, 7)); -- floor: never < 7 days
  v_candidates  int;
  v_archived    int;
  v_students    int;
  v_scores      int;
  v_activities  int;
  v_deleted     int;
  v_referrers   int;
  v_meta        int;
begin
  -- Never run under a request JWT: cron / postgres only.
  if current_setting('request.jwt.claims', true) is not null then
    raise exception 'run_retention_purge is not callable over the API' using errcode = '42501';
  end if;

  -- Serialise runs.
  if not pg_try_advisory_xact_lock(hashtext('app_private.run_retention_purge')) then
    raise exception 'retention purge already running' using errcode = '55P03';
  end if;

  create temp table _purge_sessions on commit drop as
    select s.id, s.teacher_id, s.tenant_id,
           date_trunc('day', coalesce(s.started_at, s.created_at))::date as session_day,
           greatest(0, extract(epoch from (s.ended_at - coalesce(s.started_at, s.created_at)))/60)::int as duration_minutes
      from public.sessions s
     where s.ended_at is not null
       and s.ended_at < v_cutoff
       and (s.status = 'ended' or s.class_state = 'ended');
  select count(*) into v_candidates from _purge_sessions;

  -- ARCHIVE (aggregate only; k=5 suppression on student_count)
  insert into public.session_archive as a
        (session_id, teacher_id, tenant_id, session_day, duration_minutes, activity_count,
         student_count, scores_count, readiness_completed_count, activities)
  select p.id, p.teacher_id, p.tenant_id, p.session_day, p.duration_minutes,
         (select count(*) from public.session_activities sa where sa.session_id = p.id),
         case when (select count(*) from public.session_students ss where ss.session_id = p.id) >= 5
              then (select count(*) from public.session_students ss where ss.session_id = p.id) end,
         (select count(*) from public.round_scores rs where rs.session_id = p.id),
         (select count(*) from public.session_students ss where ss.session_id = p.id and ss.readiness_state = 'completed'),
         (select array_agg(distinct sa.activity) from public.session_activities sa where sa.session_id = p.id)
    from _purge_sessions p
  on conflict (session_id) do nothing;

  -- VERIFY: every candidate must now have an archive row, else abort the whole transaction.
  select count(*) into v_archived
    from _purge_sessions p join public.session_archive a on a.session_id = p.id;
  if v_archived <> v_candidates then
    raise exception 'archive verify failed: % candidates, % archived', v_candidates, v_archived;
  end if;

  -- Count children before delete (for the log) …
  select count(*) into v_students   from public.session_students   where session_id in (select id from _purge_sessions);
  select count(*) into v_scores     from public.round_scores       where session_id in (select id from _purge_sessions);
  select count(*) into v_activities from public.session_activities where session_id in (select id from _purge_sessions);

  -- DELETE (cascades: session_students, round_scores, session_activities, class_session_tokens,
  -- student_activity_assignments, classroom_default_activities, session_network_fingerprints;
  -- client_errors.session_id -> set null).
  delete from public.sessions where id in (select id from _purge_sessions);
  get diagnostics v_deleted = row_count;
  if v_deleted <> v_candidates then
    raise exception 'delete verify failed: % candidates, % deleted', v_candidates, v_deleted;
  end if;

  -- analytics_events: strip child/class identifiers older than the same boundary.
  update public.analytics_events
     set referrer = null
   where occurred_at < v_cutoff and referrer is not null;
  get diagnostics v_referrers = row_count;

  update public.analytics_events
     set meta = meta - 'profile_id' - 'class_code'
   where occurred_at < v_cutoff and (meta ? 'profile_id' or meta ? 'class_code');
  get diagnostics v_meta = row_count;

  -- Pre-existing job statements, unchanged in intent:
  delete from public.teacher_insights  where expires_at < now();
  delete from public.platform_insights where expires_at < now();
  delete from public.client_errors     where reported_at < now() - interval '90 days';

  insert into public.retention_purge_log
    (cutoff, sessions_archived, sessions_deleted, students_deleted, scores_deleted,
     activities_deleted, referrers_scrubbed, meta_keys_scrubbed, ok, detail)
  values (v_cutoff, v_archived, v_deleted, v_students, v_scores, v_activities, v_referrers, v_meta, true, null);

  return jsonb_build_object('cutoff', v_cutoff, 'sessions_deleted', v_deleted,
                            'students_deleted', v_students, 'scores_deleted', v_scores,
                            'activities_deleted', v_activities, 'referrers_scrubbed', v_referrers,
                            'meta_keys_scrubbed', v_meta);
exception when others then
  -- The transaction is rolled back by the caller; record the failure in a separate autonomous-ish way
  -- is not possible in plpgsql, so re-raise: cron records the failure in cron.job_run_details.
  raise;
end $$;

revoke all on function app_private.run_retention_purge(int) from public, anon, authenticated;

-- 3.4 Replace the broken cron command. Same job name so dashboards/alerts keep their reference.
select cron.unschedule('retention-purge');
select cron.schedule('retention-purge', '0 2 * * *', $$select app_private.run_retention_purge(30)$$);

commit;
```

Notes on the trial-data purge that was also in the old job (`round_scores` / `session_students` of `tier='free'` teachers 7 days after `trial_expires_at`): it is **dropped from the nightly job**. Every row it targeted belongs to a session that is either ended (covered by the 30-day rule) or live (must not be deleted under a child mid-lesson). If product wants the 7-day trial rule restored, add it as a separate `cron.schedule` so its failure cannot block this one.

## 3c. Fixed `class_end_stale_sessions` replacement

Defects in the current function (verified body): requires `auth.uid()` (42501 from cron), predicate is `class_state in ('lobby','between_activities')` so a session stuck in `in_activity` is never ended, does not clear `session_students.is_connected`, no age cutoff, and only touches the caller's sessions.

```sql
-- Same migration file, after 3.3
create or replace function app_private.end_stale_sessions(in_max_age interval default interval '4 hours')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_sessions int; v_students int;
begin
  if current_setting('request.jwt.claims', true) is not null then
    raise exception 'not callable over the API' using errcode = '42501';
  end if;

  create temp table _stale on commit drop as
    select s.id
      from public.sessions s
     where s.status <> 'ended'
       and s.class_state <> 'ended'
       and greatest(coalesce(s.started_at, s.created_at), s.updated_at) < now() - in_max_age;

  -- Close open activities first so the deferred constraint trigger
  -- (_check_active_has_activity) is satisfied: class_state='ended' requires current_activity_id IS NULL.
  update public.session_activities sa
     set state = 'ended', ended_at = coalesce(sa.ended_at, now())
   where sa.session_id in (select id from _stale)
     and sa.state in ('starting','playing','paused','results');

  update public.sessions s
     set class_state = 'ended', status = 'ended',
         ended_at = coalesce(s.ended_at, now()),
         current_activity_id = null,
         activity_version = s.activity_version + 1,
         updated_at = now()
   where s.id in (select id from _stale);
  get diagnostics v_sessions = row_count;

  -- Disconnect every child on those sessions (is_active is GENERATED from is_connected).
  update public.session_students ss
     set is_connected = false, left_at = coalesce(ss.left_at, now()), updated_at = now()
   where ss.session_id in (select id from _stale) and ss.is_connected;
  get diagnostics v_students = row_count;

  return jsonb_build_object('ended_sessions', v_sessions, 'disconnected_students', v_students);
end $$;
revoke all on function app_private.end_stale_sessions(interval) from public, anon, authenticated;

select cron.schedule('end-stale-sessions-hourly', '17 * * * *',
  $$select app_private.end_stale_sessions(interval '4 hours')$$);
```

The teacher-callable `public.class_end_stale_sessions()` is left in place for the UI (it is owner-scoped by design); it is not used by cron.

## 3d. One-off sweep: `is_connected = true` on ended sessions

```sql
-- One-off, same migration or run manually on staging then prod. Dry-run count is in §5.
update public.session_students ss
   set is_connected = false, left_at = coalesce(ss.left_at, s.ended_at, now()), updated_at = now()
  from public.sessions s
 where s.id = ss.session_id
   and (s.status = 'ended' or s.class_state = 'ended')
   and ss.is_connected;
```

## 4. Rollback (function definitions only — **data recovery is prohibited**)

```sql
begin;
select cron.unschedule('end-stale-sessions-hourly');
select cron.unschedule('retention-purge');
drop function if exists app_private.end_stale_sessions(interval);
drop function if exists app_private.run_retention_purge(int);
-- Tables are left in place (they hold only aggregates / counts). Drop only if explicitly decided:
-- drop table if exists public.retention_purge_log;
-- drop table if exists public.session_archive;
-- Restore the previous (broken) job verbatim ONLY if you need the other statements back;
-- prefer re-scheduling just the working statements:
select cron.schedule('retention-purge', '0 2 * * *', $$
  DELETE FROM public.teacher_insights WHERE expires_at < now();
  DELETE FROM public.platform_insights WHERE expires_at < now();
  DELETE FROM public.client_errors WHERE reported_at < now() - interval '90 days';
$$);
commit;
```

Deleted session/student/score rows cannot be restored from this rollback, by design. The only recovery path is a PITR / dump restore into a *separate* database for forensic reading — never into production.

## 5. Dry-run counts — executed read-only against production, 2026-09-07

```sql
select
 (select count(*) from sessions)                                                         as sessions_total,
 (select count(*) from sessions where ended_at < now() - interval '30 days')             as sessions_eligible_30d,
 (select count(*) from sessions where ended_at < now() - interval '90 days')             as sessions_eligible_90d,
 (select count(*) from session_students ss join sessions s on s.id = ss.session_id
   where s.ended_at < now() - interval '30 days')                                        as students_eligible_30d,
 (select count(*) from session_students ss join sessions s on s.id = ss.session_id
   where (s.status='ended' or s.class_state='ended') and ss.is_connected)                as students_connected_on_ended,
 (select count(*) from sessions where status<>'ended' and class_state<>'ended'
   and coalesce(started_at, created_at) < now() - interval '4 hours')                    as stale_open_sessions_4h,
 (select count(*) from analytics_events where occurred_at < now() - interval '30 days'
   and referrer is not null)                                                             as referrers_to_scrub_30d,
 (select count(*) from analytics_events where occurred_at < now() - interval '30 days'
   and (meta ? 'profile_id' or meta ? 'class_code'))                                     as meta_keys_to_scrub_30d,
 (select count(*) from analytics_events where occurred_at < now() - interval '365 days') as ae_gt365d,
 (select count(*) from learning_attempts where occurred_at < now() - interval '365 days') as la_gt365d;
```

| metric | value |
|---|---|
| sessions_total | 7 (all ended; 0 open) |
| sessions eligible (ended > 30 d) | **2** |
| sessions eligible (ended > 90 d) | 1 |
| session_students on eligible sessions (30 d) | **3** |
| session_students `is_connected=true` on ended sessions (sweep 3d) | **2** |
| open sessions older than 4 h (stale-end 3c) | 0 |
| analytics_events referrer non-null (all rows; the > 30 d subset was not separately counted, upper bound) | 687,347 |
| analytics_events with `meta.profile_id` or `meta.class_code` (all rows; upper bound) | 2,474 + 1,462 |
| analytics_events / learning_attempts older than 365 d | 0 / 0 (oldest rows are 2026-05-07) |
| teacher-session distribution | 1,1,2,1,1,1 per teacher; 1,2,29,1 students per session |

Staging rehearsal must re-run this block and the function with `in_days => 30` inside `begin; … rollback;` first, then for real.

## 6. Dump-retention-window recommendation

- Supabase PITR / daily backups: keep the platform default (7 days on Pro). Backups are a recovery mechanism, not a retention exception; the 30-day purge therefore becomes effective at **day 37** in the worst case. State that in the privacy notice.
- Any manual `pg_dump` taken for migration rehearsal (staging) must be **deleted within 7 days** and must never be restored into an environment reachable by the anon key. Dumps of `session_students` / `class_children` count as child personal data.
- Do not create a longer "cold archive" of raw tables. `session_archive` (aggregates) is the only long-lived artefact and is itself subject to k = 5 suppression.

## 7. Staging test plan (minimum)

1. Seed: 3 ended sessions (1 with 2 students, 1 with 6 students, 1 ended 10 days ago), 1 stuck `in_activity` session updated 5 h ago, 1 live session.
2. `select app_private.run_retention_purge(30)` inside a transaction → assert 2 archive rows (one with `student_count = null`), 2 sessions gone, 10-day session intact, live session intact, `retention_purge_log.ok = true`.
3. Force a failure (e.g. `alter table session_archive add constraint tmp check (activity_count < 0)`) → assert the function raises and **no** session row was deleted.
4. `select app_private.end_stale_sessions()` → the stuck session is `ended`, its students `is_connected=false`, the live session untouched, no `_check_active_has_activity` violation.
5. Run the cron job manually via `select cron.schedule(...)` with a one-minute schedule, observe `cron.job_run_details.status = 'succeeded'`, then restore the nightly schedule.
