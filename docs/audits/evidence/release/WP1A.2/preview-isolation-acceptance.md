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
