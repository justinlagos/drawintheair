# WP1A.2 acceptance — preview isolation, first attempt and the defect it found

**Date:** 8 September 2026. Preview deployment `dpl_Ddjo5CeahY9EAfEzkmXjbZwLJg7L`, commit `a5ab38b` on `release/new-term`, URL `drawintheair-hi76l9zfp-withinafricas-projects.vercel.app`.

## Baseline counts, taken before any test traffic

| | analytics_events | sessions | session_students | auth.users | newest event |
|---|---|---|---|---|---|
| Production `fmrsfjxwswzhvicylaph` | 807098 | 7 | 33 | 46 | 2026-09-08 11:01:25Z |
| Staging `dcivdrhxeaiulbbhsgfv` | 200 | 3 | 30 | 5 | 2026-09-08 05:53:58Z |

## What passed

**Build-time isolation: PASS.** The preview bundle `index-B8E04fpy.js` was fetched and searched for every `https://<ref>.supabase.co` string. It contains exactly one Supabase origin, `https://dcivdrhxeaiulbbhsgfv.supabase.co` (staging). No production reference survives in the preview build. The Preview-scoped environment variables are therefore being applied.

**Production untouched: PASS.** No production row count moved during testing.

**Unplanned bonus, WP2B.1 confirmed live.** A network capture of `/play` on the preview shows no cookie-banner request and no Google Analytics, Clarity, PostHog, or Meta Pixel traffic at all. The only third-party call is Sentry (scrubbed error reporting), which WP2B.1 deliberately keeps. This is the first observation of that package running outside a unit test.

## What failed, and why it matters

**Runtime isolation: FAIL on first attempt.** Any call from the preview to staging is blocked by the browser before it leaves the page. The response header on the preview reads:

```
connect-src 'self' https://fmrsfjxwswzhvicylaph.supabase.co wss://fmrsfjxwswzhvicylaph.supabase.co ...
```

`vercel.json` carried a single Content-Security-Policy for every host, naming the **production** Supabase origin. A preview build points at staging, so every REST call, every realtime socket and every auth request fails with `TypeError: Failed to fetch`. Reproduced directly in the browser.

This was pre-existing and invisible: it only becomes reachable the moment previews stop pointing at production, which is the entire point of WP1A.2. Left unfixed it would have made staging useless while looking configured, and each Gate 2 package would have been "rehearsed on staging" against a database it could never reach.

## Fix applied on `release/new-term`

`vercel.json`'s single header block is now three, using Vercel's host conditions:

1. `has: host = drawintheair.com` → CSP naming the production Supabase origin
2. `has: host = www.drawintheair.com` → same
3. no host condition (every preview URL) → identical CSP with the staging origin substituted, `https` and `wss`

Everything else in the policy is byte-identical across the three, so this widens nothing: production still cannot connect to staging, and previews still cannot connect to production.

`scripts/check-csp.mjs` was reworked so this cannot regress:

- it previously validated only the **first** CSP it found in `vercel.json`; it now validates **every** policy block, and names the offending block in failures
- the two hard-coded Supabase requirements were removed (no single origin can be correct for both blocks) and replaced by `checkSupabaseSplit()`, which asserts each block carries the right origin **and** does not carry the wrong one, `wss://` included
- the guard was tested by deliberately reverting the preview block to the production origin: it fails with a specific message. Restored, it passes.

The script runs in `prebuild`, so a future edit that re-pins the CSP fails the build rather than silently disabling staging.

## Checks after the change

`type-check` clean, lint 0 errors, 403 tests pass, build writes 93 full-body routes, `check-csp` passes across 3 policy blocks.

## Still outstanding

The runtime write test must be repeated on the **next** preview build, which is the first one to carry the corrected CSP. Acceptance is not signed off until a preview is observed writing a row into staging while production counts hold still.

Two further observations from the same capture, logged not fixed:

- Self-hosted MediaPipe (WP2B.3) could not be exercised on this preview: Vercel deployment protection intercepts `/mediapipe/*` and returns 503 with an SSO redirect, so the runtime fell back to jsdelivr and storage.googleapis. The fallback path is therefore proven working, but the self-hosted path needs an unprotected preview or production to test. The files are present in the build output.
- `/manifest.json` also 503s on protected previews, same cause.

---

# Second attempt, after the CSP fix: PASS

**Preview `dpl_9h2Wh43b177PFzQbM4kwqFoaFew2`, commit `b30f8ad`, URL `drawintheair-65mg2p6dw-withinafricas-projects.vercel.app`.**

## 1. Policy now names staging on a preview

Read from the live response header on the preview:

```
connect-src ... https://dcivdrhxeaiulbbhsgfv.supabase.co wss://dcivdrhxeaiulbbhsgfv.supabase.co
```

Production origin absent, both the https and wss staging origins present.

## 2. The application itself wrote to staging

`/play` was opened on the preview and left to run. With the CSP corrected, the app's own analytics flushed for the first time. Twenty-two genuine application events landed in **staging**, all from one device id, all on `/play`:

`wave_screen_view`, `camera_explainer_shown`, `feature_flag_exposed`, `tracker_init_started`, `tracker_assets_resolved`, `tracker_init_succeeded`, `stuck_help_shown`, `session_heartbeat` ×2, `tab_visible` ×4, `tab_hidden` ×4, `csp_violation` ×6.

This is the acceptance criterion in the strict sense: not a probe I wrote by hand, but the product's own telemetry path writing to staging because that is where the build points.

A single deliberate probe was also sent through the same RPC the app uses (`ingest_analytics_events`), using the credentials baked into the preview bundle rather than any value supplied by hand: `event_uid b8b14104-13e9-4987-b76d-4c1f85a515ad`, returned `1` row inserted, and is present in staging tagged `traffic_type: internal`.

Two malformed first attempts are worth recording because they are proof the call reached the database rather than a network stub: a non-UUID `event_uid` returned `22P02 invalid input syntax for type uuid`, and an event without `session_id` returned `200` with `0` rows, matching the function's `WHERE r.session_id IS NOT NULL` guard.

## 3. Counts

| | analytics_events before | after | delta |
|---|---|---|---|
| Staging | 200 | 223 | **+23** (22 app events + 1 probe) |
| Production | 807098 | 807134 | +36, none from this test |

Production's movement is ordinary public traffic on the live site during the same twenty minutes. Verified not ours: `select count(*) from analytics_events where device_id = 'wp1a2-acceptance-probe' or event_name = 'internal_health_probe'` returns **0** on production. `sessions`, `session_students` and `auth.users` are unchanged on both.

**WP1A.2 acceptance: PASS.** A preview deployment writes to staging and leaves production untouched, proven by row counts on both.

## New findings from the run

**Preview traffic is labelled `traffic_type: real` and `environment: production`.** Visible in the meta of the events above. Harmless today because those rows are in staging, but it means the internal-traffic exclusion does not classify preview traffic, and any future analysis that reads staging will treat rehearsal traffic as genuine. Fix is a Preview-scoped `VITE_APP_ENV`. Logged, not fixed, outside WP1A.2 scope.

**The six `csp_violation` events are an artefact of deployment protection, not a policy defect.** All six are same-origin URLs (`/manifest.json`, `/mediapipe/0.10.32/wasm/vision_wasm_internal.js`, `/mediapipe/0.10.32/hand_landmarker.task`) that Vercel's SSO protection redirects to `vercel.com`, which the policy correctly refuses. On production these paths are same-origin and unprotected. The consequence for WP2B.3 stands: the self-hosted MediaPipe path cannot be exercised on a protected preview, and `tracker_init_succeeded` here was reached through the CDN fallback. That fallback is now demonstrated working end to end on a real device, which is half of DIA-020 proven.
