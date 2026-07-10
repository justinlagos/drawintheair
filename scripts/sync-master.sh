#!/usr/bin/env bash
# Update local master to match origin/master (fast-forward only). Never discards work.
# Usage: ./scripts/sync-master.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"; . "$DIR/_lib.sh"
ensure_repo
ensure_clean
c_blue "→ Switching to $PROD_BRANCH…"
git checkout "$PROD_BRANCH"
c_blue "→ Fetching origin…"
git fetch --prune origin
c_blue "→ Fast-forward pull…"
git pull --ff-only origin "$PROD_BRANCH"
LOCAL="$(git rev-parse "$PROD_BRANCH")"; REMOTE="$(git rev-parse "origin/$PROD_BRANCH")"
[ "$LOCAL" = "$REMOTE" ] || die "$PROD_BRANCH did not fast-forward cleanly. Investigate before continuing."
c_green "✔ $PROD_BRANCH is up to date."
echo "Current production candidate SHA: ${LOCAL:0:7}  (full: $LOCAL)"
