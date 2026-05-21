# Draw in the Air — Instructional Intelligence Architecture

**The teaching layer. The runtime decision system. The trust, friction, adaptation, resilience and observability architecture that turns the measurement stack into a Learning Intelligence Operating System.**

Prepared: May 2026
Companion to: *Draw in the Air — Learning Intelligence Strategy* (Document A)
Audience: Engineering, Leadership, Investors, School & Grant Partners, Learning Scientists, Clinical Partners
Status: Strategic blueprint — defines the "how it teaches" half of LIOS

---

## 0. Executive Summary

Document A specified how Draw in the Air *measures* learning — pseudonymous skill rating, mastery episodes, decay probes, transfer probes, classroom dimension, gesture-quality scalars, pre/post protocols, dashboards. It is a measurement architecture. On its own it cannot make children improve faster; it can only describe whether they did.

This document specifies how the platform *teaches*. It defines six layers that sit alongside the measurement stack and turn the platform from "advanced telemetry" into an intelligent, adaptive, classroom-resilient, scientifically defensible learning system. Together, Documents A and B form a single architecture we call the **Learning Intelligence Operating System (LIOS)** — measurement + instruction, sensing + adaptation, observation + response.

The central premise of this document is that **better instrumentation does not, on its own, produce better learning**. A cleaner microscope does not heal the patient. Without the layers below, the measurement stack risks measuring noise more accurately, drawing false-confidence conclusions from contaminated attempts, presenting telemetry as truth without the qualitative ground-truth that calibrates it, and shipping engagement-flavoured engineering into the chaos of real classrooms.

LIOS, complete, has six pillars:

1. **Sensing** — telemetry, gesture quality (Document A §2).
2. **Trust** — credibility scoring on every attempt before it touches the measurement layer (Document B §3).
3. **Measurement** — skill rating, mastery, retention, transfer (Document A §4–6).
4. **Adaptation** — the real-time teaching engine that responds to behaviour (Document B §4–8).
5. **Resilience** — classroom and infrastructure robustness so the system survives the real world (Document B §10–11).
6. **Governance** — scientific advisory, ethics, validation, privacy (Documents A §8–9 + B §12).

This document specifies pillars 2, 4, 5, 6 in detail. It also reframes the company's competitive moat: Draw in the Air's true defensibility is not "an EdTech product"; it is a **movement-interaction intelligence company** with a first market in early-years learning and an obvious expansion arc into occupational therapy, rehabilitation, accessibility, motor assessment, and gesture computing. The data architecture should quietly anticipate that arc from today.

---

## 1. Repositioning: From Analytics System to Learning Intelligence Operating System

Language matters. "Analytics" describes observation. "Operating system" describes foundation. The shift is not cosmetic — it is how investors, partners, schools, regulators, and the team itself think about what is being built.

A Learning Intelligence Operating System has, by analogy to a computing OS:
- A **kernel** (the real-time adaptive engine that decides what happens next).
- A **driver layer** (sensing, telemetry, gesture pipeline).
- A **filesystem** (the longitudinal data architecture from Document A).
- A **process manager** (classroom orchestration: who is using which device, when, under what context).
- A **scheduler** (decay probes, transfer probes, micro-assessments, fatigue breaks, intervention prompts).
- A **permissions and security model** (privacy posture, ICO Children's Code, k-anonymity, learner_uid derivation).
- A **system observability layer** (engineering SLOs and pipeline-integrity dashboards).
- An **applications layer** (the actual activities: Word Search, Gesture Spelling, Bubble Pop, Rainbow Bridge, etc., which become *replaceable* under a stable OS).

This reframing has direct strategic consequences:

- **For investors:** the platform is not a single product; it is the platform for any movement-mediated learning or assessment use case, and the moat scales with hours of telemetry across populations no competitor has access to.
- **For schools:** the platform is not a single app; it is the infrastructure on which a school's air-gesture-based curriculum is built, with adaptive teaching baked in.
- **For partners (OT, SEN, rehab):** the platform is not a children's product; it is a movement-intelligence platform that has been hardened on the hardest user population (4-year-olds in classrooms) and is therefore robust enough for clinical adjacencies.
- **For engineering:** there is a stable kernel and a replaceable applications layer. New activities ship as plugins; the OS does the heavy lifting.

The remaining sections of this document describe the layers of the OS that are not yet built.

---

## 2. The Instructional Intelligence Layer — Principles

Before the engineering specs, the principles that govern instructional decisions across the platform. These are non-negotiable design rules; every adaptive behaviour must trace back to one.

**2.1 The desirable-difficulty target.**
The instructional engine targets a probability of correctness of approximately **0.75–0.85** at each attempt. Below 0.55 the child is over-challenged and will frustrate. Above 0.92 the child is under-challenged and will bore. The platform constantly steers toward the desirable-difficulty band using the live Elo rating and item difficulty.

**2.2 Success precedes complexity.**
A new skill, a new game mode, a new level begins below the difficulty target and ramps upward only after two consecutive successes at the current step. Mastery is built on successful repetition first, novelty second.

**2.3 Recovery is engineered, not hoped-for.**
After failure, the platform never simply re-presents the same item. It either decomposes the item (lower scaffold level), substitutes a sibling item (same skill family, simpler instance), or transitions to a previously-mastered confidence-builder. Three consecutive failures *must* trigger a recovery branch — not a fourth attempt.

**2.4 Reward timing matters more than reward magnitude.**
Celebrations fire within 400ms of success. Late celebrations are perceived as separate events, not as feedback. Audio cues are <300ms; visual cues <500ms. This is not aesthetic preference; it is documented in feedback-learning research.

**2.5 Confidence is a first-class objective, equal to accuracy.**
A child who succeeds with high confidence has learned more than a child who succeeds with hesitation. The engine optimises for confidence trajectory alongside accuracy trajectory, and will trade a small amount of accuracy progression for a faster confidence trajectory in early-years and SEN learners.

**2.6 The teacher overrides the algorithm.**
Any teacher-set instructional preference (e.g. "pin this child to lowercase letters for two weeks") supersedes algorithmic routing. The system is a partner, not a substitute.

**2.7 Children are not adults; the engine is calibrated to development stage.**
Every threshold (desirable difficulty band, frustration window, fatigue threshold, scaffold timing) has age-band overrides. A 4-year-old's frustration window is 90 seconds; an 8-year-old's is 4 minutes. These are calibrated empirically per cohort, not assumed.

**2.8 Privacy posture is preserved at the instructional layer.**
Adaptive decisions are computed locally where possible. Where server-side decisions are required, they consume only the same pseudonymous learner record described in Document A §9. No new identifying signal is introduced by adaptation.

---

## 3. The Behavioural Trust Layer — Attempt Credibility Scoring

**The single most important missing piece.** Without this, the Elo system, the mastery model, the retention curves and the published efficacy claims are all eventually polluted by attempts that look like learning but are not.

### 3.1 The problem

A child waving their hands chaotically, an adult assisting, a sibling jumping in, a webcam blocked then unblocked, an excited celebration interrupting a stroke, a tracker losing the hand and re-acquiring on a piece of furniture — every one of these produces an `item_dropped` event with a `was_correct` and a `ms_to_attempt`. The current measurement layer cannot distinguish them from genuine learning. Over months, this drift becomes invisible and the data becomes quietly unusable for the very claims the company most needs.

### 3.2 The solution

Every attempt carries a **credibility score `c ∈ [0, 1]`** computed at ingestion time. The score gates two downstream effects:

- **Elo update weight:** `θ_new = θ_old + c · K · (outcome − P_expected)`. Low-credibility attempts move the rating less.
- **Mastery and efficacy claim eligibility:** attempts with `c < threshold_publication` (default 0.6) are excluded from any externally-shipped efficacy claim. They are kept for internal product analytics but stamped accordingly.

### 3.3 Inputs to credibility scoring

Computed at the moment the attempt resolves, locally where possible:

- **`tracker_confidence_mean`** — MediaPipe per-frame hand-detection confidence averaged over the attempt window.
- **`gesture_coherence`** — angular consistency of the gesture path; random waves have low coherence, intentional strokes have high coherence.
- **`response_time_plausibility`** — `time_to_first_movement_ms` within the empirical age-band distribution; <50ms is suspicious (faster than reflex on a recognition task), >15s suggests distraction or absence, neither is a clean learning attempt.
- **`velocity_in_human_bounds`** — mean velocity within plausible motor envelope; outside (too slow, too fast) suggests tracker drift or chaotic motion.
- **`movement_entropy`** — Shannon entropy over the directional histogram of the gesture; high entropy = random motion, low entropy = directed stroke.
- **`adult_hand_likelihood`** — derived from MediaPipe's skeletal proportions only (palm size, finger ratios) compared to age-band norms. *Never* from image features, never identifying — just "is the hand size in the child distribution for the registered age band?" If not, attempt credibility falls.
- **`multi_hand_in_frame`** — if a second hand appears during the attempt, credibility falls (and the system may pause and prompt "one at a time").
- **`session_quality_score`** — overall session health from Document A §2.5 acts as a prior on attempt credibility.
- **`prior_consistency`** — does this attempt fit the learner's recent gesture profile, or is it an outlier? A child whose previous 30 attempts had `path_efficiency` in [0.6, 0.85] suddenly producing 0.15 → low credibility; probably contaminated.
- **`prompt_to_action_window`** — if the action began before the prompt finished rendering, the child cannot have responded to it; credibility falls (or the attempt is reclassified as not-actually-a-response).

### 3.4 Credibility model

Two implementations:

- **v1 — rule-based, ships first.** Hand-tuned thresholds against each input, combined as a weighted product. Cheap, debuggable, defensible to a school. This is what ships in Sprint 1.
- **v2 — supervised classifier.** Trained on a labelled subset where teachers (via the Human Observation Layer, §9) and engineers have ground-truth-tagged attempts as `credible / contaminated / ambiguous`. The classifier is a small gradient-boosted model running server-side at ingestion. Audit-friendly: every credibility decision exports its input features and feature contributions, so any teacher or researcher can ask "why did the system trust or distrust this attempt?"

### 3.5 The trust hierarchy

A simple three-tier trust hierarchy on every attempt:

- **Tier A — High credibility (`c ≥ 0.8`).** Full Elo weight. Eligible for all internal and external claims. Counted in mastery episodes.
- **Tier B — Medium credibility (`c ∈ [0.4, 0.8)`).** Reduced Elo weight. Counted toward mastery only if surrounded by Tier-A confirmation. Excluded from published efficacy.
- **Tier C — Low credibility (`c < 0.4`).** Quarantined. Kept for engineering diagnostics, never updates skill ratings, never enters any mastery decision.

Dashboards show, for any given cohort, the **trust composition** of the underlying data ("84% Tier-A, 13% Tier-B, 3% Tier-C") so that the audience can audit the quality of the data underlying any chart. Investors and grant reviewers will appreciate this discipline.

### 3.6 Why this is critical

Most EdTech companies that publish efficacy numbers cannot defend them under cross-examination because their attempt populations are dirty. By baking attempt-level credibility into the architecture from day one, Draw in the Air's efficacy numbers become the rarest thing in the sector: numbers that survive an adversarial audit.

---

## 4. Cognitive Friction Architecture

The platform must distinguish "I don't know this skill" from "this interface overloaded me." They produce identical low-accuracy signals at the surface. They require completely different responses.

### 4.1 The cognitive states the engine must distinguish

- **Successful learning.** P(correct) ≈ 0.78, confidence stable, time-to-first-movement trending down.
- **Productive struggle.** P(correct) ≈ 0.55–0.7, confidence holding, retries reducing across attempts.
- **Cognitive overload.** Time-to-first-movement spikes, errors followed by long pauses, prompt repeats used, gesture amplitude drops (withdrawal). The child is overwhelmed, not unable.
- **Decision fatigue.** Latency increases steadily across consecutive attempts within a session, regardless of difficulty. The child is tired.
- **Attention collapse.** Long pauses, multiple prompt repeats, gaze stability proxies (without face data — derived from how often the hand is in the active zone), eventual abandonment.
- **Over-challenge.** P(correct) < 0.4 sustained, frustration markers (rapid retries, no recovery, gesture amplitude high but inaccurate).
- **Boredom / under-challenge.** P(correct) > 0.95 sustained, decreasing engagement (slower returns, shorter sessions, abandonment at high accuracy).
- **Distraction / off-task.** Movement entropy high, prior-consistency low, tracker confidence variable — likely environmental distraction.

### 4.2 Detectors

Each state has a detector running every attempt with hysteresis (must persist for N attempts to fire, must absent for M attempts to clear). Detectors emit named events (`cognitive_overload_detected`, `decision_fatigue_detected`, `boredom_detected`, `over_challenge_detected`, `attention_collapse_detected`, etc.) into the same event pipeline. These are first-class learning events, recorded alongside attempts.

### 4.3 Responses

Each detector wires to one or more responses in the Adaptive Learning Engine (§5):

| State detected | Response |
|---|---|
| Cognitive overload | Simplify visual scene; remove non-essential UI; slow prompt delivery; switch to lower-load activity variant |
| Decision fatigue | Offer a 30-second movement break or a celebration activity; cap session length suggestion |
| Attention collapse | Re-engagement prompt; voice / character interaction; pause activity |
| Over-challenge | Drop difficulty by 1 step; add scaffold; rotate to confidence-builder |
| Boredom | Increase difficulty by 1 step; rotate to novel skill family; introduce a transfer probe |
| Distraction / off-task | Pause; do not record attempts; resume on re-engagement |

### 4.4 SEN, ADHD, ASD calibration

Default thresholds will not fit neurodivergent populations. A child with ADHD may show what looks like attention collapse far earlier; a child on the autism spectrum may have a much longer time-to-first-movement that is *not* overload but consideration. The architecture supports **profile overrides** at the classroom and learner level:

- `profile = {standard, focused, gentle, deliberate, accessibility-motor}` etc.
- Each profile shifts thresholds for every detector and every response.
- Profiles are set at the classroom level (with a teacher's pedagogic judgement) or at the learner level (where an OT or SEN coordinator opts in).
- Profiles never imply diagnosis. The platform does not assign or store clinical labels.

### 4.5 Why this matters strategically

The SEN/ADHD/ASD population is one of the highest-value markets for Draw in the Air precisely because hand-gesture interaction sidesteps many barriers other interfaces impose. Building cognitive friction detection in early makes the platform deployable in OT clinics, SEN schools, and specialist provision — markets where competitors cannot follow without re-architecting.

---

## 5. The Adaptive Learning Engine (Real-time)

The kernel of the LIOS. Runs in-session, makes the next decision on every attempt.

### 5.1 Inputs

- Current learner state: `θ` per skill, confidence index, motor-precision index, current cognitive state from §4.
- Current item history this session: items shown, outcomes, scaffold levels.
- Session quality: `session_quality_score`, attempt credibility distribution so far.
- Classroom / profile overrides.
- Teacher pins (skills the teacher has prioritised).

### 5.2 The decision

On every attempt resolution, the engine selects:

- **Next item** — which `item_uid` to show next (from the current skill, from a confidence-builder, from a transfer probe, from a decay probe, from a new skill).
- **Scaffold level** — full guidance / partial guidance / no scaffold.
- **Modality** — visual + audio prompt / visual only / character-prompted.
- **Reward intensity** — quiet success / standard celebration / big celebration.
- **Break suggestion** — none / 30-second movement break / "let's stop here."
- **Teacher signal** — none / soft flag ("Sophie may be tiring") / intervention flag.

### 5.3 The decision policy

A two-tier policy: a **contextual multi-armed bandit** doing the routine routing, with a **rule-based safety net** that enforces invariants. The bandit selects from an action set conditioned on state; the rule-based layer vetoes selections that violate guarantees.

**The bandit (Thompson Sampling on a contextual model):**

- Action space: `(item_uid, scaffold_level, modality)`.
- Reward signal: composite of accuracy gain, confidence gain, credibility, and a small penalty for cognitive friction state transitions toward overload.
- Context: learner state vector (θ per skill, CI, MPI, age band, profile, recent fatigue index).
- Updated nightly per learner; warm-started for new learners from age-band cohort priors.

**The rule-based safety net (non-negotiable invariants):**

- Never present the same `item_uid` more than 3 times consecutively.
- Never present an item with predicted P(correct) < 0.5 to a child currently in a frustration state.
- Never present a transfer probe to a learner with `session_quality_score` < 0.5.
- After mastery state transition, always insert a celebration moment within 400ms.
- After 3 consecutive failures, force a recovery branch (§6).
- After a `decision_fatigue_detected` event, propose a break before the next attempt.
- Never exceed teacher-pinned skills' weight ceiling.

### 5.4 Real-time vs near-time

Decisions that *must* be real-time (sub-100ms): next item, scaffold level, reward intensity. These run client-side on the learner's device against a locally-cached state.

Decisions that can be near-time (5-minute job latency tolerable): updating the contextual bandit's parameters, recalibrating thresholds, scheduling decay probes for the next session, queueing teacher signals.

This split keeps the system responsive on poor connectivity (a critical resilience property — see §10) without sacrificing the precision of nightly recalibration.

### 5.5 Auditability

Every decision the engine makes is logged: the input state, the action selected, the rule overrides applied. A research collaborator must be able to ask, six months later, "why did the system show letter `b` at scaffold level 2 to this learner at this moment?" and receive a complete answer. This is what separates a defensible adaptive system from a black box. It is also what enables every published efficacy claim to be re-run from raw logs.

---

## 6. Frustration Recovery & Confidence Rebuilding Systems

A specialised sub-system of the Adaptive Engine, treated separately because its behaviour is the most critical to the *child's experience* and to the parent's trust.

### 6.1 Frustration detection

A composite frustration index per attempt:

`F = w₁·(retries_since_last_success) + w₂·(time_to_first_movement_spike) + w₃·(amplitude_variance) − w₄·(within_session_recovery_score)`

Weights age-band and profile-calibrated. F crossing threshold for ≥2 consecutive attempts fires `frustration_detected`.

### 6.2 The recovery sequence

A deterministic state machine, not a soft suggestion:

1. **Soft scaffold raise.** Add a tracing guideline, slow the prompt, increase reward salience. One attempt at the same item.
2. **If still failing → sibling substitution.** Swap to a same-skill-family item one difficulty step easier. One attempt.
3. **If still failing → confidence rebuild.** Switch to a previously-mastered item with high celebration intensity. Two attempts.
4. **If frustration not clearing → activity rotation.** Move to a different game mode entirely with high-mastery items. 30–60 seconds.
5. **If frustration still persists → graceful exit.** Offer "let's stop here for now" with positive framing; flag the teacher; preserve session state for return.

Each transition is logged. The recovery sequence's effectiveness is itself measured and tuned (which step rescues frustration most often? for which profiles?).

### 6.3 Confidence rebuilding

Separate from frustration recovery (which is reactive), confidence rebuilding is *proactive*. The engine maintains a per-learner `confidence_baseline` per skill family. When CI on that family drops below 0.7 × baseline for two consecutive sessions, the engine schedules a confidence-builder block at the next session start — three to five items the learner mastered weeks ago, with high celebration intensity. This re-anchors the child before any new challenge is introduced.

### 6.4 Why this matters

A child who associates the platform with feeling stupid will never become a mastered learner regardless of how good the data layer is. Frustration recovery is the most important runtime feature in the product. It is also what schools and parents notice first: "my child *enjoys* practising letters now" is the testimonial that closes a school deal, and it is engineered, not lucky.

---

## 7. Flow, Boredom & Attention Detection

A briefer section because the mechanisms overlap with §4 and §5, but worth specifying explicitly because these states drive opposing responses.

### 7.1 Flow

Indicators: P(correct) in band, time-to-first-movement stable within learner's own distribution, no abandonment, no excessive replay, gesture quality high. When detected, the engine *protects* it: no break suggestion, no modality switch, no new skill introduction. Keep the child in the band.

### 7.2 Boredom

Indicators: high accuracy sustained, declining session duration trend, declining return rate, lower gesture amplitude. When detected, the engine *escalates*: difficulty step up, novel skill family introduction, a transfer probe, an unfamiliar game mode.

### 7.3 Attention

Indicators: prompt-repeat usage, long pauses, low active-zone time. When detected, the engine *re-engages*: a character interaction, a brief animation, a movement-based attention reset, then resume.

These three detectors are mutually exclusive — at any moment exactly one is active. The engine maintains state across attempts; a single attempt does not flip the regime.

---

## 8. Personalised Activity Routing

Routing is *which game mode and which content the learner sees next session* — a longer-horizon decision than the within-session adaptive engine. It runs server-side, nightly, per learner.

### 8.1 Inputs

- Long-horizon learner state: skill ratings, mastery counts, learning velocity per family.
- Engagement profile: which game modes this learner returns to, which they abandon.
- Curriculum alignment: which framework strands are under-covered.
- Teacher pins.
- Cohort priors (warm start for new learners).

### 8.2 Routing decision

Selects:
- The mix of skills the next session will emphasise (with weight ratios).
- The game modes to prioritise (the learner's "preference profile" combined with curriculum coverage).
- The decay-probe and transfer-probe inserts for the next session.
- Optional novelty injection (a new activity the learner hasn't tried).

### 8.3 Cold-start

A new learner has no history. The router uses age-band cohort priors and a brief calibrated entry sequence (60 seconds across three skill families) to establish a starting θ. From session 3 onward the router uses real history.

### 8.4 Anti-monotony

A hard rule: no learner sees the same game mode for more than 60% of any session and no more than 4 consecutive sessions. This protects against routing collapse into a local engagement optimum (the "fun activity loop" that doesn't advance learning).

### 8.5 Curriculum coverage as a constraint

The router runs subject to a constraint: each week, the learner should be exposed to a configurable proportion of the curriculum strands the teacher (or default framework) has prioritised. The constraint is soft — adaptive learning trumps curriculum tick-boxing when the two conflict — but it ensures the platform delivers what schools were promised.

---

## 9. The Human Observation Layer

The hardest argument in this entire architecture: telemetry is not enough.

### 9.1 Why telemetry alone overfits

Telemetry sees what cameras see. It does not see:
- A child copying their neighbour.
- A child being verbally coached by an adult off-camera.
- A child who is succeeding mechanically but disengaged emotionally.
- A child who is struggling but resilient.
- A child whose performance is shaped by a row with their sibling that morning.
- A child who is *brilliant* at the task but bored because they've outgrown the level.

These are the things teachers see. Without their signal, the platform can chart a beautiful, statistically significant rise in θ that misses the most important thing in the room.

### 9.2 The teacher tagging UX

After any classroom session (or on demand), the teacher gets a one-tap tagging surface on their iPad / tablet. For each child:

- **Engagement:** focused / distracted / disengaged.
- **Affect:** confident / calm / hesitant / frustrated.
- **Independence:** independent / supported / required intervention.
- **Social:** alone / collaborated / disrupted by peer.
- **Notable:** new behaviour (good or concerning).

Plus a free-text 20-character "anything else?" field, kept on the teacher's device unless they explicitly choose to share with the school.

The interaction must be sub-30-second for a whole class. Anything slower will not be used and the layer fails.

### 9.3 The parent equivalent (optional)

End-of-week, opt-in: a 2-tap email or in-app prompt asking "this week with Sophie went…" with three options (great / mixed / tough). Aggregated qualitatively. Never an interrogation, never a grading interface.

### 9.4 How these signals enter the architecture

A new fact table, `human_observation_fact`, with columns: `observer_role`, `learner_uid`, `session_uid (optional)`, `tags[]`, `timestamp`. The observation joins to attempt and session facts by time window.

Used for:
- **Ground truth labelling.** Tagged "frustrated" sessions train the cognitive-friction classifier (§4). Tagged "assisted" attempts train the credibility classifier (§3). This is how the system learns to see what the teacher sees.
- **Qualitative dashboards.** Alongside every quantitative chart, the teacher's tag distribution for the same window appears. A learning velocity rising while teacher tags trend "frustrated" is a red flag; a learning velocity flat while teacher tags trend "confident" is a green flag.
- **Calibration of the engine.** The Adaptive Learning Engine consumes recent teacher tags as a state input. A child tagged "frustrated" twice this week gets gentler routing for the next sessions.
- **Efficacy validation.** Published efficacy reports include teacher-tag-corroborated trajectories, which is what an academic reviewer needs to be satisfied that the children weren't merely performing for the camera.

### 9.5 Privacy

Tags are about a pseudonymous learner, not a named child. The teacher's local roster maps roster position to a name on their own device and is never transmitted. The platform sees `tag: focused, learner: a4f9…, session: 88b2…` — and that's all.

### 9.6 Why this is the layer that earns institutional trust

Every learning scientist, every grant reviewer, every head teacher reading the dashboard will eventually ask the same question: *how do you know the numbers aren't fooling you?* The Human Observation Layer is the answer. It is what makes the rest of the architecture defensible at the level the company needs.

---

## 10. Classroom Resilience Architecture

Real classrooms break every assumption a software architect would like to make. The platform must be designed for them, not against them.

### 10.1 Real-classroom failure modes

- A single tablet shared by 5–30 children in rapid rotation.
- Bad school Wi-Fi (≥1 in 4 UK primary schools reports connectivity issues during lessons).
- Noisy rooms — audio prompts overwhelmed by ambient sound.
- A child mid-session is called away (toilet, bus, fire drill, change of activity).
- Two or three children crowd one screen, hands cross, the wrong hand is detected.
- Teacher walks in and physically nudges the device or camera.
- The camera is occluded by a thumb.
- The classroom transitions abruptly — "tablets away in 30 seconds, we're moving to maths."
- A child uses the platform once, vanishes for two weeks, returns.
- A device update mid-session triggers a browser reload.

### 10.2 Architectural responses

**Shared-device mode with explicit handoff.**
When a session ends or after N seconds of inactivity, the platform shows a "Whose turn next?" screen with the classroom's roster avatars. The teacher (or child) selects, and the next learner's pseudonymous state is loaded. The previous learner's session is gracefully closed, never blended.

**Offline-first everything.**
The existing client offline queue (Document A) is preserved and extended. The Adaptive Engine runs against a locally-cached state. Routing decisions for the next session are pre-computed at the end of the previous one. The platform is functional with zero connectivity for a full school day; sync happens opportunistically.

**Audio-with-visual-fallback.**
Every audio prompt has a visual equivalent, displayed simultaneously. If the device's microphone-context detects ambient noise above a threshold (no audio captured, just RMS level), the platform auto-elevates the visual prompt. Noisy rooms remain usable.

**Mid-session pause / resume.**
A `pause_session` state preserves attempt history, frustration state, queued routing decisions. Returning within 30 minutes resumes seamlessly; later returns trigger a fresh session with carry-over state.

**Multi-hand detection and arbitration.**
If two distinct hands are persistently in frame during an attempt, the platform pauses, animates a friendly "one at a time" character, and waits. The attempt is quarantined (Tier C credibility) so the data layer is not contaminated.

**Camera-moved recovery.**
If the active hand zone changes by more than a threshold mid-session (tracker frame of reference jumps), the platform initiates a 5-second recalibration before resuming.

**Teacher "pause class" mode.**
A single teacher control across the classroom pauses every device in the room (over the school's local network or, if offline, via a periodic check). Used for transitions, announcements, demonstrations. Resume returns each child to their own state.

**Re-entry on long absences.**
A learner returning after >14 days starts the session with a 60-second decay probe block. The session itself is shorter and gentler. Routing is re-anchored before pushing forward.

**Device-update interruption resilience.**
The offline queue persists all unsent attempts in IndexedDB; a forced browser reload does not lose them.

### 10.3 The classroom-friction dashboard

Engineering needs a dashboard showing the *operational* health of classrooms: % of sessions interrupted, % of sessions in shared-device mode, average handoff time, % of attempts quarantined for multi-hand, average reconnection time after a Wi-Fi blip. This is where the platform finds its real-world bottlenecks and ships fixes before schools complain.

### 10.4 Why this matters strategically

School districts evaluate platforms by their worst classroom, not their best. A platform that works beautifully in a quiet 1:1 room and breaks in a 30-child noisy classroom does not get adopted. Classroom resilience is the moat against every cleaner-pitched competitor that has never actually deployed at scale.

---

## 11. Infrastructure Observability Layer

This is the layer that the original document gestured at ("bugs in the behaviour of the data centre") but did not specify. Without it, the platform will eventually make decisions off corrupted data and not know.

### 11.1 What needs to be observed

**Ingestion path:**
- Events ingested per minute (with baselines per hour-of-day, day-of-week).
- Idempotency collision rate (% of events rejected as duplicates).
- Offline-queue flush latency distribution.
- Schema validation failure rate.
- Average and p99 ingestion latency.

**Data quality:**
- Distribution of `session_quality_score` over rolling 24 hours.
- Distribution of attempt credibility scores.
- % of sessions below quality threshold (excluded from claims).
- Anomalous event-frequency patterns (e.g. sudden spike in `stuck` events suggests a tracker regression).

**Client health:**
- FPS distribution by device tier and browser.
- Tracker init success / failure by build version.
- Browser crashes per build version.
- Camera-permission grant rate by build version.

**Pipeline integrity:**
- Sequence gaps in `client_seq` per session (missing events).
- Clock-skew distribution (client_ts vs occurred_at).
- Replay/duplicate event detection (same `event_uid` arriving from multiple sources).
- WebSocket / fetch failure ratio.

**Adaptive engine health:**
- Decision latency distribution.
- Rule-override frequency (how often the safety net catches the bandit).
- Bandit reward signal stability.
- Recovery sequence engagement rate (how often each step rescues frustration).

### 11.2 SLOs (Service-Level Objectives)

Concrete, alarmable targets the platform commits to:

- **Event durability:** ≥99.5% of attempts produced on-device successfully ingested within 10 minutes (offline-queued + flushed).
- **Idempotency:** ≤0.1% duplicate event_uid acceptance.
- **Ingestion latency:** p99 < 2s online; offline backlog flush p99 < 60s on reconnection.
- **Session-quality acceptance:** ≥85% of attempts above publication credibility threshold across the full population.
- **Tracker init success:** ≥95% of sessions reach tracker-ready state within 8 seconds.
- **Adaptive engine availability:** ≥99.9% of next-item decisions delivered within 200ms locally.
- **Schema integrity:** ≥99.99% of events conform to the active schema version.

Every SLO has a dashboard tile, an alarm, and an on-call response document.

### 11.3 Anomaly detection

A separate ML job (small autoencoder over event-rate vectors per hour, per build, per device tier) flags anomalies and posts to engineering. Examples it should catch: a new browser version breaking the tracker; a deploy introducing a duplicated event firing; a tablet model class with FPS degradation; a country going dark.

### 11.4 Why this matters

The single quietest way a product like this dies is through invisible data corruption — the dashboards still look great, the slides still ship, but the underlying data has been wrong for three months and the company finds out from a researcher who tried to reproduce a result and couldn't. The observability layer is insurance against that fate.

---

## 12. The Scientific Advisory Layer

External validation partners. Not optional for the company's stated ambitions.

### 12.1 The roles to recruit

- **University learning scientist.** Sets the efficacy methodology, co-authors papers, brings academic standing. Ideal: early-years education researcher at a Russell Group / R1 institution with a publication record in literacy or numeracy interventions.
- **Child development specialist.** Calibrates age-band thresholds and developmental appropriateness; oversees the cognitive-friction architecture's age-stage validity. Ideal: developmental psychologist with applied experience.
- **Occupational therapist advisor.** Calibrates motor-precision norms, advises on SEN/accessibility profiles, opens the door to clinical adjacency. Ideal: paediatric OT with research footprint.
- **Curriculum expert.** Maintains the curriculum_map across EYFS, KS1, Common Core K–2, MOE NEL, etc. Ideal: former curriculum lead in a national framework body.
- **Statistician.** Reviews the IRT, mixed-models, and validation protocols. Ideal: applied statistician with experience in educational measurement.

### 12.2 Engagement model

Paid hourly retainers, named on an Advisory Board, surfaced publicly on the website's "science" page, contributing to or co-authoring published research. Quarterly board meetings. NDAs as appropriate but never gagging — advisors must be able to honestly tell the company "this finding is overstated."

### 12.3 Ethics governance

For research-cohort studies, the platform engages a recognised ethics review (IRB equivalent — in the UK, an HRA-affiliated research-ethics committee; in the US, an institutional IRB if studying in partnership with a US university, or a commercial IRB otherwise). No published efficacy study ships without prior ethics approval. Pre-registration with the Open Science Framework is the default posture.

### 12.4 Why this matters

The company will, within 18 months, hit the wall where investors and grant reviewers stop accepting founder-attested claims and start asking "who has reviewed this?" The Scientific Advisory Layer is the answer. It is also what unlocks academic partnerships that yield free, credible PR every time a paper is published.

---

## 13. The Broader Moat — Movement Interaction Intelligence

The largest strategic shift in this document is positioning. Draw in the Air is not, fundamentally, an EdTech company. It is a *movement-interaction-intelligence* company with an early-years-literacy first market. The data architecture should anticipate that from today.

### 13.1 What the platform actually accumulates

Across thousands of children and adults, across age bands and device tiers, across schools and homes, the platform accumulates the world's largest privacy-safe corpus of:

- Calibrated **air-gesture trajectories** for letter, numeral, shape, and symbol formation.
- **Motor-precision norms** indexed by age, condition, and context.
- **Visual-motor-integration developmental curves** across populations.
- **Skill-acquisition and retention curves** for gesture-mediated tasks.
- Real-world **tracker reliability** data across browsers, devices, lighting conditions, and demographics.

This corpus is the moat. No competitor can replicate it without going through years of children in classrooms. Schools opt in to the data architecture precisely because the platform is privacy-safe; this gives the company a structural advantage adult-only platforms cannot reach.

### 13.2 Adjacent markets the architecture quietly unlocks

- **Paediatric occupational therapy.** Motor-precision percentiles per age, in-clinic adjustments, gamified home programmes. The same engine, the same gesture-quality scalars, the same adaptive logic — different content surface.
- **SEN provision.** ADHD-, ASD-, dyspraxia-friendly profiles already built into the cognitive-friction architecture.
- **Adult rehabilitation.** Stroke recovery, hand-function rebuilding, post-injury physical therapy. Identical sensing stack, different population, different content.
- **Elderly motor and cognitive assessment.** Early markers of Parkinson's, mild cognitive impairment. The gesture-quality vector is precisely what neurology research wants.
- **Accessibility.** Hands-free / motor-impaired computer use. A by-product of having built the most resilient hand-tracking interaction layer in the consumer space.
- **Sports skill assessment.** Air-traced technique analysis for young athletes.
- **Gesture computing more broadly.** Licensing the SDK for movement-based UX in other consumer or enterprise apps.

### 13.3 How to anticipate this without diluting the current product

The instruction this document gives engineering is *not* to ship those markets now. It is to keep the **data model, the credibility layer, the engine interfaces, and the curriculum_map** abstract enough that the same skeleton serves them when the time comes.

Specifically:
- `skill_uid` is a UUID with a `domain` (currently "early-literacy", "early-numeracy", "early-motor") rather than letter-only.
- `item_uid` carries a `task_type` (currently "letter-trace", "shape-trace", "quantity-touch") rather than activity-only.
- The credibility layer's inputs are domain-agnostic; the same scoring logic serves an adult's stroke-rehab attempt as a child's letter-`b`.
- The Adaptive Engine reads context from a profile object, not hard-coded children-only assumptions.
- The privacy posture (no PII, on-device-processing, pseudonymous IDs) ports directly to clinical settings under HIPAA / equivalent.

This is the discipline of a platform company, even before the platform is launched as one.

### 13.4 Investor framing

The framing for the next funding round is therefore:

> *We are the leading privacy-safe movement-interaction intelligence platform. Our first market is early-years learning, where we already deliver measurable efficacy at scale. The same architecture serves OT, SEN, rehabilitation and accessibility — markets we will reach via partnerships in the next 18 months. The data moat compounds with every hour of telemetry across every population we serve.*

That is a category-defining story, not a feature-shipping story.

---

## 14. The Unified LIOS Picture

The two documents (A and B) form a single architecture. Read together, the layers are:

| Layer | Document | What it does |
|---|---|---|
| 1. Sensing | A §2 | Captures gesture quality, hesitation, independence, session quality |
| 2. Trust | B §3 | Scores attempt credibility, gates the measurement layer |
| 3. Measurement | A §3–6 | Skill rating, mastery, retention, transfer, learning velocity |
| 4. Cognitive Friction | B §4 | Detects overload, fatigue, boredom, attention collapse |
| 5. Adaptation | B §5–8 | Routes the next item, scaffold, modality, break, intervention |
| 6. Recovery | B §6 | Frustration recovery state machine, confidence rebuilding |
| 7. Human Observation | B §9 | Teacher and parent qualitative signal joined to telemetry |
| 8. Classroom Resilience | B §10 | Shared devices, offline mode, multi-hand, recovery, pause |
| 9. Observability | B §11 | Pipeline integrity, SLOs, anomaly detection |
| 10. Validation | A §8 | Pre/post protocols, baseline-endline, RCT-style designs |
| 11. Governance | A §9 + B §12 | Privacy, ethics, scientific advisory, regulatory anchors |
| 12. Moat | B §13 | Movement-interaction-intelligence positioning across markets |

Every layer is in service of one outcome: a child who measurably improved, with evidence that survives external review, in a system that is privacy-safe, resilient, adaptive, and operable in real classrooms.

---

## 15. Engineering Roadmap for Instructional Intelligence (next 6 months)

Sequenced for incremental delivery without destabilising the live platform. Each sprint ships measurable value.

**Sprint 1 (weeks 1–2) — Trust v1.**
- Ship rule-based attempt credibility scoring (§3.4 v1).
- Tier A/B/C labelling on every attempt.
- Trust-composition strip on every dashboard chart.
- Wire credibility weight into Elo update job (Document A §4).

**Sprint 2 (weeks 3–4) — Cognitive friction detectors.**
- Ship the eight detectors (§4.1) with rule-based thresholds.
- Detector events flow through the same `analytics_events` pipeline.
- Surfaced on engineering observability dashboard before being exposed to teacher dashboards.

**Sprint 3 (weeks 5–6) — Adaptive Engine v1 (rule-based only).**
- Rule-based next-item selection with desirable-difficulty targeting.
- Frustration recovery state machine (§6.2).
- Hard invariants from §5.3 enforced.
- Auditable decision log.

**Sprint 4 (weeks 7–8) — Human Observation Layer.**
- Teacher post-session 30-second tag UX on tablet web.
- `human_observation_fact` table and joins.
- Qualitative-alongside-quantitative on the Classroom Intelligence Dashboard.
- Begin labelled dataset for v2 trust and friction classifiers.

**Sprint 5 (weeks 9–10) — Classroom Resilience.**
- Shared-device handoff UX.
- Multi-hand detection and pause.
- Pause-class teacher control.
- Camera-moved recalibration.
- Long-absence decay block on return.
- Classroom-friction engineering dashboard.

**Sprint 6 (weeks 11–12) — Observability + SLOs.**
- Ingestion, idempotency, latency dashboards.
- Anomaly detector v1.
- Public-facing trust-composition transparency report (a quarterly report on Tier-A/B/C distribution across the live platform — institution-grade discipline).
- On-call runbooks for each SLO.

**Sprint 7 (weeks 13–16) — Adaptive Engine v2 (contextual bandit).**
- Bandit policy training on collected data.
- Side-by-side comparison vs. rule-based.
- Gradual rollout under feature flag.

**Sprint 8 (weeks 17–20) — Scientific Advisory + first published study.**
- Recruit advisors named in §12.1.
- Pre-register first efficacy study with OSF.
- IRB / HRA approval secured.
- Begin baseline → endline cycle with partner schools.

**Sprint 9 (weeks 21–24) — Profile system and SEN/ADHD/ASD calibration.**
- Profile overrides on every detector and response.
- Pilot deployments in SEN provision with OT advisor.
- First clinical-adjacent dataset gathered (consented, pre-registered).

Engineering risks to flag now:
- (a) The credibility classifier requires labelled data, which requires the Human Observation Layer; sequencing in Sprints 1→4 reflects this.
- (b) The contextual bandit is the most failure-prone component; the rule-based fallback in Sprint 3 must be production-quality on its own — the bandit is an upgrade, not a dependency.
- (c) Multi-hand detection is the highest-risk classroom resilience feature; budget two weeks for it, not one.
- (d) Scientific advisor recruitment has a 60–90 day lead; start in Sprint 1 in parallel with engineering work.

---

## 16. Closing — The Category-Defining Leap

The leap this document specifies is not a feature ship. It is a category move.

A measurement architecture without an instructional architecture is a microscope without a hand. It sees beautifully, accurately, longitudinally, defensibly — and changes nothing. A learning system whose telemetry cannot be trusted, whose classrooms break, whose data pipeline corrupts silently, whose teachers' eyes are unheard, whose adaptive logic is absent, whose moat is positioned narrowly as "EdTech" — that is the company most early-stage learning platforms become and most never escape.

The Learning Intelligence Operating System changes that. It is the platform on which Draw in the Air becomes the company that *demonstrably teaches children better, in real classrooms, under audit, across populations, in ways that survive external review and unlock adjacent markets*. It is the architecture that earns institutional partnerships, sustains a multi-year data moat, and supports the published research footprint that makes every future raise and every future grant cycle short.

The work in this document is sequenced, scoped, and engineered to be deliverable in 24 weeks. The principles in this document are non-negotiable; the engineering decisions are negotiable; the order of work is the team's. The destination — Sensing + Trust + Measurement + Adaptation + Recovery + Observation + Resilience + Observability + Validation + Governance + Moat — is the operating system the company is now committed to building.

That is the leap from a promising EdTech startup to a category-defining learning platform. The architecture is here. The next move is to build it.
