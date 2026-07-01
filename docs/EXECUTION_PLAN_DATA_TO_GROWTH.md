# Draw in the Air — Execution Plan: From Data to Durable Growth

**Owner:** Justin
**Date:** 2026-06-25
**Window covered:** Next 3 sprints (≈6 weeks)
**Status of this doc:** Living plan. Update acceptance boxes as work lands.

---

## Bottom line

The data does not show a technology problem. Once a child reaches the tracker, the
system works (97% camera grant, 100% tracker init, 332 ms median GPU warm-up, 0 init
failures). The real problems are **measurement trustworthiness**, **the journey into and
through gameplay**, and **the absence of classroom evidence** — exactly when the school
pilot is the priority.

The good news from the code audit: most of what looks "missing" in the dashboard is
**already built and just unwired or uninstrumented**. This is a wiring-and-instrumentation
sprint, not a rebuild. That makes the highest-value work cheap and fast.

**Do not spend the next sprint adding dashboard tabs.** Spend it making the existing
numbers trustworthy, lighting up classroom context that already exists, turning on the
primary-player lock with metrics, and fixing Tracing.

---

## What the codebase audit changes about the diagnosis

| Analysis assumption | Repo reality | Implication |
|---|---|---|
| Classroom is invisible / un-instrumented | Conductor v1 is **live**: `sessions`, `session_activities`, `session_students`, `round_scores` + `class_*` RPCs (`platform/supabase/migrations/20260507_conductor_v1.sql`) | Classroom is *built*. Gap is tagging events with classroom context + a class-session id, not building classroom. |
| No environment / context separation | `context` ('home'\|'classroom'\|'unknown') + `analytics.setSessionContext()` already exist in `src/lib/analytics.ts` | The `setSessionContext('classroom')` call isn't fired in the class flow. One wiring fix, not a schema change. |
| Duplicate events inflate activation | LIOS envelope (`event_uid`, `client_seq`, `client_ts`) + ignore-duplicates already deployed (`20260519_lios_event_envelope*.sql`) | Idempotency is solved at ingest. The 105.7% activation is a **metric-query denominator bug**, not an ingest bug. |
| Primary-player lock not built | `src/core/tracking/ActivePlayerLock.ts` fully built, pure state machine, unit-testable; flag `activePlayerLock` default **OFF** | Turn it on behind a flag and emit metrics. No new ML work for v1. |
| Adaptive needs building | `lios_recommend_next` RPC live; `src/lib/useAdaptiveEngine.ts` runs in **shadow** mode | Don't promote it yet. It's correctly parked until outcomes are trustworthy. |
| No attempt-level outcome record | Confirmed gap: events keyed by `session_id` + order + `device_id`; **no `attempt_id`** | This is the one genuinely new primitive needed. It unblocks honest funnels, completion, and learning evidence. |
| No internal-traffic filter | Confirmed gap: no `traffic_type` field; Clarity sample is 84% internal | Add `traffic_type` + exclude internal. Cheap, high-leverage. |

**Net:** four small primitives (`attempt_id`, `traffic_type`, classroom-context wiring,
lock metrics) unlock almost everything else.

---

## Sequencing logic (why this order)

Three principles drive the order:

1. **Truth before action.** Every downstream decision (Tracing redesign, pilot evidence,
   adaptive personalisation) depends on trustworthy outcomes. Fix identity and outcomes
   first or you optimise against noise.
2. **Cheapest unblockers first.** `attempt_id`, `traffic_type`, and the
   `setSessionContext('classroom')` wiring are each small but unblock large surfaces.
3. **Pilot risk is time-boxed.** The school pilot can't wait six weeks for evidence, so
   classroom instrumentation runs **in parallel** with the analytics foundation, not after
   it — they share the same primitives.

```
SPRINT 1 (truth)            SPRINT 2 (experience)        SPRINT 3 (evidence)
─────────────────           ──────────────────────       ──────────────────
A. Analytics foundation ──┬─> C. Tracing redesign ─────> D. Learning-evidence loop
   (attempt_id,           │   E. First-session 60s play
    traffic_type,         │      (no-account)
    outcomes,             │
    denominators)         │
B. Classroom + lock ──────┴─> B2. Pilot dry-run ───────> Pilot evidence pack
   instrumentation            (teacher+student dual
   (runs parallel to A)        browser test)
```

A and B both depend only on the shared primitives, so they run together in Sprint 1.
C, E depend on A's clean outcomes. D depends on A + the Tracing/mode changes shipping.

---

## Workstream A — Analytics foundation (P0, Sprint 1)

**Goal:** Every metric has a defined denominator, internal traffic is excluded, and every
activity attempt produces exactly one terminal outcome record. Kill the impossible numbers
(105.7% activation, 100% Tier A, 0 ms latency, 100%-abandonment-with-71%-completion).

### A1. Introduce `attempt_id` (the keystone)
- **File:** `src/lib/analytics.ts`. Add `analytics.startAttempt(mode)` → returns a UUID,
  stamps it on all subsequent `mode_started`/`stage_*`/`*_completed`/`mode_completed`/
  `mode_abandoned` events until `endAttempt(outcome)`.
- **Schema:** add nullable `attempt_id uuid` to `analytics_events` (additive, reversible).
- **Mirror:** stamp `attempt_id` into `learning_attempts` so learning facts join 1:1 to a
  journey.
- **Acceptance:** every `mode_started` has a matching terminal event with the same
  `attempt_id`; no attempt has two `mode_completed`.

### A2. Add `traffic_type` + `environment` and exclude internal traffic
- **Field:** `traffic_type` ∈ {`real`,`internal`,`qa`,`bot`,`demo`}; `environment` ∈
  {`production`,`staging`,`local`}. Set in `analytics.ts` init from hostname
  (localhost→local), an admin/staff allowlist (device id or auth role), and a `?qa=1` /
  campaign param.
- **Every insights query** filters `traffic_type='real' AND environment='production'` by
  default, with a toggle to include internal.
- **Acceptance:** Clarity/admin numbers recomputed on real-only; the 84%-internal
  contamination is gone from headline KPIs.

### A3. One terminal outcome per attempt
- **Enum:** `completed` | `completed_assisted` | `partial` | `abandoned` |
  `tracking_lost` | `teacher_ended` | `timed_out` | `tech_error`.
- Emit on every exit path (tab close → `session_heartbeat` gap + `timed_out`; teacher end →
  `teacher_ended`; etc.). Struggling children must stop disappearing from the denominator.
- **Acceptance:** `count(mode_started) == count(terminal outcomes)` within a session, ±a
  small open-attempt tail.

### A4. Fix the metric definitions (query layer, not ingest)
- **Activation** = `distinct eligible sessions with ≥1 qualifying first completion ÷
  distinct eligible sessions started`. Each session counts once. Result must be ≤100%.
- **Abandonment** relabel: "% of non-completers who exited without another recognised
  outcome" — and split it from `teacher_ended` / `mode_switched` so teacher control and
  exploration aren't miscoded as difficulty.
- **Latency:** the 0 ms P50/P95/P99 means `client_ts` and `occurred_at` are the same clock
  or insufficient precision. Compute latency = `occurred_at − client_ts` only where the two
  come from genuinely different clocks; otherwise show "not measured" rather than 0 ms.
- **Trust tiers:** investigate why 100% is Tier A. Either the thresholds in
  `20260519_lios_trust_v1.sql` are too permissive or B/C cases aren't reaching scoring.
  Surface Tier B/C deliberately on a held-out sample to prove the tiering works.
- **Acceptance:** no metric in the admin exceeds its logical bound; every card shows its
  denominator + eligible population.

### A5. Idle/session hygiene
- Idle timeout → `timed_out`; explicit `session_ended`; cap P90 mode duration reporting
  (the "hundreds of minutes" sessions are un-ended Free Paint tabs — exclude or cap).

**Workstream A acceptance gate (blocks C, D):**
- [ ] Activation ≤100% and reproducible
- [ ] Internal traffic excluded by default everywhere
- [ ] Every attempt has one terminal outcome
- [ ] Every admin card displays denominator
- [ ] Latency shows real value or "not measured"

---

## Workstream B — Classroom + primary-lock instrumentation (P0, Sprint 1, parallel to A)

**Goal:** Make the live classroom feature *measurable* and make the multi-hand problem
*visible*, before the next pilot. Almost all the feature exists; this is instrumentation.

### B1. Fire classroom context (one-line-class-of fixes)
- In the student class flow (`src/pages/classmode/StudentClassClient.tsx`) and teacher flow,
  call `analytics.setSessionContext('classroom')` on join/start, and stamp the
  `session_activities.id` (or `sessions.code` hashed) as `class_session_id` on events.
- **Acceptance:** the Insights "Home vs Classroom" panel shows non-zero classroom rows for a
  test class; events carry `context='classroom'` + a class id.

### B2. Classroom reliability events (teacher = source of truth)
Add typed events around the existing `class_*` RPCs so teacher→student authority is
measurable:
- `class_session_created`, `student_join_attempted`, `student_join_result(accepted|rejected,
  reason)`, `activity_assigned`, `command_sent(type)`, `command_acked`, `activity_visible`,
  `student_state_synced`, `teacher_paused`, `teacher_ended`, `student_session_ended`.
- Record **command-delivery latency** = `command_acked.ts − command_sent.ts` and
  state-convergence (did student reach same final state as teacher).
- **Acceptance:** for a teacher+student dual-browser run you can answer: did the child join,
  how long did join take, did each command land, did the student screen end when the teacher
  ended.

### B3. Turn on `activePlayerLock` behind flag + emit lock metrics
- Flip the flag for classroom context (or `?flags=activePlayerLock`). Add a metrics emitter
  consuming `ActivePlayerLockSnapshot`: `hands_visible`, `lock_state`, `lock_confidence`,
  `lock_switch_count`, `background_hand_rejected`, `tracking_lost_ms`, `cursor_jump_px`,
  `reacquire_success`.
- This is the only way to **quantify whether the lock fixes the classroom interference you
  observed live**. Without metrics it's a guess.
- **Acceptance:** a two-person-in-frame test shows background-hand rejections > 0 and
  lock-switch count bounded; before/after comparison possible.

### B4. Pilot dry-run (Sprint 2)
- Scripted teacher+student dual-context test (per project testing rules): new session,
  join, assign, pause, resume, end, refresh/reconnect, stale-session rejection. Confirm
  teacher and student reach the same final state.

**Workstream B acceptance gate (blocks pilot evidence pack):**
- [ ] Classroom events tagged with context + class id
- [ ] Join + command + sync + end fully instrumented with latency
- [ ] Lock on, metrics flowing, interference quantified
- [ ] Dual-browser reconnect test passes

---

## Workstream C — Tracing redesign (P1, Sprint 2)

**Why P1-now:** Tracing is the strongest **triangulated** finding — 40% completion, 33%
stuck, 73% abandon signal, *and* your live classroom observation that it felt slow and
jerky. It's central to the pre-writing proposition, so it gets P0-quality attention even at
P1 sequence (it depends on A's honest outcomes to measure the fix).

**Files:** `src/features/modes/tracing/tracingLogicV2.ts` (entry `tracingLogicV2()`,
`TracingState`), `tracingContent.ts`, `tracingProgress.ts`; smoothing via One Euro filter in
`InteractionState.ts`; flag `tracingPlayfulUiV1` (live). Reference
`TRACING_ARCHITECTURE_REPORT.md`.

**Hypotheses to test (instrument each with A3 outcomes + a `tracing_off_path`/`recovered`
ratio):**
1. **Path tolerance too tight** — current `tolerancePx ≈ 18–24`. Try a graduated corridor
   (wider at start, wider for younger ages) behind a flag.
2. **Smoothing vs lag trade-off** — One Euro β=1.0/mincutoff=1.0. Tune for stability without
   adding visible lag; **measure jitter and latency, don't judge by eye** (project rule).
3. **Forward-only progress is punishing** — allow brief backtrack credit / off-path recovery
   without resetting progress.
4. **First trace too long** — ship a shorter first trace (single stroke) as the onboarding
   trace; defer letters until after a success.
5. **Overlays block the path** — ensure HUD/instructions never cover the active corridor
   (children-first principle); auto-dismiss prompts.
6. **Pinch precision held too long** — relax the 200 ms grace / pinch-loss handling.
7. **Lock instability** — run Tracing with `activePlayerLock` on; compare cursor-jump px.

**Method:** flag-gated A/B (`tracingPlayfulUiV1` already gives you the rollback pattern).
Primary metric: independent completion rate at a fixed difficulty. Guardrail: on-path
accuracy and median time shouldn't degrade.

**Acceptance:** Tracing completion ↑ meaningfully and stuck-rate ↓ on real-only traffic,
with no latency/jitter regression measured numerically.

---

## Workstream E — First-session conversion (P1, Sprint 2, parallel to C)

**Why:** The biggest activation leak is *reaching* the camera (only 52.8% of sessions get
there) and the wave→mode-start→mode-complete drop. Acquisition is 51% Facebook in-app
browser — the worst environment for a camera/WebGL product.

### E1. 60-second no-account first play
- Path: landing → "Try a 60-second activity" → camera readiness check → **Balloon Math or
  Bubble Pop** (fast, high-completion, low-stuck) → celebration → *then* optional account.
- Don't route first-time visitors into account architecture before they feel the product.
  Desktop click map shows login (27 clicks) dominating the hero CTA (5) — collapse to one
  dominant first action.

### E2. In-app browser handoff (already have the event!)
- `inapp_browser_detected` + `inapp_open_external_clicked` events already exist in
  `analytics.ts`. Wire a visible "Open in Chrome/Safari for the best camera experience"
  banner that preserves path + class code + campaign params.
- **Acceptance:** measurable lift in camera-stage-reached for FB/IG-sourced sessions.

### E3. Landing performance for first impression
- LCP 3.6 s, INP 410 ms, CLS 0.12. Defer MediaPipe load until play intent; trim hero
  image/video weight; preload the `/play` route after CTA paint; fix layout shift.
- The 4 WebSocket "sent while connecting" errors: queue outbound messages until socket open,
  retry on reconnect (also helps classroom realtime).

**Acceptance:** camera-stage-reached ↑ from ~53%; FB/IG handoff conversion measurable; LCP <
2.5 s on mobile.

---

## Workstream D — Learning-evidence loop (P1→P2, Sprint 3)

**Goal:** Move from "child completed a game" to "child's skill changed," so claims climb the
ladder honestly. This is the long pole for school + investor credibility, but it *depends on
A* (honest outcomes + assistance recording) so it sequences third.

### D1. Record assistance separately from ability
- `assistance_level` ∈ {`none`,`audio_prompt`,`visual_prompt`,`directional_hint`,
  `path_highlight`,`teacher_prompt`,`physical_support`} on every scored attempt. A child
  scoring 90% with full guidance ≠ 90% independent.

### D2. Separate practice / independent / transfer states
- Guided practice (cues on) vs independent assessment (no hints, fixed attempts, unseen
  items) vs transfer (paper/physical). Insert an unassisted checkpoint every 3–4 sessions
  the child doesn't perceive as a test.

### D3. Stricter mastery rule
- Replace single-session "mastered" with: Acquired (≥70% across 3 independent attempts) →
  Practising (≥70% across 2 sessions) → Secure (≥80% across 3 sessions + 7-day delayed) →
  Mastered (≥85% independent + transfer + 14/30-day retention). Tune the friction/mastery
  migrations (`20260519_lios_mastery_episodes_v1.sql`, `*_friction_v1.sql`).

### D4. Rename the "boredom" detector
- 13/17 firings are `accuracy ≥0.95 ∧ n≥8` = **high success**, not boredom. Relabel
  "high-success / possible under-challenge — review difficulty" until validated against
  teacher observation. The Friction page's "unvalidated engineering detectors" warning is
  correct — keep it.

### D5. One narrow first claim
- Run a single, defensible pre/post study: **"Regular use improves pre-writing movement
  control and independent letter-formation accuracy in children aged 4–6."** Pre-assessment
  → 6–8 weeks, 3×/week, 8–10 min → immediate post → 2–4 week delayed; comparison class on
  normal provision; record dosage. Primary outcome = paper-based letter formation (teacher
  scored, no video). Don't claim literacy + maths + motor at once.

**Acceptance:** an efficacy dashboard (separate from product analytics) showing baseline →
independent → retention → transfer per learner, with assistance + dosage controls.

---

## Cross-cutting: the audience question (cheap, do in Sprint 1)
70% of the visible progression cohort is 8–11 while the product targets 3–7. Before
repositioning, the `traffic_type`/staff-allowlist work (A2) will separate QA from real
learners, and an age-band-assignment audit (default value? persisted across children?
device reuse?) tells you whether this is real demand or test contamination. **Decision held
until real-only data exists.**

---

## What "formidable, stable, responsive, reliable" means here (SLOs to hold)

Define the words as numbers so they're testable, not aspirational:

| Property | Metric | Target |
|---|---|---|
| Responsive (drawing feel) | Cursor input→render latency; One Euro jitter | < ~50 ms added latency; jitter measured, not eyeballed |
| Reliable (tracker) | tracker_init success; init failures | ≥99%; ~0 |
| Reliable (classroom) | command-delivery P95; teacher/student state-convergence | P95 < 500 ms; 100% converge or surfaced error |
| Stable (lock) | lock_switch_count in 2-person frame; background-hand rejection | bounded; rejections > 0 and working |
| Trustworthy (data) | metrics within logical bounds; internal excluded | 100% of cards |
| Formidable (evidence) | claim-ladder level reached | Level 4 (transfer) by end of first study |

---

## What NOT to do this cycle
- ❌ Add new dashboard tabs.
- ❌ Promote the adaptive engine out of shadow (it's correctly parked — outcomes aren't
  trustworthy yet; an adaptive engine on bad outcomes personalises the wrong things).
- ❌ Reposition to older children off contaminated age data.
- ❌ Use "105.7% activation", "100% Tier A", or "0 ms latency" in any investor/school/
  marketing material until A4 lands.
- ❌ Make a literacy/maths/motor *improvement* claim before D5. Current defensible wording:
  "designed to support early literacy, maths and pre-writing practice through movement."
- ❌ "Fix" Tracing with smoothing so aggressive it adds lag (project rule).

---

## Sprint summary

**Sprint 1 — Truth + pilot-readiness (parallel A + B)**
attempt_id · traffic_type/environment + internal exclusion · terminal outcomes · fixed
metric denominators · classroom context wiring · classroom reliability events · lock on +
metrics · age-assignment audit.

**Sprint 2 — Experience (C + E)**
Tracing A/B redesign · 60-second no-account first play · in-app browser handoff · landing
perf + WebSocket fix · classroom dual-browser dry-run.

**Sprint 3 — Evidence (D)**
Assistance recording · practice/independent/transfer split · stricter mastery · detector
rename · launch one narrow pre/post study · efficacy dashboard · pilot evidence pack.

---

## The single most important sentence
The data already supports one strong external claim today —
**"Draw in the Air's browser-based hand tracking works reliably once a child reaches the
activity."** It does not yet support a learning-impact claim or a classroom-readiness claim.
This plan's whole job is to earn those two, in that order, on numbers you can defend.
