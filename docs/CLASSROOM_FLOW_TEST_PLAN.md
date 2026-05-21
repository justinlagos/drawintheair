# Classroom flow — end-to-end test plan

A structured 30-minute test of the conductor (teacher console + student client) against real-world classroom flow. Two roles, twelve checkpoints. Goal: surface any UX or logic regressions before a real teacher hits them.

---

## Roles

**Teacher (Justin):** Drives `/class` from a laptop. Has Google sign-in. Acts the way a real EYFS/Y1 teacher would — fast clicks, expects no surprises, low tolerance for confusion.

**Student (Claude, via Chrome MCP):** Connects to `/join` on a second browser. Acts like a 6-year-old: enters the join code, picks a name, follows whatever the teacher pushes. Reports on what the student-side experience looks like, screen by screen.

Both run concurrently. Justin says "I just clicked X" and Claude reports "I see Y on my screen", or vice versa. If the two ever desync, that's a bug.

---

## Pre-flight

Before starting, both roles confirm:

1. The latest Vercel deploy is green (commit `4ceabc4` or later, dashboard quality fixes; ideally also commit with the camera flow once Phase B is pushed).
2. Both browsers can hit `drawintheair.com` and load the landing page.
3. Justin's Google account (`mrjustinukaegbu@gmail.com`) is the one used to sign in to `/class`.
4. No stale `class_state` for that account on the server (we'll verify in checkpoint 1).
5. Claude has a clean Chrome session (no leftover join state in localStorage).

Optional: open the `/admin/insights` dashboard in a third tab so we can watch new events land in real-time.

---

## The 12 checkpoints

### 1. Clean teacher sign-in → console loads

**Teacher:** open `drawintheair.com/class`, click "Sign in with Google", confirm console renders.

**Claude:** verify on insights dashboard that `for_teachers_page_view` fires.

**Expected:** TeacherClassConsole renders with no roster, no active session, list of recent classes (possibly empty).

**Failure modes to watch for:** bounce to `/class` then to landing (auth handshake regression); console rendered but no recent-classes panel; old TeacherDashboard appearing instead of new console.

---

### 2. Start a new class → code appears

**Teacher:** click "Start a class".

**Expected:** 4-digit code appears top-left, large enough to project; activity tile grid appears centre/right; roster panel left side shows "Waiting for students…"

**Claude:** record the code.

**Failure modes:** the legacy "null value in column activity" error (was hotfixed but worth re-confirming); code visible but no activity tiles; 3-digit code (regression to old generator).

---

### 3. Student join → roster updates instantly

**Claude:** open `drawintheair.com/join`, enter the code from step 2, pick a name "Test Lila", submit.

**Teacher:** confirm "Test Lila" appears in roster within 2 seconds, with an avatar + colour.

**Expected:** student sees a "Waiting for your teacher to start…" screen with their avatar visible; teacher sees the roster card with a connection indicator.

**Failure modes:** student stuck on "Joining…" forever (realtime subscription regression); roster shows wrong name; avatar mismatch between student-side and teacher-side (deterministic hash bug); duplicate-name handling missing (next checkpoint covers this).

---

### 4. Duplicate name → "Lila B" dedup

**Claude:** open a SECOND chrome tab, hit `/join`, enter the same code, pick the same name "Test Lila".

**Teacher:** confirm second student appears as "Test Lila B" (not "Test Lila 2").

**Expected:** dedup happens on the server side via the conductor's `dedupeName` util; roster shows two entries.

**Failure modes:** "Test Lila 2" (old numeric suffix); duplicate rejected entirely with an error (regression); both shown as "Test Lila" (no dedup).

---

### 5. Start an activity → all students load it together

**Teacher:** click any tile (start with Balloon Math — most visual feedback).

**Expected:** both students' screens transition from "Waiting…" to the activity within 2 seconds, simultaneously. Teacher's console flips from activity-grid to a transport bar (pause/end/etc.).

**Claude:** confirm both student tabs entered the activity in sync.

**Failure modes:** one student gets the activity, one doesn't (subscription race); transport bar doesn't appear; activity-grid stays visible behind the transport (z-index bug).

---

### 6. Pause / resume → both students follow

**Teacher:** click Pause.

**Expected:** both student screens freeze with a "Paused" overlay; teacher transport shows Resume button.

**Teacher:** click Resume after ~5 seconds.

**Expected:** both students resume mid-activity, no state loss.

**Failure modes:** only one student pauses; pause works but resume doesn't; activity restarts from beginning on resume (state-loss bug).

---

### 7. Kick one student → kind goodbye

**Teacher:** click the × on Test Lila B's roster card.

**Expected:** that student tab transitions to a "Thanks for playing!" or similar kind-message screen (NOT a hard logout); roster removes their card; first Test Lila is unaffected.

**Claude:** confirm the kicked tab shows the goodbye screen, not the activity.

**Failure modes:** the original "is_active is a generated column" RLS error (was hotfixed; worth re-confirming); both students get kicked; kicked student can immediately rejoin without re-entering code (intended? confirm policy).

---

### 8. Student stats deep-dive

**Teacher:** click the roster card for the remaining Test Lila.

**Expected:** StudentStatsModal opens, shows session totals (time in session, activities started, items grabbed, accuracy if available). Closes on Escape or backdrop click.

**Failure modes:** modal doesn't open; opens with all-zero stats (analytics not flowing); opens but doesn't close.

---

### 9. End activity → back to launcher

**Teacher:** click End Activity in the transport.

**Expected:** student goes back to a "Wait for the next activity" screen; teacher console returns to the activity-tile grid so they can pick another.

**Claude:** confirm the student sees the between-activities screen, not a stuck state.

**Failure modes:** student stays in the finished activity; teacher's tile grid doesn't return; activity reported as "completed" multiple times in analytics (this was the source of the dashboard 145% bug — already fixed in Phase A, but worth confirming end-of-activity fires exactly once per session-activity now).

---

### 10. Hold-to-end-class → safety check

**Teacher:** click End Class. Don't hold — release after 0.5s.

**Expected:** nothing happens. The button only fires on a sustained 2-second hold.

**Teacher:** click again, hold for full 2 seconds.

**Expected:** transition to the post-class summary screen; both student tabs transition to a "Class is over!" screen; roster persists in the summary for review.

**Failure modes:** accidental end on a single click; hold-progress indicator missing; summary screen doesn't show roster totals.

---

### 11. Reconnect window — student refresh

**Claude:** during an active activity (so go back to step 5 and restart if needed), hit F5 to refresh the student tab.

**Expected:** student auto-rejoins the same class with the same name within 15 minutes (via the `cd_reconnect_v1` sessionStorage key); their progress in the activity persists.

**Failure modes:** student kicked to the join page; rejoin works but with a different avatar (deterministic hash should keep it stable); progress lost.

---

### 12. Delete a previous session from recent-classes

**Teacher:** on the post-class summary, return to the main console. Find the just-ended class in "Recent classes". Click the delete button.

**Expected:** the row disappears, no longer counts against the "you already have N classes in progress" limit.

**Teacher:** if Recent classes shows >5 entries, also test the "End stale sessions" bulk button.

**Failure modes:** delete fails silently; delete shows confirmation but row remains; bulk-end doesn't clear in-progress states older than 24h.

---

## What "pass" looks like

All 12 checkpoints with no surprises. A failure on 1–2 is recoverable in a short follow-up commit. A failure on 3+ means the conductor isn't ready for a real classroom yet.

If 3 fails on roster updates: the realtime subscription is broken (debug via `console.log` on `subscribeToTable` events).

If 5 fails on activity sync: a race between `class_start_activity` RPC and the student client's subscription.

If 7 fails again on kick: another generated-column bug, or RLS regression.

If 9 fires `mode_completed` multiple times per activity: the per-stage event firing in `WordSearchMode` / similar may have shifted again — dashboard would re-inflate.

Document any failures right here in this file under a "FAILURES" section so they get fixed in the next sprint.

---

## Tooling notes for Claude

- Use `mcp__Claude_in_Chrome__navigate` to load `/join`.
- Use `mcp__Claude_in_Chrome__form_input` to type the code and the name.
- Use `mcp__Claude_in_Chrome__find` + `read_page` to confirm UI state at each checkpoint.
- For dual-student tests (checkpoint 4), use `tabs_create_mcp` to open a second tab.
- For reconnect tests (checkpoint 11), use `javascript_tool` to fire `window.location.reload()`.

Screenshots not required for every checkpoint — only on failure, to share back with engineering.

---

## When to run

Once Phase B has shipped (commit with the camera flow integration) so we're testing the latest. Justin's signal to start: he replies "ready, what's my first move?" and Claude opens the join page in Chrome MCP.

Estimated time: 30 minutes for the full 12 checkpoints if everything works; 60+ minutes if we hit failures and stop to debug.
