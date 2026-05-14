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
  scripts/push-landing-v5.sh

git commit -m "feat(landing): v5 . cinematic conversion-first redesign

Big visual upgrade on top of v4 with everything Justin called out
in the review:

ICONS . every icon is now transparent
  All 14 3D icons swapped for the no-background ChatGPT renders
  from /VIDEOS---/. Resized to 512px, 256-colour palette, dithered.
  No more white squares behind the badges. 1.5 MB total.

COPY . em dashes removed
  Every dash in landing copy replaced with full stops or 'to'.
  Reads cleaner, more sales-y, less typographic.

CAMERA TRUST . redesigned to match the mock
  Shield (no background) now sits ON the light-green scan-frame
  illustration, which is the actual stage backdrop. Two-column
  card: stage on the left, copy on the right. Trust list now a
  2-column grid inside the card. Removed the white frame around
  the shield, removed the duplicate icon.

REAL-KID PROOF . new section between Next-steps and Parents
  Two portrait clips trimmed from IMG_4380.MOV and IMG_4381.MOV.
  Encoded at 720px tall, 6 seconds each, autoplay loop. Framed
  in phone-style mock-ups with a notch detail. Captions:
  'Popping bubbles with a wave' and 'First time, hand already up'.
  Both labelled 'In-store demo, Best Buy'. This is the most
  powerful trust signal on the page now.

RAINBOW BRIDGE + BUBBLE POP . real gameplay video
  RainbowBridge.mp4 trimmed 8-13s, encoded as
  /public/landing-videos/rainbow-bridge.{webm,mp4,jpg}.
  balloonPop.mp4 trimmed 12-17s, encoded as
  /public/landing-videos/bubble-pop.{webm,mp4,jpg}.
  Wired into their cards. Plays on hover like the others.

HERO . re-composed
  Killed the static kid-photo card. New stage shows a tilted
  device frame that AUTOPLAYS the Free Paint clip on load.
  Four 3D icons (star, trophy, crown, hand) orbit the device
  and float on independent timing. Hand-trail SVG circles still
  loop across the frame. Hero now demonstrates what kids actually
  do, not what they look like doing it. Far more conversion-y.

ORBS . no more edge cuts
  All three floating orbs constrained inside the hero section
  with overflow:hidden and safe positioning (8% from edges,
  not -60px). On mobile the third orb hides entirely. Hero
  has a bottom radius so the next section starts clean.

GAME CARDS . tighter, cuter
  Padding around the video screen so it sits INSIDE a frame,
  not edge-to-edge. 4:3 aspect (was 16:10). White inner border
  + drop shadow gives it a device-screen feel. Tag pill smaller
  and offset to match. Reads as 'a friendly device showing a
  game' instead of 'big rectangular video'. Small cards inherit
  proportionally.

FRAMER MOTION . more experience
  - Hero device counter-rotates -2deg to +0.6deg on a 8s loop
  - All 4 hero floats on independent timing + rotations
  - useScroll parallax on hero visual (y + scale)
  - popIn variant (scale 0.85 to 1) for all card-style reveals
  - whileHover spring lift on every card (stiffness 300, damp 22)
  - Magnetic shimmer effect on .lp-btn-magnetic
  - Real-kid cards play/pause on hover with smooth resume
  - useReducedMotion gates every animation

VERIFIED
  - tsc -b clean
  - check-csp passes
  - 14 icons (1.5 MB), 11 videos (3.5 MB), 5 MB total assets
  - landing_public_proof RPC unchanged

WHAT'S NEXT (Phase 2)
  Wire the Start Free CTAs to land kids directly in Free Paint
  without the age-band modal. Auto-detect age band after the
  first successful run. Add a sticky mobile CTA past hero."

git push origin master

echo ""
echo "Landing v5 shipped. Visit drawintheair.com after Vercel deploys."
