#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# push-kid-ui.sh
#
# Commits the Kid-UI design system rollout, rebases onto origin's incoming
# commits, and pushes. Run from the repo root:
#
#   bash scripts/push-kid-ui.sh
#
# Strategy:
#   1. Clean any stale git lock files (index.lock, HEAD.lock, ref locks)
#   2. Unstage the embedded .claude/worktrees git repo (already gitignored)
#   3. Commit ALL local changes
#   4. Rebase onto origin/master
#   5. If conflicts arise, the script stops with clear instructions
#   6. Otherwise push to origin/master
# ─────────────────────────────────────────────────────────────────────────────

set -e

cd "$(dirname "$0")/.."

echo "▸ Clearing any stale git lock files..."
rm -f .git/index.lock
rm -f .git/HEAD.lock
rm -f .git/refs/heads/master.lock
rm -f .git/refs/remotes/origin/master.lock
find .git/refs -name "*.lock" -delete 2>/dev/null || true

echo "▸ Verifying we're on master..."
CURRENT_BRANCH=$(git symbolic-ref --short HEAD)
if [ "$CURRENT_BRANCH" != "master" ]; then
    echo "❌ Not on master (currently on $CURRENT_BRANCH). Aborting."
    exit 1
fi

# Make sure the embedded Claude worktree never gets staged
if [ -d ".claude/worktrees" ]; then
    echo "▸ Removing embedded .claude/worktrees from index (gitignored)..."
    git rm -rf --cached --quiet --ignore-unmatch .claude/worktrees 2>/dev/null || true
    git rm -rf --cached --quiet --ignore-unmatch .claude 2>/dev/null || true
fi

echo "▸ Staging all local changes (modified + untracked, .claude/ ignored)..."
git add -A

echo "▸ Checking for staged changes..."
if git diff --cached --quiet; then
    echo "  (no local changes to commit)"
else
    echo "▸ Creating Kid-UI rollout commit..."
    git commit -m "feat(kid-ui): platform-wide bright sky design system rollout

Migrates the entire Draw in the Air app to the Kid-UI bright-sky
design language, replacing the legacy 'magical playroom at night'
dark theme.

LANDING (src/pages/Landing.tsx + landing-kid.css)
- Full rebuild in bright sky aesthetic with sun, drifting clouds,
  meadow, sparkles, and an animated rainbow trail
- Fredoka headlines with charcoal+plum highlights, Nunito body
- KidButton CTAs throughout, KidPanel info cards
- Bespoke 2.5D SVG illustrations for each game mode (no emoji)
- Bespoke classroom + hand-tracking landmark scenes
- All em dashes removed per copy guidelines
- Restyled feedback widget and School Pilot modal

ONBOARDING + INTRO
- WaveToWake: bright sky body, animated sun + clouds + sparkles +
  meadow, cream KidPanel with sunshine progress dots and waving-hand
  SVG; tracking logic preserved
- DemoLoader: bright sky splash with rainbow progress bar, redesigned
  camera-blocker card and help overlay in Kid-UI

AGE GATE
- TryFreeModal CSS rebuilt: cream gradient panel with corner sun,
  Fredoka title, plum-bordered age pills, plum primary KidButton,
  meadow privacy callout
- TS cleanup: typed AnalyticsWindow interface, removed any types,
  pure URL admin flag read at module init

MENU + GAME SHELL
- ModeSelectionMenu: hoisted getScreenInfo into useCallback,
  scoped eslint-disable for legitimate hand-tracking effect
- AdultGate: previously migrated; verified clean
- App.css: .App and body:has(.App) paint bright sky gradient
- index.css: legacy --world-bg-0 dark default replaced with
  bright sky gradient fallback

VERIFICATION
- tsc --noEmit clean across whole repo
- ESLint clean for all files modified in this rollout
- Reduced-motion media queries respected platform-wide"
fi

echo ""
echo "▸ Fetching origin..."
git fetch origin

echo "▸ Rebasing onto origin/master..."
echo "  (Replaying our commits on top of incoming commits)"

if git rebase origin/master; then
    echo ""
    echo "▸ Rebase clean. Pushing to origin/master..."
    git push origin master
    echo ""
    echo "✅ Done. Run 'git log --oneline -10' to verify."
else
    echo ""
    echo "⚠️  Rebase hit conflicts."
    echo ""
    echo "    Conflict files (look for <<<<<<< / >>>>>>> markers):"
    git diff --name-only --diff-filter=U
    echo ""
    echo "    To finish:"
    echo "      1. Edit each file above to resolve conflicts"
    echo "      2. Run:    git add <file>"
    echo "      3. Run:    git rebase --continue"
    echo "      4. Repeat until rebase finishes"
    echo "      5. Run:    git push origin master"
    echo ""
    echo "    To abort and try a different strategy:"
    echo "      git rebase --abort"
    echo ""
    echo "    Hint — for files where YOUR Kid-UI rebuild is the source of"
    echo "    truth (Landing.tsx, FAQ.tsx, Schools.tsx, ParentsLanding.tsx,"
    echo "     SchoolPilot.tsx, ParentAccess.tsx, Admin.tsx, etc.):"
    echo "      git checkout --ours <file> && git add <file>"
    echo ""
    echo "    For files origin updated that you didn't substantively touch"
    echo "    (LearnHubPage.tsx, PressPage.tsx, TeacherDashboard.tsx,"
    echo "     platform/* admin pages):"
    echo "      git checkout --theirs <file> && git add <file>"
    exit 1
fi
