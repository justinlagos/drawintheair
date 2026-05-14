#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

# Make sure framer-motion (added in package.json) is installed locally
if [ ! -d node_modules/framer-motion ]; then
    echo "Installing framer-motion..."
    npm install --no-audit --no-fund
fi

node scripts/check-csp.mjs
npx tsc -b

git add \
  package.json \
  package-lock.json \
  platform/supabase/migrations/20260513_landing_public_proof.sql \
  src/pages/Landing.tsx \
  src/pages/landing-v3.css \
  scripts/push-landing-v3.sh

git commit -m "feat(landing): v3 — choreograph confidence

Replaces the v2 generic-edtech homepage with a confidence-led
page that teaches the interaction model, reduces camera fear,
shows proof, and guides users into a successful first movement
within 15 seconds.

Structure (parents before teachers per audit data):
  Nav → Hero → How it works → Camera trust → First success →
  Activation modes → Progression modes → Parents → Teachers →
  Live proof → Final CTA → Footer.

Hero
  Headline 'Learning starts when children move.' with a hand-
  drawn sunshine underline that animates in. Parallaxed kid+star
  illustration with an animated hand trail. Primary CTA 'Start
  free in 10 seconds' + secondary 'See how it works'. Trust
  strip: Chrome / Chromebook / classrooms.

How it works
  Four stepped cards with stagger reveal — Allow camera, Raise
  your hand, Follow the movement, Watch learning respond.

Camera trust
  Single panel pre-empting the camera-permission anxiety.
  'The camera only detects movement.' Three explicit promises +
  CTA 'Try with camera'. Pairs with the Phase B explainer that
  fires at permission time — landing builds trust, click-level
  explainer reduces fear at the moment of action.

First success
  Four outcome cards (instant feedback, gentle guidance, no
  wrong-start pressure, ages 3–7). Hover lift.

Activation modes (data-led order)
  Free Paint, Bubble Pop, Tracing, Spelling Stars — big cards
  with gameplay-preview slots that play on hover (WebM with
  poster fallback). Each card carries its 'best for' tag.

Progression modes
  Rainbow Bridge, Sort & Place, Word Search, Balloon Math — as
  next-step activities, smaller cards.

Parents BEFORE teachers
  'Screen time that gets children moving.' Floating stat
  overlays on the visual. CTA 'Try at home'. Reversed split for
  the teacher section: 'Built for real classrooms.' CTA 'Start
  a school pilot'.

Live proof
  Six tiles fed by new dashboard_public_proof RPC (aggregate
  only, anon-callable). Number tickers count up on first view.
  Honest 'aggregate platform numbers' disclaimer.

Final CTA
  'Let them move. Let them learn.' Animated floating shapes
  drift in the background. Two CTAs.

New file structure
  src/pages/Landing.tsx       Single-file rewrite, ~720 lines,
                              Framer Motion throughout
  src/pages/landing-v3.css    Token-driven, mobile-first,
                              respects prefers-reduced-motion
  platform/supabase/migrations/20260513_landing_public_proof.sql
                              landing_public_proof() RPC,
                              granted to anon, no PII, no child
                              data, no school data
  package.json                framer-motion ^11.15.0 (resolved
                              to 11.18.2 on install)

Activation path
  Phase 1 keeps the existing TryFreeModal flow so the page can
  ship today. Every CTA calls handleTryFree(source) which logs
  cta_click + try_free_clicked then opens the modal. Phase 2
  rewires these to the no-modal Free-Paint-first path described
  in the blueprint.

Animations
  - Framer Motion variants: fadeUp + stagger
  - whileInView with once:true so animations don't re-fire on
    scroll back up
  - Hero parallax via useScroll + useTransform
  - Hand trail SVG circles loop on the hero card
  - Cloud drift in the hero background
  - Number tickers count up on the proof tiles
  - Mode card hover plays the preview video; mouse-leave pauses
  - All animations gated by useReducedMotion

Analytics preserved
  landing_view, landing_engaged, landing_unload all still fire.
  Every CTA carries meta.source ('hero','nav','camera_trust',
  'activation_modes','parent_section','final_cta') so we can
  measure which section converts.

VERIFIED
  - tsc -b clean
  - check-csp passes (no new external origins)
  - dashboard_public_proof RPC returns aggregate counts only,
    granted to anon

WHAT'S NEXT (Phase 2)
  Rewire the Start Free CTAs to land kids directly in Free Paint
  without the age-band modal. Auto-detect age band from session
  behaviour after the first successful run, then ask only once.
  Reorder ModeSelectionMenu behaviourally so Bubble Pop / Tracing
  / Spelling Stars surface after the Free Paint success."

git push origin master

echo ""
echo "Landing v3 shipped. Visit drawintheair.com after Vercel deploys."
