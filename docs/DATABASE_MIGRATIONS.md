# Database Migrations & Release Safety

Supabase / PostgreSQL. Production project ref: **`fmrsfjxwswzhvicylaph`**.

## Where migrations live
- Root app: `supabase/migrations/NNNN_*.sql` (e.g. `0027_join_pilot_hardening.sql`).
- Platform app: `platform/supabase/migrations/YYYYMMDD_*.sql`.

> **Known issue to tidy:** the root set has a numbering collision — two `0024_*` files
> (`0024_billing_health_cron.sql`, `0024_subscription_event_ordering.sql`). Renumber one
> of them in a `chore/` PR so ordering is unambiguous. Also commit any migrations that are
> currently untracked before relying on them.

## Naming
- Root: zero-padded sequence + short description, e.g. `0028_add_session_idempotency.sql`.
- Platform: `YYYYMMDD_short_description.sql`.
- One logical change per migration. Prefer **additive and reversible** changes.

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
