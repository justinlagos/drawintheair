#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "feat(landing): rebuild to match reference design

Major redesign to match the high-quality reference layout the user
provided. Every section reworked.

NAV
- Updated to: How it Works, Activities, For Families, For Educators,
  Safety, Pricing
- Two CTAs in nav: 'Try Free' (primary) + 'Book a Demo' (secondary)
- Brand wordmark next to logo on desktop

HERO
- Pill 'Motion learning for ages 3 to 10'
- Headline 'Learning that moves' with sunshine underline on 'moves'
- Two CTAs: 'Try Draw in the Air. It's Free' (with rainbow glow) +
  'See How It Works' secondary
- Trust strip: ✓ No downloads · ✕ No ads · 🔒 Child-safe & private
- Bespoke kid+star illustration: brown-haired kid in orange shirt
  reaching for a glowing yellow star with sparkle ring; sky with sun
  (with smile face), butterfly, clouds, hills, flowers
- Floating 'Works in your browser' pill (top-left) and 'No setup'
  sunshine badge (bottom-right)

SCREENS THAT BUILD (PROBLEM)
- New section with bespoke brain visualization (two pink hemispheres
  with curl folds, glow ring, 4 orbiting orbs)
- Right side: 4 skill rows (Focus & attention, Memory & thinking,
  Confidence & joy, Coordination & balance) with colored icon plates
- 'The science behind play' meadow-green CTA

HOW IT WORKS — 4 STEP CARDS
- Cleaner step cards with circular numbered badges (top-center
  overhang) and colored icon plates

FIVE WORLDS — 2:3 LAYOUT
- Left text + 'Explore Activities' CTA
- Right: 2x3 grid (5 mode tiles + a plum 'Try it now' CTA tile)
- Each tile: bespoke illustration in colored bg square,
  numbered chip, title, subtitle

DUAL-CARD SECTION (Movement + Privacy)
- Left card: cream gradient. 'Movement strengthens learning' + 6
  skill mini-tiles in 3-col grid
- Right card: white gradient. 'Screen time you don't have to feel
  guilty about' + 4 privacy guarantees + 'Start in 10 Seconds' CTA
  + decorative shield+tick illustration

CLASSROOMS + TESTIMONIALS DUAL CARD
- Left card: lavender gradient. 'Loved by educators' badge,
  classroom illustration (teacher+chalkboard with letter A,
  bookshelf, three diverse kids, sparkles), feature checklist,
  'Request Pilot Pack' CTA
- Right card: peach gradient. 3 testimonials with avatar circles,
  5-star ratings, 'Loved by families' badge, 'Read more stories' link

BUILT LIKE A SERIOUS PRODUCT
- Left: heading + body + 2x2 trust badges (No AI profiling, Secure by
  design, Kid-first interface, Continuous innovation)
- Right: 21-landmark hand tracking visualization with sunshine
  landmarks, plum bones, cyan pinch indicator

DESIGNED TO WORK WHERE YOU ARE — NEW
- Centered heading + 6 device platform chips: Chromebook, Windows,
  macOS, iPadOS, Android Tablet, Google TV. Each chip: bespoke icon
  + label

FINAL CTA
- Plum gradient banner with 24 confetti pieces
- Two waving kid characters (left orange shirt, right purple)
- 'Let them draw. Let them move. Let them learn.' headline
- 'Launch Draw in the Air' meadow-green CTA + trust microcopy

FOOTER
- 4 columns: Brand+social, Product, For Families, For Educators
- Bottom row: copyright + Privacy/Terms links

Layout uses bespoke .dl-* CSS classes (shipped via inline <style> in
LANDING_INLINE_CSS) so the page renders correctly in production
regardless of Tailwind/Vite chunk loading."

git push origin master

echo ""
echo "✅ Landing redesign pushed."
echo "   Wait ~1 min for Vercel redeploy, then hard-refresh drawintheair.com"
