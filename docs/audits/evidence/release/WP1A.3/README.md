# WP1A.2 (synthetic staging) + WP1A.3 groundwork (migration reconciliation) — evidence README

**Executed:** 2026-09-08 UTC · **By:** Claude Code session (read-only on prod, write on staging) · **Founder go for prod changes:** none needed — **nothing was applied to production**; no `supabase db push` was run anywhere.

## 1. What was changed in STAGING `dcivdrhxeaiulbbhsgfv`

Six schema migrations (recorded in staging's `supabase_migrations.schema_migrations` by `apply_migration`), generated from production's live catalog definitions — no historical migration SQL was invented:

| Migration name (staging) | Content |
|---|---|
| `staging_sync_01_extensions` | `pg_cron`, `pg_net` |
| `staging_sync_02_app_private` | schema `app_private`, table `secrets(name pk, value)`, one **synthetic** placeholder secret |
| `staging_sync_03_functions` | 6 missing + 8 outdated functions, verbatim `pg_get_functiondef` (edge-function URLs → staging ref) |
| `staging_sync_04_grants` | 110 function EXECUTE ACLs + 5 table ACLs aligned to prod |
| `staging_sync_05_publication_and_cron` | realtime publication tables ×4, cron jobs ×9 |
| `staging_sync_06_auth_signup_triggers` | 3 app-owned triggers on `auth.users` |

Then `seed.sql` (data only, run via `execute_sql`, not recorded as a migration). Full diff, counts and justifications: `diff.md`.

**Result:** staging's application schema matches production on every column, constraint, index, trigger, policy, function, view, grant, publication table and cron job, except the justified list in `diff.md` §"Remaining differences" (dropped-column ordinal, staging URLs, ACL array order, Supabase-managed items).

## 2. Synthetic seed (`seed.sql`) — idempotent, re-run proven (counts unchanged on second run)

No production rows were read or copied. All identities are synthetic (`*@staging.invalid`, "Test Child NN", "Test Kid A/B/C", "Test Primary School A/B"). Password for all five auth users: `StagingPass123!` (bcrypt via `extensions.crypt`).

| Table | Before | After | Notes |
|---|---|---|---|
| auth.users / auth.identities | 0 / 0 | 5 / 5 | 3 teachers (`role=teacher` metadata), 2 parents (`role=parent`) — signup triggers fired as in prod |
| teachers / teacher_profiles | 0 / 0 | 3 / 3 | created by `handle_new_user` / `handle_new_teacher_user`; `initialize_teacher_trial` set 5-day trial, then `sync_teacher_school_tier` promoted all three to `pro` with `school_id` |
| parent_profiles | 0 | 5 | prod trigger creates one for every auth user (finding #3 in diff.md) |
| parent_subscriptions | 0 | 2 | parent01 = `trialing`, **trial expired 6 days ago**; parent02 = `active` monthly (`sub_staging_synthetic_02`) |
| tenants / tenant_members | 0 / 0 | 5 / 5 | via `_ensure_tenant` (what `register_teacher/register_parent` do) |
| schools / school_teachers | 0 / 0 | 2 / 3 | |
| class_children | 0 | 37 | 12 (teacher01) + 25 (teacher02) |
| sessions | 0 | 3 | `STG001` lobby/lobby · `STG002` playing/**in_activity** with `current_activity_id` set (constraint trigger `_check_active_has_activity` satisfied) · `STG003` ended/ended, 10 days old |
| session_activities | 0 | 3 | |
| session_students | 0 | 30 | 20 live in STG002 (roster-linked), 10 completed in STG003 |
| child_profiles | 0 | 3 | |
| analytics_events | 0 | 200 | spread over 31 calendar days, `environment='staging'`, deterministic `event_uid` |
| learning_attempts | 0 | 50 | 30 distinct days; 40 classroom + 10 home (child-linked → `child_activity_summary`=3, `child_learning_state`=3 created by triggers) |
| pricing_config | 0 | 1 | `default` row from column defaults (not prod values) |

## 3. Staging keys / Vercel preview re-pointing (founder action — not done here)

- Staging URL: `https://dcivdrhxeaiulbbhsgfv.supabase.co`. The anon/publishable key is **not** stored in this repo; read it from Supabase Dashboard → Project `dcivdrhxeaiulbbhsgfv` → Settings → API (or the MCP `get_publishable_keys` tool). Put it in Vercel **Preview**-scope env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` or the publishable-key variable the client reads) — never Production scope.
- WP1A.2 acceptance ("a preview deployment writes to staging and leaves production untouched, proven by row counts on both") is **still open**: it needs the Vercel env change plus a preview deploy. Staging baseline row counts to compare against are in §2.
- Edge functions (`email-dispatch`, `billing-health`, `analytics-digest`) are not deployed to staging; the four cron jobs that call them will log `net` failures harmlessly. `lios-pipeline-every-5min` runs against synthetic data.
- Free-tier auto-pause: touch staging at least weekly.

## 4. WP1A.3 — baseline + proposed history reconciliation (proposal only; nothing applied)

Files: `baseline_20260908_prod_schema.sql` (8.1k lines, generated from live prod definitions on 2026-09-08), `prod_migration_history.json` (39 rows, versions+names verbatim), `diff.md`.

**Verification:** the baseline was applied to an *empty* local Postgres 16 with Supabase role/schema stubs (`pgtest/stubs.sql`; `MAINTAIN` privilege and `pg_cron`/`pg_net` stubbed for PG16). It applied without error and the resulting schema hash-matches production on all 659 columns, 204 constraints, 149 indexes, 37 triggers, 99 policies, 140 functions, 8 views (only the `teachers` ordinal offset differs). Object counts: `local_vs_prod.txt`. Equivalence of staging (built the same way) is in `diff_after.txt`.

**Proposed disposition of repo migrations** (for approval at Gate 1A; execute in WP1A.3 proper with `supabase migration repair`, never `db push` until done):

| Category | Files | Proposal | Why |
|---|---|---|---|
| A — version & name match prod history (7) | `0004`…`0010` | keep; already applied | in history |
| B — name matches, version differs (16) | `0025`, `0026`, `0028`, `0029`, `0031`, `20260629000001–7`, `20260701000001`, `20260703000001`, `20260709000001–2`, `20260716000001–2` | **rename file prefix to the prod version** (`git mv`, body untouched), e.g. `0026_class_student_heartbeat.sql` → `20260710111421_0026_class_student_heartbeat.sql` | makes repo agree with what prod recorded; no history edit |
| C — repo-only, proven applied (17) | `0011`…`0024` incl. the three duplicated numbers | **mark applied** (`repair --status applied`) for the 11 unique versions `0011`–`0021`; the 6 duplicate-numbered files (`0022`×2, `0023`×2, `0024`×2) cannot share a version — rename each to a unique timestamp taken from its git commit date (rename only), then mark applied | object-equivalence proof on file (reconciliation-analysis.md, re-confirmed today: every marker object present in the baseline) |
| D — prod-only history rows (16) | none | **add placeholder files** `<version>_<name>.sql` containing only a comment (“applied to production <date>; original SQL not recoverable; state captured in baseline 20260908000000”). Do **not** fabricate bodies | CLI refuses to work while remote versions lack local files; placeholders are an honest gap, not a false history |
| Baseline | `20260908000000_baseline_prod_schema.sql` (this file, renamed) | add to repo; **mark applied on prod**, never execute there | verified reconstruction of 2026-09-08 state |
| `20260907120000_wp0_5_2_revoke_anon_dashboard_execute` | applied at object level (ACLs verified in prod) but no history row | mark applied | equivalence verified |
| `20260907130000_wp2b_2_lead_capture` | **not applied** in prod (`lead_rate_limits`, `founder_notified_at`, `lead_capture_rate_check` absent) | rename to sort **after** the baseline (e.g. `20260908130000_…`), leave pending | otherwise a fresh `db reset` runs it before the baseline and the baseline's `form_submissions` policies collide |
| `20260914000006_wp2b6_observability_canary` | not applied in prod | leave pending (already sorts after baseline) | Gate 2 package |

Order after reconciliation on a fresh database: A + renamed B + C + D-placeholders (all no-op or superseded) → baseline → pending Gate-2 migrations. Note the historical files A–C will still *execute* on `db reset`; where a pre-baseline file is not idempotent against the baseline (e.g. bare `CREATE POLICY`), move it to `supabase/migrations/_archive_pre_baseline/` and keep a placeholder — decide per file when running WP1A.3.

## 5. Files

`diff.md`, `seed.sql`, `baseline_20260908_prod_schema.sql`, `prod_migration_history.json`, `README.md` (this), supporting: `prod_inventory.tsv`, `staging_inventory_before.tsv`, `staging_inventory_after.tsv`, `diff_before.txt`, `diff_after.txt`, `local_vs_prod.txt`, `staging_migrations/m01–m06.sql`.

---

# WP1A.3 EXECUTION (2026-09-08, later the same day)

Everything above §4 is the read-only groundwork and stays as written. This section records what
was actually **executed**. Production migration history was **not** touched: nothing in this
section ran against `fmrsfjxwswzhvicylaph` except `SELECT`.

## 6. Correction to §4's counts

§4's table was written before the repo files were re-counted. The classes are:

| Class | §4 said | Actually |
|---|---|---|
| A — version and name already agree | 7 | 7 |
| B — repo file renamed to production's version | 16 | **18** (§4's list already enumerated 18; the `20260716000001/2` pair was counted under D as well) |
| C — repo-only, proven applied | 17 files | 17 files, **19 versions marked** (11 unique `0011`–`0021`, 6 renamed duplicates, plus `20260907120000` and the baseline) |
| D — production-only, placeholder file added | 16 | **14** (the two `20260716*` rows have real repo files and belong to B) |

7 + 18 + 14 = 39, which is production's history exactly.

## 7. What changed in the repo

**Category B and the duplicate-numbered C files — renamed only, bodies untouched.** 25 `git mv`s.
The new filename is `<production version>_<production name>.sql`, so the CLI's version match and
name match both succeed. The six files that shared version numbers `0022`/`0023`/`0024` could not
keep them (the CLI rejects duplicate versions), so each took a unique timestamp derived from the
git commit that added it, disambiguated by one second where one commit added three files:

| Old file | New version | Source |
|---|---|---|
| `0022_session_read_hardening` | `20260613200346` | commit add date |
| `0023_learning_attempts_write_hardening` | `20260613200347` | same commit, +1s |
| `0024_subscription_event_ordering` | `20260613200348` | same commit, +2s |
| `0022_parent_subscriptions_last_event_at` | `20260615113208` | commit add date |
| `0023_billing_activation_email_flag` | `20260615113209` | same commit, +1s |
| `0024_billing_health_cron` | `20260615113210` | same commit, +2s |

**Category D — 14 placeholder files added.** Each contains a header saying the migration was
applied to production on a given date, that the original SQL is not recoverable, that the end state
is captured in the baseline, and a bare `SELECT 1;`. **No migration body was invented.**

**Baseline added** as `supabase/migrations/20260908000000_baseline_prod_schema.sql`.

**`20260907130000_wp2b_2_lead_capture.sql` renamed to `20260908130000_…`** so it sorts after the
baseline. It is not applied in production and is not marked applied.

**Two code comments updated** to name the new versions (`src/lib/analytics.ts`,
`supabase/functions/lead-capture/index.ts`). Historical audit documents were left as they are —
they record what was true when written.

Result: 60 migration files, no duplicate versions, every production history version has exactly
one local file whose name matches production's recorded name.

## 8. Object equivalence, re-proven (not assumed)

### 8a. Production is unchanged

The full application-schema inventory (1614 objects: columns, tables, views, constraints, indexes,
triggers, functions, function ACLs, policies, table ACLs, column ACLs, types, sequences,
extensions, schemas, default ACLs, publications) was re-hashed on production today:

```
inv_md5 = a18ed81f99b4dfd3ecaf5106b6380e4c   rows = 1614
```

That is byte-identical to `prod_inventory.tsv` captured earlier the same day. Production's schema
did not move, and nothing this package did touched it.

### 8b. A database built from the repo reproduces production — the acceptance test

A throwaway Postgres 16 was created empty, given the Supabase role and schema stubs, and then had
`supabase/migrations/20260908000000_baseline_prod_schema.sql` applied verbatim (three extension
lines stubbed and the PG17-only `MAINTAIN` privilege dropped — harness limitations, not schema
changes). Diffed against production's live inventory:

```
objects compared: 1356 vs 1356
prod-only:  0
local-only: 0
changed:    2   -> public.teachers.tenant_id, public.teachers.updated_at
```

Function ACLs compared separately: 140 vs 140, none missing either way, 10 changed.

Full output: `local_vs_prod_after.txt`, `local_from_baseline_inventory.tsv`.

**Every remaining difference, with justification:**

| Difference | Why it is acceptable |
|---|---|
| `public.teachers.tenant_id` and `.updated_at` ordinal position (prod 16/17, rebuilt 15/16) | Production has a dropped column at attnum 15 (`........pg.dropped.15........`). Type, default and nullability are identical. A dropped column cannot be reproduced by a `CREATE TABLE`, and reproducing it would mean adding a column purely to drop it. Cosmetic; no client can observe it. |
| 10 functions whose `proacl` array is ordered `{postgres=X/postgres,=X/postgres,…}` instead of `{=X/postgres,postgres=X/postgres,…}` (`_check_active_has_activity`, `analytics_events_promote_meta`, `compute_billing_preview`, `dashboard_public_proof`, `landing_public_proof`, `learning_attempts_promote_meta`, `lios_is_technical_item_key`, `pricing_amount_cents`, `set_updated_at`, `touch_class_children_updated_at`) | Same grantees, same privileges. Verified with `has_function_privilege` for `anon`, `authenticated`, `service_role` and `PUBLIC`: identical on all four for all ten. ACL array order reflects the order grants were issued, not the privileges held. |

Two production **view comments** were found missing from the baseline during this check and were
added to it verbatim from `obj_description` (`public.analytics_events_real`,
`public.dashboard_trust_composition`). That is the only content change made to the baseline file.

### 8c. Staging vs production — staging is no longer a clean control

Staging was re-inventoried after the marking and diffed against production
(`staging_vs_prod_after_raw.txt`, `staging_inventory_20260908_after_marking.tsv`):
15 production-only, 100 staging-only, 48 changed.

**None of that is WP1A.3's doing, and none of it indicates a repo-vs-production gap.** Marking
migrations applied writes to `supabase_migrations.schema_migrations` only; it cannot change a
schema. The drift is four other packages rehearsing on the shared staging project today, which
their own migration rows record:

| Staging history row | Time | Explains |
|---|---|---|
| `20260908123209_wp2a3_session_scoped_claims_expand` | 12:32 | `student_row_id`, `student_session_id`, `student_update_guard`, trigger `trg_student_update_guard`, 6 new student policies on `sessions`/`session_students`/`session_activities`/`round_scores`, changed `class_get_*`, `assert_student_scope` |
| `20260908130322` + `…130537_wp2a2_dashboard_rpc_lockdown[_reapply]` | 13:03–13:05 | 33 `_dashboard_*_impl` functions, `_dashboard_guard`, rewritten public `dashboard_*` wrappers, new table `dashboard_public_cache`, and the four dashboard RPCs dropped in staging (`dashboard_classrooms`, `dashboard_gesture_quality`, `dashboard_ingest_latency`, `dashboard_pipeline_status`) |
| `20260908130800` + `…130925_wp2a4_parent_trial_anchor[_reapply]` | 13:08–13:09 | `_parent_trial_eligible`, `_start_parent_trial_if_eligible`, changed `register_parent` |
| `20260908131130` + `…131241_wp2a5_trial_expiry_transition[_reapply]` | 13:11–13:12 | `_parent_profile_start_trial`, trigger `trg_parent_profile_start_trial`, changed `handle_new_parent_user` |

Subtracting those, the residue is the same justified list §"Remaining differences" in `diff.md`
already carries: the `teachers` column ordinals, staging project refs inside
`run_billing_health`/`run_email_dispatch`, the `lios_is_technical_item_key` ACL ordering, the
`pg_net` version, the `cron` schema ACL, and Supabase-managed `realtime.messages_*` daily
partitions (production's 2026-08-26…09-01, staging's 2026-09-07…09-11 — both are just whichever
week each project is in).

Because staging is now shared write surface, the acceptance proof for this package rests on 8b
(a database built from the repo, compared to production) rather than on staging. Logged as a
finding.

## 9. Staging migration history — the state it is now in

`supabase_migrations.schema_migrations` on `dcivdrhxeaiulbbhsgfv` holds **65 rows**:

- **39** — production's history, inserted verbatim, version and name exactly as production records
  them, including both `metric_definition_fixes` rows.
- **19** — the migrations marked applied: `0011`–`0021`, the six renamed duplicates,
  `20260907120000_wp0_5_2_revoke_anon_dashboard_execute` and `20260908000000_baseline_prod_schema`.
  This is the set the production runbook inserts.
- **7** — the concurrent Gate-2 rehearsal rows listed in §8c. They belong to WP2A.2/3/4/5, their
  files live on those branches, and they were deliberately left alone.

**15 rows were removed** from staging: 9 recorded under staging-specific versions for migrations
production recorded under different versions (the repo now carries production's versions), and the
6 `staging_sync_*` rows from WP1A.2 whose DDL is entirely subsumed by the baseline that is now
marked applied. Their schema effects remain in place; only the bookkeeping rows went. The
pre-change table was copied to `supabase_migrations.wp1a3_history_backup_20260908` in the same
transaction.

**Production's history was not touched.** The deletions above are a staging-only correction;
production has no such rows and the runbook deletes nothing.

## 10. The push hazard, before and after

`supabase db push --dry-run` cannot reach staging or production from this session — there is no
CLI login and no database password here. It was instead run against a throwaway local Postgres 16
built from the baseline, loaded with the exact history rows under test, which exercises the same
CLI code path.

**Before** (repo at `e5e63f9`, history = production's 39 rows) — `cli_dry_run_before.txt`:

```
Remote migration versions not found in local migrations directory.
supabase migration repair --status reverted 20260625154825 20260625154854 … 20260716111014
```

32 versions. The CLI aborts, and the remedy it proposes is to mark 32 genuinely-applied production
migrations as reverted — precisely the false history the execution brief forbids.

**After** (repo on `wp/1a3`, history = the reconciled 58) — `cli_dry_run_after.txt`:

```
Would push these migrations:
 • 20260908130000_wp2b_2_lead_capture.sql
 • 20260914000006_wp2b6_observability_canary.sql
{"upToDate":false,"dryRun":true,"migrations":[...],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

No error, and nothing historical pending. `cli_migration_list_after.txt` shows all 58 rows with
`local` equal to `remote`, and only those two files local-only. Both are Gate-2 forward migrations
that are genuinely not in production and ship with WP2B.2 and WP2B.6 under their own founder go.

**The 33-of-39 hazard is gone.** The count the CLI itself reported was 32 (the seventh of the
original 39, `0004`–`0010`, already matched); the two figures describe the same problem.

## 11. The two odd entries

- **`metric_definition_fixes` twice** — `20260626074253` and `20260702200020`. Both rows are
  genuine and are preserved verbatim. Each now has its own placeholder file whose header states
  that the other exists. The CLI matches on version, so a repeated name is harmless.
- **`20260907130000` (lead capture, WP2B.2) is not applied in production** — its objects are
  absent there. It is not marked applied. It was renamed to `20260908130000_wp2b_2_lead_capture.sql`
  so it sorts after the baseline; at its old version a fresh `db reset` would have run it before
  the baseline and collided on `form_submissions` policies. It is now the first of the two pending
  migrations and ships with its own package.

## 12. Production procedure

`PRODUCTION_RUNBOOK.md` — numbered, with the exact SQL for each step, the check to run after each
step, and the rollback. Steps 0–2 are read-only verification, step 3 is a single transaction that
inserts 19 rows and deletes nothing, step 4 verifies. Rollback is a delete of those same 19
versions, with the step-0 backup table as a second line of defence. **Nothing was applied to
production by this session.**

## 13. Files added by this section

`PRODUCTION_RUNBOOK.md`, `cli_dry_run_before.txt`, `cli_dry_run_after.txt`,
`cli_migration_list_after.txt`, `local_vs_prod_after.txt`, `local_from_baseline_inventory.tsv`,
`staging_inventory_20260908_after_marking.tsv`, `staging_vs_prod_after_raw.txt`.
