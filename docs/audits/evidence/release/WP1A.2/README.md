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
