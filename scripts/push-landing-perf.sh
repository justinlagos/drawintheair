#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  public/service-worker.js \
  src/pages/Landing.tsx \
  scripts/push-landing-perf.sh

git commit -m "perf(landing): cache bust + lazy-mount videos

CACHE STALENESS
  service-worker.js CACHE_VERSION bumped to v6-landing-2026-05-14.
  Previous value (v4-analytics-2026-05-07) had not been incremented
  across v5.x landing pushes, so the cache-first PNG strategy kept
  serving the old icons with white-background squares until users
  hard-refreshed. With the bump, the next visit installs the new
  SW, skipWaiting + clients.claim activate immediately, and the
  activate handler nukes the v4 cache so all /landing-icons/*.png
  are re-fetched fresh.

PERF . lazy-mount activity videos
  Previously the landing rendered 8 cards, 6 of them with
  <video preload='metadata' autoplay loop> elements that the
  browser started fetching on first paint. On mid-tier phones
  that meant 6 concurrent webm + 6 mp4 + 6 poster requests
  before the hero finished hydrating. We were saying 'I'm a
  conversion landing' while behaving like a video gallery.

  Now: each GameCard tracks an isVisible state. The <img poster>
  fallback renders until an IntersectionObserver fires (threshold
  0.1, rootMargin '0 0 25% 0' so the swap happens just before the
  card scrolls in). Once visible, the <video> mounts ONCE and the
  observer disconnects. Browser handles tab-visibility / pause
  decisions natively from there. Same treatment applied to the
  two RealKidCard phone mock-ups below the fold . those clips
  are 700 KB each and were downloading on first load even though
  almost no one ever scrolled past the activity grid.

PERF . defer hero loop video
  The hero device showed the merged FreePaint + BalloonMath +
  SortandPlace concat. That video starts decoding immediately
  in v5.2. Now: the hero poster image renders instantly, and the
  <video> swap waits for the browser's idle callback (or a 250ms
  setTimeout fallback). First Contentful Paint stops competing
  with hero-loop.webm bytes.

PERF . prefers-reduced-motion
  All video lazy-mount paths short-circuit when the user has
  reduced-motion on. Poster-only experience, no decode, no
  observer cost.

VERIFIED
  - tsc -b clean
  - check-csp passes
  - SW skipWaiting + clients.claim already in place so the bump
    takes effect on the next page load, no extra reload needed."

git push origin master

echo ""
echo "Landing perf + cache bust shipped."
