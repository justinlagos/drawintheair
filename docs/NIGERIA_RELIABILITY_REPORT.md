# Draw in the Air — Nigeria Accessibility & Reliability Investigation

**Date:** 2026-05-27
**Trigger:** Second independent report from a Nigerian user — site fails to open with
`drawintheair.com took too long to respond` / `ERR_CONNECTION_TIMED_OUT`.
**Method:** Codebase audit + live network probes (DNS, TLS, HTTP/2, IPv6, CDN headers)
from outside Nigeria. No production dashboard access was used.

> **Honest scope note.** All probes were run from a well-connected US/EU vantage point.
> I cannot reproduce a Nigerian ISP's routing table from here, so the *primary* diagnosis
> is an evidence-backed inference, not a packet capture from the affected network. Confidence
> levels are stated explicitly throughout. The fixes fall into two buckets: **code changes
> already applied** (in the working tree, awaiting your review) and **infrastructure changes
> only you can make** (DNS/Cloudflare/BetterStack dashboards).

---

## 1. Executive summary

`ERR_CONNECTION_TIMED_OUT` is a **TCP-connection-establishment failure** — the browser's SYN
packet never gets a reply. It happens *before* any HTTP request, TLS handshake, HTML, or
JavaScript. That single fact rules out most of the application-layer suspects (SSL, middleware,
bundle size, Supabase, redirects) as the *direct* cause of this specific error.

**Most likely root cause (confidence: medium-high):** the site funnels every visitor onto a
**single Vercel apex anycast IP (`76.76.21.21`) whose nearest edge is in Europe (London / `lhr1`).
Vercel has no African point of presence.** For a subset of Nigerian ISPs / mobile carriers, the
network path to that anycast prefix is unreliable (broken/congested BGP route, submarine-cable
packet loss, or ISP-level filtering), so the TCP handshake times out. The strongest supporting
evidence: your **Supabase endpoint is fronted by Cloudflare — which *does* have a Lagos PoP — and
reaches Nigeria fine.** The weak link is the site's own delivery layer, not your data layer.

**The single highest-impact fix is infrastructure, not code:** put the site behind Cloudflare
(free tier) so Nigerian traffic terminates at Cloudflare's Lagos edge instead of crossing to
London to reach one fragile anycast IP. This is detailed in §6.

**Secondary problem (confidence: high):** for users who *do* connect, the first-load experience
was needlessly fragile and heavy — a render-blocking external Tailwind CDN, a monolithic ~330KB
(brotli) JavaScript bundle, render-blocking fonts, and analytics competing for the connection.
On a flaky 3G link this produces long white screens and abandonment (a *different* failure from
the connection timeout, but it compounds the perception that "the site is broken in Nigeria").
**These have been fixed in code** (§5).

**Why the app couldn't tell you any of this:** the observability stack (Sentry + PostHog) is
well-built and was configured with keys — but the **Content-Security-Policy `connect-src` was
missing the Sentry and PostHog endpoints**, so every telemetry beacon was silently blocked.
Fixed (§4).

---

## 2. Diagnosis: what was ruled IN and OUT

| Hypothesis | Verdict | Evidence |
|---|---|---|
| **Routing to single Vercel apex anycast IP from NG networks** | **Likely cause** | Apex = `76.76.21.21` only; `www` 308-redirects to apex; edge served from `lhr1` (London); Vercel has no African PoP. |
| Origin down / global DNS failure | **Ruled out** | Apex returns HTTP 200 in ~100ms; resolves consistently; `x-vercel-cache: HIT`. |
| **SSL / TLS certificate invalid** | **Ruled out** | Valid Let's Encrypt R12 cert (valid 2026-05-10 → 2026-08-08), HTTP/2, HSTS present, TLS handshake ~74ms. |
| **IPv6 breaking routing** | **Ruled out** | No `AAAA` records on apex or `www` — there is no IPv6 path to break. |
| **Edge middleware hanging before render** | **Ruled out** | No `middleware.ts` exists; it's a static SPA served from cache. Nothing runs server-side before HTML. |
| **Redirect loop / hang** | **Ruled out** | `www` → single clean 308 → apex 200. No loop. |
| **Supabase region blocking NG** | **Ruled out (and instructive)** | Supabase is Cloudflare-fronted (`cf-ray …-LHR`), reaches NG well, and is not on the document critical path. |
| **Cold-start / serverless timeout** | **Ruled out for the document** | Only serverless function is `api/og.tsx` (OG images); the HTML is static. |
| **DNS propagation incomplete** | **Unverified** | Resolution was consistent from here; nameservers `ns{0,1,2}.phase8.net` answered. Cannot confirm propagation inside every NG resolver from outside. |
| **Render-blocking assets / oversized bundle causing timeouts** | **Confirmed contributor** | Synchronous `cdn.tailwindcss.com` (126KB + in-browser compile), 330KB-br main bundle, blocking fonts. Compounds slow-network failures. |
| **CSP blocking observability** | **Confirmed** | `connect-src` lacked Sentry + PostHog hosts → telemetry silently dropped. |

---

## 3. Deployment architecture (as found)

- **Framework:** Vite + React 19 SPA (client-rendered; no SSR).
- **Hosting:** Vercel (`server: Vercel`, **not** behind Cloudflare). SPA rewrite of all routes → `index.html`.
- **DNS:** Apex `A 76.76.21.21` (Vercel anycast, no `AAAA`); `www` → multiple A records → 308 → apex. NS = `phase8.net`.
- **TLS:** Let's Encrypt, HTTP/2, HSTS `max-age=31536000; includeSubDomains`.
- **Data / realtime:** Supabase (`fmrsfjxwswzhvicylaph.supabase.co`), **Cloudflare-fronted** (good NG reachability), used for Class Mode (WebSocket).
- **Edge functions:** only `api/og.tsx` (`@vercel/og`) — off the user critical path.
- **Heavy runtime dependency:** `@mediapipe/tasks-vision` (hand tracking) — loaded lazily on `/play` and `/trace-*` from `cdn.jsdelivr.net` / `storage.googleapis.com`. Not on the landing path.
- **Third parties on first load (before fixes):** `cdn.tailwindcss.com` (render-blocking), Google Fonts (render-blocking), Google Tag Manager, Microsoft Clarity.
- **Service worker:** present, network-first for HTML/JS/CSS, cache-first for images/fonts, offline fallback page.
- **Observability:** `src/lib/observability/` — Sentry + PostHog + an in-memory health registry, all privacy-hardened (PII scrubbing, no webcam capture). Solid foundation.

---

## 4. Observability — making the app "talk back" (applied + to-do)

### Applied in code
- **CSP fix (the critical one)** — added Sentry + PostHog endpoints to `connect-src` in `vercel.json`
  (`*.sentry.io`, `*.ingest*.sentry.io`, `eu/us.i.posthog.com`, `eu/us-assets.i.posthog.com`).
  Without this, no error or analytics event could ever leave the browser.
- **Sentry performance tracing** — `tracesSampleRate` now defaults to `0.1` (was `0.0`), giving
  page-load timing, TTFB, and request latency. This is the signal that will let you *see* that
  Nigeria is slow rather than guess. Override via `VITE_SENTRY_TRACES_RATE`.
- **Privacy-safe session replay (opt-in, OFF by default)** — wired `Sentry.replayIntegration`
  behind `VITE_SENTRY_REPLAY=on`. When enabled it runs **error-only**, with `maskAllText`,
  `maskAllInputs`, and `blockAllMedia` — it can never capture a child's webcam or any text.
  Left OFF by default deliberately: full session recording on a children's webcam app is a
  privacy non-starter. Turn it on only if/when you need crash repro and accept the masked replay.
- **PostHog geographic data** — already supported (`country` is on the property allow-list, set
  by PostHog from IP). It will start populating the moment the CSP fix ships.
- **Health endpoint** — added `public/health.json`, served straight from the CDN edge independent
  of the JS app, for uptime monitors.

### You need to do (dashboards / accounts)
1. **Confirm Vercel production env vars** are set: `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`,
   `VITE_POSTHOG_HOST` (use `https://eu.i.posthog.com`), `VITE_APP_ENV=production`,
   `VITE_APP_VERSION` (commit SHA). They exist in local `.env`; verify they're in Vercel too.
2. **BetterStack uptime** — create three HTTP monitors and **include an Africa/Lagos checking
   region** so a Nigeria-specific routing failure pages you even when EU/US is green:
   - `https://drawintheair.com/` (apex — what users actually hit)
   - `https://www.drawintheair.com/` (the `www` → 308 path)
   - `https://drawintheair.com/health.json` (lightweight heartbeat)
   Add a status-page + alert policy (email/Slack) and a ~3-region consensus before alerting.

---

## 5. Low-bandwidth hardening — fixes applied in code

Simulating an unstable Nigerian mobile link (3G/4G fluctuation, packet loss, old Android/Windows
devices), here is what was wrong and what changed. **All build-verified** (`tsc -b` clean, Vite
build succeeds, project CSP check passes).

| Problem found | Fix applied | Impact |
|---|---|---|
| **Render-blocking `cdn.tailwindcss.com`** — 126KB JIT compiler that built CSS *in the browser* every load (heavy on old CPUs) and white-screened if the CDN was slow/blocked. | Migrated Tailwind to **build time** (`tailwind.config.js`, `postcss.config.js`, `@tailwind` directives in `src/index.css`). Removed the CDN script + inline config from `index.html`. | Eliminates an external single-point-of-failure and the runtime compile cost. |
| **Monolithic ~330KB-br main bundle** (`manualChunks: undefined`). | Re-enabled vendor splitting in `vite.config.ts` (react-vendor / motion / sentry / posthog / vendor) + set an older-device build target. | Parallel download + long-term caching; app-code changes no longer bust the vendor cache. |
| **~17 pages + the game engine statically imported** into the initial bundle. | Lazy-loaded all non-landing pages **and** the `App` game engine via a single top-level `<Suspense>`; Landing/DemoLoader stay eager (hot path). | **Initial `index.js`: 190KB → 45KB gzip (~76% smaller).** Game code (66KB) only loads on `/play`. CSS 163KB → 73KB. |
| **Blank white screen during JS download** (reads as "broken"). | Added an inline, dependency-free **branded loading splash** in `index.html` shown the instant HTML arrives, with a 20s "tap to retry" fallback. | Perceived reliability; a slow load no longer looks like a dead site. |
| **Analytics competing with critical assets** (GTM + Clarity synchronous in `<head>`). | Moved GTM + Clarity to a **deferred loader** (`requestIdleCallback` / post-`load`) in `main.tsx`. | First render never waits on analytics; a blocked tag host can't delay the app. |
| **Transient chunk-fetch failures → error screen** (common on flaky links). | New `lazyWithRetry` helper: retries dynamic imports with backoff + per-attempt timeout, and forces one guarded reload on stale-deploy chunk mismatch. | Recovers from network blips instead of dumping the user into the fallback. |
| **Service worker `networkFirst` could hang** on a stalled connection. | Added a **6s network timeout** that falls back to cache; bumped `CACHE_VERSION`. | Returning users get cached content fast when the network is effectively dead. |

**Files changed (code):** `vercel.json`, `index.html`, `src/main.tsx`, `src/index.css`,
`vite.config.ts`, `public/service-worker.js`, `.env.example`, `src/lib/observability/sentry.ts`.
**New files:** `tailwind.config.js`, `postcss.config.js`, `public/health.json`,
`src/lib/lazyWithRetry.tsx`.

> ⚠️ **One change needs a visual QA pass before deploy:** the Tailwind build-time migration. The
> build generates the utilities used in the code (verified), and dynamic class names in the
> codebase are custom CSS classes (not Tailwind utilities), so purge risk is low — but a swap of
> the CSS engine on a live children's site should get one eyes-on check across the landing, a
> couple of marketing pages, and `/play` before shipping. It's isolated and easy to revert.

---

## 6. Nigeria reliability hardening plan — infrastructure (you must apply)

These address the **actual `ERR_CONNECTION_TIMED_OUT`** and can't be done from the codebase.

### Priority 1 — Put the site behind Cloudflare (the real fix)
- Add `drawintheair.com` to Cloudflare (free plan), point the registrar's nameservers to
  Cloudflare, and set the site records to **Proxied (orange cloud)** with Vercel as origin
  (Cloudflare → Vercel via a CNAME to `cname.vercel-dns.com` for `www`, and the apex via
  Cloudflare's flattening).
- Why: Cloudflare has a **Lagos PoP**. Nigerian users would complete their TCP + TLS handshake at
  a nearby edge instead of crossing to London to reach one fragile anycast IP. This is exactly why
  your Supabase endpoint (already Cloudflare-fronted) reaches Nigeria reliably today.
- Keep "Always Use HTTPS" + matching HSTS; verify the CSP still matches after proxying.

### Priority 2 — Stop funneling everyone onto the single apex IP
- Either rely on Cloudflare (P1) which makes this moot, **or** as a stopgap, serve the canonical
  site on `www` (multiple A records / Vercel's full anycast set) and avoid the apex-only path.

### Priority 3 — DNS hardening
- Confirm `phase8.net` nameservers are healthy and reasonably distributed; once on Cloudflare,
  DNS is served from Cloudflare's anycast (more resilient). Keep TTLs modest (300–3600s) so a
  future cutover propagates fast.

### Priority 4 — Verify from inside Nigeria
- Use a Nigeria-based check (a contact on the affected ISP, or a synthetic test from a Lagos
  region) to confirm the timeout reproduces and that the Cloudflare cutover resolves it. This is
  the one piece this investigation could not do from outside the country.

---

## 7. Who is affected & confidence

- **Symptom population:** users on the specific Nigerian ISPs / mobile carriers whose route to
  the Vercel apex anycast prefix is degraded. This is typically a **subset** of a region, not all
  of it — consistent with "some users" and two independent reports rather than a total outage.
- **Sizing (honest):** **unquantifiable until telemetry is live.** Today the app reports nothing
  (CSP-blocked), so there is no denominator. After the CSP fix + PostHog ships, you'll see NG
  session counts, funnel drop-off, and Sentry latency by `country` — and BetterStack will show
  whether the apex is reachable from Africa. Expect a real number within days of deploying.
- **Confidence:**
  - That the error is connection-level (not app-level): **high** (definitional — `ERR_CONNECTION_TIMED_OUT`).
  - That the cause is routing to the Vercel apex anycast from NG networks: **medium-high** (strong circumstantial evidence; not yet confirmed from inside NG).
  - That Cloudflare-fronting materially improves NG reachability: **high** (African PoP; your own Supabase path already proves it).
  - That the code hardening reduces slow-network failures/abandonment: **high** (measured bundle + critical-path reductions).

---

## 8. What still needs improvement / residual risks

- **No in-country verification yet** — the primary diagnosis needs one confirmation from an
  affected Nigerian network (Priority 4 above).
- **Tailwind migration needs a visual QA pass** before deploy (§5 note).
- **Vendor weight on first load** — react-vendor (~60KB gz) + posthog (~63KB gz) + sentry
  (~39KB gz) still load eagerly. PostHog was deliberately *kept* eager so you don't lose the early
  funnel events you need to diagnose Nigeria; revisit deferring it once the region is healthy.
- **MediaPipe on `/play`** is multi-MB from a third-party CDN — fine on the landing path, but the
  actual *activity* will still be heavy on weak networks. Consider a clear "loading the magic…"
  state and a low-bandwidth/CPU fallback for the tracker.
- **Single hosting provider** — even with Cloudflare in front, origin is Vercel-only. Cloudflare
  caching + the service worker mitigate, but a true origin outage is still a single point.
- **Repo-wide lint debt** — `eslint .` reports pre-existing errors in unrelated files (not from
  these changes; the build chain doesn't run eslint). Worth a separate cleanup pass.

---

## 9. Action checklist

**Deploy-blocking review (code, already applied):**
- [ ] Review the diff (8 modified + 4 new files; see §5).
- [ ] Visual QA the Tailwind build-time migration (landing, a marketing page, `/play`).
- [ ] Deploy; confirm `https://drawintheair.com/health.json` returns `{"status":"ok"}`.

**Make the app talk back (this week):**
- [ ] Confirm Sentry/PostHog env vars in Vercel production.
- [ ] After deploy, confirm events arrive in Sentry + PostHog (CSP no longer blocks them).
- [ ] Create the three BetterStack monitors with an Africa checking region.

**Fix the actual timeout (highest impact):**
- [ ] Put `drawintheair.com` behind Cloudflare (proxied), origin Vercel.
- [ ] Re-test from an affected Nigerian network; confirm the timeout is resolved.
- [ ] Watch PostHog `country` + Sentry latency to quantify and confirm recovery.
