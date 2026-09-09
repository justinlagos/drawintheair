# WP1A.2 / WP1A.3 — Production vs Staging schema diff

**Date:** 2026-09-08 · **Prod:** `fmrsfjxwswzhvicylaph` (READ-ONLY, SELECT only) · **Staging:** `dcivdrhxeaiulbbhsgfv`
**Method:** identical inventory query on both databases hashing every object definition (`pg_get_*def`, `information_schema.columns`, `pg_policies`, `aclexplode`, `pg_default_acl`, `pg_publication_tables`, `cron.job`), diffed offline. Scope = application-owned objects: schemas `public` + `app_private`, app-owned triggers on `auth.users`, realtime publication membership, cron jobs, extensions. Supabase-managed schemas (`auth`, `storage`, `realtime`, `vault`, `cron` internals, `net`) are noted but not chased.
Raw inventories: `prod_inventory.tsv`, `staging_inventory_before.tsv`, `staging_inventory_after.tsv`, `diff_before.txt`, `diff_after.txt` (all hashes, no row data).

## Object counts

| Kind (public + app_private) | Prod | Staging BEFORE | Staging AFTER |
|---|---|---|---|
| tables/views/sequences (relkind r,v,S) | 60 | 59 | 60 |
| columns | 659 | 657 | 659 |
| constraints | 204 | 203 | 204 |
| indexes | 149 | 148 | 149 |
| triggers (public/app_private) | 37 | 37 | 37 |
| triggers on `auth.users` (app-owned) | 3 | **0** | 3 |
| functions | 140 | 134 | 140 |
| function ACL entries matching prod | 140 | 28 | 139 (+1 same-semantics ordering) |
| policies | 99 | 99 | 99 |
| views | 8 | 8 | 8 |
| schemas (app-owned: `app_private`) | 1 | 0 | 1 |
| extensions | 7 | 5 | 7 |
| realtime publication tables | 4 | 0 | 4 |
| cron jobs | 9 | 0 (no pg_cron) | 9 |
| rows (all app tables) | (not read) | 0 | synthetic only, see README |

## Differences found BEFORE sync (37 prod-only, 1 staging-only, 121 changed) and what was done

| # | Difference | Action on staging | Migration |
|---|---|---|---|
| 1 | Extensions `pg_cron`, `pg_net` missing | `CREATE EXTENSION` | `staging_sync_01_extensions` |
| 2 | Schema `app_private` + table `app_private.secrets(name pk, value)` missing | created; **one synthetic placeholder row** `email_cron_key = 'staging-synthetic-cron-key-not-production'` (prod value never read) | `staging_sync_02_app_private` |
| 3 | 6 functions missing: `app_private.run_billing_health()`, `app_private.run_email_dispatch()`, `public.ingest_analytics_events(jsonb)`, `public.ingest_learning_attempts(jsonb)`, `public.lios_detect_mastery_episodes_v1()` (0-arg overload), `public.lios_is_technical_item_key(text)` | created from `pg_get_functiondef` | `staging_sync_03_functions` |
| 4 | 8 functions with different bodies: `class_join`, `class_student_heartbeat`, `dashboard_executive_summary`, `dashboard_export_headline`, `dashboard_funnel`, `dashboard_mastery_summary`, `dashboard_mastery_v2`, `handle_new_parent_user` (prod = newer versions from 20260626–20260716 migrations) | `CREATE OR REPLACE` with prod body | `staging_sync_03_functions` |
| 5 | 112 function ACLs: staging granted EXECUTE to `anon` on everything (Supabase default ACL); prod has revoked anon/PUBLIC on internal RPCs (0009/0010/WP0.5.2) and `service_role`-only on `_ensure_tenant`, `get_email_cron_key`, `process_account_deletion_requests`, `start_parent_trial` | `REVOKE ALL … ; GRANT EXECUTE … TO <prod role set>` per function, in prod's grant order | `staging_sync_04_grants` |
| 6 | 5 table ACLs: `join_audit_log` (no anon), `join_rate_limits`, `platform_admins`, `session_network_fingerprints` (service_role only), `security_audit_log` (anon/authenticated read-only) | matching `REVOKE`s | `staging_sync_04_grants` |
| 7 | Publication `supabase_realtime` had no tables (prod: `sessions`, `session_students`, `round_scores`, `session_activities`) | `ALTER PUBLICATION … ADD TABLE` | `staging_sync_05_publication_and_cron` |
| 8 | 9 cron jobs absent | `cron.schedule` ×9 with prod schedules/commands | `staging_sync_05_publication_and_cron` |
| 9 | Triggers `on_auth_user_created`, `on_auth_user_created_parent`, `on_auth_user_created_teacher` on `auth.users` absent (app-owned signup handlers) | created from `pg_get_triggerdef` | `staging_sync_06_auth_signup_triggers` |

## Remaining differences AFTER sync (all justified)

| Object | Prod | Staging | Justification |
|---|---|---|---|
| `public.teachers.updated_at`, `.tenant_id` ordinal position | 16, 17 | 15, 16 | Prod has a dropped column at attnum 15 (`........pg.dropped.15........`). Type/default/nullability identical. Cosmetic; cannot and should not be reproduced. |
| `app_private.run_billing_health()`, `app_private.run_email_dispatch()` body | `https://fmrsfjxwswzhvicylaph.supabase.co/functions/v1/…` | `https://dcivdrhxeaiulbbhsgfv.supabase.co/functions/v1/…` | Deliberate: staging cron must never call production edge functions. Only the project ref differs. |
| cron jobs `dita-daily-digest`, `dita-anomaly-check` command | prod URL | staging URL | Same reason. Other 7 jobs are byte-identical. |
| `public.lios_is_technical_item_key(k text)` proacl | `{=X/postgres,postgres=X/postgres,anon=X,authenticated=X,service_role=X}` | `{postgres=X/postgres,=X/postgres,anon=X,authenticated=X,service_role=X}` | Same grantees, different array order (order reflects grant history, not privilege). |
| `pg_net` extension version | 0.19.5 | 0.20.3 | Supabase-managed extension version on the newer staging image. |
| schema `cron` nspacl | `{supabase_admin=UC/supabase_admin,postgres=U*/supabase_admin,postgres=U/postgres}` | `{supabase_admin=UC/supabase_admin,postgres=U*/supabase_admin}` | Supabase-managed schema; out of scope. |
| `supabase_realtime_messages_publication` partitions `realtime.messages_2026_08_26…09_01` | present | absent | Supabase-managed daily partitions; out of scope. |
| `app_private.secrets` row | 1 real secret | 1 synthetic placeholder | Production secret must never enter staging. Set a real staging key only if the email/billing edge functions are deployed to staging. |
| `pricing_config`, `stripe_price_map` rows | 1, 4 (prod config) | 1 (column defaults), 0 | Prod rows not copied (rule: no production rows). Seed inserts `pricing_config('default')` with column defaults so `start_parent_trial()` behaves. |
| Postgres build | 17.6 aarch64 | 17.6 x86_64 | Platform only. |

## Findings logged, not fixed (out of scope — for `RELEASE_FINDINGS_LOG.md`)

1. Prod cron job `refresh-materialized-views` (jobid 1, active) refreshes five materialized views (`v_teacher_session_stats`, `v_activity_performance`, `v_engagement_metrics`, `v_school_overview`, `v_growth_metrics`) that **do not exist** in production (`pg_class` has no relkind `m`). It fails nightly at 03:00. Reproduced verbatim in staging and baseline.
2. Prod cron job `retention-purge` deletes `round_scores`/`session_students` for `tier='free'` teachers 7 days after trial expiry — a data-destruction job running outside the retention contract (DIA-008 context).
3. Staging (and prod) trigger `on_auth_user_created_parent` inserts a `parent_profiles` row for **every** new auth user, including teachers (observed: 5 users → 5 parent_profiles).
4. Repo migration `20260907130000_wp2b_2_lead_capture.sql` sorts *before* the proposed baseline version `20260908000000` but is **not applied** in production (no `lead_rate_limits`, no `form_submissions.founder_notified_at`, no `lead_capture_rate_check`). See WP1A.3 proposal.
