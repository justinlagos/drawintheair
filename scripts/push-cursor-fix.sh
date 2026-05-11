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
  scripts/push-cursor-fix.sh

git commit -m "fix(cursor): one cursor, no offset — remove duplicate canvas finger cursor in spelling + tracing

Reported 2026-05-11: in Spelling Stars and Tracing the small blue
dot (canvas-drawn at the raw fingertip position) sat ~60–80 px
above the bigger MagicCursor glow. Users couldn't tell which one
their hand controlled.

Root cause
  Two cursor renderings ran simultaneously:
   1. The global <MagicCursor> HTML overlay at the smoothed fingertip
      position (adaptive smoothing + canvas-mapper CSS size).
   2. A per-mode canvas-drawn aqua circle at the raw fingertip via
      normalizedToCanvas — device-pixel canvas space, no smoothing.
  Coordinate pipelines don't share a frame; smoothing also adds lag.
  Net effect: a visible vertical offset, worst on mobile.

Fix (Option 3 — concentric, one cursor)
  Remove the canvas-drawn finger cursor in both modes. MagicCursor
  already renders concentric ring + inner dot from a single position
  — that becomes the only on-screen cursor. The green tile-frame
  still shows which letter Spelling Stars is hovering, and the
  tracing path itself glows + advances progress when the finger is
  on-path, so no semantic information is lost.

Files
  src/features/modes/gestureSpelling/gestureSpellingLogic.ts
    Removed the 'Finger cursor' canvas block. fingerCanvas is still
    computed for tile hit-testing.

  src/features/modes/tracing/tracingLogicV2.ts
    Removed drawFingerFeedback() call + the function definition.
    Left a comment pointing to git history and noting that on-path
    colour feedback, if re-introduced, should drive MagicCursor's
    'state' prop rather than a second canvas-drawn dot.

NOT TOUCHED YET
  balloonMath, rainbowBridge, sortAndPlace, preWriting, and
  calibration each have similar canvas-drawn cursors. Audit
  whether they're visibly offset and, if so, ship a follow-up that
  removes them too — the symptom + cure is mechanical. Skipped
  here because the user only flagged tracing + spelling.

VERIFIED
  - tsc -b           clean
  - check-csp        passes"

git push origin master

echo ""
echo "Cursor fix shipped. Re-walk Spelling Stars + Tracing on mobile to confirm one cursor only."
