#!/usr/bin/env bash
# Shared helpers for Draw in the Air founder workflow scripts.
# POSIX-friendly; works with the bash 3.2 that ships on macOS.
set -euo pipefail

PROD_BRANCH="master"
APPROVED_PREFIXES="feat fix hotfix chore docs test refactor"

c_red()   { printf '\033[31m%s\033[0m\n' "$1"; }
c_green() { printf '\033[32m%s\033[0m\n' "$1"; }
c_blue()  { printf '\033[36m%s\033[0m\n' "$1"; }
die()     { c_red "✖ $1"; exit 1; }

ensure_repo() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Not inside a git repository."
  local url; url="$(git remote get-url origin 2>/dev/null || echo '')"
  case "$url" in
    *drawintheair*) : ;;
    *) die "This does not look like the Draw in the Air repo (origin: ${url:-none})." ;;
  esac
}

current_branch() { git rev-parse --abbrev-ref HEAD; }

ensure_clean() {
  if [ -n "$(git status --porcelain)" ]; then
    die "You have uncommitted changes. Commit or stash them first (this script will not touch your work)."
  fi
}

prefix_ok() {
  local p="$1"
  for ok in $APPROVED_PREFIXES; do [ "$p" = "$ok" ] && return 0; done
  return 1
}
