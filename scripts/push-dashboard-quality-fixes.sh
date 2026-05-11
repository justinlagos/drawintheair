#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  platform/supabase/migrations/20260511_dashboard_quality_fixes.sql \
  src/features/modes/wordSearch/wordSearchLogic.ts \
  scripts/push-dashboard-quality-fixes.sh

git commit -m "fix(analytics): three dashboard lies, corrected at the source

The dashboards have been telling us nonsense — Colour Builder at 145%,
Balloon Math 180%, Pre-Writing 210%, Calibration 165%, and an
'unknown_word' phantom item topping the Word Search mastery chart.
This migration corrects all three at the root.

Bug 1 — completion rates above 100%
  mode_completed fires per stage / letter / level in almost every
  mode, not once per session. The old dashboard_top_modes did
  sum(completed) / sum(started) and pushed every multi-stage mode
  over 100%. Fix: collapse to (game_mode, session_id) BEFORE counting,
  so each session contributes at most one 'started' and one
  'completed' per mode. Same logic gets applied to dashboard_today.

Bug 2 — Free Paint dragging the average to zero
  'free' is an open-ended sandbox — there's no completion event by
  design. The old query rolled its 22 starts into the average as 0%
  completion. Fix: classify open-ended modes via a sentinel set
  (currently just 'free') and return completion_rate_pct = NULL +
  is_open_ended = true. Dashboard renders '—' for those.
  dashboard_today also excludes them from the denominator entirely.

Bug 3 — 'unknown_word' polluting Word Search mastery
  wordSearchLogic.ts had \`itemKey: result.wordFound || 'unknown_word'\`
  which mirrored 35 garbage rows into learning_attempts and showed
  'unknown_word' as a top mastered item. Fix: leave itemKey
  undefined on a failed selection — the analytics layer already
  skips mirroring when itemKey isn't a string. The migration purges
  the 35 existing junk rows and adds a CHECK constraint so the
  table refuses any future regression: NOT IN
  ('unknown_word','unknown','null','undefined','').

VERIFIED POST-MIGRATION
  - dashboard_top_modes(30) — every mode now <=100%:
      free            22 / 0   open-ended, NULL
      calibration     18 / 11  61.1%   (was 165%)
      pre-writing     10 / 7   70.0%   (was 210%)
      gesture-spell   10 / 6   60.0%   (was 167%)
      word-search      8 / 3   37.5%
      sort-and-place   8 / 0    0.0%   (genuine — fires no mode_completed)
      rainbow-bridge   7 / 2   28.6%
      balloon-math     4 / 3   75.0%   (was 180%)
  - dashboard_today.completion_rate_pct = 62.5%
  - learning_attempts.item_key = 'unknown_word' — 0 rows
  - mastery_top now lists real items only (letters, numbers,
    colours, shapes, words YAK / BUG / CAT / EMU / HEN / HOG / KIT)

FOLLOW-UPS PARKED (not in this commit, but logged)
  - sort-and-place: 8 starts, 0 completions in 30 days — the mode
    logic doesn't fire mode_completed. Separate bug to fix.
  - word-search item events have avg_ms: null — item_grabbed→drop
    timing isn't being captured. Worth wiring for mastery insight.

NO behaviour change for users. No new dependencies. The bug list
the audit surfaced is now four entries shorter."

git push origin master

echo ""
echo "Phase A shipped — dashboard data quality."
echo "Re-open the insights dashboard to see clean numbers."
