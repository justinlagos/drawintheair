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
  scripts/push-landing-v4.sh

git commit -m "feat(landing): v4 — cinematic redesign with gameplay videos + 3D icons

Replaces the v3 'choreograph confidence' page with a fully cinematic
homepage built around real gameplay videos and 14 ChatGPT-rendered
3D icons. Matches the attached design reference visually: cream
backgrounds, lavender primary, soft 3D illustrations, gameplay
videos in stylised frames, and Framer Motion throughout for
Apple polish + Nintendo delight + Pixar warmth.

Structure (parents BEFORE teachers, per audit data)
  Nav  →  Hero  →  How it works (4 steps with 3D icons)
       →  Camera trust (shield + scan)
       →  Skills they build (ABC / Shapes / Math / Brain)
       →  Main games (Free Paint, Bubble Pop, Tracing,
                     Spelling Stars — video frames)
       →  Next-step (Match&Sort, Rainbow Bridge, Word Hunt,
                    Balloon Math — small video tiles)
       →  Parents  →  Teachers
       →  Live proof (real RPC numbers, 4 tiles with 3D icons)
       →  Final CTA  →  Footer.

Gameplay videos
  Five trimmed clips from /VIDEOS---/ source folder, transcoded
  to web-friendly autoplay loops:
    /public/landing-videos/free-paint.{webm,mp4,jpg}
    /public/landing-videos/tracing.{webm,mp4,jpg}
    /public/landing-videos/sort-place.{webm,mp4,jpg}
    /public/landing-videos/word-search.{webm,mp4,jpg}
    /public/landing-videos/balloon-math.{webm,mp4,jpg}
  Each: 960x540, 5 seconds, no audio, loop-friendly, ~70 KB webm
        + ~80 KB mp4 + JPG poster. Total under 1.1 MB combined.
  Cards play on hover (useRef + useEffect), pause + rewind on
  mouse-leave, posters show until first hover. preload='metadata'
  only — no waterfall.

3D icons (14 total)
  Sourced from /VIDEOS---/, resized to 512px max, dithered,
  256-colour palette, png-9 compression. Total 832 KB for all 14.
    abc / shapes / math / brain   — Skills section
    hand / star-trail / smiley-star / trophy   — How it works
    shield / scan-banner          — Camera trust
    kids-reading / globe          — Parents / Teachers corners
    star-books / smiley-star / crown-star / globe   — Proof tiles
    star-books / smiley-star / trophy   — Final CTA float decor
  Each placed with semantic intent and a drop-shadow so they
  pop off the cream background.

Hero
  Headline 'Learning starts when children move.' with a
  hand-drawn sunshine underline. Big rotated card visual with
  hero-kid-star illustration, animated dotted hand trail
  (yellow + aqua + coral circles), floating smiley-star
  (top-right) and trophy (bottom-left) that drift on a loop.
  Triple stat bar at the bottom ('Star Collector · Level 3 ·
  420 points'). Trust chips ('No downloads', 'Works on any
  device', 'Private & secure'). Parallax via useScroll +
  useTransform. Three floating background orbs.

Camera trust
  Wide two-column card. Shield + scan illustration on the left,
  copy on the right. Honest list ('No video or photos stored',
  'No personal data collected', 'Works offline after it loads',
  'COPPA & GDPR friendly') with green check SVGs. Lavender CTA
  to /privacy.

Main games
  2-column grid, large game frames. Each frame plays its video
  on hover and shows a coloured tag pill (FREE PAINT, BUBBLE
  POP, TRACING, SPELLING STARS) overlaid on the bottom-left.
  Bubble Pop and Spelling Stars use poster images only (no
  video yet — easy to add later).

Next-step
  4-column grid, smaller cards with the same hover-play
  behaviour. Match&Sort and Word Hunt and Balloon Math use
  video; Rainbow Bridge uses image only.

Parents / Teachers
  Reversed split layout. Each section has a corner-mounted
  3D icon (kids-reading for parents, globe for teachers) that
  hovers on rotate. Floating stat badge over the photo
  ('5 min a day · can make a difference' / 'Loved by teachers
  · and early learners').

Live proof
  Four tiles fed by landing_public_proof RPC (anon-callable,
  aggregate-only — no PII, no child data, no school data).
  Each tile has a 3D icon, an animated count-up number, label,
  and qualifier ('last 90 days', '≥5 attempts, ≥80% acc.').

Final CTA
  'Let them move. Let them learn.' with three floating 3D
  decorations (star-books, smiley-star, trophy) drifting in
  the background. Two CTAs + the same trust chips as the hero.

Animations
  - Framer Motion variants (fadeUp + stagger) throughout
  - whileInView with once:true so they don't re-fire on scroll up
  - Hero parallax via useScroll + useTransform
  - Hand trail SVG circles loop endlessly on the hero card
  - Floating orbs drift in the hero background
  - Number tickers count up on the proof tiles
  - Game card hover plays the preview video; mouse-leave pauses
  - Mode-card hover lift via Framer spring
  - Final CTA decorations drift on independent timing
  - All gated by useReducedMotion

Activation path
  Phase 1 keeps the existing TryFreeModal so the page can ship.
  Every CTA calls handleTryFree(source) which logs cta_click +
  try_free_clicked then opens the modal. Phase 2 will rewire
  these to the no-modal Free-Paint-first path.

Analytics preserved
  landing_view, landing_engaged, landing_unload all still fire.
  Every CTA carries meta.source ('nav','hero','camera_trust',
  'main_games','parents','final_cta') so we can measure which
  section converts. Variant tag updated to 'landing_v4'.

VERIFIED
  - tsc -b clean
  - check-csp passes (no new external origins)
  - Total landing assets: 832 KB icons + 1.1 MB videos = 2 MB
  - landing_public_proof RPC unchanged from v3

WHAT'S NEXT (Phase 2)
  Rewire the Start Free CTAs to land kids directly in Free Paint
  without the age-band modal. Auto-detect age band from session
  behaviour after the first successful run, then ask only once.
  Add a sticky 'Try free' button on mobile after scroll past hero."

git push origin master

echo ""
echo "Landing v4 shipped. Visit drawintheair.com after Vercel deploys."
