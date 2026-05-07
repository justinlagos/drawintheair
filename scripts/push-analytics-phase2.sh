#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc --noEmit

git add -A
git commit -m "feat(analytics): Phase 2 — wire activation funnel events at call sites

Per docs/ANALYTICS_PLAN.md. Phase 1 declared the EventName vocabulary
and stood up the Supabase pipe. Phase 2 actually fires the funnel
events at the points in the code where they happen.

Every event below now lands in analytics_events with proper meta
context, so the upcoming /admin/insights dashboard can show real
drop-off curves without anyone touching the call-sites again.

CALL SITES INSTRUMENTED

src/components/TryFreeModal.tsx
  • try_free_clicked       fires once each time the modal opens
                           (single canonical event regardless of which
                            of the seven landing CTAs was clicked).
  • age_band_selected      fires from handleStart() before startSession()
                           with meta.{age_band, has_school_code}.

src/camera/useCameraController.ts
  • camera_requested       fires once per startCamera() call, before
                           the first getUserMedia(). Profile fallbacks
                           are an internal retry — they don't double-count.
  • camera_granted         fires after the stream is wired and metadata
                           loaded. value_number = ms from request → grant.
                           meta = { profile_id, width, height, frame_rate }.
  • camera_denied          fires in every error branch with the matching
                           error code: PERMISSION_DENIED, NO_DEVICE,
                           DEVICE_BUSY, UNKNOWN, NOT_SUPPORTED. The
                           all-profiles-exhausted branch also emits
                           profiles_tried so we can see how many
                           constraint sets we churned through.

src/core/handTracker.ts
  • tracker_init_started   fires at top of initialize(), captures startTime.
  • tracker_init_succeeded fires on both GPU and CPU-fallback paths.
                           value_number = init_duration_ms.
                           meta.{delegate, num_hands, tried_delegates,
                                 fell_back_from_gpu?}.
  • tracker_init_failed    fires from both the WASM-load catch and the
                           final create-from-options catch.
                           meta.{code, message, tried_delegates, stage}
                           where stage in {wasm_load, create_from_options}.

src/features/onboarding/WaveToWake.tsx
  • wave_screen_view       fires once on mount (replaces the legacy
                           gtag-only demo_wave_screen_view shim).
  • wave_first_hand_seen   fires once per mount on first MediaPipe
                           landmark. value_number = ms from screen-view
                           to first detection. Guarded by hasLoggedFirstHand
                           ref so it does not fire every frame.
  • wave_completed         fires when waveCount crosses threshold.
                           value_number = time_to_wave_ms,
                           meta = { wave_count, threshold }.
                           Replaces the legacy demo_wave_success +
                           demo_mode_select_view window.analytics shims.

VERIFICATION
- tsc --noEmit  clean
- check-csp     all 9 origins present
- no new source files; all edits to existing call sites

POST-DEPLOY
After Vercel rebuilds, walk through:
  1. Open /
  2. Click any Try Free CTA
  3. Pick an age band -> Start
  4. Grant camera
  5. Wait for tracker init
  6. Wave 4 times
And the analytics_events table should populate in order:
  try_free_clicked, age_band_selected, session_started,
  camera_requested, camera_granted, tracker_init_started,
  tracker_init_succeeded, wave_screen_view, wave_first_hand_seen,
  wave_completed, then menu_opened, mode_selected, mode_started,
  item_grabbed/dropped, mode_completed, session_heartbeat, session_ended."

git push origin master

echo ""
echo "✅ Phase 2 pushed."
echo ""
echo "Walk the funnel on drawintheair.com/play once Vercel finishes,"
echo "then run in Supabase SQL editor:"
echo ""
echo "  SELECT event_name, occurred_at, meta"
echo "    FROM public.analytics_events"
echo "    ORDER BY occurred_at DESC LIMIT 40;"
echo ""
echo "Expect ~13 events from one full session."
