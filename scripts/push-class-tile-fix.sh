#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs

git add -A
git commit -m "fix(classmode): activity tile layout matches general game menu

The /class teacher dashboard rendered tile cards with the icon and the
title flowing inline (because both were <span>s), so titles like
'Colour Builder' wrapped to two lines around the icon and looked
broken. Wanted: icon centered top, title middle, subtitle bottom —
same as the general game menu (ModeSelectionMenu).

Three changes:

1. MODE_LABELS gains a 'subtitle' field for each game
   (Bubble Pop → 'Warm up your hands', Tracing → 'Follow the path',
   etc.) — copy mirrors the general menu.

2. TeacherDashboard renders cards as <button> with three stacked
   <div>s: icon, name, subtitle. <button> instead of <div> for
   keyboard accessibility (focus ring + Enter/Space activation
   come for free). aria-hidden on the emoji icon.

3. .cm-activity-card now uses flex column with gap, fixed min-height
   200px so all tiles match height; .cm-activity-icon is 88x88
   with 2.6rem emoji centered in a soft-lavender plate; .cm-activity-name
   is 1.1rem Fredoka; .cm-activity-subtitle is 0.88rem Nunito in soft
   charcoal — exact same rhythm as the general menu.
   Added a proper .selected state (plum border + plum 18% halo +
   subtle gradient lift) so the teacher can see which activity is
   picked before clicking 'Start Class Mode'.

Verified: tsc --noEmit clean, ESLint clean, CSP guard passes."

git push origin master

echo ""
echo "✅ Pushed. After Vercel redeploy + hard-refresh, the /class teacher"
echo "   dashboard tiles will look like the general game menu — icon on top,"
echo "   title middle, subtitle bottom, with a clear selected state."
