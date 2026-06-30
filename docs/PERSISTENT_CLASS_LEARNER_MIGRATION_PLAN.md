# Persistent Class & Learner — Migration Plan (DESIGN ONLY)

**Status:** Draft for review. **Design-only.** This document does **not** authorise and does
**not** contain schema, RLS, RPC, or production-code changes. It governs what the migration
will be when separately approved.
**Date:** 2026-06-29
**Owner:** Justin
**Governed by:** `docs/TEACHER_PLG_SPINE.md` (Move 3) and
`docs/TEACHER_PLG_FOUNDER_DECISIONS.md` (D1–D5, DM1–DM2). Founder-approved for migration
planning only.
**Evidence labels** (per Decision Pack §0): **Verified** / **Strongly indicated** /
**Decision/recommendation**. Most schema statements below are **Strongly indicated** from git
migrations and may lag the live database — see Risk R1.

---

## 0. Production gate (hard, not a footnote — Decision D3)

> **Production gate.** The migration may be *designed* before legal review, but **no
> persistent classroom-learner data may be deployed to production** until the
> controller/processor model, lawful basis, retention period, deletion workflow,
> school-agreement requirements, and treatment of children's pseudonymous data have been
> reviewed and approved. Any unresolved item is a **blocking risk** (see §1), never silently
> encoded as an assumption in schema or RLS.

A migration may be written and tested against **staging only** ahead of legal sign-off,
provided it ships behind a disabled flag (§9) and writes no persistent learner data to
production. The flag may not be enabled in production until every R-series legal/privacy risk
below is closed.

### Sign-off record (2026-06-29)

The founder (Justin), as **data controller / risk owner**, has signed off **R-L1–R-L5**,
clearing the production gate. This is recorded as the founder's decision, **not** as legal
advice or a compliance certification by the assistant (which is not a lawyer and cannot verify
legal compliance). Recommendation carried forward: confirm the controller/processor model and
lawful basis (UK GDPR / COPPA / age-appropriate design) with legal counsel, and execute the
school data-processing agreements, before real children's personal data is processed in
production. The minimised-data posture (D3: first name **or** nickname + avatar only; no DOB,
email, recordings, biometrics) and the deletion taxonomy (§13) remain binding.

---

## 1. Blocking risks (must be resolved before the gated steps; never assumed away)

**Legal / privacy — SIGNED OFF by founder 2026-06-29 (risk-owner decision; see Sign-off record in §0):**

- **R-L1 — Controller/processor model.** ✅ Signed off (school = controller, DIA = processor).
  Counsel confirmation still recommended before real-data processing.
- **R-L2 — Lawful basis for processing children's data** (UK GDPR / COPPA / age-appropriate
  design). ✅ Signed off. Counsel confirmation still recommended.
- **R-L3 — Retention/deletion policy.** ✅ Signed off (12-month inactivity; deletion taxonomy §13).
- **R-L4 — School data-processing agreements.** ✅ Signed off; DPAs to be executed per school
  before onboarding real learners.
- **R-L5 — Pseudonymous-data treatment.** ✅ Signed off; minimised-data posture (D3) binding.

**Engineering / source-of-truth (block writing migrations):**

- **R-E1 — Git migrations lag the live database.** `platform/supabase/migrations/20260507_conductor_v1.sql`
  states it was "already applied to production via apply_migration … captured for git history."
  Base `sessions`, `session_students`, `round_scores` table DDL is **not** located in either
  migration tree (only later `ALTER`s are). **Strongly indicated:** the live DB is ahead of
  git. → Before any migration is authored, **introspect the live schema** (Supabase
  `list_tables` / `information_schema`) and reconcile it to a single migration history. This
  is Move 1 of the spine and is a hard prerequisite.
- **R-E2 — Two migration trees.** Canonical `supabase/migrations/` (0004–0031) and
  `platform/supabase/migrations/` (the *dead app's* dir) both define live objects:
  conductor + analytics tables live under `platform/…`, while learning-attempts policy
  hardening (0012, 0023) lives under `supabase/…`. The authoritative migration directory for
  the production project must be declared before adding new files.
- **R-E3 — Tenant model already exists.** `tenants` (kinds: parent/teacher/school/platform)
  and `tenant_id` stamping (0013) already provide an isolation boundary. The new
  organisation model must **reconcile with, not duplicate,** `tenants` (see §5).

No gated migration step proceeds while its governing R-item is open. Open items are listed in
the plan output, never encoded as defaults.

---

## 2. The four carried founder requirements (binding on this plan)

1. **Nullable analytics identifiers during transition.** `organisation_id`, `class_id`,
   `class_learner_id` remain nullable through the pre-migration instrumentation phase (Move 2,
   which precedes Move 3). No fabricated historical org/class/learner relationships. See §12.
2. **Anonymous roster access is a dedicated privacy/security decision.** A valid session code
   must grant only the minimum capability to join — never general roster visibility. See §11.
3. **North Star conditions become queryable definitions** for meaningful interaction,
   teacher/learner state alignment, critical failure, and intentionally-small sessions. See §10.
4. **Archive / anonymise / hard-delete defined separately**, including dependency handling,
   temporary participants, analytics identifiers, and organisation-level deletion. See §13.

---

## 2a. P0 LIVE-INTROSPECTION FINDINGS (Verified 2026-06-29) — supersedes §4/§5 design

Read-only introspection of the live project `fmrsfjxwswzhvicylaph` (ACTIVE_HEALTHY)
**materially changes the design.** The persistent model this plan set out to *create*
**already exists** in production but is **orphaned** (built, then not wired by the conductor app).

**Verified (live `information_schema` + row counts):**

- **Persistent learner roster already exists:** `class_children` (`id, teacher_id, first_name,
  nickname, age_band, notes, archived, tenant_id`). **1 row.**
- **Keystone FK already exists:** `session_students.class_child_id uuid` — but **0 of 4**
  `session_students` are linked. The deployed conductor client does not populate it.
- **Org/school layer already exists:** `schools` (full license/seats/stripe/admin model, **0
  rows**), `school_teachers` (role/status/invite), `school_invites`, `tenant_members`
  (`tenant_id, user_id, member_role`), `tenants`.
- **Privacy infra already exists and is in use:** `consent_records` (**4 rows**),
  `data_deletion_requests` (**1 row**, has `scope`, `target_child_id`, `status`),
  `parent_controls`.
- **Join hardening already exists:** `join_audit_log`, `join_rate_limits` (ip_hash window).
- **Assignment scaffolding exists:** `student_activity_assignments`, `classroom_default_activities`,
  `playlists`.
- **Duplicate/competing structures (schema debt):** `teachers` (tier/trial/stripe/school_id/
  is_admin) **and** `teacher_profiles` (auth_user_id/full_name); org via `schools`/`school_teachers`
  **and** `tenants`/`tenant_members`; on `sessions`: `code` vs `session_code`, `status` vs
  `class_state`, `activity` vs `current_activity_id`; on `session_students`: `name` vs
  `student_name`, `avatar_seed` vs `student_avatar`, `is_active` (nullable) vs `is_connected`.
- **Migration ledger is unreliable (R-E1 confirmed):** applied migrations jump `0004–0010` →
  `2026-06-25/26`; none of git's `0011–0031` or the `platform/` conductor/analytics/LIOS
  migrations appear, yet their objects exist. Git is **not** the schema source of truth.

**Privacy red flag (Verified):** `class_children.first_name` is **NOT NULL** and stores a
child's real first name — this is full personal data, exceeding Decision D3's "first name or
nickname + avatar only" minimisation. Any reuse must address this (see §13/§11) and is a
blocking item under the §0 gate.

**Design impact (the recommendations in §4/§5 below are now SUPERSEDED):**

- Do **not** create `class_learners` / `organisations`. **Reuse** `class_children` (learner)
  and `schools` + `tenant_members` (org/membership).
- The keystone is **wiring `session_students.class_child_id`** from the conductor join flow +
  a roster UI — not new tables.
- Decisions needed before authoring anything: (a) canonical ownership — `class_children` is
  owned by `teacher_id`, conflicting with DM1's organisation ownership; (b) reconcile
  `teachers` vs `teacher_profiles` and `schools`/`tenants`; (c) PII minimisation of
  `class_children.first_name`; (d) whether to adopt the existing `schools` license model given
  the freemium D4/D5 decisions.
- The real work is **integration, reconciliation, data-governance and cleanup**, not a
  greenfield migration. The plan must be re-baselined on this reality before any DDL.

---

## 2b. RE-BASELINED TARGET MODEL (post-P0, Verified — supersedes §4–§5)

**Verified FK + usage map (live DB + `src/` grep):**

- `sessions.teacher_id → teachers(id)` (live conductor uses `teachers`).
- Signup/role flow creates `teacher_profiles` (`teacherApi.ts`, 0008 trigger) — a **different**
  teacher identity from the one `sessions` references.
- `session_students.class_child_id → class_children(id)` exists; **0/4 populated**.
- `class_children` is used by `src/pages/teacher/roster.ts` (teacher dashboard "Children"
  roster) — **not** orphaned; the gap is the join flow, which never links to it.
- Org: `schools ← school_teachers`, `teachers.school_id → schools`; separately
  `tenants ← tenant_members`; all carry `tenant_id → tenants`.
- Deletion: `data_deletion_requests.target_child_id → child_profiles` (home only) — classroom
  `class_children` deletion is **not** covered.
- `learning_attempts.child_profile_id → child_profiles` (home only); no `class_children` link.

**Recommended canonical choices (reversible; stated so they can be challenged):**

| Concern | Canonical | Rationale | Reconciliation |
|---|---|---|---|
| Teacher identity | **`teachers`** | `sessions.teacher_id` already FKs it; carries tier/trial/school_id/is_admin | Ensure every `teacher_profiles` has a `teachers` row; migrate consumers; deprecate `teacher_profiles` later (additive first, drop only with approval) |
| Org / school | **`schools` + `school_teachers`** for the product layer, **mapped 1:1 to a `tenant`** for isolation | App already references `schools`; `tenants` stays the RLS boundary | `tenant_members` becomes derived/secondary; reconcile roles between `school_teachers.role` and `tenant_members.member_role` |
| Persistent learner | **`class_children`** | Already exists + used by roster | Add org/school linkage; **minimise PII** (below); wire `class_child_id` |
| Participant link | **`session_students.class_child_id`** | FK already exists | Populate it in `class_join`; add readiness columns (DM2) |

**PII minimisation FIRST (Decision: minimise before any wiring):**
`class_children.first_name` is `NOT NULL` real first name → migrate to nickname/first-name +
avatar per D3 (e.g., make `first_name` nullable + add `display_name`/`avatar_seed`, backfill,
stop collecting full names). **No `class_child_id` wiring into live joins until this and the
R-L legal items are done.**

**Deletion coverage gap:** extend the deletion model so `data_deletion_requests` (or an
equivalent) can target `class_children`, with archive/anonymise/hard-delete semantics (§13)
and analytics-id cleanup. School-controller deletion must be possible, not just parent/home.

**Org ownership (DM1):** `class_children` is `teacher_id`-owned today; reconciliation adds
school/org linkage so cover teachers, TAs and leaders can access per `school_teachers` — not a
single owner.

**Implementation sequence (all additive/flag-off on branch first; destructive consolidation
and any production apply are separately gated):**

1. **(additive)** PII-minimise `class_children` (nullable first_name + display_name/avatar_seed).
2. **(additive)** Readiness columns on `session_students`; org/school linkage on `class_children`.
3. **(code, flag-off)** Roster UI + `class_join` change to set `class_child_id` (token/avatar
   selection, no name-merge — D2); roster privacy per §11.
4. **(additive)** `class_children` deletion coverage + analytics-id cleanup (§13), gated R-L.
5. **(destructive — needs explicit approval)** consolidate `teacher_profiles`→`teachers`,
   reconcile `tenant_members`/`school_teachers`, drop duplicate `sessions`/`session_students`
   columns.
6. **(gated)** staging validation → production enablement only after R-L1–R-L5 closed.

---

## 3. Current-schema evidence (git view — SUPERSEDED by §2a live data where they differ)

**Verified (read directly from migration files):**

- `public.session_activities` — `id, session_id→sessions(id) ON DELETE CASCADE, activity,
  state∈{starting,playing,paused,results,ended}, ordinal, started_at, ended_at, metadata`;
  `UNIQUE(session_id, ordinal)`. (`platform/…/20260507_conductor_v1.sql:15`)
- `public.sessions` is **ALTERed** by conductor_v1 to add `class_state∈{lobby,in_activity,
  between_activities,ended}`, `current_activity_id→session_activities(id)`, `class_name`,
  `scoreboard_visible`. Base table created elsewhere (not in git — R-E1). (`…conductor_v1.sql:41`)
- `public.session_students` is **ALTERed** to add `kicked_at, kicked_reason, avatar_seed`;
  base columns (`name, joined_at, left_at, is_active, is_connected`) created elsewhere.
  (`…conductor_v1.sql:49`)
- `public.round_scores` is **ALTERed** to add `session_activity_id→session_activities(id)`.
  (`…conductor_v1.sql:59`)
- `public.analytics_events` — `id, session_id NOT NULL, occurred_at, event_name, page,
  component, game_mode, …, age_band, school_id (text), class_id (text), …, value_number,
  meta jsonb`. **No `organisation_id`, no `class_learner_id`; `class_id` is `text`.**
  (`platform/…/20260506_analytics_events.sql:19`)
- `public.learning_attempts` — `id, occurred_at, session_id NOT NULL, device_id, game_mode,
  stage_id, item_key, was_correct, attempt_number, …, meta`. `child_profile_id` and
  classroom `context` were added by later `20260519_lios_*` migrations (audit). Policy
  hardened by `supabase/migrations/0012` + `0023`. **No `class_learner_id`.**
  (`platform/…/20260507_analytics_tier_c_d.sql:21`)
- `public.tenants` (kind: parent/teacher/school/platform) + `tenant_id` stamping.
  (`supabase/migrations/0013_tenant_isolation.sql:37`)
- `public.teacher_profiles` (`auth_user_id, full_name, school_name, role`), `child_profiles`
  (parent/home universe). (`0008`, `0004`)

**Strongly indicated:** anon classroom access flows only through SECURITY DEFINER RPCs —
`session_lookup_by_code`, `class_get_session`, `class_get_self`, `class_join`,
`class_start_activity`, `class_pause/resume/end_activity`, `class_kick_student`,
`class_end_session`, `class_end_stale_sessions` (audit + 0022/0028/0029).

**Implication:** the keystone gap is confirmed — no persistent class entity (a "class" = a
`sessions` row), no persistent classroom learner (`session_students` is per-session), and the
analytics/learning tables carry no stable class/learner identity.

---

## 4. Option comparisons

### 4.1 `session_participants` (per founder requirement #4 — not yet an approved shape)

| Option | What it is | Pros | Cons | Compatibility |
|---|---|---|---|---|
| **A. Extend `session_students`** | Add `class_learner_id` (nullable) + readiness columns to the existing table | Smallest change; existing RPCs/realtime keep working; no data copy | Overloads a table whose base DDL isn't in git (R-E1); name `session_students` stays misleading | Highest — deployed clients unaffected |
| **B. Parallel `session_participants` + bridge** | New table; a view/bridge keeps `session_students` readable | Clean domain name; new readiness model isolated | Two write paths during transition; bridge complexity; realtime must target the right object | Medium — needs a compatibility view |
| **C. Staged successor** | New table; migrate reads, then writes, then retire `session_students` | Cleanest end state | Longest, riskiest; touches realtime subscriptions and every consumer | Lowest during transition |

**Recommendation (provisional, pending live introspection R-E1): Option A** — extend
`session_students` with a nullable `class_learner_id` and the readiness columns, keeping the
table and its realtime subscriptions intact. Re-evaluate vs B if introspection shows the base
table is unsafe to alter. **`session_participants` remains the domain *concept*; the physical
choice is confirmed only after R-E1.**

### 4.2 Organisation model (DM1) vs existing `tenants` (R-E3)

| Option | Pros | Cons |
|---|---|---|
| **Reuse `tenants` as the org boundary** (school/teacher kinds already exist) | No duplicate ownership concept; RLS already keyed on `tenant_id` | `tenants` semantics may not match "school with multiple staff + classes"; needs membership layer |
| **New `organisations` + `organisation_memberships`, mapped 1:1 onto a tenant** | Clean staff/class ownership; personal org for solo teachers | More tables; must define tenant↔organisation relationship precisely |
| **Minimum: nullable `organisation_id` on `classes` now** | Unblocks the sprint without full org build | Defers the membership/staff model |

**Recommendation:** introduce `organisations` + `organisation_memberships` **mapped onto the
existing `tenants` row** (one organisation per school/teacher tenant), plus `class_staff`.
For independent teachers, auto-create a personal organisation behind their teacher tenant.
If sprint capacity is short, ship the **minimum** (nullable `organisation_id` on `classes`)
but never make `teacher_id` the permanent sole authority (DM1).

---

## 5. Recommended target model (shape, not DDL)

All additions **additive and nullable**; existing ad-hoc sessions keep working.

- `organisations` — `id, tenant_id (→tenants), kind (school|independent), name, created_at,
  archived_at`. Independent teachers get a personal organisation.
- `organisation_memberships` — `id, organisation_id, auth_user_id, role (admin|teacher|
  assistant|observer), created_at, archived_at`.
- `classes` — `id, organisation_id (nullable minimum), name, age_band, primary_teacher_id
  (convenience only), created_at, archived_at`.
- `class_staff` — `id, class_id, auth_user_id, role, created_at, archived_at`.
- `class_learners` — `id, class_id, display_name (first name/nickname only), avatar_seed,
  status (active|archived|anonymised), created_at, archived_at, anonymised_at`.
  **Data-minimised personal data: first name or nickname + avatar only; personal data even
  when pseudonymous.**
- `sessions.class_id` (nullable) — a session becomes a live event of a class; NULL = ad-hoc.
- **`session_participants`** (concept) — physically Option A (extend `session_students`)
  pending R-E1: add `class_learner_id` (nullable) + readiness columns
  (`readiness_state`, `readiness_changed_at`).
- `learning_attempts.class_learner_id` (nullable) + `analytics_events` org/class/learner ids
  (nullable; see §12) — for cross-session rollup.

**Readiness state (DM2)** — authoritative, typed, timestamped, idempotent, teacher-visible,
refresh-recoverable, separate from learning performance:
`joined · camera_permission_needed · camera_ready · hand_detected · ready · playing ·
tracking_lost · needs_help · completed · disconnected · removed`. `ready` requires: camera
stream available, tracker loaded, valid hand detected, minimum confidence sustained briefly,
identity confirmed.

---

## 6. Phased migrations (each additive, reversible, flag-gated)

- **P0 — Reconcile schema source of truth (R-E1/R-E2).** Introspect live DB; declare the
  authoritative migration dir; capture any apply_migration-only objects into git. *No new
  objects.* Prerequisite for everything below.
- **P1 — Organisation skeleton.** `organisations`, `organisation_memberships`, `class_staff`;
  backfill a personal organisation per existing teacher (idempotent). Behind flag.
- **P2 — Classes.** `classes` + `sessions.class_id` (nullable). Existing sessions stay NULL.
- **P3 — Persistent learners.** `class_learners`; add `class_learner_id` to the participant
  table (Option A) and readiness columns. No write path enabled yet.
- **P4 — Wire join + readiness.** RPC changes (§8) write `class_learner_id` and readiness.
  Behind flag; ad-hoc path unchanged.
- **P5 — Progress rollup.** Add nullable `class_learner_id` to `learning_attempts`; analytics
  org/class/learner ids (§12). No backfill of history (requirement #1).
- **P6 — Deletion/retention plumbing (gated on R-L3).** Archive/anonymise/delete routines
  (§13). Not enabled in production until legal sign-off.

Each phase: forward migration + tested rollback (§8/§9) + acceptance (§14).

---

## 7. RLS matrix (to be specified per object; principles fixed now)

Scope by **organisation membership / class_staff**, not bare `teacher_id` (DM1). Anon never
gains broad SELECT; classroom access stays via SECURITY DEFINER RPCs only.

| Object | anon | teacher (member) | org admin | other org |
|---|---|---|---|---|
| organisations | – | read own | read/manage own | – |
| organisation_memberships | – | read own | manage | – |
| classes | – | read/write if class_staff | read all in org | – |
| class_staff | – | read own rows | manage | – |
| class_learners | **none direct** (RPC projection only) | read/write if class_staff | read all in org | – |
| sessions | RPC projection only | read/write own classes | read in org | – |
| participants | RPC projection only | read/write own sessions | read in org | – |
| learning_attempts | insert via hardened policy only | read own org | read own org | – |

The exact `USING`/`WITH CHECK` clauses are written per object during implementation and
verified by the isolation tests in §14.

---

## 8. RPC contracts (changes; signatures finalised at implementation)

- `class_join(in_session_id, in_class_learner_id?, in_nickname?)` → validates the learner
  belongs to the class+session; **never** merges by typed name (D2). Returns the join-screen
  projection only.
- `session_lookup_by_code(in_code)` → unchanged projection; must **not** return the roster
  (§11).
- New roster-projection RPC (§11) — minimal, teacher-gated, only while joining is open.
- `class_set_readiness(in_participant_id, in_state)` → idempotent readiness transitions (DM2).
- Teacher RPCs (`class_start_activity`, `class_*`) gain `class_id`/organisation awareness;
  authorisation moves from `teacher_id` to class_staff/org membership.
- Deletion RPCs (§13), gated on R-L3.

All RPCs keep SECURITY DEFINER + least privilege; anon execute remains revoked on internal
RPCs (per 0010).

---

## 9. Rollout flags & rollback

- **Flags:** `persistentClassesV1` (P1–P3 objects visible to teacher UI), `rosterJoinV1`
  (P4 join/readiness write path), `progressRollupV1` (P5), `learnerDeletionV1` (P6, prod-gated
  on R-L3). All default **off**; enable staging-first.
- **Rollback:** every phase has a down-migration; because all columns/tables are additive and
  nullable, disabling the flag reverts behaviour without data loss. Dropping new objects is
  safe only if no production writes occurred (enforced by flag order). Rollback steps recorded
  per phase before forward apply.

---

## 10. North Star → queryable definitions (requirement #3)

- **Meaningful interaction** (per participant per activity): at least one activity began **and**
  (≥ N valid interaction frames/task actions **or** interaction duration ≥ T seconds) **and**
  not immediately abandoned due to tracking failure. *N, T to be set from baseline data
  captured in Move 2 before thresholds are fixed.*
- **State alignment** (teacher↔learner): agreement on `session_id`, `activity_id`,
  `activity_state`; no divergence lasting > D seconds; on session end the learner stops within
  the permitted recovery window.
- **Critical failure** (any one): learner could not join; camera/tracker never reached `ready`;
  a teacher activity command never reached the learner; session could not end; a stored result
  was attributed to the wrong learner/class.
- **Intentionally small session:** explicit, stored — `session_type` /
  `expected_learner_count` / `small_group` / `one_to_one`. Never inferred from "only two
  joined."

These definitions drive the analytics spec; thresholds (N/T/D) are calibrated from Move-2
baselines, not guessed.

---

## 11. Anonymous roster access — privacy/security decision (requirement #2)

**Principle (binding):** *A valid session code grants only the minimum temporary capability
needed to join — not general access to the class roster.* The easiest child UX must not
silently widen anonymous data access.

Options to compare and choose during design (decision recorded before P4):

- avatars only (no names) on the join screen;
- avatar + first initial;
- teacher-approved join requests (teacher admits each child);
- teacher-assigned visual tokens (child matches a token shown on the projector);
- trusted-device recovery (returning device resumes without re-exposing the roster);
- a short roster projection available **only while the teacher has explicitly opened joining**,
  scoped to that session, expiring on close;
- rate limiting + failed-code lockout on `session_lookup_by_code` / `class_join`.

**Recommendation (provisional):** teacher-assigned visual tokens **or** avatar-only selection,
combined with a roster projection that exists only while joining is open and is rate-limited.
No full name list is ever returned to anon.

---

## 12. Analytics transition (requirement #1)

- Move 2 (instrumentation) runs **before** P3/P4 exist. Therefore `organisation_id`,
  `class_id`, `class_learner_id` event properties are **nullable**.
- Pre-migration: existing events keep `session_id`; temporary joins key on the current
  session-student identifier; `analytics_events.class_id` already exists as `text`.
- Post-migration: stable identifiers populate going forward only. **No false historical
  backfill** — a past event gets a class/learner id only if the relationship can be proven
  (e.g., via a captured join record), never inferred.
- `analytics_events` gains nullable `organisation_id` / `class_learner_id` (or carries them in
  `meta` until columns are added) — decided in P5; either way nullable and name-free
  (no personal names in analytics).
- `teacher_second_session` stays a **derived** metric computed over persistent `class_id`.

---

## 13. Deletion taxonomy (requirement #4; implementation gated on R-L3)

Distinct, separately-defined actions:

- **Archive** — record no longer active/selectable, retained under the approved policy
  (`status='archived'`, `archived_at`). Reversible.
- **Anonymise** — sever the identity link (clear `display_name`/`avatar_seed`,
  `status='anonymised'`, `anonymised_at`) while retaining permitted **aggregate** evidence not
  tied to a person. Irreversible for identity.
- **Hard-delete (learner)** — remove the `class_learners` row and dependent personal data;
  define cascade vs nullify for `participants` / `round_scores` / `learning_attempts` so no
  orphan personal data remains.
- **Delete organisation** — cascade or queued job across `organisation_memberships`,
  `class_staff`, `classes`, `class_learners`, sessions, participants and linked progress.
- **Delete temporary participant** — remove or anonymise un-reconciled ad-hoc joins on a short
  schedule.
- **Analytics identifiers on deletion** — when a learner is deleted/anonymised, their
  `class_learner_id` in `analytics_events` / `learning_attempts` must be cleared or the rows
  anonymised, so no learner identifier is left behind. Define this explicitly in P6.

Retention trigger (12-month inactivity) and the controller/processor workflow are **provisional
pending R-L1/R-L3** and must not be hard-coded before legal sign-off.

---

## 14. Tests & acceptance

**Unit:** readiness state machine transitions (idempotent, monotonic where required);
`class_join` rejects cross-class/cross-session learner ids; no name-merge path exists;
deletion routines clear analytics identifiers.

**Integration:** RLS isolation — a teacher in org A cannot read org B's classes/learners;
anon cannot SELECT `class_learners`; roster RPC returns nothing when joining is closed and the
minimum projection when open; ad-hoc sessions still work with `class_id IS NULL`.

**Two-browser (teacher + learner):** create class once → reuse next session; returning learner
resolves to the **same** `class_learner_id` via token/avatar selection; readiness reflects on
teacher console; refresh/reconnect preserves readiness and participation; session end stops the
learner within the recovery window (no marketing redirect).

**Acceptance — staging:** all phases applied behind flags; isolation + two-browser suites
green; rollback rehearsed per phase; no persistent learner data written with flags off.

**Acceptance — production:** **only after** every R-L item is closed; enable flags
staging→prod in order (`persistentClassesV1` → `rosterJoinV1` → `progressRollupV1` →
`learnerDeletionV1`); verify live isolation; confirm analytics ids populate forward-only with
no fabricated history; confirm deletion leaves no learner identifier behind.

---

## 15. What this plan does NOT do

No schema, RLS, RPC, or production-code changes are made by this document. Authoring the
migrations themselves requires (a) R-E1/R-E2 reconciliation and (b) explicit founder
authorisation to implement. Production enablement additionally requires all R-L legal/privacy
items closed (the §0 gate).
