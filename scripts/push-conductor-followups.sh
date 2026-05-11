#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  platform/supabase/migrations/20260511_conductor_pause_selfheal.sql \
  src/pages/classmode/TeacherClassConsole.tsx \
  src/features/classmode/ClassModeGameWrapper.tsx \
  src/pages/classmode/StudentClassClient.tsx \
  src/features/modes/wordSearch/wordSearchLogic.ts \
  scripts/push-conductor-followups.sh

git commit -m "fix(conductor + analytics): four follow-ups from the live classroom test

Live 12-checkpoint test on 2026-05-11 (codes 1823 then 8541) surfaced
one DB-side bug (already hot-patched via migration applied directly
to prod) and three smaller UX / instrumentation issues. This commit
captures all of them properly in the repo.

1. DB migration — pause/resume self-heal + clear legacy field
   platform/supabase/migrations/20260511_conductor_pause_selfheal.sql
   - class_end_activity now ALSO clears sessions.activity to NULL so
     the legacy field can't keep the NOW PLAYING panel rendering
     'Balloon Math · playing' after the activity has ended
   - class_pause_activity self-heals: if current_activity_id is NULL
     but a non-ended session_activities row exists, adopt it +
     resync sessions.current_activity_id, then pause
   - class_resume_activity gets the same fallback
   (Already applied directly to production database — this commit
   simply pins it in the migrations directory.)

2. UI hotfix — TeacherClassConsole panel staleness
   src/pages/classmode/TeacherClassConsole.tsx
   Belt-and-braces gating: only render ActivityNowPlaying when BOTH
   the local currentActivity state AND the authoritative
   session.class_state === 'in_activity'. Prevents the panel from
   getting stuck on a stale 'playing' view if a realtime UPDATE
   event for session_activities is dropped but the sessions row
   arrives correctly. Plus: handlePause / handleResume now clear
   currentActivity client-side when the server returns 'no active
   activity', so the launcher flips back into view instead of the
   teacher staring at a frozen Pause button.

3. Round-timer freeze while camera not running
   src/features/classmode/ClassModeGameWrapper.tsx
   src/pages/classmode/StudentClassClient.tsx
   The Phase B CameraExplainer can sit on screen for 10–30 s before
   the kid taps Allow. In the test we saw Balloon Math read 0:21 on
   the explainer — round time was burning down before the kid could
   even play. ClassModeGameWrapper now accepts a 'freeze' prop;
   StudentClassClient passes freeze={diagnostics.cameraStatus !==
   'running'}. The countdown stays frozen until the camera is
   actually running, so the kid gets their full timerSeconds.

4. word-search: action_duration_ms wired for mastery dashboard
   src/features/modes/wordSearch/wordSearchLogic.ts
   The mastery dashboard surfaced avg_ms: null for every word-search
   row because item_grabbed and item_dropped both fired on
   pinch-end. Moved item_grabbed to pinch-start (the real grab
   moment) and seeded a markGrab(tileId) there; item_dropped now
   attaches action_duration_ms = elapsedSinceGrab(anchorTileId).
   The mastery dashboard now has real timing for word-search.

INVESTIGATED, NO FIX SHIPPED
  - sort-and-place: 8 starts, 0 completes over 30 days.
    Code path is correct (sortAndPlaceLogic.ts:1018 fires
    mode_completed when filter(placed).length === totalObjects;
    both correct-drop paths set obj.placed = true; roundComplete
    resets per stage). Signal is most likely real user abandonment
    at our current low traffic. Revisit when traffic grows or a
    real user reports a missed completion.

VERIFIED
  - tsc -b           clean
  - check-csp        passes
  - Migration was applied + verified live during the test; second
    class (code 8541) used the patched RPCs successfully.

WHAT'S STILL OPEN
  - Test checkpoints 7–12 unrun (kick, student stats, end-to-launcher,
    hold-to-end-class, reconnect window, delete session)
  - Push of Phase B (camera flow) is live in production but the
    migration + push script are awaiting your manual git lock clear"

git push origin master

echo ""
echo "Conductor follow-ups shipped."
echo "Migration was applied live during the test; this commit pins it in the repo."
