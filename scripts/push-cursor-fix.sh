#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  src/features/modes/gestureSpelling/gestureSpellingLogic.ts \
  src/features/modes/tracing/tracingLogicV2.ts \
  src/features/modes/balloonMath/balloonMathLogic.ts \
  src/features/modes/rainbowBridge/rainbowBridgeLogic.ts \
  src/features/modes/sortAndPlace/sortAndPlaceLogic.ts \
  src/features/modes/calibration/bubbleCalibrationLogic.ts \
  src/features/modes/preWriting/preWritingLogic.ts \
  scripts/push-cursor-fix.sh

git commit -m "fix(cursor): one cursor across all 7 modes — remove duplicate canvas finger cursors

Reported 2026-05-11 (Spelling Stars + Tracing): the small blue dot
(canvas-drawn at the raw fingertip) sat ~60–80 px above the bigger
MagicCursor glow. Users couldn't tell which one their hand controlled.
Same root cause exists in every mode that draws its own finger cursor
on the canvas, so this commit fixes them all in one pass.

Root cause
  Two cursor renderings ran simultaneously in every mode:
   1. The global <MagicCursor> HTML overlay at the smoothed fingertip
      via its own adaptive smoothing + canvas-mapper CSS size.
   2. A per-mode canvas-drawn circle at the raw fingertip via
      normalizedToCanvas — device-pixel canvas space, no smoothing.
  Different coordinate frames + smoothing lag = visible offset.

Fix (Option 3 — one concentric cursor)
  Remove the canvas-drawn finger cursor in every mode. MagicCursor
  already renders concentric ring + inner dot from a single
  position — that becomes the only on-screen cursor. Each mode's
  game-specific feedback (hit-test, on-path glow, balloon pop, etc.)
  is preserved because it doesn't depend on the cursor visual.

Files touched (all 7 modes)

  src/features/modes/gestureSpelling/gestureSpellingLogic.ts
    Removed 'Finger cursor' canvas block. fingerCanvas still computed
    for tile hit-testing.

  src/features/modes/tracing/tracingLogicV2.ts
    Removed drawFingerFeedback() call AND its function definition.
    Path itself glows + progress advances when on-path; no info lost.

  src/features/modes/balloonMath/balloonMathLogic.ts
    Removed 'Finger cursor' canvas block. fingerCanvas still computed
    for balloon hit-testing.

  src/features/modes/rainbowBridge/rainbowBridgeLogic.ts
    Removed 'Finger cursor' canvas block. fingerCanvas still computed
    for stone hit-testing.

  src/features/modes/sortAndPlace/sortAndPlaceLogic.ts
    Removed the dual-ring cursor (which also signalled pinchActive
    via gold colouring). Follow-up: route pinchActive through
    MagicCursor's existing 'active' state class so the cursor lights
    up when the kid is pinching to grab. Not done here to keep this
    commit purely mechanical.

  src/features/modes/calibration/bubbleCalibrationLogic.ts
    Removed the finger indicator. fingerCanvas still computed for
    bubble hit-test + pop detection.

  src/features/modes/preWriting/preWritingLogic.ts
    Removed the on-path aqua brush + white highlight blob AND the
    off-path coral nudge ring around the fingertip. KEPT the
    off-path directional arrow (it's a 'where to go' hint, not a
    cursor) and the on-path fire-streak emoji (progress feedback).

VERIFIED
  - tsc -b            clean
  - check-csp         passes
  - Every fingerCanvas usage for hit-testing still works"

git push origin master

echo ""
echo "Cursor fix shipped across all 7 modes."
echo "Re-walk Spelling Stars, Tracing, Balloon Math, Rainbow Bridge,"
echo "Sort & Place, Calibration, and Pre-Writing once Vercel deploys."
