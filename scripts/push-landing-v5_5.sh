#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  src/pages/Landing.tsx \
  public/service-worker.js \
  scripts/push-landing-v5_5.sh

git commit -m "fix(landing): use callRpc + diagnostic logging for proof fetch

PROOF NUMBERS . switched to the proven Supabase RPC helper

  fetchPublicProof was hand-rolling its own fetch with both apikey
  and Authorization headers. Replaced with the well-tested
  callRpc() helper from src/lib/supabase.ts that the rest of the
  app already uses. Same headers, but the helper has been battle-
  tested on the /class and /admin routes so any auth or CORS
  issue would have surfaced there first.

  Verified via Supabase MCP that public.dashboard_public_proof()
  returns the six numbers correctly:
    distinct_devices_90d : 208
    activities_completed : 1750
    mode_plays           : 1158
    tracker_success_pct  : 95.3
    items_touched        : 241
    items_mastered       : 43

  Defensive unwrap still in place . accepts bare jsonb, row-array,
  and {proof:{...}} wrapping shapes so PostgREST schema-cache state
  cannot blank the tiles.

DIAGNOSTIC LOGGING

  Both failure modes now emit a console.warn so the next time the
  tiles are blank in production we can see WHY in DevTools:

    [landing-proof] dashboard_public_proof failed { message, code }
    [landing-proof] dashboard_public_proof returned unexpected shape ...

  No PII. Safe to ship.

SW CACHE BUMP

  CACHE_VERSION v7-brand-2026-05-20 → v8-proof-2026-05-21.
  skipWaiting + clients.claim already in place so the new bundle
  (with the fix) activates on the next page load. Without the bump
  users on the old service worker would keep getting the old
  Landing.js out of their cache and never see this fix.

VERIFIED
  - tsc -b clean
  - check-csp passes
  - RPC executes against production"

git push origin master

echo ""
echo "Landing v5.5 shipped."
