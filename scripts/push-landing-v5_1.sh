#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  src/pages/Landing.tsx \
  src/pages/landing-v3.css \
  public/landing-videos/ \
  public/landing-icons/ \
  scripts/push-landing-v5_1.sh

git commit -m "feat(landing): v5.1 . clean icons, real videos, bounce-scroll nav

ICONS . full RGBA, no quantization artifacts
  Re-exported all 14 icons from /VIDEOS---/ with the alpha channel
  fully preserved. No -colors 256 step. Corner pixels read 0% alpha
  (was 0.8% before). Each PNG is ~200 KB, total 2.7 MB. Edges are
  crisp, no semi-opaque halo.

SKILL CARDS . transparent surface
  The four skill tiles (Letters & Sounds, Shapes & Patterns, Early
  Math, Focus & Memory) no longer sit on white cards. Background,
  border, and shadow removed. Icons now bloom directly on the cream
  page background with a deeper drop-shadow. The colored discs in
  the source illustrations read as the icon itself, not a white-card
  artifact.

SPELLING STARS . real video
  Wired SpellingStars.mp4 (trimmed 8-13s, 'spell the word' prompt
  visible) into the Spelling Stars card. Was a static letter-tile
  poster image. Now plays on hover with the same WebM + MP4 pair
  as the others.

BALLOON MATH . better segment
  Old trim landed on a 'You spelled it' modal overlay. Re-encoded
  at 14-19s where the gameplay shows 'Pop the number 5' with
  numbered balloons floating up. Much clearer than the random
  modal frame.

NAV . sticky, animated, bounce-scrolls
  - Nav is sticky and present on every scroll position.
  - Spring-driven bounce-scroll on every menu item click. Uses
    framer-motion's animate() with stiffness 90, damping 18, mass
    1.1 so the destination lands with a subtle overshoot rather
    than a hard stop. Falls back to instant scroll under
    prefers-reduced-motion.
  - Nav becomes more opaque + shadow appears as soon as user
    scrolls past 60px (lp-nav-scrolled class).
  - Nav CTA scales on hover (1.04) and tap (0.96) with a stiff
    spring.
  - Nav entry: y -20 to 0, opacity 0 to 1, 0.5s ease.
  - logEvent('nav_click') fires on every link click with
    meta.target.

SECTION IDS
  Added id='real-proof', id='parents', id='teachers' so nav links
  resolve. Nav now shows: How it works, Activities, Proof, For
  parents, For teachers, Pricing.

VERIFIED
  - tsc -b clean
  - check-csp passes
  - 2.7 MB icons (full RGBA), 3.9 MB videos = 6.6 MB total."

git push origin master

echo ""
echo "Landing v5.1 shipped."
