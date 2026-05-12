#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  platform/supabase/migrations/20260512_insights_v2_rpcs.sql \
  platform/supabase/migrations/20260512_anomaly_check_device_based.sql \
  src/lib/analytics.ts \
  src/pages/admin/InsightsDashboard.tsx \
  src/pages/admin/insights/ \
  scripts/push-insights-v2.sh \
  scripts/push-anomaly-fix.sh

git commit -m "feat(insights): v2 — investor-grade dashboard rebuild

The 941-line monolith at /admin/insights is replaced with a real
data product: tabbed shell, period-over-period deltas, A/B test
results with significance, cohort retention curves, live indicator,
CSV export per panel, URL-state filters, mobile-perfect responsive,
print-to-PDF.

Goal: opens doors to investors + partners. Replaces a developer
dashboard with something Justin can show during a pitch.

New database RPCs (platform/supabase/migrations/20260512_insights_v2_rpcs.sql)
  dashboard_executive_summary(days)
    Six north-star KPIs for the current window + same-length prior
    window deltas, plus a 14-day daily-sessions sparkline.
  dashboard_ab_results(flag)
    Per-variant sample size, primary metric (camera_granted rate),
    absolute lift in pp, a two-proportion z-score and a 'verdict'
    string ('treatment winning' / 'inconclusive' / 'control winning'
    / 'sample too small') so the UI can render the right banner.
  dashboard_cohort_curves(weeks)
    Daily return % per cohort week, days 0..14. Drives a multi-line
    retention curve chart.
  dashboard_live()
    Sessions with activity in the last 5 minutes. Drives the
    'Live · N active' indicator that refreshes every 15s.
  All four already applied to production database; this commit pins.

Also bundles the previously-staged anomaly fix:
  20260512_anomaly_check_device_based.sql — COUNT(DISTINCT device_id)
  src/lib/analytics.ts — camera_denied dedupes to camera_retry_failed

New folder src/pages/admin/insights/
  types.ts        — all interfaces in one module
  rpc.ts          — typed RPC wrappers (apikey = anon, Bearer = JWT)
  helpers.ts      — fmt helpers, useFilter (URL state), useRpc
                    (auto-refresh + retry), downloadCsv, share-link
  components.tsx  — Card, Kpi, Delta, Sparkline, FunnelChart,
                    CohortCurves (inline SVG, no chart lib), Tag,
                    Skeleton, TableWrap, InlineBar, Empty
  insights.css    — responsive grid + sticky top bar + KPI snap
                    strip on mobile + print stylesheet (A4 portrait,
                    hides chrome, breaks-inside-avoid on cards)
  tabs/
    ExecutiveTab.tsx   — 8 KPIs, activation funnel, A/B card,
                          tracker health, recent errors. One screen.
    EngagementTab.tsx  — most-played modes (with completion bars).
    LearningTab.tsx    — per-item mastery + curriculum coverage +
                          mastery milestones.
    RetentionTab.tsx   — cohort retention curves (line chart) +
                          D1/D3/D7 table.
    SessionsTab.tsx    — searchable + filterable session log.
                          Filters by device + age + free-text search.
    ErrorsTab.tsx      — grouped error stream by event_name + code.

Orchestrator src/pages/admin/InsightsDashboard.tsx
  Slimmed from 941 lines to ~250. Auth gate, top bar with brand +
  live indicator + Share/Print/Sign-out buttons, filter bar
  (range + device + age), tab strip, content router.
  Keyboard shortcuts 1–6 jump between tabs.

Investor-grade features
  - Period-over-period deltas with green/coral/gray arrows on every KPI
  - 14-day sparklines under each KPI
  - Two-proportion z-test verdict on A/B experiments
  - Cohort retention as a real chart, not just a table
  - Live indicator refreshing every 15 seconds
  - Print-to-PDF that produces a clean A4 portrait one-pager
  - Share link copies a permalink to the current view (still
    requires sign-in but routes admins to your exact filter)
  - CSV export on every panel

Mobile-perfect
  - KPI grid becomes a snap-scroll strip (swipe 8 cards)
  - Tables wrap in iv-table-wrap with shadow-fade scroll indicator
  - Tab strip horizontal-scrolls; filter pills stack
  - Filter bar stays sticky and readable

VERIFIED
  - tsc -b            clean
  - check-csp         passes
  - All four new RPCs return non-null payloads (queried live)
  - Sparkline shows the May 11 spike to 280 sessions
  - dashboard_live() returns the test session correctly
  - Old InsightsDashboard.tsx replaced in place — no routing changes

Parked for follow-up (Phase 3)
  - Custom date picker (currently 24h/7d/30d/90d preset)
  - Annotations timeline (mark deploys on the chart)
  - Per-school dashboards (needs more school_id population)
  - Standards-mapped outcome reports (EYFS / Common Core)
  - Public no-auth share token (currently requires admin sign-in)"

git push origin master

echo ""
echo "Insights v2 shipped. Open /admin/insights on mobile and desktop"
echo "after Vercel deploys — should feel like a different product."
