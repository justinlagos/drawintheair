#!/usr/bin/env bash
# Start a new task branch from the latest production master.
# Usage:  ./scripts/start-task.sh <prefix> <short-name>
# Example: ./scripts/start-task.sh fix student-join-flow   ->  fix/student-join-flow
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"; . "$DIR/_lib.sh"

[ $# -eq 2 ] || die "Usage: ./scripts/start-task.sh <prefix> <short-name>   (prefixes: $APPROVED_PREFIXES)"
PREFIX="$1"; NAME="$2"
prefix_ok "$PREFIX" || die "Prefix '$PREFIX' not allowed. Use one of: $APPROVED_PREFIXES"
# normalise name: lowercase, spaces/underscores -> hyphens, strip junk
SLUG="$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]' | tr ' _' '--' | sed 's/[^a-z0-9-]//g; s/--*/-/g; s/^-//; s/-$//')"
[ -n "$SLUG" ] || die "Could not build a valid branch name from '$NAME'."
BRANCH="$PREFIX/$SLUG"

ensure_repo
ensure_clean

c_blue "→ Fetching origin…"
git fetch --prune origin
c_blue "→ Switching to $PROD_BRANCH…"
git checkout "$PROD_BRANCH"
c_blue "→ Updating $PROD_BRANCH (fast-forward only)…"
git pull --ff-only origin "$PROD_BRANCH"

LOCAL="$(git rev-parse "$PROD_BRANCH")"; REMOTE="$(git rev-parse "origin/$PROD_BRANCH")"
[ "$LOCAL" = "$REMOTE" ] || die "$PROD_BRANCH ($LOCAL) does not match origin/$PROD_BRANCH ($REMOTE). Resolve before starting work."

git rev-parse --verify "$BRANCH" >/dev/null 2>&1 && die "Branch '$BRANCH' already exists. Pick a different name."
c_blue "→ Creating task branch $BRANCH…"
git checkout -b "$BRANCH"

c_green "✔ You are now on: $BRANCH (based on production $PROD_BRANCH @ ${LOCAL:0:7})"
echo ""
echo "Next steps:"
echo "  1. Make your focused change."
echo "  2. Commit:        git add -A && git commit -m \"...\""
echo "  3. Validate:      ./scripts/check-task.sh"
echo "  4. Publish + PR:  ./scripts/publish-task.sh"
