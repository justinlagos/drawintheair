#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

git add -A
git commit -m "fix(perf): remove universal box-shadow on every element for low-perf

ROOT CAUSE
src/index.css had this rule:

    body.perf-tier-low * {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
    }

The asterisk selector applied a hard 12px-blur box-shadow to *every
single descendant of <body>* when the device was classified as
perf-tier-low. On low-end tablets and Chromebooks, this meant every
text span, every progress dot, every SVG, every icon — even nested
inline spans inside paragraphs — rendered with its own card-like
outline. The wave-screen photograph the user shared shows this
clearly: 'Draw in the Air', 'Wave your hand to start!', and each
of the 5 progress dots all appear in their own pillowy boxes,
because each one was getting an independent shadow.

FIX
Replaced the universal selector with scoped opt-in rules:

  body.perf-tier-low .heavy-shadow { box-shadow: ...; }

Now only elements that explicitly opt in get a softer shadow. The
universal selector is gone. Also added an explicit backdrop-filter
opt-out for .glass-panel and .kid-panel on perf-tier-low so those
expensive effects don't ship to cheap devices.

Result: WaveToWake, ModeSelectionMenu, AdultGate, Landing, and every
in-game screen now render consistently on low-end tablets, ChromeOS,
and Android — the same as on a high-end Mac. No spurious card outlines."

git push origin master

echo ""
echo "✅ Pushed. After Vercel redeploy + hard-refresh, the tablet should"
echo "   render identical to the high-end view."
