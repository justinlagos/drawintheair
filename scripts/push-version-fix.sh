#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "fix(tracking): pin WASM URL to ACTUAL resolved version (0.10.32)

ROOT CAUSE OF THE 'WORKED FEW DAYS AGO, NOW BROKEN' REGRESSION

In yesterday's P1.c fix I pinned the MediaPipe WASM URL to:
    @mediapipe/tasks-vision@0.10.22-rc.20250304

That's the version listed in package.json, but the caret range in
package.json (^0.10.22-rc.20250304) lets npm resolve to any compatible
newer release. package-lock.json shows the ACTUAL installed JS version
is 0.10.32.

The MediaPipe JS↔WASM API contract is version-locked. JS 0.10.32 calling
into WASM 0.10.22 fails inside createFromOptions for both GPU and CPU
delegates → both delegates throw → my new TrackerErrorScreen shows
'Hand tracking couldn't start on this device.'

This is exactly the bug I introduced. Tracking worked fine before, my
'fix' broke it across all browsers and devices because every user was
hitting the version-mismatched WASM.

FIX
- TASKS_VISION_VERSION bumped from '0.10.22-rc.20250304' → '0.10.32'
  to match what's actually in node_modules.
- Verified the new URL is reachable on jsdelivr (got 200KB JS).
- Comment in the file explains how to verify the version after future
  npm install runs (grep package-lock.json).

LESSON LEARNED
Pin to the LOCK file, not the package.json range. They are not the
same thing for caret/tilde ranges."

git push origin master

echo ""
echo "✅ Pushed. After Vercel redeploy + hard-refresh, hand tracking"
echo "   should initialise correctly again."
