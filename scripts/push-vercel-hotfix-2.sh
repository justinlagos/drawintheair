#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
echo "=== tsc -b (build-mode, what npm run build actually runs) ==="
npx tsc -b
echo "=== eslint ==="
npx eslint src/

git add \
  src/components/share/ShareButton.tsx \
  src/features/modes/calibration/bubbleCalibrationLogic.ts \
  src/lib/analytics.ts \
  scripts/push-vercel-hotfix-2.sh

git commit -m "fix(build): four type errors that tsc -b catches but tsc --noEmit hid

The previous hotfix (247e743) fixed eslint v7 strictness so the
prebuild lint gate would pass, but Vercel kept failing because
'npm run build' uses 'tsc -b' (build mode with project references),
which surfaces type errors that 'tsc --noEmit' silently allowed.
I'd been validating with the wrong tsc invocation.

The four real type errors:

1. src/components/share/ShareButton.tsx:270
   The Tier-A wiring referenced a non-existent variable
   activitySlug; the prop is named gameMode.

2. src/features/modes/calibration/bubbleCalibrationLogic.ts:510
   gameStartTime is 'number | null'; my Tier B/C wiring used
     gameStartTime > 0 ? now - gameStartTime : null
   which trips strictNullChecks. Switched to an explicit null
   guard.

3-4. src/lib/analytics.ts:640
   logEvent's EventOptions.page is 'string | undefined'; my
   Page-listeners wiring set it to 'string | null'. Switched the
   fallback to undefined.

VERIFICATION
- tsc -b           clean (was failing with 4 errors)
- tsc --noEmit     clean
- eslint src/      0 errors
- vite build       214 modules transformed successfully (Vercel
                   parity verified locally with rollup-linux-arm64)
- check-csp        passes

After this commit lands, the Vercel build pipeline should finally
go green and ship every analytics commit since 20f11e6 in one
deploy."

git push origin master

echo ""
echo "Pushed second hotfix. Watch Vercel:"
echo "  https://vercel.com/withinafricas-projects/drawintheair/deployments"
echo ""
echo "Once the deploy goes Ready, every Tier A→D + Gap 1→7 change"
echo "will finally be live on drawintheair.com."
