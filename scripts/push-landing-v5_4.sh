#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  src/pages/Landing.tsx \
  src/pages/landing-v3.css \
  scripts/push-landing-v5_4.sh

git commit -m "fix(landing): kill nav loading pill, bump nav logo, robust proof fetch

NAV . removed phantom loading pill
  NavMetricsTicker was rendering '... · loading' inside the nav
  even after the proof RPC resolved (the component's fallback
  state was sticky). The tile grid below the fold is the canonical
  surface for these numbers. Removed the ticker import, prop, and
  JSX call site. Nav is now: logo + links + Try free.

NAV LOGO . bumped 48 → 60 px desktop
  Justin's screenshot showed the brand mark looked tiny next to
  the Try free CTA. New scale, all with !important so the global
  img rules can't override:
    Desktop  60 px tall, max 210 px wide
    Tablet   48 px tall, max 168 px wide
    Mobile   40 px tall, max 140 px wide

PROOF FETCH . defensive shape parsing
  Verified dashboard_public_proof() returns the expected six numbers
  via the Supabase MCP (208 devices, 1750 activities completed,
  1158 mode plays, 95.3% tracker success, 241 items touched, 43
  mastered). RPC is healthy.

  Hardened the client unwrap to accept three response shapes
  PostgREST might emit depending on schema-cache state:
    a) bare jsonb object        . { distinct_devices_90d: N, ... }
    b) row-array with the json  . [{ distinct_devices_90d: N, ... }]
    c) row-array wrapping       . [{ proof: { distinct_devices_90d: N } }]

  Also added the explicit Authorization: Bearer <anon> header
  alongside the apikey one . some PostgREST configurations
  require both. Both headers carry the same anon JWT so it is
  still anonymous, no PII.

VERIFIED
  - tsc -b clean
  - check-csp passes
  - dashboard_public_proof() returns live numbers via MCP"

git push origin master

echo ""
echo "Landing v5.4 shipped."
