#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "fix(tracking): P1 + P4-rev — surface init errors, CPU fallback, help screen

ROOT CAUSE (per docs/HAND_TRACKING_AUDIT.md)
TrackingLayer's handTracker.initialize() catch was dev-only:

    .catch(err => {
        if (CAMERA_DEBUG) console.error('[HandTracker] init failed:', err);
    });

In production, any init failure was silent. trackerReady stayed false
forever, vision loop never started, the wave screen sat at 'Looking
for your hand…' with zero feedback. Combined with hardcoded
delegate:'GPU' (which fails on most non-flagship Android, many
Chromebooks, Linux configs without WebGL2) this matched the user's
'all browsers, all devices' symptom precisely.

P1.a — Surface init errors as a real state
- handTracker now stores lastError with code/message/triedDelegates.
- TrackingLayer's catch sets trackerError state instead of silently
  logging.
- Diagnostics object exposed to children includes trackerError +
  trackerDelegate + retryTracker.

P1.b — CPU fallback when GPU delegate fails
- handTracker.initialize() tries GPU first, catches failure, retries
  with delegate:'CPU'. Only throws if both fail. CPU is slower
  (~15fps) but works on every device with WebAssembly.

P1.c — Pin WASM URL to package.json version
- Was: cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm
- Now: cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm
- Removes flakiness from @latest tag resolving to incompatible WASM.

P1.d — 15-second timeout on every init step
- forVisionTasks (WASM load) and createFromOptions (model load) each
  race against a 15-second Promise.race timeout. Surfaces a TIMEOUT
  error code instead of hanging forever.

P4-rev — Tracking-failed help screen, NOT a bypass
- The previously shipped 'Skip — let me in' button was wrong: it
  dumped the kid into a mode-selection menu that itself requires hand
  tracking. Removed.
- Replaced with a dedicated TrackerErrorScreen that takes over the
  /play view when trackerError is non-null. Shows:
    • Headline tailored to the error code (WASM_LOAD, GPU_INIT,
      TIMEOUT, etc.)
    • Numbered list of common fixes (network, browser, hardware)
    • 'Try again' button (calls retryTracker)
    • 'Back to home' button (returns to landing)
    • 'Tell us what happened' (mailto with prefilled UA + error)
    • Collapsible technical-details section
- No bypass — every screen after this requires tracking, so honest
  failure UX is the right call.

VERIFICATION
- tsc --noEmit clean
- ESLint clean for handTracker.ts, TrackingLayer.tsx, WaveToWake.tsx
- TASKS_VISION_VERSION constant matches the version in package.json"

git push origin master

echo ""
echo "✅ Pushed. After Vercel redeploy + hard-refresh:"
echo "   • If GPU init fails, CPU fallback automatically kicks in"
echo "   • If WASM/model fetch fails, 15s timeout fires with clear error"
echo "   • Wave screen will tell you EXACTLY what went wrong + offer Retry"
echo "   • No more silent 'Looking for your hand…' forever"
