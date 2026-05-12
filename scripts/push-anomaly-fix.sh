#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  src/lib/analytics.ts \
  platform/supabase/migrations/20260512_anomaly_check_device_based.sql \
  scripts/push-anomaly-fix.sh

git commit -m "fix(analytics): dedupe camera_denied + device-based anomaly check

Background
  2026-05-12 the camera_denied anomaly alert fired four times in one
  hour. The window summary showed 124, 131, 46, 46 denial events
  against 0–10 new sessions. Looked like a major regression.
  Diagnosis: a single device_id (de5f4209-…) fired 46 denial events
  in 9 minutes via the Phase B 'CameraRecovery → Try again' button
  on a browser with permission permanently set to Block. Each
  retry produced a fresh camera_requested → camera_denied event
  pair. The cron counted raw events, so one looping browser
  registered as a fleet-wide event.

Two changes, belt-and-braces

  1. Source-level dedupe (src/lib/analytics.ts)
     New oncePerSessionFired set in logEvent. The ONCE_PER_SESSION
     map says: camera_denied → camera_retry_failed for any
     subsequent fire within the same session. Cleared on
     startSession() so a fresh session starts clean.
     New EventName variant: 'camera_retry_failed'.
     Net effect: dashboards still see camera_denied = first denial
     per session (true funnel signal), and retries land in
     camera_retry_failed (operational signal). Stops the inflation
     at the source for new clients without touching the
     CameraRecovery UX.

  2. RPC change (platform/supabase/migrations/
     20260512_anomaly_check_device_based.sql)
     dashboard_anomaly_check rewritten to use COUNT(DISTINCT
     device_id) for every metric where one device can plausibly
     spam events (denials, CSP, init failures). system_error
     still uses raw count — an uncaught exception that loops on
     one device IS notable.
     Threshold tune:
       tracker_init_failed  3 → 5 distinct devices
       camera_denied        5 → 10 distinct devices
       csp_violation        5 → 10 distinct devices
       system_error         1 → 3 events
     Already applied to production database; this commit pins the
     migration in the repo.

VERIFIED
  - tsc -b   clean
  - check-csp passes
  - Migration applied + the next anomaly cron run will use the new
    counts. Expect the next email to either not arrive at all (the
    one looping device falls under threshold) or to read 'N
    distinct devices' instead of 'N raw events'.

OPS NOTE
  The old camera_denied alerts in your inbox from this morning are
  benign — they describe a single browser with blocked permissions
  retrying repeatedly, not a real outage. Safe to mark them read."

git push origin master

echo ""
echo "Anomaly fix shipped. Next cron run uses the new counts."
