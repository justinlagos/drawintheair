# Interaction State Machine

## Unified State Provider

**InteractionState.ts** provides a single source of truth for hand gesture state:

```typescript
export interface InteractionStateOutput {
  hasHand: boolean;              // MediaPipe detected hand
  penDown: boolean;              // Pinch active (ready to draw)
  pinchActive: boolean;          // Alias for penDown
  filteredPoint: { x: number; y: number };  // Smoothed fingertip position
  confidence: number;            // MediaPile hand confidence (0-1)
}
```

All modes should read **only** from this output. No other hand detection logic.

## Current States Per Mode

### Free Paint

```
        [Idle]
          ↓
    Hand detected?
          ↓
      [Tracking]
          ↓
    Pinch started?
          ↓
      [Drawing]
          ↓
    Pinch released?
          ↓
      [Idle]
```

| State | Condition | Action | Next |
|-------|-----------|--------|------|
| **Idle** | No hand or confidence < 0.6 | Show instructions, no cursor | Tracking on hand detect |
| **Tracking** | Hand visible, pinch inactive | Show cursor at fingertip, no canvas change | Drawing on pinch or Idle |
| **Drawing** | Pinch active | Draw pixels via drawingEngine | Idle on pinch release |

**Implementation**: FreePaintMode.tsx reads `interactionState.penDown` and `filteredPoint`.

### Tracing

```
        [Idle]
          ↓
    Hand detected?
          ↓
      [Tracking]
          ↓
    Pinch on path?
          ↓
      [Tracing]
          ↓
    Path complete (85%)?
          ↓
      [Complete] → [Idle]
```

| State | Condition | Action | Next |
|-------|-----------|--------|------|
| **Idle** | No hand | Show current path | Tracking on hand detect |
| **Tracking** | Hand visible, not on path | Show cursor, highlight nearest path | Tracing on path overlap |
| **Tracing** | Pinch active on path | Draw stroke, update progress % | Complete on 85% or Tracking if off path |
| **Complete** | 85%+ traced | Celebrate, unlock next, reset | Idle (stay until next) |

**Implementation**: TracingMode.tsx reads `interactionState.filteredPoint` and `penDown`, checks distance to path.

### Bubble Pop

```
        [Idle]
          ↓
    Hand detected?
          ↓
      [Tracking]
          ↓
    Fingertip collides with bubble?
          ↓
      [Popping]
          ↓
    Animation complete?
          ↓
      [Idle]
```

| State | Condition | Action | Next |
|-------|-----------|--------|------|
| **Idle** | Game over or resetting | Show bubbles, score | Tracking on hand detect |
| **Tracking** | Hand visible | Update fingertip position, check collisions | Popping on hit or Idle |
| **Popping** | Bubble hit, play pop SFX | Pop animation, score +1, bubble removed | Idle (next bubble spawns) |

**Implementation**: BubblePopMode.tsx reads `interactionState.filteredPoint`, runs collision check directly.

### Sort/Place (STUB)

```
        [Idle]
          ↓
    Hand detected?
          ↓
      [Tracking]
          ↓
    Pinch on object?
          ↓
      [Grabbing]
          ↓
    Drag started?
          ↓
      [Dragging]
          ↓
    Released on drop zone?
          ↓
      [Dropping] → [Idle]
```

| State | Condition | Action | Next |
|-------|-----------|--------|------|
| **Idle** | Round complete or reset | Show objects + drop zones | Tracking on hand detect |
| **Tracking** | Hand visible, no pinch | Show cursor | Grabbing on pinch-on-object |
| **Grabbing** | Pinch on object | Highlight object, show attachment point | Dragging on motion or Idle |
| **Dragging** | Object moving with hand | Snap object to fingertip, check drop zone proximity | Dropping on release or Idle |
| **Dropping** | Released on zone | Snap to zone center, score +1 | Idle (next object spawns) |

**Status**: Placeholder component, not yet implemented.

## Shared Logic

### InteractionState.process()

Called once per frame in TrackingLayer:

```typescript
const state = interactionState.process(rawLandmarks);
return {
  hasHand: landmarks !== null,
  penDown: landmarks && pinchDistance < 0.32,
  pinchActive: landmarks && pinchDistance < 0.32,
  filteredPoint: applyFilter(landmarks[8], currentFilter),
  confidence: landmarks?.landmarks[9]?.visibility || 0
};
```

**Contract**: Always returns consistent, filtered state. No side effects.

## Inconsistencies

### Issue 1: FreePaint Uses Dual Path for Pen State

**Current problem**:

```typescript
// Path A: InteractionState computes penDown
const state = interactionState.process(landmarks);

// Path B: DrawingEngine also computes pen state internally
export class DrawingEngine {
  processPoint(filteredPoint) {
    // Redundant: also checks some pinch logic
    if (this.isPinching(filteredPoint)) {
      this.beginStroke();
    }
  }
}
```

**Result**: Two independent pen state machines, risk of desync. If InteractionState says penDown=true but drawingEngine disagrees, stroke won't draw.

**Fix**: Remove pen state logic from drawingEngine. It should be dumb - receive pen state and render, nothing more.

### Issue 2: Bubble Pop Uses Raw Collision Without Pen State

**Current problem**:

```typescript
// BubblePopMode doesn't read penDown, just uses filteredPoint
for (const bubble of bubbles) {
  if (distance(filteredPoint, bubble.center) < bubble.radius * 1.35) {
    pop(bubble);  // Direct collision, no pinch requirement
  }
}
```

**Design question**: Should bubble pop require pinch (pen down) or just fingertip proximity?

**Current UX**: Proximity-based (more forgiving).

**Issue**: Inconsistent with FreePaint (requires pinch). Kids may expect both modes to work the same way.

**Recommendation**: Keep proximity-based for Bubble Pop (it's a "touch" activity, lower skill floor), but document clearly.

### Issue 3: Sort/Place Is Stub

**Current state**: Placeholder, no pen state logic at all.

## Proposed Fix: Unified Pen State Flow

### Correct Pattern

1. **InteractionState.process()** (once per frame, top of TrackingLayer)
   - Reads raw MediaPipe landmarks
   - Applies OneEuroFilter
   - Detects pinch (penDown)
   - Returns unified state

2. **Mode logic** reads from InteractionState
   - Gets penDown, filteredPoint, hasHand
   - Implements mode-specific transitions
   - Calls drawingEngine.render() or mode-specific renderer

3. **DrawingEngine** is dumb renderer
   - Receives pen state from caller
   - No internal state logic
   - Renders strokes, reads config, outputs pixels

### Remove PenStateManager from DrawingEngine

**Option A: Remove completely**
```typescript
// OLD (bad): drawingEngine computes pen state
drawingEngine.processPoint(point);

// NEW (good): caller computes, passes to drawingEngine
drawingEngine.render(ctx, { strokes: [...], currentPoint, penDown });
```

**Option B: Keep internal but wire through InteractionState**
```typescript
// drawingEngine.render() receives explicit state
const strokesToRender = drawingEngine.render(
  ctx,
  state.filteredPoint,
  state.penDown,  // Explicit parameter
  config
);
```

## Ordering (Already Correct in TrackingLayer)

```
1. detectHand() → raw landmarks
2. interactionState.process(landmarks) → { penDown, filteredPoint, ... }
3. mode.update(state) → mode-specific logic
4. drawingEngine.render(ctx, ...) → pixels
5. requestAnimationFrame(next frame)
```

**Verify**: TrackingLayer.tsx lines ~200-250.

---

## Implementation Checklist

- [ ] Audit DrawingEngine for internal pen state logic (PenStateManager)
- [ ] Remove pen state computation from DrawingEngine.processPoint()
- [ ] Pass explicit penDown state to drawingEngine.render()
- [ ] Update FreePaintMode to read state only from InteractionState
- [ ] Verify TracingMode reads state only from InteractionState
- [ ] Document Bubble Pop design: proximity-based (not pinch-gated)
- [ ] Implement Sort/Place with unified pen state (see SORT_PLACE_POLISH.md)
- [ ] Add unit test: verify InteractionState.penDown matches mode logic expectations
- [ ] Add integration test: simulate pinch gesture, verify stroke drawn in all modes
- [ ] Code review: ensure no other pen state machines exist
