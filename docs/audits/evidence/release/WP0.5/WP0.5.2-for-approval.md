# WP0.5.2 — Revoke anonymous EXECUTE: FINAL SQL FOR APPROVAL

**Status: NOT APPLIED.** Revised per founder conditions. Nothing runs until written go.

## Pre-conditions you required, now evidenced

**Exact identity arguments and overload count** — each function has **exactly one overload**:
| Full signature | `pg_get_function_identity_arguments` |
|---|---|
| `dashboard_engagement_deep(integer)` | `in_days integer` |
| `dashboard_executive_summary(integer)` | `in_days integer` |
| `dashboard_mastery_summary(integer)` | `in_days integer` |
| `dashboard_ingest_latency(integer)` | `in_days integer` |

**Current ACL for every overload** — identical across all four:
```
postgres=X/postgres | authenticated=X/postgres | service_role=X/postgres | anon=X/postgres
```

**PUBLIC inheritance — accounted for and resolved.** `proacl` is non-null on all four, so none relies on PostgreSQL's default (which *does* grant EXECUTE to PUBLIC). Verified via `aclexplode(...)` with `grantee = 0`: **`public_has_execute = false` for all four.** A `REVOKE … FROM anon` is therefore sufficient today.

`PUBLIC` is nevertheless included in the revoke below — not because it currently holds the privilege, but because a future `DROP`+`CREATE` of any of these functions would reset the ACL to the default and silently re-grant PUBLIC. (`CREATE OR REPLACE` preserves ACLs; `DROP`+`CREATE` does not.) The clause is a no-op today and a guard tomorrow.

## Final SQL — revoke and verification in ONE transaction, committing only if proof passes

```sql
begin;

revoke execute on function public.dashboard_engagement_deep(integer)   from anon, public;
revoke execute on function public.dashboard_executive_summary(integer) from anon, public;
revoke execute on function public.dashboard_mastery_summary(integer)   from anon, public;
revoke execute on function public.dashboard_ingest_latency(integer)    from anon, public;

-- Proof 1: privilege state, inside the transaction
select p.oid::regprocedure::text as fn,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec,
       exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where a.grantee = 0 and a.privilege_type = 'EXECUTE') as public_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('dashboard_engagement_deep','dashboard_executive_summary',
                    'dashboard_mastery_summary','dashboard_ingest_latency');

-- Proof 2: ACTUAL anonymous RPC calls, inside the same transaction.
-- Aborts the transaction (rolling the revoke back) if anon can still execute.
do $$
declare
  fn   text;
  leaked text[] := '{}';
begin
  foreach fn in array array[
    'public.dashboard_engagement_deep(7)',
    'public.dashboard_executive_summary(7)',
    'public.dashboard_mastery_summary(7)',
    'public.dashboard_ingest_latency(7)'
  ] loop
    begin
      set local role anon;
      execute 'select ' || fn;
      leaked := leaked || fn;            -- reached only if anon SUCCEEDED
    exception when insufficient_privilege then
      null;                              -- expected outcome
    end;
    reset role;
  end loop;

  if array_length(leaked, 1) is not null then
    raise exception 'REVOKE VERIFICATION FAILED — anon still executed: %', leaked;
  end if;
end $$;

commit;
```

## Expected results
- Proof 1: four rows, each `anon_exec = false`, `auth_exec = true`, `public_exec = false`.
- Proof 2: completes silently. Any function still anonymously executable raises and **rolls the whole revoke back** — the transaction cannot commit in a half-verified state.

## Post-commit regression checks (outside the transaction)
1. `GET https://drawintheair.com/transparency` → **200**, tiles still populated (its two RPCs are deliberately untouched).
2. Admin insights loads for an authenticated admin — `authenticated` retains EXECUTE.
3. `dashboard_ingest_latency` has zero callers repo-wide; nothing should change.

## Still excluded, with reasons
| Function | Reason |
|---|---|
| `dashboard_transparency_report` | `src/pages/TransparencyPage.tsx:39` — live public page, anon key, verified 200 |
| `dashboard_transparency_signals` | `src/pages/TransparencyPage.tsx:41` — same |
| `dashboard_public_proof` | `config/betterstack.monitors.json:79` — **p1 uptime monitor**, anon key, expects 200. Provisioning status ACCESS BLOCKED |

All three return `jsonb` and reference no name/email columns. They go to WP2A.2 for aggregate-only review and small-cohort suppression; `public_proof` additionally needs its monitor migrated to a purpose-built health endpoint before any revoke.

## Rollback
Fully reversible: `grant execute on function public.<fn>(integer) to anon;` per function.
