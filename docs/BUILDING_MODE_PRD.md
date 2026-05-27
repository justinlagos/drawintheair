# Building Mode — Product Spec

> Spatial Creativity & Construction Intelligence
> Status: Draft v1 · Owner: TBD · Audience: design + engineering + leadership
> Sibling docs: [`BUILDING_MODE_TECH_PLAN.md`](./BUILDING_MODE_TECH_PLAN.md) · [`BUILDING_MODE_FLOW.svg`](./BUILDING_MODE_FLOW.svg)

---

## 1. North Star

A calm, magical creative studio where children physically construct the world with movement. The child should leave saying *"I made this"*, not *"I completed a task"*.

Tone reference: Apple + LEGO + Montessori + Nintendo. Never *"educational software"*.

The product promise: every build is **a calm act of authorship that comes alive at the end**.

## 2. Why now — strategic rationale

Adding Building elevates Draw in the Air from a gesture-learning platform into an **embodied cognitive interaction system**. Three reasons it earns prime real estate:

1. **Retention.** Creation produces emotional ownership; replay rates outperform task-based modes by a wide margin in comparable kids' products (LEGO, Toca Boca, Tinybop).
2. **Cognitive telemetry.** Snap, sequencing, hesitation, and semantic placement give us the richest learner signal we've ever collected — far beyond stroke accuracy.
3. **Sandbox virality.** Free combination of parts (rocket-bicycle, flying house) creates screenshot-worthy artefacts that travel.

It will become the most-played mode within two months of launch if executed at the quality bar described here.

## 3. Users

| Persona | Age | Primary mode | Success looks like |
| --- | --- | --- | --- |
| Early Builder | 3–5 | Guided | Completes one build with no shame, asks for another |
| Curious Constructor | 5–7 | Assisted | Tolerates mild ambiguity, sequences 2–3 pieces ahead |
| Problem-Solver | 8–11 | Discovery + Sandbox | Plans whole builds, invents in Sandbox |
| Teacher | Adult | Classroom panel | Picks theme + skill focus + difficulty in <20 seconds |

Use contexts: home (1:1 with a parent nearby), classroom (single TV/laptop, child takes turns), therapy/SEND (extended sessions with reduced stimulation).

## 4. Scope

### In scope (this PRD)

- Building mode as a first-class `GameMode`, surfaced in `ModeSelectionMenu`.
- Eight build worlds, three build types, the full 5-phase experience.
- Snap engine, semantic intelligence, completion magic, sandbox, classroom panel.
- Telemetry events and learner-state classifier feeding LIOS.

### Explicit non-goals

- True 3D rendering (WebGL/Three.js). We render "premium soft 3D" via layered 2D sprites with depth lighting — matches existing canvas pipeline and perf budget.
- Multi-device group mode is roadmap-only in this PRD; specced but not built in Phase 1–3.
- User-generated piece authoring is out of scope. Parts are curated.
- Voice input. Narrator speaks; child doesn't.

## 5. Build Worlds & Object Catalogue

Worlds are the top-level Invitation choice. Each rotates a hero object on screen.

| World | Hero object | Catalogue (launch) |
| --- | --- | --- |
| Home | House | House, Flower Vase, Lamp, Bed, Bookshelf |
| Transport | Car | Car, Bicycle, Plane, Boat, Train |
| Nature | Tree | Tree, Mountain, Pond, Flower Garden, Snowman |
| Machines | Robot | Robot, Windmill, Clock, Crane, Mixer |
| Fantasy | Castle | Castle, Dragon, Wizard Tower, Magic Cauldron, Unicorn |
| Space | Rocket | Rocket, Astronaut, Planet, Satellite, UFO |
| City | Bridge | Bridge, Skyscraper, Lighthouse, Fountain, Park Bench |
| Animals | Dog | Dog, Cat, Bird, Fish Tank, Beehive |

40 objects at launch. Each object has 4–10 pieces. Total ~250 pieces.

Each object declares: `world`, `recommendedBuildType`, `pieces[]`, `silhouette`, `completionAnimation`, `ambientAudioLayer`, `narratorScript`.

## 6. Build Types

| Type | Age band | Silhouette | Snap tolerance | Decoys | Sequencing | Examples |
| --- | --- | --- | --- | --- | --- | --- |
| Guided | 3–5 | Fully visible, glowing | Generous (1.6× piece radius) | None | Pieces arrive one at a time | Flower vase, Tree, Simple house |
| Assisted | 5–7 | Partial silhouette | Moderate (1.25× piece radius) | 1–2 mild | All pieces visible, order unenforced | Car, Bicycle, Boat |
| Discovery | 8–11 | Hidden until 50% complete | Tight (1.05× piece radius) | 3+ relevant | Logical order matters | Windmill, Robot, Rocket, Bridge |

The same object can be built at any type — the system picks based on the learner's history (LIOS regime) or teacher override.

## 7. The 5-phase experience

Same five phases for every build. Phase transitions are smooth, never modal.

### Phase 1 — Invitation
Soft particle background. Narrator: *"What should we build today?"* World tiles float in a hex layout, each rotating its hero object. Child points and holds for 800ms to select. No menus.

### Phase 2 — Build Reveal
Camera gently zooms toward the chosen world. Silhouette of the object materialises — semi-transparent, glowing, aspirational. Narrator: *"Let's build a [object]."* Pieces drift in from off-canvas with soft physics — never dumped, never cluttered.

### Phase 3 — Piece Interaction
Child's pinch grabs a piece. Magic cursor (existing component) lights up. Piece follows the smoothed hand position (One Euro Filter, building profile). Hover-on-piece pulses outline. Release with no target nearby → piece floats gently back to a parking position.

### Phase 4 — Snap
When piece centre comes within `snapTolerance` of its target zone, the system:
- slows the piece (linear interpolation factor 0.6→0.2)
- creates a soft magnetic pull (existing `magneticTargets` pattern)
- emits a glow at the target zone
- pulses the silhouette outline
- on release: snap, soft *thmm* sound, piece locks with a tiny squish-and-settle animation

Wrong placement is never punished. A piece released near the wrong zone gently returns to a holding orbit. No red X, no fail tone.

### Phase 5 — Completion Magic
**This is the reward loop and is non-negotiable.** The completed object comes alive. Animation library per object:

| Object | Animation |
| --- | --- |
| Bicycle | rides across the screen, bell rings |
| Plane | takes off, banks over a cloud |
| House | lights turn on, smoke curls from chimney |
| Flower Vase | flowers bloom one by one |
| Robot | waves, blinks |
| Rocket | countdown, launch upward |
| Bridge | a tiny car drives across |
| Tree | leaves grow then a bird lands |

Then: narrator says *"You made a [object]"*. Sandbox prompt appears (Phase 2 onward). Back-to-worlds button hovers gently in the corner.

## 8. Snap System Rules (zero-shame design)

- Snap pull begins at `snapTolerance × 1.4` and accelerates inversely with distance.
- Visual snap (glow + outline pulse) and audio snap (soft *thmm*) fire when distance < `snapTolerance × 0.5`. This separates *visual promise* from *commit*, which lets the child release confidently.
- Release within tolerance → commit. Outside tolerance → drift back, no sound.
- No red, no X, no buzz, no *"wrong"* word ever surfaced to the child.
- If the same piece is misplaced 3 times, snap tolerance for that piece silently grows by 25% — the child never feels the help.

## 9. Semantic Intelligence

Every piece has a semantic role (`wheel`, `wing`, `roof`, `petal`, `propeller`, `chimney`). Every object declares which roles it accepts.

This unlocks:
- **"That wing belongs to the plane, not the car"** — the system can detect when a child tries to attach a semantically related but object-wrong piece, and respond with a kind hint rather than just refusing.
- **Semantic accuracy telemetry** — beyond coordinate accuracy, we measure whether the child understands what a piece *is*.
- **Sandbox creativity scoring** — the system can recognise *"rocket-bicycle"* (wheel + rocket-body) and react with a custom celebration.

Roles are declared once in `buildingSemantics.ts`, not per object.

## 10. Sandbox Mode

Unlocked after the first three completed Guided builds (≈8–12 minutes for a first-time child).

Free composition canvas. All pieces from completed builds are available. The child drags any combination together. Anything that snaps to anything else creates a new compound object. On request (palm-open gesture), the composition animates — a `rocket-bicycle` rides, takes off, lands.

Sandbox is the **viral engine**. Screenshots auto-frame the composition + child-given title (typed by parent on a side panel) for share. Share UI lives behind the existing `AdultGate`.

## 11. Classroom Mode

A new tab in the existing classroom panel (`src/pages/classmode/`) lets a teacher pick:

- **Theme**: one of the 8 worlds, locked for the session.
- **Skill focus**: spatial reasoning · sequencing · creativity · motor control. Drives which telemetry the teacher dashboard surfaces.
- **Difficulty**: Guided · Assisted · Discovery · *Adaptive* (default — let LIOS pick).
- **Session length**: 5 / 10 / 15 min.

Each child takes a turn at the TV/laptop. Session results aggregate into the existing pilot analytics dashboard.

## 12. Group Mode (roadmap)

Two or more devices show the same build. Each child controls one piece colour. Snap zones are shared. Voice/text chat is **not** in scope — collaboration is purely through shared action.

Built on Supabase realtime (already in stack). Phase 5+.

## 13. Visual & Sound Language

### Visual
- Rounded geometry, soft shadows, tactile surfaces (existing kid-UI ball pattern is the precedent).
- Subtle reflections, low visual noise.
- Backgrounds adapt per world: Home = warm living-room tones, Space = slow stars + nebula, Nature = soft wind + particles, Vehicle = minimal workshop. Backgrounds **never compete** with pieces.
- No cheap clipart. Pieces feel touchable.

### Sound
- Soft magnetic snap (200ms, sub-bass cushion + glassy chime).
- Airy piece-hover whoosh.
- Subtle piano/glass textures for transitions.
- Warm completion tone (4–6s, swelling).
- Environmental ambience under everything (per world).
- No arcade dopamine, no slot-machine cascades, no overstimulation.

Reference: Pixar mood + Nintendo calmness.

## 14. Cognitive Architecture

Building secretly trains:

| Skill | Surfaced via |
| --- | --- |
| Spatial reasoning | snap accuracy, zone selection |
| Sequencing | order of piece placement vs. recommended order |
| Structural understanding | which pieces are tried for which roles |
| Planning | hover-then-grab patterns, gaze-equivalent dwell |
| Motor coordination | filtered-vs-raw delta, jitter, dropped grabs |
| Semantic mapping | semantic accuracy (right role/wrong object, etc.) |
| Error recovery | retry count, time-to-recovery after misplacement |

Each is one or two telemetry fields away — none requires new sensors.

## 15. Learner-State Classifier

LIOS already exposes 5 regimes (`fresh`, `flow`, `productive`, `boredom`, `frustration`). Building introduces an orthogonal **construction style** classifier with 8 states. The child's last 5 builds drive the classification (rolling window):

| State | Detected by |
| --- | --- |
| Explorer | High hover/grab ratio, lots of pickup-and-return |
| Builder | Smooth, steady completion, average sequencing |
| Planner | Long pre-grab dwell, low retry count |
| Improviser | Sandbox-first, high creative combination count |
| Precision Learner | Tight snap distance, low jitter |
| Creative Constructor | Sandbox time ≫ guided time, high compound-object count |
| Confident Sequencer | Builds in recommended order without hints |
| Spatially Advanced | Discovery completion times in top quartile |

This is a *longitudinal* signal — surfaced to teachers/parents, fed back to LIOS for build-type recommendation.

## 16. Telemetry & Adaptive Engine

### New event names (extends existing `EventName` union)

| Event | Fires on | Key meta |
| --- | --- | --- |
| `build_world_selected` | Phase 1 commit | `world_id` |
| `build_object_started` | Phase 2 entry | `object_id`, `build_type`, `assistance_mode` |
| `piece_hovered` | Hand within hover radius >150ms | `piece_id`, `semantic_role`, `dwell_ms` |
| `piece_grabbed` | Pinch start over piece | `piece_id` |
| `placement_attempt` | Pinch release while holding | `piece_id`, `target_zone_id`, `distance_to_target` |
| `successful_snap` | Commit | `piece_id`, `target_zone_id`, `time_since_grab_ms`, `was_first_attempt` |
| `wrong_piece_attempt` | Released near a zone owned by another role | `piece_id`, `attempted_zone_role`, `attempted_zone_object` |
| `hesitation_detected` | >2s dwell without grab | `region`, `available_pieces[]` |
| `assist_escalated` | Snap tolerance grew silently | `piece_id`, `new_tolerance` |
| `build_object_completed` | Phase 5 entry | `object_id`, `duration_ms`, `total_attempts`, `semantic_accuracy`, `spatial_efficiency`, `confidence_score` |
| `build_abandoned` | Exit before completion | `object_id`, `progress_pct`, `last_event` |
| `sandbox_combination_created` | Sandbox snap | `combination_signature` |
| `sandbox_animated` | Palm-open in Sandbox | `combination_signature` |

All events include the existing standard envelope (`game_mode: 'building'`, `stage_id`, session/device IDs).

### Adaptive integration
- The existing `useAdaptiveEngine` hook is called after every `successful_snap` and `wrong_piece_attempt`. We send `current_item = piece_id`, `was_correct = (event === 'successful_snap')`.
- LIOS returns `regime`, `scaffold_level`, `reward_intensity`. Building applies them as: scaffold → snap tolerance ×{1.0, 1.25, 1.5}; reward → completion-animation intensity {muted, standard, full}.

## 17. Success Metrics

### Activation (first session)
- ≥75% of children who tap Building complete one build.
- Median time-to-first-completion < 4 minutes.

### Retention
- Day-7 return rate for Building-users is +30% vs. non-Building cohort.
- Median sessions/week per active Building child ≥ 3.

### Quality
- ≥90% of completed builds end with the child still in-canvas at the +5s mark (i.e. completion magic held attention).
- Sandbox unlock conversion: ≥40% of children who unlock Sandbox return to it the next session.
- Zero red-X / shame patterns surfaced in QA review (hard gate).

### Cognitive
- Semantic accuracy improves measurably across a child's first 10 builds (LIOS audit).
- Snap-tolerance assistance silently decreases over time for ≥60% of children.

## 18. Risks & Open Questions

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Premium 3D asset cost balloons | High | Layered 2D-with-depth approach; standardise piece template at 3 layers (shadow, body, highlight). Reuse Sort-and-Place kid-icon sprite pipeline. |
| Snap feel is mushy / floaty | Medium | Snap engine is the single most-tested system. Burn 1 sprint on feel before shipping. |
| MediaPipe pinch precision insufficient for tight Discovery snap | Medium | Reuse `predictiveSmoothing` + `velocityPinchTolerance` flags already in place. |
| Children leave before the completion animation lands | Medium | First completion happens within 2 minutes; magic is loud (visually) and short (<6s). |
| Parents don't understand what's being built (e.g. abstract shapes) | Low | Narrator says the object name on Phase 2 entry. Object names are concrete. |
| Sandbox screenshots leak children's faces | Hard requirement | Screenshots are canvas-only; webcam frame never composited. |

### Open questions for stakeholders

1. **Asset budget.** 250 pieces × 3 layers ≈ 750 sprites. In-house illustrator vs. commissioned vs. AI-assisted? *(Owner: TBD)*
2. **Completion animations** — built once per object, or one parametric system + per-object config? Strong recommendation: per-object scripted animations using existing Framer Motion. *(Owner: Engineering)*
3. **Sandbox sharing** — public gallery or device-local only at launch? Recommendation: device-local at launch, gallery in Phase 4 with full moderation. *(Owner: Trust & Safety)*
4. **Classroom theme cadence** — do we ship themed weeks (Transport Week, Space Week) as marketing, or as in-product seasonal content? *(Owner: Marketing + Product)*

## 19. Phased rollout

| Phase | Scope | Exit criteria | Eng weeks |
| --- | --- | --- | --- |
| **0 — Spike** | Snap-and-complete prototype with 1 object (Flower Vase, Guided) | Pinch-grab-snap-bloom round-trip feels good on a single laptop | 1 |
| **1 — MVP** | 1 world (Home), 3 Guided objects, completion magic, telemetry | 75% of testers complete one build first session; perf tier-medium sustains 30fps | 4 |
| **2 — All build types** | Assisted + Discovery, semantic engine, adaptive integration, 2 more worlds | LIOS scaffold visibly modulates difficulty | 4 |
| **3 — Sandbox** | Composition canvas, animation hooks, share via AdultGate | ≥40% of unlocking children return to Sandbox | 3 |
| **4 — Classroom + remaining worlds** | All 8 worlds, 40 objects, classroom panel | Pilot teachers complete a session config in <20s | 4 |
| **5 — Group Mode** | Two-device shared build over Supabase realtime | 2 children + 1 device + 1 teacher complete one shared build | 5 |

Total: ~21 engineering weeks to full vision. MVP ships in 5 weeks.

---

## 20. The single most important thing

This mode must feel **calm, beautiful, alive, and emotionally intelligent** — not gamified chaos. Every review milestone asks one question first: *"Would a five-year-old feel proud after this?"* If the answer is no, the sprint hasn't shipped.
