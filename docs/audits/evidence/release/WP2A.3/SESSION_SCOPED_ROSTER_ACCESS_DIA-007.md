# WP2A.3 — Session-scoped roster access, Stage B (DIA-007) — RELEASE BLOCKER

Status: DESIGN — rehearse on staging first. Evidence date 2026-09-07.

## 0. Verified current exposure

Grants: `anon` and `authenticated` hold **INSERT/SELECT/UPDATE/DELETE** on `sessions`, `session_students`, `session_activities`, `round_scores`, `class_children` (table grants; RLS is the only fence).

Policies that matter (from `pg_policies`):

| table | policy | effect for a bare anon key |
|---|---|---|
| sessions | `sessions_select` (public): `teacher_id = auth.uid() OR is_admin_user(auth.uid()) OR status <> 'ended'` | **any anon can read every non-ended session**: `code`, `teacher_id`, `class_name`, `school_id`, `tenant_id`, `metadata`. |
| session_students | `session_students_select_scoped` (public): teacher OR admin OR `session.status <> 'ended'` | **any anon can read every child's `name`, `avatar_seed` (embeds the name), `joined_at`, `kicked_reason` in every live session across all schools.** |
| session_students | `join_active_session_only` INSERT (public) | anon can insert arbitrary rows into any live session (bypassing `class_join`). |
| session_students | `students_update_own_in_active_session` UPDATE (public) | **anon can update any child row in any live session** — including `kicked_at`, `name`, `is_connected`. Nothing ties the row to the caller. |
| session_activities | `Read session activities by session` SELECT `true` | world-readable. |
| round_scores | select: teacher/admin/`status <> 'ended'`; insert: `status in ('active','playing')` | anon can read and insert scores for any live session. |
| class_children | `class_children_all_own` (authenticated, teacher_id = uid) | correct already. |

RPCs (SECURITY DEFINER, EXECUTE granted to anon): `session_lookup_by_code`, `class_validate_join`, `class_join`, `class_join_with_token`, `class_get_session`, `class_get_self`, `class_get_activity`, `class_student_heartbeat`, `class_set_readiness`. These are keyed on UUIDs the child holds — they are the *capability* path and are fine to keep; the problem is the table policies beside them.

Realtime: `supabase_realtime` publication = `sessions, session_students, round_scores, session_activities`. Realtime evaluates RLS **as the role of the subscriber's token**. The hand-rolled client (`src/lib/supabase.ts` §Realtime, lines ~1019–1150) opens `wss://…/realtime/v1/websocket?apikey=<anon>` and its `phx_join` payload carries only `config.postgres_changes` — **it never sends `access_token`**, so *every* subscriber (teacher and student alike) is evaluated as `anon`. That is why the policies had to be widened to `status <> 'ended'`, and why revoking anon EXECUTE on `is_admin_user` in July made every policy error and killed realtime.

Student subscriptions (`src/pages/classmode/StudentClassClient.tsx:165-221`): `sessions` UPDATE `id=eq.<session>`, `session_students` UPDATE `id=eq.<student>`, `session_activities` UPDATE `session_id=eq.<session>`. Plus `StudentJoin.tsx:146` (`sessions` UPDATE), `ClassModeGameWrapper.tsx:148` (`sessions` UPDATE), `LobbyScreen.tsx:55` (`session_students` INSERT — teacher lobby), `LiveRoundScreen.tsx:80` (`round_scores` INSERT — teacher). The student's reliable path is a 5-s RPC poll; realtime is the fast path only.

Extensions available: `pgcrypto` (installed — has `hmac()`), `supabase_vault` (installed, **0 secrets**), `pgjwt` (available, not installed). `pg_net`, `pg_cron` installed.

## 1. Recommended design — "scoped claim" via a short-lived HS256 JWT minted by an Edge Function

### 1.1 Why an Edge Function and not a Postgres function

For PostgREST **and** Realtime to honour custom claims, the token must be signed with the **project JWT secret** (HS256). Two ways to hold that secret:

- **Postgres** (`vault.secrets` + `pgcrypto.hmac`, or `pgjwt`): the project JWT secret would live inside the database. Any SQL-injection, any over-privileged SECURITY DEFINER function, or any dump would leak a secret that forges `service_role` tokens — total compromise. Vault decryption is readable by `postgres`-owned definer functions, which is exactly the class of function we have 100+ of. **Rejected.**
- **Edge Function** (`supabase/functions/class-join-token`): `SUPABASE_JWT_SECRET` is set with `supabase secrets set`, lives only in the function runtime, and the function uses the service-role key to call the existing join RPCs. The database never sees the signing secret. **Chosen.**

Caveat to verify on staging first: if the project has migrated to Supabase's asymmetric JWT signing keys, HS256 with the legacy secret is still accepted only while the legacy key is not revoked. Check *Project → JWT Keys* on staging; if legacy is revoked, the Edge Function signs with the current private key instead (same design, different `alg`).

### 1.2 Token contents

```json
{
  "iss": "dia-class",
  "aud": "authenticated",          // ignored by PostgREST role switching; kept for Realtime parsers
  "role": "anon",                  // PostgREST switches to the anon DB role — NO new DB role needed
  "kind": "student",
  "session_id": "<sessions.id>",
  "student_id": "<session_students.id>",
  "tenant_id": "<sessions.tenant_id or null>",
  "iat": 1757250000,
  "exp": 1757268000               // iat + 5 h (class_validate_join already caps sessions at 4 h)
}
```

`role` stays `anon` so no `GRANT student TO authenticator` is needed and every existing anon grant/RPC keeps working. Authorisation is carried by the custom claims, read through `auth.jwt()` (which is `current_setting('request.jwt.claims', true)::jsonb`).

No `sub` claim ⇒ `auth.uid()` stays NULL ⇒ none of the teacher/admin branches of existing policies can be satisfied by a student token.

### 1.3 Minting flow

```
child enters 4-digit code
  → POST /functions/v1/class-join-token   { code, name }            (anon key)
      1. rpc class_validate_join(code, fingerprint)  → session id or reason      [service role]
      2. rpc class_join(session_id, name)            → session_students row      [service role]
      3. sign { role:'anon', kind:'student', session_id, student_id, exp:+5h }
      4. return { token, session, student }
  → client stores token in sessionStorage (with the existing reconnect memo)
  → REST: Authorization: Bearer <token>   apikey: <anon key>
  → Realtime: phx_join payload.access_token = <token>; re-send via "access_token" event on refresh
```

Token-join (`class_join_with_token`, roster QR/link) uses the same function with `{ session_id, token }` and step 2 → `class_join_with_token`.

Refresh: `POST /functions/v1/class-join-token/refresh` with the old bearer → verify signature + `student_id` still in the session and not kicked → new token. Called by the existing 5-s poll when `exp - now < 15 min`.

### 1.4 Edge Function sketch (`supabase/functions/class-join-token/index.ts`)

```ts
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
const SECRET = Deno.env.get("SUPABASE_JWT_SECRET")!;           // set via `supabase secrets set`
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET),
  { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

async function rpc(fn: string, args: unknown) {
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
               Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
               "Content-Type": "application/json" },
    body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`${fn} ${r.status}`);
  return r.json();
}

Deno.serve(async (req) => {
  const { code, name, session_id, token } = await req.json();
  // rate limit by IP with a small in-memory bucket (Edge runtime) + the DB's advisory lock in class_validate_join
  let session, student;
  if (token && session_id) {
    student = await rpc("class_join_with_token", { in_session_id: session_id, in_token: token });
    session = await rpc("class_get_session", { in_session_id: session_id });
  } else {
    const v = await rpc("class_validate_join", { in_code: code, in_network_fingerprint: null });
    if (!v?.valid) return Response.json({ error: v?.code ?? "INVALID_CODE" }, { status: 400 });
    session = v.session;
    student = await rpc("class_join", { in_session_id: session.id, in_name: name });
  }
  const jwt = await create({ alg: "HS256", typ: "JWT" }, {
    iss: "dia-class", aud: "authenticated", role: "anon", kind: "student",
    session_id: session.id, student_id: student.id,
    iat: getNumericDate(0), exp: getNumericDate(5 * 60 * 60),
  }, key);
  return Response.json({ token: jwt, session, student });
});
```

Deploy with `--no-verify-jwt` (children have no Supabase session) and keep the anon `apikey` header check that the gateway performs.

## 2. Database migration — expand phase (new policies alongside old)

File: `supabase/migrations/20260914000003_session_scoped_claims_expand.sql`

```sql
begin;

-- 2.1 Claim helpers (STABLE, safe in RLS; return NULL for non-student tokens)
create or replace function public.student_session_id() returns uuid
language sql stable as $$
  select case when (auth.jwt() ->> 'kind') = 'student'
              then nullif(auth.jwt() ->> 'session_id', '')::uuid end;
$$;
create or replace function public.student_row_id() returns uuid
language sql stable as $$
  select case when (auth.jwt() ->> 'kind') = 'student'
              then nullif(auth.jwt() ->> 'student_id', '')::uuid end;
$$;
grant execute on function public.student_session_id(), public.student_row_id() to anon, authenticated;

-- 2.2 NEW policies, additive. Old permissive policies remain so nothing breaks yet
--     (permissive policies are OR-ed).

-- sessions: a student sees exactly its own session (until ended).
create policy sessions_select_student on public.sessions
  for select to anon, authenticated
  using (id = public.student_session_id());

-- session_students: a student sees its own row and its session-mates' minimal rows
-- (the lobby/roster UI on the child device needs mates only if it renders them;
-- StudentClassClient subscribes to id=eq.<self> only, so start with SELF ONLY).
create policy session_students_select_student_self on public.session_students
  for select to anon, authenticated
  using (id = public.student_row_id() and session_id = public.student_session_id());

-- session_students: a student may update ONLY its own row, and only presence/readiness fields.
-- Column restriction is enforced by a trigger (RLS cannot restrict columns).
create policy session_students_update_student_self on public.session_students
  for update to anon, authenticated
  using  (id = public.student_row_id() and session_id = public.student_session_id())
  with check (id = public.student_row_id() and session_id = public.student_session_id());

create or replace function public._student_update_guard() returns trigger
language plpgsql as $$
begin
  if public.student_row_id() is not null then
    if new.name is distinct from old.name
       or new.session_id is distinct from old.session_id
       or new.class_child_id is distinct from old.class_child_id
       or new.kicked_at is distinct from old.kicked_at
       or new.kicked_reason is distinct from old.kicked_reason
       or new.tenant_id is distinct from old.tenant_id
       or new.avatar_seed is distinct from old.avatar_seed then
      raise exception 'students may only update presence/readiness' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_student_update_guard on public.session_students;
create trigger trg_student_update_guard before update on public.session_students
  for each row execute function public._student_update_guard();

-- session_activities: student sees activities of its own session.
create policy session_activities_select_student on public.session_activities
  for select to anon, authenticated
  using (session_id = public.student_session_id());

-- round_scores: student reads and inserts only its own scores in its own session.
create policy round_scores_select_student on public.round_scores
  for select to anon, authenticated
  using (session_id = public.student_session_id() and student_id = public.student_row_id());
create policy round_scores_insert_student on public.round_scores
  for insert to anon, authenticated
  with check (session_id = public.student_session_id() and student_id = public.student_row_id()
              and exists (select 1 from public.sessions s where s.id = round_scores.session_id
                            and s.status in ('active','playing')));

-- 2.3 Student RPCs: bind the capability UUID to the claim when a claim is present.
-- (Bare-anon calls keep working during expand; contract phase makes the claim mandatory.)
create or replace function public._assert_student_scope(in_session_id uuid, in_student_id uuid default null)
returns void language plpgsql stable as $$
begin
  if public.student_session_id() is not null then
    if in_session_id is distinct from public.student_session_id() then
      raise exception 'session scope mismatch' using errcode = '42501';
    end if;
    if in_student_id is not null and in_student_id is distinct from public.student_row_id() then
      raise exception 'student scope mismatch' using errcode = '42501';
    end if;
  end if;
end $$;
-- Insert `perform public._assert_student_scope(in_session_id);` as the first statement of
-- class_get_session, class_get_activity (via the activity's session_id), and
-- `perform public._assert_student_scope((select session_id from session_students where id = in_student_id), in_student_id);`
-- in class_get_self, class_student_heartbeat, class_set_readiness. (Bodies otherwise unchanged; not reproduced here.)

commit;
```

Teacher path note: teacher policies (`teacher_id = auth.uid()`) already exist and are unchanged. The **teacher realtime** subscriptions also currently run as anon; they will only keep working after contract if the client sends the teacher's user JWT as `access_token` (§4).

## 3. Contract phase (after client deploy + verification)

File: `supabase/migrations/2026092X000001_session_scoped_claims_contract.sql`

```sql
begin;
-- Remove the world-readable branches.
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select to anon, authenticated
  using (teacher_id = (select auth.uid()) or public.is_admin_user((select auth.uid())));
-- (student access now comes only from sessions_select_student)

drop policy if exists session_students_select_scoped on public.session_students;
create policy session_students_select_scoped on public.session_students for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_students.session_id
                   and s.teacher_id = (select auth.uid()))
         or public.is_admin_user((select auth.uid())));

drop policy if exists students_update_own_in_active_session on public.session_students;
drop policy if exists join_active_session_only on public.session_students;   -- inserts only via class_join RPCs (definer)

drop policy if exists "Read session activities by session" on public.session_activities;
create policy session_activities_select_teacher on public.session_activities for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_activities.session_id
                   and s.teacher_id = (select auth.uid())) or public.is_admin_user((select auth.uid())));

drop policy if exists round_scores_select_scoped on public.round_scores;
create policy round_scores_select_teacher on public.round_scores for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = round_scores.session_id
                   and s.teacher_id = (select auth.uid())) or public.is_admin_user((select auth.uid())));
drop policy if exists submit_score_active_session_only on public.round_scores;

-- Table-level: anon never needs INSERT/UPDATE/DELETE directly (all writes go through definer RPCs
-- or the student self-update policy which needs UPDATE — keep UPDATE on session_students only).
revoke insert, update, delete, truncate, references, trigger on public.sessions, public.session_activities, public.class_children from anon;
revoke insert, delete, truncate, references, trigger on public.session_students from anon;
revoke update, delete, truncate, references, trigger on public.round_scores from anon;

-- Make the claim mandatory in student RPCs: replace the `if student_session_id() is not null` guard
-- in _assert_student_scope with an unconditional check.
create or replace function public._assert_student_scope(in_session_id uuid, in_student_id uuid default null)
returns void language plpgsql stable as $$
begin
  if public.student_session_id() is null then
    raise exception 'student token required' using errcode = '42501';
  end if;
  if in_session_id is distinct from public.student_session_id() then
    raise exception 'session scope mismatch' using errcode = '42501';
  end if;
  if in_student_id is not null and in_student_id is distinct from public.student_row_id() then
    raise exception 'student scope mismatch' using errcode = '42501';
  end if;
end $$;
-- session_lookup_by_code / class_validate_join / class_join / class_join_with_token: revoke from anon;
-- they are now called only by the Edge Function with service_role.
revoke execute on function public.session_lookup_by_code(text), public.class_validate_join(text, text),
  public.class_join(uuid, text), public.class_join_with_token(uuid, text) from anon, authenticated;
commit;
```

Rollback of contract = re-run the expand file's dropped policies from `supabase/baseline/prod_public_schema.sql` (they are recorded there verbatim) and re-grant. Rollback of expand = `drop policy` × 7, `drop trigger`, `drop function` × 4 — no data change.

## 4. Client changes (file list)

| file | change |
|---|---|
| `src/lib/supabase.ts` | (a) `setStudentToken(jwt)` / `getStudentToken()` stored in `sessionStorage` next to the reconnect memo; `authHeaders()` prefers the student token when present and no user session exists. (b) `sendPhxJoin`: add `access_token: getAccessToken()` to the `phx_join` **payload** (teacher user JWT or student token). (c) On token refresh (`scheduleTokenRefresh` for teachers; student refresh for children) send `sendPhx('access_token', topic, { access_token })` on every joined topic. (d) Reconnect: `connectRealtime` re-joins with the current token (already replays `channels`). |
| `src/pages/classmode/StudentClassClient.tsx` | `handleCode` / name submit / token join call the Edge Function instead of `session_lookup_by_code` + `class_join`; store token; add refresh call in the 5-s `check` when `< 15 min` to expiry; on 401/42501 from any RPC → treat as ended and clear memo. Reconnect-from-memo path must re-read the token; if missing/expired → `{kind:'code'}`. |
| `src/pages/classmode/StudentJoin.tsx` | same join path (legacy screen) or delete if superseded. |
| `src/features/classmode/ClassModeGameWrapper.tsx` | no logic change; its `sessions` subscription starts working under the student token. |
| `src/pages/classmode/TeacherClassConsole.tsx`, `LobbyScreen.tsx`, `LiveRoundScreen.tsx` | no code change, **but** they only keep receiving realtime after contract because (b) now sends the teacher JWT. |
| `supabase/functions/class-join-token/index.ts` (+ `_shared/`) | new. |
| `supabase/config.toml` | `[functions.class-join-token] verify_jwt = false`. |
| `config/csp` / `docs/CSP_REQUIREMENTS.md` | `connect-src` already allows `*.supabase.co`; no change expected — verify. |
| `tests/` | unit: `authHeaders()` precedence; `matchesPostgresFilter` unchanged; integration (staging): the 6 scenarios in §6. |

## 5. Failure modes and mitigations

| failure | effect | mitigation |
|---|---|---|
| Edge Function cold start / outage | children cannot join (previously the RPC path had no extra hop) | keep p95 < 500 ms budget; Better Stack monitor on `/functions/v1/class-join-token` (POST with an invalid code → expect 400, proves the function is up without creating rows); fallback banner "try again" already exists in `handleCode`. |
| JWT secret rotated | all student tokens invalid mid-lesson → RPCs 401 → poll treats as ended | rotate only outside school hours; refresh endpoint issues new tokens on demand; poll retries the refresh before declaring "ended". |
| Legacy HS256 secret disabled (asymmetric keys) | tokens rejected | verified on staging first (§1.1). |
| Token replay by another device | second device gets the same student identity for ≤ 5 h | acceptable within a classroom (same as today's sessionStorage memo); `class_student_heartbeat` conflict is benign; kicked_at still terminates both. |
| Token exfiltrated from a child device | attacker can read one session + one row for ≤ 5 h | far smaller than today (all sessions, all schools, indefinitely while live). |
| Realtime rejects `access_token` in `phx_join` (e.g. missing `exp`/`role`) | fast path silently dead, 5-s poll still works | the client logs `phx_reply` status on join (add); staging test 6.4 asserts an event is delivered. |
| Teacher realtime breaks after contract because (b) was not deployed | teacher lobby stops updating live; polling absent on teacher console | do not run the contract migration until the client build with (b) is confirmed live (`build_version` in `analytics_events`). |
| `is_admin_user` EXECUTE removed again | every policy containing it errors → realtime dead (July incident) | new student policies **do not call** `is_admin_user`; the teacher branch does — leave the grant in place and add a pgTAP assertion. |
| Clock skew on child devices | irrelevant — `exp` is checked server-side only. | — |

## 6. Staging test plan

1. **Expand applied, old client**: children join via RPC as today; teacher lobby updates. (Proves additive.)
2. **New client, expand only**: child joins through the Edge Function; `authHeaders()` carries the token; `class_get_session` works; a *second* browser with only the anon key can still read the roster (expected — old policies still present). Record as baseline.
3. **Contract applied**: second browser with anon key → `select * from session_students` returns 0 rows; `POST /rest/v1/rpc/class_get_self` → 42501. Child device: still sees its own row; teacher lobby still updates.
4. **Realtime**: with the child token, teacher clicks Pause → child receives `sessions` UPDATE within 1 s (assert via console log), then End → child sees `{kind:'ended'}` via realtime (not via the poll — temporarily set the poll to 60 s for the test).
5. **Cross-session**: craft a token for session A, subscribe to `sessions` with filter `id=eq.<B>` → no events; `class_get_session(B)` → 42501.
6. **Expiry/refresh**: mint with `exp = now + 2 min`; wait; assert the poll refreshed the token and the UI never showed "ended".
7. **Kick**: teacher kicks → child row UPDATE arrives via realtime under the self policy; further RPCs 42501; refresh endpoint refuses (kicked_at set).
8. pgTAP: `has_function_privilege('anon', 'public.is_admin_user(uuid)', 'EXECUTE')` is true; every policy on the 4 realtime tables evaluates without error under `set role anon; set request.jwt.claims = '{"role":"anon"}'` (bare) and under a student claim.

## 7. Broadcast alternative — assessment

Supabase Realtime Broadcast (with `realtime.broadcast_changes()` from triggers, and private channels authorised by `realtime.messages` RLS) would let us stop replicating table rows to children altogether: a trigger on `sessions`/`session_activities` would broadcast a minimal `{class_state, current_activity_id, activity_state}` payload to topic `session:<id>`, and children would subscribe to that topic only. It removes the need for any child-readable table policy and shrinks the realtime payload to exactly what the UI needs. It is the better *end state*. It is **not** the right Stage B for this release because: (a) the hand-rolled client has no broadcast or private-channel support and would need a rewrite of the socket layer, whereas the scoped-claim design is a two-line change to `phx_join` plus a token store; (b) private-channel authorisation still requires a token carrying `session_id`, so the Edge Function and claim helpers in this document are a prerequisite for broadcast anyway; (c) the REST path (`class_get_*` RPCs, the 5-s reliability poll) still needs row-level scoping regardless of how the fast path is delivered. Recommendation: ship scoped claims now; schedule broadcast as the Stage C fast-path replacement, reusing the same token.

## 8. Stage B summary (5 lines)

1. Children get a 5-hour HS256 JWT (`role=anon`, `kind=student`, `session_id`, `student_id`) minted by a new Edge Function that wraps the existing join RPCs with the service role; the JWT secret never enters Postgres.
2. RLS gains additive policies `… = (auth.jwt()->>'session_id')::uuid` / `student_id` on `sessions`, `session_students` (self only, column-guarded update), `session_activities`, `round_scores`; student RPCs assert the claim.
3. Client sends the token as REST bearer and as `access_token` in the realtime `phx_join` payload (teachers likewise send their user JWT — today nobody does, so all realtime runs as anon).
4. Expand → deploy client → verify (staging §6, then prod smoke) → contract: drop the `status <> 'ended'` branches, drop anon INSERT/UPDATE policies, revoke anon EXECUTE on the join RPCs.
5. Broadcast is the better end state but needs the same token and a socket-layer rewrite; defer to Stage C.
