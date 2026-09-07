# Gate 0.5 — Containment package (AWAITING WRITTEN GO — nothing applied)

**Prepared:** 2026-08-20 UTC · **Scope rule:** database-only changes with *proven* zero coupling to the deployed client (`6a81fdf`). Coupling proven by call-site grep, not assumed.

---

## WP0.5.1 — End and expire stale sessions (DIA-007 Stage A)

**Why it is safe:** the only session with children attached (`4ce5fd6c`) has been idle 38 days (last student activity 2026-07-13). No classroom has run since 2026-07-14. Ending it cannot interrupt a lesson.

**Effect:** removes 29 children's first names and 4 live join codes from the anonymous-readable surface immediately, because the anon RLS leg is `status <> 'ended'`.

### Dry-run (run first, capture output)
```sql
-- expect 4 rows: 3 empty lobbies + 4ce5fd6c with 29 students
select s.id, s.status, s.created_at::date, s.code is not null as live_code,
       count(ss.id) as students
from public.sessions s
left join public.session_students ss on ss.session_id = s.id
where s.status <> 'ended'
group by s.id, s.status, s.created_at, s.code
order by s.created_at;
```

### Apply (on go)
```sql
begin;
update public.sessions
   set status = 'ended',
       ended_at = coalesce(ended_at, now())
 where status <> 'ended';
-- expect: UPDATE 4
select count(*) as still_open from public.sessions where status <> 'ended';  -- expect 0
commit;
```
**Note:** this deliberately does NOT null `code` — that is the exact operation breaking the purge, and the retention contract (WP2A.1) will decide code invalidation properly.

### Then schedule automatic expiry
```sql
-- verify the function exists and inspect it BEFORE scheduling
select proname, pg_get_functiondef(oid) from pg_proc
where proname = 'class_end_stale_sessions';
-- then, on go:
select cron.schedule('class-end-stale-sessions', '*/30 * * * *',
                     $$select public.class_end_stale_sessions();$$);
```

**Rollback:** reversible. `update public.sessions set status='playing', ended_at=null where id='4ce5fd6c…';` restores the prior state (record the exact prior status per row before applying). `select cron.unschedule('class-end-stale-sessions');` removes the job.

---

## WP0.5.2 — Revoke provably unused anonymous EXECUTE (part of DIA-006)

**Call-site proof against the deployed commit `6a81fdf`** — this is why the protocol demanded proof:

| Function | Callers found | Verdict |
|---|---|---|
| `dashboard_engagement_deep` | `src/pages/admin/insights/rpc.ts:53` only | **REVOKE** — admin surface, authenticated |
| `dashboard_executive_summary` | `src/pages/admin/insights/rpc.ts:41` only (others are comments) | **REVOKE** — admin surface |
| `dashboard_mastery_summary` | `src/pages/admin/insights/rpc.ts:56` only | **REVOKE** — admin surface |
| `dashboard_ingest_latency` | **none anywhere in repo** | **REVOKE** — unused |
| `dashboard_transparency_report` | `src/pages/TransparencyPage.tsx:39` — **public page, anon key** | **DO NOT TOUCH** |
| `dashboard_transparency_signals` | `src/pages/TransparencyPage.tsx:41` — **public page, anon key** | **DO NOT TOUCH** |
| `dashboard_public_proof` | `config/betterstack.monitors.json:79` — **p1 uptime monitor, anon key** | **DO NOT TOUCH** |

`/transparency` verified live in production (HTTP 200) and calls both RPCs with `apikey: getAnonKey()`. Revoking either would break a public trust page. `dashboard_public_proof` has no page caller but a **p1 Better Stack monitor** POSTs to it with the anon key expecting 200 — revoking would fire a false p1 alert. Whether that monitor is actually provisioned is **ACCESS BLOCKED** (no Better Stack access).

**De-escalation recorded:** none of the three excluded functions reference name/email columns and all return `jsonb` aggregates — so they are not obviously leaking learner rows. They still require the WP2A.2 aggregate-only review (including small-cohort suppression) and, for `public_proof`, a monitor migration to a purpose-built health endpoint before any revoke.

### Apply (on go)
```sql
begin;
revoke execute on function public.dashboard_engagement_deep(integer)   from anon;
revoke execute on function public.dashboard_executive_summary(integer) from anon;
revoke execute on function public.dashboard_mastery_summary(integer)   from anon;
revoke execute on function public.dashboard_ingest_latency(integer)    from anon;
commit;
```
*(Exact argument signatures to be confirmed from `pg_get_function_identity_arguments` immediately before running.)*

**Verification after apply**
```sql
select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
  ('dashboard_engagement_deep','dashboard_executive_summary',
   'dashboard_mastery_summary','dashboard_ingest_latency');
-- expect anon_exec=false, auth_exec=true for all four
```
Then confirm `/transparency` still returns 200 and the admin insights page still loads for an authenticated admin.

**Rollback:** fully reversible — `grant execute on function … to anon;` for each.

---

## What this package deliberately does NOT do
- Does not null or alter any `code` value (belongs to WP2A.1's retention contract).
- Does not delete any child data.
- Does not touch the 3 externally-consumed functions.
- Does not add admin guards (that is WP2A.2, needs classification and staging rehearsal).
- Does not deploy any client code.
