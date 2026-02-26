# Performance Guardrails

## Core Rules

These rules protect against performance regressions and hidden costs in the hot path.

### Rule 1: No setState() in Hot Paths

**Definition of hot path**: Any function called per frame or multiple times per second:
- `onFrame()` callback
- `requestAnimationFrame()` loop
- Game update loop
- Render functions

**Problem**: `setState()` in React triggers re-render. In hot paths, this batches updates and causes frame jank.

**Examples of violations**:

```typescript
// BAD: setState in render loop
const TrackingLayer = () => {
  const [frameCount, setFrameCount] = useState(0);

  useEffect(() => {
    const animate = () => {
      setFrameCount(prev => prev + 1);  // ❌ WRONG
      requestAnimationFrame(animate);
    };
    animate();
  }, []);
};

// GOOD: Use ref instead
const TrackingLayer = () => {
  const frameCount = useRef(0);

  useEffect(() => {
    const animate = () => {
      frameCount.current++;  // ✓ No re-render
      requestAnimationFrame(animate);
    };
    animate();
  }, []);
};
```

**Rule enforcement**: Code review must catch any `setState` in hot paths.

### Rule 2: No Object Allocation in Frame Loops

**Definition**: Creating new objects with `{}` or `new` in any frame-level loop.

**Problem**: Garbage collection pauses frame, causes stutter.

**Examples of violations**:

```typescript
// BAD: Creating object per frame
onFrame() {
  const point = { x: hand.x, y: hand.y };  // ❌ New object
  processPoint(point);
}

// BAD: Creating array per frame
onFrame() {
  const points = [...landmarks];  // ❌ Spread creates new array
  filter(points);
}

// GOOD: Reuse allocated object
const point = { x: 0, y: 0 };  // Allocate once
onFrame() {
  point.x = hand.x;
  point.y = hand.y;  // Mutate existing
  processPoint(point);
}

// GOOD: Use typed array (fixed allocation)
const points = new Float32Array(landmarkCount * 2);  // Allocate once
onFrame() {
  // Fill existing array
  for (let i = 0; i < landmarkCount; i++) {
    points[i * 2] = landmarks[i].x;
    points[i * 2 + 1] = landmarks[i].y;
  }
}
```

**Rule enforcement**: Code review + linter rule (no `{}` literals in hot paths).

### Rule 3: No DOM Queries in Render Loop

**Definition**: Calling `document.querySelector()`, `getElementById()`, etc. in frame loop.

**Problem**: DOM queries trigger layout recalculation (reflow), expensive operation.

**Examples of violations**:

```typescript
// BAD: DOM query in render loop
onFrame() {
  const canvas = document.querySelector('canvas');  // ❌ Query per frame
  const ctx = canvas.getContext('2d');
  ctx.drawImage(...);
}

// GOOD: Query once, cache result
const canvas = useRef(document.querySelector('canvas'));
onFrame() {
  const ctx = canvas.current.getContext('2d');  // Use cached ref
  ctx.drawImage(...);
}
```

**Rule enforcement**: Code review + linter (warn on DOM queries in loops).

---

## Dev Warnings

Automatic runtime checks to catch performance issues during development.

### Warning 1: Frame Time > 20ms

Log warning if any single frame takes longer than 20ms (leaving headroom for 60fps).

```typescript
// In TrackingLayer.tsx onFrame callback
const frameStartTime = performance.now();

// ... detection, logic, render ...

const frameTime = performance.now() - frameStartTime;
if (frameTime > 20) {
  console.warn(`Slow frame detected: ${frameTime.toFixed(1)}ms`, {
    detection: detectTime,
    render: renderTime,
    mode: currentMode
  });
}
```

**Threshold tuning**:
- Desktop: 10ms (60fps strict)
- Tablet: 15ms (60fps, allow some variance)
- Mobile: 20ms (30fps acceptable)

**Output format**:
```
⚠️ Slow frame: 28.5ms (detection: 24ms, render: 4ms)
```

### Warning 2: Re-render Count > 2/sec in Game Mode

In Free Paint / Bubble Pop / Sort modes, warn if React component re-renders too frequently.

```typescript
const FreePaintMode = () => {
  const renderCount = useRef(0);
  const lastWarningTime = useRef(0);

  // In component body (runs on each render)
  renderCount.current++;

  useEffect(() => {
    const checkRenderRate = () => {
      const now = Date.now();
      const elapsed = now - lastWarningTime.current;

      if (elapsed >= 1000) {  // Every 1 second
        const rps = renderCount.current;  // Renders per second
        if (rps > 2) {
          console.warn(`High re-render rate: ${rps}/sec (expected 0-1)`);
        }
        renderCount.current = 0;
        lastWarningTime.current = now;
      }
    };

    const interval = setInterval(checkRenderRate, 500);
    return () => clearInterval(interval);
  }, []);

  // ... render component
};
```

**Expected behavior**:
- Mode loading: 1 re-render
- Game loop: 0 re-renders (RAF, not setState)
- Mode switch: 1 re-render

**If warning triggers**: Check for setState in useEffect or game loop.

---

## Hot Paths Identified

These functions are called frequently and must stay fast.

| Function | File | Call Frequency | Budget | Notes |
|----------|------|-----------------|--------|-------|
| **onFrame** | TrackingLayer.tsx | 60/sec | <20ms | Entire frame |
| **detectHand** | TrackingLayer.tsx | 60/sec | <30ms | MediaPipe inference |
| **interactionState.process()** | InteractionState.ts | 60/sec | <2ms | Filter + pinch detection |
| **drawingEngine.render()** | drawingEngine.ts | 60/sec | <8ms | Canvas render |
| **FreePaintMode.update()** | FreePaintMode.tsx | 60/sec | <1ms | Mode logic |
| **drawingEngine.processPoint()** | drawingEngine.ts | 60/sec | <1ms | Point insertion |
| **OneEuroFilter.filter()** | OneEuroFilter.ts | 60-120/sec | <0.5ms | Per point |
| **distance()** | utils.ts | 60-1000/sec | <0.1ms | Per landmark pair |
| **pointInRect()** | utils.ts | 60-1000/sec | <0.1ms | Per collision check |

**Note**: These budgets assume ~20 concurrent calls (strokes × operations).

---

## PR Checklist

Before approving PRs that touch hot paths, verify:

### Checklist Item 1: No useState in onFrame or RAF Loop

Search PR diff for patterns:

```javascript
setState(
useCallback(
setterFunction(
```

Within:
- `onFrame()`
- `requestAnimationFrame()`
- Game update loops
- Render functions (canvas)

**Action**: If found, request changes.

### Checklist Item 2: No New {} in Frame Loops

Search PR diff for:

```javascript
const obj = {
const arr = [...]
const copy = {...obj}
[...arr]  // Spread
new Map()
new Set()
```

Within hot paths. Exceptions:
- Initialization (outside loop)
- Typed arrays (`new Float32Array()` OK)
- One-time allocations

**Action**: If found outside of initialization, request changes.

### Checklist Item 3: No DOM Queries in Render / Game Loop

Search PR diff for:

```javascript
document.querySelector
getElementById
getElementsByClassName
document.body
```

Within hot paths. Acceptable patterns:
- Ref access (`ref.current`)
- useRef assignment
- Canvas context caching

**Action**: If found in loop, request changes.

### Checklist Item 4: Performance Metrics Logged

If PR adds new hot path code, verify:
- [ ] Timing instrumentation added (`performance.now()`)
- [ ] Slow frame warning added
- [ ] Dev console can display metrics

**Action**: If metrics missing, request addition.

### Checklist Item 5: No Regression in Frame Time

Before merge:
- [ ] PR author ran local perf test
- [ ] Reported frame time before/after
- [ ] If regression: explain why and mitigation

**Template**:
```
Frame time (10 frames avg):
Before: 18.2ms
After: 19.1ms
Δ: +0.9ms (acceptable, within noise)
```

---

## Debugging Guide

If frame time is slow, follow this checklist:

### Step 1: Identify Which Part Is Slow

```typescript
const t0 = performance.now();
const landmarks = await detectHand();
const t1 = performance.now();
const state = interactionState.process(landmarks);
const t2 = performance.now();
drawingEngine.render(ctx);
const t3 = performance.now();

console.log(`
  Detection: ${(t1 - t0).toFixed(1)}ms
  State: ${(t2 - t1).toFixed(1)}ms
  Render: ${(t3 - t2).toFixed(1)}ms
  Total: ${(t3 - t0).toFixed(1)}ms
`);
```

### Step 2: Profile on Target Device

Use DevTools Performance tab (Chrome/Safari):
1. Open DevTools
2. Go to Performance tab
3. Press Record
4. Interact with app for 10 seconds
5. Stop recording
6. Analyze timeline:
   - Long frames (red) = <16ms threshold violated
   - Layout shifts = DOM reflow
   - Script time = CPU-bound work

### Step 3: Check for Common Issues

**Issue: Detection time spiking**
- Check MediaPipe model loaded
- Check gesture complexity (hand landmarks)
- Verify not running multiple detections in parallel

**Issue: Render time spiking**
- Check stroke count (more strokes = longer render)
- Check canvas size (larger = more pixels)
- Check glow enabled on low device

**Issue: Memory growing**
- Check for object allocations in loop
- Check for array spread/slice in loop
- Use DevTools Memory profiler, take snapshots, compare

### Step 4: Apply Fix and Re-measure

After fix:
```typescript
console.time('frame');
// ... frame code
console.timeEnd('frame');  // Logs elapsed ms
```

Run 60+ frames, average should be stable.

---

## Monitoring in Production

Add metrics collection for real-world perf data:

```typescript
const perf = {
  frameTime: [],
  detectionTime: [],
  renderTime: []
};

onFrame() {
  const t0 = performance.now();
  // ... frame code
  const frameTime = performance.now() - t0;

  perf.frameTime.push(frameTime);

  // Every 1 second, log stats
  if (perf.frameTime.length >= 60) {
    const avg = perf.frameTime.reduce((a, b) => a + b) / perf.frameTime.length;
    const max = Math.max(...perf.frameTime);
    const p95 = perf.frameTime.sort()[Math.floor(perf.frameTime.length * 0.95)];

    console.log(`Frame stats: avg=${avg.toFixed(1)}ms p95=${p95.toFixed(1)}ms max=${max.toFixed(1)}ms`);

    perf.frameTime = [];
  }
}
```

Send metrics to analytics backend for monitoring.

---

## Implementation Checklist

- [ ] Add frame time warning (> 20ms) in TrackingLayer
- [ ] Add re-render rate warning (> 2/sec) in game modes
- [ ] Document hot paths identified table
- [ ] Add PR review checklist to CONTRIBUTING.md
- [ ] Create linter rule for setState in callbacks
- [ ] Create linter rule for object allocation in loops
- [ ] Add performance debug dashboard (?debug=perf URL param)
- [ ] Set up metrics logging to analytics backend
- [ ] Monitor frame time on production (if possible)
