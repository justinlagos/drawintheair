# DrawInTheAir System Map

A kids' hand-tracking drawing web app built with React, TypeScript, and Vite. Uses MediaPipe HandLandmarker for real-time hand detection and gesture recognition.

---

## Quick Facts

- **Framework**: React 18 + TypeScript + Vite
- **Hand Tracking**: MediaPipe HandLandmarker (float16 model from Google Storage CDN)
- **Detection FPS**: 20-30 fps (perf tier-dependent)
- **Render FPS**: 60 fps (requestAnimationFrame)
- **Hand Gestures**: Pinch detection with hysteresis filtering
- **Drawing**: Catmull-Rom spline with velocity-based pressure simulation
- **State Management**: State machine (onboarding → menu → game), URL-based mode routing

---

## File Tree Overview

```
src/
├── main.tsx                              # Hash/path router, custom routing logic
├── App.tsx                               # State machine: onboarding → menu → game
├── pages/                                # Static pages (Landing, Schools, Parents, FAQ, etc.)
├── core/
│   ├── useWebcam.ts                      # React hook: camera access + perf-tier constraints
│   ├── handTracker.ts                    # MediaPipe HandLandmarker wrapper
│   ├── InteractionState.ts               # Singleton: pinch detection + filtering pipeline
│   ├── PenStateManager.ts                # State machine: pinch-to-draw (UP ↔ DOWN)
│   ├── drawingEngine.ts                  # Singleton: stroke rendering + One Euro Filter
│   ├── coordinateUtils.ts                # Normalization + canvas mapping
│   ├── perf.ts                           # Perf tier detection (high/medium/low)
│   ├── featureFlags.ts                   # Feature flag system (localStorage + URL params)
│   ├── filters/
│   │   └── OneEuroFilter.ts              # Adaptive smoothing (mode-specific profiles)
│   └── flags/
│       └── TrackingFlags.ts              # Tracking-specific feature flags
├── features/
│   ├── tracking/
│   │   └── TrackingLayer.tsx             # Detection loop + mirrorResults + onFrame callback pipeline
│   └── modes/
│       ├── FreePaintMode.tsx             # Free drawing mode
│       ├── freePaintLogic.ts             # Logic: drawingEngine.processPoint() pipeline
│       ├── freePaintLayeredCanvas.ts     # Canvas: base layer + preview layer + cursor layer
│       ├── freePaintRenderPoint.ts       # Cursor smoothing (separate One Euro Filter)
│       ├── tracing/
│       │   ├── TracingMode.tsx           # Tracing UI + progress tracking
│       │   └── tracingLogicV2.ts         # Path evaluation + forward-only progress
│       ├── calibration/
│       │   ├── BubbleCalibration.tsx     # 6-level bubble pop game
│       │   └── bubbleCalibrationLogic.ts # Bubble physics + collision detection
│       ├── preWriting/
│       │   └── PreWritingMode.tsx        # Letter formation guides (uses TracingMode)
│       ├── sortAndPlace/
│       │   └── SortAndPlaceMode.tsx      # [Stub] Drag-and-drop placement
│       └── wordSearch/
│           └── WordSearchMode.tsx        # Grid-based word search
```

---

## Routing & Navigation

### Custom Router (src/main.tsx)

Root component implements hash/path-based routing:

| Route | Component | Purpose |
|-------|-----------|---------|
| `/play`, `/onboarding` | App.tsx | Game/onboarding interface |
| `/` | Landing.tsx | Home page |
| `/schools`, `/parents`, `/faq` | Static pages | Marketing + info |
| `/privacy`, `/terms`, `/cookies` | Static pages | Legal |
| `/safeguarding`, `/accessibility` | Static pages | Trust + accessibility |
| `/admin`, `/training` | Static pages | Staff/teacher tools |
| `/school`, `/parent` | Static pages | Institutional pages |
| `?debug=qa` | QA page | Debug overlay |

### State Machine (src/App.tsx)

Three-state machine driving the game flow:

```
onboarding (initial) → menu → game (loop back to menu)
```

**URL Parameters**:
- `?screen=menu|game` - current screen
- `?mode=free|pre-writing|calibration|sort-and-place|word-search` - game mode

---

## Module Responsibilities

### Camera Pipeline

**File**: `src/core/useWebcam.ts`

React hook managing video stream acquisition:
- Calls `navigator.mediaDevices.getUserMedia()`
- Perf tier-based constraints: resolution, frame rate
- Returns video element ref + stream cleanup

```typescript
// Constraints vary by perf tier
// high:   1920x1080 @ 30fps
// medium: 1280x720 @ 24fps
// low:    640x480 @ 20fps
```

**Used by**: TrackingLayer.tsx (video element, detection input)

---

### Hand Tracking Pipeline

**File**: `src/features/tracking/TrackingLayer.tsx`

Orchestrates the full hand→interaction pipeline:

1. **Detection Loop** (setTimeout-based)
   - Target FPS: 20-30 (tier-dependent)
   - Trigger: `handTracker.detect(video, timestamp)`
   - Reference: Line 517

2. **Result Processing**
   - mirrorResults: Flip X coordinate for natural interaction (Line 293)
   - interactionStateManager.process(results, timestamp)
   - Confidence gating + smoothing

3. **Render Loop** (requestAnimationFrame @ 60fps)
   - Canvas DPR scaling
   - Debug overlay, camera notifications, hand guidance
   - onFrame callback → mode logic

**Bottleneck Note**: Detection loop uses setTimeout, not aligned with rAF (Line 517)

---

### Hand Tracker

**File**: `src/core/handTracker.ts`

MediaPipe HandLandmarker wrapper:
- Model: `hand_landmarker.task` (float16) from Google Storage CDN
- GPU delegate enabled
- Detects 1-2 hands, minConfidence 0.5
- Returns landmarks (21 points per hand) + confidence scores

**Entry Point**: `initialize()` at Line 9

---

### Interaction State Manager

**File**: `src/core/InteractionState.ts`

Singleton managing all hand gesture processing:

**Core Components**:

1. **Smoothing**: One Euro Filter (index tip + thumb tip)
   - Mode-specific profiles (bubble-pop, tracing, free-paint, sort-and-place, word-search, menu)
   - Default: β=1.0, mincutoff=1.0, velocity=1.0

2. **Pinch Detection**
   - Hysteresis: down=0.32, up=0.48 (scaled by handScale)
   - Input: distance(indexTip, thumbTip) / handScale
   - Reference: Line 636

3. **Confidence Gating**
   - Time-based OR frame-based (behind TrackingFlags)
   - Dropout threshold, stability detection

4. **Jump/Teleport Protection**
   - Rejects large position deltas between frames
   - Jitter spike guard + optional predictive smoothing

5. **Optional Features** (behind TrackingFlags)
   - PredictiveSmoothing: One Euro + Kalman filter combo
   - DepthSensitivity: Depth-based filtering
   - OcclusionRecovery: Handle partial occlusion
   - SessionCalibration: Per-session offset correction

**Output**: `frameData = { filteredPoint, pinchActive, pressValue, confidenceScore }`

**Entry Point**: `process()` method at Line 249

---

### Drawing Engine

**File**: `src/core/drawingEngine.ts`

Singleton handling all stroke rendering and processing:

**Pipeline**:

1. **Point Processing** (`processPoint()` at Line 112)
   - One Euro Filter for stroke smoothing (separate from InteractionState)
   - Point resampling: 2-3.5px spacing (perf tier-dependent)
   - Jump protection (50px threshold)
   - Velocity calculation for pressure simulation

2. **Pen State Machine** (via PenStateManager)
   - State: UP ↔ DOWN with 2-frame debounce
   - Pinch hysteresis: 0.35 down, 0.45 up

3. **Rendering** (`render()` at Line 331)
   - Catmull-Rom spline fitting per 4 consecutive points
   - Velocity-based pressure simulation
   - Layered rendering:
     - renderCommittedStrokes: base layer (completed strokes)
     - renderCurrentStroke: preview layer (in-progress stroke)
   - Glow passes: 3 filter blur passes per stroke (expensive, Line 430-448)

4. **Canvas Output**
   - DPR-aware sizing in TrackingLayer
   - Rendered via onFrame callback from TrackingLayer

**Bottleneck Note**: updatePerfSettings() called every resample (Line 246) - per-point overhead

---

### Pen State Manager

**File**: `src/core/PenStateManager.ts`

State machine for pinch-to-draw gesture:

**States**: UP ↔ DOWN (2-frame debounce)

**Pinch Detection**:
- Down threshold: 0.35 * handScale
- Up threshold: 0.45 * handScale
- Confidence gating: 3-frame dropout threshold
- Jump protection: 8% of screen diagonal

**Entry Point**: `process()` method at Line 91

---

### One Euro Filter

**File**: `src/core/filters/OneEuroFilter.ts`

Adaptive smoothing for hand position + cursor movement:

**Algorithm**: Low cutoff for slow motion (smooth), high cutoff for fast motion (responsive)

**Mode-Specific Profiles**:

| Mode | Style | Use Case |
|------|-------|----------|
| bubble-pop | Very responsive | Fast target tracking |
| tracing | Smooth/stable | Precise path following |
| free-paint | Balanced | Natural drawing feel |
| sort-and-place | Responsive | Object manipulation |
| word-search | Smooth | Grid selection |
| menu | Responsive | UI interaction |

**Entry Point**: `filter()` method at Line 129

---

### Coordinate System

**File**: `src/core/coordinateUtils.ts`

Transformation pipeline:

1. **MediaPipe Output**: Normalized 0-1 range
2. **Mirror X**: Applied in TrackingLayer mirrorResults (Line 293)
   ```typescript
   mirrorX = 1 - normalizedX  // Natural left-hand feel
   ```
3. **Canvas Mapping**: `normalizedToCanvas(point, canvasWidth, canvasHeight)`
4. **DPR Scaling**: Applied in TrackingLayer render loop

---

### Performance System

**File**: `src/core/perf.ts`

Auto-detection of device tier + quality scaling:

**Tier Detection**:
- **high**: Powerful devices, full features enabled
- **medium**: Mid-range devices, moderate scaling
- **low**: Older devices, aggressive optimization

**Based On**:
- Device capabilities (GPU, RAM detection)
- FPS measurement (initial 1-second probe)

**Quality Scaling** (6 levels, behind gradualQualityScaling flag):
- Camera resolution: 1920×1080 → 640×480
- Detection FPS: 30 → 20
- Glow passes: 3 → 1
- Shadow blur: enabled → disabled
- Particle effects: enabled → disabled
- DPR cap: 2 → 1
- Resample spacing: 2px → 3.5px

**Entry Point**: `getConfig()` method (polled per frame in multiple locations - bottleneck)

---

### Feature Flags

**File**: `src/core/featureFlags.ts`

Global feature flag system:

**Defaults**: All OFF

**Persistence**: localStorage

**Overrides**:
- URL param: `?flags=flagName1,flagName2`
- Convenience: `?airpaint=true` enables all flags

**Session Management**:
- Rollback on errors (graceful degradation)
- Mode-specific presets (currently empty)

---

### Tracking Flags

**File**: `src/core/flags/TrackingFlags.ts`

Tracking-specific feature flags (separate system):

**All Default OFF**:
- modeFilterProfiles
- timeBasedConfidence
- velocityPinchTolerance
- stabilityDetection
- visualGuidance
- gradualQualityScaling
- sessionCalibration
- teleportGuard
- jitterSpikeGuard
- metricsHud

---

## Per-Mode Flow

### Free Paint Mode

**Files**:
- `src/features/modes/FreePaintMode.tsx` - UI + mode wrapper
- `src/features/modes/freePaintLogic.ts` - Core logic
- `src/features/modes/freePaintLayeredCanvas.ts` - Canvas management
- `src/features/modes/freePaintRenderPoint.ts` - Cursor rendering

**Input** (from frameData):
- `filteredPoint` - hand position (after One Euro filtering)
- `pinchActive` - pinch gesture detected
- `pressValue` - velocity-based pressure

**Flow**:

```
frameData → freePaintLogic.onFrame()
  ↓
drawingEngine.processPoint(filteredPoint, pinchActive, pressValue)
  ↓
PenStateManager.process() → UP/DOWN state
  ↓
If DOWN: Add point to current stroke (Catmull-Rom path building)
  ↓
Canvas render: renderCommittedStrokes + renderCurrentStroke + cursor
  ↓
Tool system: brush, eraser, fill (separate from drawing engine)
  ↓
Undo/redo: Ring buffer stroke history
```

**Zero-Lag Optimization**: Incremental stroke rendering via ring buffer (no full redraw per frame)

**Cursor Smoothing**: Separate One Euro Filter (freePaintRenderPoint.ts)

---

### Tracing Mode

**Files**:
- `src/features/modes/tracing/TracingMode.tsx` - UI + progress
- `src/features/modes/tracing/tracingLogicV2.ts` - Core path logic

**Content**: 47 paths in 4 packs
- Lines (basic shapes)
- Shapes (geometry)
- Letters (A-Z)
- Numbers (0-9)

**Input** (from frameData):
- `filteredPoint` - hand position
- `pinchActive` - not used for drawing

**Flow**:

```
frameData → tracingLogicV2.onFrame()
  ↓
Polyline path evaluation:
  - Forward-only progress: cannot go backward on path
  - On-path vs. off-path detection (distance-based)
  ↓
Magnetic assist: Gentle centerline attraction (kid-friendly)
  ↓
Streak meter:
  - Builds when on-path
  - Decays when off-path
  ↓
Progress tracking: localStorage persistence
  ↓
Canvas: Render reference path + user trace + progress indicator
```

**Key Feature**: Forward-only constraint prevents retracing

---

### Bubble Pop Mode (Calibration)

**Files**:
- `src/features/modes/calibration/BubbleCalibration.tsx` - UI + level progression
- `src/features/modes/calibration/bubbleCalibrationLogic.ts` - Physics + collision

**Input** (from frameData):
- `filteredPoint` - hand position (collision detection)

**Flow**:

```
frameData → bubbleCalibrationLogic.onFrame()
  ↓
Collision detection:
  - Hit radius = 1.35× actual bubble radius (kid-friendly)
  - Distance(filteredPoint, bubbleCenter) < hitRadius
  ↓
Bubble lifecycle:
  - Spawn: Random position, size, velocity
  - Physics: Gravity + bounce simulation
  - Hit: Pop animation + score increment
  ↓
Level progression: 6 levels with increasing difficulty
  ↓
Timed rounds: 30 seconds per round
  ↓
Canvas: Landscape background with parallax scrolling
```

**Key Feature**: Generous hit detection radius for kids (1.35×)

---

### Sort and Place Mode

**File**: `src/features/modes/sortAndPlace/SortAndPlaceMode.tsx`

**Status**: Stub/placeholder implementation

**Planned Input**:
- `pinchActive` - grab detection for drag-and-drop
- `filteredPoint` - drag position while pinching

**Planned Flow**:
```
frameData → onFrame()
  ↓
If pinchActive: Grab object at filteredPoint
  ↓
While pinching: Update object position to filteredPoint
  ↓
On pinch release: Drop object, check placement zone
```

---

### Word Search Mode

**File**: `src/features/modes/wordSearch/WordSearchMode.tsx`

**Input** (from frameData):
- `filteredPoint` - hand position (cell hover/selection)

**Flow**:

```
frameData → onFrame()
  ↓
Cell hover detection: gridPosition(filteredPoint)
  ↓
Cell selection: When hand hovers over cell (or pinch)
  ↓
Word building: Horizontal/vertical word matching
  ↓
Canvas: Grid rendering + highlight selected cells
```

---

### Pre-Writing Mode

**File**: `src/features/modes/preWriting/PreWritingMode.tsx`

**Implementation**: Wrapper around TracingMode

- Uses tracingLogicV2 for letter formation guides
- Same forward-only progress constraint as Tracing
- Target audience: Kids learning to write letters

---

## Global Frame Loop Flow

The unified detection and render loop across all modes:

```
┌─────────────────────────────────────────────────────────────────┐
│                       TrackingLayer.tsx                         │
│                  (src/features/tracking/)                       │
└─────────────────────────────────────────────────────────────────┘

Detection Loop (setTimeout @ 20-30fps, perf-dependent)
│
├─→ [Line 517] handTracker.detect(video, timestamp)
│   └─→ MediaPipe HandLandmarker inference
│       └─→ Returns: 21 landmarks/hand + confidence scores
│
├─→ [Line 293] mirrorResults(handResults)
│   └─→ mirrorX = 1 - normalizedX (natural interaction feel)
│
├─→ interactionStateManager.process(results, timestamp)
│   ├─→ [InteractionState.ts:249] Apply One Euro Filter
│   ├─→ [InteractionState.ts:636] Detect pinch gesture
│   ├─→ Confidence gating + stability checks
│   ├─→ Jump/teleport protection
│   └─→ Return: frameData = {
│           filteredPoint,    // filtered hand position
│           pinchActive,      // boolean
│           pressValue,       // velocity-based pressure
│           confidenceScore   // hand detection confidence
│       }
│
├─→ [Line 414] setCameraNotification (functional update - bottleneck)
│
└─→ latestInteractionStateRef.current = frameData


Render Loop (requestAnimationFrame @ 60fps)
│
├─→ Get latest frameData from latestInteractionStateRef
│
├─→ DPR-aware canvas sizing
│
├─→ Call onFrame callback (from current mode's logic)
│   └─→ Mode-specific: freePaintLogic, tracingLogicV2, bubbleCalibrationLogic, etc.
│       └─→ Process frameData into rendering commands
│           ├─→ For Free Paint: drawingEngine.processPoint(filteredPoint, pinchActive)
│           │   ├─→ [drawingEngine.ts:112] Apply drawing One Euro Filter
│           │   ├─→ Resample points (2-3.5px, [drawingEngine.ts:246])
│           │   ├─→ Jump protection (50px threshold)
│           │   └─→ PenStateManager.process() → UP/DOWN state
│           │       └─→ [PenStateManager.ts:91] Pinch detection + debounce
│           │
│           ├─→ For Tracing: tracingLogicV2.process(filteredPoint)
│           │   └─→ Path evaluation + forward-only progress
│           │
│           ├─→ For Bubble Pop: bubbleCalibrationLogic.process(filteredPoint)
│           │   └─→ Collision detection (hit radius = 1.35×)
│           │
│           └─→ Return: Canvas drawing operations
│
├─→ Debug overlay, camera notifications, hand guidance
│
├─→ drawingEngine.render() [drawingEngine.ts:331]
│   ├─→ Catmull-Rom spline interpolation (per 4 consecutive points)
│   ├─→ Velocity-based pressure simulation
│   ├─→ renderCommittedStrokes (base layer)
│   ├─→ renderCurrentStroke (preview layer)
│   └─→ Glow passes (3× filter blur - expensive) [Line 430-448]
│
└─→ Canvas frame complete


┌─────────────────────────────────────────────────────────────────┐
│  Synchronization Notes                                          │
├─────────────────────────────────────────────────────────────────┤
│ • Detection loop (20-30fps) runs asynchronously via setTimeout  │
│ • Render loop (60fps) via requestAnimationFrame                │
│ • frameData latched in latestInteractionStateRef (no frame drop)│
│ • Mode logic called every frame (may skip if no new data)      │
│ • Feature flag check per process frame (featureFlags#update)   │
│ • perf.getConfig() polled per frame (bottleneck - no caching)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Known Bottlenecks

### 1. Detection Loop Not Aligned with Render Loop

**File**: `src/features/tracking/TrackingLayer.tsx:517`

**Issue**: setTimeout-based detection loop runs independently from requestAnimationFrame

**Impact**: Frame synchronization jitter, potential missed frames

**Mitigation**: Consider scheduling detection on rAF rhythm

---

### 2. updatePerfSettings() Per-Point Overhead

**File**: `src/core/drawingEngine.ts:246`

**Issue**: perf tier check called inside resample loop

**Impact**: Per-point function call + object lookup

**Mitigation**: Cache perf config, only update on tier change

---

### 3. Expensive Glow Rendering

**File**: `src/core/drawingEngine.ts:430-448`

**Issue**: 3× filter blur passes per stroke segment

**Impact**: High GPU utilization on low-end devices

**Mitigation**:
- Reduce passes (1-2 instead of 3) on low tier
- Behind performanceBlur feature flag (currently no such flag)
- Consider pre-computed glow texture

---

### 4. Per-Segment Canvas Stroke Calls

**File**: `src/core/drawingEngine.ts:494-522`

**Issue**: `beginPath()` + `stroke()` called once per Catmull-Rom segment

**Impact**: Canvas state machine overhead

**Mitigation**: Batch segments into single stroke path

---

### 5. Functional Update in setCameraNotification

**File**: `src/features/tracking/TrackingLayer.tsx:414`

**Issue**: State update function called every detection frame

**Impact**: React scheduler overhead, potential re-render batching issues

**Mitigation**: Debounce or batch state updates

---

### 6. perf.getConfig() Polled Every Frame

**File**: `src/core/perf.ts` (used in multiple locations)

**Issue**: No caching, repeated object creation/lookup

**Impact**: Garbage collection pressure, CPU overhead

**Mitigation**: Cache config, invalidate on tier change only

---

### 7. featureFlags.updateFeatureFlags() Per-Frame

**File**: `src/core/InteractionState.ts:272`

**Issue**: Called during process() method (every interaction frame)

**Impact**: localStorage read + flag computation per frame

**Mitigation**: Debounce or batch flag updates

---

### 8. Inline Style Objects in Confetti

**File**: Celebration confetti component

**Issue**: New style objects created per frame

**Impact**: Garbage collection, object allocation overhead

**Mitigation**: Reuse style objects or use CSS classes

---

### 9. MagicCursor Smoothing Always Running

**File**: FreePaint cursor rendering

**Issue**: Cursor smoothing filter active even when hidden

**Impact**: Unnecessary computation

**Mitigation**: Conditional smoothing when visible

---

### 10. Velocity History Array Churn

**File**: `src/core/InteractionState.ts:494-508`

**Issue**: push() + shift() on every frame

**Impact**: Memory allocation per frame

**Mitigation**: Use circular buffer for velocity history

---

## Debug Entry Index

Quick reference for diving into specific systems:

| System | File | Method | Line |
|--------|------|--------|------|
| **Camera Start** | src/core/useWebcam.ts | startWebcam() | 31 |
| **MediaPipe Init** | src/core/handTracker.ts | initialize() | 9 |
| **Hand Detection** | src/features/tracking/TrackingLayer.tsx | handTracker.detect() | 272 |
| **Result Mirroring** | src/features/tracking/TrackingLayer.tsx | mirrorResults() | 293 |
| **Interaction Proc** | src/core/InteractionState.ts | process() | 249 |
| **One Euro Filter** | src/core/filters/OneEuroFilter.ts | filter() | 129 |
| **Pinch Detection** | src/core/InteractionState.ts | pinch logic | 636 |
| **Drawing Engine** | src/core/drawingEngine.ts | processPoint() | 112 |
| **Pen State** | src/core/PenStateManager.ts | process() | 91 |
| **Canvas Render** | src/core/drawingEngine.ts | render() | 331 |
| **Glow Rendering** | src/core/drawingEngine.ts | glow passes | 430-448 |
| **Catmull-Rom** | src/core/drawingEngine.ts | spline loop | 494-522 |
| **Free Paint Logic** | src/features/modes/freePaintLogic.ts | onFrame() | — |
| **Tracing Logic** | src/features/modes/tracing/tracingLogicV2.ts | onFrame() | — |
| **Bubble Logic** | src/features/modes/calibration/bubbleCalibrationLogic.ts | onFrame() | — |
| **Perf Config** | src/core/perf.ts | getConfig() | — |
| **Feature Flags** | src/core/featureFlags.ts | updateFeatureFlags() | — |
| **Tracking Flags** | src/core/flags/TrackingFlags.ts | all flags | — |

---

## Development Notes

### Frame Budget

- **Detection**: 20-30fps = ~33-50ms per frame (tier-dependent)
- **Render**: 60fps = ~16.67ms per frame (strict budget)
- **Bottleneck**: Detection frame rate limits point density; render frame rate limits visual smoothness

### Coordinate Space

Always think in **normalized 0-1** → **mirror X** → **canvas pixels**:

```typescript
// Raw MediaPipe output
normalizedX = 0.5  // Center

// After mirroring
mirrorX = 1 - 0.5 = 0.5  // Still center (natural for user)

// Canvas pixels (1920×1080)
canvasX = 0.5 * 1920 = 960
```

### Pinch Hysteresis

Prevents flicker at threshold boundary:

```
Pinch down:  distance < (0.32 * handScale)
Pinch up:    distance > (0.48 * handScale)
Neutral:     0.32 < distance < 0.48 (use previous state)
```

### Performance Tuning

Start with `perf.ts` tier detection. If frame rate drops:

1. Check `getConfig()` for current tier
2. Review glow passes (Line 430-448)
3. Check resample spacing (per-point overhead)
4. Profile detection vs. render time (setTimeout vs. rAF)

### State Machine Debugging

All modes feed frameData through the same pipeline. To debug a specific mode:

1. Set URL param: `?mode=freepaint&screen=game`
2. Check mode logic file (freePaintLogic.ts, etc.)
3. Add console.log in onFrame callback
4. Compare frameData values (filteredPoint, pinchActive, pressValue)
5. Trace through drawing engine or mode-specific logic

---

## Appendix: Mode-Feature Matrix

| Feature | Free Paint | Tracing | Bubble Pop | Sort/Place | Word Search |
|---------|-----------|---------|-----------|-----------|------------|
| Pinch Drawing | ✓ | ✗ | ✗ | ✓ (grab) | ✗ |
| Path Guides | ✗ | ✓ | ✗ | ✗ | ✗ |
| Collision Detection | ✗ | ✗ | ✓ | ✓ | ~ |
| Progress Tracking | ✗ | ✓ | ✓ | ✗ | ~ |
| Tool Palette | ✓ | ✗ | ✗ | ✗ | ✗ |
| Timer | ✗ | ✗ | ✓ | ~ | ~ |
| Scoring | ✗ | ~ | ✓ | ✓ | ✓ |

---

**Document Version**: 1.0
**Last Updated**: 2026-02-23
**Codebase**: DrawInTheAir React + TS + Vite
