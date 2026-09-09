# WP2A.4 — Parent trial creation on signup (DIA-012)

Status: DESIGN — rehearse on staging first. Evidence date 2026-09-07.

## 0. Verified mechanism

Triggers on `auth.users` (AFTER INSERT, fire in name order):

1. `on_auth_user_created` → `handle_new_user()`: if `raw_user_meta_data.role = 'teacher'` insert `teachers`.
2. `on_auth_user_created_parent` → `handle_new_parent_user()`: **unconditionally** inserts `parent_profiles (id, email, display_name)` for every new auth user; then **only if `role = 'parent'`** calls `start_parent_trial(id)`.
3. `on_auth_user_created_teacher` → `handle_new_teacher_user()`: if `role = 'teacher'` insert `teacher_profiles`.

`start_parent_trial(p)` inserts `parent_subscriptions (status='trialing', trial_start=now(), trial_end=now()+trial_days)` with `on conflict (parent_id) do nothing` — already idempotent. `trial_days` = 7 (`pricing_config.default`).

`register_parent()` (RPC, authenticated) inserts the profile, ensures the tenant, and calls `start_parent_trial` — the correct full path.

### Signup paths in the client (`src/`)

| path | code | role metadata sent? | outcome |
|---|---|---|---|
| Parent email+password | `src/lib/supabase.ts:457 signUpWithEmail` → `POST /auth/v1/signup` with `data: { role: 'parent', display_name }` | **yes** | profile + trial via trigger ✔ |
| Teacher email+password | `src/lib/teacherApi.ts:58 signUpTeacher` → `data: { role: 'teacher', … }` | yes | teachers + teacher_profiles; (also a stray `parent_profiles` row — see below) |
| **Google OAuth (parent or teacher button)** | `src/lib/supabase.ts:212 signInWithGoogle` → `GET /auth/v1/authorize?provider=google&redirect_to=…&code_challenge=…` | **no** — OAuth authorize has no `data` payload; role intent is only stashed client-side in `sessionStorage['dia-role-intent']` | user created with `raw_user_meta_data.role` absent |

**Precisely which path omits role metadata: Google OAuth (`signInWithGoogle`).** Every one of the affected accounts has `raw_app_meta_data.provider = 'google'` and `role` = NULL (verified; §3).

### Why the client-side fallback does not rescue OAuth parents

`src/pages/parent/_shared.tsx:229-246 RequireParentAuth`:
```ts
const roles = await getAccountRoles();
if (roles?.parent || roles?.admin) { setRoleStatus('parent'); return; }   // ← returns here
if (consumeRoleIntent('parent')) { await registerParentAccount(); … }      // ← never reached
```
`get_account_roles().parent` is `exists (select 1 from parent_profiles where id = auth.uid())`. Because `handle_new_parent_user` inserted a `parent_profiles` row **for every user regardless of role**, `roles.parent` is already true for a role-less OAuth user, the gate returns early, and `register_parent()` — the only remaining call to `start_parent_trial` — never runs. Result: a parent with a profile, a dashboard, and **no subscription row** (`parent_subscription_state()` → `'none'`).

The defect is therefore the coupling of two behaviours in one trigger: the *profile* is created unconditionally, the *trial* is created conditionally. Fix: make the trial follow the profile.

## 1. Migration — forward

File: `supabase/migrations/20260914000004_parent_trial_anchor.sql`

```sql
begin;

-- 1.1 Anchor: any parent_profiles insert starts a trial, unless the account is a teacher.
--     start_parent_trial() is ON CONFLICT DO NOTHING on parent_id => never double-creates.
create or replace function public._parent_profile_start_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Teacher accounts never receive a parent trial. (A stray parent_profiles row is still
  -- created for teachers by handle_new_parent_user today; guard here rather than rely on that
  -- being fixed in the same deploy.)
  if exists (select 1 from public.teachers t where t.id = new.id)
     or exists (select 1 from public.teacher_profiles tp where tp.auth_user_id = new.id)
     or exists (select 1 from auth.users u where u.id = new.id
                  and lower(trim(coalesce(u.raw_user_meta_data->>'role',''))) = 'teacher') then
    return new;
  end if;
  -- Idempotent: existing subscription row (any status) is left untouched.
  perform public.start_parent_trial(new.id);
  return new;
end $$;

drop trigger if exists trg_parent_profile_start_trial on public.parent_profiles;
create trigger trg_parent_profile_start_trial
  after insert on public.parent_profiles
  for each row execute function public._parent_profile_start_trial();

-- 1.2 Stop creating parent_profiles for accounts that did not sign up as parents.
--     Role-less OAuth users now fall through RequireParentAuth to register_parent()
--     (profile + tenant + trial) when they arrive via the family flow, and get the explicit
--     "This area is for families" opt-in otherwise — which is the documented 0013 role-isolation
--     behaviour. Teachers stop receiving stray parent_profiles rows.
create or replace function public.handle_new_parent_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(trim(coalesce(new.raw_user_meta_data->>'role',''))) = 'parent' then
    insert into public.parent_profiles (id, email, display_name)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'display_name',
               new.raw_user_meta_data->>'full_name',
               split_part(coalesce(new.email,''), '@', 1))
    )
    on conflict (id) do nothing;
    -- trial now starts from trg_parent_profile_start_trial; keep the explicit call for clarity
    -- (idempotent) so behaviour does not depend on trigger ordering.
    perform public.start_parent_trial(new.id);
  end if;
  return new;
end $$;

-- 1.3 Backfill: parent_profiles rows with no subscription, not teachers, role missing.
--     Criteria-based (not a hard-coded id list) with an expected-count assertion so the
--     statement aborts if production drifted since the dry run.
do $$
declare v_expected int := 9;   -- from the 2026-09-07 dry run; re-run §3 and update before applying
        v_n int;
begin
  create temp table _backfill on commit drop as
    select pp.id
      from public.parent_profiles pp
      join auth.users u on u.id = pp.id
     where not exists (select 1 from public.parent_subscriptions ps where ps.parent_id = pp.id)
       and not exists (select 1 from public.teachers t where t.id = pp.id)
       and not exists (select 1 from public.teacher_profiles tp where tp.auth_user_id = pp.id)
       and coalesce(u.raw_user_meta_data->>'role','') = '';
  select count(*) into v_n from _backfill;
  if v_n <> v_expected then
    raise exception 'backfill count % <> expected %; re-run dry run', v_n, v_expected;
  end if;
  -- Fresh trial from now: these accounts never received the trial they were entitled to.
  perform public.start_parent_trial(id) from _backfill;
  -- Stamp role metadata so future code paths (and the audit query) see them as parents.
  update auth.users u
     set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || '{"role":"parent"}'::jsonb
   where u.id in (select id from _backfill);
end $$;

commit;
```

Alternative for 1.3 if product prefers a trial dated from signup (so these users are immediately `trial_expired` and enter the WP2A.5 expiry flow instead of a fresh 7 days):

```sql
insert into public.parent_subscriptions (parent_id, status, trial_start, trial_end)
select b.id, 'trialing', u.created_at, u.created_at + make_interval(days => 7)
  from _backfill b join auth.users u on u.id = b.id
on conflict (parent_id) do nothing;
```

## 2. Rollback

```sql
begin;
drop trigger if exists trg_parent_profile_start_trial on public.parent_profiles;
drop function if exists public._parent_profile_start_trial();
-- restore previous handle_new_parent_user (unconditional profile insert)
create or replace function public.handle_new_parent_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into parent_profiles (id, email, display_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name',
                   split_part(coalesce(new.email,''), '@', 1)))
  on conflict (id) do nothing;
  if (new.raw_user_meta_data ->> 'role') = 'parent' then
    perform public.start_parent_trial(new.id);
  end if;
  return new;
end $$;
-- Backfilled subscriptions are NOT deleted on rollback (they are legitimate entitlements).
commit;
```

## 3. Dry-run counts — executed read-only against production, 2026-09-07

```sql
select
 (select count(*) from auth.users) users_total,
 (select count(*) from auth.users where lower(trim(coalesce(raw_user_meta_data->>'role',''))) = 'parent')  users_role_parent,
 (select count(*) from auth.users where lower(trim(coalesce(raw_user_meta_data->>'role',''))) = 'teacher') users_role_teacher,
 (select count(*) from auth.users where coalesce(raw_user_meta_data->>'role','') = '')                      users_role_missing,
 (select count(*) from parent_profiles) parent_profiles_total,
 (select count(*) from parent_profiles pp where exists (select 1 from teachers t where t.id = pp.id))        parent_profiles_that_are_teachers,
 (select count(*) from parent_profiles pp where not exists (select 1 from parent_subscriptions ps where ps.parent_id = pp.id)) parent_profiles_no_subscription,
 (select count(*) from parent_profiles pp
   where not exists (select 1 from parent_subscriptions ps where ps.parent_id = pp.id)
     and not exists (select 1 from teachers t where t.id = pp.id)
     and not exists (select 1 from teacher_profiles tp where tp.auth_user_id = pp.id)
     and exists (select 1 from auth.users u where u.id = pp.id and coalesce(u.raw_user_meta_data->>'role','') = '')) backfill_candidates;
```

| metric | value |
|---|---|
| auth.users total | 46 |
| role = parent / teacher / **missing** | 21 / 3 / **22** |
| parent_profiles total | 44 |
| parent_profiles that are teachers (stray rows from the unconditional insert) | 7 |
| parent_profiles with no subscription row | 11 |
| **backfill candidates** (no subscription, not teacher, role missing) | **9** |

Profile of the 9 (attributes only): all `provider = google`, all `role` NULL, all email-confirmed, 0 have child profiles, 0 learning attempts, 5 have a `stripe_customer_id` on the profile (they reached checkout without ever having a trial), created 2026-06-25 → 2026-07-28.

**Discrepancy vs brief:** the brief says 4 affected accounts. Production shows **9** matching the definition "has parent_profiles row, no parent_subscriptions row, not a teacher". If the 4 were counted with an extra criterion (e.g. `stripe_customer_id is null` → 4 rows match that), state the criterion before applying 1.3 and set `v_expected` accordingly. The migration aborts on a count mismatch by design.

## 4. Staging test plan

1. Email parent signup → 1 `parent_profiles`, 1 `parent_subscriptions(status='trialing')`; run signup twice with the same email → still 1 subscription.
2. Email teacher signup → 0 `parent_profiles`, 0 `parent_subscriptions`.
3. Simulate OAuth (insert into `auth.users` with `raw_user_meta_data = '{}'`, provider google) → 0 profiles; then call `register_parent()` as that user → 1 profile, 1 trial; call again → unchanged.
4. Simulate an existing teacher then `insert into parent_profiles` for that id → trigger skips, 0 subscriptions.
5. Backfill block with `v_expected` set to the staging count; then re-run → 0 candidates, no error (temp table count 0 ≠ expected → set expected 0 for the re-run, or simply confirm `backfill_candidates = 0` via §3).
6. Client: `RequireParentAuth` for a role-less OAuth user with `dia-role-intent = parent` → `register_parent` is called (network tab) and the dashboard loads with `trial_active`.
