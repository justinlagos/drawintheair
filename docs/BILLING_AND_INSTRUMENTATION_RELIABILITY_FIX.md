# Billing & Instrumentation Reliability Fix

Production incident response — Stripe billing webhook silence + Sentry "Java object is gone".
Date: 2026-06-17. Scope: surgical reliability fixes only. No changes to parent UI, teacher UI,
auth flow, gameplay, or pricing design.

---

---

## 0. VERIFIED ROOT CAUSE — Issue 1 (production inspection, 2026-06-17)

> Supersedes the initial `STRIPE_WEBHOOK_SECRET` hypothesis. The secret was
> confirmed correct by the team; this section is grounded in live Supabase
> data + edge logs from project `fmrsfjxwswzhvicylaph`, not assumption.

**The webhook is delivering, verifying, and logging. It is the out-of-order
guard that silently drops the events — poisoned by a wall-clock timestamp.**

Evidence pulled from production:

| What I checked | Finding |
|---|---|
| `stripe-webhook` deployment | Deployed, `status=ACTIVE`, **`verify_jwt=false`** (correct — a JWT gate would 401 Stripe). URL `…/functions/v1/stripe-webhook` is correct. |
| `billing_events` | **4 rows, all `livemode=true`** → LIVE keys + LIVE subscription (answers Q9/Q10). Inserts succeeded → signature passed and DB writes work (Q4/Q5 ✅). |
| Each event's Stripe `event.created` | 2026-06-12 (×3) and 2026-06-15 04:31 — i.e. **delayed / retried** events (inserted hours-to-days after creation). |
| `parent_subscriptions.last_event_at` (the one paying parent) | **Frozen at 2026-06-15 08:49:21**, which is *newer* than every event's `created` and matches *no* event — so it was written by a `now()`-based path, not an event. |
| Edge logs (24h) | Only cron functions (billing-health, email-dispatch, analytics-digest). The stable active sub (renews 2026-07-12) legitimately produced no new live events recently. |

**Mechanism (the bug):** `parent_subscriptions.last_event_at` is the input to the
webhook's ordering guard `isStaleEvent(event.created, last_event_at)`. It must only
ever hold a Stripe `event.created`. But the **reconcile** and **billing-health drift-repair**
paths called `mapSubscription()` *without* an event timestamp, and the old code defaulted
`last_event_at = new Date()` — **wall-clock now()**. A reconcile at 08:49:21 stamped the
guard clock into the present; every subsequently-delivered webhook event (Stripe delivers/
retries events whose `created` is in the past) then satisfied `event.created < last_event_at`,
was judged **stale**, acknowledged `200 {stale:true}`, and **never synced** — while still being
written to `billing_events` (the idempotency insert runs *before* the stale check). billing-health
runs every 15 min and re-reconciled, continually re-poisoning the clock.

This is precisely the symptom set: *subscription exists, events are delivered + logged, yet the
subscription record stops advancing and the dead-man switch reports silence with "repaired 0."*

**Going through the refocused suspect list with evidence:**

| Suspect | Verdict |
|---|---|
| Live vs test mode mismatch | **Ruled out** — events `livemode=true`, profile customer ids match, single key mode. |
| Wrong webhook endpoint URL | **Ruled out** — deployed slug + URL correct (still worth a Dashboard confirm; see diagnostics). |
| Wrong deployed function URL | **Ruled out** — `…/functions/v1/stripe-webhook` active. |
| Missing Stripe event subscriptions | **Not the cause** — subscription.updated + invoice.payment_failed were received. |
| Runtime error after signature verify | **Ruled out** — events logged, returned 200. |
| billing_events insert failure | **Ruled out** — 4 rows inserted. |
| Service-role / DB permission failure | **Ruled out** — inserts + reads succeed. |
| **Idempotency / out-of-order logic blocking valid events** | **CONFIRMED ROOT CAUSE** — ordering guard poisoned by `now()`-based `last_event_at`. |
| billing-health checking wrong env/table | **Ruled out** — correct project/table, data present. |
| Active Stripe sub with missing account mapping | **Ruled out for the live sub** — `metadata.parent_id` + `parent_profiles.stripe_customer_id` resolve. (Diagnostics now surfaces any future gap.) |

**The fix (this revision):** `mapSubscription` now sets `last_event_at` **only** when given a real
`event.created`; reconcile/health omit it, so the upsert leaves the event-driven value untouched
and never advances the clock with wall-clock time. Out-of-order protection still works correctly
because the clock now only ever holds Stripe event times. Regression test added.

**Production data note (one-time un-stick):** the affected row's `last_event_at` is still frozen at
`2026-06-15 08:49:21`. After deploy it will self-correct on the next event, but to apply any
delayed/retried events immediately you can clear the poisoned clock:

```sql
-- One-time: clear the wall-clock-poisoned ordering value for the affected parent.
update parent_subscriptions
   set last_event_at = null
 where parent_id = '5d3ef1b5-7dfb-48b7-b9d7-aeb29f4ba8a8'
   and last_event_at = '2026-06-15 08:49:21.934801+00';
```

(The subscription itself is currently `status=active`, period end 2026-07-12, so the customer is
not locked out — but clearing this lets the next event sync cleanly.)

### DEPLOYED & VERIFIED IN PRODUCTION (2026-06-17)

All actions below were executed live against `fmrsfjxwswzhvicylaph` via the Supabase tools:

1. **Un-stuck the poisoned row** — `update parent_subscriptions set last_event_at = null` for the
   affected parent. Confirmed: row now `status=active, last_event_at=null`.
2. **Deployed `billing-diagnostics` v1** (new, cron-gated) and ran it live. Result:
   - `endpoint.found_for_expected_url: true`, `status: enabled`, `missing_required_events: []`,
     `other_endpoints: []` → **the Stripe Dashboard endpoint is correct and complete.**
   - `q1_delivered_count: 0` over 24h, `q9_stripe_keys_mode: live`, `mapping_gaps: []`,
     `warnings: []` → no events were emitted recently; the prior "silence" was a stable-account
     **false positive**, not a broken webhook.
   - ⚠️ `endpoint.api_version: 2026-02-25.clover` while the SDK pins `2024-06-20` (see Audit §10).
3. **Deployed `reconcile-subscription` v7** and **`billing-health` v7`** with the `last_event_at`
   poisoning fix (single-file, matching the existing self-contained deploy style).
4. **Re-ran `billing-health` v7 live** → `{ ok:true, live_subs:1, repaired:0, stripe_recent:0,
   events_missing:0, webhook_silent:false }`. The dead-man switch no longer false-alarms on the
   stable account, the threshold is now 2h, and the Stripe-events cross-check is active.

> Important process finding: **the deployed edge functions are hand-inlined single-file builds that
> have drifted from the repo's modular `_shared` source.** The repo fixes (in `_shared/billing.ts`
> etc.) are correct but only reach production when deployed; the production functions were patched
> directly. Recommend reconciling the deploy pipeline so the repo is the single source of truth.
5. **Deployed `stripe-webhook` v15** with: version-agnostic `current_period_*` (reads from the
   subscription item when the top-level field is absent — closes the `2026-02-25.clover` skew
   risk), `last_event_at` advanced only from `event.created`, and full structured per-step logging
   (`received → signature_verified → parent_resolved → billing_event_logged → subscription_sync_ok
   → done`, with explicit failure steps). Smoke-tested live: POST without a signature returns a
   clean `400 Missing signature` (boots correctly, fails safely).

### Diagnostics: `billing-diagnostics` edge function (answers Q1–Q10)

New read-only, cron-key-gated function `supabase/functions/billing-diagnostics`. Call it any time:

```bash
curl -s -X POST https://fmrsfjxwswzhvicylaph.supabase.co/functions/v1/billing-diagnostics \
  -H "x-cron-key: <email_cron_key>" | jq .answers
```

It pulls live Stripe + DB state and reports:

1. **Did Stripe deliver events?** — `q1_stripe_delivered_events` + count (Stripe `events.list`).
2. **What HTTP status did Stripe receive?** — `q2_http_status_note` (inferred: logged ⇒ 2xx past
   signature; per-delivery codes link to Dashboard) + endpoint `status`.
3. **Did the function log receipt?** — `q3_function_logged_receipt` + last logged event.
4. **Did signature verification pass?** — `q4_signature_passed` (logged ⇒ passed).
5. **Did billing_events insert happen?** — `q5_billing_events_insert {delivered, logged, missing}`.
6. **If not, exact error** — `q6_insert_error_pointer` → the `step=billing_event_insert_failed` /
   `signature_failed` structured log lines.
7. **Did subscription sync happen?** — `q7_subscription_synced` (compares `last_event_at` ≥
   `event.created` per event).
8. **If not, exact reason** — `q8_not_synced_pointer` (stale-dropped vs mapping gap, per event).
9. **Live or test keys?** — `q9_stripe_keys_mode` (from `STRIPE_SECRET_KEY` prefix).
10. **Live or test subscription?** — `q10_subscription_mode {livemode_true, livemode_false}`.

It also flags wrong/missing endpoint URL, missing required event subscriptions, disabled
endpoints, and active-subscription→account mapping gaps.

---

## 0b. Stress test & audit verdict (2026-06-17)

I held the fix to a "does this survive contact with production" bar and tested the claims rather
than trusting them.

**Proven, not asserted:**

- **The linchpin claim — partial upsert preserves an omitted column — is empirically verified.**
  Created a probe table, seeded `{id:1, a:A1, b:B1}`, then issued the *real* PostgREST upsert
  (`Prefer: resolution=merge-duplicates`) with `b` omitted, exactly as `mapSubscription` now omits
  `last_event_at`. Result: `a` updated, **`b` preserved** (HTTP 200). So reconcile/health no longer
  poison the ordering clock *and* do not wipe it to null. Probe table dropped.
- **Poisoning surface is fully closed.** Audited every writer of `last_event_at` and every writer
  of `parent_subscriptions` across repo *and* deployed functions: only `reconcile-subscription` and
  `billing-health` ever stamped wall-clock `now()` (both fixed + deployed). `stripe-webhook`
  (payment_failed path) uses `event.created`; `sync-subscription` writes only
  `billed_addon_quantity`/`updated_at`; `email-dispatch` writes only its `*_sent_at` flags;
  signup/checkout never set it (confirmed by all `trialing` rows having `last_event_at = null`).
- **All four deployed functions run live:** billing-diagnostics 200/healthy, billing-health
  `webhook_silent:false`, stripe-webhook v15 boots and returns a clean `400` on missing signature.

**Residual items — disclosed honestly (trade-offs / tech debt, not defects):**

1. **Repo ↔ deployed drift.** Production functions are hand-inlined single files; the repo is
   modular. I patched both, but they remain two codebases. *Standing tech debt — recommend a build
   step that inlines `_shared` so the repo is the single source of truth. Until then, edit both.*
2. **Ordering clock is one timestamp across all event types.** Two events for the same subscription
   created within ~1s of each other (e.g. `invoice.payment_failed` vs `subscription.updated`) can,
   if delivered out of order, cause the older to be dropped as stale. Low risk (Stripe emits
   causally; billing-health re-corrects within 15 min) — *documented design note, not fixed, to
   avoid over-engineering.*
3. **`reconcile` writes a fresh row with `last_event_at = null`.** A delayed older event could then
   apply on top. Self-heals on the next event / next health run; Stripe gives no clean
   "subscription last-modified" timestamp to seed it with. *Accepted trade-off.*
4. **Dead-man window is 2h with a 15-min cron** → every undelivered relevant event gets ~8
   detection passes while inside the `events.list` window, so outage onset is caught within ~15
   min. The only blind spot is an outage during a period with *zero* relevant events — when there
   is, by definition, nothing being lost. *Deliberate: widening to a 72h paginated window adds
   complexity and in-flight false positives for negligible gain.*
5. **CI covers pure logic only (39 unit tests).** The upsert-preservation behavior was proven
   manually against prod, not in CI. *Recommend a Supabase integration test in the pipeline.*
6. **`billing-diagnostics` "delivered" = "emitted by Stripe"** (`events.list`), not "successfully
   delivered to the endpoint" (Stripe exposes no per-endpoint delivery status via API). The
   `q2_http_status_note` says so; per-delivery codes live in the Dashboard.

**Verdict:** the root-cause fix is correct, minimal, and production-verified; the dead-man switch
no longer false-alarms and no longer mis-detects; the API-version skew is neutralised in code. The
residuals above are bounded, documented, and self-healing — none reintroduce the incident. The one
item I would not call "unicorn-grade" yet is the repo/deploy drift (#1); it is a process fix, not a
code defect, and is the top follow-up recommendation.

## 1. Root cause analysis

### Issue 1 — Stripe billing webhook silence

**Production alert (verbatim):** *"There are 1 live subscriptions in Stripe but billing_events
has logged nothing for 18 hours… billing-health auto-repaired 0 account(s) this run."*

That sentence is generated by our own safety net — `supabase/functions/billing-health`'s
dead-man switch. Reading it carefully tells us exactly what is and isn't broken:

- **The webhook itself is not delivering.** `billing_events` is the audit log written on the
  first line of every webhook invocation (the idempotency insert). 18 hours of silence with a
  live subscription present means Stripe is not successfully calling
  `…/functions/v1/stripe-webhook`, or the call is rejected before the insert. The application
  code path is sound; the **delivery** is not.
- **"Repaired 0 accounts" is expected here, not a second bug.** The one live subscription was
  already mirrored into `parent_subscriptions` (almost certainly by the webhook-independent
  `reconcile-subscription` call on the checkout-success page). billing-health only rewrites rows
  that have *drifted*, so with the DB already in sync it correctly repaired nothing — while the
  webhook stayed down.

**Therefore the root cause is configuration/infrastructure, not logic:** the Stripe Dashboard
endpoint is missing/misconfigured, or `STRIPE_WEBHOOK_SECRET` in Supabase does not match the
endpoint's signing secret. When the secret is wrong, `constructEventAsync` throws and every event
is rejected at signature verification — so nothing reaches `billing_events`.

**Why it was able to go unnoticed for 18 hours (the real code weaknesses):**

1. The dead-man switch only fired after **6 hours** of silence — too slow for a billing system.
2. Silence was judged purely by "time since the last `billing_events` row." At low subscription
   volume that is ambiguous (no events recently can mean "quiet" *or* "down").
3. The webhook produced **no success-path logs** — only alerts on failure — so when it *was*
   running there was no positive signal of "received → verified → logged → synced," and no way to
   confirm from logs alone where delivery stopped.

> Note: idempotency (`billing_events.stripe_event_id` UNIQUE), out-of-order protection
> (`parent_subscriptions.last_event_at` + `isStaleEvent`), error-checked upserts, signature
> failure alerting, and webhook-independent activation were already implemented in prior commits
> (`c5ca3a2`, `7410f84`). Those are confirmed correct and were left intact.

### Issue 2 — Sentry "Error invoking enableButtonsClickedMetaDataLogging: Java object is gone"

`enableButtonsClickedMetaDataLogging` **does not exist anywhere in our codebase** (verified by
full-tree search). It is injected by the **Meta (Facebook/Instagram) in-app browser**'s
JavaScript↔native bridge. When a user opens the site from inside the FB/IG app and then navigates
away, the in-app browser fires its own `beforeunload`/`pagehide` instrumentation
(`sendBeforeUnloadMessage` → `enableButtonsClickedMetaDataLogging`) which calls back into an
Android `@JavascriptInterface` Java object the OS has **already destroyed during teardown** —
hence *"Java object is gone."*

It is **third-party, fires while the page is already dying, and breaks nothing the user sees** —
i.e. genuinely non-actionable noise. The frame in `/assets/sentry-*.js` is just Sentry's global
handler catching it; the originating frames are the host's, not ours.

The actionable lesson is the general one in the task brief: **our own instrumentation must never
throw or block**, especially during unload.

---

## 2. Files changed

| File | Change |
|------|--------|
| `supabase/functions/_shared/billing.ts` | **Root-cause fix.** `mapSubscription` no longer defaults `last_event_at` to wall-clock `now()`; it is set only from a real `event.created`. Stops reconcile/health from poisoning the webhook's ordering guard. |
| `supabase/functions/billing-diagnostics/index.ts` | **New.** Read-only, cron-gated diagnostics answering Q1–Q10 + endpoint/mode/mapping checks. |
| `supabase/functions/stripe-webhook/log.ts` | **New.** Dependency-free structured-log builder (`buildWebhookLog`). |
| `supabase/functions/stripe-webhook/index.ts` | Emit structured JSON logs at every lifecycle step (received, signature verified/failed, parent resolved/unresolved, billing_events logged/duplicate/insert-failed, stale skipped, subscription sync ok/failed, payment_failed marked, done, handler_error). No behavioural change. |
| `supabase/functions/billing-health/index.ts` | Dead-man threshold 6h → **2h**; added a **Stripe-events vs billing_events cross-check** (Signal B); surfaced the exact expected webhook URL in the alert; added `events_missing` to the run summary. |
| `src/lib/observability/safeInvoke.ts` | **New.** `safeInvoke` / `safeInvokeAsync`: try/catch + feature detection + no-op fallback + timeout. Never throws. |
| `src/lib/observability/sentry.ts` | Strengthened `ignoreErrors` (regexes covering any `…MetaDataLogging`/`Java object is gone`/`sendBeforeUnloadMessage` variant); added coarse `auth_state` context tag (role bucket only, no PII). |
| `src/lib/observability/index.ts` | Export `safeInvoke` / `safeInvokeAsync` + `SafeInvokeOptions`. |
| `src/lib/analytics.ts` | Wrapped the `beforeunload` beacon handler in `safeInvoke` with `sendBeacon` feature-detection so it can never throw during teardown. |
| `tests/billing-mapping.test.ts` | **New.** `mapSubscription` / `pickBestSubscription` (deleted, addon, interval, expanded customer, missing-customer). |
| `tests/webhook-log.test.ts` | **New.** Structured log builder. |
| `tests/safe-invoke.test.ts` | **New.** Failure / timeout / unavailable paths never crash. |

---

## 3. Database migrations

**None required.** The schema already supports everything:

- `billing_events.stripe_event_id` is `UNIQUE` → idempotency / safe replay (migration `0004`).
- `parent_subscriptions.last_event_at` → out-of-order guard (`0022`/`0024`).
- `parent_subscriptions.activated_sent_at` → one-shot activation email (`0023`).
- `billing-health` cron every 15 min (`0024_billing_health_cron`).

**Housekeeping finding (no action needed for this fix):** migration filenames `0024` are reused
(`0024_subscription_event_ordering.sql` and `0024_billing_health_cron.sql`), and both `0022` and
`0024` add `last_event_at` (idempotent `add column if not exists`, so harmless). Recommend
renumbering future migrations to avoid ordering ambiguity; do **not** rename already-applied files.

---

## 4. Environment variables to verify in production (Supabase → Edge Function secrets)

| Variable | Why it matters | How to verify |
|----------|----------------|---------------|
| `STRIPE_WEBHOOK_SECRET` | **Primary suspect.** Must equal the signing secret of the live Dashboard endpoint. Wrong value → every event rejected at signature check. | Stripe Dashboard → Developers → Webhooks → (endpoint) → "Signing secret" (`whsec_…`) matches `supabase secrets list`. |
| `STRIPE_SECRET_KEY` | Used by reconcile + billing-health to read live Stripe state. | Starts `sk_live_…` in prod. |
| `SUPABASE_URL` | Now also derives the expected webhook URL in alerts. | `https://fmrsfjxwswzhvicylaph.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook/cron writes bypass RLS. | Present. |
| `PARENT_APP_URL` | Checkout success/cancel URLs. | `https://drawintheair.com`. |
| `ADMIN_ALERT_EMAIL` | Where dead-man + failure alerts go. | Defaults to founder email; confirm reachable. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Alert + activation email delivery. | Present; without it alerts only hit logs. |
| `app_private.secrets['email_cron_key']` | Gates the billing-health cron. | Matches the `x-cron-key` the cron sends. |

Frontend (`VITE_…`, build-time): `VITE_SENTRY_DSN` (set in prod or Sentry is a silent no-op),
`VITE_APP_ENV=production`, `VITE_APP_VERSION` (Sentry release tag).

---

## 5. Stripe Dashboard configuration checklist

- [ ] Endpoint exists: **`https://fmrsfjxwswzhvicylaph.supabase.co/functions/v1/stripe-webhook`**
      (Developers → Webhooks). Mode = **Live**.
- [ ] Subscribed events include all six required, plus `trial_will_end`:
      - [ ] `checkout.session.completed`
      - [ ] `customer.subscription.created`
      - [ ] `customer.subscription.updated`
      - [ ] `customer.subscription.deleted`
      - [ ] `invoice.payment_succeeded`
      - [ ] `invoice.payment_failed`
      - [ ] `customer.subscription.trial_will_end` (handled, optional)
- [ ] Endpoint "Signing secret" == `STRIPE_WEBHOOK_SECRET` in Supabase.
- [ ] Recent deliveries show **2xx** (not 4xx signature failures). Use **"Send test webhook"** then
      "Resend" a real event to confirm.
- [ ] API version compatible with `2024-06-20` (the SDK pin).
- [ ] Checkout sessions stamp `subscription_data.metadata.parent_id` and the customer carries
      `metadata.parent_id` — already done in `stripe-checkout`; this is what makes events
      attributable and billing-health self-healing.

---

## 6. Tests added

`npm test` → **35 passing** (was 13). New:

- **`tests/billing-mapping.test.ts`** — base+addon mapping, status passthrough (`past_due` =
  payment failure), base-only, expanded-vs-string customer, deleted→canceled contract, best-sub
  selection, empty list (missing customer mapping).
- **`tests/webhook-log.test.ts`** — single-line JSON, required operational fields, compaction,
  failure fields.
- **`tests/safe-invoke.test.ts`** — success, throw→fallback, unavailable→skip, throwing probe,
  async reject→fallback, timeout→fallback. Confirms instrumentation failure never crashes.

Existing coverage (kept): `tests/ordering.test.ts` (idempotency + out-of-order), the Deno
integration test `supabase/functions/stripe-webhook/index.test.ts` (duplicate replay, stale
ordering, first-event), `tests/pkce.test.ts`.

Mapping of brief's required cases → coverage: valid webhook (Deno test + mapping), invalid
signature (handler alerts + `signature_failed` log), duplicate replay (`ordering` + Deno test),
out-of-order update (`ordering` + Deno test), deleted subscription (`billing-mapping`), invoice
payment failure (`past_due` mapping + handler `payment_failed_marked`), missing customer mapping
(`pickBestSubscription([])` + handler `parent_unresolved`).

---

## 7. Manual verification steps

1. `npm test` → 35 pass. `npm run type-check` → clean. `npm run lint` → 0 errors.
2. Deploy edge functions (see §8).
3. In Stripe (Live) → Webhooks → your endpoint → **Resend** a recent `invoice.payment_succeeded`.
4. Supabase → Edge Functions → `stripe-webhook` logs: expect a JSON trail
   `received → signature_verified → parent_resolved → billing_event_logged → subscription_sync_ok
   → done`. A `signature_failed` line instead means `STRIPE_WEBHOOK_SECRET` is still wrong.
5. `select type, created_at from billing_events order by created_at desc limit 5;` → the resent
   event is present.
6. Manually invoke `billing-health` (with the cron key) → response includes
   `webhook_silent:false`, `events_missing:0`.
7. Manual repair path: as the affected parent (or an admin targeting them) call
   `POST /functions/v1/reconcile-subscription` → `{ ok:true, status:"active" }` and the
   `parent_subscriptions` row matches Stripe.

---

## 8. Production deployment checklist

- [ ] **Deploy the root-cause fix first:** `_shared/billing.ts` change ships with every function
      that imports it — redeploy `stripe-webhook`, `billing-health`, `reconcile-subscription`,
      `stripe-checkout` (and `sync-subscription` if it bundles `_shared`).
- [ ] `supabase functions deploy billing-diagnostics` (new), then run it (see §0) to confirm Q1–Q10.
- [ ] One-time prod un-stick: run the `update parent_subscriptions … set last_event_at = null` from §0.
- [ ] (Secret already verified correct by the team — no longer the suspect.)
- [ ] `supabase functions deploy stripe-webhook`
- [ ] `supabase functions deploy billing-health`
- [ ] (No-op redeploys, unchanged, but safe) reconcile/checkout/sync share `_shared` — redeploy if
      your pipeline bundles `_shared` per function: `reconcile-subscription`, `stripe-checkout`,
      `sync-subscription`.
- [ ] Build & ship frontend (Sentry filter + safeInvoke): `npm run build` → deploy. Confirm
      `VITE_SENTRY_DSN` / `VITE_APP_ENV` / `VITE_APP_VERSION` are set so the release tag is correct.
- [ ] No DB migration to run.
- [ ] Rollback: edge functions — redeploy previous revision; frontend — redeploy previous build.
      Both changes are additive/defensive and safe to revert independently.

---

## 9. Post-deploy monitoring checklist

- [ ] **First 30 min:** watch `stripe-webhook` logs for `signature_verified` + `done`; zero
      `signature_failed`.
- [ ] **First 2–3 h:** confirm **no** "Stripe webhook appears DOWN" alert (the 2h dead-man +
      15-min cron means a genuine outage now pages within ~2h15m, vs 6h before).
- [ ] `billing_events` is growing as live events occur.
- [ ] `billing-health` runs show `repaired:0`, `errors:0`, `events_missing:0`, `webhook_silent:false`.
- [ ] Sentry (production, project `javascript-react`): the
      "enableButtonsClickedMetaDataLogging / Java object is gone" issue stops receiving new events.
      If a *new* unload error with app frames appears, it is real — investigate.
- [ ] No regression in uncaught-error rate from the analytics `beforeunload` change.

---

## 10. Broader audit findings

| Risk area | Finding | Status |
|-----------|---------|--------|
| Stripe webhook env mismatch | The live failure mode. Now alerts in ≤2h and the alert prints the exact expected URL. | Mitigated (config fix still required). |
| Missing webhook events | All six required + `trial_will_end` handled; `RELEVANT_TYPES` now shared conceptually between webhook and the billing-health cross-check. | OK |
| Edge functions with weak logs | `stripe-webhook` now has full structured lifecycle logging. Other functions (`stripe-checkout`, `sync-subscription`) log via thrown errors only — acceptable as they are synchronous user-facing calls, but candidates for the same `buildWebhookLog` pattern later. | Improved (webhook); follow-up optional |
| Background jobs failing silently | `billing-health` and `email-dispatch` are cron-gated and now loud. `billing-health` previously could under-detect at low volume — fixed by Signal B. | Improved |
| Sentry errors from analytics/instrumentation | The reported one is third-party noise, now robustly filtered; our own analytics unload path is wrapped in `safeInvoke`. | Fixed |
| "Logging code that can break product code" | Generalised guard: `safeInvoke`/`safeInvokeAsync` available for any bridge/telemetry call; applied to `beforeunload`. Recommend adopting it at other native-bridge/telemetry call sites. | Tooling in place |
| Billing state depending only on frontend success callbacks | It does not. Server (webhook + reconcile + billing-health) is the source of truth; the frontend never trusts a local flag. | OK (verified) |
| Webhook repair process can't reconcile real Stripe state | `reconcile-subscription` (manual) and `billing-health` (cron) both pull **live** Stripe state via `reconcileParentFromStripe` / `subscriptions.list`. | OK (verified) |
| **Stripe API version skew** | Webhook endpoint delivers payloads in `2026-02-25.clover`; SDK pins `2024-06-20`. In newer versions `current_period_start/end` moved onto subscription **items**. | **Mitigated in code & deployed** — `mapSubscription` now reads top-level *then* falls back to `items[].current_period_*`, so it is correct under either API version. (Optional belt-and-braces: also pin the Dashboard endpoint to `2024-06-20`.) |
| Deployed-vs-repo drift | Production edge functions are inlined single-file builds maintained separately from the modular repo source. | **Open — recommend** unifying the deploy pipeline. |
