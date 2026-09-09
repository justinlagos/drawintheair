# WP2A.5 — Expired-but-`trialing` parent subscriptions (DIA-015)

Status: DESIGN — rehearse on staging first. Evidence date 2026-09-07.

## 0. Verified current state

- `parent_subscriptions.status` is free text (`default 'none'`, no CHECK); vocabulary in use: `active`, `trialing`. Comment in `0004_parent_subscriptions.sql`: `none|trialing|active|past_due|canceled|incomplete|incomplete_expired|unpaid`.
- Nothing ever moves a local trial out of `trialing`. `parent_subscription_state(p)` *derives* `'trial_expired'` at read time (`status='trialing' and trial_end <= now()`), so the UI is correct, but every report/query that filters on `status` (e.g. `dashboard_growth` "trial_lapsed", `email-dispatch` `.in('status',['trialing'])`, `billing-diagnostics`) treats a months-old lapsed trial as live.
- Consumers of `status='trialing'` that must keep working:
  - `supabase/functions/email-dispatch/index.ts:123` — selects `status in ('trialing')` and sends the **"trial expired" email** when `trial_end <= now` and `reminder_expired_sent_at is null`. **If we flip status before that email is sent, it is never sent.** The transition therefore waits for `reminder_expired_sent_at` (or a 48 h grace if the dispatcher is down).
  - `supabase/functions/stripe-checkout/index.ts:91` — carries remaining trial days into Checkout only when `status='trialing'`; an expired trial already yields 0 days, so `'trial_expired'` is equivalent.
  - `billing-health` / `billing-diagnostics` reconcile against **Stripe** statuses; local trials have `stripe_subscription_id IS NULL` (verified: 0 of the 31 expired rows have one) and are untouched.
  - Client `describeSubscriptionState()` has copy for `trial_expired` ("Trial ended") vs `expired` ("Subscription expired"). To keep the right copy, the new status value is **`trial_expired`** and `parent_subscription_state()` maps it explicitly.

## 1. Dry-run count — executed read-only against production, 2026-09-07

```sql
select
 (select count(*) from parent_subscriptions)                                                            subs_total,
 (select count(*) from parent_subscriptions where status = 'trialing')                                  subs_trialing,
 (select count(*) from parent_subscriptions where status = 'trialing' and trial_end <= now())           subs_trialing_expired,
 (select count(*) from parent_subscriptions where status = 'trialing' and trial_end is null)            subs_trialing_null_end,
 (select count(*) from parent_subscriptions where status = 'trialing' and trial_end <= now()
     and stripe_subscription_id is not null)                                                            expired_with_stripe_sub,
 (select count(*) from parent_subscriptions where status = 'trialing' and trial_end <= now()
     and reminder_expired_sent_at is null)                                                              expired_email_not_yet_sent,
 (select string_agg(status||':'||n, ', ') from (select status, count(*) n from parent_subscriptions group by 1) x) by_status;
```

| metric | value |
|---|---|
| subscriptions total | 33 (`active: 2`, `trialing: 31`) |
| `trialing` with `trial_end <= now()` | **31 (100 % of trialing rows)** |
| `trialing` with null `trial_end` | 0 |
| expired rows that have a Stripe subscription id | 0 |
| expired rows whose "trial ended" email has not been sent | **0** (all 31 have `reminder_expired_sent_at` set) |
| expired rows older than the 48 h grace | **31** — the one-off catch-up in §2.4 will transition all 31 |

## 2. Migration — forward

File: `supabase/migrations/20260914000005_trial_expiry_transition.sql`

```sql
begin;

-- 2.1 Read model: status 'trial_expired' keeps the "Trial ended" UI state.
create or replace function public.parent_subscription_state(p_parent uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare s parent_subscriptions%rowtype;
begin
  select * into s from parent_subscriptions where parent_id = p_parent;
  if not found or s.status = 'none' then
    return 'none';
  end if;

  if s.status = 'trial_expired' then
    return 'trial_expired';
  end if;

  if s.status = 'trialing' then
    if s.trial_end is not null and s.trial_end <= now() then
      return 'trial_expired';          -- still derived for rows the nightly job has not yet flipped
    end if;
    return 'trial_active';
  end if;

  if s.status in ('past_due','unpaid') then
    return 'payment_failed';
  end if;

  if s.status = 'active' then
    if s.cancel_at_period_end then
      return 'cancelled_active';
    end if;
    return case when s.plan_interval = 'year' then 'active_annual' else 'active_monthly' end;
  end if;

  if s.status = 'canceled' then
    if s.current_period_end is not null and s.current_period_end > now() then
      return 'cancelled_active';
    end if;
    return 'expired';
  end if;

  return 'expired';
end;
$$;

-- 2.2 Transition function (cron-callable, not API-callable).
create or replace function app_private.expire_parent_trials(in_grace interval default interval '48 hours')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n int;
begin
  if current_setting('request.jwt.claims', true) is not null then
    raise exception 'not callable over the API' using errcode = '42501';
  end if;

  update public.parent_subscriptions ps
     set status      = 'trial_expired',
         updated_at  = now(),
         last_event_at = coalesce(ps.last_event_at, now())
   where ps.status = 'trialing'
     and ps.trial_end is not null
     and ps.trial_end <= now()
     and ps.stripe_subscription_id is null                       -- Stripe-managed trials are reconciled by billing-health
     and (ps.reminder_expired_sent_at is not null                 -- "trial ended" email already went out …
          or ps.trial_end <= now() - in_grace);                   -- … or the dispatcher had 48 h and did not; flip anyway
  get diagnostics v_n = row_count;
  return jsonb_build_object('transitioned', v_n, 'at', now());
end $$;
revoke all on function app_private.expire_parent_trials(interval) from public, anon, authenticated;

-- 2.3 Nightly job (01:30 UTC — before retention-purge at 02:00 and after the last email-dispatch tick).
select cron.schedule('expire-parent-trials-nightly', '30 1 * * *',
  $$select app_private.expire_parent_trials(interval '48 hours')$$);

-- 2.4 One-off catch-up for the current backlog (same predicate, no grace: every one of the 31 rows
--     expired weeks ago; any whose expiry email was never sent has been waiting far beyond 48 h).
select app_private.expire_parent_trials(interval '48 hours');

commit;
```

Effect on the 31 rows: all satisfy `trial_end <= now() - 48h` (oldest signups are June/July), so the catch-up transitions **31** rows. `parent_subscription_state()` returns `'trial_expired'` for them before and after — no UI change for parents.

### Companion edits (code, not this migration — listed for the implementer)

- `supabase/functions/email-dispatch/index.ts:123`: keep `.in('status', ['trialing'])` — after the flip these rows drop out of the loop, which is the intended effect (no more welcome/reminder evaluation on dead trials). Because the nightly job waits for `reminder_expired_sent_at`, the expired email is not lost.
- `public.dashboard_growth`: its `trial_lapsed` predicate is `status = 'trialing' and trial_end < now()`; extend to `or status = 'trial_expired'` so growth reporting is unchanged. (One-line `create or replace`; include in the same migration if WP2A.2 has already wrapped it — the impl name will be `_dashboard_growth_impl` only if it was in the wrap list; it is **not**, so edit `dashboard_growth` directly.)
- `stripe-webhook` / `sync-subscription`: when a Stripe subscription is created for a parent whose row is `trial_expired`, the existing upsert overwrites `status` with Stripe's value — verify on staging that the upsert does not filter on `status = 'trialing'`.
- Add `trial_expired` to the `SubscriptionState`-adjacent status comment in `0004` docs and to `billing-diagnostics` allowed-status list if it validates local rows.

## 3. Rollback

```sql
begin;
select cron.unschedule('expire-parent-trials-nightly');
drop function if exists app_private.expire_parent_trials(interval);

-- Reverse the status flip (safe: the read model derives the same state either way).
update public.parent_subscriptions
   set status = 'trialing', updated_at = now()
 where status = 'trial_expired';

-- Restore previous parent_subscription_state (no 'trial_expired' status branch).
create or replace function public.parent_subscription_state(p_parent uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare s parent_subscriptions%rowtype;
begin
  select * into s from parent_subscriptions where parent_id = p_parent;
  if not found or s.status = 'none' then return 'none'; end if;
  if s.status = 'trialing' then
    if s.trial_end is not null and s.trial_end <= now() then return 'trial_expired'; end if;
    return 'trial_active';
  end if;
  if s.status in ('past_due','unpaid') then return 'payment_failed'; end if;
  if s.status = 'active' then
    if s.cancel_at_period_end then return 'cancelled_active'; end if;
    return case when s.plan_interval = 'year' then 'active_annual' else 'active_monthly' end;
  end if;
  if s.status = 'canceled' then
    if s.current_period_end is not null and s.current_period_end > now() then return 'cancelled_active'; end if;
    return 'expired';
  end if;
  return 'expired';
end; $$;
commit;
```

## 4. Staging test plan

1. Seed: A `trialing` with `trial_end = now()-1h`, email not sent; B `trialing`, `trial_end = now()-3d`, email not sent; C `trialing`, `trial_end = now()-1h`, `reminder_expired_sent_at` set; D `trialing`, `trial_end = now()+2d`; E `trialing` expired with `stripe_subscription_id` set.
2. `select app_private.expire_parent_trials()` → B and C flip; A (within grace, email pending), D (live), E (Stripe-managed) unchanged. `parent_subscription_state` for A,B,C = `trial_expired`, D = `trial_active`.
3. Run `email-dispatch` → A receives the expired email; next nightly run flips A.
4. Checkout for B → `trialDays = 0`; Checkout for D → days remaining carried over (unchanged behaviour).
5. Stripe webhook `customer.subscription.created` for B → row becomes `active`/`trialing` per Stripe (verifies the upsert does not require `status='trialing'`).
6. `cron.job_run_details` shows `succeeded` for `expire-parent-trials-nightly`.
