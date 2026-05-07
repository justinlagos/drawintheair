#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc --noEmit

git add -A
git commit -m "fix(analytics): send return=minimal so anon inserts land

ROOT CAUSE OF THE EMPTY analytics_events TABLE

Phase 1 + Phase 2 were both deployed correctly. The bundle on
drawintheair.com contains every Phase 2 event string. The Supabase
anon GRANT INSERT and the 'Anonymous insert analytics events' RLS
policy (TO anon, authenticated WITH CHECK true) are both in place.

But every kid hitting /play as anon got a silent 42501 RLS denial,
while Justin hitting it as an authenticated admin sailed through.
Result: only session_heartbeat events from Justin's logged-in test
session ever landed in the table — 38 rows total in three weeks.

Why: src/lib/supabase.ts dbInsert() defaults to
  Prefer: return=representation
which makes PostgREST run an INSERT...RETURNING that performs an
implicit SELECT to ship the new rows back to the client. The SELECT
side runs under RLS. Our SELECT policy is intentionally
authenticated-only (the dashboard reads it; anon kids never need to
read their own events back). So:

  anon → INSERT row → INSERT policy passes → SELECT step runs →
  SELECT policy sees role=anon → no match → RLS denies →
  whole transaction rolls back → 42501 to client.

Verified by direct curl against the deployed anon JWT:
  - single-row insert with NO Prefer header               → 201
  - single-row insert with Prefer: return=minimal         → 201
  - array insert with Prefer: return=representation       → 401/42501
  - array insert with all columns + return=representation → 401/42501

The 42501 path matches exactly what the dbInsert client sends.

THE FIX

src/lib/analytics.ts → flush() now passes { returning: false } to
dbInsert, which sets Prefer: return=minimal. PostgREST skips the
SELECT-after-INSERT, the row commits, and anon kids' events finally
reach the table. We never needed the inserted rows back anyway —
this is fire-and-forget telemetry.

The sendBeacon path in setupBeforeUnload doesn't set a Prefer
header (sendBeacon can't set custom headers), so PostgREST defaults
to return=minimal there — that path was already correct.

VERIFICATION
- tsc --noEmit  clean
- check-csp     all 9 origins present
- single-file change, no schema or policy edits

POST-DEPLOY
After Vercel rebuilds, walk the funnel once in Incognito and run:

  SELECT event_name, count(*)
    FROM public.analytics_events
    WHERE occurred_at > now() - interval '15 minutes'
    GROUP BY event_name
    ORDER BY 2 DESC;

Expect ~13 distinct event types from a single session, with
session_id matching across them. If anything is still missing, the
console will now show '[analytics] flush failed: ...' with the real
PostgREST error rather than a silent rollback."

git push origin master

echo ""
echo "Pushed analytics RLS hotfix."
echo ""
echo "After Vercel redeploys (60-90s), open Incognito, walk the funnel,"
echo "then run in Supabase SQL editor:"
echo ""
echo "  SELECT event_name, count(*)"
echo "    FROM public.analytics_events"
echo "    WHERE occurred_at > now() - interval '15 minutes'"
echo "    GROUP BY event_name"
echo "    ORDER BY 2 DESC;"
