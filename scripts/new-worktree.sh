#!/usr/bin/env bash
# Create an isolated git worktree + task branch for a parallel agent/session.
# Usage:  ./scripts/new-worktree.sh <prefix> <short-name>
# Example: ./scripts/new-worktree.sh feat teacher-assignment
#          -> branch feat/teacher-assignment in ../DrawInTheAir-feat-teacher-assignment
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"; . "$DIR/_lib.sh"
[ $# -eq 2 ] || die "Usage: ./scripts/new-worktree.sh <prefix> <short-name>   (prefixes: $APPROVED_PREFIXES)"
PREFIX="$1"; NAME="$2"
prefix_ok "$PREFIX" || die "Prefix '$PREFIX' not allowed. Use one of: $APPROVED_PREFIXES"
SLUG="$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]' | tr ' _' '--' | sed 's/[^a-z0-9-]//g; s/--*/-/g; s/^-//; s/-$//')"
[ -n "$SLUG" ] || die "Could not build a valid branch name from '$NAME'."
BRANCH="$PREFIX/$SLUG"
[ "$BRANCH" != "$PROD_BRANCH" ] || die "Refusing to create a worktree on $PROD_BRANCH."

ensure_repo
git rev-parse --verify "$BRANCH" >/dev/null 2>&1 && die "Branch '$BRANCH' already exists. Pick a different name."

REPO_NAME="$(basename "$(git rev-parse --show-toplevel)")"
WT_DIR="../${REPO_NAME}-${PREFIX}-${SLUG}"
[ -e "$WT_DIR" ] && die "Folder '$WT_DIR' already exists."

c_blue "→ Fetching origin…"
git fetch --prune origin
c_blue "→ Creating worktree $WT_DIR on new branch $BRANCH (from origin/$PROD_BRANCH)…"
git worktree add -b "$BRANCH" "$WT_DIR" "origin/$PROD_BRANCH"
c_green "✔ Worktree ready: $WT_DIR  (branch $BRANCH)"
echo "Open that folder for the parallel agent. Each agent: one folder, one branch, one scope, one PR."
echo "When done:  git worktree remove $WT_DIR"
