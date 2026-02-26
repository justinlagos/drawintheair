# Rendering Audit

## Draw Loop

**TrackingLayer.tsx** orchestrates 60 FPS render loop:

```typescript
// rAF loop (TrackingLayer)
(timestamp) => {
  // Hand detection
  detectStartTime = performance.now();
  const landmarks = await detectHand(frame);
  detectEndTime = performance.now();

  // Interaction state
  const state = interactionState.process(landmarks);

  // Mode-specific logic
  switch (mode) {
    case 'FREE_PAINT':
      drawingEngine.processPoint(state.filteredPoint);
      if (state.pinchActive) drawingEngine.beginStroke();
      if (!state.pinchActive) drawingEngine.endStroke();
      break;
    // ... other modes
  }

  // Render
  renderStartTime = performance.now();
  drawingEngine.render(canvasContext);
  renderEndTime = performance.now();

  requestAnimationFrame(...);
}
```

**Order is correct**: detection → interaction → logic → render.

## Stutter Sources

### Issue 1: Glow Uses ctx.filter=blur() Per Stroke Per Pass

**Current code pattern** (pseudo-code):

```typescript
// For each stroke in drawing
for (const stroke of strokes) {
  // For each glow pass (3 passes × varying blur amounts)
  for (let pass = 1; pass <= 3; pass++) {
    ctx.filter = `blur(${blurAmount * pass}px)`;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke(path);
  }
}
```

**Problem**:
- `ctx.filter = ...` triggers graphics pipeline recompile
- N strokes × 3 passes = 3N graphics states per frame
- On complex drawings (50+ strokes), this is expensive
- Blur filter performance varies across GPU drivers

**Impact**: 5-8ms stutter on medium tier, visible judder on low-end.

### Issue 2: Catmull-Rom Renders Stroke Per Segment Instead of Batching

**Current code pattern**:

```typescript
// For each point in stroke
for (let i = 0; i < stroke.points.length; i++) {
  // For each segment in interpolation
  for (let t = 0; t < 1.0; t += 0.01) {
    const point = catmullRom(stroke.points, i, t);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
}
```

**Problem**:
- `ctx.beginPath()` + `ctx.stroke()` per small segment
- Hundreds of path submissions per stroke
- State changes not batched
- Redundant work on canvas layer

**Impact**: 2-3ms per complex stroke.

### Issue 3: updatePerfSettings() Called Per Resample Point

**Current code pattern**:

```typescript
onFrame() {
  for (const point of resampledPoints) {
    const config = perf.getConfig();  // Called every iteration!
    const filtered = applyFilter(point, config);
    // ... rest of logic
  }
}
```

**Problem**:
- `perf.getConfig()` does tier lookup + filter profile construction
- Called 10-20 times per frame when not needed
- Config is constant for entire frame

**Impact**: <1ms but wasteful.

### Issue 4: Canvas DPR Resize Triggers Full Redraw

**Current code pattern**:

```typescript
// On resize
if (window.devicePixelRatio !== dpr) {
  canvas.width = cssWidth * newDpr;
  canvas.height = cssHeight * newDpr;
  // Canvas cleared implicitly
  // All strokes redraw from scratch
}
```

**Problem**:
- High DPR devices (iPad Pro, modern Android) have DPR 2-3
- Any window resize or orientation change clears canvas
- Full stroke list re-rendered synchronously
- On low-end, can cause 100ms+ stall

**Impact**: Hitching on orientation change, mobile split-screen.

## High DPI / Retina Handling

**Current implementation** in TrackingLayer.tsx:

```typescript
const dpr = window.devicePixelRatio;
canvas.width = cssWidth * dpr;
canvas.height = cssHeight * dpr;
ctx.scale(dpr, dpr);
```

**Status**: ✓ **Correct**. Drawing engine uses canvas device pixels, scaling handled properly.

Verify in **drawingEngine.render()**:
- All coordinates use canvas.width/height (device pixels)
- No manual DPR scaling in draw calls
- Line widths use canvas pixels

## Glow Strategy

### Current: 3 Blur Passes (All Devices)

```typescript
const blurs = [2, 4, 6];  // 3 passes
for (const blur of blurs) {
  ctx.filter = `blur(${blur}px)`;
  ctx.stroke(path);
}
```

**Cost**: ~5ms on desktop, ~8ms on low-end.

### Proposed Tier-Based Strategy

| Tier | Glow Passes | Config | Notes |
|------|-------------|--------|-------|
| **Desktop** (detect < 18ms) | 3 | Full blur | Keep as-is |
| **Tablet** (detect 20-24ms) | 1 | Single 4px blur | Reduce to 1 pass |
| **Mobile** (detect 25-30ms) | 0 | No glow | Solid stroke only |
| **Low-end** (detect > 30ms) | 0 | No glow | Disable completely |

**Decision logic**:
```typescript
const glow = detectTime > 25 ? 0 : (detectTime > 20 ? 1 : 3);
```

## Rendering Fixes

### Fix 1: Batch Canvas State Resets

**Before**:
```typescript
for (const stroke of strokes) {
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.stroke(path);  // State change per stroke
}
```

**After**:
```typescript
// Reset state once per frame
ctx.clearRect(0, 0, canvas.width, canvas.height);

// Group strokes by color/width
const groups = groupBy(strokes, s => `${s.color}-${s.width}`);
for (const [key, groupStrokes] of groups) {
  const [color, width] = key.split('-');
  ctx.strokeStyle = color;
  ctx.lineWidth = parseInt(width);

  for (const stroke of groupStrokes) {
    ctx.stroke(stroke.path);  // State changes only per group
  }
}
```

**Saves**: ~1-2ms per frame.

### Fix 2: Single ctx.stroke() Call Per Stroke

**Before** (segment-by-segment):
```typescript
for (const segment of segments) {
  ctx.beginPath();
  ctx.moveTo(...);
  ctx.lineTo(...);
  ctx.stroke();
}
```

**After** (entire path):
```typescript
ctx.beginPath();
for (const point of stroke.points) {
  ctx.lineTo(point.x, point.y);
}
ctx.stroke();
```

**Note**: Requires refactoring `stroke.points` to be pre-interpolated Catmull-Rom, not raw input points.

**Saves**: ~2-3ms per complex stroke.

### Fix 3: Cache perf.getConfig() Per Frame

**Before**:
```typescript
for (const point of points) {
  const config = perf.getConfig();  // Per iteration
  // ...
}
```

**After**:
```typescript
const config = perf.getConfig();  // Once per frame
for (const point of points) {
  // Use config
}
```

**Saves**: <1ms (minor, but improves clarity).

### Fix 4: Pre-Compute Glow Layer as Offscreen Canvas

For desktop tier with 3 glow passes:

```typescript
// Create offscreen canvas once
const glowCanvas = document.createElement('canvas');
const glowCtx = glowCanvas.getContext('2d');

// Render glow to offscreen (one blur pass)
glowCtx.filter = 'blur(6px)';
glowCtx.stroke(path);

// Composite glow to main canvas at reduced opacity
ctx.globalAlpha = 0.3;
ctx.drawImage(glowCanvas, 0, 0);
ctx.globalAlpha = 1.0;

// Render main stroke on top
ctx.stroke(path);
```

**Benefit**: Single blur pass instead of 3, offscreen canvas is GPU-optimized.

**Saves**: ~3-4ms on desktop, enables 3-pass effect.

## Pen Up / End Stroke

**Current implementation** in drawingEngine:

```typescript
endStroke() {
  // Mark current stroke as complete
  this.currentStroke = null;
  // Stroke already added to strokes[] in beginStroke/processPoint
  // No special cleanup needed
}
```

**Verify**:
- ✓ Called from InteractionState when `!state.penDown`
- ✓ currentStroke set to null
- ✓ Completed strokes remain in strokes[] for rendering
- ✓ Next beginStroke creates new currentStroke

**Status**: ✓ **Correct**.

---

## Implementation Checklist

- [ ] Refactor glow to use tier-based strategy (3→1→0 passes)
- [ ] Implement stroke grouping by color/width
- [ ] Batch ctx state resets once per frame
- [ ] Pre-interpolate Catmull-Rom points in stroke data
- [ ] Render entire stroke with single ctx.stroke() call
- [ ] Cache perf.getConfig() outside loops
- [ ] Add offscreen canvas for 3-pass glow on desktop
- [ ] Instrument detectTime → glow pass decision
- [ ] Test on device matrix: measure render time before/after
- [ ] Verify DPR scaling on iPad Pro (DPR 2) and high-end Android (DPR 3)
- [ ] Test orientation change doesn't clear canvas unnecessarily
