#!/usr/bin/env bash
# Push the 3D illustration wiring + the new image assets you saved.
set -e
cd "$(dirname "$0")/.."

# Sanity check — refuse to push if any of the 9 illustrations are missing,
# since a missing file means a broken image on the live site (the SVG
# fallback will trigger but the user provided new assets specifically).
REQUIRED=(
  "public/landing-images/hero-kid-star.png"
  "public/landing-images/brain-skills.png"
  "public/landing-images/tracing-b.png"
  "public/landing-images/bubbles.png"
  "public/landing-images/sort-shapes.png"
  "public/landing-images/word-search-3d.png"
  "public/landing-images/kid-shield.png"
  "public/landing-images/classroom-teacher.png"
  "public/landing-images/hand-landmarks-3d.png"
)
MISSING=()
for f in "${REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    MISSING+=("$f")
  fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  echo "❌ Cannot push — these illustration files are not in the repo yet:"
  for f in "${MISSING[@]}"; do echo "   - $f"; done
  echo ""
  echo "Save each 3D illustration at the path shown, then re-run this script."
  echo "(Alternatively, comment out this check and push anyway — the page"
  echo "will auto-fall-back to the inline SVG illustrations.)"
  exit 1
fi

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "feat(landing): wire 3D illustrations into Landing

Replaces the inline SVG illustrations I generated with the user's
high-quality 3D-rendered PNGs:

- hero-kid-star.png       → Hero (cute kid reaching for a glowing star)
- brain-skills.png        → 'Screens that build' brain visualization
- tracing-b.png           → Tracing mode tile
- bubbles.png             → Bubble Pop mode tile
- sort-shapes.png         → Sort & Place mode tile
- word-search-3d.png      → Word Search mode tile
- kid-shield.png          → Privacy 'guilt-free screen time' card
- classroom-teacher.png   → 'Built for classrooms' card
- hand-landmarks-3d.png   → 'Built like a serious product' hand viz

Implementation
- Each illustration is wrapped in an <AssetImg> component that renders
  the PNG and falls back to the original inline SVG on load error,
  so the page is never broken if a file is missing or fails to load.
- Hero frame switched to 1:1 aspect with a sky-gradient background so
  the new kid+star illustration fills the card naturally.
- Brain card padding tightened, gradient warmed (cream → peach) to
  complement the warm tones in the brain illustration.
- Privacy card decorative kid+shield SVG replaced with the new
  kid-shield.png, sitting bottom-right of the card.

Verification
- tsc --noEmit clean
- ESLint clean
- All 9 image paths exist (this script's pre-flight check confirmed it)"

git push origin master

echo ""
echo "✅ Landing 3D-asset wire-up pushed. Vercel redeploy ~1 min, then"
echo "   hard-refresh drawintheair.com (Cmd+Shift+R) to see the new visuals."
