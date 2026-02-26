# Draw In The Air - Defect List

## Overview
Prioritized defect list for the Draw In The Air kids' hand-tracking drawing web app. Defects are categorized by severity (Critical/High/Medium/Low) and include detailed reproduction information and suggested fixes.

---

## Critical (P0) Defects

### DEF-001: Sort and Place Mode is a Stub - No Actual Game Logic Implemented

**Severity:** Critical (P0)
**Files:** `sortAndPlaceLogic.ts`, `SortAndPlaceMode.tsx`
**Description:**
The Sort and Place game mode is a non-functional placeholder. The implementation contains no actual game mechanics, validation logic, or win conditions. Users can enter the mode but cannot play the game.

**Expected Behavior:**
Sort and Place mode should allow players to drag geometric shapes to designated target zones, validate correct placement, provide feedback on success/failure, and display a win screen upon completion.

**Actual Behavior:**
The mode loads but no game logic executes. Players see UI elements but interactions have no effect. No collision detection, scoring, or completion detection occurs.

**Suggested Fix:**
1. Implement shape dragging with hand tracking input
2. Add collision/hit detection against target zones
3. Create validation logic for correct placements
4. Implement visual feedback (highlights, animations)
5. Add scoring and win condition logic
6. Create game reset functionality

---

### DEF-002: Camera Permission Denied Shows Generic Error Object, Not User-Friendly Message

**Severity:** Critical (P0)
**File:** `useWebcam.ts:72`
**Description:**
When camera permissions are denied, the error handler catches the exception but wraps it in a generic Error object without providing a meaningful user-facing message. Parents/teachers see cryptic error details instead of clear instructions.

**Expected Behavior:**
When camera access is denied, display a user-friendly message explaining why camera access is needed, how to grant permissions, and platform-specific instructions (e.g., "Check browser settings > Privacy > Camera").

**Actual Behavior:**
Generic "Error: NotAllowedError" or similar cryptic messages are shown to users with no actionable guidance.

**Suggested Fix:**
1. Map error codes (NotAllowedError, NotFoundError, etc.) to user-friendly messages
2. Provide platform-specific permission instructions
3. Add retry button to request permissions again
4. Log detailed errors to console for debugging while showing friendly UI messages
5. Create reusable error messaging component

---

### DEF-003: No Fallback When Camera Constraints Fail - getUserMedia Called Once With No Retry

**Severity:** Critical (P0)
**File:** `useWebcam.ts:61`
**Description:**
getUserMedia is called once with specific camera constraints. If constraints fail (e.g., device doesn't support requested resolution), no fallback is attempted. Users cannot start the app even if a different resolution would work.

**Expected Behavior:**
When initial camera constraints fail, the app should automatically retry with progressively less restrictive constraints (e.g., lower resolution, no facingMode preference) until a working configuration is found.

**Actual Behavior:**
Single getUserMedia call fails and app becomes unusable with no recovery mechanism.

**Suggested Fix:**
1. Implement constraint fallback strategy
2. Try constraints in order: (ideal → medium → minimal)
3. Log each failed constraint attempt for debugging
4. Set a maximum retry count to prevent infinite loops
5. Display progress/status during fallback attempts
6. Add manual constraint override option for troubleshooting

---

## High (P1) Defects

### DEF-004: Dual Pinch Detection Paths - Conflicting State Management

**Severity:** High (P1)
**Files:** `drawingEngine.ts` (processPoint), `InteractionState.ts` (process)
**Description:**
Pinch detection logic exists in two independent locations: PenStateManager within DrawingEngine and separate pinch logic in InteractionState. These can produce conflicting states when both trigger simultaneously, causing unpredictable behavior like pen size jumping or eraser toggling unexpectedly.

**Expected Behavior:**
Single, unified pinch detection system that reliably detects pinch gestures and updates pen state atomically without conflicts.

**Actual Behavior:**
Two separate code paths can detect the same pinch event, resulting in duplicate state updates, conflicting pen size changes, or erratic behavior.

**Suggested Fix:**
1. Consolidate pinch detection into a single GestureDetector class
2. Remove duplicate logic from both locations
3. Have both DrawingEngine and InteractionState subscribe to centralized gesture events
4. Add gesture event queuing to ensure atomic updates
5. Unit test gesture detection with multiple simultaneous hand poses
6. Add debug logging to identify dual-trigger scenarios

---

### DEF-005: Detection Loop Uses setTimeout Not Aligned With requestAnimationFrame

**Severity:** High (P1)
**File:** `TrackingLayer.tsx:517`
**Description:**
The detection/tracking loop uses setTimeout for timing instead of requestAnimationFrame (rAF). This causes the detection loop to run on a different timing cycle than the visual rendering, resulting in frame timing jitter and potential visual stuttering when hand tracking doesn't sync with canvas rendering.

**Expected Behavior:**
Detection loop should run synchronized with browser repaint via requestAnimationFrame to maintain consistent frame timing and smooth visual updates.

**Actual Behavior:**
setTimeout-based loop runs independently, causing occasional frames where hand tracking data is outdated or misaligned with rendered output, creating jerky or stuttering hand tracking visuals.

**Suggested Fix:**
1. Replace setTimeout with requestAnimationFrame
2. Structure as: rAF → detect hands → update state → render
3. Use a frame skip counter if detection is more expensive than rendering
4. Implement frame rate limiting within the rAF callback if needed
5. Measure and log frame timing statistics
6. Add performance regression tests

---

### DEF-006: Glow Rendering Does 3 ctx.filter=blur() Passes Per Stroke - Kills FPS on Medium Devices

**Severity:** High (P1)
**File:** `drawingEngine.ts:430-448`
**Description:**
The glow effect is rendered by applying ctx.filter=blur() three times per stroke for a cumulative glow. This expensive filter operation, repeated per stroke, drastically reduces frame rate on medium-tier devices (tablets, mid-range phones) where canvas rendering is already a bottleneck.

**Expected Behavior:**
Glow effect should render smoothly at 60 FPS on medium devices without noticeable performance degradation.

**Actual Behavior:**
FPS drops significantly (can drop to 15-20 FPS) when multiple strokes with glow are visible, making the app feel sluggish and unresponsive.

**Suggested Fix:**
1. Use offscreen canvas for glow layer rendered once per stroke
2. Pre-render glow texture at startup and reuse it
3. Implement conditional glow rendering (disable on low-end devices)
4. Add performance tier detection to adjust glow quality
5. Consider shadow effects or box-shadow alternatives on low-end devices
6. Profile rendering time and add glow rendering to perf overlay
7. Implement glow intensity slider in settings tied to device performance

---

### DEF-007: Catmull-Rom Rendering Calls beginPath/stroke Per Segment Instead of Batching

**Severity:** High (P1)
**File:** `drawingEngine.ts:494-522`
**Description:**
Catmull-Rom spline rendering calls ctx.beginPath() and ctx.stroke() for each curve segment instead of batching the entire path into a single beginPath/stroke operation. This causes excessive Canvas API calls and state changes, reducing rendering efficiency.

**Expected Behavior:**
All Catmull-Rom segments for a stroke should be drawn in a single beginPath/stroke batch operation.

**Actual Behavior:**
Separate beginPath/stroke calls per segment create unnecessary Canvas state changes and API overhead, reducing performance especially with long strokes.

**Suggested Fix:**
1. Restructure to build entire spline with lineTo/quadraticCurveTo calls before calling stroke()
2. Batch all segments under a single beginPath/stroke pair
3. Add unit tests for spline continuity after refactoring
4. Benchmark rendering time improvement
5. Document the rendering order for future maintainers
6. Consider using Path2D objects for reusable path caching

---

### DEF-008: updatePerfSettings() Called Per Resample Point - Unnecessary Per-Point Overhead

**Severity:** High (P1)
**File:** `drawingEngine.ts:246`
**Description:**
The updatePerfSettings() function is called during the resample point loop, executing for every intermediate point calculated. This causes redundant function calls and potential object allocation/GC overhead that scales with resampling density.

**Expected Behavior:**
Performance settings should be updated once per stroke, not once per resampled point.

**Actual Behavior:**
Inefficient per-point updates cause unnecessary function call overhead and potential garbage collection pressure during heavy drawing.

**Suggested Fix:**
1. Move updatePerfSettings() outside the resample loop
2. Call it once at stroke start or on user setting changes
3. Cache performance settings in local variables if needed in the loop
4. Add performance monitoring to verify improvement
5. Consider lazy evaluation pattern for settings updates
6. Add comments documenting the performance-critical nature of this code

---

## Medium (P2) Defects

### DEF-009: Bubble Hit Test Doesn't Account for Device Pixel Ratio - Hit Radius in Normalized Coords Not Screen Pixels

**Severity:** Medium (P2)
**File:** `bubbleCalibrationLogic.ts` (hit detection)
**Description:**
Bubble hit detection uses normalized coordinates for the hit radius without converting to actual screen pixel dimensions based on devicePixelRatio (DPR). On high-DPR devices (Retina displays), the hit area is effectively smaller than intended, making bubbles harder to hit.

**Expected Behavior:**
Hit radius should account for device pixel ratio, providing consistent hit accuracy across devices with different screen densities.

**Actual Behavior:**
On high-DPR devices (DPR > 1), bubbles are harder to hit than intended because the hit radius calculation doesn't scale with DPR.

**Suggested Fix:**
1. Multiply hit radius by devicePixelRatio before comparison
2. Store normalized and pixel-space versions of hit radius
3. Add calibration test to verify hit detection consistency
4. Test on devices with DPR 1.0, 2.0, 3.0
5. Consider adding adjustable hit tolerance in accessibility settings
6. Document coordinate system (normalized vs. pixel-space) throughout code

---

### DEF-010: No Temporal Forgiveness for Bubble Near-Misses - Missed If Finger Passes Between Frames

**Severity:** Medium (P2)
**File:** `bubbleCalibrationLogic.ts`
**Description:**
Bubble collision is checked as a point-in-circle test at discrete frame timestamps. If the hand moves quickly and passes through a bubble between two detection frames, the collision is missed. This is particularly problematic for small bubbles or high hand velocity.

**Expected Behavior:**
Bubble collision detection should use continuous swept collision (line-segment-to-circle) across the frame's hand movement, not just the endpoint position.

**Actual Behavior:**
Fast hand movements can pass through bubbles without triggering collision, frustrating users who believe they hit the bubble.

**Suggested Fix:**
1. Implement line-segment to circle collision test
2. Check collision along entire hand path between previous and current frame
3. Expand hit radius slightly for temporal forgiveness
4. Add movement speed threshold for enabling swept collision
5. Log near-miss events in debug mode to identify missed collisions
6. Add visual debug mode showing hand path between frames
7. Consider increasing detection frequency for high-speed movements

---

### DEF-011: setCameraNotification Uses Functional Update Every Detection Frame Even When Value Unchanged

**Severity:** Medium (P2)
**File:** `TrackingLayer.tsx:414`
**Description:**
The setCameraNotification state setter is called with a function (functional update) every single detection frame, even when the notification value doesn't change. This causes unnecessary React re-renders and state updates.

**Expected Behavior:**
Camera notification state should only update when the notification message actually changes.

**Actual Behavior:**
Redundant state updates occur every detection frame (potentially 30+ times per second), causing unnecessary React re-renders and potential performance impact.

**Suggested Fix:**
1. Check if new notification differs from current before calling setState
2. Move notification logic outside the detection loop if possible
3. Use useCallback with proper dependency array
4. Consider moving to context/reducer to batch updates
5. Add performance monitoring to measure improvement
6. Document the notification update logic for maintainers

---

### DEF-012: featureFlags.updateFeatureFlags() Called Every InteractionState.process() Frame

**Severity:** Medium (P2)
**File:** `InteractionState.ts:272`
**Description:**
Feature flags are updated on every frame during gesture processing. Feature flags should be relatively static configuration that doesn't need frame-by-frame updates.

**Expected Behavior:**
Feature flags should update only when actually changed (user toggles, server push, etc.), not every frame.

**Actual Behavior:**
Unnecessary per-frame function calls and potential object allocations for feature flag updates.

**Suggested Fix:**
1. Move updateFeatureFlags() out of the hot loop
2. Call only on explicit user action or config change
3. Use debouncing if feature flags come from server
4. Cache feature flags in local state
5. Add timing metrics to verify improvement
6. Document feature flag update lifecycle

---

### DEF-013: MagicCursor Smoothing Runs Even When Cursor Not Visible/No Hand Detected

**Severity:** Medium (P2)
**File:** (MagicCursor component)
**Description:**
Cursor position smoothing algorithm runs continuously even when the cursor is not visible to the user or when no hand is detected. This causes unnecessary computation on every frame.

**Expected Behavior:**
Smoothing should only run when the cursor is visible and hand is detected.

**Actual Behavior:**
Continuous smoothing calculations waste CPU cycles when cursor is hidden or inactive.

**Suggested Fix:**
1. Add guard clause: skip smoothing if !cursorVisible || !handDetected
2. Move smoothing into conditional block
3. Add performance metric for smoothing skips
4. Document conditions under which smoothing runs
5. Test that cursor appears smooth when re-enabled

---

### DEF-014: Celebration Confetti Creates New Inline Style Objects Per Particle Per Frame

**Severity:** Medium (P2)
**File:** (Celebration/Confetti component)
**Description:**
The confetti celebration effect creates new inline style objects for each particle on every animation frame. This causes excessive object allocation and garbage collection during celebrations.

**Expected Behavior:**
Style objects should be reused or use CSS animations instead of per-frame object creation.

**Actual Behavior:**
GC pressure spikes during celebrations, potentially causing frame drops and janky animations.

**Suggested Fix:**
1. Pre-allocate style objects or use CSS animations
2. Use CSS keyframes for confetti animations instead of inline styles
3. Implement particle pool to reuse particle objects
4. Move style calculations to CSS-in-JS library or external stylesheet
5. Profile memory allocation during celebration
6. Consider WebGL rendering for large particle counts

---

### DEF-015: MediaPipe Model Loaded From CDN With No Service Worker Cache - Cold Start Downloads ~5MB Every Time

**Severity:** Medium (P2)
**File:** (MediaPipe initialization)
**Description:**
The MediaPipe hand tracking model is loaded from a CDN without being cached by a service worker. Every app restart (page reload, returning from background) downloads the ~5MB model file again, causing slow cold starts and wasting bandwidth.

**Expected Behavior:**
MediaPipe model should be cached locally via service worker for instant subsequent loads.

**Actual Behavior:**
Model downloads on every page load, creating 5+ second delays on initial load and consuming unnecessary bandwidth on return visits.

**Suggested Fix:**
1. Implement service worker caching strategy for model files
2. Cache with versioning (update cache when model version changes)
3. Add progress indicator for model download
4. Pre-cache model on app installation/first run
5. Consider bundling lite version of model for faster startup
6. Monitor cache hit rate and model download statistics
7. Add fallback CDN in case primary fails

---

## Low (P3) Defects

### DEF-016: FreePaintDebugHUD Queries DOM (querySelectorAll) Every 100ms for Canvas/Video Elements

**Severity:** Low (P3)
**File:** (FreePaintDebugHUD component)
**Description:**
The debug HUD performs DOM queries (querySelectorAll) on a 100ms interval to find canvas and video elements. This is inefficient and unnecessary since these elements don't change during runtime.

**Expected Behavior:**
DOM elements should be queried once at mount and cached, not repeatedly every 100ms.

**Actual Behavior:**
Recurring DOM queries waste CPU cycles on a dev tool that should have minimal overhead.

**Suggested Fix:**
1. Cache element references on component mount
2. Use refs instead of querySelectorAll
3. Add optional manual refresh button
4. Remove the setInterval in favor of event-based updates
5. Document that element structure must match at mount time

---

### DEF-017: Velocity History Array Uses push/shift Per Frame - Could Use Ring Buffer

**Severity:** Low (P3)
**File:** `InteractionState.ts:494-508`
**Description:**
Hand velocity is tracked using an array with push() and shift() operations every frame. A ring buffer would be more efficient and avoid array resizing/reallocation overhead.

**Expected Behavior:**
Velocity history should use a fixed-size circular buffer for O(1) operations.

**Actual Behavior:**
Every frame pays the cost of array shifting, creating minor GC pressure.

**Suggested Fix:**
1. Implement RingBuffer class with fixed size
2. Replace push/shift with ring buffer write
3. Benchmark improvement (likely minor but worth doing)
4. Reuse ring buffer across app lifetime
5. Add unit tests for ring buffer edge cases
6. Document ring buffer behavior for velocity calculations

---

### DEF-018: PerfOverlay Polls Perf Config Every 500ms via setInterval

**Severity:** Low (P3)
**File:** (PerfOverlay component)
**Description:**
The performance overlay uses setInterval to poll configuration every 500ms. This should be event-driven instead of polling.

**Expected Behavior:**
Configuration changes should trigger updates via events/callbacks, not polling.

**Actual Behavior:**
Unnecessary polling intervals consume CPU and create timing overhead.

**Suggested Fix:**
1. Replace setInterval with event-driven updates
2. Trigger updates on config change events
3. Store config in React context/state for subscribers
4. Clean up interval on unmount (if keeping interval-based approach)
5. Add debug logging for config update events

---

### DEF-019: No TV/Large-Screen Breakpoint (>1440px) - Text Too Small at Viewing Distance

**Severity:** Low (P3)
**File:** (Responsive design / media queries)
**Description:**
The app has no responsive design breakpoint for large displays (TVs, large monitors, projectors). Text becomes unreadably small when viewed from typical TV viewing distance or in classroom projection scenarios.

**Expected Behavior:**
App should have >1440px breakpoint that scales text, buttons, and UI elements for comfortable viewing from distance.

**Actual Behavior:**
On large displays, UI text is too small to read comfortably from distance, limiting classroom/presentation use cases.

**Suggested Fix:**
1. Add media query breakpoint for screens >1440px wide
2. Scale base font size up for large screens (maybe 1.5-2x)
3. Increase button sizes for large screen viewing
4. Test on actual TV and projector setups
5. Consider separate "Presentation Mode" that maximizes text size
6. Add user-adjustable scale factor for accessibility
7. Document supported screen sizes and viewing distances

---

### DEF-020: Tracing Paths Hardcoded - No Way to Add Custom Paths Without Code Changes

**Severity:** Low (P3)
**File:** (Tracing game mode / path definition)
**Description:**
Tracing game paths are hardcoded in the source code with no way to define custom paths via configuration or UI. Teachers and content creators cannot add their own tracing challenges without modifying code.

**Expected Behavior:**
Tracing paths should be loadable from configuration files or definable via in-app editor, allowing content creation without code changes.

**Actual Behavior:**
New tracing paths require code modifications, compilation, and deployment.

**Suggested Fix:**
1. Create path definition data format (JSON schema)
2. Implement path loader that reads from config directory
3. Add in-app path editor (draw path, set difficulty, save)
4. Create path sharing mechanism (export/import JSON)
5. Add path validation and preview
6. Document path format for users who want to create custom paths
7. Consider path marketplace/community sharing feature

---

## Summary Statistics

| Severity | Count | Issues |
|----------|-------|--------|
| Critical (P0) | 3 | DEF-001, DEF-002, DEF-003 |
| High (P1) | 6 | DEF-004, DEF-005, DEF-006, DEF-007, DEF-008 |
| Medium (P2) | 7 | DEF-009, DEF-010, DEF-011, DEF-012, DEF-013, DEF-014, DEF-015 |
| Low (P3) | 5 | DEF-016, DEF-017, DEF-018, DEF-019, DEF-020 |
| **Total** | **21** | |

---

## Triage Recommendations

1. **Immediate (Sprint 1):** DEF-001, DEF-002, DEF-003 - Critical blockers
2. **High Priority (Sprint 2):** DEF-004, DEF-005, DEF-006, DEF-007 - Performance and stability
3. **Medium Priority (Sprint 3):** DEF-008, DEF-009, DEF-010, DEF-015 - Polishing
4. **Nice to Have:** DEF-011 through DEF-020 - Optimization and feature enhancement

---

*Last Updated: 2026-02-23*
*Status: Initial defect catalog*
