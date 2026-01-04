# Pen State UX Specification
## Draw in the Air - Pause and Continue Interaction Model

---

## The Problem

> **Current behaviour:** "Finger visible = drawing"
>
> **Result:** The system draws while the child's hand is resting, creating unwanted marks.

Children need to pause during drawing (to think, rest, look at their work), but the current model interprets any visible hand as "drawing."

---

## Solution: Pinch-to-Draw Model

### Why Pinch Works

| Benefit | Explanation |
|---------|-------------|
| **Natural** | Pinch is an intuitive "holding a pen" gesture |
| **Learnable** | Kids understand "pinch to pick up, release to drop" |
| **Intentional** | Requires deliberate action—no accidental drawing |
| **Detectable** | MediaPipe reliably detects pinch gesture |
| **Reversible** | Easy to toggle between states |

---

## Pen State Model

### States

```
┌─────────────┐                    ┌─────────────┐
│             │    pinch close     │             │
│   PEN UP    │───────────────────▶│  PEN DOWN   │
│  (paused)   │                    │  (drawing)  │
│             │◀───────────────────│             │
└─────────────┘    pinch open      └─────────────┘
       │                                  │
       │         hand lost                │
       └──────────────────────────────────┘
```

### State Transitions

| From | To | Trigger |
|------|-----|---------|
| PEN UP | PEN DOWN | Pinch distance < threshold |
| PEN DOWN | PEN UP | Pinch distance > threshold |
| PEN DOWN | PEN UP | Hand lost |
| PEN UP | PEN UP | Hand lost (no change) |

---

## Pinch Detection

### Measurement

Pinch is detected by measuring the distance between:
- **Thumb tip** (Landmark 4)
- **Index finger tip** (Landmark 8)

```typescript
interface PinchDetectorConfig {
  pinchCloseThreshold: number;    // Distance to trigger pen down
  pinchOpenThreshold: number;     // Distance to trigger pen up
  hysteresisGap: number;          // Prevent flicker
  debounceFrames: number;         // Frames to confirm state change
}

const DEFAULT_CONFIG: PinchDetectorConfig = {
  pinchCloseThreshold: 0.05,      // 5% of hand span
  pinchOpenThreshold: 0.08,       // 8% of hand span (hysteresis)
  hysteresisGap: 0.03,            // 3% gap prevents oscillation
  debounceFrames: 3               // ~50ms at 60fps
};
```

### Detection Algorithm

```typescript
class PinchDetector {
  private config: PinchDetectorConfig;
  private currentState: PenState = PenState.UP;
  private framesSinceStateChange: number = 0;
  private pendingState: PenState | null = null;

  detectPinch(landmarks: NormalizedLandmark[]): PenState {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    
    // Calculate normalized distance
    const distance = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y
    );

    // Determine target state with hysteresis
    let targetState: PenState;
    if (this.currentState === PenState.UP) {
      // Must cross lower threshold to go down
      targetState = distance < this.config.pinchCloseThreshold 
        ? PenState.DOWN 
        : PenState.UP;
    } else {
      // Must cross upper threshold to go up
      targetState = distance > this.config.pinchOpenThreshold 
        ? PenState.UP 
        : PenState.DOWN;
    }

    // Debounce state changes
    if (targetState !== this.currentState) {
      if (this.pendingState === targetState) {
        this.framesSinceStateChange++;
        if (this.framesSinceStateChange >= this.config.debounceFrames) {
          this.currentState = targetState;
          this.pendingState = null;
          this.framesSinceStateChange = 0;
        }
      } else {
        this.pendingState = targetState;
        this.framesSinceStateChange = 1;
      }
    } else {
      this.pendingState = null;
      this.framesSinceStateChange = 0;
    }

    return this.currentState;
  }

  reset(): void {
    this.currentState = PenState.UP;
    this.pendingState = null;
    this.framesSinceStateChange = 0;
  }
}
```

---

## Visual Feedback

### Cursor States

| State | Cursor Appearance | Description |
|-------|-------------------|-------------|
| **PEN UP** | Hollow circle with soft glow | Ready to draw, not drawing |
| **PEN DOWN** | Solid circle with spark + trail | Actively drawing |
| **TRANSITIONING** | Brief pulse animation | State changing |

### Visual Design

```
PEN UP (Hollow)                    PEN DOWN (Solid)
     ╭───────╮                         ╭───────╮
    │  ╭───╮  │                       │ ●●●●● │
    │  │   │  │         ───▶          │ ●●●●● │
    │  ╰───╯  │                       │ ●●●●● │
     ╰───────╯                         ╰───────╯
       │                                   │
       │  Soft outer glow                 │  Bright glow + spark
       │  Indicates "ready"                │  Indicates "active"
```

### Implementation

```typescript
const MagicCursor = ({ x, y, penState }: MagicCursorProps) => {
  const isDown = penState === PenState.DOWN;

  return (
    <div style={{
      position: 'fixed',
      left: x,
      top: y,
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      // Conditional styling based on pen state
      background: isDown 
        ? 'radial-gradient(white, #00FFFF)' 
        : 'transparent',
      border: isDown 
        ? '3px solid #00FFFF' 
        : '3px solid rgba(0, 255, 255, 0.5)',
      boxShadow: isDown
        ? '0 0 20px #00FFFF, 0 0 40px #00FFFF'
        : '0 0 10px rgba(0, 255, 255, 0.3)',
      transition: 'all 0.15s ease'
    }}>
      {/* Spark only when pen down */}
      {isDown && (
        <div className="spark" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '8px',
          height: '8px',
          background: 'white',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 10px white'
        }} />
      )}
    </div>
  );
};
```

---

## Audio Feedback

| Event | Sound | Duration | Volume |
|-------|-------|----------|--------|
| Pen Down | Soft click/tap | 50ms | 30% |
| Pen Up | Soft release/pop | 50ms | 20% |

### Sound Design Notes
- Subtle, not distracting
- Confirms state change without breaking flow
- Can be disabled in settings

```typescript
class PenStateAudio {
  private audioContext: AudioContext;

  playPenDown(): void {
    // Short, soft click sound
    this.playTone(800, 0.05, 0.3);
  }

  playPenUp(): void {
    // Slightly higher, softer release
    this.playTone(600, 0.05, 0.2);
  }

  private playTone(freq: number, duration: number, volume: number): void {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = freq;
    gainNode.gain.value = volume;
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }
}
```

---

## Tutorial Integration

### Micro-Tutorial Step (Step 4)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              [Animation: finger + thumb pinching]               │
│                                                                 │
│     🔊 "Pinch your fingers to start drawing!"                   │
│                                                                 │
│     [Demo: hand pinches, cursor becomes solid, trail appears]   │
│                                                                 │
│     🔊 "Open your fingers to stop!"                             │
│                                                                 │
│     [Demo: hand opens, cursor becomes hollow, trail stops]      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Practice Activity

After explanation, child must:
1. Pinch (cursor changes, sound plays)
2. Move (trail appears)
3. Release (cursor changes, trail stops)
4. Repeat once

**Success:** Child demonstrates understanding of toggle.

---

## Alternative: Hover-to-Arm Model

For younger children (3-4) who may struggle with pinch coordination.

### How It Works

1. Child hovers over a "Draw" button for 0.6s
2. Drawing mode activates for 10 seconds
3. After 10 seconds, returns to pen up
4. Can re-arm by hovering again

### Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────┐                                                   │
│  │  🖌️ Draw │  ← Hover here to start drawing                    │
│  │  [====] │  ← Progress fills on hover                        │
│  └──────────┘                                                   │
│                                                                 │
│  Timer: [████████░░] 7 seconds left                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### When to Use

| Scenario | Recommended Model |
|----------|-------------------|
| Age 5+ | Pinch-to-draw |
| Age 3-4 | Hover-to-arm |
| Pinch difficulty detected | Auto-switch to hover |
| User preference | Allow toggle in settings |

---

## Rendering Rules During Pause

### Non-Negotiable Rules

| Rule | Implementation |
|------|----------------|
| **No points when pen up** | `if (penState === PenState.UP) return;` |
| **New stroke on pen down** | `startNewStroke()` on UP→DOWN transition |
| **Break on jump** | Even if pen down, break stroke if jump > threshold |
| **Clean stroke end** | Round cap on last point, no trailing artifacts |

### Code Integration

```typescript
// In frame loop
const processPenState = (
  landmarks: NormalizedLandmark[] | null,
  pinchDetector: PinchDetector,
  drawingEngine: DrawingEngine
) => {
  // No landmarks = pen up
  if (!landmarks) {
    pinchDetector.reset();
    drawingEngine.endStroke();
    return { penState: PenState.UP, position: null };
  }

  // Detect pinch state
  const penState = pinchDetector.detectPinch(landmarks);
  const indexTip = landmarks[8];
  const position = { x: indexTip.x, y: indexTip.y };

  // Apply pen state to drawing
  switch (penState) {
    case PenState.DOWN:
      drawingEngine.addPoint(position);
      break;
    case PenState.UP:
      drawingEngine.endStroke();
      break;
  }

  return { penState, position };
};
```

---

## State Persistence

The pen state should **not** persist across:
- Mode changes
- App backgrounding
- Page refresh

On each of these events, reset to PEN UP.

```typescript
// On mode change
const handleModeChange = (newMode: GameMode) => {
  pinchDetector.reset();
  drawingEngine.endStroke();
  setGameMode(newMode);
};

// On visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pinchDetector.reset();
    drawingEngine.endStroke();
  }
});
```

---

## Accessibility Considerations

| Consideration | Solution |
|---------------|----------|
| Motor difficulty with pinch | Offer hover-to-arm alternative |
| Can't see cursor state change | Add audio feedback |
| Colour blindness | Shape change (hollow/solid), not just colour |
| Cognitive load | Clear, consistent feedback |

---

## Testing Scenarios

### Happy Path
1. Child pinches → cursor becomes solid → drawing works
2. Child releases → cursor becomes hollow → drawing stops
3. Child moves while released → no drawing
4. Child pinches again → new stroke starts

### Edge Cases
1. **Pinch while moving:** Drawing starts mid-motion (new stroke)
2. **Release while moving:** Drawing stops mid-motion (stroke ends)
3. **Very fast pinch/release:** Debounce prevents flicker
4. **Partial pinch:** Only full pinch triggers pen down
5. **Pinch with wrong fingers:** Only thumb+index triggers

### Failure Cases
1. **Hand lost while pen down:** Stroke ends gracefully
2. **Pinch detection fails:** Falls back to pen up (safe default)
3. **Jittery pinch detection:** Hysteresis + debounce prevents flicker

---

*A clear pen up/pen down model is essential for intentional drawing. Without it, the system feels out of control and frustrating.*

