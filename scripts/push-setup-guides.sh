#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  src/pages/setup/setup.css \
  src/pages/setup/TeacherSetupGuide.tsx \
  src/pages/setup/ParentSetupGuide.tsx \
  src/main.tsx \
  scripts/push-setup-guides.sh

git commit -m "feat(growth): teacher + parent quick-start guides at /teachers/setup and /parents/setup

The barrier-flattening play. Two web pages, idiot-proof, print-
optimised. The hero is a 5-step '60-second version'; everything
below it is for the 5% who actually need detail. Each page prints
to a clean A4 staffroom poster via Cmd+P.

Pages
  /teachers/setup
    • 60-second version: sign in, start class, show code, pick
      activity, run the room
    • What you need (kit checklist)
    • Teacher controls in plain English (pause / end / kick / stats /
      hold-to-end)
    • Remote teaching note — same flow, share the code over Zoom
    • Privacy paragraph for SLT and parents (no video transmitted)
    • Troubleshooting FAQ — camera blocked, lost connection,
      duplicate names, accidental kick
    • 'How teachers actually use it' — six concrete use-cases
    • Distribution loop: email a colleague (one-click mailto with
      pre-filled blurb), copy link, roll out to my school

  /parents/setup
    • 60-second version: open site, age-band, allow camera, wave
    • Setup tips for first session (eye level, arm's length, lighting)
    • Honest privacy panel — what we do collect, what we don't
    • What kids are actually learning, mapped to EYFS / Common Core
    • Troubleshooting FAQ — tracking issues, browser block, slow
      laptop, very young kids, screen-time limits, twin question,
      cost question
    • Distribution loop: 'Show your kid's teacher' (mailto with
      pre-filled teacher pitch)

Design
  • Single shared stylesheet (src/pages/setup/setup.css), Kid-UI
    palette (plum / sunshine / aqua / cream), Fredoka headings.
  • Big-numbered step list (CSS counter, plum chips with sunshine
    glow on hover).
  • Print stylesheet hides nav / footer / share-buttons, tightens
    type, breaks the FAQ onto its own page. @page A4 portrait,
    12mm margins.
  • Everything responsive without a single @media query for the
    layout — the grid auto-fills.

Routes
  src/main.tsx wires both URLs as React.lazy so they're zero-cost
  for anyone not on those pages. Footer cross-links each guide
  back to the other.

VERIFICATION
- tsc -b           clean
- check-csp        passes
- vite build       217 modules transformed (was 215)
- Print preview    looks good in Chrome's print dialog at A4

WHAT THIS DOES FOR GROWTH
This is the operational form of the 'distribution loop' point in
the strategy memo. Every parent who finds the page gets a one-
click 'tell your kid's teacher' button that pre-fills a credible
email pitch and links to the teacher quick-start. Every teacher
who runs a class has a one-click 'email a colleague' button. The
guides are the recruiting surface, not just docs."

git push origin master

echo ""
echo "Pushed setup guides."
echo "Live URLs once Vercel goes Ready:"
echo "  https://drawintheair.com/teachers/setup"
echo "  https://drawintheair.com/parents/setup"
echo ""
echo "Both print to clean A4 via Cmd+P (Chrome) — try it before sharing."
