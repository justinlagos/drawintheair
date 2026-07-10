# Production schema baseline — capture instructions

**Purpose:** The applied-migration history for the `draw-in-the-air` Supabase project
(`fmrsfjxwswzhvicylaph`) is **unreliable** — many live objects (`class_children`, `schools`,
the conductor RPCs, RLS policies) were applied out-of-band and are **not** reproducible from
git's migration files. Before we can stand up a faithful staging environment, we need a true
dump of the live `public` schema to use as a reconciled baseline.

**You run this** (no secrets pass through the assistant). Output lands in this folder, which
is in the mounted repo, so the assistant can read it afterward.

## Option A — Supabase CLI (recommended)

```bash
# one-time, if not already installed / logged in
brew install supabase/tap/supabase
supabase login                       # opens browser

cd /Users/Justin/drawintheair-main
supabase link --project-ref fmrsfjxwswzhvicylaph     # will prompt for the DB password

# Schema-only dump (DDL incl. tables, RLS policies, functions, triggers) for the public schema
supabase db dump --schema public -f supabase/baseline/prod_public_schema.sql

# (optional but useful) capture roles/grants and extensions too:
supabase db dump --role-only       -f supabase/baseline/prod_roles.sql
```

## Option B — pg_dump (fallback)

Get the exact connection string from the Supabase dashboard →
**Project Settings → Database → Connection string** (URI). Then:

```bash
cd /Users/Justin/drawintheair-main
pg_dump "<CONNECTION_STRING_FROM_DASHBOARD>" \
  --schema-only --no-owner --no-privileges -n public \
  -f supabase/baseline/prod_public_schema.sql
```

## Reconstruction status (2026-06-29)

Because the native dump kept hitting environment blockers (Docker, then IPv6/pooler), the
baseline was reconstructed from the live catalog via read-only queries. Captured so far,
authoritative and replay-ordered:

- `10_tables.sql` — all 48 public tables (generated + identity columns handled correctly).
- `20_constraints_indexes.sql` — all PK/UNIQUE/CHECK + FK constraints, then secondary indexes.

**Still outstanding for a complete baseline:** RLS enable + 100 policies; 37 triggers + their
functions; the remaining functions (126 total, ~210 KB); 8 views.

**Recommended way to finish (now that `supabase link` already succeeded):** start Docker
Desktop once and run `supabase db dump --schema public -f supabase/baseline/prod_public_schema.sql`.
That captures policies, triggers, functions and views perfectly and in dependency order; the
hand-reconstructed `10`/`20` files above serve as a cross-check. Hand-reconstructing 210 KB of
function bodies through the assistant is slow and error-prone, so the native dump is preferred
for the remainder.

**Free-plan note for provisioning staging:** the org is on the free plan, which caps **2
active projects** — you already have `draw-in-the-air` + `promptdrop` active. Creating a $0
staging project will require pausing `promptdrop` (or another active one), or upgrading. Decide
this before we provision.

## If `supabase db dump` fails with a Docker error

`supabase db dump` (CLI v2.75) runs `pg_dump` inside a Docker container, so it needs Docker
Desktop running. Two ways past it:

- **Start Docker Desktop**, wait until it's running, then re-run the same `supabase db dump`
  command above. **OR**
- **Skip Docker — use `pg_dump` directly (Option B):**

```bash
# install a current Postgres client (provides pg_dump 17), if you don't have one
brew install libpq
# (libpq is keg-only; either use the full path below or: brew link --force libpq)

cd /Users/Justin/drawintheair-main
# Connection string: Supabase dashboard → Project Settings → Database →
# Connection string → URI (use "Direct connection", port 5432). It contains the
# DB password — paste it inline locally, do NOT commit it.
/opt/homebrew/opt/libpq/bin/pg_dump "<CONNECTION_STRING_FROM_DASHBOARD>" \
  --schema-only --no-owner --no-privileges -n public \
  -f supabase/baseline/prod_public_schema.sql
```

(If `pg_dump` reports a server/version mismatch, it means the client is older than Postgres
17 — `brew install libpq` fixes it.)

## When done

Tell the assistant the file is in place at
`supabase/baseline/prod_public_schema.sql`. Next steps (assistant): review the dump, reconcile
it into a single baseline migration that reproduces the real live schema, then create the free
staging project and apply the baseline so **staging == production schema** before any new
migration (e.g. the P1 PII-minimisation) is tested.

**Do not commit** any password or connection string. Only the schema `.sql` output belongs
here.
