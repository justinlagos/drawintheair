# Launch Readiness — Meta Pixel / CAPI, CSP, Multi-currency, Mobile Handoff

**Branch:** `feat/meta-pixel-capi` (commit the changes below on this branch)
**Status:** all code implemented + build-verified. Items below marked **[YOU]** are dashboard/config steps I can't do from code.
**Verified:** `tsc -b` ✓ · eslint 0 errors ✓ · `api/` typecheck ✓ · `vite build` ✓ · `check:csp` ✓ (12 origins).

---

## What shipped (code)

**Meta Pixel (client)** — `src/lib/observability/meta.ts`: loads `fbevents.js` in the deferred post-interactive loader (`main.tsx`), SPA `PageView` on every route, **no-op unless `VITE_META_PIXEL_ID` is set** (preview safety). Events mapped in the `analytics.logEvent` fan-out and at call-sites:

| Event | Where | Side |
|---|---|---|
| PageView | base + every route | Pixel |
| ViewContent | `/pricing`, `/parents` mount | Pixel |
| Lead + CompleteRegistration + StartTrial | `Signup.tsx` on signup success | Pixel **+ CAPI** (shared id) |
| AddChild | `parent_child_profile_created` | Pixel |
| StartActivity | `mode_started` | Pixel |
| InitiateCheckout | `parent_checkout_started` | Pixel |
| Subscribe | success-return (`Billing.tsx`) + webhook | **CAPI + Pixel**, deduplicated |
| Purchase | webhook `invoice.payment_succeeded` | CAPI (value+currency from the real Stripe invoice) |

**Conversions API (server)** — `_shared/metaCapi.ts` + new `meta-capi` edge function (registration, deduplicated, SHA-256-hashed parent email only — never child data). `stripe-webhook` (v9) sends **Purchase** (per invoice) and **Subscribe** (once, deduplicated via the `meta_event_id` stamped at checkout). All no-op unless `META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN` are set.

**Deduplication** — `Subscribe.tsx`/`Billing.tsx` generate one `event_id` at checkout, store it in `localStorage`, and pass it into Stripe `subscription_data.metadata.meta_event_id` (`stripe-checkout` v9). The webhook reads it back so the client Pixel and server CAPI share the id → **"Deduplicated"** in Events Manager.

**CSP** — `vercel.json` + `scripts/check-csp.mjs`: added `connect.facebook.net` (script), `www.facebook.com` + `graph.facebook.com` (connect). Build-gated.

**Multi-currency display** — `api/geo.ts` (coarse country, nothing stored) + `api/rates.ts` (daily server-cached FX, no hardcoded rates) + `src/lib/currency.ts` (`useLocalCurrency`, indicative `formatIndicative`, switcher, USD fallback). Wired into `/pricing` family plans with a switcher and a "billed securely in your local currency at checkout" note. Meta value/currency come from the **actual Stripe invoice**, never the display figure.

**Mobile → laptop handoff** — `useIsMobile.ts` + `handoff.ts` + new `send-laptop-link` edge function + UI in `TryFreeModal.tsx`: on a phone, the parent gets an email-capture instead of a broken camera screen; the email carries a laptop deep link with UTM + a `resume=` token; fires `Lead` (Pixel) on capture.

**Edge functions deployed to Supabase (live now):** `meta-capi`, `send-laptop-link`, `stripe-webhook` (v9), `stripe-checkout` (v9).

---

## [YOU] Environment variables

**Vercel (frontend):**
- `VITE_META_PIXEL_ID` — your numeric Pixel id. **Leave unset on Preview deployments** so previews don't send events.

**Supabase Edge Function secrets:**
- `META_PIXEL_ID` — same id
- `META_CAPI_ACCESS_TOKEN` — Events Manager → your dataset → Settings → Conversions API → Generate access token
- `META_TEST_EVENT_CODE` — only while testing (Events Manager → Test Events). **Unset for production.**
- `ADMIN_ALERT_EMAIL` — optional; where billing/ops alerts go (defaults to your founder email)
- (`RESEND_API_KEY` / `EMAIL_FROM` already set — used by the handoff + payment emails.)

```
supabase secrets set META_PIXEL_ID=...
supabase secrets set META_CAPI_ACCESS_TOKEN=...
# test only:  supabase secrets set META_TEST_EVENT_CODE=TEST12345
```

---

## [YOU] Stripe Dashboard — Adaptive Pricing (Item 3a)

Enable **Adaptive Pricing at the account level**: Stripe Dashboard → Settings → Payments → **Adaptive Pricing** → enable. Keep your Prices in **USD** (do not create per-currency prices). Once enabled, Checkout automatically presents and charges in the customer's local currency and settles USD to you — including for **subscriptions**.

> I deliberately did **not** pass a per-session `adaptive_pricing` param in `stripe-checkout`, because an unrecognised param would break live checkout on some API versions. The account-level toggle is the safe, supported path and applies automatically.

Verify: a UK IP sees GBP at checkout, a US IP sees USD, both settle USD in the dashboard.

---

## [YOU] Meta Business Manager / Events Manager (Item 5)

1. **Verify the domain** `drawintheair.com` — Business Settings → Brand Safety → Domains (DNS TXT or meta-tag).
2. **Aggregated Event Measurement** — prioritise the 8 events with **Subscribe at the top**, then Purchase, StartTrial, CompleteRegistration, InitiateCheckout, AddChild, StartActivity, ViewContent.
3. **Attribution window** — 7-day click / 1-day view at the ad-set level.
4. Confirm the **dataset/Pixel id** matches `VITE_META_PIXEL_ID`, and that CAPI shows healthy **event-match quality** and **Deduplicated** status on Subscribe.

---

## Compliance (Item 6) — built in

- No child targeting / no child-engagement optimisation — optimise only to parent actions (CompleteRegistration, then Subscribe).
- CAPI `user_data` is the **hashed parent email only** — there is no child data anywhere in the pixel/CAPI path (enforced in code).

---

## [YOU] Manual verification (Items 7 + 8)

Walk the funnel with **Events Manager → Test Events** open (set `META_TEST_EVENT_CODE` first):

- [ ] `window.fbq` defined on live; `fbevents.js` loads; no CSP violations in console
- [ ] PageView, ViewContent, CompleteRegistration, StartTrial, AddChild, StartActivity, InitiateCheckout appear
- [ ] Subscribe + Purchase appear server-side (CAPI) with `value` + `currency`
- [ ] Subscribe shows **Deduplicated** (Pixel + CAPI, shared id)
- [ ] `/pricing` shows the detected local currency (indicative) + switcher + "billed at checkout" note; the figure matches the Adaptive Pricing checkout figure
- [ ] On a real phone, the Try-Free modal offers the email handoff and the laptop link arrives
- [ ] Landing → first gameplay under 90s; camera works on Chrome / Edge / Safari
- [ ] `npm run validate` + `npm test` pass

---

## Notes / smaller follow-ups (not blockers)

- Indicative currency display is wired on `/pricing` (the dedicated pricing surface). `/parents` fires ViewContent; if you want the same indicative figures there, it's a 10-minute follow-up using the same `useLocalCurrency` hook.
- Mobile handoff is wired into `TryFreeModal`. `CameraExplainer` can get the same block if you see drop-off there too.
- Subscribe/Purchase: **Subscribe** is the deduplicated Pixel+CAPI conversion; **Purchase** is server-authoritative (CAPI, per invoice) which is renewal-safe and avoids client double-counting — a deliberate, standard choice.
- The deployed edge functions are self-contained bundles (reliable MCP deploy); the repo keeps the readable `_shared/` versions. They're functionally identical.
