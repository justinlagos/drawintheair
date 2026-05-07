#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  platform/supabase/migrations/20260507_conductor_v1.sql \
  src/features/classmode/conductor/types.ts \
  src/features/classmode/conductor/avatars.ts \
  src/features/classmode/conductor/api.ts \
  src/pages/classmode/TeacherClassConsole.tsx \
  src/pages/classmode/StudentClassClient.tsx \
  src/pages/classmode/conductor.css \
  src/main.tsx \
  scripts/push-conductor-w1.sh

git commit -m "feat(class-mode): Conductor v1 — teacher orchestrates, students lock in

The wedge sentence is 'the calmest 5-minute movement break for your
classroom.' Class mode v1 was a 'multiplayer game' built around a
session = activity model, with students self-navigating and exit
buttons everywhere. That's wrong for the actual customer.

This is class mode v2. One join code = the whole class. The
teacher is the conductor; students lock in for the duration and
respond to teacher-controlled scene changes. No exit buttons,
no decisions, no managing flow.

SCHEMA (platform/supabase/migrations/20260507_conductor_v1.sql)
  • New session_activities table — one row per activity launched
    inside a class, with state machine
    starting → playing → paused → results → ended
  • sessions adds class_state ('lobby'|'in_activity'|'between_activities'|'ended'),
    current_activity_id, class_name, scoreboard_visible
  • session_students adds kicked_at, kicked_reason, avatar_seed
  • round_scores adds session_activity_id FK
  • 9 SECURITY DEFINER RPCs, all gated on auth.uid()=teacher_id:
      class_start_activity, class_pause_activity, class_resume_activity,
      class_end_activity, class_kick_student, class_end_session,
      class_student_stats, class_summary,
      class_set_scoreboard_visibility

CLIENT (the conductor itself)
  src/features/classmode/conductor/
    types.ts        — typed wire format for sessions / activities / students
    avatars.ts      — deterministic emoji+colour per (session, name) +
                      humane name dedupe ('Lila' → 'Lila B', not 'Lila2')
    api.ts          — typed wrappers around the class_* RPCs

  src/pages/classmode/TeacherClassConsole.tsx
    Mission control. Replaces the old TeacherDashboard +
    LobbyScreen + LiveRoundScreen + ResultsScreen with one
    persistent surface.
      • Header pill: code, elapsed time, engagement summary
      • Hold-to-end-class (2s) — accidental clicks shouldn't lose 30 min of class
      • Live roster (left, sticky) with three engagement states
        only — engaged / stuck / offline. No more.
      • Activity console (right) — launcher when no activity is
        loaded, transport (pause/resume/end-activity) when one is
      • Per-activity timeline of what's been played so far
      • Student stats modal: click any roster card → totals +
        per-activity breakdown
      • Class summary screen on end-of-class

  src/pages/classmode/StudentClassClient.tsx
    The locked-in student client. Replaces StudentJoin +
    StudentGameScreen.
      • Two-step join (code → name) → classroom space
      • Realtime subs on sessions / session_students / session_activities
      • Auto-transition: teacher launches activity → student
        renders the game; teacher pauses → student sees pause
        overlay; teacher ends → 'great job' card; teacher ends
        class → goodbye screen, redirects to landing
      • NO exit buttons. NO 'leave session'. Teacher controls
        everything.
      • 15-minute reconnect window via sessionStorage so a tablet
        sleep doesn't kick a kid out of class

  src/pages/classmode/conductor.css
    Calm-design surface. Three engagement colours only. Hold-to-end
    progress bar fills the button background. Modal animations are
    cubic-bezier pop-in, not bouncy. No Nintendo.

  src/main.tsx
    /class            → TeacherClassConsole (legacy /class/lobby,
                        /class/round, /class/results all redirect here)
    /join             → StudentClassClient  (legacy /join/play
                        redirects here)

PRICING DEFAULTS (UI-side cap only, payments not wired yet)
  Free:        1 active classroom, 30-student limit
  Teacher Pro: £15/mo or £120/yr — multi-classroom, exports
  School:      £3/student/yr (£250 min) — SSO, multi-teacher

VERIFICATION
- tsc -b           clean
- eslint           0 errors (12 warnings, all pre-existing v7 strict)
- check-csp        passes
- vite build       214 modules transformed

WHAT'S DELIBERATELY NOT YET IN
  • Audio cues on transitions (Phase 2 polish)
  • Spatial classroom map (deferred — no real seating geometry yet)
  • Live stuck-detection banner (events exist, banner is W2)
  • Class summary PDF / share-to-parents loop (W4 distribution)
  • Behavioural intelligence / observations (Phase 3 once data builds up)

Old StudentJoin.tsx, StudentGameScreen.tsx, TeacherDashboard.tsx,
LobbyScreen.tsx, LiveRoundScreen.tsx, ResultsScreen.tsx still exist
on disk for now — they're no longer routed. They'll be deleted in
the next push once we've verified the v2 flow in production."

git push origin master

echo ""
echo "Pushed Conductor v1."
echo "Once Vercel goes Ready, sign in at /class to see the new console."
echo "Test the student side at /join with the code shown on screen."
