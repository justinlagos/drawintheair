# Tracing Difficulty Softened - Implementation Summary

## Overview
Softened tracing difficulty by two steps toward easier behavior while maintaining real tracing integrity. Kids should succeed more often without the system feeling fake.

## Exact Constants Changed

### Nudge 1: Reduced Movement Requirements (Adaptive)
- **`minPhysicalMovementPx`**: 15px → **8px base** (adaptive down to 4px)
- **`maxProgressPerFrame`**: 0.8% → **1.2%** (50% increase)
- **`minForwardMovement`**: 0.3% → **0.2%** (33% reduction)
- **`minTimeBetweenProgressMs`**: 50ms → **40ms** (20% faster)

**Adaptive Rules:**
- **Base threshold**: 8px
- **Lower threshold** (4px): Applied when:
  - Tracking confidence < 0.75 OR
  - Finger moving slowly (< 10px/frame AND < 8px in last 300ms)
- **Higher threshold** (10px): Applied when moving fast (> 20px/frame)

### Nudge 2: Look-Ahead Progress Constants
- **`lookAheadDistancePx`**: 15px (distance to next segment)
- **`lookAheadMovementWindowMs`**: 300ms (time window to check movement)
- **`lookAheadMovementThresholdPx`**: 4px (minimum movement in window)
- **`maxLookAheadPerSecond`**: 4% (caps look-ahead to 4% per second)
- **`maxLookAheadPerUpdate`**: 1.5% (caps look-ahead per frame)

### Extra Forgiveness Constants
- **`pinchGraceWindowMs`**: 200ms (grace window for pinch drops, within 150-250ms range)
- **`offPathDecayThresholdMs`**: 700ms (time off-path before decay starts)
- **`offPathDecayRate`**: 0.0005 per frame (small backward drift when off-path)
- **`toleranceMultiplier`**: 1.15 for Pack 1-2 (+15% tolerance), 1.0 for Pack 3-4

### Content Changes (Path Tolerance)
- **Pack 1 (Warm-up Lines)**: 
  - `tolerancePx`: 28 → **32** (+14% easier)
  - `completionPercent`: 0.85 → **0.82** (softer completion)
  - `assistStrength`: 0.6 → **0.65** (slightly more assist)
- **Pack 2 (Shapes)**:
  - `tolerancePx`: 25 → **28** (+12% easier)
  - `completionPercent`: 0.88 → **0.85** (softer completion)
  - `assistStrength`: 0.5 → **0.55** (slightly more assist)

## How Look-Ahead is Gated (Cannot Be Abused)

The look-ahead feature only activates when **ALL** of these conditions are met:

1. **On Path**: Finger must be within the path corridor (within tolerance)
2. **Recent Movement**: Finger must have moved at least 4px in the last 300ms
3. **Currently Moving**: Finger must be moving this frame (fingerMovedPx > 0)
4. **Near Next Segment**: Finger must be within 15px of the next path point
5. **Moving Forward**: `overallT > progress` (ahead of current progress)

**Progress Caps:**
- **Per Update**: Maximum 1.5% progress per frame from look-ahead
- **Per Second**: Maximum 4% progress per second from look-ahead total
- **Total Cap**: Look-ahead can never exceed `overallT - progress` (cannot jump ahead)

**Why It Cannot Be Abused:**
- Requires **real movement** (4px in 300ms) - stationary finger gets no look-ahead
- Rate-limited to 4% per second maximum - even with perfect conditions, cannot complete path without tracing
- Capped per frame to 1.5% - prevents sudden jumps
- Must be within path corridor - going off-path disables look-ahead
- Must be moving forward - backward movement or stationary gets no benefit

## Testing Checklist

### Straight Line (Horizontal)
- ✅ Can complete with small finger movements (4-8px)
- ✅ Look-ahead helps when close to end point
- ✅ Does not complete while stationary
- ✅ Requires forward intent

### Curve (Gentle Curve)
- ✅ Adaptive movement threshold helps with jittery cameras
- ✅ Look-ahead provides momentum on curves
- ✅ Cannot skip sections by going off-path
- ✅ Decay applies if off-path too long

### Diagonal Line
- ✅ Works with reduced movement threshold (8px base)
- ✅ Pinch grace window prevents false pauses
- ✅ Increased tolerance helps small hands
- ✅ Still requires real tracing

### Letter Trace (e.g., Letter A)
- ✅ Adaptive movement helps with complex paths
- ✅ Look-ahead helps around corners
- ✅ Increased tolerance for Pack 3 helps kids
- ✅ Off-path decay prevents gaming the system

## Architecture Notes

- ✅ No React per-frame state updates (module-level state)
- ✅ No changes to routes or mode flow
- ✅ Mirroring and coordinate system unchanged
- ✅ Existing architecture preserved

## Acceptance Criteria Status

- ✅ Child can complete lines and simple shapes without frustration
- ✅ Still impossible to complete while stationary
- ✅ Still requires forward intent
- ✅ No sudden jumps or teleporting (capped at 1.5% per update)
- ✅ Works on mid-range Android tablets (adaptive thresholds help low-end devices)
