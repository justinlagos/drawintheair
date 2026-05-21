# Draw in the Air — LIOS Repositioning Addendum

**A short companion note that repositions both strategic documents under a single architectural umbrella: the Learning Intelligence Operating System (LIOS).**

Prepared: May 2026
Status: Repositions *Draw in the Air — Learning Intelligence Strategy* (Document A) and *Draw in the Air — Instructional Intelligence Architecture* (Document B) as two halves of one operating system.

---

## Why this addendum exists

Document A specified *how the platform measures learning*. It is, on its own, a strong measurement architecture — pseudonymous longitudinal data, gesture-quality telemetry, Elo / IRT skill ratings, mastery episodes, decay and transfer probes, classroom dimension, curriculum mapping, pre/post validation, k-anonymised dashboards, privacy-first design.

Under stress testing, Document A revealed five structural under-specifications:

1. **Instructional intelligence.** It instrumented learning without specifying how the platform *teaches*.
2. **Telemetry trust.** It assumed every captured attempt was a valid learning attempt.
3. **Cognitive friction.** It conflated "doesn't know" with "is overwhelmed."
4. **Real-world resilience.** It assumed clean, sequential interaction in idealised classrooms.
5. **Positioning.** It framed the company as an EdTech product, not as a movement-interaction-intelligence platform with a category-defining moat.

Document B addresses these in depth. This addendum is the half-page bridge that names the combined system and makes the strategic framing explicit.

---

## The Learning Intelligence Operating System

LIOS is the combined architecture. It has six pillars, each owned and specified by a section of the two strategic documents.

### 1. Sensing
Instrumentation of every interaction — gesture trajectories summarised to scalars on-device, hesitation, independence, session quality.
*Specified in Document A §2, extended by Document B §3 inputs.*

### 2. Trust
Every captured attempt carries a credibility score. Low-credibility attempts are quarantined before they touch the measurement layer. The data the company publishes is the data the company can defend.
*Specified in Document B §3.*

### 3. Measurement
Pseudonymous longitudinal skill state. Elo / IRT rating, mastery episodes, retention strength, transfer index, learning velocity, confidence index, motor-precision index. Calibrated by age band and skill family.
*Specified in Document A §3–6.*

### 4. Adaptation
Real-time teaching. The Adaptive Learning Engine selects the next item, scaffold, modality, break and intervention to keep the child in the desirable-difficulty band, in flow, and out of frustration. Cognitive-friction detectors govern responses. Frustration recovery is a deterministic state machine, not a hope.
*Specified in Document B §4–8.*

### 5. Resilience
Real classrooms, shared devices, bad Wi-Fi, multi-hand chaos, mid-session interruptions, long absences. Plus engineering-side observability: ingestion integrity, idempotency, latency, anomaly detection, SLOs the platform commits to publicly.
*Specified in Document B §10–11.*

### 6. Governance
Privacy posture (no PII, on-device hand tracking, pseudonymous learner_uid, k-anonymity ≥ 5, ICO Children's Code, GDPR/COPPA/FERPA). Scientific Advisory Layer. Pre-registered efficacy studies. Ethics review. Open transparency reports on data quality.
*Specified in Document A §8–9 and Document B §12.*

The two qualitative companions to the six pillars:

- **Human Observation Layer.** Teacher and parent qualitative signal joined to telemetry. The single most important calibration the system has against overfitting to machine-observable behaviour. *Specified in Document B §9.*
- **Validation.** Pre/post protocols, baseline-endline, waitlist-control, pre-registered, peer-reviewable. *Specified in Document A §8 + §12.*

---

## What LIOS unlocks

The shift from "analytics architecture" to "operating system" is not branding. It is the framework that lets the company say, with the architecture to back it:

> *Draw in the Air is the leading privacy-safe movement-interaction intelligence platform. Our first market is early-years learning, where we deliver measurable efficacy at scale. The same operating system serves occupational therapy, SEN provision, rehabilitation, motor assessment, and accessibility — markets we reach via partnerships over the next 18 months. Every hour of telemetry compounds a data moat no competitor can replicate without going through years of children in classrooms.*

That is a category-defining story. It is also true, and architecturally honest — the data model, the credibility layer, the engine interfaces, and the curriculum map specified in Documents A and B port directly to those adjacent markets without re-engineering, exactly as designed.

---

## The roadmap, unified

The combined 24-week engineering programme (Document A §10 + Document B §15) ships LIOS in two coordinated tracks:

- **Track 1 — Measurement (Document A):** event idempotency → longitudinal schema → gesture quality on-device → classroom dimension → decay & transfer probes → new dashboards → pilot efficacy study.
- **Track 2 — Instruction (Document B):** trust scoring → cognitive friction detectors → adaptive engine v1 → human observation layer → classroom resilience → observability & SLOs → adaptive engine v2 → scientific advisory + first study → SEN/ADHD/ASD profile system.

Run together — measurement and instruction sprints alternating, each unblocking the next — LIOS is in production by week 24, with the first peer-review-ready efficacy paper in flight by week 20 and the first clinical-adjacent dataset gathered by week 24.

This is the unified architecture the company is now building. The two documents that follow are its specification.
