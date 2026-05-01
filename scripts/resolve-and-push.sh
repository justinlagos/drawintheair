#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# resolve-and-push.sh
#
# Resolves the 4 known rebase conflicts and pushes. Run from the repo root:
#
#   bash scripts/resolve-and-push.sh
#
# IMPORTANT: During a REBASE, --ours and --theirs are reversed vs. a merge:
#   --ours    = origin/master (the branch we're rebasing onto)
#   --theirs  = our Kid-UI commit being replayed
#
# Resolution plan:
#   src/pages/Landing.tsx                         → --theirs  (keep MY Kid-UI rebuild)
#   src/lib/formSubmission.ts                     → --theirs  (keep MY version that
#                                                              Landing.tsx imports)
#   platform/src/app/api/form-submission/route.ts → --ours    (keep origin's backend)
#   platform/supabase/migrations/20260313_*.sql   → --ours    (keep origin's migration)
# ─────────────────────────────────────────────────────────────────────────────

set -e

cd "$(dirname "$0")/.."

# Sanity check we're mid-rebase
if [ ! -d ".git/rebase-merge" ] && [ ! -d ".git/rebase-apply" ]; then
    echo "❌ No rebase in progress. If you already finished, just run: git push origin master"
    exit 1
fi

echo "▸ Clearing any stale lock files..."
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

echo ""
echo "▸ Keeping MY Kid-UI rebuild for src/pages/Landing.tsx"
git checkout --theirs src/pages/Landing.tsx
git add src/pages/Landing.tsx

echo "▸ Keeping MY src/lib/formSubmission.ts (Landing.tsx imports it)"
git checkout --theirs src/lib/formSubmission.ts
git add src/lib/formSubmission.ts

echo "▸ Keeping ORIGIN's platform/src/app/api/form-submission/route.ts (backend)"
git checkout --ours platform/src/app/api/form-submission/route.ts
git add platform/src/app/api/form-submission/route.ts

echo "▸ Keeping ORIGIN's platform/supabase/migrations/20260313_form_submissions.sql"
git checkout --ours platform/supabase/migrations/20260313_form_submissions.sql
git add platform/supabase/migrations/20260313_form_submissions.sql

echo ""
echo "▸ Verifying no remaining conflicts..."
REMAINING=$(git diff --name-only --diff-filter=U)
if [ -n "$REMAINING" ]; then
    echo "⚠️  Still unresolved:"
    echo "$REMAINING"
    echo ""
    echo "Resolve these manually, then run: git rebase --continue && git push origin master"
    exit 1
fi

echo "  ✓ All four conflicts resolved."
echo ""
echo "▸ Continuing rebase..."

# git rebase --continue may try to open an editor; suppress that with GIT_EDITOR=true
GIT_EDITOR=true git rebase --continue

# If rebase hit MORE conflicts on later commits, stop here
if [ -d ".git/rebase-merge" ] || [ -d ".git/rebase-apply" ]; then
    echo ""
    echo "⚠️  Rebase hit additional conflicts on a later commit:"
    git diff --name-only --diff-filter=U
    echo ""
    echo "Resolve manually, then: git add <files> && git rebase --continue && git push origin master"
    exit 1
fi

echo ""
echo "▸ Rebase complete. Pushing to origin/master..."
git push origin master

echo ""
echo "✅ Done. Verify with: git log --oneline -10"
