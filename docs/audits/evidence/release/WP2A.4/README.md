# WP2A.4 — parent trials on signup (DIA-012)

Status: **rehearsed on staging, awaiting Justin's written go for production.**
Nothing has been applied to production. Branch `wp/2a-db`.

Design: `SIGNUP_TRIALS_DIA-012.md` in this directory.

## Root cause, traced across every signup path

| path | code | role metadata sent? |
|---|---|---|
| Parent email and password | `src/lib/supabase.ts` `signUpWithEmail` posts to `/auth/v1/signup` with `data: { role: 'parent', display_name }` | yes |
| Teacher email and password | `src/lib/teacherApi.ts` `signUpTeacher` with `data: { role: 'teacher', ... }` | yes |
| **Google OAuth, parent or teacher button** | `src/lib/supabase.ts` `signInWithGoogle` does `GET /auth/v1/authorize?provider=google&...` | **no** |

`GET /auth/v1/authorize` has nowhere to carry user metadata. The role intent is
stashed client-side only, in `sessionStorage['dia-role-intent']`. So a Google
signup creates an `auth.users` row with `raw_user_meta_data.role` absent. Every
one of the nine affected production accounts has
`raw_app_meta_data.provider = 'google'` and no role.

That alone was survivable, because `RequireParentAuth`
(`src/pages/parent/_shared.tsx`) has a fallback: if the account is not already a
parent, consume the stashed intent and call `register_parent()`, which creates
the profile, the tenant **and** the trial.

The fallback never ran. `handle_new_parent_user()` inserted a `parent_profiles`
row for **every** new auth user regardless of role.
`get_account_roles().parent` is "a `parent_profiles` row exists", so
`roles.parent` was already true, `RequireParentAuth` returned early, and
`register_parent()` was never called. The account ended up with a profile, a
dashboard, and no `parent_subscriptions` row at all, which
`parent_subscription_state()` reports as `'none'`.

**Confirmed independently:** all nine affected accounts have `tenant_id` NULL on
their `parent_profiles` row. `register_parent()` is the only code path that
stamps a tenant, so it demonstrably never ran for any of them.

The defect is one trigger doing two things on two different conditions: the
profile unconditionally, the trial conditionally.

### Change to the design

The design's §1.1 and §1.2 are correct. Three changes were made while
implementing:

1. **One eligibility rule, in one place.** The design put the teacher exclusion
   inline in the new trigger and left `perform public.start_parent_trial(...)`
   calls in two other functions, so the rule would have existed in one place and
   been bypassable from two others. It is now
   `public._parent_trial_eligible(uuid)` plus
   `public._start_parent_trial_if_eligible(uuid)`, and every caller goes through
   the helper. A test asserts there is exactly one direct
   `start_parent_trial(` call left in the migration.
2. **`register_parent()` now stamps the role metadata** the OAuth path could not
   send, when the role is currently absent and the account is not a teacher.
   Without this a Google-signup parent stays role-less forever and every later
   query that reads `raw_user_meta_data->>'role'` misclassifies them, which is
   what produced 22 role-less accounts out of 46 in the first place.
3. **The backfill asserts twice**: the candidate count before writing, and that
   every candidate has a subscription afterwards.

Role-less accounts are **not** defaulted to parent anywhere. A role-less account
gets a parent profile and a trial only when it reaches `register_parent()`,
which the client calls only after an explicit parent-flow intent. A teacher
account never gets a parent trial, however its `parent_profiles` row came to
exist.

## Production dry run, re-verified read-only on 2026-09-08

```sql
select
 (select count(*) from auth.users) users_total,
 (select count(*) from auth.users where lower(trim(coalesce(raw_user_meta_data->>'role',''))) = 'parent')  users_role_parent,
 (select count(*) from auth.users where lower(trim(coalesce(raw_user_meta_data->>'role',''))) = 'teacher') users_role_teacher,
 (select count(*) from auth.users where coalesce(raw_user_meta_data->>'role','') = '')                     users_role_missing,
 (select count(*) from parent_profiles) parent_profiles_total,
 (select count(*) from parent_profiles pp where exists (select 1 from teachers t where t.id = pp.id))       parent_profiles_that_are_teachers,
 (select count(*) from parent_profiles pp where not exists (select 1 from parent_subscriptions ps where ps.parent_id = pp.id)) parent_profiles_no_subscription,
 (select count(*) from parent_profiles pp
   where not exists (select 1 from parent_subscriptions ps where ps.parent_id = pp.id)
     and not exists (select 1 from teachers t where t.id = pp.id)
     and not exists (select 1 from teacher_profiles tp where tp.auth_user_id = pp.id)
     and exists (select 1 from auth.users u where u.id = pp.id and coalesce(u.raw_user_meta_data->>'role','') = '')) backfill_candidates;
```

| metric | 2026-09-07 | 2026-09-08 |
|---|---|---|
| `auth.users` total | 46 | 46 |
| role parent / teacher / **missing** | 21 / 3 / 22 | 21 / 3 / **22** |
| `parent_profiles` total | 44 | 44 |
| of those, teacher accounts (stray rows) | 7 | 7 |
| `parent_profiles` with no subscription | 11 | 11 |
| **backfill candidates** | **9** | **9** |

Unchanged in 24 hours. The 9: all Google, all role NULL, all email-confirmed,
all `tenant_id` NULL, 0 child profiles, 0 learning attempts, 5 carry a
`stripe_customer_id` (they reached checkout without ever having had a trial),
created between 2026-06-25 and 2026-07-28.

The brief says 4 affected accounts; the database says 9 under the definition
"has a `parent_profiles` row, no `parent_subscriptions` row, is not a teacher,
has no role metadata". Per standing rule 8 the database wins. `v_expected` in
the migration is **9** and the migration aborts on any other number.

### Trial dating: a product decision, not a data one

The migration starts these nine trials **from now**, so they get the 7 days they
were entitled to and never received. The alternative is backdating to
`auth.users.created_at`, which would put all nine straight into the WP2A.5
expired flow and give them nothing. If Justin prefers that, replace the
`_start_parent_trial_if_eligible` call in §5 with:

```sql
insert into public.parent_subscriptions (parent_id, status, trial_start, trial_end)
select b.id, 'trialing', u.created_at, u.created_at + make_interval(days => 7)
  from _wp2a4_backfill b join auth.users u on u.id = b.id
on conflict (parent_id) do nothing;
```

## Files

| file | sha256 (at authoring) |
|---|---|
| `supabase/migrations/20260914000004_parent_trial_anchor.sql` | `7294ce0315414976278477c1caaa8599fc4935378add651a6e632ed2c83a0161` |
| `supabase/migrations/rollbacks/20260914000004_parent_trial_anchor_rollback.sql` | `ed587187e495d7dca0620e2908968805b14c6832b42a1de7c20a9418e060d1dd` |
| `tests/parent-trial-anchor.test.ts` | 14 vitest cases |

**The production SQL is the migration file, applied verbatim.** Check the hash
before applying, and re-run the dry-run query above first: if it does not say 9,
the migration will abort and `v_expected` must be re-set deliberately.

## Staging rehearsal, 2026-09-08 (project `dcivdrhxeaiulbbhsgfv`)

Staging was seeded to reproduce the production shape exactly: 9 role-less Google
accounts with a `parent_profiles` row and no subscription, plus two negative
controls (a role-less account that is a teacher, and a role-less account that
already has an `active` subscription). Seeding those users through
`auth.users` reproduced the defect live: the unconditional trigger gave all of
them a `parent_profiles` row and none of them a trial.

| metric | before | after |
|---|---|---|
| `parent_profiles` | 16 | 16 |
| `parent_subscriptions` | 3 | 12 |
| backfill candidates | **9** | **0** |
| teacher negative control subscriptions | 0 | **0** |
| accounts with role stamped to `parent` | 0 | 9 |

`parent_subscription_state()` for a backfilled account returned `trial_active`.

### Behavioural checks after applying (all passed)

| # | scenario | expected | result |
|---|---|---|---|
| T1 | parent email signup | 1 profile, 1 `trialing` subscription | pass |
| T2 | teacher email signup | 0 parent profiles, 0 subscriptions | pass |
| T3 | role-less Google signup | 0 profiles, 0 subscriptions | pass |
| T4 | that user then calls `register_parent()` twice | 1 profile, 1 subscription, tenant stamped, role stamped, second call changes nothing | pass |
| T5 | direct `insert into parent_profiles` for a teacher | 0 subscriptions (trigger skips) | pass |

### Abort-on-mismatch check

Re-running the backfill block against a database with 0 candidates while
`v_expected` is 9 raised:

```
ERROR:  WP2A.4 backfill: 0 candidates, expected 9. Re-run the dry run and update v_expected.
```

### Rollback rehearsal

The rollback was applied and verified: a role-less Google signup immediately got
a stray `parent_profiles` row again and no trial, which is the old broken
behaviour restored. The 9 backfilled subscriptions and their role metadata
survived the rollback, as designed. The forward migration was then re-applied.

## Verification queries to run after applying to production

```sql
-- 1. No stranded parent profiles remain. Expect 0.
select count(*)
  from public.parent_profiles pp join auth.users u on u.id = pp.id
 where not exists (select 1 from public.parent_subscriptions ps where ps.parent_id = pp.id)
   and not exists (select 1 from public.teachers t where t.id = pp.id)
   and not exists (select 1 from public.teacher_profiles tp where tp.auth_user_id = pp.id)
   and coalesce(u.raw_user_meta_data->>'role','') = '';

-- 2. Nine new trialing rows, and no teacher gained one. Expect 42 and 0.
select
 (select count(*) from public.parent_subscriptions) as subs_total,
 (select count(*) from public.parent_subscriptions ps
   where exists (select 1 from public.teachers t where t.id = ps.parent_id)) as teacher_subs;

-- 3. The anchor trigger exists.
select tgname, tgenabled from pg_trigger t join pg_class c on c.oid = t.tgrelid
 where c.relname = 'parent_profiles' and t.tgname = 'trg_parent_profile_start_trial';

-- 4. The eligibility rule is the only route to a trial. Expect 1 row per helper.
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and proname in ('_parent_trial_eligible','_start_parent_trial_if_eligible','_parent_profile_start_trial');

-- 5. Role metadata was stamped on the nine. Expect users_role_missing to have
--    fallen by 9, from 22 to 13.
select count(*) from auth.users where coalesce(raw_user_meta_data->>'role','') = '';
```

Then, outside SQL: sign in to `/parent/dashboard` with a Google account that has
no parent profile, having come through the parents signup page, and confirm the
network tab shows `register_parent` being called and the dashboard loading in
`trial_active`.

## Rollback

Run `supabase/migrations/rollbacks/20260914000004_parent_trial_anchor_rollback.sql`.
It restores the previous `handle_new_parent_user()` and `register_parent()`
bodies and drops the trigger and helpers. It deliberately does **not** delete the
nine backfilled subscriptions or un-stamp their role metadata: those are
entitlements the accounts were always owed, and deleting them would re-create the
defect for exactly the people it harmed.

## What the founder must do by hand

1. Re-run the dry-run query. If `backfill_candidates` is not 9, stop and decide
   the new number deliberately before touching `v_expected`.
2. Decide the trial-dating question above (fresh 7 days, or backdated).
3. Give written go, apply, run the verification queries.
4. Expand-and-contract note: this migration changes only server-side behaviour
   and is compatible with the currently deployed client, so it can be applied
   before the Gate 3 client deploy. No client change depends on it.
5. Consider emailing the nine accounts. Five of them reached Stripe checkout
   with no trial in place, which is a poor first experience they did not cause.

## Out of scope, logged not fixed

* Seven production `parent_profiles` rows belong to teacher accounts, created by
  the old unconditional insert. This package stops new ones but does not delete
  the existing seven: deleting them would remove family-area access some of
  those accounts may be using. Findings log entry 46.
* `supabase/migrations/0017_signup_role_hardening.sql` in the repo gates the
  profile insert on `role = 'parent'`, but the live production function body is
  the ungated one from `20260701000001`. The repo's numbered migration lineage
  does not match `supabase_migrations.schema_migrations`. Findings log entry 42;
  belongs to WP1A.3's reconciliation.
