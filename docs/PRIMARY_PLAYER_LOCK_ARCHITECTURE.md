# Primary Player Lock, Gesture Navigation & Distraction-Free Gameplay — Architecture & Affected Files

**Status:** Pre-code audit + proposed architecture. **No code changed yet.** Awaiting sign-off on the phased plan before implementation, as required by the brief's Delivery Requirements.
**Date:** 2026-06-25 · **Branch:** `master` (working tree already has unrelated uncommitted changes — see "Git safety" below).
**Source-of-truth order applied:** verified repository behaviour first, then docs, then this proposal. Sections are explicitly labelled **Verified**, **Inferred**, or **Proposed**.

---

## 1. Executive summary

The classroom failure (cursor jumping between children's hands) has a single structural root cause:

> **There is no person-identity layer anywhere in the pipeline.** MediaPipe `HandLandmarker` is configured for `numHands: 1` (or `2`), and every downstream consumer uses *whatever hand MediaPipe returns this frame*. When several hands are visible, MediaPipe's per-frame "most-confident hand" choice flips between people, and the cursor follows it. There is no lock, no hysteresis, no body association, and no concept of an "active player."

This is **Verified** from the code (Section 2). The fix is not tuning smoothing — it is inserting a new **`ActivePlayerLock`** stage between raw detection and the interaction point, plus a lightweight person-association signal (Pose/Face) so a hand can be tied to one body.

Two supporting systems are partially built and can be extended rather than rebuilt:

- A **shared gesture pointer** (`gestureInput.ts` + `GestureLayer.tsx`) already exists with hover/pinch/dwell and a cooldown — a good base for global gesture-first navigation, but only **2 of ~13 modes feed it**.
- Survey/feedback deferral was **already started** (git log: "defer surveys to menu") — the gameplay-overlay policy needs to be made systematic, not per-component.

This document gives the proposed architecture, the full list of affected files, and a phased roadmap mapped to the brief's acceptance tests.

---

## 2. Verified current behaviour (grounded in code)

### 2.1 The pipeline as it actually runs

```
TrackingLayer.tsx (mounts <video>+<canvas>, owns camera + tracker lifecycle)
  └─ useVisionLoop.ts            setTimeout loop @ ~30fps (VISION_FPS_TARGET)
       └─ handTracker.detect(video, ts)         → HandLandmarkerResult | null
            └─ onResults({ handLandmarkerResult, timestamp })
                 └─ TrackingLayer builds TrackingFrameData { filteredPoint, pinchActive, hasHand, ... }
                      └─ mode onFrame(ctx, frameData, w, h, drawingUtils)   // per-mode render
                           └─ setGesturePointer(filteredPoint, pinch, hasHand)  // global singleton
                                └─ GestureLayer.tsx reads getGesturePointer() → drives menu UI
```

### 2.2 Where the hand is chosen — the switching point (Verified)

- **`src/core/handTracker.ts:114-120`** — `HandLandmarker.createFromOptions({ numHands, minHandDetectionConfidence: 0.5, minTrackingConfidence: 0.5 })`. `numHands` is `1` unless `enableTwoHandMode` (`handTracker.ts:71-73`). With `numHands: 1`, MediaPipe returns the single hand it judges most likely **each frame independently** — this is the flip.
- **`src/camera/useVisionLoop.ts:62-80`** — passes the raw result straight to `onResults`. No filtering, no identity, no continuity check.
- **`src/core/TwoHandDetector.ts:61-65`** — assigns left/right purely by **array order and `wrist.x < 0.5`**:
  ```ts
  const hand0Wrist = hand0[0];
  const leftHand  = hand0Wrist.x < 0.5 ? hand0 : hand1;
  const rightHand = hand0Wrist.x >= 0.5 ? hand0 : hand1;
  ```
  This is exactly the anti-pattern the brief calls out ("must not rely on hand array order / first hand returned"). Detection order is not stable between frames.
- **`src/core/gestureInput.ts:18-31`** — a module-level singleton holding one `GesturePointer`. Whatever the active mode publishes becomes *the* pointer. No owner field.

**Conclusion (Verified):** nothing in the chain enforces "same person." The brief's required state flow (`SEARCHING → CANDIDATE_DETECTED → PLAYER_LOCKED → TEMPORARILY_LOST → REACQUIRING → RESET`) does not exist.

### 2.3 What already exists and is reusable (Verified)

| Capability | Where | Reuse |
|---|---|---|
| Resilient tracker init (GPU→CPU fallback, pinned WASM, timeout, error surfacing) | `handTracker.ts` | Keep as-is; sound foundation. |
| 30fps decoupled vision loop, no per-frame React state, FPS/missing-frame telemetry | `useVisionLoop.ts` | Extend — add the lower-rate pose tick here. |
| Shared air-pointer with hover/pinch/dwell + cooldown, `data-gesture` targeting, `pointer-events:none` overlay | `gestureInput.ts`, `GestureLayer.tsx` | Promote to the single app-wide pointer system. |
| Smoothing / occlusion / prediction primitives | `src/core/tracking/{PredictiveSmoothing,OcclusionRecovery,PinchLogic,DepthSensitivity,DynamicResolution}.ts` | Reuse inside the lock + unified pointer. |
| Wave-to-begin gate | `src/features/onboarding/WaveToWake.tsx` (1040 lines) | Becomes the **lock trigger** (the waver is the player). |
| Feature-flag system | `src/core/trackingFeatures.ts`, `src/core/flags/TrackingFlags.ts` | Ship the lock behind a flag. |
| Tracking debug overlay | `src/components/TrackingDebugOverlay.tsx` | Extend with candidate IDs / lock state. |

### 2.4 Gaps vs. the brief (Verified by absence)

1. **No person model** — `grep` for `PoseLandmarker|FaceLandmarker|FaceDetector|segmentation` in `src/` returns nothing. Hand-to-body association is impossible today.
2. **No ActivePlayerLock / hysteresis / reacquisition** — `grep activePlayer|primaryPlayer|playerLock` returns nothing.
3. **Gesture-first nav is partial** — only `tracing/tracingPlayfulFrame.ts:126` and `magicCanvas/magicCanvasFrame.ts:132` call `setGesturePointer`. The other modes (`sortAndPlace`, `wordSearch`, `colourBuilder`, `rainbowBridge`, `balloonMath`, `preWriting`, `building`, `gestureSpelling`, `FreePaintMode`) and shared navigation chrome rely on `onClick`/pointer handlers.
4. **No systematic gameplay-overlay policy** — feedback/survey/modal components exist and are gated ad hoc per component (`src/features/feedback/*`, `ExitFeedbackModal`, `HappinessCheck`, `StuckHelp`, `PremiumLockModal`, `CelebrationOverlay`, etc.).
5. **No camera-positioning / two-metre setup stage** — `WaveToWake` and `BubbleCalibration` exist but there is no "move closer / move back / perfect position" framing flow.

---

## 3. Proposed architecture

### 3.1 New module: `ActivePlayerLock` (Proposed)

A pure, framework-free state machine (`src/core/tracking/ActivePlayerLock.ts`) that sits **between `handTracker.detect()` and `TrackingFrameData`**. It consumes the raw multi-hand result plus an optional low-rate person signal and outputs **at most one owned hand**.

```
raw HandLandmarkerResult (numHands ↑ to 2–4)  ┐
low-rate PersonSignal (pose wrists / face boxes) ┼─► ActivePlayerLock.update() ─► LockedHand | null ─► filteredPoint/pinch
                                                 ┘
```

**State machine** (exact brief flow):

| State | Enter when | Output |
|---|---|---|
| `SEARCHING` | no lock, scanning candidates | no pointer; candidate scores tracked |
| `CANDIDATE_DETECTED` | one candidate leads scoring | no pointer yet (waiting for stability) |
| `PLAYER_LOCKED` | candidate stable **500–800 ms** *and* a valid wave accepted | owned hand → pointer |
| `TEMPORARILY_LOST` | owned hand missing **< 1.5 s** | **hold last cursor position**, no switching |
| `REACQUIRING` | within loss window, matching by body/wrist/path | re-bind to same identity |
| `RESET` | session end / teacher Reset / re-entry / new accepted wave | clear identity → `SEARCHING` |

**Candidate scoring** (weighted, never single-frame): wave confidence · centrality · hand+body scale · estimated distance · landmark stability across N frames · hand↔body association strength. Lock requires a stable leader for ~500–800 ms.

**Hysteresis (critical):** a locked player is only replaced by `RESET` events — never because another hand scores higher. The challenger must beat the incumbent by a margin *and* sustain it past a long dwell, but in normal operation only explicit reset changes the player. Small confidence dips never switch.

**Identity continuity through occlusion:** on brief loss, retain `{bodyCentre, shoulder, wrist, handScale, velocity, lastPoint}` and reacquire the nearest match within a gated radius. Hold cursor during the gap.

### 3.2 Person association — lightweight, lower frame-rate (Proposed)

MediaPipe `tasks-vision` (already a dependency) ships `PoseLandmarker` and `FaceDetector`. Approach:

- **Hands at gameplay rate (~30fps)** — unchanged loop.
- **Pose (or Face) at ~5–8fps** on a staggered tick inside `useVisionLoop` (separate landmarker instance, GPU→CPU fallback mirroring `handTracker`).
- **Associate** each detected hand wrist (landmark 0) to the nearest pose wrist (15/16); store body centre + shoulder span as the identity anchor and a distance proxy.
- The lock accepts only hands associated with the locked body.

Fallback when pose is unavailable/too slow (low-end Chromebook): degrade gracefully to **hand-only lock** using spatial+temporal continuity (position, scale, velocity, stability) — still far better than today's order-based selection. Pose is an enhancer, not a hard dependency, to protect the performance requirement.

### 3.3 Unified pointer pipeline (Proposed)

Promote `gestureInput.ts` to the single normalised pointer for the whole app, fed **once** from `TrackingLayer` after the lock (not per-mode). Add an owner/identity stamp and lock-state so consumers can show "bring your hand back." Route every mode and all navigation chrome through it, applying one smoothing/coordinate-mapping path (reusing `PredictiveSmoothing`/`DepthSensitivity`) so tracing, menus, sorting and selection feel identical.

### 3.4 Gesture-first navigation (Proposed)

Standardise on the existing `data-gesture` contract. Every interactive control after wave (start, activity select, continue, replay, next, colour, difficulty, pause, resume, exit, completion) exposes `data-gesture` with a generous hit area (larger than the visual button). Keep pinch primary; keep dwell as the accessible fallback (already implemented in `GestureLayer`). No mouse/touch-only path after gesture mode begins (adult/teacher controls excepted).

### 3.5 Gameplay UI policy (Proposed)

A single `GameplayUiPolicy` gate (context/provider) that **suppresses** any survey/feedback/modal/toast/onboarding/teacher-notification while `appState === 'game'` and play is active. Instruction → show pre-round, dismiss before active play; small auto-dismiss contextual hints only; success feedback as in-world animation/sound/stars/edge progress, never a centre overlay over the next target. Surveys/feedback move to menu / end-of-session / teacher dashboard (extends the existing "defer surveys" work).

### 3.6 Camera setup & two-metre zone (Proposed)

A pre-gameplay `CameraSetupStage` estimating positioning from **shoulder span / face size / hand size / framing** (not a false absolute distance), with move-closer/back/left/right guidance and a "Perfect position" confirmation, then **fully removed** before gameplay. Reuses the pose signal from 3.2.

### 3.7 Cursor stability, performance, debug (Proposed)

- One smoothing path tuned to follow deliberate motion fast while rejecting jitter — no heavy lag (brief explicitly warns against over-smoothing).
- All on-device; no frames leave the browser (privacy contract preserved); pose at reduced rate; reuse results across classifier + engine; no per-frame React state (loop already honours this).
- Extend `TrackingDebugOverlay` behind `?debug=tracking` to show candidate IDs, active player state, confidence, pose-association and lock state.

---

## 4. Affected files

**New:**
`src/core/tracking/ActivePlayerLock.ts`, `…/PersonAssociator.ts`, `…/poseTracker.ts`; `src/core/tracking/__tests__/ActivePlayerLock.test.ts`; `src/features/onboarding/CameraSetupStage.tsx`; `src/context/GameplayUiPolicy.tsx`.

**Modified (core/pointer):** `src/camera/useVisionLoop.ts` (pose tick), `src/features/tracking/TrackingLayer.tsx` (run lock, feed pointer once), `src/core/gestureInput.ts` (identity/lock fields), `src/components/GestureLayer.tsx` + `MagicCursor.tsx` (lock-aware), `src/core/trackingFeatures.ts` + `flags/TrackingFlags.ts` (flags), `src/components/TrackingDebugOverlay.tsx`.

**Modified (gesture-first nav — add `data-gesture`):** `src/features/menu/ModeSelectionMenu.tsx`; mode shells `sortAndPlace`, `wordSearch`, `colourBuilder`, `rainbowBridge`, `balloonMath`, `preWriting`, `building`, `gestureSpelling`, `FreePaintMode.tsx`, `tracing`, `magicCanvas`; `BubbleCalibration.tsx`; completion/exit chrome.

**Modified (overlay policy):** `src/features/feedback/{ExitFeedbackModal,HappinessCheck,ExpectationCheck,StuckHelp}.tsx`, `src/features/kid2/CelebrationOverlay.tsx`, `src/features/parent/PremiumLockModal.tsx`, `src/App.tsx` (policy provider, `appState` gating).

**Out of scope / do not touch:** `platform/` (Next.js auth/classroom), Supabase migrations, billing — unless a later phase requires teacher Reset Player wiring, which would be additive.

---

## 5. Phased roadmap (mapped to acceptance tests)

> **Phase 1 — SHIPPED (behind flag, default OFF) on `master`, 2026-06-25.** Enable with `?flags=activePlayerLock`. Files: `src/core/tracking/ActivePlayerLock.ts` (pure state machine), `tests/activePlayerLock.test.ts` (11 tests, passing), flag in `src/core/featureFlags.ts` + `trackingFeatures.ts`, `numHands→4` when on (`handTracker.ts`), result filtering in `TrackingLayer.tsx`, teacher **Change player** control + nudge + debug chip in `ActivePlayerLockHud.tsx`. Reset clears identity/held cursor/candidates → SEARCHING (local to host; no Supabase/realtime wiring). Verified: `tsc -b` clean, eslint no new issues, 234/234 unit tests, CSP check pass. **Not yet manually verified on hardware** — see manual acceptance steps below.

| Phase | Scope | Acceptance test satisfied |
|---|---|---|
| **1 — Lock core (no UI risk) ✅** | `ActivePlayerLock` state machine + scoring + hysteresis + occlusion hold, **hand-only**, behind flag. Unit tests with synthetic multi-hand frames. Debug overlay shows state. | Multi-person, Temporary-occlusion, Player-exit (logic-level) |
| **2 — Person association** | Pose/Face at low rate; hand↔body binding; distance proxy. | Strengthens Multi-person under crowding |
| **3 — Unified pointer + gesture-first nav** | One pointer post-lock; `data-gesture` across all modes + chrome. | Gesture-navigation (full journey, no mouse) |
| **4 — Gameplay UI policy** | `GameplayUiPolicy` suppression; instructions/feedback rework. | Gameplay-obstruction |
| **5 — Camera setup / two-metre zone** | `CameraSetupStage`, removed before play. | Positioning quality |
| **6 — Perf + device pass** | Chromebook profiling, frame/inference/jitter metrics, smoothing tune. | Low-performance device |

Each phase ships behind a flag, with tests + `npm run validate` (type-check, lint, CSP) and a verification report, per project standards.

---

## 6. Risks & open decisions

- **Pose cost on Chromebooks** — mitigated by low rate + hand-only fallback; needs real-device measurement (Phase 6).
- **Teacher "Reset Player"** — needs a `RESET` trigger from classroom control; confirm whether to wire into `platform/` classroom now or stub the hook in Phase 1.
- **Lock vs. legitimate handover** — only explicit reset / new accepted wave changes player; confirm a teacher-facing affordance is acceptable as the deliberate path.
- **Working tree** has unrelated uncommitted changes on `master`. Recommend implementing on a fresh `feat/active-player-lock` branch and not touching those files.

---

## 7. Git safety note (Verified)

`git status` shows `master` with uncommitted edits across `platform/` and `src/features/classmode/`. Per project rules I will not commit, push, or alter those. Implementation should branch from current `master` into `feat/active-player-lock`.
