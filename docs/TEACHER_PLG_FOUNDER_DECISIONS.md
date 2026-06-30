# Draw in the Air — Founder Decision Pack

**Status:** **Founder approved for migration planning only** (2026-06-29). Decisions below
are binding for the next ~3 months unless explicitly revised. Items marked **needs legal
review** are approved in principle but must not reach production before privacy/legal
confirmation. This approval authorises creating
`docs/PERSISTENT_CLASS_LEARNER_MIGRATION_PLAN.md`; it authorises **no** schema, RLS, RPC or
production code changes.
**Owner:** Justin
**Relationship to the spine:** This pack records the decisions that govern
`docs/TEACHER_PLG_SPINE.md`, which has been updated to match.

---

## 0. Evidence-labeling convention (Amendment 1)

Every factual claim in the governing documents must carry one of three labels. Do not state
repository behaviour as settled fact without it.

- **Verified** — confirmed against a specific production commit, passing tests, deployed
  migrations, and/or two-browser teacher+learner testing (incl. refresh and reconnect).
- **Strongly indicated** — present in the repository source and consistent with the audit,
  but production configuration, RLS deployment, or edge cases are not yet re-tested.
- **Decision / recommendation** — a choice or proposal, not an observation.

Worked example: not "the conductor works," but —
> **Strongly indicated:** the student client contains realtime subscriptions, a 15-minute
> reconnect memo, and a defensive polling fallback (`StudentClassClient.tsx`).

The repository implementation can be correct while production config, RLS deployment, or
edge cases still fail. Re-verify before asserting.

---

## 1. Positioning (Amendment 2)

**Decision.** Drop "no devices to hand out / just a webcam" — it is not universally true
(the product needs a webcam-enabled computer, some setups use learner tablets, and a shared
display is still a device).

**Approved core positioning:**
> Movement-led learning children control with their hands, using the classroom technology
> you already have.

**Approved supporting line:**
> Teachers can launch short literacy, maths and motor-development activities without child
> logins, app installs or specialist equipment.

Rationale: keeps the genuine friction-removal hook (no child logins / no installs / no
specialist hardware) while remaining accurate for a school buyer.

---

## 2. Resolved open decisions

### D1 — Join code
**Decision:** Per-session code, generated automatically when the teacher opens Conduct Mode,
with QR entry and recent-device recovery. **Not** a permanent four-digit class code as the
default.
**Rationale:** a stable public 4-digit code is guessable and shareable outside the room; the
routine benefit does not justify it as the default security model.
**Implications:** stable class identity lives internally; the session code expires at session
end and can be regenerated immediately if exposed; the code must appear automatically in the
same place each session (with a reusable `/join` URL + QR) so it never feels like extra work.

### D2 — Roster creation
**Decision:** Hybrid. Teacher may pre-create a pseudonymous roster; learners may also join
temporarily during a first or ad-hoc session; the teacher later reconciles temporary
participants into the persistent roster. **Never auto-merge by typed name** (case-insensitive
or otherwise).
**Rationale (Amendment 4):** a name is not a reliable identity key — shared first names,
spelling variants, shared devices, and typos would fragment or merge learning history.
**Implications:** persistent learners have a stable internal ID + visual token; after entering
the code, a child selects their avatar/nickname; the join RPC receives the selected
`class_learner_id` and the server validates membership; ambiguous/duplicate identities are
resolved by the teacher in the console.

### D3 — Persistent-learner privacy
**Decision (needs legal review):** For school-created learner records, the **school/setting
is the data controller** and Draw in the Air acts as **processor**, subject to formal legal
confirmation.
**Approved initial rules:** data-minimised personal data — first name or nickname and avatar
only (still **personal data** even when pseudonymous); no date of birth; age band stored at
class level where possible; no child email; no webcam recordings; no biometric template;
learner history not reused across organisations; explicit export and deletion handling;
immediate teacher/school archive+delete workflow.
**Approved initial retention (needs legal review):** active class records retained while the
school account/pilot is active; archived learner records deleted or anonymised after **12
months of inactivity**; shorter pilot-specific retention where contractually required;
operational logs retained separately and pseudonymised.
**Implications:** this is blocking for the migration's RLS/retention design and for school
agreements.

### D4 — Free-tier conversion lever
**Decision:** Do **not** monetise by blocking a teacher's first classroom success. Free
teacher tier supports one active class, a sensible learner limit, core activities, recent
session summaries, and enough repeat use to establish value.
**Paid value comes from:** multiple classes; persistent longitudinal insights; curriculum
sequences; staff collaboration; exports; school-level reporting; implementation + priority
support.
**Implications:** the existing `FREE_TIER_CLASSROOM_CAP = 1` can stand, but the upgrade
prompt must appear **after demonstrated repeat value**, never mid-first-session.

### D5 — Family commercial model
**Decision (this quarter):** Freemium, not a hard seven-day trial.
- **Free family tier:** one learner, selected core activities, basic recent activity, no card
  required.
- **Paid family tier (later):** multiple learners, structured programmes, expanded progress
  history, advanced recommendations, fuller activity library where appropriate.
**Rationale:** keeps the family product functional without making it the architecture driver
or forcing consumer-subscription optimisation during the teacher-PLG quarter. Resolves the
homepage "free for families" vs dashboard "7-day trial" contradiction in favour of freemium.

---

## 3. Domain-model decisions

### DM1 — Organisation ownership, not bare `teacher_id` (Amendment 3)
**Decision:** Model class ownership through an organisation, not a single teacher. Minimum
entity set:
```
organisations
organisation_memberships     (adults ↔ organisation)
classes                      (belong to an organisation)
class_staff                  (adults ↔ class access; a primary teacher may be stored for convenience)
class_learners               (persistent pseudonymous roster)
sessions                     (a live event of a class)
session_participants         (intended domain concept for a learner's presence in one session)
```
`session_participants` is the intended domain *concept*, not an approved table shape. The
migration plan must compare **extending `session_students`**, **a parallel table with a
compatibility bridge**, or a **staged successor table**, and must not assume it replaces
`session_students`.

For independent teachers, create a **personal organisation** behind the scenes so there are
not two incompatible ownership models later.
**Minimum if full org support is too large for the sprint:** include a nullable
`organisation_id` now and do **not** make `teacher_id` the permanent sole authority.
**Rationale:** teacher departures, cover teachers, TAs, school-leader oversight, and
multi-teacher pilots all break a single-owner model.

### DM2 — Readiness in the domain model, not just the UI (Amendment 6)
**Decision:** Learner readiness is authoritative, typed, timestamped, idempotently updated,
visible to the teacher, recoverable after refresh, and separate from learning performance.
**Approved participant states:**
```
joined
camera_permission_needed
camera_ready
hand_detected
ready
playing
tracking_lost
needs_help
completed
disconnected
removed
```
A learner counts as **ready** only after: camera stream available, tracker loaded, valid hand
detected, minimum tracking confidence sustained briefly, and learner identity confirmed.
**Rationale:** makes the North Star measurable rather than interpretive, and lets the teacher
see true readiness before pressing Start.

---

## 4. Analytics event contract (Amendment 7)

**Decision:** One canonical event contract, organised around stable entities, with shared
properties on every event. No personal names in analytics.

**Core events:**
```
teacher_account_created
class_created
class_opened
session_created
join_code_displayed
learner_join_attempted
learner_joined
learner_ready
activity_assigned
activity_started
activity_completed
session_completed
session_summary_viewed
next_activity_selected
teacher_returned
colleague_invited
pilot_interest_started
```

**Shared properties:**
```
event_uid
occurred_at
teacher_id
organisation_id
class_id
session_id
class_learner_id
activity_id
activity_type
client_version
environment
source_route
tracking_quality_band
```

**`teacher_second_session` is a derived metric, not a client event** — the analytics layer
computes whether a teacher ran a second *successful* session with the **same persistent
class** inside the target window.

---

## 5. North Star correction

**Decision:** Split operational success from learning evidence so technical reliability is
never mistaken for learning performance.

**Product North Star — weekly successful classroom sessions.** A session counts only when:
- the teacher deliberately started it;
- at least three learners joined (unless the class is intentionally smaller);
- learners reached **ready**;
- at least one assigned activity began;
- meaningful interaction occurred;
- the session ended intentionally;
- teacher and learner state stayed acceptably aligned;
- no unresolved critical failure.

**Learning-evidence metric — interpretable learning attempts.** An attempt is interpretable
only when:
- tracking quality was above threshold;
- the learner had enough interaction opportunity;
- the activity objective was clear;
- completion criteria were valid;
- the outcome was not dominated by device or gesture failure.

Do not use raw activity completions or time-on-task as the primary success measure.

---

## 6. Refined three-month plan

### Month 1 — Establish truth and activation visibility
Resolve the production branch + deployment relationship; separate/archive `platform/`; land
containment fixes on a clean branch; define canonical entities + the analytics contract;
instrument the existing teacher funnel; establish baseline metrics **before** changing the
flow; finalise privacy + identity decisions; build a practice-session prototype.
**Exit:** production source of truth documented; funnel queryable; first-session failure
points measured; persistent model approved; practice session usable internally.

### Month 2 — Build persistent classroom foundations
Organisation-aware classes; persistent class learners; sessions linked to classes; session
participants linked to persistent learners; hybrid roster + reconciliation flow; per-session
codes + QR join; readiness states; **preserve all existing ad-hoc session behaviour.**
**Exit:** existing sessions still function; teacher creates a class once and reuses it;
returning learner resolves to the same record; no name-based silent merges; teacher sees
readiness accurately; RLS + cross-teacher isolation tests pass.

### Month 3 — Turn repeat use into the growth loop
Teacher Today screen built around the next session; one-click repeat session; practice mode
in onboarding; repoint the public teacher journey; movement-before-signup; post-session
recommendations; colleague-invite + pilot-interest actions; run with real pilot teachers and
measure second-session behaviour.
**Exit:** new teacher reaches practice success in under two minutes; new teacher completes a
real session within seven days; the same class runs a second successful session; teacher sees
a clear next action after every session; school-interest conversion is attributable to
teacher usage.

---

## 7. What happens next

1. Founder signs off this pack (or annotates changes).
2. Produce `docs/PERSISTENT_CLASS_LEARNER_MIGRATION_PLAN.md`. **It must open with this hard
   gate, not a footnote:**

   > **Production gate.** The migration may be *designed* before legal review, but **no
   > persistent classroom-learner data may be deployed to production** until the
   > controller/processor model, lawful basis, retention period, deletion workflow,
   > school-agreement requirements and treatment of children's pseudonymous data have been
   > reviewed and approved. Any unresolved item must be listed as a **blocking risk**, never
   > silently encoded as an assumption in schema or RLS.

   The plan then covers: current schema inventory; proposed tables/columns; organisation
   ownership model; the `session_participants` implementation comparison (extend vs parallel
   vs staged successor); RLS matrix; RPC changes; backward-compatibility strategy; data
   backfill rules; temporary-participant reconciliation; analytics changes; rollout flags;
   rollback plan; unit/integration/two-browser tests; staging + production acceptance steps.
3. **No schema, RLS, RPC, or other code changes until the migration plan is approved.**
   (Containment copy/behaviour fixes from 2026-06-29 remain the only code changes, are
   implemented locally only, and still need to move onto a clean fix branch per Move 1.)
