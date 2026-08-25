#!/usr/bin/env bash
# Validate, then push the current task branch and print PR instructions.
# Never merges. Never deploys. Never pushes master/main/staging.
# Usage: ./scripts/publish-task.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"; . "$DIR/_lib.sh"
ensure_repo
BR="$(current_branch)"
case "$BR" in
  master|main|staging) die "Refusing to publish from protected branch '$BR'. Start a task branch with ./scripts/start-task.sh" ;;
esac
ensure_clean

c_blue "→ Running validation before publish…"
"$DIR/check-task.sh"

c_blue "→ Pushing $BR to origin (setting upstream)…"
git push -u origin "$BR"

REPO_URL="$(git remote get-url origin | sed 's/\.git$//' | sed 's#git@github.com:#https://github.com/#')"
c_green "✔ Pushed $BR."
echo ""
echo "Open a Pull Request into $PROD_BRANCH:"
echo "  ${REPO_URL}/compare/${PROD_BRANCH}...${BR}?expand=1"
echo ""
echo "Then: wait for CI to pass, review the Vercel Preview, and complete the PR checklist."
echo "Do NOT merge until checks are green and you have done founder acceptance testing."
