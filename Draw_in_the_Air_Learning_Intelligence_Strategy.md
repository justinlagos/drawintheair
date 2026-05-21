# Draw in the Air — Learning Intelligence Strategy

**A redesign of the data, telemetry, analytics and validation architecture so the platform can produce credible, research-grade evidence that children measurably improve while using it.**

Prepared: May 2026
Audience: Engineering, Leadership, Investors, School & Grant Partners, Learning Scientists
Status: Strategic redesign — supersedes the current engagement-only analytics posture

---

## 0. Executive Summary

Draw in the Air's existing analytics layer is well-built for an engagement product: a unified `analytics_events` table, a privacy-first event pipeline, an offline-queued client, a mirrored `learning_attempts` fact table, and a six-tab Insights v2 dashboard reporting completion, abandonment, stuck, retention, and a coarse three-tier mastery classification.

It is **not** built — yet — for the question that now matters most: *did this child get better at something measurable, and can we prove it?*

Engagement signals tell us a child returned, played, completed. They do not tell us the child's letter-recognition latency dropped 38% over six weeks, that movement precision converged toward an adult baseline, that hesitation collapsed, that retries reduced, that the skill survived a two-week gap. Those are the signals investors, EdTech grant boards, school districts, accelerators and learning-science reviewers expect.

This document specifies the shift. It identifies twelve critical flaws in the current pipeline, prescribes a new event and data model (Elo/IRT-style skill rating, mastery episodes, gesture-quality telemetry, classroom dimension, periodic micro-assessment, decay probes, transfer probes), redesigns the dashboards into research-grade learner / classroom / institution surfaces, defines a validation protocol that can stand up to peer review and grant scrutiny, and lays out a phased engineering plan that ships measurable learning evidence in the next two quarters without breaking the existing pipeline or compromising COPPA / UK-GDPR / ICO Age-Appropriate Design Code compliance.

The central change in posture: **stop treating engagement as a proxy for learning, and start instrumenting the platform like a longitudinal motor-and-cognitive learning study.** The data that already exists in the codebase is roughly 35% of what is needed. The remaining 65% is reachable in 8–12 weeks of focused engineering.

---

## 1. Critical Flaws in the Current Data System

The current pipeline is honest, lean and offline-resilient. That is its strength. Its weaknesses, in order of severity for "credible learning evidence":

**1.1 Point-in-time mastery, no curves.**
`dashboard_mastery_summary` classifies an item as `strong / practising / new` using a static threshold (≥5 attempts + ≥80% accuracy). This is a snapshot. It cannot answer "did this child get faster, more accurate, more independent week-over-week?" because mastery is computed as a state, not as a *trajectory*. There is no `learner_skill_state` table indexed over time. The most important learning question — *change* — is structurally inexpressible in the current schema.

**1.2 `item_dropped` is too coarse.**
The single canonical learning event collapses an entire attempt into `was_correct`, `attempt_number`, `ms_to_attempt`. It discards everything *between* the prompt and the answer: the gesture path itself, the velocity profile, jitter, hesitation pauses, mid-stroke corrections, the spatial accuracy of the trace, the time-to-first-movement vs. time-to-completion. These intermediate signals are exactly the ones a learning scientist needs to claim "motor precision improved." Without them, the platform can show completion-rate; it cannot show *quality of movement* improving.

**1.3 Replay is conflated with learning.**
Replay-count is currently treated as engagement-positive. In learning science it is ambiguous: replay after success suggests entertainment; replay after failure with a closing gap suggests mastery effort; replay with no improvement suggests frustration loop. The pipeline does not distinguish these regimes. A child stuck replaying Bubble Pop ten times with no accuracy gain currently looks indistinguishable from a child mastering the activity.

**1.4 Mastery thresholds are hard-coded and age-blind.**
80% / 5 attempts is a universal threshold. A 4-year-old reaching 70% on letter `g` is a more impressive learning signal than an 8-year-old reaching 90% on letter `i`. Without age-band-calibrated and item-calibrated thresholds (item-response theory, see §5), the platform systematically over-credits older children and under-credits early-years learners — the exact population that matters most for EYFS / early-literacy grants.

**1.5 No transfer-of-learning measurement.**
The platform cannot currently ask "did mastering letter `b` in *Word Search* improve speed on letter `b` in *Gesture Spelling*?" Each `game_mode` is logged but skill identity is not normalised across modes. A child who has clearly internalised the letter shape will look like a fresh learner every time the activity context changes.

**1.6 No retention / decay probes.**
There is D1 / D7 *session* retention, not D7 / D30 *skill* retention. The platform never deliberately re-tests a child on an item they previously mastered to check whether the skill survived. Without decay probes, "mastery" is unfalsifiable: a child could forget every letter learned and the dashboard would still report them as `strong`.

**1.7 No baseline / pre-post structure.**
Learning evidence requires a comparator. The platform has no first-session baseline (a calibrated entry assessment) and no exit / periodic mini-assessment. Improvement is therefore inferred against the child's own noisy early attempts, with no protection against regression to the mean and no story for a grant reviewer.

**1.8 Classroom and school are text fields, not first-class entities.**
`school_id` and `class_id` are free-text columns on `analytics_events`. There is no `school_dim`, `classroom_dim`, no enrolment table, no teacher dim, no curriculum mapping, no roster join. Classroom-level analysis is therefore string-match fragile, cohort definitions are unstable, and "classroom heatmap" / "intervention list" cannot be implemented reliably.

**1.9 No country / region / locale dimension.**
UTM is captured; geography is not. There is no IP-to-coarse-region derivation, no school-locale field, no language tag. Country-level adoption, regional retention cohorts, device reliability by geography — all the slides an investor or accelerator will ask for — are not derivable from the current pipeline.

**1.10 Event sequencing is client-derived and unaudited.**
The offline queue is a strength, but `occurred_at` is set by `now()` server-side on insert. Tab-switching, slow flushes, and out-of-order batch arrival can scramble event order in ways that distort latency, hesitation and replay calculations. There is no client-side monotonic sequence number on each event, no server-side reconciliation step.

**1.11 Noisy and duplicated events.**
`stuck` repeats every 60s after first fire; `mode_started` can re-fire on tab focus; `item_dropped` can land twice if the user retries during a flush. There is no idempotency key (`event_uid`) and no deduplication job. Aggregates currently absorb a few percent of noise — tolerable for engagement KPIs, **not** tolerable for "X% accuracy improvement over Y weeks" claims that need to survive academic scrutiny.

**1.12 Hard-coded thresholds, no calibration tooling.**
"Strong" / "practising", "30s = stuck", "last quartile vs first quartile = fatigue" — these are sensible defaults, but they are not surfaced as a configuration object, not versioned alongside builds, and not calibrated against any external dataset. The moment a school asks "why is 80% your mastery threshold?" the platform has no defensible answer.

**Other notable issues surfaced in the codebase survey** (lower severity but real):
- Dual admin surfaces (PIN-based legacy + OAuth Insights v2) splitting maintenance.
- Hard-coded admin allow-list requires a deploy to onboard a new researcher.
- No data-export API for partner schools / research collaborators.
- Retention-deletion job is referenced in migrations but unverified in production.
- A/B-test infrastructure (`dashboard_ab_results`) exists but is not yet wired to learning outcomes — only to engagement deltas.

---

## 2. Missing Instrumentation

To go from "children enjoyed the platform" to "children measurably improved," the platform needs the following signals captured, persisted, and time-indexed. These are additions to — not replacements of — the existing event stream.

**2.1 Gesture / stroke-level quality telemetry.**
For every attempt at a letter, number, or shape, capture (locally, then summarised before upload — see §9):
- `path_length_px` — total length of the traced path.
- `target_path_length_px` — ideal length for that glyph.
- `path_efficiency` — ratio of net displacement to total path length (lower = jitterier).
- `mean_velocity`, `velocity_variance` — smoothness proxy.
- `pause_count`, `mean_pause_ms` — within-stroke hesitation.
- `directional_changes` — how many times the gesture reversed sharply.
- `spatial_error_mean_px` — mean distance from ideal path samples.
- `spatial_error_p95_px` — worst-deviation moment.
- `time_to_first_movement_ms` — recognition / decision latency.
- `time_to_completion_ms` — total stroke time.
- `corrections_within_stroke` — count of in-stroke direction reversals that recovered toward target.

Crucially, raw coordinate sequences **never leave the device**. Only these scalar summaries are transmitted (see §9 for privacy).

**2.2 Hesitation and decision signals.**
- `time_to_first_movement_ms` (above) is the headline.
- `pre_attempt_abandons` — child started a gesture, abandoned, restarted.
- `prompt_repeats_used` — child pressed "say it again" / replayed the audio prompt.

**2.3 Independence signals.**
- `hint_shown` (and `hint_level`) per attempt.
- `scaffold_shown` (e.g. tracing guideline visible).
- `adult_voice_detected` (if microphone is on and explicit permission given — otherwise omit entirely).
- `independent_completion` boolean: completed without hint, without scaffold, within expected time.

**2.4 Recovery-after-failure signals.**
- `attempts_to_first_correct` per item per session.
- `time_to_first_correct_ms` per item per session.
- `recovery_curve_id` — link sequential attempts on the same item so the platform can model improvement *within* a session, not just across them.

**2.5 Session-quality signals (data hygiene).**
- `tracker_confidence_mean` — MediaPipe per-frame hand-detection confidence aggregated.
- `frames_dropped_pct` — performance health.
- `lighting_estimate` (from MediaPipe's tracking confidence variance, never from image data).
- `device_capability_tier` — derived from FPS achieved.
- `session_quality_score` — composite 0–1 used to *exclude* low-quality sessions from learning claims.

**2.6 Identity-stable skill model.**
- `skill_id` — a normalised identifier independent of game mode. Letter `b` traced in *Word Search* and *Gesture Spelling* shares one `skill_id`. This unlocks transfer measurement (§1.5).
- `skill_family` — grouping (uppercase letters, lowercase letters, digits 0–9, simple shapes, two-letter blends, numerals, sight words).

**2.7 Calibrated difficulty.**
- `item_difficulty_b` — IRT difficulty parameter for the item, estimated from the global response dataset (see §5).
- `item_age_band_norm` — expected accuracy by age band for that item.

**2.8 Periodic micro-assessment events.**
Every N sessions (e.g. every 4th, or once weekly), the platform inserts a 60–90 second calibration block of items the child has previously mastered, mixed with items at +1 difficulty step. This is the platform's pre/post engine. New event:
- `micro_assessment_block` with `assessment_purpose ∈ {baseline, decay_probe, transfer_probe, periodic}`.

**2.9 Decay probes.**
Server-side scheduling logic re-introduces a previously-mastered `skill_id` after 7, 14, 30 days. The result is logged with `is_decay_probe=true`. Skill that survives decay is *real* skill.

**2.10 Transfer probes.**
When a child masters letter `b` in *Gesture Spelling*, the next session in *Word Search* prioritises letter `b` to measure cross-mode transfer. Logged with `is_transfer_probe=true`.

**2.11 Classroom-context flag.**
Every event carries `context ∈ {home, classroom, unknown}`. Determined by: classroom code redemption flow (explicit), session time-of-day patterns (heuristic fallback), school-domain login (institutional plan). This single flag enables the home-vs-classroom comparisons demanded by school adoption pitches.

**2.12 Curriculum mapping.**
`skill_id` is joined to a curriculum dimension table (EYFS Early Learning Goals, UK National Curriculum KS1, US Common Core ELA / Math K–2, Singapore MOE, etc.). One row per (skill, framework) tuple. This is what turns the platform's data into a deliverable a head teacher or a grant reviewer recognises.

**2.13 Idempotency and ordering.**
- `event_uid` — client-side UUID per event, used to deduplicate on insert.
- `client_seq` — monotonic per-session sequence integer for ordering.
- `client_ts` — client clock; server keeps `occurred_at` for arrival, plus computed `event_ts` = best estimate after clock-skew reconciliation.

**2.14 Geographic & locale dimension.**
- Coarse country (from IP, kept only as ISO-2 code, never the IP itself).
- Coarse region (state / county / NUTS-1) — *only* for classroom-context sessions where school context provides legitimate basis.
- `locale` (browser-reported).
- `timezone_offset_min`.

**2.15 Consented research-cohort flag.**
For schools who opt in to a research study, `is_research_cohort=true` is set on the classroom dim. Only research-cohort data is used for published efficacy claims; the rest stays in product analytics. This isolates research-grade reporting from general operations and keeps the ethics story clean.

---

## 3. New Analytics Architecture

The redesign keeps the existing ingestion path (offline-queued client → `/api/track` → Supabase Postgres) and the existing `analytics_events` raw log. It adds a **structured semantic layer** on top: fact tables, dimension tables, and time-indexed state tables purpose-built for longitudinal learning.

### 3.1 Conceptual model

A pseudonymous *learner* moves through *sessions* in a *context* (home or classroom). Within each session they make *attempts* at *items*, which roll up to *skills*. The platform maintains a continuously-updated *skill state* per (learner, skill), records discrete *mastery episodes* when state transitions occur, and periodically injects *assessment blocks* whose outcomes are tagged with their assessment purpose (baseline / decay / transfer / periodic).

```
learner ─< session ─< attempt >─ item ─> skill
                          │              │
                          ├─ gesture_quality
                          ├─ independence_flags
                          └─ assessment_block (optional)

skill_state(learner, skill, t)  ←  attempts + episodes + decay
mastery_episode(learner, skill) ←  state transitions
```

### 3.2 New tables (additions to the existing schema)

The names below assume Supabase / Postgres; structure not SQL is the point.

**`learner_dim`** — pseudonymous learner. One row per `learner_uid`. Holds `age_band`, `locale`, first-seen, last-seen, `is_research_cohort` (denormalised from classroom). No PII. `learner_uid` is *not* the device UUID; it is derived (see §9.3) so that one shared classroom tablet can produce many learners and one child across two devices can be reconciled when a classroom code is redeemed.

**`skill_dim`** — one row per canonical skill (letter, digit, shape, blend, sight-word). Holds `skill_family`, `expected_age_band`, `irt_difficulty_b`, `irt_discrimination_a`, `last_recalibrated_at`.

**`item_dim`** — one row per concrete activity item (a particular letter shown in a particular mode at a particular level). Joins to `skill_dim`. Holds `game_mode`, `level`, `presentation_variant`, `item_difficulty_b` (mode-adjusted).

**`classroom_dim`** — first-class entity. `classroom_uid`, `school_uid`, `country_iso2`, `region`, `enrolment_size_band`, `is_research_cohort`, consent flags, opt-in scope.

**`school_dim`** — `school_uid`, `country_iso2`, `region`, `school_type` (state / independent / international / homeschool-coop), plan tier.

**`curriculum_map`** — `(skill_uid, framework, framework_code, framework_label)`. Many rows per skill; many frameworks per region.

**`session_fact`** — one row per session. Carries derived `session_quality_score`, `context`, `device_capability_tier`, `tracker_confidence_mean`, `start_ts`, `end_ts`, `n_attempts`, `n_unique_skills`, `independent_completion_count`.

**`attempt_fact`** — one row per attempt. The successor to the trigger-mirrored `learning_attempts` table. Includes: `learner_uid`, `session_uid`, `item_uid`, `skill_uid`, `attempt_index_in_session`, `attempt_index_lifetime`, `was_correct`, `time_to_first_movement_ms`, `time_to_completion_ms`, gesture-quality scalars (§2.1), `hint_shown`, `scaffold_shown`, `is_decay_probe`, `is_transfer_probe`, `assessment_purpose`, `session_quality_score`.

**`mastery_episode_fact`** — one row each time `skill_state` crosses a threshold (acquisition, consolidation, mastery, decay, recovery). Holds `from_state`, `to_state`, `evidence_window`, `confidence`. This is the table that powers progression timelines.

**`skill_state_history`** — time-indexed snapshot of `skill_state(learner, skill, day)`. Powers mastery curves, learning velocity, decay charts. Append-only daily snapshot via a scheduled job; cheap to query, cheap to chart.

**`assessment_block_fact`** — one row per micro-assessment block, with composite scores per skill family and an `assessment_purpose`.

**`learner_skill_state`** — current (latest) state per (learner, skill). Snapshot of the head of `skill_state_history`. Used for hot dashboard queries.

### 3.3 Layered architecture

The redesign separates three layers, each with a clear role and SLA:

- **Bronze — raw event log.** Existing `analytics_events`. Append-only. Idempotent on `event_uid`. Retained 365 days. No business logic.
- **Silver — semantic facts and dimensions.** `attempt_fact`, `session_fact`, `mastery_episode_fact`, `assessment_block_fact`, `skill_state_history`, dimension tables. Built by scheduled jobs (and triggers, where latency matters). Idempotent rebuild from Bronze. Retained as long as the pseudonymous learner is active + a configurable trailing window.
- **Gold — research-grade aggregates and marts.** Materialised views and scheduled rollups: classroom_weekly_mart, country_mart, cohort_retention_mart, efficacy_study_mart. Privacy-enforced (k-anonymity ≥ 5 — see §9.6). This is the layer dashboards, exports and grant reports read.

The current Insights v2 RPCs continue to work against Silver/Gold; nothing breaks. New dashboards (§7) read Gold.

### 3.4 Ingestion + processing topology

```
Client (offline-queued, event_uid, client_seq)
     │
     ▼
/api/track  ── idempotency check on event_uid ──► analytics_events (Bronze)
                                                        │
                                                        ├─ trigger: insert attempt_fact / session_fact (low-latency)
                                                        │
                                                        └─ scheduled job (every 5 min):
                                                              ├─ skill rating update (Elo / IRT) → learner_skill_state
                                                              ├─ mastery_episode detection         → mastery_episode_fact
                                                              ├─ snapshot                         → skill_state_history
                                                              ├─ session_quality_score            → session_fact
                                                              └─ assessment scoring               → assessment_block_fact
                                                        │
                                                        └─ nightly job:
                                                              ├─ IRT recalibration (global)
                                                              ├─ classroom_weekly_mart refresh
                                                              ├─ cohort_retention_mart refresh
                                                              └─ k-anonymity enforcement on Gold
```

The 5-minute job cadence is deliberate: too frequent and Elo updates thrash; too rare and teacher dashboards feel dead. Five minutes is the inflection where dashboards feel live without computational waste.

### 3.5 Idempotency and ordering — concretely

Every client event carries `event_uid` (UUIDv4 generated at the moment of the event, not at flush) and `client_seq` (monotonic per session). The `/api/track` handler uses `INSERT ... ON CONFLICT (event_uid) DO NOTHING`. Latency, hesitation and "did this attempt happen before that hint" calculations all use `client_seq` for ordering, with `client_ts` providing wall-clock and `occurred_at` providing server arrival. Clock-skew reconciliation: per-session, the platform estimates the offset between `client_ts` and `occurred_at` from the first 10 events and applies it forward.

### 3.6 Backwards compatibility

`item_dropped` continues to fire exactly as today. New gesture-quality fields are added to its `meta` JSONB and also to `attempt_fact`. Existing RPCs continue to work. Existing dashboards continue to render. The new pipeline is additive. This is non-negotiable: there is no version of "rip and replace" that is acceptable while paying schools are using the platform.

---

## 4. Behavioural Learning Model

The behavioural model is the mathematical and conceptual layer that turns raw `attempt_fact` rows into defensible statements about a child's learning. It has four components.

### 4.1 Skill rating — Elo-with-decay (production tier) and 2PL-IRT (research tier)

Each (learner, skill) maintains a continuous rating *θ*. Each item carries a difficulty parameter *b* (and optionally a discrimination *a*). The probability that learner L succeeds on item I is the logistic:

`P(correct | θ_L, b_I, a_I) = 1 / (1 + exp(-a_I · (θ_L − b_I)))`

For production we run a simplified Elo-style online update on every attempt:

`θ_L ← θ_L + K · (outcome − P_expected)`
`b_I ← b_I − K_item · (outcome − P_expected)`

with `K` scaled by `session_quality_score` so noisy sessions update the rating less. For research-cohort claims we re-fit a full two-parameter-logistic (2PL) IRT model nightly with marginal maximum likelihood, on the consented research subset only. The platform reports day-to-day in Elo and publishes in IRT.

**Decay**: between attempts on a skill, *θ* drifts back toward the population mean at a configurable half-life (default 30 days, recalibrated empirically from decay probes). A child who hasn't seen `b` in three weeks is *expected* to be a little rustier; if the decay probe shows otherwise, the platform has evidence of consolidation, not just performance.

### 4.2 Confidence index

Confidence is operationalised as a composite, not declared. For an attempt:

`confidence_attempt = w₁·(1 − normalised(time_to_first_movement)) + w₂·(1 − normalised(corrections_within_stroke)) + w₃·(1 − normalised(pre_attempt_abandons)) + w₄·(independent_completion ? 1 : 0)`

Weights *wᵢ* are fit per age band against a small held-out adult-rated sample (research cohort). The *trend* in `confidence_attempt` over a learner's history on a skill is reported as the confidence curve. Headline number for a teacher: "Sophie's confidence on lowercase letters has risen 42% in 4 weeks."

### 4.3 Motor-precision index

A composite of the gesture-quality scalars in §2.1, normalised against an age-band reference (built initially from internal data, refined as the platform scales):

`precision = z(path_efficiency) − z(spatial_error_mean_px) − z(velocity_variance) + z(time_to_completion_inverse)`

Reported per skill family (because precision on circles and on cusps are different motor problems), with monthly trend and a percentile-against-age-band. This is the headline metric for OT (occupational therapy), early-years motor-skill grants, and special-needs school pitches.

### 4.4 Mastery, consolidation, and the four states

A (learner, skill) is in exactly one of four states at any time:

- **Exposed.** Has attempted, not yet meeting acquisition criteria.
- **Acquired.** Recent accuracy and confidence above threshold, but not yet stable.
- **Mastered.** Stable above threshold across ≥3 sessions and ≥1 decay probe survived.
- **Decayed.** Was mastered, fell below threshold on a decay probe; will be re-promoted on recovery.

Thresholds are age-band and skill-family specific, calibrated from data, versioned (`thresholds_v2026_05` etc.) and surfaced in the admin tooling. Every state transition writes a `mastery_episode_fact` row. The mastery curve a teacher sees is the time-series of these episodes, not a count of completions.

### 4.5 What this model lets the platform say (and not say)

It lets the platform say: *"Sophie's lowercase-letter rating rose from −0.4 to +1.1 over six weeks (Elo, K=24, session-quality-weighted). She mastered 18 of 26 letters under the v2026_05 thresholds. 14 of those 18 survived a 14-day decay probe. Her motor-precision index on cursive curves moved from the 22nd to the 61st percentile for her age band."*

It does *not* let the platform say "Sophie's IQ rose 8 points" or "Sophie reads better than her classmates," and the dashboards must not be tempted to. Discipline on what the model supports is what makes it credible.

---

## 5. Skill Progression Logic

This section is the engineering-readable spec for §4.

### 5.1 The progression state machine

```
Exposed ──(meets acquisition criteria)──► Acquired
Acquired ──(stable across 3 sessions + decay probe survived)──► Mastered
Mastered ──(decay probe failed)──► Decayed
Decayed ──(meets re-acquisition criteria)──► Mastered
Any state ──(no exposure in N days)──► (rating drifts; state recomputed)
```

### 5.2 Acquisition criterion (default; per-age-band override)

For age 4–5 on a lowercase letter:
- ≥6 attempts on the skill across ≥2 sessions
- ≥65% accuracy on the last 6 attempts
- `time_to_first_movement_ms` trending down (linear fit slope < 0)
- `independent_completion_rate` ≥ 0.5 on the skill

For age 6–7 on the same skill the thresholds are tighter (≥80% accuracy, slope < 0, independence ≥ 0.7). For age 8+ the platform expects mastery, not acquisition.

### 5.3 Mastery criterion

- Stable Elo rating above the skill's `b` parameter + a 0.5σ buffer across ≥3 sessions.
- At least one decay probe survived (≥7 days since last exposure, then ≥70% accuracy + within-stroke quality not degraded by >1σ).
- Confidence index in the top 60% of the learner's own history on that skill.

### 5.4 Learning velocity

`velocity_skill = Δθ_skill / Δpractice_time_minutes`

Reported per skill family per week. A flat or declining velocity on a skill family is the platform's earliest *teacher-actionable* signal — surfaced as "this child is plateauing on lowercase letters; consider intervention X."

### 5.5 Transfer score

For each (learner, skill) that was mastered in game-mode A, the next exposure in game-mode B is logged as a transfer probe. The transfer score is the *delta* in expected accuracy on that skill in mode B vs. a baseline learner of equal Elo at first exposure. Transfer > 0 means skill identity was internalised; transfer ≈ 0 means the child learned the game, not the letter.

### 5.6 Retention strength

For each mastered (learner, skill), the longest gap since exposure followed by a successful re-test is the retention strength in days. Reported as the median across the cohort. This is the headline efficacy metric for grant applications: "median retention strength after mastery across 1,247 learners was 23 days under a 14-day decay-probe protocol."

### 5.7 Calibration loop

Every two weeks, a job re-estimates `b` and `a` for every item against the full consented research-cohort dataset, with sanity bounds and a tolerance band so item difficulties don't drift unstably. Each calibration writes a new versioned `thresholds_vYYYY_MM_DD` row. Dashboards always render against the threshold version active at the time the row was written, so retrospective comparisons remain valid.

---

## 6. Recommended Metrics

The metrics below are the recommended *headline* and *secondary* indicators. Headline metrics drive dashboards and external reporting; secondary metrics drive engineering and intervention.

### 6.1 Learner-level — headline

- **Skill Mastery Count (SMC)** — count of skills in `Mastered` state, by skill family.
- **Time-to-Mastery (TTM)** — median minutes of practice from `Exposed` to `Mastered` per skill family, per age band.
- **Retention Strength (R-score)** — median days a mastered skill survives between exposures.
- **Motor Precision Index (MPI)** — composite (§4.3), reported as age-band percentile.
- **Confidence Index (CI)** — composite (§4.2), reported as trend slope.
- **Independent Completion Rate (ICR)** — fraction of attempts completed without hint or scaffold, smoothed weekly.
- **Learning Velocity (LV)** — Δθ per minute of practice, per skill family.
- **Transfer Index (TI)** — mean transfer score across cross-mode probes.

### 6.2 Learner-level — secondary

- Hesitation-time decline slope (`time_to_first_movement_ms`).
- Retries-per-item curve (attempts to first correct).
- Within-session recovery score (improvement across sequential attempts).
- Persistence score (return rate after a frustrating session).
- Decay survival rate.

### 6.3 Classroom-level — headline

- **Class Mastery Coverage** — % of curriculum-mapped skills mastered by ≥80% of the class.
- **Class Mastery Surface** — heatmap (skill × child) for a single classroom.
- **Class Learning Velocity** — median LV across the class, by skill family.
- **Intervention List** — auto-generated list of (child, skill) pairs with stagnant LV and declining CI, for the teacher.

### 6.4 Classroom-level — secondary

- Engagement-vs-mastery scatter (the platform's anti-vanity-metric chart).
- Strongest / weakest skill families.
- Time-on-task vs. learning-velocity correlation (teacher-readable r and confidence).
- Activity difficulty distribution (so the teacher can see whether items shown match the class level).

### 6.5 School / institutional — headline

- **Cohort Mastery Trajectory** — median SMC over weeks for the school's enrolled cohort.
- **Curriculum Coverage** — % of the relevant national curriculum framework currently being practised across the school.
- **Efficacy Effect Size** — pre/post within-subject Cohen's *d* on the platform's micro-assessment, with confidence interval.
- **Cohort Retention** — D7 / D30 *learner* retention (already partially in place; preserve).

### 6.6 Global / product — headline

- Country-level adoption (DAU / WAU by country).
- Classroom-vs-home learning velocity comparison.
- Session quality distribution by device capability tier and country.
- Tracker reliability by browser/OS/region.
- Open-error rate by build version.

### 6.7 Anti-metrics (deliberately *not* surfaced as KPIs)

- Raw replay count without success-rate context.
- Total sessions without quality weighting.
- Total minutes-on-platform as a learning proxy.
- Completion rate divorced from accuracy.

These are listed here because the temptation to surface them — and to write grant narratives off them — is real. The redesigned dashboards are built to refuse.

---

## 7. Dashboard Redesign

Three dashboards, three audiences. Each reads the Gold layer. Each is privacy-enforced at the query layer (k-anonymity ≥ 5 — see §9.6).

### 7.1 Learner Progression Dashboard (research / school SLT view)

For a single pseudonymous learner across their full history.

- **Progression Timeline** — horizontal time axis; rows per skill family; coloured bands for state (Exposed / Acquired / Mastered / Decayed); stars at decay-probe survivals; vertical markers at micro-assessment blocks.
- **Mastery Curve** — line chart of cumulative `Mastered` count per skill family over time, with confidence band.
- **Confidence Curve** — line chart of CI over time per skill family.
- **Motor-Precision Curve** — MPI percentile-vs-age over time.
- **Time-to-First-Movement Decline** — small multiples per skill family (the "hesitation collapsing" chart).
- **Independence Curve** — ICR over time.
- **Retention Strength Distribution** — histogram across the learner's mastered skills.
- **Decay Probe Log** — table of (skill, days since last exposure, probe result, accuracy delta vs. mastery).
- **Transfer Probe Log** — table of cross-mode transfer results.

### 7.2 Classroom Intelligence Dashboard (teacher view)

For a teacher, scoped to their classroom only.

- **Class Mastery Heatmap** — children (rows) × skills (columns), cell colour = state. Click a cell → that child's progression timeline.
- **Class Mastery Surface (3D-ish line chart)** — class median SMC over time, with quartile bands.
- **Class Velocity Bar** — LV by skill family for this class vs. age-band benchmark.
- **Intervention List** — auto-generated (child, skill) pairs flagged by stagnant LV + declining CI. Each row has a one-line teacher suggestion and a "log intervention" button.
- **Engagement-vs-Mastery Scatter** — each child plotted (engagement minutes vs. SMC). The chart that protects against vanity metrics — children high on the y-axis are the success story; children high on the x-axis but low on the y-axis are the intervention list.
- **Curriculum Coverage Strip** — for the bound curriculum framework, which Early Learning Goals / KS1 strands / Common Core standards are being touched and at what mastery rate.
- **Friction Report** — the skills with the highest retries-to-first-correct in this class, ranked.

### 7.3 Global Product Intelligence Dashboard (leadership / investor / partner view)

- **Adoption Map** — choropleth (country / region) by DAU and by classroom count.
- **Home vs Classroom** — learning velocity, completion rate, retention — split, with confidence bands.
- **Cohort Retention** — D1 / D7 / D30 (learner; already exists, preserve) and **skill retention** (new — median R-score over time).
- **Cohort Efficacy** — within-subject pre/post effect size over rolling 90-day windows, with confidence bands.
- **Session Quality** — distribution of `session_quality_score` across regions and device tiers.
- **Tracker Health** — GPU vs. CPU success, init times, by browser/OS/country (extends current dashboard_tracker_health).
- **Funnel of Learning** — exposed → acquired → mastered → retained → transferred, with conversion rates. This is the headline slide for any investor or grant conversation.
- **A/B Test Outcomes** — preserve `dashboard_ab_results`, but extend the verdict from engagement-lift to *learning-velocity-lift* with effect size and CI.

### 7.4 Visualisation principles

- Every chart shows a confidence band, not just a line.
- Every comparison shows age-band normalisation explicitly.
- Every metric has a definition tooltip with the underlying formula and the threshold version.
- No "score out of 100" gamified summaries that obscure underlying claims.
- Mobile-responsive teacher view (a teacher on the school corridor on an iPad must be able to read the intervention list).
- Print/PDF view exists for every dashboard (extends the current `PrintReport` pattern).

---

## 8. Learning-Outcome Framework

This is the protocol that lets the platform say "children measurably improved" and have that statement survive a peer review or a grant panel.

### 8.1 Outcome construct map

Each platform skill maps to one or more *constructs*. Constructs are the things the world cares about: *letter recognition*, *letter formation*, *number recognition*, *quantity sense*, *gross motor coordination*, *fine motor coordination*, *visual-motor integration*, *symbolic mapping*, *executive-function persistence*, *self-efficacy*. Each construct has external referents — established assessments or curriculum-framework Early Learning Goals — listed in the design doc so a researcher can audit the mapping.

### 8.2 Within-platform micro-assessments

Every Nth session (configurable; default = every 4th), the platform inserts a 60–90 second mixed block:
- 6 items the learner has previously mastered (decay sub-probe).
- 4 items at +1 difficulty step (acquisition sub-probe).
- 2 cross-mode items (transfer sub-probe).

Results are logged as an `assessment_block_fact`. Pre/post comparisons are computed across these blocks, *within the same child*, never as raw accuracy diffs (which regress to the mean) but as Elo-rating diffs with the session_quality weighting.

### 8.3 Baseline-and-endline schools protocol

For research-cohort schools, the platform runs:
- **Baseline (week 0):** an out-of-platform 5-minute assessment administered by the teacher using a printable, scored sheet (letter naming, number identification, fine-motor draw-the-shape). Logged via the teacher console as `external_assessment_baseline`.
- **Endline (week 6, 12, optionally 24):** the same external assessment.

The platform reports within-subject Cohen's *d* and a paired 95% CI on the change. This is the slide a grant panel will want.

### 8.4 Control comparisons (where ethics permit)

For partner schools running large enough cohorts, a *waitlist control* design: half the classroom uses the platform weeks 0–6, the other half weeks 6–12. Baseline-mid-endline assessments compare groups at mid (week 6) and within-subject at endline (week 12). This yields a defensible between-groups effect size without denying any child access to the platform. Pre-registration of the protocol (with OSF or equivalent) is the recommended posture.

### 8.5 Framework alignment

Every public efficacy claim is anchored to a published framework: EYFS Early Learning Goals (Communication & Language, Literacy, Mathematics, Physical Development), UK National Curriculum KS1, US Common Core ELA K–2 and Math K–2, Singapore MOE NEL, etc. The `curriculum_map` table is the join. A grant reviewer in Indiana and a head teacher in Surrey both see results against their own framework.

### 8.6 Defensibility checks

Before any efficacy number ships externally:
- Session-quality filter applied (excludes sessions below `session_quality_score` threshold).
- k-anonymity ≥ 5 enforced on the cohort.
- Active learner count and observation window stated explicitly on the chart.
- Effect size, not just mean diff, with confidence interval.
- Pre-registration link if the cohort is a research cohort.
- Threshold version stamped on the chart.

This is the discipline that separates "marketing chart" from "evidence."

---

## 9. Privacy-Safe Implementation Strategy

The platform's privacy posture is already strong (no PII, on-device hand tracking, EU-hosted Supabase, no third-party analytics, coarse age banding). The redesign must *preserve* that posture while adding longitudinal depth. The two are not in conflict if the architecture is right.

### 9.1 Privacy principles, restated and binding

- **Data minimisation by design.** No coordinate paths leave the device. No video, no audio, no face. Only scalar derived features.
- **Pseudonymity, not anonymity-by-deletion.** A stable pseudonymous `learner_uid` is necessary for longitudinal claims. It is not personally identifying and cannot be reversed to PII because no PII is stored against it.
- **Purpose limitation.** Research-cohort data is segregated and only used for efficacy reporting under explicit opt-in.
- **k-anonymity on all surfaced cohorts.** No chart that aggregates fewer than 5 distinct learners is rendered (Gold layer enforces this).
- **No invasive child profiling.** No psychographic inference, no behavioural targeting, no third-party sharing.
- **Right to be forgotten.** Even though no PII is stored, the platform must support `learner_uid` deletion (cascades across attempt/episode/state tables) on request from a school or parent.

### 9.2 Regulatory anchors

The architecture is designed to satisfy simultaneously:
- **UK GDPR + Data Protection Act 2018** (data minimisation, purpose limitation, DSAR-readiness, lawful basis).
- **EU GDPR** (EU-hosted Supabase, no cross-border transfer absent Standard Contractual Clauses).
- **COPPA (US)** — no PII collection from children under 13 means COPPA's verifiable parental consent gate does not apply, but the platform should hold a COPPA Safe Harbor opinion on file for institutional buyers.
- **ICO Children's Code (Age-Appropriate Design Code)** — high-risk profiling off by default, no nudges, transparency tools for parents and teachers.
- **FERPA (US)** for institutional contracts — data handling clause stating the platform is a "school official" acting under direct control of the school when classroom-context.

### 9.3 The `learner_uid` derivation (the most sensitive design decision)

The current `device_id` (localStorage UUID) conflates devices and learners — a classroom tablet shared by 24 children produces one `device_id` and 24 learners. The redesign:

- **Home context:** `learner_uid` defaults to `hash(device_id || profile_seed)`, where `profile_seed` is a non-identifying child-selected avatar/colour combination at first run. Multiple siblings on one device produce distinct learners.
- **Classroom context:** `learner_uid` is derived from a classroom-issued code (`hash(classroom_uid || roster_position || classroom_salt)`). Rosters are held by the teacher locally and never include child names server-side; the platform sees only the position number.
- **No cross-device reconciliation without explicit opt-in.** A child using the platform at home and at school will appear as two distinct learners unless the school's plan includes the optional "linked-cohort" feature, in which case the link is performed on a teacher's machine using a one-way hash with a school-held salt.

This is deliberately conservative. It trades a small amount of analytical convenience for a posture that survives the strictest interpretation of the ICO Children's Code.

### 9.4 Gesture-quality scalars vs. raw paths

The §2.1 gesture-quality fields are all *scalars derived locally* from the in-browser MediaPipe stream. The raw coordinate sequence is computed, summarised, then discarded in the same frame. The platform never receives a coordinate path. This must be enforced in code, documented in the privacy policy, and verifiable from the open-source client (and is independently verifiable by any school's network-monitoring team).

### 9.5 Geographic dimension done safely

- IP addresses are never stored. Country-only (ISO-2) is derived at the edge and stored; the IP is dropped before insertion.
- Region is only stored when the session is in classroom context and the classroom dim carries the region (i.e. the school already declared it).
- Per-child geolocation is never derived from device sensors.

### 9.6 k-anonymity on Gold

The Gold layer (dashboards, exports, grant-report builders) enforces:
- No row surfaced where the underlying cohort `n < 5`.
- No (country × region × age_band × skill_family) breakdown more granular than 5 learners.
- Suppression bars where data is below threshold ("data hidden — fewer than 5 learners in this cohort").

This is the same standard the UK DfE uses for school-level performance data and is investor-presentable.

### 9.7 Consent and transparency

- Classroom-context onboarding: teacher accepts a school-level data processing agreement (DPA). No per-child consent gate (because no PII).
- Research-cohort onboarding: school opts in explicitly via a signed addendum that names the studies the cohort will be included in.
- Parent / pupil dashboard: a "what we collect about my child" page mirrors the privacy policy in plain language and shows the actual fields stored for that pseudonymous learner. Section 4 of the ICO Children's Code calls for exactly this.

### 9.8 Deletion and export

- `DELETE /api/learner/{uid}` cascades across all fact tables, all state tables, and removes the learner from any cached marts.
- `GET /api/learner/{uid}/export` returns the learner's full pseudonymous record as JSON.
- Both endpoints are authenticated against the school's admin or a parent-token issued by the school. Neither requires Anthropic-level personal data because none exists.

### 9.9 Retention

- Bronze: 365 days (existing policy; verify the scheduled deletion job is live).
- Silver: while the learner is active + 365 days, then deletion.
- Gold marts: indefinite, but always aggregate, always k-anonymised, never reversible.
- Research cohort: per the protocol pre-registration; default 24 months post-study, then deletion.

---

## 10. Immediate Engineering Priorities (Next 8–12 Weeks)

The redesign in §3–§9 is large. The first three months should deliver a credible, defensible "first proof of learning" while not destabilising the live platform. Recommended sequence:

**Sprint 1 (weeks 1–2) — Foundations.**
- Add `event_uid`, `client_seq`, `client_ts` to the event envelope. Make `/api/track` idempotent on `event_uid`.
- Verify the 365-day retention job is live; alarm if not.
- Add `context` field (`home / classroom / unknown`) to the event envelope and route it through `analytics_events`.
- Move the admin allow-list from code to a config table.

**Sprint 2 (weeks 3–4) — Schema for longitudinal learning.**
- Ship `learner_dim`, `skill_dim`, `item_dim` populated by triggers and a backfill job over the last 90 days of `learning_attempts`.
- Ship `skill_state_history` and the 5-minute Elo rating job.
- Ship `mastery_episode_fact` with state-transition detection.

**Sprint 3 (weeks 5–6) — Gesture quality on-device.**
- Add gesture-quality scalars (§2.1) computed locally in the client, attached to `item_dropped.meta` and stamped into `attempt_fact`.
- Verify in code review that no coordinate sequence leaves the device. Add an automated test for this.
- Surface motor-precision percentile in the existing Learning tab.

**Sprint 4 (weeks 7–8) — Classroom dimension and decay probes.**
- Ship `classroom_dim`, `school_dim`, `curriculum_map` (seeded with EYFS and Common Core K–2).
- Ship classroom code redemption flow and the `learner_uid` derivation (§9.3).
- Implement server-side decay-probe scheduling (re-introduce a mastered skill after 7/14/30 days).
- Implement micro-assessment block insertion every 4th session.

**Sprint 5 (weeks 9–10) — Dashboards v3.**
- Ship the Learner Progression Dashboard.
- Ship the Classroom Intelligence Dashboard (heatmap, intervention list, engagement-vs-mastery scatter).
- Extend the global dashboard with country / context splits.

**Sprint 6 (weeks 11–12) — Validation pilot.**
- Onboard 2–3 partner schools as research-cohort.
- Run pre-registered baseline → 6-week endline protocol with an out-of-platform paper assessment.
- Publish the first internal efficacy report.

Engineering risks to flag now: (a) gesture-quality computation cost on low-end Chromebooks — must be profiled before week 5; (b) `learner_uid` redesign requires a careful migration plan for existing devices — recommended approach is "new schema for new devices, opportunistic mapping for returning devices, never destructive"; (c) the Elo job must be idempotent and replayable, because backfilling six months of history requires it.

---

## 11. Long-Term Data Moat Opportunities

What is defensible about Draw in the Air's data that no competitor can copy within twelve months of effort?

**11.1 An IRT-calibrated item bank for early-years motor learning.**
With 10,000+ learners across age bands and devices, the platform can publish item-difficulty parameters per letter / numeral / shape that are normed against a real population — something no curriculum publisher has for *air-drawn* gestures. This becomes the de facto reference set. Universities collaborate. Papers cite. The bank is the moat.

**11.2 Normative percentiles per age band for motor-precision indices.**
Multi-year MPI norms become the first publishable benchmark for visual-motor integration via in-the-air gesture. Schools and OT clinics will pay for percentile reports.

**11.3 Multi-year skill-retention curves.**
Almost no EdTech product has truthful 6-month-and-beyond retention data on skills, because almost none of them measure it. The decay-probe design makes this trivially the platform's by year two.

**11.4 Cross-context (home/classroom) learning-transfer dataset.**
With the `context` flag and a few thousand learners using the platform in both, the platform can publish the first credible "does home practice transfer to school performance" dataset for this age band. Grant gold.

**11.5 Browser/device reliability benchmarks for educational hand-tracking.**
Tracker-health by browser/OS/region is already partially captured. Extended over years, it becomes a public reference cited by every Chromebook OEM and by every other hand-tracking EdTech vendor.

**11.6 Curriculum-coverage attestation as a school-procurement asset.**
"This platform addresses 87% of EYFS Early Learning Goals in Physical Development and Literacy" — sourced from the live `curriculum_map` — becomes a sales document a sales team can stand behind, not marketing language a sceptical head teacher will dismiss.

**11.7 A peer-reviewed research footprint.**
Two or three published papers (efficacy study, retention study, an IRT calibration methods paper) make every grant application defensible and every investor due-diligence call short. The cost is one PhD-level collaborator and a publication calendar.

**11.8 The privacy posture itself as a moat.**
"No video, no faces, no PII, on-device tracking, k-anonymised reporting" is a marketing line today; in 24 months, as the UK and EU tighten enforcement on ed-tech data practice, competitors will be re-architecting. The platform is already there. Make it loud.

---

## 12. How to Scientifically Validate Learning Improvement Over Time

The single most important question. The answer is a *programme*, not a single number.

### 12.1 Within-subject longitudinal claims (the platform's default)

For every actively-engaged learner with ≥6 weeks of consented data:
- Skill rating *θ* trajectory per skill family, fit as a linear mixed model with random intercept per learner.
- Reported: mean slope (Δθ per week), 95% CI, effect size.
- Filtered: only sessions above `session_quality_score` threshold.
- Caveats stated explicitly: regression to the mean, selection effects, lack of control.

This is honest "improvement over time" and is suitable for marketing and product analytics but **not** sufficient for grants and peer review on its own.

### 12.2 Within-subject pre/post on out-of-platform assessment (the grant-ready claim)

The baseline-and-endline schools protocol (§8.3). Paired-sample t-test (or Wilcoxon if non-normal), within-subject Cohen's *d*, 95% CI, pre-registered. This is the slide a learning scientist will accept.

### 12.3 Between-groups quasi-experimental design (the institution-ready claim)

The waitlist-control protocol (§8.4). Independent-samples comparison at mid-point, within-subject at endline. Pre-registered with the Open Science Framework. ANCOVA controlling for baseline. This is what a journal will accept.

### 12.4 Randomised micro-A/B at the difficulty step (the research-grade ongoing claim)

Within the live platform, at each calibration step, randomise the level of scaffolding or the difficulty progression. Use the `dashboard_ab_results` infrastructure but extend the outcome variable from engagement to *learning velocity*. This is rolling experimental evidence with internal validity.

### 12.5 Open data, open methods

Wherever ethics permit (research-cohort, k-anonymised), publish summary datasets to a repository (OSF / Zenodo). Pre-register every efficacy study. The combination of a private item bank (§11.1) and open summary results is the strongest possible posture: defensible privacy + transparent science.

### 12.6 Triangulation

Any single claim ("the platform improves letter recognition") is much stronger when three independent measures point the same way:
- In-platform skill rating trajectory (12.1)
- Pre/post external assessment (12.2)
- Decay-probe survival (§5.6 + §6.5)

A grant panel that sees three independent lines of evidence converging is a grant panel that funds.

### 12.7 Honest negative findings

The platform must commit to publishing negative or null findings from research-cohort studies. This is what separates an EdTech product from an EdTech *science programme*, and it is what wins the long game with universities, accelerators, and government funders.

---

## Closing

The current pipeline has the right bones — privacy-first, unified events, mirrored facts, a usable dashboard. It is engineered conscientiously. What it lacks is *time depth and learning depth*: state-over-time, gesture-quality detail, calibrated difficulty, structured assessment moments, decay and transfer probes, classroom as a first-class entity, and a validation protocol that survives external review.

Adding those is a phased 8–12-week engineering programme. It does not require deprecating anything. It does not compromise the privacy posture; arguably it strengthens it (k-anonymity on Gold, pseudonymous `learner_uid`, explicit research-cohort segregation). It produces, within one quarter, the platform's first defensible statement that children *measurably improved while using the platform* — and within two quarters, the first peer-review-ready efficacy paper.

That is the shift the company asked for. The architecture above is how it gets built.
