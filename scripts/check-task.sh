#!/usr/bin/env bash
# Validate the current task branch locally. Does NOT deploy or merge.
# Usage: ./scripts/check-task.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"; . "$DIR/_lib.sh"
ensure_repo
BR="$(current_branch)"
[ "$BR" != "$PROD_BRANCH" ] || die "You are on $PROD_BRANCH. Run checks on a task branch, not production."

run() { c_blue "→ $1"; shift; if "$@"; then c_green "  ✔ ok"; else die "Check failed: $*"; fi; }

run "Lint"             npm run lint
run "Type check"       npm run type-check
run "Unit tests"       npm run test
run "Env-safety guard" node scripts/check-env-safety.mjs
run "CSP check"        npm run check:csp
run "Secret scan"      npm run check:secrets
run "Production build" npm run build

c_green "✔ All local checks passed on $BR. You can publish with ./scripts/publish-task.sh"
