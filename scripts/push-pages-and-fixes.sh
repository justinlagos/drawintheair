#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "feat: 5 Landing fixes + Kid-UI migration of all static pages

LANDING FIXES (from user QA pass)
1. 'Try it now' purple tile: white text was being overridden by the
   global :where(.dl-page) h3/p color reset. Added explicit color:#FFF
   on the h3 and white-with-fontWeight:600 on the p.
2. Final CTA headline now wraps cleanly:
     Let them draw.
     Let them move.
     Let them learn.
   (Was wrapping awkwardly as 'Let them draw. Let them' / 'move.' /
    'Let them learn.')
3. CTA banner edge softened: added an outer radial-gradient halo that
   bleeds into the cream background, plus a layered 4-step box-shadow
   (faint plum ring, deep -8px offset shadow, big 80px diffuse glow)
   so the purple no longer cuts hard against the page.
4. CTA kid characters rebuilt: bigger viewBox (220x280), gradient
   shirts (orange→deep-orange, lavender→deep-plum), gradient hair,
   skin gradient, soft cheek radials, eye sparkles, fluffier hair
   silhouette, knee shading, shoe details, ground shadow ellipse.
   Now feels like proper character illustrations not flat figures.
5. Kid+shield no longer clipped by privacy chips bar. Restructured
   the Privacy card so the kid sits inline next to the 'Start in 10
   Seconds' button (flex justify-between, kid is 130x130 fixed-width
   sibling to the button) instead of position:absolute overlapping
   content above it.

PAGES MIGRATED TO KID-UI BRIGHT SKY THEME
- LegalPageLayout.tsx: full rewrite. Kid-UI nav (six links, Try Free
  KidButton), bright sky body gradient, decorative sun + clouds,
  Fredoka eyebrow + heading, plum lastUpdated stamp, content card
  with rainbow strip top, scoped .lpl-content typography
  (Fredoka headings in plum, Nunito body, plum-accented links/lists,
  aqua blockquotes, plum inline code), bright cream footer with
  4 columns. Auto-applies to:
    Privacy, Terms, Cookies, Safeguarding, Accessibility, FAQ,
    Pricing, ParentAccess, SchoolPilot
- Teachers.tsx: full rewrite using LegalPageLayout. Kid-UI feature
  cards, step circles, testimonial avatars, FAQ accordion. Removed
  legacy HeaderNav/Footer dependency.
- Schools.tsx: full rewrite. Kid-UI value-prop cards, pilot pack
  request form with plum form labels, success state with green tick.
- ParentsLanding.tsx: full rewrite. Reasons grid, screen-time tips
  cards, FAQ accordion. All Kid-UI typography.

VERIFICATION
- tsc --noEmit clean
- ESLint clean across Landing, LegalPageLayout, Teachers, Schools,
  ParentsLanding"

git push origin master

echo ""
echo "✅ Pushed. After Vercel redeploy (~1 min), hard-refresh to bust"
echo "   browser cache (Cmd+Shift+R)."
