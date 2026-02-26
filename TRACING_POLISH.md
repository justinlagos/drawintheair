# Tracing Polish

## Current Path Detection

**tracingLogicV2.ts** implements path-following detection:

```typescript
export function checkPointOnPath(
  point: { x: number; y: number },
  path: PathShape,
  tolerance: number
): boolean {
  const nearest = findNearestPointOnPolyline(path.points, point);
  return distance(point, nearest) < tolerance;
}
```

### Tolerance Per Pack

Defined in **tracingContent.ts**:

| Pack | Level | Base Tolerance (px) | Forgiveness | Notes |
|------|-------|----------------------|-------------|-------|
| 1 | 1-3 | 15 | +15% (17px) | Easiest, most forgiving |
| 1 | 4-6 | 18 | +15% (21px) | Still forgiving |
| 2 | 1-3 | 20 | +15% (23px) | Medium difficulty |
| 2 | 4-6 | 22 | +15% (25px) | Medium-hard |
| 3+ | All | 25-30 | None | Hard mode, strict |

**+15% forgiveness** = if base is 20px, actual tolerance is 23px.

### Success Trigger

Completion percentage:

```typescript
completionPercent = (pathLengthTraced / totalPathLength) * 100;
if (completionPercent >= completionThreshold) {
  triggerSuccess();
}
```

| Pack | Threshold | Notes |
|------|-----------|-------|
| 1 | 85% | Kids allowed to miss some (top/bottom of letters) |
| 2 | 90% | Slightly stricter |
| 3+ | 95% | Expert mode |

## Improvements

### Improvement 1: Increase Base Tolerance 20% for All Packs

**Current problem**: Some children struggle to stay within lines, especially on low-end devices with detection jitter.

**Proposed change**:

| Pack | Base Tolerance (old) | Base Tolerance (new) | +Forgiveness | Final |
|------|--------|---------|-------|-------|
| 1 | 15px | 18px | +15% → +20% | 22px |
| 2 | 20px | 24px | +15% → +20% | 29px |
| 3+ | 25-30px | 30-36px | None | 30-36px |

**Rationale**: 20px increase accommodates MediaPipe landmark jitter on mid-range Android, keeps activity fun not frustrating.

**Risk**: Paths may feel too easy on desktop. Mitigate by implementing "perfect trace" bonus (see below).

### Improvement 2: "Close Enough" Visual Cue

When fingertip enters the "almost good" zone (within 1.5x tolerance but not yet on path):

```typescript
const onPath = distance(point, nearest) < tolerance;
const closeEnough = distance(point, nearest) < tolerance * 1.5;

if (closeEnough && !onPath) {
  // Path brightens / glows to indicate "you're close"
  path.strokeStyle = 'rgba(100, 255, 100, 0.8)';  // Bright green
  path.shadowColor = 'rgba(100, 255, 100, 0.5)';
  path.shadowBlur = 10;
} else if (onPath) {
  // On path: standard rendering
  path.strokeStyle = 'rgba(100, 200, 255, 1.0)';
} else {
  // Off path: muted
  path.strokeStyle = 'rgba(100, 100, 100, 0.6)';
}
```

**UX benefit**: Children get visual feedback "you're close, try again here".

### Improvement 3: Lower Success Trigger for Pack 1 to 80%

**Current**: Pack 1 requires 85% traced.

**Proposed**: Pack 1 requires 80% traced.

**Rationale**:
- Pack 1 is intro, should feel achievable
- 80% is still very good (only 20% allowed miss)
- Helps younger kids maintain engagement
- Reduces frustration on first tracing activity

**Risk**: Kids might skip corners. Mitigate with visual cue (Improvement 2) to encourage completeness.

### Improvement 4: Smoother Streak Meter Animation

**Current code pattern** (pseudo):

```typescript
// Streak meter updates on every frame
streakPercent = completionPercent;
```

**Problem**: Meter jumps erratically as child moves hand around path, creating visual noise.

**Fix**: Smooth animation with easing:

```typescript
const targetPercent = completionPercent;
streakPercent += (targetPercent - streakPercent) * 0.1;  // Ease towards target
```

**Parameters**:
- Easing factor: 0.1 (10% of distance per frame, smooth over ~10 frames = 166ms at 60fps)
- Only animate forward (never decrease)

**Result**: Meter smoothly rises, clearer progress indication.

### Improvement 5: Gentler Off-Path Feedback (Fade Not Flash)

**Current feedback** when child strays off path:

```typescript
if (!onPath && wasOnPath) {
  // Flash red
  canvas.filter = 'hue-rotate(0deg)';  // Or color flash effect
  showWarning("Stay on the path!");
}
```

**Problem**: Flash is startling, can frustrate children.

**Proposed**: Fade + soft audio cue:

```typescript
if (!onPath) {
  // Fade stroke opacity
  pathOpacity = lerp(pathOpacity, 0.3, 0.05);  // Fade to 30% opacity

  // Soft beep (optional)
  audioContext.playTone(200, 50);  // Low beep, 50ms
} else {
  // Fade back to full opacity
  pathOpacity = lerp(pathOpacity, 1.0, 0.1);
}
```

**UX benefit**: Gentle correction, less jarring.

## Text Mirroring Verification

**Current implementation**:

```typescript
// TrackingLayer.tsx: Mirror video for LTR consistency
canvas.style.transform = 'scaleX(-1)';

// tracingContent.ts: Pre-mirror path coordinates
const mirrorX = (x: number) => 1.0 - x;
const paths = [
  { points: [mirrorX(x1), y1], ... },
  { points: [mirrorX(x2), y2], ... }
];
```

**Status**: ✓ **Verified correct**.

Explanation:
1. Video is mirrored on-screen (natural for self-view)
2. Path coordinates are pre-mirrored in tracingContent.ts
3. Both hand and path are flipped, so alignment is maintained
4. No special handling needed in tracing logic

**Test**: Load Pack 1, Level 1 (big "A"), verify path matches mirror view.

---

## Implementation Checklist

- [ ] Increase base tolerance +20% for all packs (15→18, 20→24, 25→30)
- [ ] Implement "close enough" visual cue (1.5x tolerance zone, path brightens)
- [ ] Lower Pack 1 success threshold from 85% to 80%
- [ ] Add easing to streak meter animation (0.1 factor, forward-only)
- [ ] Replace flash feedback with opacity fade on off-path detection
- [ ] Add optional soft beep audio cue (200Hz, 50ms) on off-path
- [ ] Test on device matrix: desktop, iPad, Android, low-end
- [ ] Measure success rate before/after tolerance change
- [ ] Verify text mirroring on all packs (spot-check Pack 2, 3)
- [ ] Gather kid feedback: tolerance feels good? Cues helpful?
