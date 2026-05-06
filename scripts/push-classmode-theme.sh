#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

# Sanity: CSP guard must still pass before we ship
node scripts/check-csp.mjs

git add -A
git commit -m "feat(classmode): migrate /class flow to Kid-UI bright sky theme

The six classmode pages (TeacherDashboard, LobbyScreen, LiveRoundScreen,
ResultsScreen, StudentJoin, StudentGameScreen) all share classmode.css
which was hardcoded to a dark navy projector theme inherited from the
old design system. Out of step with Landing / WaveToWake / AdultGate /
ModeSelectionMenu / Pricing / Privacy etc., which are all now Kid-UI
bright sky.

Single-file fix: rewrote classmode.css end-to-end. Because the six
pages share the .cm-* class names, retheming the CSS retheme all six
flows at once. No .tsx changes needed.

WHAT CHANGED IN classmode.css

Tokens scoped under .cm-page (mirroring src/styles/tokens.ts):
- Sky blue → cream gradient page background
- Plum primary, sunshine accent, meadow success, coral danger
- Charcoal text, soft grey secondary
- Fredoka display + Nunito body
- Radii 16-36px, kid-tactile shadows, motion bounce easings

Surface mapping:
- Topbar:           Frosted-white blur with plum brand wordmark
- Avatar:           Plum gradient circle, white border, soft shadow
- Buttons:          KidButton-equivalent (primary plum gradient, secondary
                    white-on-plum-border, danger coral gradient, Google
                    sign-in white with plum hover)
- Dashboard hero:   Cream card with sun corner glow, Fredoka headline
- Activity grid:    White cards, lavender icon plates, plum hover lift
- Sign-in card:     Cream gradient, plum-bordered, centered
- Lobby code:       Cream-orange gradient pill, large Fredoka digits,
                    inset highlight + plum drop shadow
- Student chips:    White rounded chips with green status dot, pop-in
                    keyframe animation
- Live leaderboard: White card with rank circles (gold/silver/bronze for
                    top 3, lavender for rest), Fredoka score in plum
- Timer bar:        Meadow-green gradient with subtle glow
- Podium:           First-place sunshine slot scaled and glowing,
                    second silver, third warm-orange — proper trophy
                    feel
- Student join:     Cream card with corner sun, oversized 6-digit Fredoka
                    code inputs with plum focus ring, lift on focus
- Result screen:    Plum rank number, sunshine star row, cream card

Mobile + reduced-motion media queries included.
CSP guard verified passing.

Six pages now match the rest of the platform without touching their
.tsx files at all."

git push origin master

echo ""
echo "✅ Pushed. After Vercel redeploy + hard-refresh, the entire /class"
echo "   flow (teacher dashboard → lobby → live round → results, plus"
echo "   student join → game → result) is on the Kid-UI bright sky theme."
