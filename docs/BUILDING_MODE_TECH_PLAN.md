# Building Mode — Technical Implementation Plan

> Companion to [`BUILDING_MODE_PRD.md`](./BUILDING_MODE_PRD.md). Execution-ready.
> Audience: engineers implementing Building. Assumes familiarity with the existing pipeline ([`docs/MODE-BIBLE.md`](./MODE-BIBLE.md), [`SYSTEM_MAP.md`](../SYSTEM_MAP.md), `src/features/modes/sortAndPlace/`).

---

## 1. Architecture summary

Building plugs into the existing tracking pipeline using the same contract every other mode uses:

```
TrackingLayer (60fps rAF) ──▶ onFrame(ctx, frameData, w, h, drawingUtils)
                                              │
                                              ▼
                                   buildingLogic.ts
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              ▼                               ▼                               ▼
      buildingState (FSM)             buildingSnap (engine)         buildingRender (canvas)
              │                               │                               │
              ├──▶ buildingTelemetry (logEvent)                               │
              ├──▶ buildingDifficulty (LIOS)                                  │
              └──▶ buildingCompletion (animator)──▶ Celebration component ───┘
```

No new tracking infrastructure. No new filters. No new render loop. We are an additional consumer of `frameData` plus a new state machine.

## 2. Module layout

```
src/features/modes/building/
├── BuildingMode.tsx            # React shell: lifecycle, narrator, UI overlays, exit handling
├── buildingLogic.ts            # onFrame entry (matches sortAndPlaceLogic signature)
├── buildingState.ts            # Pure FSM: invitation → reveal → interaction → completion → outro
├── buildingTypes.ts            # All shared types
├── buildingWorlds.ts           # World + object catalog (DATA only, no logic)
├── buildingSemantics.ts        # Role registry + role-acceptance rules
├── buildingSnap.ts             # Snap pull + commit + assistance escalation
├── buildingDifficulty.ts       # Guided/Assisted/Discovery presets, LIOS bindings
├── buildingCompletion.ts       # Animator registry + per-object scripts
├── buildingSandbox.ts          # Phase 3+: composition canvas logic
├── buildingTelemetry.ts        # Event payload builders, debounced senders
├── buildingRender.ts           # Pieces, silhouette, snap zones, environment
├── buildingAssets.ts           # Sprite registration via kid-icon pipeline
├── BuildingBackground.tsx      # Per-world background variants (matches BalloonMathBackground pattern)
└── README.md                   # Per-mode README
```

Files <500 lines (per `CLAUDE.md`). `buildingLogic.ts` will be the closest to the cap — if it grows, split render concerns to `buildingRender.ts`.

## 3. Data models

`src/features/modes/building/buildingTypes.ts`

```ts
export type BuildWorldId =
  | 'home' | 'transport' | 'nature' | 'machines'
  | 'fantasy' | 'space' | 'city' | 'animals';

export type BuildType = 'guided' | 'assisted' | 'discovery';

export type SemanticRole =
  | 'wheel' | 'wing' | 'roof' | 'window' | 'door' | 'chimney'
  | 'petal' | 'leaf' | 'stem' | 'propeller' | 'engine' | 'tail'
  | 'antenna' | 'arm' | 'leg' | 'head' | 'body' | 'sail'
  | 'mast' | 'base' | 'accent';            // 21 roles at launch

export interface SnapZone {
  id: string;                                // stable within object
  cx: number; cy: number;                    // normalised 0..1, canvas-relative
  width: number; height: number;             // normalised
  acceptsRole: SemanticRole;
  acceptsPieceIds?: string[];                // when null, any piece of role qualifies
  visible: boolean;                          // false during Discovery pre-reveal
  glow: number;                              // 0..1, driven by proximity
  filled: boolean;
  filledByPieceId?: string;
}

export interface BuildPiece {
  id: string;                                // unique within object instance
  templateId: string;                        // refers to spriteKey + dimensions
  role: SemanticRole;
  cx: number; cy: number;                    // current normalised pos
  vx: number; vy: number;                    // gentle drift when parked
  width: number; height: number;
  rotation: number;
  grabbed: boolean;
  placed: boolean;
  placedZoneId?: string;
  attempts: number;                          // for silent assistance escalation
  assistTolerance: number;                   // multiplier on base snapTolerance
  spawnDelayMs: number;                      // when piece floats into scene (Guided only)
}

export interface BuildObject {
  id: string;
  world: BuildWorldId;
  displayName: string;                       // narrator reads this
  defaultBuildType: BuildType;
  silhouette: { spriteKey: string; cx: number; cy: number; width: number; height: number };
  pieces: BuildPiece[];
  snapZones: SnapZone[];
  completionAnimationId: string;             // key into buildingCompletion registry
  ambientAudioId: string;
  narratorScript: { phase: 'reveal'|'completion'|'encouragement'; text: string }[];
}

export interface BuildSession {
  objectId: string;
  buildType: BuildType;
  startedAt: number;
  firstSnapAt?: number;
  attempts: number;
  hesitationEvents: number;
  completedAt?: number;
  abandoned: boolean;
}

export type BuildingPhase =
  | 'invitation'      // world picker
  | 'reveal'          // silhouette appears, pieces float in
  | 'interaction'     // active play
  | 'completion'      // celebration animation
  | 'outro';          // sandbox prompt / next build
```

## 4. State machine

`src/features/modes/building/buildingState.ts` — pure module, no React. The same pattern as `sortAndPlaceLogic.ts` but isolated for testability.

```
invitation ──worldSelected──▶ reveal ──piecesSettled──▶ interaction
                                                          │
                                       allPiecesPlaced ──▶ completion
                                                          │
                                  exitTapped from any state▼
                                                       outro ──▶ (menu)
```

Transition triggers are exported pure functions (`worldSelected(id)`, `piecesSettled()`, etc.) and emit telemetry. The shell (`BuildingMode.tsx`) drives transitions in response to:

- world picker UI events
- a settle timer (1200ms) after `reveal` starts
- piece-placed callback from `buildingSnap`
- a completion-animation `onFinished` callback
- the existing `AdultGate.onExit`

## 5. Snap algorithm

The single most-tested system. Reuses `OneEuroFilter2D` for grab smoothing and the `magneticTargets` pattern from Sort-and-Place. Pseudocode:

```ts
// Called every frame while a piece is grabbed.
function updateGrabbedPiece(piece: BuildPiece, hand: NormPoint, frame: FrameContext): SnapEvent | null {
  const zone = nearestEligibleZone(piece, frame.zones);
  if (!zone) {
    // Free drag — just smooth.
    const smoothed = grabFilter.filter(hand.x, hand.y, frame.timestamp);
    piece.cx = smoothed.x; piece.cy = smoothed.y;
    return null;
  }

  const dx = zone.cx - hand.x;
  const dy = zone.cy - hand.y;
  const dist = Math.hypot(dx, dy);

  const tol = baseSnapTolerance(frame.buildType) * piece.assistTolerance;

  // VISUAL promise — fires earlier than commit.
  if (dist < tol * 1.4) {
    zone.glow = Math.max(zone.glow, 1 - dist / (tol * 1.4));
  }
  if (dist < tol * 0.5 && !frame.didEmitVisualSnap) {
    audio.play('soft-thmm');
    frame.didEmitVisualSnap = true;
  }

  // Magnetic pull (eased) — applied to TARGET position before smoothing.
  let targetX = hand.x;
  let targetY = hand.y;
  if (dist < tol) {
    const pull = ease(1 - dist / tol);            // 0..1
    targetX = hand.x + dx * pull * 0.7;
    targetY = hand.y + dy * pull * 0.7;
  }

  const smoothed = grabFilter.filter(targetX, targetY, frame.timestamp);
  piece.cx = smoothed.x; piece.cy = smoothed.y;

  return null; // commit happens on release, not on hover
}

function onRelease(piece: BuildPiece, frame: FrameContext): SnapEvent {
  const zone = nearestEligibleZone(piece, frame.zones);
  if (!zone) return { kind: 'returned' };

  const dist = Math.hypot(piece.cx - zone.cx, piece.cy - zone.cy);
  const tol = baseSnapTolerance(frame.buildType) * piece.assistTolerance;

  if (dist < tol) {
    commit(piece, zone);
    audio.play('snap-commit');
    return { kind: 'snapped', pieceId: piece.id, zoneId: zone.id };
  }

  piece.attempts += 1;
  if (piece.attempts >= 3) {
    // Silent assistance escalation.
    piece.assistTolerance = Math.min(1.5, piece.assistTolerance * 1.25);
    telemetry.log('assist_escalated', { pieceId: piece.id, new_tolerance: piece.assistTolerance });
  }
  return { kind: 'returned' };
}

function nearestEligibleZone(piece, zones) {
  // Eligibility: zone.acceptsRole === piece.role (semantic gate).
  return zones
    .filter(z => !z.filled && z.acceptsRole === piece.role)
    .reduce(closest, null);
}
```

**Why semantic eligibility, not just distance.** Two zones can be close to the same hand position; the semantic gate makes sure a wheel doesn't try to snap to the roof zone. Wrong-role releases route to `wrong_piece_attempt` telemetry.

Base tolerance presets (in normalised units, screen-diagonal-relative):

| Build type | `baseSnapTolerance` |
| --- | --- |
| Guided | 0.08 |
| Assisted | 0.055 |
| Discovery | 0.038 |

## 6. Semantic graph

`buildingSemantics.ts` is a flat registry — no graph library needed:

```ts
export const ROLE_OBJECT_AFFINITY: Record<SemanticRole, BuildObject['id'][]> = {
  wheel: ['car', 'bicycle', 'train'],
  wing: ['plane'],
  roof: ['house', 'castle', 'lighthouse'],
  petal: ['flower-vase', 'flower-garden'],
  // ...
};

export function isSemanticallyRelated(role: SemanticRole, objectId: string): boolean {
  return ROLE_OBJECT_AFFINITY[role]?.includes(objectId) ?? false;
}
```

This powers two behaviours:
1. **Kind hint on wrong-object placement**: if a child drops a `wing` near an empty roof zone in a `house` build, the narrator says *"Wings belong on planes! Try this one instead."* instead of silently returning.
2. **Sandbox recognition**: when two pieces snap in Sandbox, we look up both roles in the affinity map and tag the resulting compound (`'rocket-bicycle'` = wheel + rocket-body).

## 7. Difficulty + LIOS integration

`buildingDifficulty.ts` is a thin adapter:

```ts
export function applyLiosScaffold(decision: AdaptiveDecision, session: BuildSession) {
  const factor = { none: 1.0, partial: 1.25, full: 1.5 }[decision.scaffold_level];
  for (const p of currentPieces()) p.assistTolerance = factor;
  rewardIntensity = decision.reward_intensity; // {muted, standard, big}
}
```

The hook is called from `buildingLogic.ts` after every `successful_snap` and `wrong_piece_attempt`, exactly like `sortAndPlaceLogic` calls it today via the analytics auto-shadow trigger.

Game mode key for LIOS: `'building'`. No server-side changes required — `lios_recommend_next` is game-mode-agnostic.

## 8. Completion animation registry

`buildingCompletion.ts`:

```ts
export type CompletionAnimator = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => boolean;
// returns true while running, false when finished.

export const COMPLETION_ANIMATORS: Record<string, CompletionAnimator> = {
  'bicycle-rides': (ctx, t, w, h) => { /* … */ return t < 4000; },
  'plane-takes-off': (ctx, t, w, h) => { /* … */ return t < 5000; },
  'house-lights-on': (ctx, t, w, h) => { /* … */ return t < 3500; },
  'flower-vase-bloom': (ctx, t, w, h) => { /* … */ return t < 4500; },
  // …40 entries at launch
};
```

Each animator is hand-scripted (cheaper than building a parametric system, and the variety is the magic). Framer Motion is also available for DOM-overlay celebrations (`Celebration.tsx` already in components). Use Framer when the animation is overlay-shaped (confetti, glow rings); use canvas animators when the piece itself transforms (bicycle wheels spinning).

## 9. Asset pipeline

Use the existing `src/components/kid-ui/kidIcons.ts` SVG sprite system.

- Each piece template registers a sprite key (e.g. `'building.bicycle.wheel'`).
- Sprites are flat SVGs with three soft-3D layers baked in (drop shadow + body fill + top highlight) — matches the look of existing `food.*` and `vehicle.*` icons in Sort-and-Place.
- `preloadKidIcons(piecesForCurrentObject)` is called on `reveal` enter — same call Sort-and-Place uses today.
- 250 pieces × ~6KB SVG ≈ 1.5MB of vector data. Negligible.
- Backgrounds use the same approach as `BalloonMathBackground.tsx` and `RainbowBridgeBackground.tsx` — a `BuildingBackground.tsx` switches sprite layers by `world`.

**No new build infrastructure**. No 3D asset pipeline. Production-ready in week 1.

## 10. Telemetry — concrete payloads

Extend `EventName` in `src/lib/analytics.ts`:

```ts
| 'build_world_selected' | 'build_object_started'
| 'piece_hovered' | 'piece_grabbed' | 'placement_attempt'
| 'successful_snap' | 'wrong_piece_attempt' | 'hesitation_detected'
| 'assist_escalated' | 'build_object_completed' | 'build_abandoned'
| 'sandbox_combination_created' | 'sandbox_animated'
```

`buildingTelemetry.ts` wraps `logEvent` with payload builders so call sites stay clean:

```ts
export function logBuildCompleted(s: BuildSession, o: BuildObject) {
  logEvent('build_object_completed', {
    game_mode: 'building',
    stage_id: o.id,
    value_number: (s.completedAt ?? Date.now()) - s.startedAt,
    meta: {
      world: o.world,
      build_type: s.buildType,
      total_attempts: s.attempts,
      hesitation_events: s.hesitationEvents,
      time_to_first_snap_ms: s.firstSnapAt ? s.firstSnapAt - s.startedAt : null,
      semantic_accuracy: computeSemanticAccuracy(o, s),
      spatial_efficiency: computeSpatialEfficiency(o, s),
      confidence_score: computeConfidenceScore(s),
    },
  });
}
```

Debouncing: `piece_hovered` fires at most every 400ms per piece. `hesitation_detected` requires 2s of dwell + zero grab attempts in that period; fires once per hesitation window.

## 11. Performance budget

The render loop spends a fixed budget per frame. Building's targets at perf tier `medium`:

| Operation | Budget per frame |
| --- | --- |
| Snap engine (eligibility + magnetic pull) | <1ms |
| Render: silhouette | <2ms |
| Render: pieces (≤10) | <4ms |
| Render: snap-zone glow | <1ms |
| Render: background | <3ms (cached on `world` change) |
| Completion animator | <4ms (only during Phase 5) |

**Total Building-side budget at steady state: 11ms.** Leaves >5ms for tracking + cursor + safety overlays on a 60fps frame.

Optimisations to apply from day 1 (already proven in the codebase):
- Cache background gradient as an offscreen canvas, drawn once per phase.
- Pre-render the silhouette to an offscreen canvas, blit per frame.
- Resample piece drift physics at 30Hz, interpolate visually at 60Hz.
- Disable completion-animation glow blur passes at perf tier `low`.

## 12. Patches to existing files

Minimal — exactly the same shape of patch we made for `colour-builder` and `balloon-math`:

| File | Change |
| --- | --- |
| `src/App.tsx` | Import `BuildingMode` + `buildingLogic`; add to `switch(gameMode)` in `getActiveLogic()`; render in the game-state JSX. ~20 lines. |
| `src/features/menu/ModeSelectionMenu.tsx` | Add `building` to `GameMode` union and `MODES` array (Tier 1 placement, per PRD §2). ~10 lines. |
| `src/lib/analytics.ts` | Extend `EventName` union (13 new entries). 1 line per event. |
| `src/core/featureFlags.ts` | Add `building` to the `GameMode` type and a flag preset `enableForMode('building')`. ~5 lines. |
| `src/core/filters/OneEuroFilter.ts` | Register a `'building'` profile — copy `'sort-and-place'` initially, tune in QA. ~5 lines. |
| `src/components/ModeBackground.tsx` | Add `'building'` case routing to `BuildingBackground`. ~3 lines. |
| `src/lib/useAdaptiveEngine.ts` | No change — already game-mode-agnostic. |
| `docs/MODE-BIBLE.md` | Add a Building section. ~30 lines. |

Net new code lives entirely under `src/features/modes/building/`.

## 13. Feature flagging

Two flags, both default OFF:

- `buildingMode` — top-level kill switch. Lives in `featureFlags.ts`. When OFF, the menu tile is hidden.
- `buildingSandbox` — Sandbox subsystem. Ships in Phase 3 separately.

LIOS adaptive flag (`?lios_adaptive=shadow|live`) already exists and applies automatically.

## 14. Testing strategy

Following the project conventions in `CLAUDE.md` (TDD London School, mock-first):

### Unit
- `buildingSemantics.test.ts` — role/object affinity table is symmetric, no orphan roles.
- `buildingSnap.test.ts` — pull math is monotonic, commit boundary is exact at tolerance, assistance escalation triggers at 3 attempts and caps at 1.5x.
- `buildingState.test.ts` — FSM transitions, no illegal jumps.
- `buildingDifficulty.test.ts` — LIOS decision mapping is total (every regime/scaffold combination resolves).

### Integration
- Headless frame-loop harness: feed scripted `frameData` sequences, assert telemetry events fire in the right order and with correct meta.
- Snapshot test on per-build telemetry transcript for the Flower Vase (Guided) and Bicycle (Assisted) reference builds — these become the QA gold paths.

### Visual / manual
- Add to `docs/ACCEPTANCE-CRITERIA.md`:
  - Snap feel passes the "release just inside the tolerance ring, expect commit" test 20/20 trials.
  - Wrong-piece attempt never produces a red, X, buzzer, or harsh sound.
  - Completion magic holds the child in-canvas for the full duration on 8/10 internal kid-testers.
- QA playbook (`docs/QA.md`) gets a Building section covering all three build types and Sandbox.

### Performance
- Re-use the existing `scripts/tracking-smoke-test.ts` harness; add a Building-specific scenario asserting <11ms render budget at tier medium with 8 pieces on screen.

## 15. Open technical questions

1. **Sandbox snap graph.** When a child builds a `rocket-bicycle`, the compound becomes a new pseudo-object. Do we persist the compound (so it animates next session) or recompute every time? Phase 3 decision.
2. **Hand presence in Discovery.** Discovery hides the silhouette; if a child has zero spatial intuition, they may be stuck. Do we surface a "Show me" gesture (palm-open held for 1.5s reveals silhouette for 3s)? Recommend yes for accessibility.
3. **Group mode topology.** Shared-state authority — single device leader vs. CRDT. Defer until Phase 5 planning.
4. **Asset performance on perf tier `low`.** 10 SVG sprites + a silhouette + background may stress old Chromebooks. Plan a `low`-tier rasterised fallback (PNG instead of SVG, no top-highlight layer).

## 16. Definition of Done — MVP (Phase 1)

Building mode (Phase 1) ships when **all** of the following are true:

- [ ] Menu tile lives in Tier 1; `?mode=building` deep link works.
- [ ] One world (Home) with three Guided objects: Flower Vase, Tree, Simple House.
- [ ] Full 5-phase flow runs end to end with no console errors at perf tier medium.
- [ ] All 13 new telemetry events fire correctly per the integration snapshot test.
- [ ] Completion magic animations finish without dropped frames at perf tier medium.
- [ ] Zero red/X/shame surfaces in QA review.
- [ ] LIOS receives `current_item` after every `successful_snap` (shadow mode).
- [ ] Adult Gate exits cleanly mid-build.
- [ ] First-completion median <4min in five internal kid-test sessions.

---

## Appendix — Reuse map (what we steal vs. build)

| Capability | Source we reuse | New work |
| --- | --- | --- |
| Hand tracking + pinch | `InteractionState`, `PenStateManager` | none |
| Grab smoothing | `OneEuroFilter2D` | new profile in `OneEuroFilter.ts` |
| Magnetic snap pattern | `sortAndPlaceLogic` `magneticTargets` | extend with semantic gate + assistance escalation |
| Stage progression idea | `sortAndPlaceLogic` `LEVEL_ORDER` | per-world catalog instead of linear levels |
| Sprite system | `kid-ui/kidIcons` | register ~250 sprite keys |
| Audio cushion | `TactileAudioManager` | add `building` cues |
| Voice prompts | `narrator` | add per-object scripts |
| Countdown / message cards | `countdownService`, `messageCardService` | reused as-is |
| Celebration overlay | `Celebration.tsx` | one new `BuildingCelebration` variant |
| Adaptive recommendation | `useAdaptiveEngine` | none — already mode-agnostic |
| Telemetry envelope | `logEvent`, `markGrab`, `elapsedSinceGrab` | 13 new event names + payload builders |
| Background system | `ModeBackground` + `BalloonMathBackground`-style component | one per world |

Roughly **70% of the experience is reuse**. The new value is the snap engine, semantic graph, completion animator registry, and the catalog.
