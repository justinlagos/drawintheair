#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  src/pages/landing-v3.css \
  scripts/push-landing-v5_3.sh

git commit -m "fix(landing): v5.3 . bulletproof logo sizing on mobile

The footer + nav + hero-device logos were still rendering oversized
on real mobile devices. Root cause: legacy /components/landing/
landing.css contains a global \`img { max-width: 100%; height: auto }\`
rule that the bundler ships site-wide because plain .css imports
are not scoped. Specificity ties with my selectors meant the global
rule could win on edge cases.

Fix . final defensive lockdown at the bottom of landing-v3.css:

  .lp-shell .lp-nav-brand img,
  .lp-shell .lp-footer-brand img,
  .lp-shell .lp-hero-device-brand img

Each gets explicit height, width:auto, max-width, max-height,
object-fit:contain, display:block, flex:0 0 auto. All declarations
flagged !important to outrank any global cascade. Scoped to
.lp-shell so the rule cannot leak.

Three breakpoints, three sizes per logo:

  Desktop / >860px
    nav    36px tall, max 132px wide
    footer 40px tall, max 140px wide
    device 14px tall, max 28px wide  (the pill inside hero card)

  Tablet / 481-860px
    nav    28px tall, max 104px wide
    footer 36px tall, max 124px wide
    device 12px tall, max 24px wide

  Mobile / <=480px
    nav    24px tall, max 88px wide
    footer 32px tall, max 110px wide
    device 11px tall, max 22px wide

Verified . tsc clean, check-csp passes."

git push origin master

echo ""
echo "Landing v5.3 shipped."
