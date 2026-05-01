#!/usr/bin/env bash
# Push the service worker cache invalidation fix.
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "fix(sw): bust stale cache + switch JS/CSS to network-first

ROOT CAUSE
The service worker (public/service-worker.js) was caching JS and CSS
files cache-first under a hardcoded cache name 'draw-in-the-air-v1'
that never changed. The activate handler deletes any cache whose name
isn't the current CACHE_NAME, but since CACHE_NAME never moved off
'v1', no caches were ever deleted. Returning visitors got served stale
JS/CSS from cache forever, with no way to see new deploys without
manually clearing the SW in DevTools.

This is exactly why the new Kid-UI Landing rendered correctly in
local dev (no SW) but stayed broken on drawintheair.com after the
deploy: returning users were served the old JS/CSS bundles from cache.

CHANGES
- Bumped CACHE_NAME to 'draw-in-the-air-v3-kid-ui-2026-05-01'.
  The activate handler will now delete the old v1 cache on first
  load, forcing a fresh fetch of all assets.
- Switched JS/CSS to network-first (was cache-first). Vite already
  hashes asset filenames, but defensive network-first guarantees
  fresh code on every visit when online; cache only kicks in for
  offline fallback.
- Kept images/fonts cache-first (rarely change, big bandwidth wins).
- Added a 'SKIP_WAITING' message handler so a future client-side
  banner can prompt 'New version available — reload' if needed.
- Refreshed offline-fallback HTML to the bright Kid-UI palette.

USER ACTION REQUIRED
Returning users will get the fresh code automatically on next page
load (the SW activate handler runs and nukes the old cache). If a
user is still seeing the old layout after a hard-refresh, they can
manually unregister the SW: DevTools -> Application -> Service
Workers -> Unregister, then reload."

git push origin master

echo ""
echo "✅ Service worker fix pushed."
echo ""
echo "After Vercel redeploys (~1 min):"
echo "  1. Hard-refresh drawintheair.com (Cmd+Shift+R)"
echo "  2. The new SW will activate and nuke the v1 cache"
echo "  3. Next page load will be fresh JS/CSS"
echo ""
echo "If still broken after that, manually unregister the SW:"
echo "  Chrome DevTools -> Application -> Service Workers -> Unregister"
echo "  Then reload."
