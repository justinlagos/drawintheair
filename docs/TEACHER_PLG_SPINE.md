# Draw in the Air — Product Spine & Decision Record

**Status:** **Founder approved for migration planning only** (2026-06-29) — governed by
`docs/TEACHER_PLG_FOUNDER_DECISIONS.md`. This authorises creating
`docs/PERSISTENT_CLASS_LEARNER_MIGRATION_PLAN.md`; it authorises **no** schema, RLS, RPC or
production code changes.
**Date:** 2026-06-29
**Owner:** Justin
**Supersedes:** ad-hoc strategy in root `*.md` audit files (to be archived)
**Production gate (D3 / privacy):** no persistent classroom-learner data may be deployed to
production until the controller/processor model, lawful basis, retention period, deletion
workflow, school-agreement requirements and treatment of children's pseudonymous data are
reviewed and approved. Any unresolved item is a blocking risk, never a silent assumption.

This is the single intentional spine for the next ~3 months. It is grounded in a
code-backed audit of the production Vite SPA (`src/`), not first-principles redesign.
If anything below conflicts with verified repository behaviour, the repository wins —
flag the conflict rather than coding around it.

---

## 1. The decision

**Primary motion: teacher product-led growth.**

One teacher signs up, runs a class that works, sees real progress, runs another, and
brings a colleague or their school into a pilot. School sales is an *assisted conversion
layer* on top of successful teacher usage. Family (B2C) stays **functional at
maintenance level** and must **not** drive architecture.

**The one loop everything serves:**

> Discover → sign up → create a class → kids join effortlessly → run an activity that
> works → see meaningful progress → run another → invite a colleague / start a pilot.

**Core positioning (approved — Founder Decision Pack §1):**

> Movement-led learning children control with their hands, using the classroom technology
> you already have.

**Supporting line:**

> Teachers can launch short literacy, maths and motor-development activities without child
> logins, app installs or specialist equipment.

Pedagogy (EYFS, fine-motor, early literacy/maths) is the *justification* for the headteacher;
removing child logins, installs, and specialist hardware is the *hook* that makes a teacher
try it twice. (The earlier "no devices / just a webcam" framing was dropped as inaccurate —
the product needs a webcam-enabled computer and some setups use learner tablets/displays.)

---

## 2. What the audit verified (so we don't re-litigate)

*(Claims labeled per the evidence convention in Founder Decision Pack §0:
**Verified** / **Strongly indicated** / **Decision**.)*

**Strongly indicated — keep it:** The conductor architecture is sound — `TeacherClassConsole`
(`/class`) + `StudentClassClient` (`/join`), teacher-authoritative realtime, a 15-minute
reconnect memo via `sessionStorage`, a defensive 10s heartbeat poll for missed websocket
events, anon `session_lookup_by_code` scoped via SECURITY DEFINER, idempotent analytics
envelopes (`event_uid`). This is present in source and consistent with the audit; it is
**not yet re-verified** against production config, deployed RLS, or two-browser refresh/
reconnect testing. Read it as "not a rebuild," not as "proven correct in production."

**The keystone problem:** There is **no persistent class or learner entity.** A "class"
is a `sessions` row; a learner is an ephemeral `session_students` row. The same child
next week is a brand-new record with no link to last week. `child_profiles` exist only
in the parent/home universe. → No cross-session progress, no retention cohorts, no
evidence, new join code every session, cold-start every week. The retention half of the
loop is structurally impossible until this is fixed.

**The dashboard is rich, not shallow** (`src/pages/teacher/TeacherDashboard.tsx`): 8 real
tabs, per-child insights, EYFS mapping, lesson plans, resources — but built on the
ephemeral model above, so "per-child insights" cannot actually follow a child across
sessions. The richness is built on sand. Fix the foundation and the existing dashboard
becomes genuinely valuable.

**The funnel is invisible:** Teacher *signup* events exist, but the **class lifecycle is
uninstrumented** — no event for session created, learner joined, session ended, or second
session. You cannot run PLG on a funnel you cannot see.

**Branch / source-of-truth hazard:** `master` and `main` both exist, `origin/HEAD → main`,
the deployed commit (`4d9eef7`) sits on a third branch (`chore/professional-release-workflow`),
work is on a fourth (`feat/attempt-idle-timeout`), plus ~20 local branches, a dead 66-file
`platform/` Next.js app, 6 orphaned `classmode/` files, an old `ParentsLanding.tsx`, and 64
stray `vitest.config.ts.timestamp-*.mjs` artifacts. Agents can edit the wrong tree.

---

## 3. Scope guardrails

**Production source of truth:** root Vite + React SPA (`src/`), Supabase backend.
**`platform/` is dead** (never imported by `vite.config.ts` / `index.html` / build) —
archive it. Do not edit `platform/` unless a task explicitly targets it.

**Non-goals for this quarter (explicit):** merging the dashboard and console into one
shell (they already don't conflict — a navigational bridge + shared design language is
enough, and it's polish not keystone); full school admin suite; parent messaging; badges /
streaks / leaderboards; new activities before the loop is reliable; enterprise SSO;
AI teaching advice.

---

## 4. The six moves (sequenced)

Ordering rationale: **moves 2 and 3 are the franchise.** Move 1 is a prerequisite chore.
Moves 4–6 are conversion/retention multipliers that only pay off once 3 exists.

### Move 1 — Resolve source-of-truth & archive dead surface *(cheap, unblocks all)*
- Declare the production branch in `CLAUDE.md` / `docs/`. Reconcile `master` vs `main` vs
  deployed `4d9eef7`. (Coordinate with the release-workflow restructure already in flight.)
- Archive `platform/`, the 6 orphaned `classmode/` files, old `ParentsLanding.tsx`; clean
  the 64 vitest artifacts. *(Note: the Cowork mount blocks deletes — do removals in a
  local clone and push back.)*
- **Acceptance:** one documented prod branch; `platform/` and orphans out of the working
  tree; build + type-check still green.

### Move 2 — Instrument the teacher activation funnel *(cheap, makes the loop visible)*
- Implement the **canonical event contract** (Founder Decision Pack §4): core events around
  stable entities (`class_created`, `session_created`, `join_code_displayed`, `learner_joined`,
  `learner_ready`, `activity_started`, `activity_completed`, `session_completed`,
  `teacher_returned`, `colleague_invited`, `pilot_interest_started`, …) with shared properties
  (`event_uid`, `organisation_id`, `class_id`, `session_id`, `class_learner_id`,
  `tracking_quality_band`, …). **No personal names in analytics.** `teacher_second_session`
  is a **derived** metric, not a client event. Reuse the existing `analytics.ts` envelope.
- **Acceptance:** the full funnel — signup → class created → code shared → learner joined →
  learner ready → activity run → session completed → returned — is queryable from
  `analytics_events`, with a baseline captured **before** the flow is changed.

### Move 3 — Persistent, organisation-aware class + learner identity *(the keystone)*
See the data-model design in §5 (organisation-aware per Founder Decision Pack §DM1).
Additive, reversible migrations only; the full design is captured in the migration plan
**before any code**.
- **Acceptance:** a teacher creates a class once and reuses it; a returning learner resolves
  to the **same** persistent record via roster/avatar selection (never silent name-merge);
  progress accrues across sessions; existing ad-hoc sessions still work; cross-teacher and
  cross-organisation isolation tests pass.

### Move 4 — Protect first-session success *(the activation moment)*
- A camera/hand **readiness gate** before a learner is shown as "ready" (today a child can
  enter the classroom before tracker init, and a teacher can start an activity into a black
  canvas while the timer silently freezes — `StudentClassClient` / `TrackingLayer`).
- A guaranteed-easy first activity (large-target Bubble / Free Paint, not tracing).
- A **solo practice / rehearsal mode** (run the loop with a fake learner before facing 25 kids).
- **Kill the session-end auto-redirect to the marketing homepage** (8s redirect dumps a
  child onto the family signup CTA on shared devices). End on a static "You can close this."
  *(Containment fix implemented locally — see §7.)*
- Readiness is an **authoritative, typed participant state** (Founder Decision Pack §DM2),
  visible to the teacher and recoverable after refresh — not merely a UI step.
- **Acceptance:** a brand-new teacher runs a successful practice session in under ~2 minutes;
  no learner reaches `ready` before camera stream + tracker load + valid hand + sustained
  confidence + confirmed identity.

### Move 5 — Repoint the front door to teacher-led *(rolls in the confirmed contradictions)*
Confirmed contradictions to fix here:
- Homepage's dominant CTA "Try free now" → `/parent/signup` (`Landing.tsx:387`). Repoint to
  a teacher front door + **try-before-signup wired to the already-anonymous `/play`**.
- Teacher landing CTA is "Book a 20-min call" (`Teachers.tsx`) — a sales-led artifact on a
  PLG page. Make primary CTA "Start a class free"; keep the call as a secondary school-lead path.
- **Wrong-role recovery gap:** a parent account hitting `/class` already sees a recovery
  screen (`TeacherClassConsole.tsx`) — it was never truly silent; what was missing is a
  direct teacher-account creation action. Complete that recovery action.
- **"No data stored" / free-vs-7-day-trial copy** contradictions (see §7) — correct the claims.
- **Acceptance:** a teacher reaches a usable state without ever passing through a family
  funnel; a visitor can feel the movement before signing up.

### Move 6 — Make the dashboard pay off the data model
- Progress-over-time per learner and per class (now possible post-move 3), and a
  "recommended next activity" on the session summary (today retrospective only; no
  interaction-vs-learning split).
- **Acceptance:** the summary answers "what should I do next?" and the dashboard shows a
  learner's trajectory across sessions.

---

## 5. Persistent class + learner data model (design sketch)

> Detailed schema, RLS matrix, RPC changes, backfill and rollback belong in
> `docs/PERSISTENT_CLASS_LEARNER_MIGRATION_PLAN.md` (next artifact). This section is the
> approved *shape*, not the migration. Reflects Founder Decision Pack §DM1, §DM2, D1–D3.

**Principle:** additive and reversible. New tables + nullable FKs. No destructive changes.
Backward compatible with deployed clients (they ignore new columns). Existing ad-hoc
sessions keep working.

**Organisation-aware entities (Decision §DM1 — do not make `teacher_id` the sole authority):**

- `organisations` — a school, setting, or independent account boundary. Independent teachers
  get a **personal organisation** created behind the scenes.
- `organisation_memberships` — adults ↔ organisation.
- `classes` — belong to an **organisation** (`organisation_id`); a primary teacher may be
  stored for convenience. Stable teaching context; age band lives here where possible.
- `class_staff` — adults ↔ class access (covers cover-teachers, TAs, leader oversight).
- `class_learners` — persistent, **pseudonymous** roster: stable internal id + visual token
  (`avatar_seed`), `display_name` (first name / nickname only). **Data-minimised personal
  data: first name or nickname and avatar only** (still personal data even when pseudonymous);
  no DOB, no child email, no recordings, no biometrics.
- `sessions` — one live event of a class (`class_id`, nullable for ad-hoc).
- `session_participants` — the **intended domain concept** for a learner's presence in one
  session; links to `class_learner_id` (nullable for temporary/ad-hoc joins) and carries the
  authoritative **readiness state** (§DM2). Whether this *extends* `session_students`, lands
  as a *parallel table with a compatibility bridge*, or is a *staged successor* is an
  implementation decision for the migration plan — not an approved fact. It does **not**
  replace `session_students` yet.

*Minimum if full org support is too large for the sprint:* introduce a nullable
`organisation_id` now and avoid `teacher_id` becoming the permanent sole owner.

**Progress rollup:** `learning_attempts.class_learner_id` (nullable) lets classroom progress
roll up by persistent learner across sessions (today classroom rows have
`child_profile_id = NULL` and no cross-session identity).

**Join behaviour (Decision D1/D2 — never silent name-merge):**

- *Persistent class:* teacher confirms a roster; after entering the **per-session** code the
  child selects their avatar/nickname; the join RPC receives the selected `class_learner_id`;
  the server validates the learner belongs to the class+session.
- *Ad-hoc class:* child enters a nickname → temporary `session_participant`; the teacher later
  attaches it to a persistent learner. The system **never** merges by case-insensitive name.
- *Codes:* per-session code generated at Conduct-Mode open, expiring at session end, with a
  reusable `/join` URL + QR and recent-device recovery (no permanent public 4-digit code).
- Never expose roster PII to anon beyond the join-screen projection.

**RLS:** scope by `organisation_id` + role (`organisation_memberships` / `class_staff`), not
by a single `teacher_id`. Reuse hardened anon RPC paths; do not widen anon SELECT.

**Privacy / governance (Decision D3 — needs legal review before production):** school/setting
is the **controller**, Draw in the Air the **processor**. Data-minimised; learner history not
reused across organisations; explicit export + immediate archive/delete workflow; archived
learner records deleted/anonymised after **12 months inactivity** (shorter where a pilot
contract requires).

---

## 6. Decisions (resolved — see Founder Decision Pack)

All five are now closed in `docs/TEACHER_PLG_FOUNDER_DECISIONS.md`:

1. **Join code (D1):** per-session code, auto-generated at Conduct-Mode open, QR + recent-
   device recovery; **no** permanent public 4-digit class code.
2. **Roster creation (D2):** hybrid — pre-create or temporary-join, teacher reconciles;
   **never** auto-merge by typed name.
3. **Persistent-learner privacy (D3, needs legal review):** school = controller, DIA =
   processor; nickname/first name only; 12-month inactivity deletion/anonymisation.
4. **Free-tier lever (D4):** never block first-session success; free = 1 class + learner cap
   + core activities; paid = multiple classes, longitudinal insights, sequences, exports,
   collaboration, reporting, support. Upgrade prompt only after demonstrated repeat value.
5. **Family model (D5):** freemium (one free learner, no card), not a hard 7-day trial;
   paid family tier deferred.

---

## 7. Product-contract failures (the substance of move 5)

These are not isolated copy bugs. Each is a place where the product *promises* one thing
and *behaves* as another — which is exactly what makes the platform feel confusing. Patching
the words alone would preserve the underlying contradiction. Move 5 therefore means
rebuilding the *contract*, in this order:

1. **Define the canonical teacher-led journey** end to end (discover → teacher front door →
   try → signup → class → run → return), so there is one intended path, not many.
2. **Apply the family commercial model** (freemium — Decision D5): make the homepage and the
   parent dashboard agree (one free learner, no card; drop the "7-day trial" claim). This
   closes the "free for families" vs paid-trial contradiction — a broken commercial contract,
   not a typo.
3. **Make role routing explicit** — a teacher never lands in a family funnel and vice-versa;
   wrong-role users get a clear, actionable recovery path.
4. **Fix session-lifecycle behaviour** — terminal states (ended/kicked) must respect
   classroom control instead of bouncing children to the marketing site.
5. **Rewrite public copy to match actual behaviour** — every claim is true of the shipped
   product (privacy, pricing, compatibility, pedagogy).
6. **Update analytics so each corrected journey is measurable** (ties to move 2).
7. **Remove or redirect contradictory legacy paths** so no stale route re-introduces a
   different version of the product.

**Specific claims to correct in the copy rewrite:**

- **"Try free now" → `/parent/signup`** as the dominant homepage CTA on a teacher-led product
  (the front-door repoint is core move-5 work, not containment).
- **Free-for-families vs 7-day trial** — apply approved Decision D5 (freemium), then make homepage and dashboard agree.
- **"No data stored"** — inaccurate; the product stores accounts, sessions, joins, progress.
  True claim is narrower: *"Webcam video stays on your device."*
- **"Movement is the curriculum"** — too absolute for a school buyer; movement is the
  *interaction model*, learning is the purpose.
- **"Any browser, any laptop"** — overstated; qualify to supported modern browsers / recent
  laptops + Chromebooks with a webcam.

### Immediate containment (implemented locally 2026-06-29, ahead of the full move-5 rebuild)

Low-risk fixes that stop active harm while the deeper journey work proceeds. **Implemented
locally in the working tree (`feat/attempt-idle-timeout`, a mixed/wrong branch); not yet
committed, merged or deployed. They must be moved onto a focused fix branch off the confirmed
prod branch (move 1), tested and merged before they count as real.**

- **Session-end redirect removed** — children no longer bounce to `/` (the marketing
  homepage + family CTA) after a class ends or they're removed. They rest on a static end
  screen; the kicked-screen copy now reads "Please ask your teacher for help."
  (`StudentClassClient.tsx`).
- **"No data stored" → "Webcam stays on your device"** — the only privacy claim we can
  honestly make (`Landing.tsx`).
- **Removed the conflicting "free for families" claim** from the hero eyebrow (now
  "EYFS aligned · for ages 3–7"); the D5 freemium rollout still needs to drop the "7-day
  trial" claim to fully close the contradiction (`Landing.tsx`).
- **Wrong-role recovery made actionable** — the `/class` not-teacher screen (which already
  existed; it was *not* truly silent) now offers a direct "Create a teacher account" link to
  `/teacher/signup` alongside the existing family-dashboard / about links
  (`TeacherClassConsole.tsx`).

*Deliberately NOT changed as containment (these are core move-5 work, not patches):* the
homepage primary-CTA routing to `/parent/signup`, the "Book a 20-min call" teacher-landing
CTA, and the family commercial model itself.

---

## 8. North Star & activation metrics

Operational success and learning evidence are **separated** so technical reliability is never
mistaken for learning performance (Founder Decision Pack §5).

**Product North Star — weekly successful classroom sessions.** Counts only when: the teacher
deliberately started it; ≥3 learners joined (unless intentionally smaller); learners reached
`ready`; at least one assigned activity began; meaningful interaction occurred; the session
ended intentionally; teacher/learner state stayed acceptably aligned; no unresolved critical
failure.

**Learning-evidence metric — interpretable learning attempts.** An attempt counts only when
tracking quality was above threshold, the learner had enough interaction opportunity, the
objective was clear, completion criteria were valid, and the outcome was not dominated by
device/gesture failure.

- **Teacher activation:** one real session with ≥3 learners within 7 days of signup.
- **Teacher retention:** a second successful session with the *same persistent class* within
  7 days (requires move 3; measured as a **derived** metric).
- **Learner interaction success:** first valid gesture within ~30s of the readiness flow.
- **Reliability:** teacher and learner state agree throughout the session.

Do **not** use raw activity completions or time-on-task as the primary success measure.
```
