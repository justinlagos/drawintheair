# WP2A.3, session-scoped roster access (DIA-007 Stage B), RELEASE BLOCKER

Branch `wp/2a3`. Rehearsed on STAGING `dcivdrhxeaiulbbhsgfv` on 2026-09-08.
Production `fmrsfjxwswzhvicylaph` was read only throughout: SELECT and catalogue
queries only, no DDL, no DML, no grants, nothing applied.

Design of record: `SESSION_SCOPED_ROSTER_ACCESS_DIA-007.md` in this folder.
This file records what was built, what was proven with actual queries, what could
not be proven, and the exact SQL awaiting Justin's written go.

---

## 1. What changed

| File | What |
|---|---|
| `supabase/functions/class-join-token/index.ts` | New Edge Function. Wraps the existing join RPCs with the service role and mints the student token. |
| `supabase/functions/class-join-token/token.ts` | Claim shape, HS256 sign, verify, refresh threshold. Pure, shared with the unit tests. |
| `supabase/migrations/20260914000003_wp2a3_session_scoped_claims_expand.sql` | EXPAND. Additive policies, claim helpers, column guard, scope assertion in the five student RPCs. **Applied to staging.** |
| `supabase/migrations/rollbacks/20260914000003_..._expand_rollback.sql` | Reverses expand. No data change. |
| `supabase/migrations/20260921000001_wp2a3_session_scoped_claims_contract.sql` | CONTRACT. Drops the broad anonymous policies and grants. **NOT APPLIED anywhere.** |
| `supabase/migrations/rollbacks/20260921000001_..._contract_rollback.sql` | Restores the broad policies and grants verbatim. |
| `src/lib/studentToken.ts` | New. Decode, expiry, refresh threshold, scope match. |
| `src/lib/supabase.ts` | Student token store; `authHeaders()` prefers it when there is no user session; **`phx_join` now carries `access_token`**; token pushed to joined topics on refresh. |
| `src/features/classmode/classJoin.ts` | New. Lookup, join, token join and refresh through the Edge Function. |
| `src/pages/classmode/StudentClassClient.tsx` | Joins through the Edge Function, stores the token, refreshes it in the 5 s poll, clears it on kick and end, and refuses to auto-rejoin without a matching token. |
| `tests/studentToken.test.ts`, `tests/classJoinToken.test.ts` | 55 new unit tests. |

### The audit claim, verified in the code and then on the wire

The audit said the deployed client sends no token on realtime. Confirmed twice.

1. In the code at HEAD, `sendPhxJoin()` in `src/lib/supabase.ts` built a `phx_join`
   payload containing only `config`, and the socket URL carried only
   `apikey=<anon key>`. There was no `access_token` anywhere in the realtime path.
2. On staging, two live websockets subscribed to the same row change. The one that
   sent `access_token` received the event; the one that did not receive nothing.
   Full transcript in §4.3.

So before this package, every realtime subscriber, teacher and child alike, was
evaluated by Postgres as bare `anon` with no claims. That is why the classroom
policies had to be `status <> 'ended'`, and it is why the contract migration would
have killed every student screen if the client had not shipped first.

---

## 2. Live exposure right now (production, read-only, 2026-09-08)

Counted with the production **anon key over HTTPS**, which is exactly what an
outsider has:

```
GET /rest/v1/<table>?select=*   apikey: <anon>   Prefer: count=exact
sessions             */0
session_students     */0
session_activities   0-0/24        <-- world readable today
round_scores         */0
class_children       */0
```

Row counts behind the policies:

| Measure | Production |
|---|---|
| sessions total | 7 |
| sessions with `status <> 'ended'` (anon readable) | 0 |
| child roster rows in non-ended sessions (anon readable) | 0 |
| session_activities rows (policy is `using (true)`, always readable) | **24** |
| round_scores in non-ended sessions | 0 |
| roster rows total | 33 |
| class_children total | 34 |

The zeroes are the effect of WP0.5.1, which ended the stale sessions. They are not
a fix. `sessions`, `session_students` and `round_scores` become world readable again
the moment a teacher presses Start in September. `session_activities` is world
readable today, unconditionally, and is the one live leak this package closes.

Production object state matches staging exactly for everything the migrations touch:
the same 10 policies with the same names and commands, the same four join RPCs
executable by `anon`, and none of the four new WP2A.3 functions present yet. The
migrations will therefore apply to production as rehearsed.

---

## 3. Design decisions worth restating

- **The JWT secret never enters Postgres.** Signing happens only in the Edge Function
  runtime. A database holding its own signing secret can be made to forge a
  `service_role` token by any one over-privileged SECURITY DEFINER function, and this
  database has more than a hundred of them.
- **`role` stays `anon`.** No new database role, no `GRANT ... TO authenticator`, every
  existing anon grant and RPC keeps working. Authorisation is carried by the custom
  claims.
- **No `sub` claim.** `auth.uid()` stays NULL under a student token, so the teacher and
  admin branches of every policy are unreachable from a child device.
- **`kind: "student"` gates both claim helpers.** This is not decoration. A Supabase auth
  token already carries a top-level `session_id` claim of its own (the GoTrue auth
  session id). Without the `kind` gate a signed-in teacher's token would be read as a
  classroom capability for a random uuid. Proved false in §4.4, and covered by a unit
  test.
- **`is_admin_user` keeps its anon EXECUTE grant.** The teacher and admin policy branches
  call it and realtime evaluates those branches as the subscriber's role. Revoking it
  is what killed realtime in July. The new student policies deliberately call nothing
  but the two claim helpers, which are granted to `anon` and `authenticated`.
- **RLS cannot restrict columns**, so a `before update` trigger enforces that a student
  token may only move presence and readiness. Without it a token holder could rename
  itself, move to another session, or clear its own kick.

---

## 4. Staging rehearsal, with the actual results

Staging data: 3 sessions (`STG001` lobby, `STG002` playing, `STG003` ended),
20 roster rows, 3 teachers. The expand migration is applied and left applied
(staging migration version `20260908123209`). The contract migration was rehearsed
**inside transactions that were rolled back**, so staging is in the expand state
exactly as a reviewer would expect. Verified after the fact:

```
new_policies                6      (all six additive policies present)
old_policies_still_present  7      (nothing removed)
guard_trigger               1
helper_fns                  4
```

### 4.1 Expand is genuinely additive

Under expand only, as `anon` with a student claim for `STG002`:

```
A1 student_session_id() resolves                       55555555-5555-4555-8555-000000000002
A2 student_row_id() resolves                           57575757-5757-4757-8757-000000000205
A3 sessions rows visible (broad policy still on)        2
A4 session_students rows visible                       20
A5 rpc class_get_session(own)                          STG002
A6 rpc class_get_self(own)                             Test Child 05
```

Nothing narrowed, nothing broke. That is the point of the expand half.

### 4.2 (a) and (b): with contract applied, in a rolled-back transaction

**Plain anon caller, no token**. This is the outsider with the public key:

```
B1  sessions rows readable                 0
B2  session_students rows readable         0
B3  session_activities readable            0
B4  round_scores readable                  0
B5  class_children readable                0
B6  rpc class_get_session                  ERR 42501
B7  rpc class_get_self                     ERR 42501
B8  rpc session_lookup_by_code             ERR 42501
B9  rpc class_validate_join                ERR 42501
B10 rpc class_join                         ERR 42501
B11 INSERT roster row into live session    ERR 42501 permission denied for table session_students
B12 UPDATE any roster row                  0 rows
B13 UPDATE sessions                        ERR 42501 permission denied for table sessions
```

**Student token for STG002, roster row "Test Child 05"**:

```
A1  sessions rows readable                 1
A2  which session                          STG002
A3  session_students rows readable         1
A4  which roster row                       Test Child 05
A5  session_activities readable            1
A6  class_children readable                0
A7  rpc class_get_session(own)             STG002
A8  rpc class_get_self(own)                Test Child 05
A9  rpc class_get_self(classmate)          ERR 42501
A10 rpc class_get_session(other, STG001)   ERR 42501
A11 heartbeat(own)                         ok
A12 heartbeat(classmate)                   ERR 42501
A13 UPDATE own presence + readiness        1 rows
A16 UPDATE classmate presence              0 rows
A17 UPDATE every roster row (no WHERE)     1 rows   (only its own row matched)
A18 rpc class_set_readiness(own)           1 rows
A19 rpc class_set_readiness(classmate)     ERR 42501 student scope mismatch
```

Column guard, tested against a roster row that had actually been kicked:

```
A15b clear own kicked_at                   ERR 42501 students may only update presence and readiness
A15c change own avatar_seed                ERR 42501 students may only update presence and readiness
A15d move self to another session          ERR 42501 students may only update presence and readiness
A15e own row still visible while kicked    1 rows   (so the kick screen still renders)
```

So: a student with a valid session token reads exactly its own session, its own
roster row and its own session's activity, and nothing else. A plain anonymous
caller with no token reads nothing at all and cannot create or alter a roster row.

### 4.3 (c) realtime, proved in three parts

**(c.i) The socket accepts `access_token` and it changes what is delivered.**
Two live websockets against staging, both subscribed to
`sessions UPDATE id=eq.55555555-5555-4555-8555-000000000003` (an **ended** session,
which the broad `status <> 'ended'` policy therefore does *not* expose, but whose
owning teacher can see through `teacher_id = auth.uid()`). One socket sent
`payload.access_token = <teacher JWT>`, the other sent the payload as the deployed
client builds it today.

```
--- with access_token ---
signed in as 11111111-1111-4111-8111-000000000001 role authenticated
phx_reply {"status":"ok","response":{"postgres_changes":[{...sessions...}]}}
system    {"message":"Subscribed to PostgreSQL","status":"ok"}
postgres_changes RECEIVED class_state= ended
RESULT events=1

--- without access_token (today's deployed client) ---
phx_reply {"status":"ok","response":{"postgres_changes":[{...sessions...}]}}
system    {"message":"Subscribed to PostgreSQL","status":"ok"}
RESULT events=0
```

Both joined successfully. Only the token-bearing one received the change. This is
the single most important result in this package: it proves the mechanism works and
it proves the deployed client has no token.

**(c.ii) Realtime stores the verified claims verbatim.** While the token-bearing
socket was subscribed, `realtime.subscription` held:

```
claims_role  authenticated
claims       {..., "role":"authenticated", "session_id":"4071288f-...",
              "user_metadata":{..., "wp2a3_probe":"session_scope_marker"}}
```

`wp2a3_probe` was an arbitrary claim injected into the token before signing. It
arrived unmodified. Custom claims are not filtered, so `kind`, `session_id` and
`student_id` will reach `request.jwt.claims` the same way.

**(c.iii) Walrus evaluates the student policies cleanly and delivers.**
`realtime.apply_rls()` is the actual function that decides delivery and the actual
place the July `is_admin_user` incident failed. It was called directly with a real
`sessions` / `session_students` / `session_activities` row change and three
subscriptions: a student claim for STG002, a bare anon claim, and a student claim
for a different session.

```
sessions UPDATE, contract policies:
  subscription_ids = aaaaaaaa-...-0001   (student token for STG002 only)
  errors           = <empty>
  is_rls_enabled   = true
  -> the bare anon subscriber and the other session's student got nothing

session_students / session_activities UPDATE:
  scenario      entity              delivered to                     errors
  expand-only   session_students    student token + plain anon       <none>
  expand-only   session_activities  student token + plain anon       <none>
  contract      session_students    student token only               <none>
  contract      session_activities  student token only               <none>
```

`errors` empty in every case. No policy raised. The July failure mode is a policy
that errors under the subscriber's role; these do not, because the only functions
they call are granted to `anon`:

```
C4 anon EXECUTE on is_admin_user           true
C5 anon EXECUTE on student_session_id      true
C6 anon EXECUTE on student_row_id          true
C7 anon EXECUTE on assert_student_scope    true
```

### 4.4 The GoTrue `session_id` collision does not bite

A Supabase auth token carries its own top-level `session_id`. Fed into the helpers
as `request.jwt.claims` under role `authenticated`:

```
C1 student_session_id() under a teacher token   NULL   (the kind claim gates it)
C2 student_row_id()     under a teacher token   NULL
C3 teacher still sees own sessions              2
```

### 4.5 The Edge Function is deployed to staging and runs

```
GET  /functions/v1/class-join-token
{"ok":false,"has_url":true,"has_service_role":true,"has_jwt_secret":false}

POST /functions/v1/class-join-token  {"action":"lookup","code":"STG002"}
{"error":"NOT_CONFIGURED"}  [http 500]
```

The code loads and serves. The only missing piece is the signing secret, which is
a founder step (§6).

---

## 5. What could NOT be proven, and why

**A real end-to-end join could not be run, because `SUPABASE_JWT_SECRET` is not
available to this session.** The Edge Function runtime does not receive it
automatically (the probe above shows `has_jwt_secret: false`) and it can only be
set with `supabase secrets set`, which needs a CLI access token this session does
not have. The Supabase MCP tools expose no way to read or set it.

The consequence, stated plainly:

- **Proven:** the RLS logic under a student claim, for both reads and writes, as
  `anon`, using the same `request.jwt.claims` mechanism PostgREST uses per request.
- **Proven:** that Realtime accepts `access_token` in `phx_join`, verifies it, stores
  the full claim set verbatim, and that walrus then delivers or withholds
  `postgres_changes` accordingly, with no policy errors.
- **Proven:** that a subscriber sending no token receives nothing once the row is
  outside the broad policy.
- **NOT proven:** that a token minted by *this* Edge Function, signed HS256 with the
  project JWT secret, is accepted by PostgREST and Realtime. Every link in that
  chain was exercised with a project-signed token, but the specific token this
  function produces has never been presented to the gateway.

Two things make that gap small but they do not close it:

1. The legacy HS256 key is still enabled on **both** projects. `get_publishable_keys`
   reports the legacy `anon` key as `disabled: false` on staging and on production,
   and PostgREST and the realtime socket both accepted that HS256 token during this
   rehearsal. So HS256 signed with the legacy secret is still honoured.
2. Staging's GoTrue has already moved to **ES256 with a `kid`** for user tokens. That
   is the §1.1 caveat in the design doc, now observed rather than assumed. It does
   not block HS256, because the two coexist while the legacy key is live, but it
   means **the first thing to check after setting the secret is that a minted token
   is accepted**, and it means revoking the legacy key would break every student
   token. Add that to the "do not do this" list.

**Also not proven:** anything requiring a browser, a camera or a second device. The
teacher-to-student pause latency, the kick screen and the class-end path are covered
by the Gate 4 manual matrix, not here.

**One behaviour to note.** The function is deployed with `verify_jwt = false`, and a
POST with **no `apikey` header at all** still reached the function (it answered
`NOT_CONFIGURED`, not a gateway 401). The design assumed the gateway would enforce
the anon key. It does not. The function's real gate is therefore possession of a
live class code plus the per-instance rate limit. That is acceptable, because a
class code is the credential a child has, but it should not be described as
apikey-protected.

---

## 6. Sequencing Justin must follow

This is expand and contract. The order is the safety property; there is no version of
this that is safe to do in one step.

1. **Set the signing secret** (founder, Supabase CLI, staging first then production):
   `supabase secrets set SUPABASE_JWT_SECRET=<project JWT secret> --project-ref <ref>`
   Then `GET /functions/v1/class-join-token` must return `"has_jwt_secret": true`.
2. **Deploy the Edge Function** with JWT verification off, because children have no
   Supabase session:
   `supabase functions deploy class-join-token --no-verify-jwt --project-ref <ref>`
3. **Mint one token on staging and check it is accepted** by PostgREST and by the
   realtime socket. This is the one link this rehearsal could not test. If a minted
   token is rejected, stop: the legacy HS256 key has been revoked and the function
   must sign with the current asymmetric key instead. Same design, different `alg`.
4. **Apply the EXPAND migration to production.** Additive only. Nothing is removed,
   the deployed client is untouched, and there is no client coupling at this step.
   Verify with the counts in §7.
5. **Deploy the client** carrying the token on PostgREST and in `phx_join`.
6. **Verify in production**: one real classroom join, the child sees pause and resume,
   the teacher lobby updates live, and the build carrying the change is confirmed
   live in `analytics_events.build_version`.
7. **Only then apply the CONTRACT migration.** Not the same day as step 5 unless step
   6 is genuinely complete. Never during school hours.

Do not run contract before step 6. Contract removes the only policy branch the
deployed client can satisfy; every student screen and the teacher lobby would stop
receiving `postgres_changes`. That is the July failure with a different cause.

Do not rotate or revoke the project JWT secret, and do not disable the legacy HS256
key, while any class is live. Every student token in the building dies at once.

---

## 7. Verification counts to run after each production step

After EXPAND:

```sql
select
 (select count(*) from pg_policies where schemaname='public' and policyname in
   ('sessions_select_student','session_students_select_student_self',
    'session_students_update_student_self','session_activities_select_student',
    'round_scores_select_student','round_scores_insert_student'))            as new_policies,      -- expect 6
 (select count(*) from pg_policies where schemaname='public' and policyname in
   ('sessions_select','session_students_select_scoped','join_active_session_only',
    'students_update_own_in_active_session','Read session activities by session',
    'round_scores_select_scoped','submit_score_active_session_only'))        as old_policies,      -- expect 7
 (select count(*) from pg_trigger where tgname='trg_student_update_guard')   as guard_trigger,     -- expect 1
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname in
   ('student_session_id','student_row_id','assert_student_scope','student_update_guard')) as helpers, -- expect 4
 has_function_privilege('anon','public.is_admin_user(uuid)','EXECUTE')       as admin_fn_grant;    -- expect true
```

After CONTRACT, the same query must return `new_policies = 6`, `old_policies = 0`,
and this must return zero rows for every table, using the production anon key over
HTTPS with no bearer token:

```
GET /rest/v1/sessions?select=id            -> []
GET /rest/v1/session_students?select=id    -> []
GET /rest/v1/session_activities?select=id  -> []
GET /rest/v1/round_scores?select=id        -> []
```

Run it while a class is actually live. Run it before the class, too, so the
difference is visible.

---

## 8. Rollback

| Step | Rollback |
|---|---|
| EXPAND | `supabase/migrations/rollbacks/20260914000003_wp2a3_session_scoped_claims_expand_rollback.sql`. Drops six policies, one trigger, four functions, and restores the five student RPC bodies verbatim. No data change. |
| Client deploy | Vercel promote to previous. The expand policies are additive, so the old client works against them unchanged. |
| CONTRACT | `supabase/migrations/rollbacks/20260921000001_wp2a3_session_scoped_claims_contract_rollback.sql`. Restores the seven broad policies and the anon table grants and function grants exactly as recorded on 2026-09-08. No data change. **This re-opens the DIA-007 exposure**, so it is an emergency measure, not a resting state. |
| Edge Function | `supabase functions delete class-join-token`. Only safe before contract; after contract the join path depends on it. |

Roll back in reverse order: contract, then client, then expand. Rolling expand back
while contract is applied leaves the tables with no readable branch at all.

---

## 9. Checks

Run on branch `wp/2a3`, 2026-09-08:

```
npm ci            clean
npm run type-check  pass
npm run lint        160 problems (0 errors, 160 warnings), identical to the
                    count on HEAD before this branch, so no new warnings
npm test            39 files, 442 tests passed (55 of them new here)
npm run build       pass, 93 prerendered routes
```

`npm run build` runs `check:env-safety`, `check:csp` and `type-check` through
`prebuild`. No CSP change was needed: `connect-src` already allows the Supabase
origin, and the Edge Function is on that same origin.

---

## 10. Founder-only steps

1. `supabase secrets set SUPABASE_JWT_SECRET=...` on staging, then production.
   This session cannot read or set it.
2. `supabase functions deploy class-join-token --no-verify-jwt`.
3. Written go before the EXPAND migration is applied to production, and a separate
   written go before CONTRACT.
4. **Delete the diagnostic function `wp2a3-probe` from staging.** It was deployed to
   find out whether the runtime receives the JWT secret, it reports only booleans and
   never any secret material, and it has no further purpose:
   `supabase functions delete wp2a3-probe --project-ref dcivdrhxeaiulbbhsgfv`
5. Decide whether `app.drawintheair.com` (DIA-016, WP2B.7) also serves a child join
   screen. If it does, it will keep hitting the old anonymous path and will break at
   contract.
