# Classroom P0 sync fix — 2026-07-09

Branch: `fix/classmode-p0-sync` (based on `fix/classroom-realtime-sync` @ 9c74b29, which sits on the prod-deployed base 4d9eef7).

## Root cause (verified in production)

Supabase Realtime evaluates RLS SELECT policies per subscriber, executing
as the subscriber's role. The SELECT policies on `sessions`,
`session_students` and `round_scores` call `public.is_admin_user(uuid)`;
migration 0010 revoked anon EXECUTE, so `realtime.apply_rls →
walrus_rls_stmt → list_changes` raised 42501 (`permission denied for
function is_admin_user` — visible in the Realtime logs) and the whole
postgres_changes batch was dropped for every subscriber, teacher included.
No join/pause/resume/end event reached any client; only full page refresh
(hydration) synced state.

## Deployment order (STRICT)

1. **DB first**: apply `supabase/migrations/0025_classroom_realtime_restore_is_admin_user_execute.sql`
   (idempotent; two GRANTs). Verify with
   `supabase/migrations/tests/classroom_realtime_grants_test.sql`.
2. Watch Realtime logs ~5 min: `permission denied for function is_admin_user`
   must stop appearing.
3. Two-browser smoke test against the CURRENT deployed frontend
   (pause/resume should now propagate < 1 s).
4. Apply `0026_class_student_heartbeat.sql` (new RPC; old clients unaffected).
5. Deploy this branch's frontend.
6. Re-run the full manual matrix below.

Do NOT deploy the frontend before 0026: the client heartbeats
`class_student_heartbeat` every 5 s; without the RPC each call 404s
(harmless — `callRpc` swallows it — but noisy and presence stays stale).

## Manual two-browser test matrix

Teacher: normal Chrome profile, signed in, `/class`.
Student: second profile or incognito (separate storage), `/join`.

| # | Step | Expected |
|---|------|----------|
| 1 | Student enters wrong code (e.g. 9999) | friendly error; typing again clears the error; boxes accept overtype |
| 2 | Student pastes the real code, Enter | advances to name entry |
| 3 | Student joins with name | appears on teacher roster < 1 s without refresh; pill 🟢 engaged |
| 4 | Teacher starts Balloon Math | student enters game < 1 s; timer top-right, name pip top-LEFT, no overlap; NO "← Menu" button |
| 5 | Teacher starts Tracing | student gets the PLAYFUL tracing UI (same as /play), not the legacy one |
| 6 | Teacher Pause | student pause overlay < 1 s; game stays mounted (no camera re-prompt); timer frozen |
| 7 | Teacher Resume | student resumes < 1 s; timer continues from where it stopped (NOT reset to 1:30) |
| 8 | DevTools → Network → WS → close the student's websocket, then Pause | student pauses within ≤ 5 s (reconciliation poll) |
| 9 | Same with Resume | resumes within ≤ 5 s |
| 10 | Teacher End activity BEFORE timer expiry | student → "Great job / picking next activity"; `round_scores` row EXISTS for that session_activity_id (check Supabase) with round = activity ordinal |
| 11 | Start a SECOND activity, end it | a SECOND round_scores row exists (previously lost to UNIQUE collision) |
| 12 | Teacher refresh mid-activity | console rehydrates roster + current activity + paused/playing state |
| 13 | Student refresh while paused | auto-rejoins (no code re-entry) and shows Paused |
| 14 | Close the student tab | teacher pill flips ⚫ offline within ~20 s |
| 15 | Teacher Kick student | student sees goodbye screen < 5 s; roster shows them gone |
| 16 | Teacher End class | student sees "Great class!" < 5 s; teacher sees summary (not bounced to Start screen) |
| 17 | Camera explainer on /join | copy reads "Allow the camera so you can wave, pinch and play." |
| 18 | Chromebook-ish viewport (1366×768) + odd zoom | no black bands right/bottom of join/student screens |

## Remaining risks / follow-ups

- **Policy split (follow-up PR)**: restructure SELECT policies so the anon
  path never references admin helpers; then the grant becomes
  defence-in-depth rather than load-bearing.
- **Presence clock skew**: engagement staleness compares DB `updated_at`
  with the teacher device clock. A teacher machine > 15 s off NTP will
  mis-bucket; acceptable for classroom use, flag if reported.
- **Paused game keeps camera live** (deliberate: instant resume, no
  re-prompt). Frame logic is a no-op while paused, so nothing scores.
- **round=ordinal** relies on `session_activities.ordinal` being unique
  per session (it is, by construction in class_start_activity).
- Old deployed clients continue writing round=1 scores until the frontend
  ships — the DB unique constraint keeps that consistent with today.
