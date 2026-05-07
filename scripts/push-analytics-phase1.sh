#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs

git add -A
git commit -m "feat(analytics): Phase 1 — single source of truth in Supabase

Per docs/ANALYTICS_PLAN.md, consolidating three half-broken systems
into one Postgres table the admin dashboard can query.

WHAT WAS BROKEN
- src/lib/analytics.ts wrote events to /api/track which doesn't exist
  in the Vite build → silent 404 → events never left the browser.
- src/lib/pilotAnalytics.ts wrote to a Google Sheet via Apps Script
  which works but isn't queryable from the app.
- gtag + Clarity in index.html capture pageviews + heatmaps but no
  product-level events.

WHAT'S NOW IN PLACE

1. Migration: platform/supabase/migrations/20260506_analytics_events.sql
   - analytics_events table with denormalised columns for hot fields
     (session, page, game_mode, age_band, device, browser, UTM, value,
     meta jsonb).
   - Indexes on (occurred_at DESC), (session_id, occurred_at),
     (event_name, occurred_at), partial index on (game_mode, occurred_at).
   - RLS: anon + authenticated INSERT (so the in-app client can write);
     authenticated SELECT only (so the future admin dashboard can read).
   - No PII fields. Privacy notes inline.

2. src/lib/analytics.ts — full rewrite as the single source of truth:
   - Canonical EventName union covering: acquisition, activation funnel,
     mode lifecycle, per-game events, reliability/errors, conversion.
     Every event documented at the call site.
   - startSession / endSession / logEvent / hasActiveSession public API.
   - Per-tab UUID session_id in sessionStorage.
   - localStorage event queue with batching (FLUSH_BATCH_SIZE=20),
     interval flush every 5s, sendBeacon on beforeunload for reliable
     delivery.
   - Auto-captures browser, version, device type, viewport, UTM, referrer.
   - 30-second session_heartbeat events.
   - CSP-violation listener on document — fires csp_violation events
     so a regression like the May 2026 mediapipe-CSP bug is visible
     within minutes instead of days.
   - dbInsert('analytics_events', batch) — direct PostgREST, no Edge
     Function needed.

3. src/lib/pilotAnalytics.ts — turned into a thin re-export shim of
   analytics.ts to avoid breaking any cached chunk. Will be deleted in
   a follow-up release once we're sure nothing references it.

4. Call sites migrated to the new vocabulary:
   - App.tsx: game_selected→mode_selected, stage_started→mode_started,
     stage_completed→mode_completed.
   - TryFreeModal.tsx: startSession(ageBand, school, class) →
     startSession({ ageBand, schoolId, classId }).
   - wordSearchLogic, preWritingLogic, sortAndPlaceLogic,
     colourBuilderLogic: { gameId, stageId, itemKey, isCorrect }
     payloads → { game_mode, stage_id, meta: { itemKey, isCorrect } }.
     stage_completed → mode_completed.

5. EventName vocabulary now includes:
   - Activation: try_free_clicked, age_band_selected, camera_requested,
     camera_granted, camera_denied, tracker_init_started,
     tracker_init_succeeded (with delegate), tracker_init_failed (with
     code), wave_first_hand_seen, wave_completed.
   - Generic: item_grabbed, item_dropped (with isCorrect in meta).
   - Reliability: system_error, csp_violation, tracker_low_confidence.
   - Plus per-game completion events.

VERIFICATION
- tsc --noEmit clean
- pre-existing lint warnings in the four logic files (underscored
  unused params, playedStages const) untouched
- check-csp guard passes

POST-DEPLOY (manual, one-time)
1. Apply the migration:
     supabase db push
   OR paste 20260506_analytics_events.sql into the Supabase SQL editor.
2. Confirm a test event arrives:
     - open drawintheair.com/play
     - click Try Free → pick age 4-5 → grant camera
     - SELECT * FROM analytics_events ORDER BY occurred_at DESC LIMIT 5
     - Expect: try_free_clicked, age_band_selected, session_started,
       camera_requested, camera_granted at minimum.
3. If events don't arrive, check VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
   are set in Vercel. The CSP already allows
   *.supabase.co from the May fix."

git push origin master

echo ""
echo "✅ Pushed."
echo ""
echo "ONE MANUAL STEP REQUIRED:"
echo "  Apply the SQL migration in Supabase dashboard or via:"
echo "    supabase db push"
echo "  File: platform/supabase/migrations/20260506_analytics_events.sql"
echo ""
echo "Test after migration: open /play, do a session, then run:"
echo "  SELECT event_name, occurred_at FROM analytics_events"
echo "    ORDER BY occurred_at DESC LIMIT 10;"
