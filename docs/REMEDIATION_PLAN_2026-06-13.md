# Draw in the Air — Remediation Plan (PLAN ONLY — no code changed)

**Date:** 2026-06-13
**Companion to:** `docs/AUDIT_2026-06-13.md`
**Status:** Plan for review. **Nothing in the codebase or database has been modified.** All SQL below is *proposed*.
**Live verification:** Run read-only against the production project `draw-in-the-air` (`fmrsfjxwswzhvicylaph`, Postgres 17, ACTIVE_HEALTHY) on 2026-06-13.

---

## What changed after checking the live database

Three things from the audit are now settled against production reality, which reshuffles the plan:

1. **H2 is essentially resolved.** `lios_state` **does not exist** in production. The LIOS tables that do exist (`lios_adaptive_decisions`, `lios_anomaly_fact`, `lios_pipeline_runs`) all have RLS enabled with admin-only SELECT. **Every public table has RLS enabled** and Supabase's security advisor reports **0 ERROR-level findings** (no table with RLS off). So the "unknown 0001–0003 tables" worry is closed. H2 collapses to a one-line cleanup (remove the dead conditional reference) + keep the advisor check in CI.

2. **Scaling fix #1 is already done.** The `analytics_events` hot-path indexes the audit flagged as "possibly missing" **exist in production**: `analytics_events_occurred_at_idx (occurred_at DESC)`, `analytics_events_name_idx (event_name, occurred_at DESC)`, `analytics_events_mode_idx (game_mode, occurred_at DESC)`, plus session/device. `learning_attempts` is heavily indexed too. The "degrades in the low thousands" worst case is off the table; remaining scale work is retention/partitioning + email-dispatch pagination, which bite ~10k–100k.

3. **H1 and M1 are confirmed live**, verbatim from `pg_policies` — see below. These are the real work.

The advisor also surfaced findings the static read couldn't: **22 anon-executable `SECURITY DEFINER` functions**, **5 "always-true" INSERT policies**, **1 mutable-search-path trigger function**, and **leaked-password protection disabled**.

---

## Remediation order (as requested: H1, H2, M1, H3, H4 → then the rest)

| # | Finding | Live status | Severity | Behavior risk of fix |
|---|---------|-------------|----------|----------------------|
| H1 | `sessions`/`round_scores`/`session_students` readable by `public` via `status <> 'ended'` | **Confirmed** | High | Medium — must preserve class-join/live-play |
| H2 | `lios_state` RLS off | **Not reproducible** (table absent; all RLS on) | resolved | None |
| M1 | `anon` can INSERT/UPDATE/DELETE `learning_attempts` where `child_profile_id IS NULL` | **Confirmed** | Medium→High | Medium — must preserve anon free-play |
| H3 | Stripe webhook not idempotent / not order-safe | Confirmed (code) | High | None (server-only) |
| H4 | PKCE + token storage | Confirmed (code) | High | **High — can log users out** |
| M2 | Webhook trusts Stripe customer metadata for identity | Confirmed (code) | Medium | None |
| M3 | `billing_events.payload` full retention | Confirmed | Medium | None |
| M5 | 22 anon-executable definer functions; default PUBLIC EXECUTE | **Confirmed by advisor** | Medium | Low |
| N1 | 5 "always-true" INSERT policies (telemetry) | **Advisor** | Low/Med | Low |
| N2 | `touch_class_children_updated_at` mutable search_path | **Advisor** | Low | None |
| N3 | Leaked-password protection disabled | **Advisor** | Low | None (quick win) |
| S1–S3 | email-dispatch pagination, retention/partitioning, rate limiting | Confirmed | Scale | None |

Each section below uses the format you asked for: **Finding → Root cause → Planned change (files) → Tests → Verification.**

---

## Pre-work: there is no JS test runner yet

`package.json` has `type-check`, `lint`, `check:csp`, `check:secrets`, and SQL smoke tests, but **no `vitest`/`jest`**. The "regression tests for every fix" requirement needs a harness:

- **SQL/RLS tests:** extend the existing `supabase/migrations/tests/parent_rls_test.sql` pattern (raw SQL, run as different roles). No new dependency.
- **Webhook/auth/camera tests:** add `vitest` + `@testing-library/react` as devDependencies and a `"test": "vitest run"` script. This is the one structural addition; it changes no product code.

**Proposed first step (for approval):** add vitest, wire `npm test` into `validate`, and create `tests/` with the structure below. This is additive and reversible.

---

## H1 — Close the anonymous classroom-data read

**Finding (confirmed live).** `pg_policies` shows, with role `{public}` (includes `anon`):
```
sessions_select               qual: (teacher_id = auth.uid()) OR is_admin_user(auth.uid()) OR (status <> 'ended')
round_scores_select_scoped    qual: (... teacher owns session ...) OR is_admin_user(...) OR EXISTS(session not 'ended')
session_students_select_scoped same shape
session_students UPDATE (students_update_own_in_active_session)  qual/check: EXISTS(session status <> 'ended')
```
So any unauthenticated visitor can read every non-ended session, its roster, and its scores across all schools; and update any student row in any non-ended session.

**Root cause.** The "anyone can see an active session" disjunct was a shortcut to make the student **join-by-code** and **live-play** flows work without authenticating students (students are anonymous by design). It over-grants: it exposes *all* active sessions, not *the one whose code the student has*.

**Planned change (one migration + small client trace).**
Create `supabase/migrations/0022_session_read_hardening.sql`:

1. Replace the open SELECT disjunct with participant/owner scoping. A student proves participation by holding the session **join code** (a capability), not by reading the whole table. Introduce a `SECURITY DEFINER` lookup that takes the code:

```sql
-- Minimal, anon-callable: resolve a session id ONLY from its join code.
create or replace function public.join_lookup_session(p_join_code text)
returns table (id uuid, status text, current_activity_id uuid)
language sql security definer set search_path = public stable as $$
  select s.id, s.status, s.current_activity_id
  from public.sessions s
  where s.join_code = upper(trim(p_join_code))
    and s.status <> 'ended'
  limit 1;
$$;
revoke all on function public.join_lookup_session(text) from public;
grant execute on function public.join_lookup_session(text) to anon, authenticated;
```

2. Narrow the table policies so direct reads require ownership/admin **or** that the caller is a participant of *that* session (joined row keyed by the anonymous student's `client_id`/`student_token` already stored in `session_students`). Replace the blanket disjunct:

```sql
drop policy "sessions_select" on public.sessions;
create policy "sessions_select" on public.sessions for select using (
  teacher_id = (select auth.uid())
  OR is_admin_user((select auth.uid()))
  OR exists (                       -- caller is a joined participant of THIS session
    select 1 from public.session_students ss
    where ss.session_id = sessions.id
      and ss.client_id = current_setting('request.headers', true)::json->>'x-client-id'
  )
);
```
…and the analogous participant-scoped rewrite for `round_scores_select_scoped` and `session_students_select_scoped`, plus tighten `students_update_own_in_active_session` so a student can update **only their own** row (`ss.client_id = <header>`), not any row in the session.

> **One code-tracing step before finalizing the exact predicate** (do this deliberately, don't guess): read `src/pages/classmode/StudentClassClient.tsx` and `src/features/classmode/*` to confirm (a) the column that identifies an anonymous student (`client_id` vs `student_token`), and (b) how the client currently obtains `session_id` (code lookup vs. open read) and how it subscribes to live roster/scores. The policy must match the real participation key, or joins/live updates break. The migration above is the shape; the join key is the one unknown to pin down first.

**Tests (`tests/sql/session_read_test.sql`).**
- As `anon` with **no** join code: `select * from sessions` returns **0 rows** for another teacher's active session.
- As `anon` **after joining** session X (insert into `session_students`): can read session X's roster/scores, and **cannot** read session Y's.
- As `anon`: cannot UPDATE another student's `session_students` row.
- Teacher still reads/owns their sessions; admin still reads all.
- Regression: a full join→play→score→end cycle still works end-to-end.

**Verification.** Re-run the `pg_policies` query (should show no `status <> 'ended'` open disjunct); run the SQL test as `anon`/`authenticated`/owner; run `get_advisors(security)` (the relevant `rls_policy_always_true`/over-grant entries should clear); manual smoke: join a class from a second browser profile.

---

## H2 — `lios_state` RLS (resolved; cleanup only)

**Finding.** Audit flagged conditional RLS-enable on `lios_state` (`0005:190-208`) as possibly leaving it open.

**Live status.** `lios_state` **does not exist** in production. All existing `lios_*` tables have RLS on with admin-only SELECT. Advisor: 0 RLS-off errors.

**Root cause.** The conditional block referenced a table that was renamed/never created. Dead defensive code.

**Planned change.** No security fix needed. Optional hygiene: in a comment-only migration note that `lios_state` was superseded by `skill_state`/`child_learning_state`, and **add a CI guard** so this can't silently regress:
- Add `npm run check:rls` → a script that calls the advisor (or queries `pg_class.relrowsecurity`) and fails if any `public` base table has RLS disabled. Wire into `validate`.

**Tests.** `tests/sql/rls_enabled_test.sql`: assert `count(*) = 0` for `pg_class` public base tables with `relrowsecurity = false`.

**Verification.** Already green today; the CI guard keeps it green.

---

## M1 — Stop anonymous writes to school learning data

**Finding (confirmed live).** `learning_attempts` INSERT/UPDATE/DELETE policies have role `{anon,authenticated}` with predicate `child_profile_id IS NULL OR (… auth_owns_child …)`. Because school learners also have `child_profile_id IS NULL` (they use `learner_id`/`session_id`), any anonymous user can delete or overwrite school attempts.

**Root cause.** The `child_profile_id IS NULL` branch was meant for anonymous *free-play* (no profile). It accidentally also matches school-session rows.

**Planned change.** `supabase/migrations/0023_learning_attempts_write_hardening.sql` — distinguish "anonymous free-play" (no session, ephemeral) from "school session" (has `session_id`):

```sql
-- INSERT: anon may insert only truly sessionless free-play rows; school rows require active session
drop policy "attempts_insert" on public.learning_attempts;
create policy "attempts_insert" on public.learning_attempts for insert to anon, authenticated
with check (
  (child_profile_id is not null and auth_owns_child(child_profile_id))      -- parent child
  or (child_profile_id is null and session_id is null)                       -- anon free-play, no session
  or (child_profile_id is null and session_id is not null and exists (       -- school session, must be active
        select 1 from public.sessions s
        where s.id = learning_attempts.session_id
          and s.status = any (array['active','playing'])))
);

-- UPDATE/DELETE: remove anon entirely on NULL-child rows; only owner (parent) or admin/service may mutate
drop policy "attempts_update" on public.learning_attempts;
create policy "attempts_update" on public.learning_attempts for update to authenticated
using ( is_admin_user((select auth.uid())) or (child_profile_id is not null and auth_owns_child(child_profile_id)) )
with check ( is_admin_user((select auth.uid())) or (child_profile_id is not null and auth_owns_child(child_profile_id)) );

drop policy "attempts_delete" on public.learning_attempts;
create policy "attempts_delete" on public.learning_attempts for delete to authenticated
using ( is_admin_user((select auth.uid())) or (child_profile_id is not null and auth_owns_child(child_profile_id)) );
```
Net effect: anon can still **insert** their own play attempts (append-only) but can no longer **update or delete** anything, and school rows are tied to an active session. Attempts are write-once telemetry, so removing anon UPDATE/DELETE matches intent.

> **Trace first:** confirm `src/lib/analytics.ts` only ever **inserts** `learning_attempts` (no anon update/delete). The audit indicates flush is insert-only; verify before removing anon UPDATE/DELETE.

**Tests (`tests/sql/learning_attempts_test.sql`).**
- `anon` can INSERT a sessionless free-play row.
- `anon` CANNOT INSERT a row referencing an `ended`/foreign session.
- `anon` CANNOT UPDATE or DELETE any row (school or otherwise).
- Parent can CRUD their own child's rows; cannot touch another child's.
- Regression: free-play attempt logging still succeeds from the client path.

**Verification.** Re-query `pg_policies` (anon no longer on update/delete); run SQL tests; advisor recheck.

---

## H3 — Stripe webhook idempotency + ordering

**Finding.** `stripe-webhook/index.ts:87-92` ignores the insert result (unique `stripe_event_id` not used as a guard); `:121-162` upserts with no version check.

**Root cause.** Webhook treats every delivery as first-and-only; Stripe is at-least-once and unordered.

**Planned change (`supabase/functions/stripe-webhook/index.ts`, no schema change — `billing_events.stripe_event_id` is already UNIQUE, confirmed live).**

1. **Idempotency gate** — make the log insert the gate and return 200 on conflict:
```ts
const { error: logErr } = await supabase
  .from('billing_events')
  .insert({ parent_id, stripe_event_id: event.id, type: event.type, payload: trimPayload(event) });
if (logErr) {
  if (logErr.code === '23505') return new Response('ok (duplicate)', { status: 200, headers: cors });
  throw logErr; // real failure → 500 so Stripe retries
}
```
2. **Ordering guard** — only apply if this event is newer than what's stored. Add `last_event_at timestamptz` to `parent_subscriptions` (migration `0024_subscription_event_ordering.sql`) and guard the upsert/updates:
```ts
.update({ ... , last_event_at: new Date(event.created * 1000).toISOString() })
.eq('parent_id', parentId)
.lt('last_event_at', new Date(event.created * 1000).toISOString());  // skip stale
```
(For `customer.subscription.*` use the subscription object's `current_period`/`status` transition; for invoices use `event.created`.)

**Tests (`tests/webhook/stripe-webhook.test.ts`, vitest).** Mock the Supabase client + Stripe signature:
- Same `event.id` twice → mutation applied once; second returns 200, no second write.
- `past_due` (created=T2) delivered after `active` (created=T3) → final state `active` (stale skipped).
- `active` (T3) then late `past_due` (T2) → final state `active`.
- Bad signature → 400, zero DB calls.
- Event with foreign customer metadata → see M2.

**Verification.** Vitest suite green; replay a real event via Stripe CLI (`stripe events resend <id>`) against a staging deploy and confirm a single applied mutation in `billing_events`.

---

## H4 — PKCE + move tokens out of localStorage (you asked to include now)

**This is the one fix that can change user-visible behavior** — it can invalidate existing sessions and alter the OAuth redirect round-trip. Plan it with a migration path, not a flip.

**Finding.** `src/lib/supabase.ts:51-58` persists session incl. refresh token to `localStorage`; `:220` uses `flow_type=implicit`; `:666-669` reads tokens from the URL hash.

**Root cause.** Hand-rolled auth chose implicit flow + localStorage for "keep me signed in" simplicity.

**Planned change (phased).**

*Phase A — PKCE (server-supported, low UX risk):*
1. Switch Google sign-in from implicit to **PKCE**: generate `code_verifier` (store in `sessionStorage`, not local), send `code_challenge`, set `flow_type=pkce` (`:220`).
2. Rewrite `handleAuthCallback` (`:666-669`) to read `?code=` from the **query string** and exchange it for a session via the token endpoint (`grant_type=pkce`), instead of parsing `access_token` from the hash.
3. Keep the existing `returnTo` allow-list (already hardened) — no change.

*Phase B — token storage (the part with UX impact):*
4. Stop persisting the **refresh token** in `localStorage`. Options, in order of preference:
   - **Best:** store the refresh token in an `httpOnly`, `Secure`, `SameSite=Lax` cookie set by a tiny edge function (`/auth/session`), access token in memory. Requires a small edge endpoint; eliminates XSS token theft.
   - **Interim:** keep access token in memory, refresh token in `sessionStorage` (cleared on tab close) — weaker than httpOnly cookie but removes the persistent-XSS-takeover property. Note this **breaks "stay signed in across restarts"** — a product decision.
5. **Migration safety:** on first load after deploy, detect a legacy `sb-session` in `localStorage`, transparently exchange/refresh it into the new storage once, then delete the legacy key. Users with a valid refresh token are carried over silently; only truly expired sessions must re-login.

**Tests (`tests/auth/auth-flow.test.ts`).**
- PKCE: `code_verifier` created, challenge sent, callback exchanges `?code` → session; hash tokens no longer read.
- `returnTo` rejects `https://evil.com`, accepts internal paths.
- Sign-out clears memory + cookie/sessionStorage + any legacy `localStorage` key.
- Legacy-session migration: a seeded `localStorage` session is upgraded once and the old key removed.
- Refresh-after-expiry still yields a working session.

**Verification.** Manual: Google login in a clean profile; reload; (for Phase B interim) confirm restart behavior matches the product decision; confirm no `access_token`/`refresh_token` in `localStorage` via devtools. Run the suite.

> **Recommendation even though you chose to include H4 now:** ship H1/M1/H3 first (server-side, invisible to users), then ship H4 Phase A (PKCE, low risk), then make the explicit product call on Phase B "stay signed in" before flipping storage. Bundling H4 Phase B with the others raises the chance of a login regression on deploy.

---

## M2–M5 and advisor findings (after H1–H4)

**M2 — webhook identity from customer metadata.** Resolve `parent_id` only from `parent_profiles.stripe_customer_id` (DB) or from metadata you set at checkout time; drop the customer-object metadata fallback (`stripe-webhook:71-74`). Test: event whose customer metadata names parent B does not mutate B. (Folds into the H3 webhook test file.)

**M3 — `billing_events.payload` minimization.** Add `trimPayload(event)` keeping only `{id, type, created, data.object.id, status, customer, current_period_end, items.price.id}`. Add a retention cron (see S2) deleting `billing_events` older than N months. No reads depend on full payload (verify against `src/lib/parent*`).

**M5 — 22 anon-executable `SECURITY DEFINER` functions (advisor-confirmed).** The advisor lists exactly which (e.g. `_stamp_child_tenant`, `_stamp_*` trigger fns, `process_account_deletion_requests`, `register_parent`, `create_child_profile`, `export_family_data`, `is_admin_user`, dashboards…). Plan migration `0025_lock_function_execute.sql`:
- **Revoke anon from the ones that should never be anon-callable:** all `_stamp_*` trigger functions (triggers don't need EXECUTE grants), `process_account_deletion_requests` (admin/cron only — it's internally guarded by `is_admin_user`, but should not be exposed via REST), `is_admin_user`/`is_platform_admin`/`user_tenant_ids` (internal predicates).
- **Keep** the deliberately-public ones (`register_parent`, `register_teacher`, `create_child_profile`, `export_family_data`, `log_security_event`, landing/dashboard public-proof) — these are signup/landing flows.
- **Add default-deny going forward:** `alter default privileges in schema public revoke execute on functions from public, anon;` so new functions aren't auto-exposed.
Test: `tests/sql/function_grants_test.sql` asserts anon **cannot** call each internal function and **can** call each intended-public one. Verification: advisor `anon_security_definer_function_executable` count drops to the intended allow-list.

**N1 — 5 "always-true" INSERT policies** (`analytics_events`, `client_errors`, `human_observation_fact`, `form_submissions`, `newsletter_subscribers`). These are intentional ingest points, but `WITH CHECK (true)` for anon is an abuse/DoS surface. Plan: add lightweight `WITH CHECK` constraints (e.g. payload size caps, required `event_uid`/`occurred_at` shape) and pair with server-side rate limiting (S3). Not a data-leak; keep Low unless abuse appears.

**N2 — `touch_class_children_updated_at` mutable search_path.** One-line fix in `0025`: `alter function public.touch_class_children_updated_at() set search_path = public;`. Verification: advisor `function_search_path_mutable` clears.

**N3 — leaked-password protection disabled.** Enable HaveIBeenPwned check in Supabase Auth settings (dashboard or `auth.config`). Zero-code quick win. Verification: advisor `auth_leaked_password_protection` clears.

---

## Scaling (S1–S3) — mostly de-risked by live state

- **S1 — `email-dispatch` pagination/concurrency.** Still needed. Paginate the `trialing` query (batch by `welcome_sent_at is null`, `limit 200`), send with a concurrency cap (e.g. 10), rely on existing per-row `*_sent_at` idempotency. Bites ~10k–100k. Test: 500 mock trialing rows processed in bounded batches; a send failure doesn't mark sent.
- **S2 — Retention + partitioning.** Add the 12-month delete cron `ANALYTICS_PLAN.md:186` calls for (never built) for `analytics_events`/`learning_attempts`/`billing_events`; consider monthly partitioning before ~100k. Indexes already exist, so this is about table size/cost, not query speed.
- **S3 — Server-side telemetry rate limiting.** The planned "100 events/session/min" ingest throttle (`ANALYTICS_PLAN.md:106`) was never implemented; client writes direct to PostgREST with the anon key (`src/lib/analytics.ts:779-855`). Add either an ingest edge function or a per-`device_id`/minute cap. Closes the N1 abuse surface too. Bites at 1M / under abuse.

---

## Code cleanup (no behavior change)

- `git rm` committed artifacts: `ARCHITECTURE.jsx`, `ARCHITECTURE-FINAL.jsx`, `ruvector.db` (1.5MB), `draw-in-the-air-extension.zip`; add to `.gitignore`.
- Fix camera leak: migrate `src/pages/DemoLoader.tsx` + `DemoPrep.tsx` off `core/useWebcam.ts` to `camera/useCameraController.ts`, then delete `useWebcam.ts`. **Camera-lifecycle test required** (mount→unmount stops all tracks).
- Delete ~1,570 LOC of confirmed-dead modules (list in audit §Code health) — **after** confirming `core/ageBandGating.ts` isn't a regressed feature.
- Consolidate the 3 telemetry conventions onto `lib/analytics.ts`.
- Purge the defunct `VITE_ADMIN_PIN` from `.env` (dead config; its value is already burned in git history but unused).

---

## Suggested execution sequence (maps to your 1–2 week plan)

1. **Day 0:** Add vitest harness + `tests/` scaffold + `check:rls` CI guard. (Additive.)
2. **Day 1–2:** H1 (after the StudentClassClient trace) + M1. Ship server-side; write SQL RLS tests. Advisor recheck.
3. **Day 3:** H3 + M2 (webhook). Vitest + Stripe CLI replay on staging.
4. **Day 3 (parallel):** N2, N3, M5 default-deny + revokes (low-risk migrations).
5. **Day 4:** H4 Phase A (PKCE). Manual login verification.
6. **Day 5:** S1 email-dispatch; verify analytics indexes (done) ; H4 Phase B **only after the "stay signed in" product decision**.
7. **Following week:** M3 + S2 retention/partitioning; code cleanup + camera-leak fix.

Each step ends with the remediation-report row you specified: **Finding / Root cause / Files changed / Tests added / Verification result.** I'll fill the "Files changed" and "Verification result" columns as each is implemented — say the word and I'll start at H1.
