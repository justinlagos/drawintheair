#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

# Includes any previous v2 work that may not have shipped yet, plus the v2.1 rebuild
git add \
  platform/supabase/migrations/20260512_insights_v2_rpcs.sql \
  platform/supabase/migrations/20260512_insights_v2_deep_dives.sql \
  platform/supabase/migrations/20260512_anomaly_check_device_based.sql \
  src/lib/analytics.ts \
  src/pages/admin/InsightsDashboard.tsx \
  src/pages/admin/insights/ \
  scripts/push-insights-v2.sh \
  scripts/push-insights-v21.sh \
  scripts/push-anomaly-fix.sh

git commit -m "feat(insights): v2.1 — real logo + deeper data + dedicated PDF report

Justin feedback from v2 ship:
  1. Logo too big, taking too much space → use real /logo.png, 32px tall
  2. PDF export scattered / wrongly rendered → dedicated /admin/insights?
     report=1 view that lays out paper-shaped pages and auto-prints
  3. Make the data more usable, no guessing → plain-English labels +
     explicit Mastered / Practising / New buckets + tooltips
  4. Expand engagement → per-mode performance cards with median + p90
     time-on-task, stuck rate, abandon rate, daily mini-trend
  5. Make mastery/curriculum more engaging → 'Top mastered' (celebrate)
     and 'Struggling with' (action items) tables + Strong/Practising/
     New stacked strength bars + mode filter
  6. 10x retention → cohort heatmap (the moneyshot), DAU/WAU/MAU
     stickiness card, new vs returning daily area chart, 'what brings
     them back' ranking

New database RPCs (platform/supabase/migrations/
20260512_insights_v2_deep_dives.sql, already applied to prod):
  dashboard_engagement_deep(days)
    Per-mode: started, completed, abandoned, stuck, median + p90
    seconds-on-task, distinct devices, completion / stuck / abandon
    rates, daily plays time series. One call powers the whole
    engagement tab.
  dashboard_mastery_summary(days)
    Per-(mode,item) device-mastery buckets. Returns totals + items +
    'struggling' list (median acc < 60% AND ≥ 3 devices) + 'top
    strong' list. The struggling list is the action-oriented bit
    we were missing.
  dashboard_retention_deep()
    Daily new vs returning, DAU/WAU/MAU + stickiness ratio, cohort
    retention heatmap (week × week-offset), 'returning hooks'
    leaderboard (which mode brings kids back first).

New React files
  src/pages/admin/insights/PrintReport.tsx
    A six-page A4 report layout (cover, executive, engagement,
    learning, retention, reliability). Auto-fires window.print()
    once data has loaded. Linear, paginated, designed FOR paper —
    not a retrofitted print stylesheet. The Print button on the
    dashboard now opens this in a new tab with ?report=1.

Updated components.tsx
  StrengthBar    Stacked strong/practising/new
  StrengthKey    Legend
  Heatmap        Cohort × week grid with plum saturation
  DualAreaChart  New vs returning daily stacked area

Tabs rewritten end-to-end
  EngagementTab.tsx
    Summary KPIs across modes + per-mode cards (started/kids/
    completion/median/p90/stuck) + 'longest sessions' ranking +
    'friction map' table with auto-signal (needs scaffolding /
    too hard / some friction / healthy).
  LearningTab.tsx
    Top KPIs (items mastered / practising / new) + Top Mastered
    + Struggling With + per-item strength-split table with mode
    filter pills + Curriculum Coverage with breadth bar.
  RetentionTab.tsx
    Stickiness card with DAU÷MAU explanation in plain English +
    'what brings kids back' ranked list + cohort heatmap +
    new-vs-returning daily area + cohort curves + D1/D3/D7 table.

Branding
  InsightsDashboard.tsx
    .iv-brand-mark gradient block replaced with <img src='/logo.png' />
    Logo capped at 32px tall so it doesn't dominate the top bar.

VERIFIED
  - tsc -b      clean
  - check-csp   passes
  - All three new RPCs return non-null payloads on production data
  - PrintReport.useEffect fires window.print() 800ms after all 8
    RPCs resolve, so the print dialog opens with data, not skeletons"

git push origin master

echo ""
echo "Insights v2.1 shipped. Open /admin/insights and click Print to"
echo "get the new paginated A4 report."
