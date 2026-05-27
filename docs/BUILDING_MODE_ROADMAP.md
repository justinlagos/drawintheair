# Building Mode — Execution Roadmap

> Companion to [`BUILDING_MODE_PRD.md`](./BUILDING_MODE_PRD.md) + [`BUILDING_MODE_TECH_PLAN.md`](./BUILDING_MODE_TECH_PLAN.md).
> Sprint-level breakdown. Each sprint = 1 calendar week. Owner column is intentionally blank — assign at kickoff.

---

## At a glance

| Phase | Sprints | Calendar | Engineer-weeks | Headline deliverable |
| --- | --- | --- | --- | --- |
| 0 — Spike | 1 | Week 1 | 1 | Flower vase end-to-end on one laptop |
| 1 — MVP | 2–5 | Weeks 2–5 | 4 | Home world · 3 guided objects · ships behind flag |
| 2 — All build types | 6–9 | Weeks 6–9 | 4 | Assisted + Discovery + LIOS adaptive · 2 more worlds |
| 3 — Sandbox | 10–12 | Weeks 10–12 | 3 | Composition · animation · share via Adult Gate |
| 4 — Full catalog + Classroom | 13–16 | Weeks 13–16 | 4 | All 8 worlds · 40 objects · classroom panel |
| 5 — Group Mode | 17–21 | Weeks 17–21 | 5 | Two-device shared build (Supabase realtime) |

Total: **21 engineering weeks** from spike to full vision. MVP behind a flag in **5 weeks**.

---

## Phase 0 — Spike (Week 1)

**Goal:** prove the snap-grab-complete loop feels good before committing the team.

### Sprint 1
- Scaffold `src/features/modes/building/` directory.
- Wire one `BuildingMode.tsx` shell into `App.tsx` behind `?mode=building` URL param. Tile not yet in menu.
- Build ONE object end to end: **Flower Vase** (5 pieces · Guided).
  - 3 sprite layers per piece reusing the kid-icon pipeline.
  - Hard-coded snap zones; no semantic graph yet.
  - Hand-scripted bloom completion animation.
- Single integration test: scripted `frameData` sequence drives the full build.

### Definition of Done
- [ ] Engineer can pinch-grab a petal, see it snap, see the bloom animation finish.
- [ ] No console errors at perf tier `medium` on a 2020 Chromebook.
- [ ] Snap feel review (2 designers + 1 engineer): "yes, ship it" or specific fix list.

### Gate to Phase 1
A 5-year-old (internal kid-test) completes the flower vase first try with a smile. If not, iterate in Sprint 1 before continuing.

---

## Phase 1 — MVP (Weeks 2–5)

**Goal:** shippable Building mode with one world. Flag-gated for ~10% of traffic.

### Sprint 2 — Engine foundations
- `buildingTypes.ts` — finalise type definitions.
- `buildingState.ts` — pure FSM with unit tests.
- `buildingSnap.ts` — extract spike's snap math; add assistance escalation.
- `buildingSemantics.ts` — initial role registry (just the 6 roles MVP needs).
- `buildingTelemetry.ts` — 6 of 13 events (defer Sandbox events).
  - `build_world_selected`, `build_object_started`, `piece_grabbed`, `successful_snap`, `wrong_piece_attempt`, `build_object_completed`
- Extend `EventName` in `src/lib/analytics.ts`.

### Sprint 3 — Worlds, second + third object
- `buildingWorlds.ts` — Home world catalog skeleton.
- Add **Tree** (4 pieces) and **Simple House** (6 pieces).
- `buildingRender.ts` — silhouette pre-render, piece render, snap-zone glow.
- `BuildingBackground.tsx` — warm living-room palette for Home world.
- Register sprite keys in `kid-ui/kidIcons.ts`.

### Sprint 4 — Completion magic + polish
- `buildingCompletion.ts` — three animators (bloom, tree-grow + bird-land, house-lights-on).
- Narrator scripts per object.
- TactileAudioManager: register `building` cues (`hover-whoosh`, `soft-thmm`, `snap-commit`, `completion-swell`).
- `MagicCursor` integration — light cursor when pinch active over a piece.
- Adult Gate exit path verified mid-build.
- Hesitation detector (2s dwell + no grab) → narrator encouragement.

### Sprint 5 — Hardening + flag rollout
- Performance pass: confirm <11ms render budget at tier medium with 8 pieces.
- QA pass against the new Building section in `docs/QA.md`.
- Feature flag `buildingMode` ON for ~10% of traffic in production.
- Menu tile lives in Tier 1 (per PRD §2 — replaces one Tier 2 slot temporarily; full menu reshuffle in Sprint 9).
- Telemetry dashboard panel in pilot analytics: completion rate, time to first snap, abandon rate.
- Author classroom-guide entry for Home world.

### Phase 1 exit criteria
- [ ] First-completion median <4 min across 5 internal kid-tests.
- [ ] Zero P0 bugs · zero red/X/shame surfaces in QA review.
- [ ] LIOS receives `current_item` after every snap in shadow mode.
- [ ] Telemetry events match snapshot test for the three reference builds.
- [ ] Day-1 retention for the flagged cohort is not statistically worse than baseline.

---

## Phase 2 — All build types + adaptive (Weeks 6–9)

**Goal:** unlock the cognitive surface — three build types, LIOS-driven assistance, two more worlds.

### Sprint 6 — Assisted build type
- `buildingDifficulty.ts` — formal type selector + per-type tolerance table.
- Implement Assisted variants for the three Home objects.
- Decoy piece spawning logic.
- Two new objects in Transport: **Car** (Guided + Assisted) and **Bicycle** (Assisted).
- New world: Transport.

### Sprint 7 — Discovery build type + accessibility hint
- Discovery variants for House, Car, Bicycle.
- **Show-me** gesture (palm-open held 1.5s) reveals silhouette for 3s — addresses accessibility risk noted in tech plan §15.
- New events: `placement_attempt`, `hesitation_detected`, `assist_escalated`, `piece_hovered`, `build_abandoned`.
- Confidence + spatial-efficiency + semantic-accuracy computers in `buildingTelemetry.ts`.

### Sprint 8 — LIOS adaptive integration
- Hook `useAdaptiveEngine` call after every `successful_snap` and `wrong_piece_attempt`.
- Apply scaffold to `assistTolerance`; apply reward to completion intensity.
- Add `building` to `lios_adaptive=shadow` default rollout (server side is already mode-agnostic).
- Surface LIOS regime in PerfOverlay debug HUD.

### Sprint 9 — Second world + menu rebalance
- New world: **Nature** (Flower Garden, Pond, Snowman).
- Menu reshuffle: confirm Building's Tier 1 placement against latest mode_started analytics.
- Full retention review: do Building-cohort sessions show the +30% day-7 lift target?

### Phase 2 exit criteria
- [ ] LIOS scaffold visibly modulates difficulty in shadow-mode audit log.
- [ ] All 13 (minus Sandbox) telemetry events fire correctly.
- [ ] Show-me gesture detected reliably (>95%) on internal hands.
- [ ] No regression on Phase 1 metrics.

---

## Phase 3 — Sandbox (Weeks 10–12)

**Goal:** unlock the viral engine.

### Sprint 10 — Composition canvas
- `buildingSandbox.ts` — composition state, piece-to-piece snap (no fixed zones).
- Sandbox unlock trigger: after 3 completed Guided/Assisted builds.
- Sandbox UI: pieces tray (all unlocked pieces), large empty canvas, narrator says *"Build anything you can imagine"*.

### Sprint 11 — Compound recognition + animation
- Compound-object recognition — look up role pairs in `ROLE_OBJECT_AFFINITY` and tag compounds with signatures (`rocket-bicycle`, `flying-house`).
- Palm-open gesture triggers animation; animator picks the most "personality-rich" component (rocket flies + wheels spin).
- Two new telemetry events: `sandbox_combination_created`, `sandbox_animated`.

### Sprint 12 — Share + safety
- Screenshot composer (canvas-only, never webcam frame — hard requirement).
- Parent-typed title via side panel behind `AdultGate`.
- Share UI: download PNG, system share-sheet (no built-in gallery this phase).
- QA: parental review of "what gets captured" — confirm zero PII / face data risk.
- Feature flag `buildingSandbox` to 25% of Building users.

### Phase 3 exit criteria
- [ ] ≥40% of children who unlock Sandbox return to it next session.
- [ ] Zero leaks of webcam frames in screenshots (audited).
- [ ] At least 3 distinct compound signatures observed in production telemetry.

---

## Phase 4 — Full catalog + Classroom (Weeks 13–16)

**Goal:** complete the 8-world vision and the teacher panel.

### Sprint 13 — Remaining objects: Machines + Fantasy
- Machines world: Robot, Windmill, Clock, Crane, Mixer (5 objects, three build types each).
- Fantasy world: Castle, Dragon, Wizard Tower, Magic Cauldron, Unicorn.
- Asset pipeline scales to ~120 sprites this sprint — confirm SVG bundle size <1.5MB.

### Sprint 14 — Remaining objects: Space + City + Animals
- Space: Rocket, Astronaut, Planet, Satellite, UFO.
- City: Bridge, Skyscraper, Lighthouse, Fountain, Park Bench.
- Animals: Dog, Cat, Bird, Fish Tank, Beehive.
- Total catalog: 40 objects · 8 worlds · ~250 pieces.

### Sprint 15 — Classroom panel
- New tab in `src/pages/classmode/`: Building configuration.
- Theme picker · skill focus · difficulty (incl. *Adaptive*) · session length.
- Teacher session results aggregate into existing pilot analytics dashboard.
- Skill-focus filter on the dashboard surfaces just the relevant telemetry.

### Sprint 16 — Catalog hardening
- Author 40 completion-animation scripts (1 per object). This is the long pole — start in Sprint 13.
- Full QA pass on every object × every build type (120 configurations). Smoke-test only on Adaptive — covered by the per-build-type Phase 2 work.
- Performance pass on perf tier `low` — raster fallback enabled per tech plan §15.

### Phase 4 exit criteria
- [ ] All 40 objects shipped, playable in all three build types.
- [ ] Teachers complete a classroom session config in <20s (5 pilot teachers).
- [ ] Day-7 retention lift target (+30%) confirmed in production cohort.

---

## Phase 5 — Group Mode (Weeks 17–21)

**Goal:** collaborative shared build across devices.

### Sprint 17 — Topology decision + spike
- Pick: single-device-authority vs. CRDT. Recommend single-authority (simpler, lower latency expectations for kids; conflict resolution rare given turn-based gameplay).
- Realtime spike on Supabase realtime channels — measure latency, dropped events, reconnect behavior.

### Sprint 18 — Shared session protocol
- Session creation flow (teacher creates a code; children join).
- Shared `BuildSession` schema; piece ownership by colour.
- Server-side validator for snap commits (anti-cheat / consistency).

### Sprint 19 — Multi-cursor render
- Per-child colour-tinted cursor on every device.
- Network-smoothed cursor positions (cap at 20Hz; interpolate to 60Hz client-side).

### Sprint 20 — Recovery + edge cases
- Reconnect under flaky wifi.
- Mid-session join / leave.
- Teacher "freeze" button (pauses all input).

### Sprint 21 — Pilot
- 5-classroom pilot · 2-week run · qualitative feedback + quantitative completion rate.

### Phase 5 exit criteria
- [ ] Two children + one teacher complete one shared build at ≤200ms perceived latency.
- [ ] Reconnect under packet loss works without losing piece state.

---

## Cross-phase workstreams

These run in parallel across all phases; don't budget them as discrete sprints — assign 10–20% of capacity continuously.

| Workstream | Cadence | Owner | Notes |
| --- | --- | --- | --- |
| Asset production | Continuous from Phase 1 | Illustrator (commission) | 250 pieces · 40 completion animations. Start commissioning Phase 1 objects in Sprint 1 — lead time is the biggest delivery risk. |
| Kid testing | Every 2 weeks | Product | 1-hour sessions with 2 children each. Findings feed the next sprint review. |
| Telemetry review | Weekly | Data | Catch silent regressions (e.g. completion-rate drop after a Sprint change). |
| LIOS audit | Weekly during Phase 2+ | Engineering | Confirm shadow-mode decisions are sensible before flipping to live. |
| Accessibility | Phase 2+ | Designer | Show-me gesture, contrast, motion-reduction settings. |
| Brand / classroom-guides | Phase 4 | Marketing | One classroom guide PDF per world × age band. |

## Risk register (live)

| Risk | Phase | Mitigation | Status |
| --- | --- | --- | --- |
| Asset lead time exceeds 21 weeks | All | Commission Phase 1 objects in Sprint 1 | Open — kickoff blocker |
| Snap feel fails kid-test | 0 | Burn entire Sprint 1 on feel before scaling | Open |
| LIOS shadow decisions are nonsense | 2 | Don't flip to live until audit is clean | Open |
| Sandbox screenshots leak webcam | 3 | Compositor is canvas-only — enforced in code review checklist | Open |
| Old Chromebooks can't render 40-object catalog | 4 | Raster fallback in tech plan §15 | Open |
| Realtime latency exceeds kid tolerance | 5 | Topology spike in Sprint 17 — kill criteria if >300ms | Open |

## Kickoff checklist (Week 0)

Before Sprint 1 begins:

- [ ] Engineering, design, and product alignment on the PRD (single review meeting).
- [ ] Illustrator commission signed — first batch (Flower Vase + Tree + House pieces) due Week 3.
- [ ] LIOS team confirms `building` game-mode key is acceptable as-is (no server changes).
- [ ] Pilot analytics dashboard owner identified.
- [ ] Kid-test recruiting in place — 2 children per fortnight for 21 weeks (≈22 kids total).
- [ ] One named DRI per workstream above.
