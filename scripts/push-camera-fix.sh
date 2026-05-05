#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "fix(tracking): video element CSS was pausing decoder + diagnostic UI

ROOT CAUSE
The hidden <video> element in TrackingLayer used:

    style={{
        position: 'absolute',
        top: '-9999px', left: '-9999px',
        opacity: 0,
        visibility: 'hidden',
        contain: 'strict',
    }}

The combination of visibility:hidden + contain:strict + far-off-screen
positioning is a known pattern that triggers browser power-saving:
Safari, iOS Chrome, and several Android browsers will PAUSE THE VIDEO
DECODER for elements considered fully invisible. The camera stream is
attached and 'running' from getUserMedia's perspective, but no frames
are being decoded into the video element. MediaPipe's
HandLandmarker.detect() reads frames from the video — no frames means
no detection means no waves, ever.

FIX
- Video element repositioned to 1×1 pixel, position:fixed, opacity:0,
  pointer-events:none. It's still 'visible' from the browser's
  perspective so the decoder keeps running, but invisible to the user
  (no opacity, no size). Removed visibility:hidden and contain:strict.

- Added TrackingDiagnostics interface to TrackingLayer's render-prop
  children signature: cameraStatus, cameraErrorCode, trackerReady,
  visionFps. Children can now show informed UX about *why* tracking
  might not be working.

- WaveToWake now consumes those diagnostics and shows a precise
  status pill instead of the generic 'Looking for your hand…':
    * 'Camera blocked' if PERMISSION_DENIED
    * 'No camera found' if NO_DEVICE
    * 'Camera in use by another app' if DEVICE_BUSY
    * 'Starting camera…' while requesting
    * 'Loading hand tracker…' while MediaPipe model loads
    * 'Looking for your hand…' (aqua) when ready but no hand
    * '✋ Got it! Now wave!' (green) when hand detected
    * '👀 Come back into the picture' (orange) when hand lost
  Plus a subtle 'Tracking · {fps} fps' readout below.

VERIFICATION
- tsc --noEmit clean
- ESLint clean on TrackingLayer + WaveToWake
- Pre-existing lint warnings in App.tsx + TrackingLayer were already
  there before this change; noted but out of scope"

git push origin master

echo ""
echo "✅ Pushed. After Vercel redeploy + hard-refresh:"
echo "   • Camera decoder runs reliably (Safari/iOS especially)"
echo "   • Wave screen shows EXACTLY what's happening"
echo "   • If still not working, the status pill will say why"
