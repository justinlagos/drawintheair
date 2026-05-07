#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
find .git/refs -name "*.lock" -delete 2>/dev/null || true

node scripts/check-csp.mjs
npx tsc -b

git add \
  platform/supabase/migrations/20260507_conductor_v1_hotfix.sql \
  src/features/classmode/conductor/api.ts \
  src/pages/classmode/TeacherClassConsole.tsx \
  src/pages/classmode/conductor.css \
  scripts/push-conductor-hotfix.sh

git commit -m "fix(class-mode): conductor hotfix — kick + start + delete-session

Three production bugs from the first real teacher session:

1. KICK FAILED with HTTP 400: 'column \"is_active\" is a generated
   column. Column \"is_active\" can only be updated to DEFAULT.'
   Root cause: session_students.is_active is a GENERATED STORED
   column (= is_connected). My class_kick_student RPC tried to set
   is_active=false explicitly, which Postgres correctly rejects.
   Fix: only set is_connected=false + kicked_at; let the generated
   column compute itself.

2. START CLASS FAILED with 'null value in column \"activity\" of
   relation \"sessions\" violates not-null constraint.'
   Root cause: sessions.activity was NOT NULL from the v1 schema
   when 'session = activity'. The new model is 'session = class,
   activities are launched inside,' so the session has no activity
   at create time. Fix: ALTER COLUMN activity DROP NOT NULL.

3. DASHBOARD CLUTTER: 7 stale lobby sessions saturating the
   free-tier cap, no way to clear them. Fix:
     • New class_delete_session(session_id) RPC — hard-delete a
       teacher's own session (cascades to activities/students/scores)
     • New class_end_stale_sessions() RPC — bulk-close all of the
       caller's lobby + between sessions in one call
     • UI: per-row 🗑 delete button on every recent class
     • UI: 'End all stale' shortcut when there are 2+ stale rows

VERIFICATION
- tsc -b           clean
- check-csp        passes
- live db          confirmed: hotfix migration applied; kick now
                   succeeds; new session insert succeeds; delete +
                   end-stale RPCs return clean JSON

POST-DEPLOY
- Existing stale sessions were swept to 'ended' as part of this
  migration so the dashboard list goes clean on next reload.
- Try a real class again. Kicking a student should finally work."

git push origin master

echo ""
echo "Pushed conductor hotfix."
echo "Reload /class once Vercel goes Ready — kick + start + delete all work."
