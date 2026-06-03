# Parent Subscription Layer — rollout & verification

This document maps every success-criteria bullet from the product spec to a
concrete file, route, RPC, or Stripe operation. It's the "things-I-can-do-at-
the-end" checklist for QA.

## Architecture summary

| Layer       | Where                                                       |
| ----------- | ----------------------------------------------------------- |
| Schema      | `supabase/migrations/0004_parent_subscriptions.sql`         |
| Schema v2   | `supabase/migrations/0007_parent_subscriptions_v2.sql`      |
| RLS         | `supabase/migrations/0005_rls.sql`                          |
| RPCs        | `supabase/migrations/0006_rpcs.sql` + `0007…v2.sql`         |
| Edge fns    | `supabase/functions/stripe-{checkout,portal,webhook}` + `sync-subscription` |
| Frontend    | `src/pages/parent/*`, `src/context/ParentContext.tsx`       |
| Client API  | `src/lib/parentApi.ts`                                      |
| Auth helpers| `src/lib/supabase.ts` (signUpWithEmail, signInWithEmail, …) |
| Selector    | `src/features/parent/ChildProfileSelector.tsx`              |
| Narrator    | `src/lib/parent/progressNarrator.ts`                        |

Subscription state is derived **server-side** by `parent_subscription_state()`
and surfaced as `subscription.state` from `get_parent_overview()`. The
frontend never trusts a local flag.

## Deployment order

1. Set Supabase secrets (server-side, never `VITE_`):
   ```
   supabase secrets set \
     STRIPE_SECRET_KEY=sk_live_… \
     STRIPE_WEBHOOK_SECRET=whsec_… \
     SUPABASE_SERVICE_ROLE_KEY=eyJ… \
     SUPABASE_URL=https://….supabase.co \
     SUPABASE_ANON_KEY=eyJ… \
     PARENT_APP_URL=https://drawintheair.com
   ```
2. Apply migrations: `supabase db push` (0004 → 0007 in order).
3. Insert Stripe Price IDs into `stripe_price_map`:
   ```sql
   update stripe_price_map set stripe_price_id='price_…' where price_key='base.month';
   update stripe_price_map set stripe_price_id='price_…' where price_key='base.year';
   update stripe_price_map set stripe_price_id='price_…' where price_key='addon.month';
   update stripe_price_map set stripe_price_id='price_…' where price_key='addon.year';
   ```
4. Deploy edge functions:
   ```
   supabase functions deploy stripe-checkout
   supabase functions deploy stripe-portal
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy sync-subscription
   ```
   `stripe-webhook` MUST be `--no-verify-jwt` — Stripe doesn't send a
   Supabase JWT. The Stripe signature header is verified inside the function.
5. Point the Stripe webhook endpoint at
   `https://<project>.supabase.co/functions/v1/stripe-webhook` and subscribe
   to: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `customer.subscription.trial_will_end`, `invoice.payment_failed`,
   `invoice.payment_succeeded`.
6. Set frontend env vars (Vercel / `.env`): `VITE_STRIPE_PUBLISHABLE_KEY`,
   `VITE_PARENT_RETURN_URL`. The existing `VITE_SUPABASE_*` are reused.
7. Deploy frontend.

## Spec success criteria

| Bullet                                        | Verified via                                              |
| --------------------------------------------- | --------------------------------------------------------- |
| Create a parent account                       | `/parent/signup` → `signUpWithEmail` + signup trigger     |
| Start a 14-day free trial                     | `/subscribe?plan=…` → Stripe Checkout w/ `trial_period_days` |
| Add a child profile                           | `/parent/children` → `child_profiles` insert + `sync-subscription` |
| Select that child before gameplay             | `<ChildProfileSelector>` in `App.tsx` menu state          |
| Play activities                               | Existing `/play` flow (unchanged)                          |
| Save progress                                 | `analytics.ts` writes `child_profile_id` on `learning_attempts` rows |
| Return later and resume learning              | sessionStorage `dita-selected-child` + `get_child_dashboard()` |
| View parent dashboard                         | `/parent/dashboard` → `get_parent_overview` + `get_child_dashboard` |
| See progress in plain English                 | `src/lib/parent/progressNarrator.ts`                       |
| Manage subscription                           | `/parent/billing` → `stripe-portal` edge function          |
| Cancel subscription                           | Stripe Customer Portal (cancellation row mirrored via webhook → `cancel_at_period_end`) |
| Delete child data                             | `request_child_deletion(uuid)` RPC                         |
| Verify RLS blocks cross-parent reads          | `supabase/migrations/tests/parent_rls_test.sql`            |

## Family-plan scaling math (sanity numbers)

| Active learners | Monthly      | Annual         | Notes                       |
| --------------- | ------------ | -------------- | --------------------------- |
| 1               | $4.99        | $54.99         | base only                   |
| 2               | $4.99        | $54.99         | base only (2 included)      |
| 3               | $4.99 + $2.00 = $6.99 | $54.99 + $21.99 = $76.98 | one addon billed       |
| 4               | $8.99        | $98.97         | two addons                  |
| 5               | $10.99       | $120.96        | three addons                |

Formula lives in `pricing_amount_cents(interval, active_children)` (0006) and
is editable via `pricing_config` — no code release required to change it.

## Non-spec guarantees

- **Anonymous /play untouched.** `ChildProfileSelector` renders nothing if the
  parent isn't signed in. `learning_attempts` rows from anonymous sessions
  keep `child_profile_id = NULL` and fall under the `attempts_school_rows`
  RLS policy.
- **School learners untouched.** Migration 0004 alters the existing
  `learning_attempts` / `lios_state` tables additively; the `attempts_one_subject`
  constraint allows rows with neither (anonymous) or exactly one
  (parent OR school) of the two ids set.
- **No child PII in analytics.** The new parent funnel events
  (`parent_signup_started` … `parent_account_deletion_requested`) carry
  only counts / ids — never nicknames, never raw email addresses.
- **Subscription state is server-truth.** `parent_subscription_state()` is
  SECURITY DEFINER and self-scoped to `auth.uid()`. Frontend never derives.
- **Stripe Customer Portal owns cancellation.** PCI surface stays tiny;
  cancellation, card update, receipts all live in Stripe's UI.
