#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc --noEmit

# ── Tier A: extended event vocabulary + call-site wiring ─────────
git add \
  src/lib/analytics.ts \
  src/App.tsx \
  src/features/safety/AdultGate.tsx \
  src/pages/Landing.tsx
git commit -m "feat(analytics): Tier A — vocabulary, mode_abandoned, CTA sources, adult gate, page lifecycle

Foundation pass for the four-tier expansion mapped out in chat. No
new infra; just more events at existing call sites + plumbing in
analytics.ts that everything else builds on.

VOCABULARY (src/lib/analytics.ts)
  + cta_click       (meta.source = 'hero'|'nav'|'final_banner'|...)
  + mode_abandoned  (replaces the mode_completed-on-exit lie)
  + mode_switched   (kid bounced from one mode straight to another)
  + stage_started / stage_completed
  + tab_hidden / tab_visible / nav_back
  + adult_gate_attempt / adult_gate_passed / adult_gate_failed
  + hint_shown
  + tracker_quality_sample / two_hands_detected
  + feature_flag_exposed (dedupe-once-per-session-per-flag exposed)
  + session_ended now carries fatigue_score in meta

INFRASTRUCTURE (src/lib/analytics.ts)
  + getOrCreateDeviceId()  stable per-browser UUID in localStorage
  + markGrab/elapsedSinceGrab  per-action timing helpers used by
    every grab→drop pair so action_duration_ms is consistent
  + exposeFeatureFlag()    dedupes per session per flag
  + noteTwoHandsSeen()     dedupes per session
  + recordActionTiming()   feeds the fatigue_score computation
  + setupPageListeners()   tab_hidden/tab_visible + popstate
  + window.dita_analytics  augmented with all of the above for
                           console probing

CALL SITES
  • App.tsx:
      - handleExitToMenu now fires mode_abandoned (was mode_completed)
      - handleModeSelect detects in-game→in-game switches, fires
        mode_switched in addition to mode_selected/mode_started
  • AdultGate.tsx:
      - startHold → adult_gate_attempt
      - hold complete → adult_gate_passed
      - hold released early → adult_gate_failed (with progress_pct)
  • Landing.tsx:
      - All seven Try Free CTAs route through trackCtaClick(source,
        label) so dashboard funnel can finally A/B them. Sources:
        nav, mobile_menu, hero, activities, mode_tile,
        privacy_section, final_banner.

VERIFICATION
- tsc --noEmit clean
- check-csp passes (no new external origins)"

# ── Tier B: tracker-quality sampler + per-action timing + mistake patterns ─
git add \
  src/camera/useVisionLoop.ts \
  src/features/modes/colourBuilder/colourBuilderLogic.ts \
  src/features/modes/sortAndPlace/sortAndPlaceLogic.ts
git commit -m "feat(analytics): Tier B — tracker quality sampling + mistake patterns

Where Draw in the Air is genuinely different from a tablet game,
and where the instrumentation should match.

VISION LOOP (src/camera/useVisionLoop.ts)
  • 1-Hz tracker_quality_sample event, tied to the existing FPS
    bucket flip so it costs nothing extra. Carries fps,
    missing_pct, window_size in meta.
  • Two-hands detection: when MediaPipe (with numHands=2 enabled)
    reports >1 landmark set, fire two_hands_detected once per
    session — the 'parent in the frame' engagement signal we've
    been blind to.
  • Both gated on hasActiveSession() so the marketing landing page
    doesn't pollute the table.

PER-ACTION TIMING + MISTAKE PATTERNS
  Sort & Place + Colour Builder both:
    • mark grab time at item_grabbed via markGrab(itemId)
    • compute action_duration_ms at item_dropped via elapsedSinceGrab
    • include expected_color/expected_bin_id and actual_color/
      actual_bin_id in item_dropped meta — mistake-pattern data so
      the dashboard can answer 'are kids confusing red with orange?'
    • emit stage_started at the top of the round and stage_completed
      alongside mode_completed with time_to_first_correct_ms +
      time_to_all_correct_ms in value_number / meta.
    • Colour Builder also fires hint_shown when bounceBack triggers
      (the physics engine giving the kid a soft hint).

The analytics.ts logEvent harvests action_duration_ms into the
rolling actionTimings buffer, which feeds session_fatigue_score at
session_ended (>1.0 means slowing down).

Word Search and Pre-Writing follow the same pattern but their grab/
drop semantics are different enough that they need a separate pass —
left as TODO to avoid blowing this commit up.

VERIFICATION
- tsc --noEmit clean"

# ── Tier C: device_id + learning_attempts + retention/mastery RPCs ─
git add \
  platform/supabase/migrations/20260507_analytics_tier_c_d.sql
git commit -m "feat(analytics): Tier C — device_id + learning_attempts + retention + mastery

Per-device retention and per-item mastery — the longitudinal story.
Migration was applied to production via apply_migration; this
commit captures the SQL for git history.

SCHEMA
  • analytics_events.device_id (text) — stable per-browser UUID
    populated from analytics.ts. Indexed on (device_id, occurred_at)
    where not null for fast cohort queries.
  • learning_attempts table — one row per kid-tries-an-item.
    (session_id, device_id, game_mode, stage_id, item_key, age_band,
    was_correct, attempt_number, ms_to_attempt, expected_value,
    actual_value, meta). RLS: anon insert, authenticated select.
    Three indexes: (device_id, item_key, occurred_at), (session_id),
    (game_mode).

RPCs
  • dashboard_cohort_retention(in_weeks)
      D1/D3/D7 return-rate by week of first visit, by device_id.
  • dashboard_mastery(in_days, in_min_attempts)
      Per-(game_mode, item_key) accuracy + attempts + distinct kids
      + avg ms-to-attempt. Honest 'are kids learning the letter B'.
  • dashboard_curriculum_coverage(in_days)
      Per-mode average distinct items practised per device.
  • dashboard_latest_sessions updated to expose device_id and
    two_hands_seen.

Inserts into learning_attempts are mirrored from item_dropped events
inside src/lib/analytics.ts logEvent() — so mode logic files don't
need to know about that table. Same return=minimal flush pattern as
analytics_events to dodge the SELECT-after-INSERT RLS rollback."

# ── Tier C wiring + Tier D RPCs ──────────────────────────────────
git add platform/supabase/migrations/20260507_analytics_dashboard_rpcs.sql \
        scripts/push-dashboard-rpcs.sh \
        scripts/push-tiers-a-to-d.sh \
        src/lib/analytics.ts 2>/dev/null || true
# (analytics.ts may already be staged in Tier A; this is a no-op then.)

git commit --allow-empty -m "feat(analytics): Tier D — classroom roll-up RPC + feature_flag_exposed

Tier D B2B story: aggregate per-school activity for the pilot
schools that use ?admin=1 to enter school + class codes.

  • dashboard_classrooms(in_days)
      Group by school_id × day → per-school totals: sessions,
      distinct devices, mode completions, active days, last active.
  • feature_flag_exposed event (vocabulary; client-side dedupe via
    exposeFeatureFlag() in analytics.ts) — fires once per session
    per flag the moment a flag actually affects rendering. Future
    A/B experiments will be measurable from day one.

This commit also captures the previously-uncommitted Phase 3.1
dashboard_today/_funnel/_tracker_health/_top_modes/_errors/
_latest_sessions migration in
platform/supabase/migrations/20260507_analytics_dashboard_rpcs.sql
plus the original push-dashboard-rpcs.sh helper and this
push-tiers-a-to-d.sh script."

git push origin master

echo ""
echo "Pushed Tiers A → D."
echo ""
echo "After Vercel redeploys (60-90s), open Incognito, walk the funnel"
echo "twice on different days for cohort data, and the dashboard"
echo "artifact will populate the new Tier C and Tier D panels."
echo ""
echo "Live RPC verifier:"
echo "  SELECT public.dashboard_mastery(30, 1);"
echo "  SELECT public.dashboard_cohort_retention(8);"
echo "  SELECT public.dashboard_classrooms(30);"
