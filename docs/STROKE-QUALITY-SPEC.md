# Stroke Quality Specification
## Draw in the Air - Rendering Excellence

---

> **Why This Matters:** If the line looks jerky, the whole concept feels broken. Stroke quality is product-critical.

---

## Quality Definition

"Stroke quality" is a **measurable specification**, not a vibe.

### Quality Targets

| Dimension | Target | Minimum Acceptable |
|-----------|--------|-------------------|
| **Smoothness** | Stroke looks continuous, no jitter spikes | No visible jagged segments |
| **Consistency** | Thickness stable, predictable response to speed | No random thickness jumps |
| **Latency** | Stroke follows finger with minimal perceived lag | <60ms input-to-render |
| **Stability** | No ugly spikes when tracking drops | Clean pen-up, no teleport lines |

---

## Stabiliser Pipeline

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Raw Input   │───▶│  Confidence  │───▶│   Temporal   │───▶│   Velocity   │
│  (MediaPipe) │    │    Gate      │    │  Smoothing   │    │   Filter     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │                   │                    │
                           ▼                   ▼                    ▼
                    Drop if low         One Euro or          Adapt to speed
                    confidence          Kalman filter
                                                                    │
                                                                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Render     │◀───│   Spline     │◀───│    Stroke    │◀───│   Movement   │
│   Output     │    │Interpolation │    │ Segmentation │    │  Threshold   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## Pipeline Stage Specifications

### Stage 1: Confidence Gate

**Purpose:** Reject unreliable tracking data before it corrupts the stroke.

```typescript
interface ConfidenceGateConfig {
  minHandConfidence: number;      // Minimum detection confidence (0-1)
  minTrackingConfidence: number;  // Minimum tracking confidence (0-1)
  dropoutFrameThreshold: number;  // Frames below threshold before pen-up
}

const DEFAULT_CONFIG: ConfidenceGateConfig = {
  minHandConfidence: 0.5,
  minTrackingConfidence: 0.5,
  dropoutFrameThreshold: 3  // 3 frames at 60fps = 50ms grace period
};
```

**Rules:**
| Condition | Action |
|-----------|--------|
| Confidence ≥ threshold | Pass point to next stage |
| Confidence < threshold for < N frames | Hold last known position |
| Confidence < threshold for ≥ N frames | Trigger pen-up (end stroke) |

---

### Stage 2: Movement Threshold

**Purpose:** Ignore micro-movements that cause jitter.

```typescript
interface MovementThresholdConfig {
  minPixelDistance: number;       // Minimum movement in pixels
  minNormalizedDistance: number;  // Minimum movement (0-1 normalized)
}

const DEFAULT_CONFIG: MovementThresholdConfig = {
  minPixelDistance: 2,            // 2 pixels minimum
  minNormalizedDistance: 0.002    // 0.2% of screen dimension
};
```

**Rules:**
| Condition | Action |
|-----------|--------|
| Distance ≥ threshold | Accept point |
| Distance < threshold | Discard point (use previous) |

---

### Stage 3: Temporal Smoothing

**Purpose:** Smooth position over time to reduce noise.

#### Option A: One Euro Filter (Recommended)

The One Euro Filter provides adaptive smoothing—low latency for fast movements, high smoothing for slow movements.

```typescript
interface OneEuroFilterConfig {
  minCutoff: number;    // Minimum cutoff frequency (Hz)
  beta: number;         // Speed coefficient
  dCutoff: number;      // Derivative cutoff frequency
}

const DEFAULT_CONFIG: OneEuroFilterConfig = {
  minCutoff: 1.0,       // Lower = more smoothing
  beta: 0.007,          // Higher = more responsive to speed
  dCutoff: 1.0
};

class OneEuroFilter {
  private x: LowPassFilter;
  private dx: LowPassFilter;
  private lastTime: number | null = null;

  filter(value: number, timestamp: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      this.x.init(value);
      this.dx.init(0);
      return value;
    }

    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Estimate velocity
    const dx = (value - this.x.lastValue) / dt;
    const edx = this.dx.filter(dx, this.alpha(dt, this.config.dCutoff));

    // Adaptive cutoff based on velocity
    const cutoff = this.config.minCutoff + this.config.beta * Math.abs(edx);
    
    return this.x.filter(value, this.alpha(dt, cutoff));
  }

  private alpha(dt: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }
}
```

#### Option B: Exponential Moving Average (Simple)

```typescript
// Current implementation - replace with One Euro
const smoothedX = lastX + (rawX - lastX) * smoothingFactor;
const smoothedY = lastY + (rawY - lastY) * smoothingFactor;

// smoothingFactor: 0.3-0.5 typical
```

**Recommendation:** Use One Euro Filter for production quality.

---

### Stage 4: Velocity-Aware Filtering

**Purpose:** Calculate velocity for variable stroke width.

```typescript
interface VelocityConfig {
  windowSize: number;      // Number of points for velocity calculation
  maxVelocity: number;     // Velocity cap for normalization
}

function calculateVelocity(
  points: Point[], 
  currentPoint: Point, 
  timestamp: number
): number {
  if (points.length === 0) return 0;
  
  const lastPoint = points[points.length - 1];
  const distance = Math.hypot(
    currentPoint.x - lastPoint.x,
    currentPoint.y - lastPoint.y
  );
  const timeDelta = Math.max(timestamp - (lastPoint.timestamp ?? timestamp), 1);
  
  return distance / timeDelta * 1000; // Normalized to per-second
}

function velocityToPressure(velocity: number, config: VelocityConfig): number {
  // Slower = thicker (higher pressure)
  // Faster = thinner (lower pressure)
  const normalizedVelocity = Math.min(velocity / config.maxVelocity, 1);
  return Math.max(0.3, 1 - normalizedVelocity * 0.6);
}
```

---

### Stage 5: Stroke Segmentation

**Purpose:** Properly handle pen-up/pen-down transitions.

```typescript
interface StrokeSegmentationConfig {
  jumpThreshold: number;          // Max distance before breaking stroke
  maxFrameGap: number;            // Max frames between points
}

const DEFAULT_CONFIG: StrokeSegmentationConfig = {
  jumpThreshold: 0.1,             // 10% of screen = teleport
  maxFrameGap: 5                  // 5 frames at 60fps = ~83ms
};

enum PenState {
  UP = 'up',
  DOWN = 'down'
}

class StrokeSegmenter {
  private penState: PenState = PenState.UP;
  private lastPoint: Point | null = null;
  private lastFrameTime: number = 0;
  private frameGapCount: number = 0;

  processPoint(point: Point | null, timestamp: number): StrokeEvent {
    // No point = pen up
    if (!point) {
      return this.handlePenUp();
    }

    // Check for teleport (jump too large)
    if (this.lastPoint) {
      const distance = Math.hypot(
        point.x - this.lastPoint.x,
        point.y - this.lastPoint.y
      );
      
      if (distance > this.config.jumpThreshold) {
        // Break stroke, start new one
        this.handlePenUp();
        return this.handlePenDown(point);
      }
    }

    // Normal point
    if (this.penState === PenState.UP) {
      return this.handlePenDown(point);
    } else {
      return this.handleContinue(point);
    }
  }

  private handlePenUp(): StrokeEvent {
    const wasDown = this.penState === PenState.DOWN;
    this.penState = PenState.UP;
    this.lastPoint = null;
    return wasDown ? { type: 'stroke_end' } : { type: 'none' };
  }

  private handlePenDown(point: Point): StrokeEvent {
    this.penState = PenState.DOWN;
    this.lastPoint = point;
    return { type: 'stroke_start', point };
  }

  private handleContinue(point: Point): StrokeEvent {
    this.lastPoint = point;
    return { type: 'stroke_continue', point };
  }
}
```

**Critical Rules:**
| Rule | Description |
|------|-------------|
| **No Teleport Lines** | If jump > threshold, end stroke and start new |
| **Clean Pen-Up** | When tracking lost, end stroke gracefully |
| **No Drawing While Paused** | Pen up = no points added |

---

### Stage 6: Spline Interpolation

**Purpose:** Render smooth curves between points.

```typescript
// Replace straight line segments with curves

// Option A: Quadratic Bezier (simpler)
function renderQuadraticStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  width: number,
  height: number
) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x * width, points[0].y * height);

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2 * width;
    const yc = (points[i].y + points[i + 1].y) / 2 * height;
    ctx.quadraticCurveTo(
      points[i].x * width,
      points[i].y * height,
      xc,
      yc
    );
  }

  // Last segment
  const last = points[points.length - 1];
  ctx.lineTo(last.x * width, last.y * height);
  ctx.stroke();
}

// Option B: Catmull-Rom Spline (smoother)
function catmullRomSpline(
  p0: Point, p1: Point, p2: Point, p3: Point,
  t: number
): Point {
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ),
    y: 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    )
  };
}
```

**Recommendation:** Start with Quadratic Bezier, upgrade to Catmull-Rom if needed.

---

## Acceptance Tests

### Functional Tests

#### Test 1: No Teleport Test
```
Scenario: Hand disappears and reappears in different location
Given: User is drawing a stroke
When: Hand is hidden for 0.3 seconds
And: Hand reappears 30% across the screen
Then: Current stroke ends
And: New stroke begins at new position
And: No connecting line between old and new position
```

#### Test 2: Low Light Confidence Test
```
Scenario: Tracking confidence fluctuates due to poor lighting
Given: User is drawing in suboptimal lighting
When: Tracking confidence drops intermittently
Then: Line does not jitter wildly
And: Line may pause and resume cleanly
And: No random spikes or artifacts
```

#### Test 3: Start-Stop Scribble Test
```
Scenario: Child draws, pauses, draws again
Given: User is in Free Paint mode
When: User moves finger (drawing)
And: User pauses for 1 second
And: User moves finger again
Then: Line does not draw during pause
And: No fat blobs at pause points
And: No accidental marks during stationary period
```

#### Test 4: Fast Movement Test
```
Scenario: User moves finger very quickly
Given: User is drawing
When: User moves finger rapidly across screen
Then: Line remains continuous (no gaps)
And: Line thickness may reduce (velocity response)
And: No dotted appearance
```

#### Test 5: Slow Movement Test
```
Scenario: User moves finger very slowly
Given: User is drawing
When: User moves finger slowly
Then: Line appears thick and controlled
And: No jitter visible
And: Points are not excessively dense
```

### Performance Tests

#### Latency Budget Test
```
Requirement: End-to-end input-to-rendered-stroke under 60ms
Environment: Mid-range laptop (2020 MacBook Air equivalent)

Measurement Method:
1. Record screen at 240fps
2. Mark frame when physical finger moves
3. Mark frame when rendered stroke updates
4. Calculate frame difference × frame time

Pass Criteria: 
- P50 latency < 50ms
- P95 latency < 60ms
- P99 latency < 100ms
```

#### Frame Stability Test
```
Requirement: 30fps minimum sustained
Duration: 5-minute drawing session

Measurement Method:
1. Log requestAnimationFrame timestamps
2. Calculate frame intervals
3. Identify dropped frames (>40ms gaps)

Pass Criteria:
- Average FPS ≥ 55
- Minimum FPS ≥ 30
- Dropped frames < 1%
```

### Visual QA Checklist

| Criteria | Pass | Fail |
|----------|------|------|
| Lines look like felt tip on paper | Smooth, continuous appearance | Dotted, beaded appearance |
| Curves are smooth | No corners unless direction change | Jagged approximations |
| Strokes end cleanly | Crisp endpoint | Tails, spikes, or blobs |
| Consistent thickness | Predictable width | Random variations |
| Glow effects enhance | Soft, pleasant glow | Harsh, distracting |
| No artifacts | Clean canvas | Ghost lines, residue |

---

## Stroke QA Debug Scene

A hidden developer screen for tuning stroke quality.

### Visual Display
```
┌─────────────────────────────────────────────────────────────────┐
│  STROKE QA DEBUG                                    [Exit]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ● Raw Point (red)         ○ Filtered Point (green)           │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │                     CANVAS AREA                         │  │
│   │                                                         │  │
│   │              ●───────○                                  │  │
│   │                      │                                  │  │
│   │                      └─── Offset shows smoothing        │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   METRICS                                                       │
│   ├─ Confidence: 0.87 ████████░░                               │
│   ├─ Velocity:   0.23 ██░░░░░░░░                               │
│   ├─ Pressure:   0.78 ███████░░░                               │
│   ├─ FPS:        58                                            │
│   ├─ Latency:    42ms                                          │
│   └─ Pen State:  DOWN ●                                        │
│                                                                 │
│   EVENTS LOG                                                    │
│   [12:34:56.789] stroke_start                                  │
│   [12:34:57.123] jump_detected (dist: 0.15)                    │
│   [12:34:57.124] stroke_end                                    │
│   [12:34:57.125] stroke_start                                  │
│                                                                 │
│   TUNING                                                        │
│   Min Cutoff:  [1.0]  Beta: [0.007]  Jump Thresh: [0.1]        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Metrics to Display

| Metric | Description | Good Range |
|--------|-------------|------------|
| Confidence | Hand detection confidence | 0.7 - 1.0 |
| Velocity | Finger movement speed | 0.0 - 1.0 normalized |
| Pressure | Calculated from velocity | 0.3 - 1.0 |
| FPS | Current frame rate | 55 - 60 |
| Latency | Input to render time | < 60ms |
| Pen State | UP or DOWN | - |
| Smoothing Delta | Distance between raw and filtered | < 10px |

### Access Method
- Triple-tap in corner, or
- URL parameter `?debug=stroke`, or
- Parent menu → Hidden setting

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Implement confidence gate
- [ ] Implement movement threshold
- [ ] Add pen state machine (up/down)
- [ ] Add jump detection and stroke breaking

### Phase 2: Smoothing
- [ ] Implement One Euro Filter
- [ ] Replace exponential smoothing
- [ ] Tune filter parameters
- [ ] Add velocity calculation

### Phase 3: Rendering
- [ ] Implement quadratic Bezier interpolation
- [ ] Add variable width based on velocity
- [ ] Refine glow rendering
- [ ] Optimize render performance

### Phase 4: Testing
- [ ] Create QA debug scene
- [ ] Run all acceptance tests
- [ ] Visual QA sign-off
- [ ] Performance profiling

---

*Quality strokes are the foundation of user trust. This spec ensures every line drawn feels responsive, intentional, and beautiful.*

