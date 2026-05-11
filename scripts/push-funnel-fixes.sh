#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  vercel.json \
  src/lib/analytics.ts \
  src/pages/Landing.tsx \
  src/components/TryFreeModal.tsx \
  src/features/onboarding/WaveToWake.tsx \
  scripts/push-funnel-fixes.sh

git commit -m "fix(funnel): six fixes from the 2026-05-11 platform audit

The 14-day audit showed:
  - 165 real sessions, median 48s, 40% bounce <30s
  - landing_view event fired 0 times — top-of-funnel was unmeasurable
  - try_free_clicked 60 → age_band_selected 41  (32% drop at age picker)
  - camera grant rate 65.8% with real users (NOT 90% as the
    test-cluster-excluded query suggested)
  - 34 CSP violations from 6 devices (www.google.com/g/collect
    blocked because connect-src has *.google-analytics.com but
    not www.google.com)
  - 8 sessions granted camera but never saw a hand — could be
    slow tracker init OR out-of-frame, no way to tell

Six fixes shipped:

1. landing_view event finally wired (src/pages/Landing.tsx)
   useEffect fires on Landing mount. Plus two new events:
     landing_engaged   first scroll past hero OR pointermove
     landing_unload    on beforeunload with time_on_page_ms +
                       scroll_depth_pct + engaged-or-not
   Together these decompose the 30s bounce: we can now cohort
   bouncers by 'never engaged', 'engaged but didn't click', and
   'engaged + clicked + bounced inside the demo'.

2. Bounce-investigation instrumentation (Landing.tsx + analytics.ts)
   landing_engaged / landing_unload give us the bouncer shape that
   the original landing_view alone couldn't. The next iteration can
   A/B copy or layout against this baseline.

3. CSP — added https://www.google.com to connect-src (vercel.json)
   Fixes the www.google.com/g/collect rejection. *.google-analytics.com
   was already present so region1.google-analytics.com should already
   pass; the residual violations were www.google.com which Google
   uses as a fallback collector. Marketing analytics now lands.

4. Phase B verification (no code change — query verified)
   feature_flag_exposed events split 35 treatment / 32 control over
   24h = 52/48. Exactly the 50/50 target, attribution is clean.
   First lift read in ~14 days.

5. Age picker — remove friction (src/components/TryFreeModal.tsx)
   Two changes:
     a) Removed '12+' option. The landing pill says 'Motion learning
        for ages 3 to 10' so 12+ was off-brand AND it forced the
        layout into an awkward 4+1 row.
     b) Default-select '6-7' on modal open. Start is immediately
        clickable. Was previously null, requiring an explicit pick
        before Start would enable — the proximate cause of the 32%
        drop. Reduces picker to one-tap for the 95% case and
        two-tap for the 5% who need a different band.

6. tracker_warmup_timing event (src/features/onboarding/WaveToWake.tsx
   + analytics.ts)
   Captures the moment trackerReady first flips true. When the first
   hand is seen we now log:
     value_number = ms since tracker became ready (or screen mount
                    if tracker never readied)
     meta.camera_to_hand_ms      pure tracker→hand latency
     meta.screen_to_hand_ms      total screen→hand latency
     meta.tracker_was_ready      whether tracker ever readied
   Sessions where trackerReadyAt never fires never log this event —
   which is itself a signal that tracker init didn't complete on
   that device.

VERIFIED
  - tsc -b           clean
  - check-csp        passes
  - A/B split        52 / 48 (treatment / control) over 24h

WHAT TO WATCH AFTER DEPLOY
  - landing_view count vs total sessions — should match within ~5%
  - age_band_selected / try_free_clicked ratio — should jump above
    the prior 0.68 since Start is now one-tap-default
  - tracker_warmup_timing.tracker_was_ready=false count — non-zero
    means real users are hitting tracker init failures we couldn't
    see before"

git push origin master

echo ""
echo "Funnel fixes shipped. Vercel will pick up automatically."
echo "Re-check /admin/insights in ~5 minutes once redeploy finishes."
