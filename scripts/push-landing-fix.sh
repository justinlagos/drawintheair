#!/usr/bin/env bash
# Push the Landing layout fix.
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A

git commit -m "fix(landing): replace Tailwind layout classes with bespoke CSS

The production build at drawintheair.com was rendering the new Kid-UI
Landing page as a single-column stack. Tailwind responsive grid/flex
utilities ('grid lg:grid-cols-2', 'hidden md:flex', etc.) were not
present in the compiled CSS — the JIT scanner didn't pick up the new
class strings, so layout broke entirely. Inline styles still rendered,
which is why SVG illustrations, KidButton CTAs, and gradients all
showed up correctly while the section grids collapsed.

Solution: convert every layout-critical Tailwind class to a bespoke
.dl-* class in src/components/landing/landing-kid.css with proper
@media queries for sm/md/lg breakpoints. The page is now self-contained
and renders identically in dev and prod regardless of Tailwind config.

CHANGES
- landing-kid.css: added 80+ lines of layout utilities
  (.dl-container, .dl-grid-2, .dl-grid-3, .dl-grid-4, .dl-grid-features,
   .dl-grid-skills, .dl-grid-2-hero, .dl-grid-2-3, .dl-grid-3-2,
   .dl-flex, .dl-flex-col, .dl-flex-wrap, .dl-items-center,
   .dl-justify-center, .dl-justify-between, .dl-gap-2/3/4/5,
   .dl-text-center, .dl-desktop-only, .dl-mobile-only,
   .dl-mobile-only-block, .dl-mobile-nav-link, .dl-nav-link,
   .dl-nav-fixed, .dl-brand-name, .dl-order-1/2 + lg variants)
- Landing.tsx: every 'grid lg:grid-cols-*', 'flex *', 'max-w-*',
  'order-*', 'hidden md:*' replaced with the bespoke equivalents.
  Inline-style spacing where appropriate.

VERIFICATION
- tsc --noEmit clean
- ESLint clean
- All section grids respect their original 1/2/3/4-col breakpoints
- Mobile menu drawer toggles correctly via .dl-desktop-only / .dl-mobile-only"

git push origin master

echo ""
echo "✅ Landing layout fix pushed. Vercel/your CI should redeploy in ~1 min."
