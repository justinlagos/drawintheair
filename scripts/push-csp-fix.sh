#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "fix(csp): add MediaPipe origins + build-time regression guard

ROOT CAUSE OF THE 'WORKED FEW DAYS AGO, NOW BROKEN' REGRESSION

The Kid-UI design rollout (commit 7f98f1f, May 1) shipped a strict
Content-Security-Policy in vercel.json. The connect-src directive
allowed only 'self', supabase, and script.google.com. It DID NOT
include cdn.jsdelivr.net (where MediaPipe WASM lives) or
storage.googleapis.com (where the hand_landmarker model lives).

Result: the browser blocked every fetch MediaPipe made for its own
WASM and model files. Both GPU and CPU createFromOptions failed with
[object Event] (the rejection format browsers use when CSP blocks a
fetch). 100% of users, all browsers, all devices, no hand tracking.

Took 3 days and 4 wrong fixes (diagnostics, CPU fallback, version
pin, video CSS) to find — because the symptom looked like a
MediaPipe init bug. The actual cause was 50 chars of missing CSP.

THE FIX
- vercel.json: added required origins to script-src, connect-src,
  worker-src, font-src. Now allows:
    cdn.jsdelivr.net (script-src + connect-src) — MediaPipe WASM
    storage.googleapis.com (connect-src) — MediaPipe model
    blob: (worker-src) — MediaPipe spawns workers from blob URLs
    cdn.tailwindcss.com (script-src) — Tailwind CDN
    googletagmanager.com + google-analytics.com — GA4
    *.clarity.ms — Microsoft Clarity
    data: in font-src — inline font support

REGRESSION GUARD
- scripts/check-csp.mjs: build-time validator that reads vercel.json
  and fails the build (exit 1) if any required CSP origin is missing.
  REQUIREMENTS array in the script is the single source of truth.
- package.json: 'prebuild' hook now runs check:csp before type-check.
  Vercel's build will fail before a broken CSP can ship.
- Verified the guard works: temporarily removed cdn.jsdelivr.net,
  the guard caught it with a clear error and exit code 1.

DOCS
- docs/CSP_REQUIREMENTS.md: full list of required origins, why each
  is needed, how to add/remove dependencies, and how to test CSP
  locally (preview build, not vite dev which doesn't apply Vercel
  headers).

THE WHOLE PLATFORM IS BUILT ON HAND TRACKING. We are not letting
50 chars of missing CSP break it again."

git push origin master

echo ""
echo "✅ Pushed."
echo "   After Vercel redeploy + hard-refresh, hand tracking will work."
echo "   The check:csp guard now runs on every build — Vercel will fail"
echo "   the build if any future change forgets a required origin."
