# Tracking Tuning

## Current Parameters Table

### OneEuroFilter Configurations Per Mode

Defined in **InteractionState.ts** and **TrackingLayer.tsx**, applied per gesture mode:

| Mode | Frequency (Hz) | Mincutoff | Beta | Dcutoff | Purpose |
|------|-----------------|-----------|------|---------|---------|
| **Free Paint** | 60 | 1.0 | 0.15 | 1.0 | Smooth position for drawing, responsive |
| **Tracing** | 60 | 0.8 | 0.10 | 0.8 | Extra stable for path matching |
| **Bubble Pop** | 60 | 1.2 | 0.20 | 1.2 | Responsive for collision detection |
| **Sort/Place** | 60 | 0.9 | 0.12 | 0.9 | Balanced stability and responsiveness |

**OneEuroFilter behavior**: Lower mincutoff = more lag but smoother; higher beta = faster response to large movements.

### Pinch Detection Thresholds

Defined in **InteractionState.ts:450-457**:

| Parameter | Current Value | Unit | Notes |
|-----------|---------------|------|-------|
| Pinch down threshold | 0.32 | normalized distance | Thumb-to-index distance must drop below 32% to trigger |
| Pinch up (hysteresis) | 0.48 | normalized distance | Must rise above 48% to release pinch |
| Hysteresis gap | 0.16 | (48% - 32%) | Prevents flicker when hovering near threshold |
| Confidence threshold | 0.6 | (0.0-1.0) | MediaPipe hand visibility must exceed 60% |
| Jump threshold | 0.05 | normalized distance | Detect sudden hand jumps, discard frame |

## Filter Application Order

**Current pipeline** in InteractionState.ts:432-457:

```
Raw MediaPipe landmarks
    ↓
[Optional: Jump detection - discard if > 0.05 distance]
    ↓
OneEuroFilter (applied to fingertip position)
    ↓
Pinch detection (uses FILTERED fingertip + thumb points)
    ↓
Return {penDown, filteredPoint, pinchActive}
    ↓
Mode logic consumes state
    ↓
DrawingEngine renders
```

**Key insight**: Filter applied BEFORE pinch detection. This is **good** - reduces flicker from jittery raw landmarks.

However, pinch uses **same filter** as position, which may not be optimal.

## Identified Issues

### Issue 1: Same Filter for Position and Pinch Signal

**Problem**: OneEuroFilter optimized for smooth drawing position (low lag, responsive). But pinch distance (distance between thumb and index) has different jitter characteristics - benefits from *more* stability, less responsiveness.

**Result**: Pinch flickers near threshold as jitter causes distance to oscillate.

### Issue 2: No Separate Debounce for Pinch vs Position

**Problem**: Pinch threshold uses single hysteresis gap (0.16). If user's hand trembles slightly while pinching, finger may oscillate above/below pinch-up threshold, causing unintended drawing stop/start.

**Result**: Missed strokes, frustration during deliberate pinch hold.

### Issue 3: No Temporal Confirmation

**Problem**: Pinch triggered immediately on single frame crossing threshold. A single errant frame from MediaPipe can momentarily trigger false pinch.

**Result**: Occasional single-dot "pops" on canvas before intentional drawing begins.

## New Parameters

### Separate Filters

Create **two OneEuroFilters** per mode:

| Filter | Mincutoff | Beta | Dcutoff | Purpose |
|--------|-----------|------|---------|---------|
| **Position filter** | (unchanged) | (unchanged) | (unchanged) | Smooth drawing position |
| **Pinch filter** | ×0.7 (e.g., 0.7 for Free Paint) | ×0.8 (e.g., 0.12) | ×0.7 | More stable pinch signal |

Example Free Paint:
- Position: mincutoff=1.0, beta=0.15 (responsive)
- Pinch: mincutoff=0.7, beta=0.12 (stable)

### Increased Hysteresis Gap

Pinch hysteresis:

| Parameter | Current | Proposed | Reason |
|-----------|---------|----------|--------|
| Down threshold | 0.32 | 0.28 | Easier to initiate (lower bar) |
| Up threshold | 0.48 | 0.52 | Harder to accidentally release |
| Gap | 0.16 | 0.24 | Wider window prevents flicker |

### Temporal Confirmation for Pinch Start

Add **80ms temporal confirmation**:

```typescript
// When pinch distance drops below 0.28:
if (pinchDistance < 0.28 && !isPinching) {
  if (!pinchStartTime) {
    pinchStartTime = now;
  } else if (now - pinchStartTime > 80) {
    // Only trigger pinch if below threshold for > 80ms
    activatePinch();
  }
} else {
  pinchStartTime = null;
}

// When pinch distance rises above 0.52:
if (pinchDistance > 0.52 && isPinching) {
  deactivatePinch(); // Immediate release (no confirmation needed)
}
```

**80ms chosen because**: 2 frames at 25 fps, removes single-frame noise, still feels responsive.

### Device-Class Tuning

Adjust hysteresis per device based on hand size and jitter profile:

| Device Class | Down | Up | Gap | Reason |
|--------------|------|-----|-----|--------|
| Desktop (mouse/stylus user) | 0.28 | 0.52 | 0.24 | Standard |
| iPad (adult hand) | 0.28 | 0.52 | 0.24 | Same |
| Android (adult hand) | 0.28 | 0.52 | 0.24 | Same |
| Mobile (smaller hands likely) | 0.25 | 0.55 | 0.30 | Wider gap for small hands |
| Low-end device (more jitter) | 0.26 | 0.54 | 0.28 | Wider gap for noise |

## Debug Overlay Enhancements

### Pinch State Visualization

**TrackingDebugOverlay** (already partially exists, expand):

```typescript
// Show current pinch state as text overlay
<p>Pinch: {isPinching ? "ACTIVE" : "idle"}</p>
<p>Distance: {pinchDistance.toFixed(3)} (threshold: 0.28 down, 0.52 up)</p>
<p>Temporal: {pinchStartTime ? `${now - pinchStartTime}ms` : "—"}</p>

// Show pinch history as small graph
<canvas id="pinch-history" />  // Last 60 frames of pinch distance
```

### Fingertip Trail

Draw faint circles at fingertip position for last 10 frames (already partially in overlay):

```typescript
const trailAlpha = 0.1;
for (let i = 0; i < trail.length; i++) {
  const point = trail[i];
  const fade = i / trail.length;
  ctx.fillStyle = `rgba(255, 100, 255, ${trailAlpha * fade})`;
  ctx.beginPath();
  ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, 2 * Math.PI);
  ctx.fill();
}
```

## Implementation Checklist

- [ ] Duplicate OneEuroFilter instance per mode (position + pinch)
- [ ] Apply separate filter configs to position vs pinch distance
- [ ] Increase down threshold from 0.32 → 0.28
- [ ] Increase up threshold from 0.48 → 0.52
- [ ] Add temporal confirmation (80ms) for pinch start
- [ ] Make pinch release immediate (no confirmation)
- [ ] Add device-class tuning logic for hysteresis values
- [ ] Enhance debug overlay with pinch state + history graph
- [ ] Expand fingertip trail visualization
- [ ] Test on device matrix: desktop, iPad, Android (adult + small hands)
- [ ] Measure false positive pinch rate before/after
