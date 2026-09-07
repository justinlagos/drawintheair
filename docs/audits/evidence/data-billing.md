# Draw in the Air — Billing / Analytics / Observability Audit
Auditor: data-billing · Date: 2026-08-15 (DB now: 2026-08-15 21:25 UTC)
Windows: lookback 2026-07-15 → 2026-08-15 · comparison 2026-06-14 → 2026-07-15
Repo: /home/claude/dia-audit/repo @ 6a81fdf (deployed) · Supabase project fmrsfjxwswzhvicylaph
Stripe dashboard: not available — Stripe-side questions marked ACCESS BLOCKED.

---

## 1. Billing chain from code

**VERIFIED — Billing runs entirely on Supabase Edge Functions, not Vercel.**
- The Vercel `api/` dir contains only `api/geo.ts`, `api/og.tsx`, `api/rates.ts` — all
  `export const config = { runtime: 'edge' }` (api/geo.ts:10, api/og.tsx:3-4, api/rates.ts:12).
  No Stripe code exists under `api/`. The one `nodejs` lambda in deployment stats is not a
  billing function (all three api files declare edge runtime; nothing Stripe-related deploys on Vercel).
- `vercel.json` rewrites exclude `/api` (`"source": "/((?!api|assets|…).*)" → /index.html"`), so
  api functions are reachable, but they are geo/OG/FX-rate helpers only.
- Webhook host: **`https://fmrsfjxwswzhvicylaph.supabase.co/functions/v1/stripe-webhook`** —
  derived in code at supabase/functions/billing-health/index.ts:39 (`WEBHOOK_URL = ${SUPABASE_URL}/functions/v1/stripe-webhook`).
  Deployed edge functions confirmed via list_edge_functions: stripe-checkout (v16), stripe-portal (v14),
  sync-subscription (v14), stripe-webhook (v17, verify_jwt=false), reconcile-subscription (v9),
  billing-health (v9, verify_jwt=false), billing-diagnostics (v3), plus meta-capi, email-dispatch,
  announce, analytics-digest, pilot-welcome, join-class, generate-teacher-insights, generate-platform-report, send-laptop-link.

**Checkout creation (VERIFIED):** supabase/functions/stripe-checkout/index.ts
- Auth via `requireUser` (JWT) — _shared/stripe.ts:53-60.
- Duplicate-subscription guard: refuses checkout (409 `already_subscribed`) if a live Stripe sub exists (index.ts:80-88).
- Trial carry-over: remaining days of the 7-day signup trial only, capped by `pricing_config.trial_days` (index.ts:90-95).
- Prices resolved from `stripe_price_map` (index.ts:98-106); customer created with `metadata.parent_id` (index.ts:113-117);
  session carries `subscription_data.metadata.parent_id` + `client_reference_id` (index.ts:134-147).

**Webhook handler (VERIFIED):** supabase/functions/stripe-webhook/index.ts
- Signature verification: `stripe.webhooks.constructEventAsync(body, sig, getEnv('STRIPE_WEBHOOK_SECRET'))` (index.ts:57).
  Signature failure alerts the admin by email and returns 400 (index.ts:58-64).
- Idempotency: every relevant event inserted into `billing_events`; `stripe_event_id` is UNIQUE
  (index.ts:106-113; ordering.ts:8-13 maps SQLSTATE 23505 → duplicate → 200). DB confirmed:
  `billing_events_stripe_event_id_key` UNIQUE index exists in prod (pg_indexes).
- Out-of-order guard: `isStaleEvent(eventTs, last_event_at)` (index.ts:129-136, ordering.ts:23-28);
  `last_event_at` only ever advanced from Stripe `event.created` (billing.ts:99-118 — documented fix
  for the 2026-06 silent-billing incident where reconcile wrote wall-clock `now()` into the guard).
- Entitlement update: `mapSubscription` → `upsertSubscription` (onConflict parent_id) into
  `parent_subscriptions` (_shared/billing.ts:119-174). `invoice.payment_succeeded` re-fetches the live
  subscription from Stripe (webhook index.ts:162-198) so activation survives missed/out-of-order events.
  `invoice.payment_failed` → status `past_due` (index.ts:201-212). All DB write errors → 500 (Stripe retries) + admin email.
- Meta CAPI Purchase/Subscribe fired server-side from actual invoice amounts (index.ts:182-196).

**Env var NAMES required (VERIFIED, code grep across supabase/functions):**
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ANON_KEY`, `PARENT_APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_ALERT_EMAIL`
(defaults to founder gmail, billing.ts:22), `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`,
`META_TEST_EVENT_CODE` (metaCapi.ts:44-71), `ANTHROPIC_API_KEY` (insights), `DIGEST_EMAIL_FROM` (analytics-digest).

**ACCESS BLOCKED:** cannot confirm the Stripe Dashboard endpoint URL/secret matches, live vs test mode,
or Stripe-side delivery failures. Mitigated by billing-health's Stripe-events cross-check (below).

## 2. Billing DB state

**VERIFIED — volumes are tiny; treat every count as exact, not sampled.**
- `billing_events` total: **8 rows ever** (first 2026-06-15 09:36, latest **2026-08-12 13:30 UTC** — 3.3 days old).
- Lookback (15 Jul→15 Aug): 2 events — `customer.subscription.updated` (12 Aug 12:29),
  `invoice.payment_succeeded` (12 Aug 13:30). Comparison window: 6 events
  (4 × subscription.updated, 1 × payment_failed 15 Jun, 1 × payment_succeeded 12 Jul).
- Day gaps ≥48h: yes, everywhere — but with exactly one live Stripe subscription renewing monthly
  (events cluster on the 12th of each month), a sparse event stream is the expected shape, **not**
  evidence of an outage. INFERENCE: the 12 Jul → 12 Aug monthly renewal pattern indicates the webhook
  delivered the most recent renewal correctly.
- **Subscriptions by status (VERIFIED):** `active: 2` (1 with a real Stripe subscription, monthly,
  current_period_end 2026-09-12, last_event_at 2026-08-12; 1 manual/comped row with NO Stripe sub and
  current_period_end **2036-05-28** — a 10-year comp), `trialing: 29`, canceled/past_due: 0.
- **Trials expired during lookback: 0** (VERIFIED — no `trial_end` falls inside 15 Jul–15 Aug).
  All 29 `trialing` rows have trial_end < now() (latest 2026-07-08) and were never transitioned —
  they are card-free local trials with no Stripe object, so no webhook will ever flip them.
  INFERENCE: "trialing" in this schema means "signed up, never converted"; the app's `hasAccess`
  logic must be checking trial_end at read time (not audited here) — but any dashboard counting
  "trialing" as live pipeline overstates it by 29.
- **Zero new trials started in the lookback** (latest trial_start 2026-07-01). See §2a.
- Mismatches (VERIFIED): 0 subscription rows without a parent_profile; 0 subscription rows whose
  stripe_customer_id is missing from the profile side; 13/41 parent_profiles carry a stripe_customer_id.
- **10 parent_profiles have NO parent_subscriptions row at all**, including **all 3 profiles created
  during the lookback** (last signup 2026-07-28). See §2a.

### 2a. Signup-trial trigger gap (new finding)
- Migration 20260701000001_parent_trial_on_signup_trigger.sql makes `handle_new_parent_user()` start
  the 7-day trial **only when `raw_user_meta_data->>'role' = 'parent'`** (migration lines 44-49).
  VERIFIED the deployed prod function contains the `start_parent_trial` call (pg_proc check = true),
  and trigger `on_auth_user_created_parent` exists on auth.users.
- VERIFIED: all 3 accounts created since 15 Jul have **no `role` key in their auth metadata** →
  they received a parent_profiles row but **no trial**. Analytics show 1 `parent_signup_completed`
  and 1 `teacher_signup_completed` in the lookback.
- INFERENCE (severity: high if these are parents): a signup path exists that does not stamp
  `role: 'parent'`, which recreates the exact "instant paywall" bug this migration was written to fix
  (its own header: parents land with no subscription row → hasAccess=false → paywalled).
  Needs one manual check of what flow those 3 accounts came through.

## 3. Entitlement reconciliation / self-healing

**VERIFIED — a real reconciliation system exists and is running:**
- `billing-health` edge function (supabase/functions/billing-health/index.ts): every run
  (1) lists ALL live Stripe subscriptions (active/trialing/past_due) and force-repairs any DB drift
  (index.ts:90-118), and (2) dead-man switch: alerts admin if billing_events is silent >2h while live
  subs exist (index.ts:33, 152) **and** cross-checks Stripe's own `events.list` for the last 2h against
  billing_events by event id (index.ts:132-155) — this catches an endpoint outage even at low volume.
- Scheduled via pg_cron `billing-health-15m` at `7-59/15 * * * *` (migrations/0024_billing_health_cron.sql:35).
  VERIFIED in prod: cron.job row exists, and cron.job_run_details shows **2,880/2,880 succeeded runs in
  the last 30 days**, last run 2026-08-15 21:22 UTC. function_edge_logs show 92 invocations of the
  billing-health function id in the last 24h (≈ every 15 min).
- `reconcile-subscription` edge function = user/admin-triggered instant reconcile (checkout-success page).
  `billing-diagnostics` (v3, deployed) for admin inspection. Shared mapping in _shared/billing.ts prevents drift.
- **VERIFIED verdict: the system WOULD self-detect a Stripe webhook outage** within ~2h15m
  (dead-man clock + Stripe event cross-check + 15-min cron, alerting `ADMIN_ALERT_EMAIL` via Resend),
  and would self-repair entitlements within ~15 min regardless. Residual risk (UNVERIFIED): the alert
  path depends on RESEND_API_KEY being valid — a Resend failure is logged but not otherwise surfaced
  (billing.ts:29-48); and no billing_events row is backfilled by repair, which is by design.

## 4. First-party analytics (analytics_events)

Table: `public.analytics_events` (BASE TABLE); `analytics_events_real` is the dashboard VIEW excluding
`traffic_type in ('internal','qa','bot')` (migration 20260703000001, line 51). Ingest since 9 Jul is via
SECURITY DEFINER RPC `ingest_analytics_events` / `ingest_learning_attempts`
(migration 20260709000001 — written to fix the 26 Jun RLS 42501 flush failure).

**Daily series 14 Jun → 15 Aug (VERIFIED, full table scan; total / sessions / devices / distinct names):**
Highlights (full numbers in query results, summarised honestly):
- 14 Jun–25 Jun: healthy mixed volume (peak 45,800 events on 18 Jun; tracker_quality_sample dominates counts).
- **26 Jun – 8 Jul: the historical outage shape is clearly visible** — daily totals collapse to 59–784
  and on 26 Jun–2 Jul are ~100% traffic_type internal/qa (e.g. 27 Jun: 59/59 internal; 29 Jun: 784/784).
  **Zero-event days: 5 Jul and 7 Jul** (the only fully-empty days in the 62-day range). 6 Jul: 7 events, 8 Jul: 2.
- 9–10 Jul: recovery after the ingest RPC fix (879 and 1,231 events, real devices return).
- 13 Jul: 42 sessions / 38 devices (a spike — school end-of-term burst).
- Post-20 Jul (deploy freeze): steady organic trickle, roughly 100–2,200 events/day, 3–13 real
  sessions/day, 30–50 distinct event names/day; no multi-day gap. Volume trend is flat-to-slightly-up
  vs early July, far below the mid-June classroom peaks (HISTORICAL: schools broke up mid-July).
- **Is ingest currently alive? Last event 2026-08-14 17:03 UTC — 28.4h ago; 0 events in the last 24h,
  6,021 in the last 72h.** VERIFIED the pipeline worked yesterday evening; UNVERIFIED whether the
  current 28h silence is zero weekend traffic or a fresh breakage — at 3–13 sessions/day a quiet
  Friday-night-to-Saturday gap is plausible, but this exact pattern (low volume) is why silence is
  ambiguous. There is no silence alert for analytics (see §8). Recommend a manual smoke visit.

## 5. Funnel integrity (lookback, excluding internal/qa/bot)

**Key event counts (VERIFIED; count / distinct sessions):**
- No `landing_view`/`page_view`/`session_started` events exist in the lookback (0 rows) — landing
  page views live in GA4 only; the LIOS funnel starts at app entry. `wave_screen_view` 166/130.
- camera_requested 226/128 → camera_granted 133/112 (camera_denied 30/17, camera_retry_failed 57/12)
- tracker_init_started 169/135 → tracker_init_succeeded 147/127 (failed 12/8)
- wave_first_hand_seen 112/98 → wave_completed 106/96 ("first gesture" proxy)
- mode_selected 137/82 → mode_started 160/85 → mode_completed 118/42 → mode_abandoned 38/30
- signup/billing: parent_signup_started 1, parent_signup_completed 1, parent_checkout_started 2,
  teacher_signup_completed 1, parent_dashboard_viewed 5. No trial/subscribe events (none defined client-side;
  Subscribe is a server-side CAPI event).

**mode_started vs mode_completed by game_mode (VERIFIED):**
| mode | started | completed | abandoned |
|---|---|---|---|
| free | 71 | 30 | 24 |
| pre-writing | 34 | 62 | 4 |
| calibration | 32 | 23 | 8 |
| tutorial | 23 | 3 | 0 |
- **No mode has starts with zero completions.** The playful-tracing fix (ca0bf9b, in prod): VERIFIED
  post-20-Jul data shows pre-writing mode_completed = 37 (22 Jul → 13 Aug) — completions are flowing.
  (pre-writing completed > started because completion fires per finished activity; not a defect, but
  the started/completed semantics differ per mode — worth normalising.)
  Tutorial 23 started / 3 completed is the weakest funnel step.

**Orphaned mode_started (idle-timeout branch never deployed — VERIFIED quantification):**
session+mode pairs with a start but NO terminal event (completed/abandoned) in the lookback:
free 26/61 (43%), tutorial 19/22 (86%), pre-writing 6/30 (20%), calibration 3/29 (10%) —
overall **54/142 = 38% of started sessions end with no terminal outcome**. Time-in-mode analytics
for these sessions are unusable; matches the known missing idle-timeout branch.

**Classroom usage in lookback: NONE. (VERIFIED)**
- `sessions` created since 15 Jul: 0 (last class session 2026-07-14 06:04 UTC);
  `session_students` joins since 15 Jul: 0 (last join 2026-07-14 06:05).
- Zero class_* analytics events in the lookback (grep of event names returned none).
- HISTORICAL/INFERENCE: consistent with UK school summer holidays — but it means the new-term
  classroom path has not been exercised end-to-end for a month, on a build deployed 20 Jul.

## 6. learning_attempts / mastery honesty

- **VERIFIED: mastery-eligibility migrations ARE applied in prod** — `lios_is_technical_item_key()`
  exists in pg_proc (count=1).
- Post-02-Jul split: **12 attempts total, 100% content items (technical=false, 8 distinct item_keys)** —
  the technical/content classification is live but has almost no data to act on.
- **learning_attempts is EMPTY for the entire lookback (0 rows; 487 in the comparison window;
  last row 2026-07-10 15:23).** Root cause is NOT a broken pipe: in the deployed client, learning_attempts
  rows are mirrored **only from `item_dropped` events** (src/lib/analytics.ts:1570-1650), and there were
  **0 item_dropped events in the lookback** (194 in the prior window). VERIFIED consistent: nobody played
  the sorting/matching modes; tracing/pre-writing completions (62 tracing_letter_completed) generate NO
  learning_attempts rows in the deployed build. INFERENCE: mastery/LIOS is starved by instrumentation
  coverage (tracing attempts are not recorded as attempts), so `lios-pipeline-every-5min` (8,640
  successful runs/30d) is churning on no new data. Flag for the new term: mastery claims can only be
  backed by sort/place gameplay as deployed.

## 7. Observability config (deployed code)

- **Host gating (VERIFIED):** third-party analytics load only on production hosts —
  `THIRD_PARTY_ANALYTICS_HOSTS = {'drawintheair.com','www.drawintheair.com'}` and
  `if (!isThirdPartyAnalyticsHost()) return;` in `loadDeferredAnalytics()` (src/main.tsx:833-846).
  GA4 id `G-S4XSWT6Q09` and Clarity are injected there, deferred to idle (main.tsx:848-870+).
- **Consent order (VERIFIED):** GA4/Clarity/Meta Pixel require prior consent — `if (!hasAnalyticsConsent()) return;`
  before scheduling load (main.tsx:892), plus `onConsentChange` re-trigger (main.tsx:903). PostHog:
  `initObservability()` runs Sentry unconditionally but PostHog only `if (hasAnalyticsConsent())`
  (src/lib/observability/index.ts:81-87). Sentry is treated as essential/operational (index.ts:82-85)
  and no-ops without `VITE_SENTRY_DSN` (sentry.ts:151). PostHog no-ops without `VITE_POSTHOG_KEY`
  (posthog.ts:236-237), EU host default, autocapture/recording disabled, memory persistence (posthog.ts:247-266).
  Consequence: **all product analytics (incl. PostHog) are consent-gated; a visitor who never answers
  the banner is invisible to everything except Sentry and first-party LIOS** (LIOS/Supabase events are
  intentionally not consent-gated — main.tsx comment lines ~825-832).
- Env names client-side: VITE_SENTRY_DSN, VITE_SENTRY_TRACES_RATE, VITE_SENTRY_REPLAY,
  VITE_POSTHOG_KEY, VITE_POSTHOG_HOST, VITE_META_PIXEL_ID, VITE_APP_ENV, VITE_APP_VERSION,
  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY. Whether DSN/key are actually set in the Vercel project:
  **ACCESS BLOCKED** (no Sentry/PostHog dashboards, no Vercel env read performed).
- **CSP (vercel.json single CSP header):** script-src allows googletagmanager, *.clarity.ms,
  connect.facebook.net, PostHog asset hosts; connect-src allows GA, clarity, sentry ingest, posthog,
  facebook graph. VERIFIED violations actually occurring in lookback (csp_violation events, 145/71 sessions):
  `static.cloudflareinsights.com/beacon.min.js` blocked ×94 (Cloudflare RUM injection — not allowlisted),
  `capig.stape.be` connect blocked ×63 (a Meta CAPI-gateway config pointing the Pixel at stape.be — blocked,
  so that gateway receives nothing), `www.clarity.ms/tag/…` script blocked ×10 (UNVERIFIED why — wildcard
  should match; possibly a different host's stricter CSP), facebook.com form-action/frame-src blocked ×9+9
  (Pixel fallback transports; frame-src 'none' and form-action 'self' intentionally block them).
- **Do events actually flow to Sentry/PostHog? ACCESS BLOCKED** — cannot read those dashboards.
  Client-side nothing structurally blocks them (CSP allows both; init code present); the binding
  constraints are consent rate and env vars being set.
- **Edge/postgres error rates (query_logs, last 24h — VERIFIED):** function_edge_logs show only the three
  cron functions running (analytics-digest 94, billing-health 92, email-dispatch 91 invocations;
  stripe-webhook: 0 — no Stripe events yesterday, consistent with billing_events). postgres_logs:
  1,734 LOG, **2 ERROR** — exactly the two known-failing cron jobs:
  `"v_teacher_session_stats" is not a table or materialized view` and
  `null value in column "code" of relation "sessions" violates not-null constraint`.

## 8. Alerting — would the founder KNOW?

- **Billing/webhook death: YES (VERIFIED).** billing-health dead-man switch emails ADMIN_ALERT_EMAIL
  within ~2h15m (§3), plus every webhook hard-failure path emails the admin directly
  (stripe-webhook/index.ts:62,117,124,152,176,208,219 via alertAdmin, billing.ts:77-82).
- **Analytics ingest death: NO (VERIFIED from code).** The only analytics watchers are
  `dita-daily-digest` (07:00 email of `dashboard_daily_digest()`) and `dita-anomaly-check`
  (every 15 min → `dashboard_anomaly_check()`). The deployed anomaly RPC (read from pg_proc) only
  fires on **spikes** (tracker_init_failed ≥5 devices, camera_denied ≥10, csp_violation ≥10,
  system_error ≥3 in 15 min). **If ingest goes silent, the 15-min window is empty, zero breaches, no
  alert.** Also its `session_started`-based new_sessions metric counts an event name that no longer
  fires (0 occurrences in lookback) — a dead metric. The only silence signal is a human noticing zeros
  in the 07:00 daily digest email (which did send 30/30 days). Verdict: **webhooks: self-detecting;
  analytics ingest: not self-detecting — passive daily-email detection only.**
- `announce` (one-off broadcast, x-cron-key gated, broadcast_log idempotent) and `pilot-welcome`
  exist but are campaign mail, not health alerting. `admin_alerts` TABLE exists but has **0 rows ever**
  (VERIFIED) — alerting is email-only; nothing durable is recorded in-DB (an email outage leaves no trace).

## 9. Scheduled jobs (pg_cron) — VERIFIED

| job | schedule | 30-day runs | status |
|---|---|---|---|
| refresh-materialized-views | 0 3 * * * | 30 | **failed 30/30** |
| retention-purge | 0 2 * * * | 30 | **failed 30/30** |
| dita-prune-analytics-events | 0 3 * * * | 30 | ok |
| dita-prune-learning-attempts | 5 3 * * * | 30 | ok |
| dita-daily-digest | 0 7 * * * | 30 | ok |
| dita-anomaly-check | */15 | 2,880 | ok |
| lios-pipeline-every-5min | */5 | 8,640 | ok |
| email-dispatch-15m | */15 | 2,880 | ok |
| billing-health-15m | 7-59/15 | 2,880 | ok |

- **refresh-materialized-views fails every night**: `"v_teacher_session_stats" is not a table or
  materialized view` — the v_* objects were evidently converted to plain views; the job errors on its
  FIRST statement, so nothing in it runs. Teacher/school dashboard stats now depend on live views (or are stale). 
- **retention-purge fails every night**: `null value in column "code" of relation "sessions" violates
  not-null constraint` — its "nullify old session codes" UPDATE (`SET code = NULL` on sessions ended >30d)
  collides with a NOT NULL constraint on sessions.code. Because the whole command aborts, **NONE of the
  retention deletions run** (expired insights, client_errors >90d, expired-trial round_scores /
  session_students). This is a **data-retention/GDPR compliance failure for a children's product**:
  the child-adjacent purge path has been dead for ≥30 days (every logged run failed).
- Cron "succeeded" for dita-daily-digest/anomaly only proves `net.http_post` was enqueued; actual
  function success verified separately via function_edge_logs (94 invocations/24h) and 30/30 digest sends.

---

## Consolidated findings list

| # | Severity (suggested) | Label | Finding |
|---|---|---|---|
| 1 | HIGH | VERIFIED | `retention-purge` cron has failed 30/30 nights (sessions.code NOT NULL vs `SET code = NULL`), so ALL retention deletions (client_errors >90d, expired trial child-session data) are not running — compliance-sensitive for a children's product. |
| 2 | HIGH | VERIFIED + INFERENCE | All 3 accounts created in the lookback have no `role` metadata → got no signup trial row (trigger gated on role='parent', 20260701000001:44-49). If any are parents, the "instant paywall" bug is back for that signup path. Zero new trials since 1 Jul. |
| 3 | MEDIUM-HIGH | VERIFIED | Analytics ingest death would NOT self-alert: dashboard_anomaly_check only detects spikes, not silence; its session_started metric references an event that no longer exists. Last event now 28.4h old, 0 events in 24h (UNVERIFIED whether zero traffic or breakage). |
| 4 | MEDIUM | VERIFIED | refresh-materialized-views cron failed 30/30 nights (v_teacher_session_stats no longer a matview) — dashboard stats pipeline dead; also 29 stale "trialing" rows (all expired, no transition state) misrepresent pipeline in any status-based query. |
| 5 | MEDIUM | VERIFIED | learning_attempts empty for the whole lookback (last row 10 Jul): deployed client only writes attempts from `item_dropped` (analytics.ts:1570), tracing/pre-writing produce none, and 0 item_dropped events occurred — mastery/LIOS pipeline runs on no data; mastery-eligibility migrations ARE applied (lios_is_technical_item_key exists). |
| 6 | LOW-MEDIUM | VERIFIED | 38% of mode_started sessions have no terminal event (tutorial 86%, free 43%) — idle-timeout branch never deployed; time-in-mode metrics unreliable. |
| 7 | LOW | VERIFIED | CSP blocks cloudflareinsights beacon (94×), stape.be CAPI gateway (63×), clarity tag on some host (10×), facebook pixel fallbacks (18×) — third-party measurement partially degraded; decide allowlist-or-remove per tool. |
| 8 | INFO | VERIFIED | Billing chain itself is in good shape: signature-verified webhook, UNIQUE stripe_event_id idempotency, ordering guard, error-checked writes with 500-retry + admin email, 15-min self-healing reconciliation with Stripe-event cross-check dead-man switch (2,880/2,880 runs green). Latest billing event 12 Aug (monthly renewal cadence, 1 real paying sub + 1 comp). |
| 9 | INFO | VERIFIED | Zero classroom usage since 14 Jul (summer holidays) — new-term classroom path untested in production for a month on the 20 Jul build. |
| 10 | ACCESS BLOCKED | — | Stripe dashboard endpoint/secret/mode, Sentry & PostHog event flow, Vercel env var presence — could not be verified from code+DB alone. |
