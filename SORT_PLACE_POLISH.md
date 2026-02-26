# Sort/Place Polish

## Current State

**Sort/Place mode is a STUB implementation**:

- Placeholder component: `SortPlaceMode.tsx` exists but is incomplete
- Logic file: `sortPlaceLogic.ts` is minimal
- No grab detection
- No drop zones
- No object dragging

This document outlines the full implementation needed.

## Game Design

### Round Structure

Sort/Place is a 3-round difficulty progression:

| Round | Objects | Time Limit | Difficulty | Example |
|-------|---------|-----------|------------|---------|
| 1 (intro) | 3 objects | 60s | Easy: large objects, loose drop zones | Sort fruit: apples, bananas, oranges → baskets |
| 2 (intermediate) | 5 objects | 45s | Medium: medium objects, tighter zones | Sort shapes: squares, circles → boxes |
| 3 (challenge) | 7 objects | 30s | Hard: small objects, strict zones | Sort coins by value → bags |

### Object and Zone Design

```typescript
interface GameObject {
  id: string;
  x: number;              // Normalized 0-1
  y: number;
  width: number;          // Normalized size
  height: number;
  type: 'APPLE' | 'BANANA' | ...;
  isGrabbed: boolean;
  grabOffset: { x: number; y: number };  // Offset from fingertip
}

interface DropZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  acceptTypes: string[];  // ['APPLE', 'ORANGE'] etc.
  isHighlighted: boolean;
  objectsPlaced: GameObject[];
}
```

## Grab Detection

### Grab Logic

```typescript
function updateGrabState(
  interactionState: InteractionStateOutput,
  objects: GameObject[],
  currentGrab: GameObject | null
): GameObject | null {
  const fingerTip = interactionState.filteredPoint;
  const penDown = interactionState.penDown;  // Pinch active

  // If currently grabbing, maintain grab
  if (currentGrab) {
    return penDown ? currentGrab : null;  // Release on pinch up
  }

  // Check for new grab
  if (!penDown) return null;  // Can't grab without pinch

  for (const obj of objects) {
    if (pointInRect(fingerTip, obj)) {
      return obj;  // Grab on pinch + overlap
    }
  }

  return null;
}
```

**Contract**:
- Grab requires **both** pinch active AND fingertip overlaps object
- Release on pinch release (penDown becomes false)
- One object at a time

## Attachment

When grabbed, object snaps to fingertip with smooth offset:

```typescript
function updateGrabbedObject(
  grabObj: GameObject,
  fingerTip: { x: number; y: number },
  deltaTime: number
): void {
  // Compute target position (fingertip - offset)
  const targetX = fingerTip.x - grabObj.grabOffset.x;
  const targetY = fingerTip.y - grabObj.grabOffset.y;

  // Smooth motion towards target (springs or easing)
  const easeSpeed = 0.15;  // Higher = snappier
  grabObj.x += (targetX - grabObj.x) * easeSpeed;
  grabObj.y += (targetY - grabObj.y) * easeSpeed;
}
```

**Grab offset**: Computed on grab start, center-to-fingertip offset. This allows grabbing object not at center point.

```typescript
// On grab start
grabOffset = {
  x: fingerTip.x - object.centerX,
  y: fingerTip.y - object.centerY
};
```

## Drop Zone Highlighting

When grabbing object, highlight compatible drop zones:

```typescript
function updateDropZoneHighlight(
  grabObj: GameObject | null,
  zones: DropZone[]
): void {
  for (const zone of zones) {
    const compatible = zone.acceptTypes.includes(grabObj?.type);
    const fingerInZone = pointInRect(fingerTip, zone);

    zone.isHighlighted = compatible && (grabObj !== null);

    // Visual feedback
    if (grabObj && fingerInZone && compatible) {
      zone.borderColor = '#00FF00';  // Green = valid drop
      zone.borderWidth = 3;
    } else if (grabObj && fingerInZone) {
      zone.borderColor = '#FF0000';  // Red = invalid type
    } else if (zone.isHighlighted) {
      zone.borderColor = '#FFFF00';  // Yellow = possible zone
    } else {
      zone.borderColor = '#888888';  // Gray = inactive
    }
  }
}
```

## Drop and Snap

On pinch release while hovering over zone:

```typescript
function onPinchRelease(
  grabObj: GameObject,
  zones: DropZone[]
): GameObject | null {
  for (const zone of zones) {
    if (
      pointInRect(fingerTip, zone) &&
      zone.acceptTypes.includes(grabObj.type)
    ) {
      // Valid drop
      zone.objectsPlaced.push(grabObj);
      snapObjectToZone(grabObj, zone);
      score += 1;
      return null;  // Clear grabbed object
    }
  }

  // Invalid drop, return to original position
  animateReturn(grabObj, grabObj.originalPosition);
  return null;
}

function snapObjectToZone(obj: GameObject, zone: DropZone): void {
  // Snap to zone center with animation
  const targetX = zone.centerX - obj.width / 2;
  const targetY = zone.centerY - obj.height / 2;

  animate(obj, { x: targetX, y: targetY }, 300);  // 300ms snap
}
```

## Difficulty Ramp

### Round 1 (Intro)

- Objects: 3 (e.g., red apple, yellow banana, orange orange)
- Drop zones: 2 (fruit basket, compost)
- Zone size: Large (0.25 normalized width)
- Spacing: Generous (well-separated)
- Time: 60s
- Feedback: Encouraging messages, sound effects

### Round 2 (Intermediate)

- Objects: 5
- Drop zones: 3
- Zone size: Medium (0.20 normalized width)
- Spacing: Moderate
- Time: 45s
- Feedback: Neutral, quick feedback

### Round 3 (Challenge)

- Objects: 7
- Drop zones: 4
- Zone size: Small (0.15 normalized width)
- Spacing: Tight
- Time: 30s
- Feedback: Competitive scoring, timer visible

## Performance Considerations

### Object Count

- **Max objects on screen**: 7 (Round 3)
- **Max zones**: 4
- **Total tracked entities**: <15

This is low enough for no special optimization needed.

### Rendering

**Dirty-rect updates**: Only redraw changed regions if performance needed.

```typescript
function render(ctx: CanvasRenderingContext2D): void {
  // Option A: Full redraw (simple, sufficient for 7 objects)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const zone of zones) {
    renderZone(ctx, zone);
  }
  for (const obj of objects) {
    renderObject(ctx, obj, obj.isGrabbed);
  }

  // Option B: Dirty rect (if needed)
  // ... only redraw changed areas
}
```

**Recommendation**: Start with full redraw, profile, optimize if needed.

### Collision

Grab detection: O(N) per frame where N = object count (7). Fine.

Drop zone check: O(M) where M = zone count (4). Fine.

## Sound/Feedback

- **Grab sound**: Soft beep (440Hz, 100ms) when object grabbed
- **Drop sound**: Satisfying *pop* sound (880Hz, 200ms) when placed correctly
- **Error sound**: Short buzz (200Hz, 100ms) on invalid drop
- **Timer alert**: Beep (0.5s remaining)

## Implementation Checklist

- [ ] Implement grab detection in SortPlaceMode.tsx (pinch + overlap)
- [ ] Implement grab release on pinch up
- [ ] Implement attachment logic (smooth snap to fingertip)
- [ ] Implement grab offset computation (center to fingertip)
- [ ] Implement drop zone highlighting (compatible colors)
- [ ] Implement drop detection and snapping logic
- [ ] Implement invalid drop return animation
- [ ] Implement 3-round difficulty progression
- [ ] Define object types and drop zone configs for each round
- [ ] Add sound effects (grab, drop, error, timer)
- [ ] Test on device matrix: ensure smooth dragging (no lag)
- [ ] Performance profile: measure FPS with 7 objects + 4 zones
- [ ] Gather kid feedback: is difficulty progression good?
- [ ] Verify scoring and time limit per round
