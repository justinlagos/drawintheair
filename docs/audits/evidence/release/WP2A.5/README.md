# WP2A.5 — expired trial states (DIA-015)

Status: **rehearsed on staging, awaiting Justin's written go for production.**
Nothing has been applied to production. Branch `wp/2a-db`.

Design: `EXPIRED_TRIALS_DIA-015.md` in this directory.

## What changed and why

Nothing ever moved a local card-free trial out of `status = 'trialing'`.
`parent_subscription_state()` derives `'trial_expired'` at read time, so parents
have always seen the right screen, but every report or job that filters on the
raw `status` column counted a months-old lapsed trial as live:
`dashboard_growth`'s subscription split, `email-dispatch`'s working set,
`billing-diagnostics`.

This package adds `app_private.expire_parent_trials(interval)`, a nightly cron
job that calls it, a one-off catch-up for the backlog, and the read-model and
growth-reporting changes that keep the user-visible behaviour identical.

The new terminal status is **`trial_expired`**, not `expired`, so the client
keeps the "Trial ended" copy (`describeSubscriptionState`) rather than
"Subscription expired".

### Two things the transition must not break

1. **The "your trial has ended" email.** `email-dispatch`
   (`supabase/functions/email-dispatch/index.ts:127`) selects
   `status in ('trialing')` and sends that email when `trial_end <= now` and
   `reminder_expired_sent_at is null`. Flipping the status first would lose the
   email permanently. The transition therefore only moves a row once
   `reminder_expired_sent_at` is set, or once a **48 hour grace** has passed and
   the dispatcher clearly did not run. `email-dispatch` is left unchanged: the
   rows dropping out of its working set is the intended effect.
2. **Stripe-managed subscriptions.** Rows with a `stripe_subscription_id` are
   reconciled against Stripe by `billing-health` and are excluded here. Verified:
   0 of the 31 production rows carry one.

`stripe-checkout` needed no change. It carries remaining trial days into Checkout
only when `status = 'trialing'`; an expired trial already yielded 0 days, so
`trial_expired` is equivalent.

`dashboard_growth` is edited directly rather than through the WP2A.2 wrapper,
because it is the one `dashboard_*` function that already carried its own admin
guard and WP2A.2 leaves it unwrapped. Only two expressions change:
`trial_lapsed` now also matches `status = 'trial_expired'`, and the `canceled`
count excludes it. Growth reporting therefore reads exactly the same before and
after.

`src/lib/parent/parentReport.ts` gains a `trial_expired` case in
`describeStatus` ("Free trial ended"), which is the one place that renders the
raw status column to a parent.

## Production dry run, re-verified read-only on 2026-09-08

```sql
select
 (select count(*) from parent_subscriptions)                                                    subs_total,
 (select count(*) from parent_subscriptions where status = 'trialing')                          subs_trialing,
 (select count(*) from parent_subscriptions where status = 'trialing' and trial_end <= now())   subs_trialing_expired,
 (select count(*) from parent_subscriptions where status = 'trialing' and trial_end is null)    subs_trialing_null_end,
 (select count(*) from parent_subscriptions where status = 'trialing' and trial_end <= now()
     and stripe_subscription_id is not null)                                                    expired_with_stripe_sub,
 (select count(*) from parent_subscriptions where status = 'trialing' and trial_end <= now()
     and reminder_expired_sent_at is null)                                                      expired_email_not_yet_sent,
 (select count(*) from parent_subscriptions where status = 'trialing'
     and trial_end <= now() - interval '48 hours')                                              expired_beyond_grace,
 (select string_agg(status||':'||n, ', ') from (select status, count(*) n from parent_subscriptions group by 1) x) by_status;
```

| metric | 2026-09-07 | 2026-09-08 |
|---|---|---|
| subscriptions total | 33 | 33 (`active: 2`, `trialing: 31`) |
| `trialing` with `trial_end <= now()` | 31 | **31 (100% of trialing rows)** |
| `trialing` with null `trial_end` | 0 | 0 |
| expired rows with a Stripe subscription id | 0 | 0 |
| expired rows whose trial-ended email is still pending | 0 | 0 |
| expired rows past the 48 h grace | 31 | 31 |

**Expected production effect of the catch-up: exactly 31 rows flip from
`trialing` to `trial_expired`, leaving `active: 2, trial_expired: 31`.** No
parent's screen changes, because `parent_subscription_state()` already returned
`trial_expired` for all 31.

If WP2A.4 is applied first, its 9 new trials start from now and are therefore
live, not expired, so they are not touched by this catch-up. The two packages
are order-independent.

## Files

| file | sha256 (at authoring) |
|---|---|
| `supabase/migrations/20260914000005_trial_expiry_transition.sql` | `745cadde4937d62deffe915b096abab7664b64dc49193fedf0296e37274c39ed` |
| `supabase/migrations/rollbacks/20260914000005_trial_expiry_transition_rollback.sql` | `69bb0c4d71b61bfe15a8e2af9d3409028fa2fd24fa3e6dc53dac229bcf890b84` |
| `tests/trial-expiry.test.ts` | 19 vitest cases |

**The production SQL is the migration file, applied verbatim.** Check the hash
before applying.

## Staging rehearsal, 2026-09-08 (project `dcivdrhxeaiulbbhsgfv`)

Five fixtures covering every branch of the predicate:

| fixture | state | expected | result |
|---|---|---|---|
| A | expired 1 h ago, trial-ended email not sent | stays `trialing` (inside grace), reads `trial_expired` | pass |
| B | expired 3 d ago, email not sent | flips to `trial_expired` (past grace) | pass |
| C | expired 1 h ago, email sent | flips to `trial_expired` | pass |
| D | live trial, ends in 2 d | stays `trialing`, reads `trial_active` | pass |
| E | expired 3 d ago, has `stripe_subscription_id` | untouched, left to billing-health | pass |

| metric | before | after |
|---|---|---|
| by status | `active: 2, trialing: 17` | `active: 2, trialing: 14, trial_expired: 3` |
| eligible rows remaining | 3 | **0** |

3 transitioned = B, C and one pre-existing staging row. The nine WP2A.4
backfilled trials (live, `trial_end` in the future) were correctly untouched.

Further checks, all passed:

* `app_private.expire_parent_trials()` called with a `request.jwt.claims` set
  raises `42501 not callable over the API`.
* A second run in the same state transitions 0 rows (idempotent).
* `dashboard_growth` as a platform admin reports the flipped rows under
  `trial_lapsed`, and `canceled` stays 0.
* `cron.job` shows `expire-parent-trials-nightly` at `30 1 * * *`, active.

### Rollback rehearsal

The rollback was applied: the job was unscheduled, the function dropped, all 3
`trial_expired` rows returned to `trialing`, and
`parent_subscription_state()` still returned `trial_expired` for fixture B, so
no parent would have seen a change in either direction. The forward migration
was then re-applied and the assertions passed again.

## Verification queries to run after applying to production

```sql
-- 1. Expect active: 2, trial_expired: 31, and no trialing rows left.
select status, count(*) from public.parent_subscriptions group by 1 order by 1;

-- 2. No eligible row was missed. Expect 0.
select count(*) from public.parent_subscriptions
 where status = 'trialing' and trial_end is not null and trial_end <= now()
   and stripe_subscription_id is null
   and (reminder_expired_sent_at is not null or trial_end <= now() - interval '48 hours');

-- 3. Nothing Stripe manages was touched. Expect 0.
select count(*) from public.parent_subscriptions
 where status = 'trial_expired' and stripe_subscription_id is not null;

-- 4. The read model is unchanged for every parent. Expect 0 rows.
select ps.parent_id, ps.status, public.parent_subscription_state(ps.parent_id) as state
  from public.parent_subscriptions ps
 where ps.status = 'trial_expired'
   and public.parent_subscription_state(ps.parent_id) <> 'trial_expired';

-- 5. The nightly job is scheduled and active.
select jobname, schedule, active, command from cron.job
 where jobname = 'expire-parent-trials-nightly';

-- 6. Not reachable over the API. Expect false, false.
select has_function_privilege('anon','app_private.expire_parent_trials(interval)','EXECUTE'),
       has_function_privilege('authenticated','app_private.expire_parent_trials(interval)','EXECUTE');
```

Next morning, after the first scheduled run:

```sql
select status, start_time, return_message
  from cron.job_run_details d join cron.job j on j.jobid = d.jobid
 where j.jobname = 'expire-parent-trials-nightly'
 order by start_time desc limit 5;   -- expect status = 'succeeded'
```

## Rollback

Run `supabase/migrations/rollbacks/20260914000005_trial_expiry_transition_rollback.sql`.
It unschedules the job first so nothing can re-flip rows mid-rollback, drops the
function, reverses every `trial_expired` row back to `trialing`, and restores the
previous `parent_subscription_state()`. `trial_expired` is written only by
`expire_parent_trials()`, so reversing every such row is exact.

`dashboard_growth` can be left on the forward version: with no `trial_expired`
rows remaining, the old and new predicates give identical answers. The rollback
file documents the two expressions to swap back if a byte-identical restore is
wanted.

## What the founder must do by hand

1. Re-run the dry-run query. If `subs_trialing_expired` is not 31, the count in
   this document is stale but the migration is still safe: it asserts that the
   number it moved equals the number that matched, and that none are left.
2. Give written go, apply, run the verification queries.
3. Check `cron.job_run_details` the following morning for the first scheduled
   run, and again after three nights alongside the Gate 4 retention checks.
4. Nothing here is coupled to a client deploy. The read model answers the same
   before and after, so this can be applied at any point in Gate 3.

## Out of scope, logged not fixed

* `parent_subscriptions.status` is free text with no CHECK constraint.
  `trial_expired` is a new value in an already unconstrained vocabulary. A CHECK
  constraint or an enum would be a schema change with its own coupling to the
  Stripe webhook and is not attempted here. Findings log entry 47.
* `billing-diagnostics` validates local rows against the Stripe status list; it
  reconciles by `stripe_subscription_id`, which these rows do not have, so it is
  unaffected. Worth a look when that function is next edited.
