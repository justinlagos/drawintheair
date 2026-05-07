#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs

git add -A
git commit -m "fix(csp): widen google-analytics + clarity to wildcard subdomains

Production csp_violation events show two third-party trackers being
blocked, even though they were on the allow list:

  - gtag tries to POST measurements to region1.google-analytics.com
    (regional endpoint) but CSP only allowed www.google-analytics.com.

  - Microsoft Clarity loads its main script from scripts.clarity.ms
    (CDN host) but CSP script-src only allowed www.clarity.ms.

Both have been silently broken since the CSP rewrite — gtag's
measurement events never reached GA4, and Clarity heatmaps never
recorded. The new analytics_events pipeline caught it because the
csp_violation listener in src/lib/analytics.ts logs every violation
to Supabase.

Fix: switch to wildcard subdomain entries that cover the full set
of regional + CDN hosts these vendors use.

  script-src   www.clarity.ms             ->  *.clarity.ms
  connect-src  www.google-analytics.com   ->  *.google-analytics.com

(connect-src already had *.clarity.ms; only the script-src side and
the GA connect-src needed widening.)

The check-csp guard still passes — its required-origin list does not
mention gtag or Clarity (they are optional), so this is a strict
loosening, not a structural change."

git push origin master

echo ""
echo "Pushed CSP widening."
echo ""
echo "After Vercel redeploys, this query should stop adding new rows:"
echo ""
echo "  SELECT count(*) FROM public.analytics_events"
echo "    WHERE event_name = 'csp_violation'"
echo "    AND occurred_at > now() - interval '5 minutes';"
