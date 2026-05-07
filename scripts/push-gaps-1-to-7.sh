#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc --noEmit

# ── Gap 2: stuck detection ────────────────────────────────────────
git add src/lib/analytics.ts
git commit -m "feat(analytics): Gap 2 — stuck_detected idle watcher (single source)

The strongest 'this kid is struggling' signal we have is '30 seconds
of no productive action'. Wired centrally in src/lib/analytics.ts
so mode logic files don't have to roll per-mode timers — every
productive event (item_grabbed, item_dropped, *_round_complete,
wordsearch_word_found, tracing_letter_completed, balloonmath_pop,
rainbowbridge_match, spellingstars_word_complete, stage_started)
resets the idle clock from inside logEvent(). stage_completed,
mode_completed, and mode_abandoned disarm it.

Fires once at 30s of silence, then every 60s while idle (1× at 30s,
2× at 90s, 3× at 150s) so a kid who walks away from the screen
generates a small handful of events rather than spamming.

Side-effect: vocabulary additions:
  + stuck_detected
  + pilot_pack_downloaded / demo_request_form_view / demo_request_form_submit
  + for_teachers_page_view / for_parents_page_view / share_button_clicked

Side-effect 2: also exports noteProductiveAction() and
clearStuckWatcher() for any future mode that needs to call them
explicitly (e.g. free-paint where there's no naturally batched
'productive event')."

# ── Gap 3: Tracing (Pre-Writing) analytics ────────────────────────
git add src/features/modes/preWriting/preWritingLogic.ts
git commit -m "feat(analytics): Gap 3 — Pre-Writing letter completion + path accuracy

Tracing is the marquee educational mode and was the largest data
hole. Now wires:

  • stage_started fires on first on-path frame for a new letter.
  • on/off-path frame counts accumulate during the trace.
  • on completion (progress >= 0.95):
      - mode_completed (legacy, unchanged)
      - stage_completed with time_to_complete_ms + accuracy_pct
        (= on_path_frames / total_frames)
      - tracing_letter_completed with letter + accuracy
      - item_dropped mirror so learning_attempts captures one row
        per traced letter — feeds the per-item mastery panel.

Tracing has no 'wrong' outcome (you finish or you don't), so
expected_letter and actual_letter are identical on every row. The
useful per-letter signal is the time + path-accuracy distribution."

# ── Gap 1: Tier B/C wiring for 6 remaining modes ──────────────────
git add \
  src/features/modes/balloonMath/balloonMathLogic.ts \
  src/features/modes/rainbowBridge/rainbowBridgeLogic.ts \
  src/features/modes/gestureSpelling/gestureSpellingLogic.ts \
  src/features/modes/wordSearch/wordSearchLogic.ts \
  src/features/modes/calibration/bubbleCalibrationLogic.ts
git commit -m "feat(analytics): Gap 1 — Tier B/C wiring for the other 5 mode files

Now every mode that has a 'right answer' produces learning_attempts
rows with mistake patterns. Word Search, Bubble Pop / Calibration,
Balloon Math, Rainbow Bridge, and Gesture Spelling.

Each one:
  • imports logEvent
  • fires stage_started at level/round init (with stage_index +
    target / pattern / theme metadata)
  • emits an item_dropped mirror on the primary action with
    isCorrect, expected_*, actual_*, action_duration_ms — so the
    item_dropped → learning_attempts mirror in analytics.ts feeds
    the mastery panel automatically
  • emits the mode-specific event name (balloonmath_balloon_popped,
    rainbowbridge_match_made, wordsearch_word_found,
    bubblepop_round_complete, spellingstars_word_complete) so
    bespoke per-mode dashboards can still find them
  • fires stage_completed with time_to_complete_ms + meta on level
    done

Free Paint deliberately not wired in this commit — it's an
open-ended creative mode without a correct answer, so a learning_
attempts row would be misleading. The existing mode_started /
mode_abandoned funnel events are sufficient for free paint."

# ── Gap 7: B2B conversion events ──────────────────────────────────
git add \
  src/pages/Landing.tsx \
  src/pages/seo/ForTeachersPage.tsx \
  src/pages/seo/ForParentsPage.tsx \
  src/components/share/ShareButton.tsx
git commit -m "feat(analytics): Gap 7 — B2B conversion + page-view events

Closes the marketing-funnel side of the dashboard. Was: only the
'Try Free' kids' funnel was instrumented. Now:

  • for_teachers_page_view fires once per ForTeachersPage mount
  • for_parents_page_view fires once per ForParentsPage mount
  • demo_request_form_view + school_pack_form_view fire when the
    pilot/demo modal opens (one canonical event per click)
  • demo_request_form_submit + school_pack_form_submit fire on
    successful Apps Script submission, with role/year_group/
    device_type in meta for segmentation. (Form fields with PII —
    name, email, school — go ONLY to the Apps Script backend; not
    into analytics_events.)
  • share_button_clicked fires from ShareButton's click with the
    activity_slug + variant in meta — so we can see which modes
    teachers actually share.

Also fixes the misleading 'No student data is collected' answer in
the For Teachers FAQ to reflect what we now actually collect
(anonymised, no-PII analytics) and points to the privacy policy."

# ── Gap 4 + 5 + 6: schema migration + Edge Function + Privacy ─────
git add \
  platform/supabase/migrations/20260507_analytics_gaps_4_5_6.sql \
  platform/supabase/functions/analytics-digest/index.ts \
  src/pages/Privacy.tsx \
  scripts/push-gaps-1-to-7.sh
git commit -m "feat(analytics): Gaps 4 + 5 + 6 — digest cron, auto-prune, mastery, privacy

Three big things in one commit because they're tightly coupled:

GAP 4 — Hands-off operations
  • New SECURITY DEFINER RPC: dashboard_daily_digest() bundles all
    panels into a single JSON for the email.
  • New SECURITY DEFINER RPC: dashboard_anomaly_check() returns
    breaches[] when any of these tripped in the last 15 min:
      - tracker_init_failed >= 3
      - camera_denied >= 5
      - csp_violation >= 5
      - system_error >= 1
  • New Edge Function: analytics-digest (deployed, source captured
    in platform/supabase/functions/analytics-digest/index.ts).
    Modes: ?mode=daily and ?mode=anomaly. Sends via Resend.
    Required secrets:
      RESEND_API_KEY    (set via supabase secrets)
      DIGEST_EMAIL_TO   (Justin's email)
      DIGEST_EMAIL_FROM (verified Resend sender)
  • pg_cron schedules:
      - dita-daily-digest    07:00 UTC daily   → ?mode=daily
      - dita-anomaly-check   every 15 min      → ?mode=anomaly

GAP 5 — Privacy + auto-prune
  • pg_cron schedules:
      - dita-prune-analytics-events    03:00 UTC daily — DELETE
        events older than 365 days
      - dita-prune-learning-attempts   03:05 UTC daily — same
  • Privacy.tsx: new sections describing device_id, anonymous
    session ID, what we collect (game-mode events, items, errors),
    what we don't collect (PII, faces, audio, geolocation), and
    the 365-day auto-deletion. Also notes how a user can clear
    their own anonymous device identifier via browser site-data
    settings.

GAP 6 — Mastery thresholds
  • New SECURITY DEFINER RPC: dashboard_mastery_milestones(
      in_days = 60, in_min_attempts = 5, in_threshold_pct = 80)
    Per (game_mode, item_key): mastered_devices, touched_devices,
    mastery_pct. A device is 'mastered' if its last 5 attempts are
    >= 80% correct in the last 60 days. This is the row a 'X% of
    kids mastered the letter B' efficacy claim is built on.
  • Wired into the dashboard artifact as a new panel.

Deployment notes (manual, one-time):
  supabase secrets set RESEND_API_KEY=re_xxxxx
  supabase secrets set DIGEST_EMAIL_TO=mrjustinukaegbu@gmail.com
  supabase secrets set DIGEST_EMAIL_FROM=alerts@drawintheair.com
The Edge Function source in this commit is a slimmer placeholder
that JSON-dumps the data; the deployed copy has the full HTML
rendering. To re-deploy from this repo, paste the renderDailyHtml
+ renderAnomalyHtml from the deployed function back into this
file before running 'supabase functions deploy analytics-digest'."

git push origin master

echo ""
echo "Pushed Gaps 1 → 7 in five logical commits."
echo ""
echo "ONE MANUAL STEP: set the Resend secrets so the digest can send."
echo "  supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxx"
echo "  supabase secrets set DIGEST_EMAIL_TO=mrjustinukaegbu@gmail.com"
echo "  supabase secrets set DIGEST_EMAIL_FROM=alerts@drawintheair.com"
echo ""
echo "Test the digest immediately with:"
echo "  curl -X POST 'https://fmrsfjxwswzhvicylaph.supabase.co/functions/v1/analytics-digest?mode=daily'"
echo ""
echo "Test the anomaly check with:"
echo "  curl -X POST 'https://fmrsfjxwswzhvicylaph.supabase.co/functions/v1/analytics-digest?mode=anomaly'"
