# WP1A.3 (DIA-004) — production migration-history reconciliation runbook

**For:** Justin, by hand. **Nothing in this file has been run against production.**
**Rehearsed on:** staging `dcivdrhxeaiulbbhsgfv`, 2026-09-08, plus a throwaway local Postgres 16.
**Production project:** `fmrsfjxwswzhvicylaph`.

## What this does and does not do

It changes **only** `supabase_migrations.schema_migrations` — the bookkeeping table.
It **inserts 19 rows and deletes none**. No table, column, policy, function, grant, trigger or
cron job in production is touched. Production's existing 39 history rows are preserved verbatim.

After it, production's history has 58 rows, every repo migration file matches a history row, and
`supabase db push` reports exactly two pending migrations, both genuinely unapplied Gate-2 work.

## Before you start

1. The repo must be on the branch that carries WP1A.3's file renames, the 14 placeholder files
   and `supabase/migrations/20260908000000_baseline_prod_schema.sql`. If those files are not
   present, **stop** — running step 3 without them leaves production's history pointing at files
   that do not exist, which is worse than the current state.
2. Have `docs/audits/evidence/release/WP1A.3/prod_migration_history.json` to hand. It is the
   snapshot of the 39 rows as they were on 2026-09-08 and is the rollback reference.
3. Do **not** run `supabase db push` against production at any point in this runbook, and not
   until Gate 2 packages are approved separately.

## Step 0 — snapshot the current history

Supabase Dashboard → project `fmrsfjxwswzhvicylaph` → SQL Editor.

```sql
create table if not exists supabase_migrations.wp1a3_history_backup_20260908 as
  select * from supabase_migrations.schema_migrations;

select count(*) as backup_rows from supabase_migrations.wp1a3_history_backup_20260908;
```

**Check:** `backup_rows = 39`. If it is not 39, stop and re-baseline — something changed the
history since 2026-09-08 and the plan below must be re-derived.

## Step 1 — confirm the history is what the plan was built against

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

**Check:** the 39 rows match `prod_migration_history.json` exactly, including the two rows both
named `metric_definition_fixes` (`20260626074253` and `20260702200020`) — that duplicate name is
genuine and must be left alone. If any row differs, stop.

## Step 2 — re-confirm the object-equivalence evidence

This is the step the execution brief requires before anything is marked applied. It proves the
17 repo-only migrations really are in production.

```sql
with probe(mig, kind, obj) as (values
 ('0011_rls_perf_and_indexes','index','sessions_current_activity_id_idx'),
 ('0012_learning_attempts_policy_consolidation','policy','learning_attempts:attempts_insert'),
 ('0013_tenant_isolation','function','_ensure_tenant'),
 ('0014_parent_trial_7_days','function','start_parent_trial'),
 ('0015_email_dispatch_cron','cron','email-dispatch-15m'),
 ('0016_email_cron_key_rpc','function','get_email_cron_key'),
 ('0017_signup_role_hardening','function','handle_new_parent_user'),
 ('0018_platform_admins','function','is_platform_admin'),
 ('0018_platform_admins','table','platform_admins'),
 ('0019_school_admin_role','function','is_school_admin'),
 ('0019_school_admin_role','function','get_account_roles'),
 ('0020_security_audit_log','function','log_security_event'),
 ('0021_consent_and_deletion_flow','function','export_family_data'),
 ('0021_consent_and_deletion_flow','function','process_account_deletion_requests'),
 ('20260613200346_session_read_hardening','function','class_get_session'),
 ('20260613200347_learning_attempts_write_hardening','policy','learning_attempts:attempts_update'),
 ('20260613200348_subscription_event_ordering','column','parent_subscriptions:last_event_at'),
 ('20260615113208_parent_subscriptions_last_event_at','column','parent_subscriptions:last_event_at'),
 ('20260615113209_billing_activation_email_flag','column','parent_subscriptions:activated_sent_at'),
 ('20260615113210_billing_health_cron','cron','billing-health-15m')
)
select count(*) as probes, count(*) filter (where present = 1) as present_count,
       coalesce(string_agg(mig||' '||kind||' '||obj, ' | ') filter (where present <> 1),
                'NONE MISSING') as missing
from (
  select mig, kind, obj,
   case kind
    when 'index'    then (select count(*) from pg_indexes where schemaname='public' and indexname=obj)
    when 'policy'   then (select count(*) from pg_policies where schemaname='public'
                            and tablename=split_part(obj,':',1) and policyname=split_part(obj,':',2))
    when 'function' then (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                            where n.nspname in ('public','app_private') and p.proname=obj)
    when 'table'    then (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
                            where n.nspname='public' and c.relname=obj and c.relkind='r')
    when 'cron'     then (select count(*) from cron.job where jobname=obj)
    when 'column'   then (select count(*) from information_schema.columns where table_schema='public'
                            and table_name=split_part(obj,':',1) and column_name=split_part(obj,':',2))
   end as present
  from probe) q;
```

**Check:** `probes = 20`, `present_count = 20`, `missing = NONE MISSING`.
Run on 2026-09-08 this returned exactly that. **If any marker is missing, stop and do not run
step 3** — a missing marker means that migration was not in fact applied and marking it applied
would create a false history.

Then confirm the WP0.5.2 revoke really took effect:

```sql
select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('dashboard_engagement_deep','dashboard_executive_summary',
                    'dashboard_mastery_summary','dashboard_ingest_latency')
order by 1;
```

**Check:** four rows, `anon_execute = false` on every one.

## Step 3 — mark the 19 migrations applied

One transaction. Run it whole; do not run parts of it.

```sql
begin;

insert into supabase_migrations.schema_migrations (version, name) values
 ('0011','rls_perf_and_indexes'),
 ('0012','learning_attempts_policy_consolidation'),
 ('0013','tenant_isolation'),
 ('0014','parent_trial_7_days'),
 ('0015','email_dispatch_cron'),
 ('0016','email_cron_key_rpc'),
 ('0017','signup_role_hardening'),
 ('0018','platform_admins'),
 ('0019','school_admin_role'),
 ('0020','security_audit_log'),
 ('0021','consent_and_deletion_flow'),
 ('20260613200346','session_read_hardening'),
 ('20260613200347','learning_attempts_write_hardening'),
 ('20260613200348','subscription_event_ordering'),
 ('20260615113208','parent_subscriptions_last_event_at'),
 ('20260615113209','billing_activation_email_flag'),
 ('20260615113210','billing_health_cron'),
 ('20260907120000','wp0_5_2_revoke_anon_dashboard_execute'),
 ('20260908000000','baseline_prod_schema')
on conflict (version) do nothing;

select count(*) as rows_after from supabase_migrations.schema_migrations;

commit;
```

**Check before you commit:** `rows_after = 58`. If it is anything else, `rollback;` instead of
`commit;` and stop.

The equivalent Supabase CLI form, if you would rather use the CLI than the SQL editor, is
`supabase migration repair --status applied <version>` once per version, against the linked
production project. It writes the same rows. The SQL above is preferred because it is one
transaction and the count check happens before commit.

## Step 4 — verify

```sql
select count(*) as total,
       count(*) filter (where version >= '20260908000000') as at_or_after_baseline
from supabase_migrations.schema_migrations;

select version, name from supabase_migrations.schema_migrations order by version;
```

**Check:** `total = 58`, `at_or_after_baseline = 1` (only the baseline row), and the 39 original
rows are all still present and unchanged.

Then, from the repo on the reconciled branch, with production linked:

```
supabase db push --dry-run
```

**Check:** it completes without error and lists exactly two migrations:

```
 • 20260908130000_wp2b_2_lead_capture.sql
 • 20260914000006_wp2b6_observability_canary.sql
```

Both are Gate-2 work that is genuinely not in production yet. **Do not push them here.** They ship
with their own packages (WP2B.2 and WP2B.6) under their own founder go.

If instead you see `Remote migration versions not found in local migrations directory`, the repo
is not on the reconciled branch. Go back to "Before you start". **Never** run the CLI's suggested
`supabase migration repair --status reverted <32 versions>` — those 32 migrations really are
applied in production and marking them reverted is exactly the false history this package exists
to avoid.

Finally, confirm nothing in the schema moved:

```sql
select (select count(*) from information_schema.columns
         where table_schema in ('public','app_private')) as columns,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname in ('public','app_private')) as functions,
       (select count(*) from pg_policies where schemaname in ('public','app_private')) as policies,
       (select count(*) from cron.job) as cron_jobs;
```

**Check:** `columns = 659`, `functions = 140`, `policies = 99`, `cron_jobs = 9` — identical to
before step 3, because step 3 changes no schema.

## Rollback

Step 3 inserted 19 rows and changed nothing else, so rollback is a delete of those 19 versions.

```sql
begin;

delete from supabase_migrations.schema_migrations
 where version in ('0011','0012','0013','0014','0015','0016','0017','0018','0019','0020','0021',
                   '20260613200346','20260613200347','20260613200348',
                   '20260615113208','20260615113209','20260615113210',
                   '20260907120000','20260908000000');

select count(*) as rows_after_rollback from supabase_migrations.schema_migrations;

commit;
```

**Check before commit:** `rows_after_rollback = 39`, and the result of
`select version, name from supabase_migrations.schema_migrations order by version;`
matches `prod_migration_history.json`. The backup table from step 0 is the belt and braces:

```sql
-- only if the delete above went wrong
begin;
delete from supabase_migrations.schema_migrations;
insert into supabase_migrations.schema_migrations
  select * from supabase_migrations.wp1a3_history_backup_20260908;
select count(*) from supabase_migrations.schema_migrations;  -- expect 39
commit;
```

There is no schema rollback to write, because there is no schema change.

Once step 4 has passed and you are satisfied, the backup table can be dropped:
`drop table supabase_migrations.wp1a3_history_backup_20260908;` — or left in place, it is 39 rows.

## The two odd entries, and where they land

**`metric_definition_fixes` appears twice in production history** — `20260626074253` and
`20260702200020`. Two different migrations were given the same name at different times. Nothing
in this runbook touches either row. Both keep their version and name verbatim, and the repo now
carries a placeholder file for each (`20260626074253_metric_definition_fixes.sql` and
`20260702200020_metric_definition_fixes.sql`), each stating in its header that the other exists.
The CLI matches on version, not name, so the duplicate name is harmless.

**`20260907130000_wp2b_2_lead_capture` is not applied in production.** Its objects are absent
there (`lead_rate_limits`, `form_submissions.founder_notified_at`, `lead_capture_rate_check`), so
it is not marked applied and must not be. It has been renamed to `20260908130000_wp2b_2_lead_capture.sql`
so it sorts **after** the baseline. At its old version it sorted before the baseline, which meant a
fresh `supabase db reset` would have run it first and then collided with the baseline's
`form_submissions` policies. After the rename it is simply the first of the two pending
migrations in step 4, and it ships with WP2B.2.

## Known limitation, written down rather than hidden

The 44 historical migration files (categories A, B and C) still *execute* on a fresh
`supabase db reset`, and several of them are not idempotent against the baseline that runs after
them (bare `CREATE POLICY`, for example). They are kept in place because deleting them would make
production's history rows point at nothing. For a fresh local database, apply
`20260908000000_baseline_prod_schema.sql` on its own — that file alone was proven on 2026-09-08 to
reproduce production's application schema exactly (1356 objects, zero missing, zero extra, two
cosmetic column-ordinal differences). Making the pre-baseline files idempotent, or archiving them
behind a repo-only marker, is a separate piece of work and is logged in
`docs/audits/RELEASE_FINDINGS_LOG.md`.
