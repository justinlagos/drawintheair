#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  src/components/TryFreeModal.tsx \
  src/App.tsx \
  src/features/menu/ModeSelectionMenu.tsx \
  src/features/menu/NextModeOverlay.tsx \
  src/features/menu/nextModeOverlay.css \
  src/lib/analytics.ts \
  src/pages/Landing.tsx \
  platform/supabase/migrations/20260514_dashboard_public_proof.sql \
  scripts/push-phase-2-3-4.sh

git commit -m "feat: Phase 2 activation + Phase 3 live proof + Phase 4 autoplay

PHASE 2 . activation path change

After Try Free, first-time visitors land DIRECTLY in Free Paint
instead of bouncing through the mode menu. Wave gate still runs
(camera grant must happen) but immediately after wake the app
mounts Free Paint with a clean canvas. Returning users keep the
familiar onboarding -> menu flow.

How first-time is detected: localStorage flag 'dia_has_played_v1'
set on Try Free submission. Survives reloads, no auth needed,
privacy-safe (no PII).

Routing: TryFreeModal sends ?firstrun=1&mode=free. App.tsx reads
the param into getInitialState, threads it through firstRunRef so
the wake handler can short-circuit the menu and mount the game.

Post-paint suggestion overlay: when the first auto-routed Free
Paint session ends (any way . menu button, adult gate, etc.), a
'NextModeOverlay' fires once. Two big cards . Bubble Pop and
Tracing . with a 'browse all games' escape hatch. Dismissable.
After it closes, the menu (now reordered) is shown. Framer Motion
throughout: stagger + fadeUp + spring lift on the pick cards.

ModeSelectionMenu reorder . behavioural, not alphabetical:
  Tier 1 . Free Paint, Bubble Pop, Tracing, Spelling Stars
  Tier 2 . Sort & Place, Word Search, Balloon Math, Rainbow Bridge

Analytics events (new):
  first_session_auto_freepaint     . fired in TryFreeModal on first run
  next_mode_overlay_shown          . fired when overlay mounts
  next_mode_overlay_pick           . meta.choice (mode id or 'menu')
  next_mode_overlay_dismissed      . closed without picking

Files: TryFreeModal.tsx, App.tsx, NextModeOverlay.tsx (new),
nextModeOverlay.css (new), ModeSelectionMenu.tsx, analytics.ts.
~200 lines edited.

PHASE 3 . live proof numbers

New RPC public.dashboard_public_proof() . anon-callable, aggregate
only. Returns six numbers: distinct_devices_90d,
activities_completed, mode_plays, tracker_success_pct,
items_touched, items_mastered, plus as_of timestamp. NO PII, NO
child data, NO school data, NO IPs. Migration already applied to
production; this commit pins the file.

Landing.tsx fetchPublicProof prefers dashboard_public_proof and
falls back to landing_public_proof so the proof tiles never go
dark while the new migration rolls out.

Live refresh: on Landing mount, then every 60 seconds while the
tab is visible. visibilitychange listener kicks an immediate
refresh when the user returns to a backgrounded tab. Investors
who return tomorrow see growth, not yesterday's snapshot.

PHASE 4 . autoplay activity preview videos

Previously every mode card played its video only on hover . on
mobile that meant the cards were static (no hover events). Now
the video element autoplays + loops on mount, and an
IntersectionObserver pauses it when offscreen so we don't burn
bandwidth on cards below the fold. prefers-reduced-motion gates
playback entirely. WebM + MP4 source pair already shipped in v5.

VERIFIED
  - tsc -b clean
  - check-csp passes
  - dashboard_public_proof() executes against production
    (migration applied via Supabase MCP)"

git push origin master

echo ""
echo "Phase 2 + 3 + 4 shipped."
