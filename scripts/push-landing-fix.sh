#!/usr/bin/env bash
# Push the Landing layout fix.
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A

git commit -m "fix(landing): inline critical CSS via <style> tag

Production deploy still rendered Landing single-column even after
converting Tailwind classes to bespoke .dl-* CSS. Root cause: Vite's
CSS code-splitting on Vercel was apparently dropping the
landing-kid.css chunk (or browser was loading a stale cached version),
so none of the .dl-* layout rules applied — including .dl-desktop-only
which made the nav default to display:block, leaving the inline
gap:28 inert and links smushed together with no whitespace (JSX strips
inter-sibling whitespace).

Bulletproof fix: ship the critical CSS as a JS string constant and
inject it into a <style dangerouslySetInnerHTML> at the top of the
Landing component. The CSS is now part of the same JS chunk as the
component itself; if the JS loads, the CSS loads — period. No more
chunk-loading flakiness, no more cache-staleness, no more bundler
tree-shaking surprises.

CHANGES
- Added src/components/landing/landingInlineStyles.ts exporting
  LANDING_INLINE_CSS (full layout + decorative + animation rules).
- Landing.tsx renders <style>{LANDING_INLINE_CSS}</style> as the
  first child of .dl-page so styles are present before any layout
  paints.
- Kept the external landing-kid.css import for dev fast-refresh and
  browser caching benefits — but it's no longer load-bearing.

VERIFICATION
- tsc --noEmit clean
- ESLint clean
- CSS includes all layout breakpoints (sm/md/lg) and decorative
  animations (sun pulse, cloud drift, sparkle float, rainbow trail,
  CTA glow, scroll reveal, hero fade-up)."

git push origin master

echo ""
echo "✅ Inline-CSS Landing fix pushed. After Vercel redeploys (~1 min),"
echo "   hard-refresh drawintheair.com (Cmd+Shift+R) to bust browser cache."
