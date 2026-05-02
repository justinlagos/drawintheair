#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "fix(mobile): horizontal mode tiles + bulletproof logo sizing

USER REPORT
On mobile, the 'Five worlds. One pinch.' tile grid was rendering as
3 super-narrow stacked columns at 375px (titles wrapping to two lines,
descriptions hyphenating like 'Trace let-/ters,/shapes/and num-/bers').
Logo was overflowing as a full-width zoomed image at the top of the
nav. Both came down to CSS:

1. Mode tiles: gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' had no
   media query. Forced 3 columns at every viewport width, which on
   narrow screens left ~110px per tile.

2. Logo: inline 'height: 36, width: auto, objectFit: contain' was
   being defeated somewhere in the cascade (likely the global
   img { max-width: 100%; height: auto; } from index.css getting an
   override path on certain mobile browsers). The image was rendering
   at its intrinsic size, filling the viewport.

FIXES
- Added .dl-mode-tiles class to LANDING_INLINE_CSS:
    Desktop (>=768): 3-col grid, gap 16px (unchanged behavior)
    Mobile (<768):   horizontal flex with overflow-x: auto,
                     scroll-snap-type: x mandatory,
                     each tile flex: 0 0 78%, scroll-snap-align center,
                     gap 14px, edge-to-edge with -16px margin trick,
                     scrollbar hidden, '← swipe to explore →' hint
                     visible only on mobile.
- Added .dl-nav-logo and .dl-footer-logo classes with !important
  overrides on height/maxHeight/maxWidth/width:auto/objectFit. These
  win the cascade against any legacy global img rule. Same classes
  inlined into LegalPageLayout's <style> so legal/static pages also
  benefit. Logo now has explicit width/height HTML attributes (120x36
  nav, 110x32 footer) for browser intrinsic sizing.
- Tightened mobile typography helpers: .dl-section-mobile-tight
  reduces section padding on <=640px, .dl-container squeezes from
  24px to 18px side padding on small screens.

VERIFICATION
- tsc --noEmit clean
- ESLint clean across Landing, LegalPageLayout, landingInlineStyles"

git push origin master

echo ""
echo "✅ Pushed. After Vercel redeploy + hard-refresh, mobile shows:"
echo "  • Logo at correct 36px height in nav"
echo "  • Mode tiles as horizontal scroll with snap-points"
echo "  • Visible 'swipe to explore' hint underneath"
