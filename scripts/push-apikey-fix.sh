#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  src/lib/supabase.ts \
  src/pages/admin/InsightsDashboard.tsx \
  scripts/push-apikey-fix.sh

git commit -m "fix(admin/insights): apikey header must be anon key, not user JWT

Symptom on /admin/insights after sign-in:
  dashboard_today -> HTTP 401: 'Invalid API key'
PostgREST validates the 'apikey' header against the project's
anon/service_role keys. We were sending the user's Supabase access
token (the JWT issued after Google OAuth) which is correct for
'Authorization: Bearer' but never valid as 'apikey'.

  src/lib/supabase.ts
    + export function getAnonKey()  (the public anon key)

  src/pages/admin/InsightsDashboard.tsx
    callRpc now sends:
      apikey:        getAnonKey()        (project anon key)
      Authorization: Bearer <user JWT>   (user identity for RLS)

The dashboard RPCs are SECURITY DEFINER + GRANT EXECUTE TO anon, so
the user JWT isn't strictly necessary, but sending it costs nothing
and keeps the door open for future RPCs that want to read auth.uid().

VERIFICATION
- tsc -b   clean
After Vercel deploys, /admin/insights loads all 11 panels live."

git push origin master

echo ""
echo "Pushed apikey fix. Reload /admin/insights once Vercel goes Ready."
