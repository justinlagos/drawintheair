# WP2B.1 (DIA-009) Child-route analytics

Branch: `wp/2b1`. Gate 2B, New-Term Readiness Release.

## Problem

The cookie consent banner rendered over `/play` and `/join` and was tappable
by a child. Tapping Accept loaded Google Analytics 4, Microsoft Clarity, the
Meta Pixel and PostHog. Clarity then recorded child gameplay DOM with no
masking. A consent granted by an adult on a marketing page also stayed in
force when the same browser moved to a child screen.

## What changed

Rule: optional third-party analytics run only when (1) an adult granted
cookie consent AND (2) the current screen is not one a child uses. Rule 2
wins over stored consent, including SPA navigation from an adult page to a
child page without a reload.

Child routes (mirrors `getRouteFromPath` in `src/main.tsx`):
`/play`, `/onboarding`, `/app`, `#app` hash on any path, `/join`, `/join/*`,
`/demo`, and the dev-only `/dev/tracing-preview` and `/dev/free-paint-preview`.
Exact match or prefix followed by `/`; `/playground` is not a child route.

Adult routes (marketing, teacher `/class`, `/teacher/*`, `/teach/observe`,
parent `/parent/*`, admin `/admin/*`, legal pages, SEO pages) keep the
existing consent flow unchanged.

Files:

| File | Change |
|---|---|
| `src/lib/childRoutes.ts` | New. `isChildRoute(path, hash?)` and `isCurrentChildRoute()`. Pure, no DOM, single list to audit. |
| `src/lib/thirdPartyAnalytics.ts` | New. `thirdPartyAnalyticsAllowed()`, `stopClarity()`, `suspendThirdPartyAnalytics()`, `resumeThirdPartyAnalytics()`, `applyRouteAnalyticsPolicy()`, and a small hook registry so SDK-backed tools (PostHog, Meta) suspend and resume without importing SDKs into the gate. GA and Clarity ids moved here as constants. |
| `src/main.tsx` | The router calls `applyRouteAnalyticsPolicy(path, hash)` on every navigation (initial load, popstate, hashchange, pushState) and dispatches a `dia:route` event. The deferred loader refuses to inject GA4 / Clarity / Meta when consent is missing, when the route is a child route, or when the child block flag is set. The consent-granted listener has the same guard. |
| `src/components/CookieConsentBanner.tsx` | Returns null on a child route; re-evaluates on popstate, hashchange and `dia:route`. A child can never see or tap consent, and the play area is unobstructed. |
| `src/lib/observability/index.ts` | PostHog initialises only when `thirdPartyAnalyticsAllowed()`; registers PostHog and Meta suspend/resume hooks. |
| `src/lib/observability/posthog.ts` | `suspendPostHog()` / `resumePostHog()` (opt out / opt in capturing). `trackEvent` and `identifyPseudonymous` no-op while suspended. Suspend before init is honoured when init runs later. |
| `src/lib/observability/meta.ts` | `suspendMetaPixel()` / `resumeMetaPixel()`. `trackMeta` and `trackMetaPageView` no-op while suspended. |
| `src/pages/Privacy.tsx` | Two sentences stating that third-party tools are off on child screens and no banner is shown to a child. |
| `tests/child-routes.test.ts` | 8 tests on the route helper. |
| `tests/third-party-analytics.test.ts` | 15 tests on the gate, including "consent granted on adult route, then SPA navigation to /play stops Clarity and removes its script". |

What happens on a child route, even when consent was granted earlier:

- Clarity: `clarity('consent', false)` then `clarity('stop')`. Works whether
  the real tag has loaded or only the pre-load stub exists (the stub queues
  the call and the tag replays it on arrival). Any `script[src*="clarity.ms"]`
  element is removed from the DOM. Nothing re-injects it: the loader checks
  route and block flag before every injection.
- GA4: `window['ga-disable-G-S4XSWT6Q09'] = true` and
  `gtag('consent', 'update', { analytics_storage: 'denied', ... })`.
- Meta Pixel: `fbq('consent', 'revoke')` and the wrapper's suspend flag.
- PostHog: `posthog.opt_out_capturing()` and the wrapper's suspend flag.

Returning to an adult route with consent resumes the tools. Without consent,
or on a child route, resume is a no-op.

Kept on child routes, on purpose: first-party learning telemetry
(`src/lib/analytics.ts`, Supabase `analytics_events` and `learning_attempts`,
no PII, pseudonymous ids) and scrubbed Sentry error reporting
(`src/lib/observability/sentry.ts`, `beforeSend` denylist, session replay off
by default).

CSP: no change needed. `vercel.json` still allow-lists the GA, Clarity, Meta
and PostHog hosts because adult routes still use them; the child-route block
is enforced in code, not by CSP.

## How verified

`./scripts/check-task.sh` on `wp/2b1`:

- Lint: 0 errors, 162 warnings (ratchet `--max-warnings 162` unchanged; the
  three pre-existing warnings in `main.tsx` are unchanged, no new warnings).
- Type check: pass.
- Unit tests: 28 files, 279 tests, pass (23 new).
- Env-safety guard: pass. CSP check: pass. Secret scan: pass (the known
  `.env.example` placeholder note, findings log #7).
- Production build: pass.

## Gate 4 check (founder, on the production deploy)

1. In a fresh browser profile, open `https://drawintheair.com/` and tap
   Accept on the cookie banner. Open DevTools, Network tab, filter
   `clarity|gtag|googletagmanager|facebook|fbevents|posthog`. Requests should
   appear (consent granted on an adult route, expected).
2. Without reloading, tap the CTA into `/play`. Requests to those hosts must
   stop. In the Console, `window.clarity` may exist but the tag is stopped;
   `document.querySelector('script[src*="clarity.ms"]')` returns `null`;
   `window['ga-disable-G-S4XSWT6Q09']` is `true`.
3. Reload directly on `/play` with the same profile (consent still stored).
   The Network filter above must show zero requests to those hosts for the
   whole session, and no cookie banner is shown. Repeat on `/join`.
4. Fresh profile, open `/play` directly: no cookie banner, no third-party
   requests, before and after any child action.
5. Supabase `analytics_events` still receives rows from the `/play` session
   (first-party telemetry kept). Sentry still receives a test error if one is
   forced (error reporting kept).

## Founder-only manual step (Clarity dashboard)

Historical recordings made before this change may contain child gameplay.
Code cannot delete them.

1. Sign in to Microsoft Clarity, project `vseevw9uck`.
2. Recordings, filter by URL containing `/play`, `/join`, `/app`,
   `/onboarding`, `/demo`. Review, then delete every matching recording.
   Also delete recordings whose entry page was an adult route but which
   navigated into one of those paths (filter by visited URL).
3. Check Heatmaps for the same URLs and delete those heatmaps.
4. Optionally reduce the project's data retention to the minimum, and
   confirm masking is set to "Strict" in project settings as a second layer.
5. Record the date and the number of recordings deleted here.

Deleted on: ____  Recordings removed: ____  By: ____

## Rollback

Revert the squash commit of this PR on `master` via a revert PR (deploy
contract: no manual promotes). Behaviour returns to the previous consent
flow. No migrations, no env changes, no CSP changes.
