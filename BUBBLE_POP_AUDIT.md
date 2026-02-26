# Bubble Pop Audit

## Spawn Mechanics

**bubbleCalibrationLogic.ts** controls bubble lifecycle:

```typescript
export function spawnBubble(levelConfig: LevelConfig): Bubble {
  return {
    x: Math.random(),  // 0.0 to 1.0 (normalized canvas width)
    y: 1.0,            // Bottom of screen
    radius: 0.08,      // Normalized radius
    velocity: {
      x: drift,        // Random sideways drift
      y: -velocity     // Upward
    },
    zigzag: levelConfig.zigzag || false,
    spawnTime: now
  };
}
```

### Spawn Rate

| Level | Spawn Interval | Notes |
|-------|---|---|
| 1 | 2.0s | 1 bubble every 2 seconds |
| 2 | 1.5s | Slightly faster |
| 3 | 1.0s | 1 bubble per second |
| 4+ | 0.7s | Challenging pace |

### Spawn Position

- **X**: `Math.random()` → uniform 0.0 to 1.0
- **Y**: Always 1.0 (bottom of screen)
- **Radius**: Fixed per level (0.08-0.12 normalized)

## Motion

Bubbles float upward with environmental effects:

### Vertical Motion

```typescript
bubble.y += -0.001 * deltaTime;  // Move upward
```

Travel time from bottom to top: ~10 seconds (depending on level).

### Horizontal Drift

Random left/right drift per bubble:

```typescript
const driftAngle = Math.random() * Math.PI - Math.PI / 2;
bubble.velocity.x = Math.cos(driftAngle) * 0.0005;
bubble.x += bubble.velocity.x * deltaTime;
```

Drift range: ±0.0005 per frame, allows horizontal movement ~10-15% of screen width.

### Zigzag (Optional, Higher Levels)

On levels with `zigzag: true`:

```typescript
const zigzagPhase = (now - bubble.spawnTime) * 0.003;
const zigzagAmount = Math.sin(zigzagPhase) * 0.05;
bubble.x += zigzagAmount * deltaTime;
```

Sinusoidal side-to-side motion, amplitude ±0.05 normalized.

**Effect**: Bubbles snake around, harder to hit.

## Hit Test

**BubblePopMode.tsx** detects collision:

```typescript
const fingerTip = { x: state.filteredPoint.x, y: state.filteredPoint.y };

for (const bubble of bubbles) {
  const dx = bubble.x - fingerTip.x;
  const dy = bubble.y - fingerTip.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < bubble.radius * 1.35) {  // 35% forgiveness
    popBubble(bubble);
  }
}
```

### Forgiveness

Hit radius = `bubble.radius * 1.35`

- Base radius: 0.08 normalized
- Hit radius: 0.108 normalized
- Forgiveness: +35%

**Rationale**: Accounts for tracking jitter, makes activity achievable for kids.

## Coordinate Mapping

**Data flow**:

```
Normalized coordinates (0.0-1.0)
  ↓
bubbleCalibrationLogic.ts (spawn, update)
  ↓
BubblePopMode.tsx (collision check)
  ↓
Render:
  const canvasX = bubble.x * canvas.width;
  const canvasY = bubble.y * canvas.height;
  ctx.arc(canvasX, canvasY, bubble.radius * canvas.width, ...);
```

**Verification**: Ensure normalized coords converted to canvas pixels consistently in render.

## Identified Issues

### Issue 1: Hit Test Uses Raw Distance Without DPI Scaling

**Current problem**:

```typescript
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist < bubble.radius * 1.35) {
  // bubble.radius is normalized (0.08)
  // dist is also normalized
  // BUT: On high DPI devices (iPad Pro 2x, 3x), hit zone may feel smaller
}
```

**Why**: Hit radius is in normalized coordinates, but MediaPipe landmark detection has fixed pixel accuracy (~5px). On high DPI devices, 5px normalized = smaller hit zone.

**Impact**: iPad Pro (DPR 2) feels harder to pop than Android (DPR 1), inconsistent UX.

**Fix**: Scale hit radius by DPI:

```typescript
const dpiAdjustedRadius = bubble.radius * 1.35 * (1.0 / dpr);
if (dist < dpiAdjustedRadius) {
  popBubble(bubble);
}
```

Or equivalently, in pixel space:
```typescript
const hitRadiusPx = bubble.radius * canvas.width * 1.35;
const distPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
if (distPx < hitRadiusPx) {
  popBubble(bubble);
}
```

### Issue 2: No Temporal Forgiveness for Near-Misses

**Current problem**: Hit test purely spatial - if fingertip is 0.086 from center and radius is 0.108, it hits. But if it's 0.110, no hit, even if fingertip was 0.100 the previous frame.

**Result**: Near-misses feel unfair, especially on low-end devices with tracking lag.

**Fix**: Add temporal forgiveness:

```typescript
const historyWindow = 3;  // Last 3 frames (~50ms at 60fps)

for (const bubble of bubbles) {
  let hitThisFrame = false;
  for (let i = 0; i < Math.min(historyWindow, fingerTipHistory.length); i++) {
    const historicalTip = fingerTipHistory[i];
    const dist = distance(bubble, historicalTip);

    if (dist < bubble.radius * 1.35) {
      hitThisFrame = true;
      break;
    }
  }

  if (hitThisFrame) {
    popBubble(bubble);
  }
}
```

**Effect**: If hand was close to bubble in last 50ms, count it as a hit. More forgiving, feels fair.

### Issue 3: Milestone Rewards Hardcoded

**Current code** (pseudo):

```typescript
if (popCount === 10) {
  unlockPack(2);
  showReward("Pack 2 Unlocked!");
}
if (popCount === 25) {
  unlockPack(3);
  showReward("Pack 3 Unlocked!");
}
```

**Problems**:
- Hardcoded milestones not flexible
- No verification that milestone matches displayed count
- Difficult to adjust for balance

**Fix**: Define milestones in config:

```typescript
const BUBBLE_MILESTONES = [
  { count: 10, unlocks: 'PACK_2', message: 'Pack 2 Unlocked!' },
  { count: 25, unlocks: 'PACK_3', message: 'Pack 3 Unlocked!' },
  { count: 50, unlocks: 'ACHIEVEMENT_MASTER_POPPER', message: 'Master Popper!' }
];

// In game loop
for (const milestone of BUBBLE_MILESTONES) {
  if (popCount === milestone.count) {
    triggerMilestone(milestone);
  }
}
```

**Benefit**: Easier to adjust, decoupled from UI.

---

## Implementation Checklist

- [ ] Audit hit test implementation in BubblePopMode.tsx
- [ ] Apply DPI scaling to hit radius calculation
- [ ] Implement temporal forgiveness (3-frame history window)
- [ ] Extract milestones to config constant
- [ ] Verify milestone count matches on-screen display
- [ ] Test on device matrix: desktop, iPad, Android (DPR 1, 2, 3)
- [ ] Measure pop success rate before/after improvements
- [ ] Adjust forgiveness (1.35 radius) if needed based on feedback
- [ ] Log hitTest metrics: distance distribution, DPI correction applied
- [ ] Gather kid feedback: does pop feel fair?
