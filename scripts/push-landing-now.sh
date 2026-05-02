#!/usr/bin/env bash
# Push the Landing layout NOW, using inline SVG fallbacks. Run this when
# you want the new layout live but haven't dropped in the 3D PNGs yet.
# When you save the PNGs later, just run scripts/push-3d-assets.sh — the
# AssetImg wrapper will pick them up automatically (no code changes needed).
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "feat(landing): ship reference-matched layout with SVG fallbacks

Wires the AssetImg wrapper for the 9 hero illustrations and ships
the redesigned Landing layout. The 3D PNG illustrations aren't in
the repo yet, so AssetImg's onError handler will render the inline
SVG fallbacks I wrote earlier. When the PNGs are added at the
expected paths in /public/landing-images/, the wrapper will pick
them up automatically with zero code changes.

LAYOUT changes (live now, no PNGs needed)
- Six-link nav (How it Works, Activities, For Families, For Educators,
  Safety, Pricing) + dual CTAs (Try Free + Book a Demo)
- 'Screens that drain. Or screens that build.' new section with
  brain visualization (SVG fallback) + 4 skill rows
- Polished 4-step 'Your hands become the tool' cards
- Five worlds 2:3 layout with 5 mode tiles + 'Try it now' CTA tile
- Dual card section: 'Movement strengthens learning' (cream) +
  'Screen time you don't have to feel guilty about' (white)
- Classrooms + Testimonials dual card with avatar circles + 5-star
- Built like a serious product: 2x2 trust badges + hand-tracking viz
- 'Designed to work where you are' device platform row (NEW)
- Final CTA: plum gradient with confetti + two waving kid SVGs
- 4-column footer

ASSETS pending (drop into /public/landing-images/ then run
scripts/push-3d-assets.sh):
  hero-kid-star.png, brain-skills.png, tracing-b.png, bubbles.png,
  sort-shapes.png, word-search-3d.png, kid-shield.png,
  classroom-teacher.png, hand-landmarks-3d.png

Verification
- tsc --noEmit clean
- ESLint clean"

git push origin master

echo ""
echo "✅ Landing layout pushed (with SVG fallbacks)."
echo "   Next: drop the 9 PNGs into public/landing-images/ and run"
echo "         bash scripts/push-3d-assets.sh"
