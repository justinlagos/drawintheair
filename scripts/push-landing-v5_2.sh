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
  src/components/TryFreeModal.tsx \
  src/components/tryFreeModal.css \
  public/landing-videos/ \
  scripts/push-landing-v5_2.sh

git commit -m "feat(landing): v5.2 . mobile responsiveness pass

FOOTER LOGO
  Was rendering at intrinsic width on mobile, taking the whole
  viewport. Pinned to height 44px, width auto, max-width 160px,
  object-fit contain. Now sits at brand-mark scale on every
  breakpoint.

TRY FREE MODAL X BUTTON
  The unicode multiplication sign was rendering as a stretched
  lozenge on Safari iOS because the button inherited flex grow
  from its parent and the text glyph forced the width. Replaced
  with a bold SVG X, locked button to 40 by 40 with aspect-ratio
  1/1, min-width and min-height to defeat flex stretching, and
  added box-sizing border-box. Now a perfect circle on every
  device.

CAMERA TRUST . shield overlaps frame
  Removed overflow:hidden on the stage so the shield can poke
  above the green rounded rectangle. Shield shifted up by
  translateY(-22%) on desktop (-16% on mobile) so the top tip
  rises above the frame for that editorial sticker feel.

HERO VIDEO . three-game merge
  Built /landing-videos/hero-loop.{webm,mp4,jpg}. ffmpeg concat
  of FreePaint 8-11s + BalloonMath 14-17s + SortandPlace 12-15s,
  9 seconds total, 960x540, 30fps, no audio, loops cleanly. Hero
  device now plays a single visual story across three games
  instead of just Free Paint.

HERO BRAND BADGE
  On mobile the brand pill was forcing the hero device to expand
  past viewport. Shrunk to font-size 9.5px (8.5px below 540px),
  capped logo image at 40px wide (34px below 540px), added
  max-width and box-sizing so the pill clips inside the device
  card.

MOBILE HAMBURGER MENU
  Added a 40 by 40 hamburger button visible below 860px. Three
  lines animate into an X on toggle (translate + rotate via
  CSS). Opens a full-width drawer below the nav with framer-
  motion (y: -12 to 0, opacity 0 to 1, 0.25s). Drawer lists
  every section + a stretch-width primary CTA. Body scroll
  locks while open. Drawer auto-closes on link click and CTA
  click. The desktop CTA is hidden below 860px and replaced
  by the drawer CTA.

REAL-KID VIDEOS . editorial flare
  Re-encoded both clips with a moving white radial flare overlay
  via ffmpeg. real-kid-1 slides left to right across 6 seconds.
  real-kid-2 slides right to left for variety. Plus a CSS-driven
  diagonal sheen on the phone frame (lp-sheen keyframes, 7s
  ease-in-out infinite, mix-blend-mode screen, opposite direction
  on the second card). Two-layer effect: ffmpeg flare inside the
  footage + CSS sheen on the phone glass.

REAL-KID CAPTIONS
  Removed 'In-store demo, Best Buy'. New subcaptions:
  'First-time player' and 'Walked up, started playing'.

VERIFIED
  - tsc -b clean
  - check-csp passes"

git push origin master

echo ""
echo "Landing v5.2 shipped."
