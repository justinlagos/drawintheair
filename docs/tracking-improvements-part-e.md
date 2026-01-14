# Tracking Reliability Upgrade - Part E
## File Audit and Implementation Plan

### Phase 0: File Audit

This document lists all files that control hand tracking, filtering, and interaction state processing. All modifications will be behind feature flags with defaults OFF to ensure zero regressions.

---

## Core Tracking Files

### 1. `src/core/InteractionState.ts`
**Purpose:** Single source of truth for all interaction state across all modes.
**What it does:**
- Processes MediaPipe hand tracking results
- Applies One Euro Filter smoothing to index tip and thumb tip
- Implements pinch detection with hysteresis
- Handles confidence gating and dropout protection
- Manages pen up/down state based on pinch gesture
- Provides filtered points for all game modes

**Why it's safe to modify:**
- Already uses feature flags for enhanced features (predictive smoothing, depth sensitivity, occlusion recovery)
- All new logic will be behind `TrackingFlags` with fallback to current behavior
- Singleton pattern ensures single instance across app
- No React state updates - pure processing logic

**Key methods:**
- `process(results, timestamp)` - Main processing loop
- `setCanvasSize(width, height)` - Canvas dimension updates
- `reset()` - State reset on mode switch

---

### 2. `src/core/filters/OneEuroFilter.ts`
**Purpose:** Low-latency adaptive smoothing filter for position data.
**What it does:**
- Provides `OneEuroFilter2D` class for 2D position smoothing
- Adaptive smoothing: low latency for fast movements, high smoothing for slow movements
- Configurable via `minCutoff`, `beta`, and `dCutoff` parameters

**Why it's safe to modify:**
- Pure filter implementation with no side effects
- Already supports configurable parameters
- Can add mode-specific profiles without breaking existing usage
- Filter instances are created per mode/profile

**Key classes:**
- `OneEuroFilter` - 1D filter
- `OneEuroFilter2D` - 2D position filter (used by InteractionStateManager)

---

### 3. `src/core/tracking/DynamicResolution.ts`
**Purpose:** Monitors FPS and detection latency, scales quality when performance drops.
**What it does:**
- Tracks performance metrics (renderFPS, detectFPS, latency)
- Maintains performance history
- Scales resolution levels based on sustained performance
- Currently has 3-tier system (will be upgraded to 6 levels)

**Why it's safe to modify:**
- Already behind feature flag (`enableDynamicResolution`)
- Only affects detection resolution, not canvas rendering
- Has hysteresis to prevent oscillation
- Can be extended to 6-level system without breaking existing behavior

**Key methods:**
- `updateMetrics(metrics)` - Update performance data
- `getDetectionResolution(videoWidth, videoHeight)` - Get current resolution
- `getScaleFactor()` - Get current scale factor

---

### 4. `src/features/tracking/TrackingLayer.tsx`
**Purpose:** Main tracking layer component that orchestrates detection and rendering loops.
**What it does:**
- Manages separate detection and rendering loops
- Calls `interactionStateManager.process()` in detection loop
- Provides `TrackingFrameData` to game modes via `onFrame` callback
- Handles video element and canvas setup
- Manages kid-friendly guidance notifications

**Why it's safe to modify:**
- Already uses InteractionStateManager (doesn't duplicate logic)
- Detection loop is separate from rendering (no React state per frame)
- Can add metrics HUD and visual guidance without affecting core tracking
- All new UI elements will be behind flags

**Key responsibilities:**
- Detection loop (runs at configurable FPS based on perf tier)
- Render loop (runs at 60 FPS)
- Frame data conversion and distribution

---

### 5. `src/App.tsx`
**Purpose:** Main app component that manages mode switching and routing.
**What it does:**
- Manages `appState` ('onboarding' | 'menu' | 'game')
- Manages `gameMode` ('free' | 'pre-writing' | 'calibration' | 'sort-and-place' | 'word-search')
- Handles mode selection via `handleModeSelect()`
- Determines active game logic via `getActiveLogic()`

**Why it's safe to modify:**
- Mode switching already calls `interactionStateManager.reset()`
- Can add `interactionStateManager.setMode()` call without breaking flow
- Mode mapping is straightforward (gameMode -> FilterProfileMode)
- All changes will be behind flags

**Key callbacks:**
- `handleModeSelect(mode)` - Called when user selects a mode
- `getActiveLogic()` - Returns current mode's logic function

---

## Supporting Files

### 6. `src/core/perf.ts`
**Purpose:** Adaptive performance system that detects device capabilities.
**What it does:**
- Detects performance tier (low/medium/high)
- Provides camera resolution and detection FPS configs
- Auto-initializes on module load

**Why it's safe to modify:**
- Already has tier system (can extend to 6 levels)
- Used by `useWebcam.ts` for camera constraints
- Used by `TrackingLayer.tsx` for detection FPS
- Can add gradual quality scaling without breaking existing tiers

---

### 7. `src/core/useWebcam.ts`
**Purpose:** Webcam hook that manages camera stream and constraints.
**What it does:**
- Gets camera stream with performance-based constraints
- Sets frame rate ranges based on performance tier
- Manages aspect ratio for stable framing

**Why it's safe to modify:**
- Already uses `perf.getConfig()` for camera settings
- Can extend to support gradual quality scaling
- No tracking logic - just camera setup

---

### 8. `src/core/handTracker.ts`
**Purpose:** MediaPipe Hand Landmarker wrapper.
**What it does:**
- Initializes MediaPipe Hand Landmarker
- Provides `detect(video, timestamp)` method
- Manages model loading and configuration

**Why it's safe to modify:**
- Pure MediaPipe wrapper - no tracking logic
- Already supports feature flags for two-hand mode
- Will NOT be modified (per requirements: "Do not move MediaPipe setup")

---

## Files That Will NOT Be Modified

- `src/core/handTracker.ts` - MediaPipe setup (per requirements)
- `src/core/drawingEngine.ts` - Drawing engine (separate concern)
- `src/core/PenStateManager.ts` - Legacy pen state (InteractionState replaces it)
- Mode logic files (`freePaintLogic.ts`, etc.) - Only receive TrackingFrameData

---

## Implementation Safety Guarantees

1. **All new behavior behind flags:** Every feature will check `TrackingFlags` before executing
2. **Fallback to current behavior:** When flags are OFF, code paths match current implementation exactly
3. **No React state in loops:** All processing uses refs, no per-frame state updates
4. **Mode switching safety:** Filter profile switching will reset state cleanly
5. **Backward compatibility:** Existing modes continue to work with flags OFF

---

## Console Audit Log

At dev start, the following files will be logged:
```javascript
console.log("[TrackingAudit] Files touched:", [
  "src/core/InteractionState.ts",
  "src/core/filters/OneEuroFilter.ts", 
  "src/core/tracking/DynamicResolution.ts",
  "src/features/tracking/TrackingLayer.tsx",
  "src/App.tsx",
  "src/core/perf.ts",
  "src/core/flags/TrackingFlags.ts (new)",
  "src/components/HandGuidanceOverlay.tsx (new)",
  "src/core/tracking/PinchLogic.ts (new - pure functions for testing)",
  "scripts/tracking-smoke-test.ts (new)"
]);
```

---

## Manual Test Checklist

### Before Implementation (Baseline)
- [ ] Bubble Pop: pop accuracy, no lag
- [ ] Tracing: smooth stable
- [ ] Free Paint: no stray lines
- [ ] Menu: dwell select works
- [ ] Mobile Safari sanity pass
- [ ] Android Chrome sanity pass
- [ ] Mirroring check (left/right correct)

### After Implementation (Flags OFF)
- [ ] All above tests pass identically
- [ ] Console shows "[Regression] Flags off, using legacy path" (when debug mode enabled)

### After Implementation (Flags ON - Gradual)
- [ ] Time-based confidence: stroke breaks consistent at 20fps and 60fps
- [ ] Velocity pinch tolerance: fast drawing doesn't break into dots
- [ ] Teleport guard: no long diagonal lines after reacquire
- [ ] Jitter spike guard: no random spikes in strokes
- [ ] Mode filter profiles: switching modes doesn't cause cursor jumps
- [ ] Stability detection: dwell interactions feel reliable
- [ ] Visual guidance: helps kids reposition
- [ ] Gradual quality: scaling is smooth, not jarring
- [ ] Session calibration: smaller hands feel consistent
- [ ] Metrics HUD: shows accurate data, 10s recorder works

## Test Script

Run the smoke test script:
```bash
npm run tracking:test
```

Or if ts-node is installed:
```bash
npx ts-node scripts/tracking-smoke-test.ts
```

The script validates:
- Time-based confidence consistency at different frame rates
- Velocity pinch tolerance clamping
- Teleport guard detection
- Calibration threshold bounds
- Pinch state computation

---

## Next Steps

1. Create `src/core/flags/TrackingFlags.ts` with all flags defaulting to `false`
2. Implement metrics HUD + 10s recorder (Part 9) - needed for validation
3. Implement time-based confidence (Part 2) - core reliability improvement
4. Continue with remaining parts in specified order
