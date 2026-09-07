# WP2B.3 evidence: self-hosted tracking runtime (DIA-020)

Branch `wp/2b3`. Date 2026-09-07.

## Problem

The whole hand tracking runtime (about 30 MB) loaded from two third party hosts:
`cdn.jsdelivr.net` (MediaPipe tasks-vision WASM and loader JS, version 0.10.32) and
`storage.googleapis.com` (the `hand_landmarker.task` model). A school web filter that
blocks either host let the camera start but tracking never began, so the product was
unusable on day one for that class. There was no fallback.

## What changed

1. **Assets served from our own origin.** `public/mediapipe/0.10.32/` now holds:
   - `wasm/vision_wasm_internal.js` (204,816 bytes)
   - `wasm/vision_wasm_internal.wasm` (11,453,626 bytes)
   - `wasm/vision_wasm_nosimd_internal.js` (204,669 bytes)
   - `wasm/vision_wasm_nosimd_internal.wasm` (10,647,962 bytes)
   - `hand_landmarker.task` (7,819,105 bytes)

   The four WASM files are byte-identical copies of
   `node_modules/@mediapipe/tasks-vision/wasm` at the lockfile version 0.10.32
   (verified with `cmp`; sizes match the jsdelivr `content-length` for each file).
   The model is the exact variant the code used before,
   `hand_landmarker/float16/1/hand_landmarker.task`, downloaded from the same URL.
   Its MD5 `15318430ea3851670fe9914116a9cfad` equals the Google Storage ETag;
   SHA-256 `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.
   Both simd and nosimd builds are shipped because MediaPipe picks one at runtime
   based on the browser.

   The files are static public assets. Vite copies `public/` verbatim; nothing is
   bundled or hashed, so the JS bundle sizes are unchanged (checked in the build
   output). No git LFS is configured in this repo and `public/` already carried
   44 MB of images and videos, so plain git is the repo norm; this adds 29 MB.

2. **Resolver with fallback.** New `src/core/trackingAssets.ts`:
   - Version constant and all URLs live here (self-hosted path, CDN WASM base, CDN model URL).
   - `resolveWasmBase()` probes `/mediapipe/0.10.32/wasm/vision_wasm_internal.js` on our
     origin. On success MediaPipe is given our origin as its base; on network error,
     non-200, an HTML response (SPA catch-all), or a 15 s timeout it returns the
     jsdelivr base. The probe GET also warms the browser cache for the real load.
   - `resolveModel()` fetches the model from our origin, then from Google Storage,
     applying the same checks plus a minimum size (1 MB; the model is 7.8 MB). The
     bytes are handed to MediaPipe as `modelAssetBuffer`, so MediaPipe never fetches
     the model URL itself. If both fail, the error carries both reasons.
   - WASM and model resolve in parallel and independently, so a mixed result
     (self WASM, CDN model) is possible and is logged as such.

3. **Loader wiring.** `src/core/handTracker.ts` calls the resolver first, then
   `FilesetResolver.forVisionTasks(<chosen base>)`, then GPU and CPU delegate attempts
   exactly as before but with `modelAssetBuffer` instead of `modelAssetPath`. The
   GPU and CPU fallback order, 15 s timeouts, error codes and `lastError` shape are
   unchanged. `getAssetSources()` exposes the outcome for diagnostics.

4. **Telemetry.** No `tracker_health` event exists. The existing
   `tracker_init_succeeded` and `tracker_init_failed` events now carry
   `wasm_source` and `model_source` (`'self'` or `'cdn'`) in `meta`; these events are
   already on the PostHog allowlist so the field reaches PostHog with no allowlist
   change. A new `tracker_assets_resolved` event (Supabase analytics only, not added to
   the PostHog allowlist since that is a privacy review) records both sources, the
   self-hosted skip reason if any, and resolve time.

5. **vercel.json.**
   - Header: `Cache-Control: public, max-age=31536000, immutable` for `/mediapipe/(.*)`.
     Safe because the path includes the tasks-vision version; a version bump changes
     the path.
   - Header: `Content-Type: application/octet-stream` for `/mediapipe/(.*)\.task`
     (unknown extension).
   - The SPA rewrite exclusion list now includes `mediapipe`, so a missing file under
     `/mediapipe/` returns a real 404 instead of `index.html`. The resolver also rejects
     an HTML body, so it is safe either way.

6. **CSP.** No change to the header value was needed: `script-src` and `connect-src`
   already contain `'self'`, and `'unsafe-eval'` in `script-src` covers WebAssembly
   compilation. The CDN hosts stay allowed for the fallback path.
   `scripts/check-csp.mjs` now also asserts `'self'` in `script-src` and `connect-src`
   (14 requirements, all present), and `docs/CSP_REQUIREMENTS.md` documents the new
   primary and fallback roles.

7. **Service worker** (`public/service-worker.js`). Checked: it never blocked these
   files and never cache-busts them. But `.js` under our origin went through the
   network-first strategy with a 6 s race, which on a slow school link would fail the
   loader script before it finished and push tracking onto the CDN. Requests under
   `/mediapipe/` now return early from the fetch handler so the browser and the
   immutable header handle them. `CACHE_VERSION` was **not** bumped (DIA-035 is
   deferred); this change does not alter any cached content, and the SW file itself
   updates by byte diff on the next navigation.

## How verified

- `npm ci`: ok.
- `npm run type-check`: ok.
- `npm run lint`: 0 errors, 162 warnings (same 162 as before this branch; new files add none).
- `npm test`: 27 files, 271 tests passed, including the new `tests/trackingAssets.test.ts`
  (15 tests: self first; CDN fallback on network error, non-200, HTML body, small body,
  timeout; both-fail error carries both reasons; WASM and model resolve independently;
  CDN never contacted when self succeeds).
- `npm run build`: ok. `dist/mediapipe/0.10.32/` contains the five files at the sizes
  above; no model bytes in `dist/assets/`.
- `./scripts/check-task.sh`: all local checks passed on `wp/2b3`.

Not verified here (no browser or camera in the agent container): the live Gate 4 test
below. It must be run by the founder before the gate closes.

## Gate 4 test (founder, by hand)

Goal: with both CDN hosts blocked, `/play` tracking still starts.

1. Deploy the branch to a Vercel preview (PR opens one automatically).
2. On a laptop with a webcam, edit the hosts file as admin
   (macOS/Linux `/etc/hosts`, Windows `C:\Windows\System32\drivers\etc\hosts`) and add:
   ```
   127.0.0.1 cdn.jsdelivr.net
   127.0.0.1 storage.googleapis.com
   ```
   Flush DNS (`sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` on macOS,
   `ipconfig /flushdns` on Windows). Confirm `https://cdn.jsdelivr.net` fails to load in
   a tab.
3. Open the preview URL `/play` in a fresh profile or after clearing site data
   (so the service worker and caches are cold). Allow the camera.
4. Expect: the wave-to-wake screen detects the hand and play begins.
   In DevTools Network, `vision_wasm_internal.js`, `vision_wasm_internal.wasm` and
   `hand_landmarker.task` load from the preview origin under `/mediapipe/0.10.32/`
   with `cache-control: public, max-age=31536000, immutable`. No request to either
   CDN host succeeds. Console shows `[HandTracker] assets: wasm=self model=self`.
5. Reverse check: also open production (`drawintheair.com/play`, still CDN-only until
   this merges) with the same hosts block and confirm tracking does **not** start
   there. That is the before state.
6. Fallback check: remove the hosts entries, then block `*/mediapipe/*` in DevTools
   (Network request blocking), reload
   `/play`, and confirm console shows `wasm=cdn model=cdn` and tracking still starts.
7. Remove the hosts entries afterwards.

Record the result (screenshots of Network panel and console) in this folder.

## Roll back

Revert the PR on `master` (code rollback). The app returns to CDN-only loading. The
static files under `public/mediapipe/` are inert if left behind. No database or Vercel
dashboard change is involved.

## Founder-only steps

- Run the Gate 4 test above on the preview deployment and record evidence.
- None in the Vercel or Supabase dashboards. Headers and rewrites ship in `vercel.json`.
- School IT guidance: with this change the only host a school must allow for tracking
  is `drawintheair.com`. The register's suggestion to publish a required-hosts list
  in the school setup guide is not part of this package (documentation track).

## Findings logged (out of scope)

See `docs/audits/RELEASE_FINDINGS_LOG.md` entries added under Gate 2B for this package.

## Maintenance note

When `@mediapipe/tasks-vision` is upgraded: update `TASKS_VISION_VERSION` in
`src/core/trackingAssets.ts`, create `public/mediapipe/<new version>/wasm/` from the
new `node_modules/@mediapipe/tasks-vision/wasm`, copy the model into the new folder,
delete the old folder, and rerun the Gate 4 test. If the folder and the constant ever
disagree, the probe misses and the CDN fallback keeps the product working, but every
school on a filtered network loses tracking again, so treat the version bump as one change.
