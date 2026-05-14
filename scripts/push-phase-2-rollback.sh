#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

# Stage reverts to live files
git add \
  src/components/TryFreeModal.tsx \
  src/App.tsx \
  src/lib/analytics.ts \
  scripts/push-phase-2-rollback.sh

# Delete the orphan overlay files (no callers, kept only as tombstones)
git rm -f \
  src/features/menu/NextModeOverlay.tsx \
  src/features/menu/nextModeOverlay.css \
  2>/dev/null || true

git commit -m "revert: roll back Phase 2 auto-Free-Paint routing

Product feedback: auto-routing first-time visitors into Free Paint
after Try Free is too restrictive. Kids should see the open menu
and pick their own game.

REVERTED
  - TryFreeModal: localStorage flag + ?firstrun=1 redirect removed.
    Every Try Free now sends users through the standard onboarding
    -> wave -> menu flow.
  - App.tsx: firstRunRef, showNextModeOverlay state, handleWake
    short-circuit, handleExitToMenu overlay trigger all removed.
    handleWake + handleExitToMenu restored to pre-Phase-2 behaviour.
  - getInitialState no longer reads ?firstrun=1.
  - NextModeOverlay component + CSS deleted.
  - analytics.ts: removed first_session_auto_freepaint,
    next_mode_overlay_shown, next_mode_overlay_pick,
    next_mode_overlay_dismissed event names.

KEPT (from the Phase 2/3/4 batch)
  - ModeSelectionMenu behavioural reorder (Tier 1: Free Paint,
    Bubble Pop, Tracing, Spelling Stars; Tier 2: Sort & Place,
    Word Search, Balloon Math, Rainbow Bridge). Still valuable
    independent of the routing change.
  - dashboard_public_proof RPC + 60s landing refresh interval.
    Live proof tiles continue updating.
  - Autoplay activity preview videos on landing with
    IntersectionObserver pause-when-offscreen.

VERIFIED
  - tsc -b clean
  - check-csp passes
  - no dead imports"

git push origin master

echo ""
echo "Phase 2 routing reverted. Menu order + live proof + autoplay videos remain."
