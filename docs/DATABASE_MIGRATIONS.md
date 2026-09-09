# Database Migrations & Release Safety

Supabase / PostgreSQL. Production project ref: **`fmrsfjxwswzhvicylaph`**.

## Where migrations live
- Root app: `supabase/migrations/`.
- Platform app: `platform/supabase/migrations/YYYYMMDD_*.sql`.

> **Reconciled 2026-09-08 (WP1A.3 / DIA-004).** The root set now agrees with what production's
> `supabase_migrations.schema_migrations` records. The numbering collision on `0022`/`0023`/`0024`
> is gone (those six files carry timestamp versions taken from the commits that added them), 18
> files were renamed to the version production actually recorded, 14 no-op placeholder files stand
> in for production history rows whose original SQL is not recoverable, and
> `20260908000000_baseline_prod_schema.sql` is the verified reconstruction of the 2026-09-08
> production schema. Full account and the production procedure:
> `docs/audits/evidence/release/WP1A.3/README.md` and `PRODUCTION_RUNBOOK.md`.
>
> **Building a fresh local database:** apply `20260908000000_baseline_prod_schema.sql` on its own.
> The 44 files that predate it still execute on `supabase db reset` and several are not idempotent
> against the baseline (logged as finding 43).
>
> **Do not run `supabase db push` against production** until the runbook's step 3 has been applied
> there. Before that, the CLI reads 32 applied production migrations as unapplied.

## Naming
- Root: `YYYYMMDDHHMMSS_short_description.sql` for anything new. The remaining zero-padded
  `0004`–`0021` names are historical and match production's recorded versions; do not renumber
  them.
- Platform: `YYYYMMDD_short_description.sql`.
- One logical change per migration. Prefer **additive and reversible** changes.
- The filename version and description must match the `version` and `name` the database records,
  because the Supabase CLI matches on the version.

## Process
1. **Write** the migration locally.
2. **Test locally** (Supabase CLI / local stack) — never first-run it on production.
3. **Verify on Preview/Staging** against a non-production project.
4. **Back up production** before applying anything to production.
5. **Get founder approval** for any production migration.
6. **Apply** to production deliberately (not as a side effect of a deploy).
7. **Verify** afterwards (the affected queries, RLS still enforced, no errors in logs).
8. **Forward-fix** by default; only restore from backup if data integrity requires it.

## Hard rules
- No undocumented direct edits to the production schema.
- No destructive migration (drop/rename/`delete`) without explicit founder approval.
- Keep changes backward-compatible with the currently deployed client where practical
  (deployed browsers may still run the previous schema for a short while).
- Never embed a service-role key or privileged credential in client code to run a migration.

## Rollback note
Rolling back a Vercel deployment does **not** roll back the database. Plan database
changes so the previous app version still works, or have a tested restore path.
