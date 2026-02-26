# Coordinate System Specification
## Draw in the Air - Mirroring and Coordinate Space

---

## The Problem

> **Symptom:** Tracing paths feel "backwards" or unresponsive.
>
> **Cause:** Video is mirrored for natural interaction, but overlays use different coordinate space.

When the child moves their finger left, they expect the cursor to move left on screen. But if coordinates aren't transformed consistently, the cursor might move right, or tracing detection might use the wrong position.

---

## Coordinate Spaces

### Space Definitions

| Space | Origin | X Direction | Y Direction | Used By |
|-------|--------|-------------|-------------|---------|
| **Camera Raw** | Top-left | Right is + | Down is + | MediaPipe output |
| **Screen** | Top-left | Right is + | Down is + | DOM, Canvas |
| **Mirrored** | Top-left | Left is + (reversed) | Down is + | User perception |

### The Mirror Problem

```
CAMERA RAW                        WHAT USER SEES
(MediaPipe output)               (Video with CSS scaleX(-1))

  0,0 ────────▶ 1,0                1,0 ◀──────── 0,0
   │                                │
   │    Hand at (0.2, 0.5)         │    Hand appears at (0.8, 0.5)
   │       ✋                        │                    ✋
   ▼                                ▼
  0,1            1,1               1,1              0,1
```

If child's hand is at camera X = 0.2, but video is mirrored, hand appears on the RIGHT side of screen.

If we draw the cursor at X = 0.2, it appears on the LEFT—opposite of where the hand appears!

---

## Solution: Single Source of Truth

### Rule: Transform Once, Early

```
MediaPipe → Mirror Transform → Use Everywhere
```

```typescript
// Transform immediately after receiving from MediaPipe
const transformLandmarks = (
  rawLandmarks: NormalizedLandmark[]
): NormalizedLandmark[] => {
  return rawLandmarks.map(landmark => ({
    ...landmark,
    x: 1 - landmark.x  // Mirror the X coordinate
  }));
};

// Use transformed coordinates for EVERYTHING:
// - Cursor position
// - Drawing
// - Hit testing
// - Tracing progress
// - Bubble collision
```

---

## Implementation

### Transform Point

```typescript
const mirrorX = (x: number): number => 1 - x;

// For a single point
const mirrorPoint = (point: Point): Point => ({
  x: mirrorX(point.x),
  y: point.y
});

// For all landmarks
const mirrorLandmarks = (
  landmarks: NormalizedLandmark[]
): NormalizedLandmark[] => {
  return landmarks.map(lm => ({
    ...lm,
    x: mirrorX(lm.x)
  }));
};
```

### Where to Apply

```typescript
// In TrackingLayer.tsx

const loop = () => {
  // 1. Get raw results from MediaPipe
  const rawResults = handTracker.detect(video, Date.now());
  
  // 2. Transform immediately
  const results = rawResults ? {
    ...rawResults,
    landmarks: rawResults.landmarks.map(hand => 
      hand.map(lm => ({ ...lm, x: 1 - lm.x }))
    )
  } : null;
  
  // 3. Pass transformed results to everything
  setLastResults(results);  // For React state
  onFrame?.(ctx, results, width, height);  // For mode logic
};
```

### Canvas Rendering

With mirrored coordinates, canvas does **not** need CSS transform:

```typescript
// Canvas style - NO scaleX(-1) needed!
<canvas style={{
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  // transform: 'scaleX(-1)'  // REMOVE THIS
}} />
```

Or, if you want to keep CSS mirror on canvas, DON'T transform the coordinates:

```typescript
// Alternative: CSS mirror + raw coordinates
<canvas style={{
  transform: 'scaleX(-1)'  // CSS does the mirroring
}} />

// Use raw coordinates (don't call mirrorX)
const position = { x: landmark.x, y: landmark.y };
```

**Pick ONE approach and use consistently!**

---

## Recommended Approach

### Option A: Transform Coordinates (Recommended)

| Component | Coordinate Space | CSS Transform |
|-----------|-----------------|---------------|
| Video element | Raw | `scaleX(-1)` |
| Canvas | Mirrored | None |
| Cursor | Mirrored | None |
| All logic | Mirrored | N/A |

```typescript
// Early transform
const getMirroredPosition = (landmarks: NormalizedLandmark[]): Point => {
  const indexTip = landmarks[8];
  return {
    x: 1 - indexTip.x,  // Mirror here
    y: indexTip.y
  };
};

// Everywhere else uses mirrored coordinates directly
const cursorX = position.x * window.innerWidth;  // No further transform
```

### Option B: CSS Transform on Everything

| Component | Coordinate Space | CSS Transform |
|-----------|-----------------|---------------|
| Video element | Raw | `scaleX(-1)` |
| Canvas | Raw | `scaleX(-1)` |
| Cursor container | Raw | `scaleX(-1)` |
| All logic | Raw | N/A |

```typescript
// No coordinate transform
const getPosition = (landmarks: NormalizedLandmark[]): Point => {
  const indexTip = landmarks[8];
  return {
    x: indexTip.x,  // Raw
    y: indexTip.y
  };
};

// CSS handles visual mirroring
<div style={{ transform: 'scaleX(-1)' }}>
  <Cursor x={position.x} y={position.y} />
</div>
```

**Option A is recommended** because:
- Logic is clearer (coordinates match what user sees)
- No need to remember which elements have CSS transforms
- Hit testing is intuitive

---

## Common Bugs

### Bug 1: Cursor Mirrored but Hit Testing Uses Raw X

**Symptom:** Cursor appears in right place, but clicking/hovering doesn't work where expected.

**Cause:** Cursor uses mirrored X, hit testing uses raw X.

**Fix:** Use same coordinate space for both.

```typescript
// BAD
const cursorX = 1 - landmark.x;  // Mirrored
const hitTestX = landmark.x;     // Raw - WRONG!

// GOOD
const position = mirrorPoint({ x: landmark.x, y: landmark.y });
const cursorX = position.x;      // Mirrored
const hitTestX = position.x;     // Also mirrored - CORRECT
```

### Bug 2: Tracing Path Rendered in Wrong Direction

**Symptom:** Path goes left-to-right visually, but child must move right-to-left to progress.

**Cause:** Path coordinates not transformed, or canvas has unexpected CSS transform.

**Fix:** Define paths in mirrored space, or transform path coordinates.

```typescript
// Path definition - in mirrored space
const path = {
  start: { x: 0.2, y: 0.3 },  // Left side of screen (mirrored)
  end: { x: 0.8, y: 0.3 }     // Right side of screen (mirrored)
};

// Child moving left-to-right in real life
// = finger moving right-to-left in camera
// = cursor moving left-to-right on screen (after mirror transform)
// = progress along path
```

### Bug 3: Bubbles Spawn on Wrong Side

**Symptom:** Bubbles spawn at X=0.2 in code but appear on right side of screen.

**Cause:** Bubble rendering uses raw coordinates on mirrored canvas.

**Fix:** Either don't mirror canvas, or spawn bubbles in mirrored coordinates.

---

## Acceptance Test

### Test: Left Movement = Left Cursor

```
Scenario: Child moves finger to THEIR left
Given: Child is facing camera
And: Video appears mirrored (natural mirror view)
When: Child moves their hand to THEIR left
Then: Cursor on screen moves to the LEFT
And: Tracing start marker on left works correctly
And: Progress follows correctly left-to-right
```

### Manual Test Procedure

1. Stand in front of camera
2. Hold up right hand
3. Move hand to YOUR left (towards your left shoulder)
4. **Expected:** Cursor moves LEFT on screen
5. If cursor moves RIGHT, coordinate transform is wrong

### Automated Test

```typescript
describe('Coordinate Mirroring', () => {
  it('should mirror X coordinate', () => {
    const raw = { x: 0.2, y: 0.5 };
    const mirrored = mirrorPoint(raw);
    expect(mirrored.x).toBe(0.8);  // 1 - 0.2 = 0.8
    expect(mirrored.y).toBe(0.5);  // Y unchanged
  });

  it('should detect hover on left card with left position', () => {
    // Card on left side of screen
    const cardBounds = { left: 0.1, right: 0.3, top: 0.3, bottom: 0.7 };
    
    // Finger appears on left (mirrored X = 0.2)
    const fingerPosition = { x: 0.2, y: 0.5 };
    
    const isHovering = isInsideBounds(fingerPosition, cardBounds);
    expect(isHovering).toBe(true);
  });
});
```

---

## Debugging Checklist

If things feel "backwards":

- [ ] Is video element using `transform: scaleX(-1)`?
- [ ] Are landmark coordinates being mirrored early?
- [ ] Is canvas also using CSS transform? (Should match approach)
- [ ] Are hit test bounds in same coordinate space as position?
- [ ] Are path definitions in correct coordinate space?
- [ ] Is cursor position using transformed coordinates?

### Debug Overlay

Add a temporary debug overlay to visualize coordinate spaces:

```typescript
const DebugOverlay = ({ rawPosition, mirroredPosition }) => (
  <div style={{ position: 'fixed', top: 10, left: 10, color: 'white', zIndex: 9999 }}>
    <div>Raw: ({rawPosition.x.toFixed(2)}, {rawPosition.y.toFixed(2)})</div>
    <div>Mirrored: ({mirroredPosition.x.toFixed(2)}, {mirroredPosition.y.toFixed(2)})</div>
    <div style={{ 
      position: 'fixed', 
      left: `${rawPosition.x * 100}%`, 
      top: `${rawPosition.y * 100}%`,
      width: 10, height: 10,
      background: 'red',
      borderRadius: '50%'
    }} />
    <div style={{ 
      position: 'fixed', 
      left: `${mirroredPosition.x * 100}%`, 
      top: `${mirroredPosition.y * 100}%`,
      width: 10, height: 10,
      background: 'green',
      borderRadius: '50%'
    }} />
  </div>
);
```

Red dot = raw position, Green dot = mirrored position.
Green dot should match where hand appears in video.

---

## Summary

| Rule | Description |
|------|-------------|
| **Transform once** | Mirror X coordinate immediately after MediaPipe |
| **Use everywhere** | All logic uses transformed coordinates |
| **Be consistent** | Either transform coordinates OR use CSS, not mixed |
| **Test visually** | Move hand left, cursor should go left |
| **Debug with overlay** | Show both coordinate spaces during development |

---

*Coordinate consistency is fundamental. Get this wrong and nothing else will feel right.*

