# Draw in the Air — Remediation Report

**Date:** 2026-06-13
**Branch:** `security/remediation-h1-m1-h3-h4a` (off `master`)
**Scope (as instructed):** H1, M1, H3, and **H4 Phase A only**. H4 Phase B (token storage) intentionally **not** done.
**Companion docs:** `docs/AUDIT_2026-06-13.md`, `docs/REMEDIATION_PLAN_2026-06-13.md`
**Production database (`fmrsfjxwswzhvicylaph`) was NOT modified.** Migrations are committed to the branch for you to apply via your own pipeline. Each migration's effect was verified against the live schema inside a transaction that was rolled back.

---

## Status summary

| Finding | Status | Behaviour change to users |
|---|---|---|
| H1 — anonymous classroom-data read | ✅ Implemented | None (student flow preserved via RPCs + Realtime) |
| M1 — anonymous learning_attempts writes | ✅ Implemented | None (client only ever inserts) |
| H3 — Stripe webhook idempotency + ordering | ✅ Implemented | None (server-only reliability) |
| H4 Phase A — PKCE | ✅ Implemented | None (sign-in UX identical; email links untouched) |
| H4 Phase B — token storage | ⛔ Not started (awaiting your approval) | — |

**Verification gate:** type-check ✅ · lint ✅ (0 errors) · build ✅ · vitest 13/13 ✅ · live RLS assertions ✅ (rolled back).

---

## H1 — Classroom data exposure

**Finding.** `sessions`, `round_scores`, and `session_students` SELECT policies were granted to role `public` (incl. anon) via an `OR status <> 'ended'` disjunct, letting any unauthenticated visitor enumerate every active classroom across all schools — including `teacher_id` / `school_id` / `tenant_id` linkage and children's first names. Confirmed live: `has_column_privilege('anon','public.sessions','teacher_id','SELECT') = true`, `…session_students,'name' = true`, `round_scores` SELECT `{public}` with the `ended` disjunct.

**Root cause.** A shortcut to make the anonymous student join/play flow work without authenticating students. It over-granted: it exposed *all* active sessions, not just the one whose code the student holds. The team had already documented this exact fix as an unfinished follow-up in `platform/supabase/migrations/20260521_security_lockdown.sql` ("gate every read through SECURITY DEFINER … Tracked against audit C1").

**Fix.** The live student client (`StudentClassClient.tsx`) keeps Supabase Realtime, so anon retains a **column-restricted** row read while all real data reads move to capability-scoped `SECURITY DEFINER` RPCs keyed on the session/student id the student already holds:
- `round_scores` SELECT locked to session-owner/admin (the student never reads it).
- anon loses table-wide SELECT on `sessions`/`session_students`/`session_activities` and is re-granted SELECT only on the non-sensitive columns the Realtime handlers use. `teacher_id`, `school_id`, `tenant_id`, `sessions.metadata`, and children's `name`/`avatar_seed` are no longer anon-readable via REST or Realtime.
- New RPCs: `class_get_session`, `class_get_activity`, `class_get_self`, `class_join` (server-side validate + name-dedupe + insert + return row; the avatar seed is reproduced exactly so the teacher view is unchanged). The client's code-lookup uses the existing `session_lookup_by_code` RPC.

**Files changed.**
- `supabase/migrations/0022_session_read_hardening.sql` (new)
- `src/pages/classmode/StudentClassClient.tsx` (reads → RPCs; realtime subscriptions unchanged)

**Tests added.**
- `supabase/migrations/tests/session_read_test.sql` — asserts anon can't read `teacher_id`/`metadata`/`name`, *can* still read the Realtime columns, can execute the RPCs, and `round_scores` no longer has the open disjunct.

**Verification result.** Applied 0022 inside a rolled-back transaction against production and re-checked privileges:

| Check | Before | After |
|---|---|---|
| anon reads `sessions.teacher_id` | `true` | **`false`** |
| anon reads `sessions.metadata` | `true` | **`false`** |
| anon reads `session_students.name` | `true` | **`false`** |
| anon reads `sessions.status` (Realtime) | `true` | `true` (kept) |
| anon reads `sessions.current_activity_id` (Realtime) | `true` | `true` (kept) |
| anon reads `session_students.kicked_at` (Realtime) | `true` | `true` (kept) |
| anon can `EXECUTE class_join` | n/a | **`true`** |
| `round_scores` SELECT has `ended` disjunct | `true` | **`false`** |

Production confirmed unchanged after the test (transaction discarded). **Residual (documented):** anon can still observe non-PII columns (status, code, activity) of *active* sessions via the retained Realtime read; fully eliminating that requires Realtime Authorization/Broadcast or moving students to RPC polling — a deliberate follow-up, not this change.
**Requires your live verification before merge:** join → play → kick → end → reconnect in a real class (the RPC swap is behaviour-preserving by construction but the live Realtime path can't be exercised from here).

---

## M1 — Anonymous learning_attempts writes

**Finding.** `learning_attempts` INSERT/UPDATE/DELETE were granted to `{anon, authenticated}` for any row with `child_profile_id IS NULL`. School-session learners also have `child_profile_id IS NULL`, so anon could delete or overwrite school learning data. Confirmed live: `attempts_delete` roles = `{anon,authenticated}`.

**Root cause.** `child_profile_id IS NULL` was used as a blanket "anonymous free-play" predicate; it unintentionally matched every school-session row too.

**Fix.** `0023_learning_attempts_write_hardening.sql`:
- INSERT (anon + authenticated): allowed only for a parent's own child row, OR a sessionless free-play row, OR a school row tied to an **active** session.
- UPDATE/DELETE: `authenticated` only (admin or owning parent). Verified across `src/` that the client **only ever inserts** `learning_attempts` (analytics flush) — never updates or deletes — so removing anon write is behaviour-preserving.

**Files changed.** `supabase/migrations/0023_learning_attempts_write_hardening.sql` (new). No client change.

**Tests added.** `supabase/migrations/tests/learning_attempts_write_test.sql` — asserts delete/update roles are `{authenticated}`, insert stays `{anon,authenticated}`, and the insert check now references `sessions` (active-session gating).

**Verification result.** In the rolled-back live test, `attempts_delete` and `attempts_update` roles became `{authenticated}` (from `{anon,authenticated}`); insert remained `{anon,authenticated}`. Production unchanged.

---

## H3 — Stripe webhook idempotency + ordering

**Finding.** The webhook ignored the insert result of `billing_events` (whose `stripe_event_id` is UNIQUE), so replayed events re-applied subscription mutations; and upserts/updates had no ordering guard, so a delayed `past_due` could revert a newer `active` (or vice-versa).

**Root cause.** Webhook treated every delivery as first-and-only; Stripe delivers at-least-once and unordered.

**Fix (`supabase/functions/stripe-webhook/index.ts`).**
- **Idempotency gate:** the `billing_events` insert is now the replay guard — a `23505` unique violation returns `200 {duplicate:true}` and skips the mutation; any other insert error returns `500` so Stripe retries.
- **Ordering guard:** new `parent_subscriptions.last_event_at` (migration `0024`) stores the Stripe `event.created` of the last applied event; an older event returns `200 {stale:true}` and is skipped. All three mutations now stamp `last_event_at`.
- Decision logic extracted to a pure module `ordering.ts` (`isDuplicateEventError`, `isStaleEvent`) so it's unit-testable. M2 (customer-metadata identity) was **left unchanged** — out of this scope.

**Files changed.**
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/stripe-webhook/ordering.ts` (new, pure)
- `supabase/migrations/0024_subscription_event_ordering.sql` (new, additive nullable column)

**Tests added.**
- `tests/ordering.test.ts` (vitest, Node): duplicate detection; stale/newer/equal/first-event ordering.
- `supabase/functions/stripe-webhook/index.test.ts` (Deno `deno test`): same intent in the runtime the function ships on.

**Verification result.** `npx vitest run` → 6/6 ordering assertions pass (incl. "late `past_due` after `active` is skipped" and "replay applied once"). The Deno test is provided for CI (`deno` is not installed in this environment).

---

## H4 Phase A — PKCE (no Phase B)

**Finding.** Google sign-in used the deprecated **implicit** flow (`flow_type=implicit`), returning long-lived tokens in the URL hash.

**Root cause.** Hand-rolled auth chose implicit for simplicity.

**Fix (Phase A only).**
- `signInWithGoogle` now generates a PKCE `code_verifier` (stored in **sessionStorage**, not localStorage; single-use) and sends an S256 `code_challenge`. Falls back to implicit only if Web Crypto is unavailable.
- `handleAuthCallback` exchanges the returned `?code=` via `grant_type=pkce`, then strips `code`/`state` from the URL. **Email-link flows (recovery/signup/magiclink) are untouched** — they still read tokens from the hash via the existing fallback path.
- PKCE/redirect helpers extracted to `src/lib/auth/pkce.ts`; the existing `returnTo` open-redirect allow-list now uses the shared `isSafeInternalPath`.
- **Token storage is unchanged (Phase B not done):** sessions still persist as before, so existing logged-in users are **not** signed out.

**Files changed.**
- `src/lib/supabase.ts` (signInWithGoogle → PKCE; handleAuthCallback → code exchange + URL cleanup)
- `src/lib/auth/pkce.ts` (new, pure)

**Tests added.** `tests/pkce.test.ts` (vitest): `challenge === base64url(SHA-256(verifier))`, verifier length/charset, non-determinism, and `isSafeInternalPath` open-redirect cases (`//evil.com`, `https://…`, `javascript:`, empty/null rejected).

**Verification result.** `npx vitest run` → 7/7 pass. Type-check + build pass. `signInWithGoogle` becoming async is compatible with all call sites (verified). **Requires your live verification before merge:** a real Google sign-in round-trip in a clean browser profile.

---

## Success criteria

| Criterion | Result |
|---|---|
| Existing functionality behaves identically | Yes by construction; **live class-mode + Google-login smoke test is your pre-merge step** |
| Existing classroom sessions continue working | Student reads swapped to behaviour-preserving RPCs; Realtime preserved (verify live) |
| Existing parent / teacher accounts continue working | Yes — `authenticated` role keeps full grants; RLS row scoping unchanged |
| Existing subscriptions continue working | Yes — webhook changes are idempotency/ordering only; column add is additive |
| H1, M1, H3, H4 Phase A resolved | Yes (H1 residual documented) |
| All tests pass | vitest 13/13 ✅; SQL assertions ✅ (rolled back); Deno test provided for CI |
| TypeScript passes | ✅ `tsc -b --noEmit` clean |
| Build passes | ✅ `vite build` (875 modules; the only failure was a sandbox `dist/.DS_Store` permission quirk, not code) |
| No regressions | No errors introduced; 6 lint warnings are pre-existing `exhaustive-deps` notes on unchanged dependency arrays |
| H4 Phase B not started | ✅ Correct — awaiting explicit approval |

---

## How to apply (your pipeline)

1. Review the branch `security/remediation-h1-m1-h3-h4a`.
2. Apply migrations in order: `0022`, `0023`, `0024` (via `supabase db push` or dashboard). **Note:** the repo has two migration histories (`supabase/migrations/` numbered + `platform/supabase/migrations/` dated) that interleave in real apply-time — confirm your deploy applies `supabase/migrations/`, and that no later re-run of an older migration re-opens these policies.
3. Run the SQL tests (`\i supabase/migrations/tests/session_read_test.sql`, `…/learning_attempts_write_test.sql`) against the target DB.
4. Deploy the `stripe-webhook` edge function; replay an event with the Stripe CLI to confirm single application.
5. **Live verification before merge:** join a class as a student from a second browser (join → play → kick → end → reconnect); complete a Google sign-in in a clean profile.
6. Re-run Supabase **security advisor** after applying — it should drop the relevant over-grant entries.

**Not done (by instruction):** H4 Phase B, M2 (webhook customer-metadata identity), M3/M5, retention/partitioning, telemetry redesign, code cleanup.
