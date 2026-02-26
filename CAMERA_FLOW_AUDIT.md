# Camera Flow Audit

## Current Flow

**useWebcam.ts** orchestrates camera initialization:

1. Call `navigator.mediaDevices.getUserMedia(constraints)`
2. Constraints derived from perf tier: resolution and frame rate
3. On success: attach stream to `<video>` element, set `onloadedmetadata` callback
4. On error: display generic error message

**Perf tier constraints** passed from TrackingLayer:
```
Desktop: { video: { width: 1280, height: 720, frameRate: 60 } }
Tablet:  { video: { width: 960, height: 540, frameRate: 30 } }
Mobile:  { video: { width: 640, height: 480, frameRate: 30 } }
```

## Failure Modes

All failures currently show the same generic error. No distinction or recovery path.

| Failure Mode | Root Cause | Current UX | Impact |
|--------------|-----------|-----------|--------|
| **Permission denied** | User rejects camera permission prompt | Generic "Camera error" | No retry, user stuck |
| **No camera device** | Device has no camera or camera disabled in OS | Generic "Camera error" | Misleading (sounds like permission) |
| **Device busy** | Another app holding camera (e.g., video call) | Generic "Camera error" | User doesn't know to close other app |
| **Insecure context** | HTTP (not HTTPS) + getUserMedia | Fails silently or shows generic error | User has no clue it's a security block |
| **Constraints unsatisfiable** | Browser can't meet resolution/fps request | Falls back to available stream OR fails | No fallback, app breaks on some devices |

## Improved Flow

### Step 1: Detect Insecure Context Upfront
```typescript
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  showError('This app requires HTTPS. Please use a secure connection.');
  return;
}
```

### Step 2: Try Ideal Constraints First
```typescript
const constraints = {
  video: {
    width: { ideal: idealWidth },
    height: { ideal: idealHeight },
    frameRate: { ideal: idealFps }
  }
};
```
Using `{ ideal: ... }` allows fallback instead of hard failure.

### Step 3: Fallback to Relaxed Constraints
If ideal constraints fail:
```typescript
// First fallback: no resolution/fps constraints
const relaxedConstraints = { video: true };
try {
  stream = await navigator.mediaDevices.getUserMedia(relaxedConstraints);
} catch (e) {
  // Next fallback: no constraints at all
  showError(getErrorMessage(e));
}
```

### Step 4: Clear Error Messages Per Failure Type

Detect error type and show specific message:

| Error Name | Message | Action |
|------------|---------|--------|
| `NotAllowedError` | "Camera permission denied. Please allow camera access in your browser settings." | [Settings] [Retry] |
| `NotFoundError` | "No camera device found. Check that your device has a camera and it's enabled." | [Learn more] |
| `NotReadableError` | "Camera is in use by another app. Close other video apps and try again." | [Retry] |
| `OverconstrainedError` | "Your device can't support the requested camera settings. Using best available." | Auto-fallback, continue |
| (HTTPS block) | "HTTPS required. This app needs a secure connection." | None (user must reload) |

### Step 5: Retry Button for Permission Denied

If permission denied:
- Show message with [Retry] button
- Clicking Retry calls `getUserMedia()` again
- After 3 failed attempts, show [Settings] button with instructions to enable camera in browser settings

### Step 6: Graceful Degradation

If fallback succeeds with lower quality:
```typescript
const actualWidth = video.videoWidth;
const actualHeight = video.videoHeight;
if (actualWidth < idealWidth || actualHeight < idealHeight) {
  logWarning(`Using degraded camera: ${actualWidth}x${actualHeight}`);
  updatePerfTier('low'); // Adjust detection model
}
```

## Device-Specific Defaults

Recommended constraints by device class:

| Device Class | Resolution | FPS | min-fps | Reason |
|--------------|------------|-----|---------|--------|
| **Desktop** | 1280×720 | 60 | 30 | Larger screen, stable power |
| **iPad Pro** | 960×540 | 30 | 24 | High-res display, good thermal |
| **iPad standard** | 960×540 | 30 | 24 | Battery + thermal constraints |
| **Android flagship** | 640×480 | 30 | 24 | Variable thermal, older Android |
| **Android mid-range** | 640×480 | 24 | 15 | Limited GPU, lower baseline |
| **Low-end Android** | 480×360 | 15 | 15 | Minimal hardware |
| **iPhone** | 640×480 | 30 | 24 | Conservative for wide device range |

## Test Checklist

### Scenario 1: Permission Granted (Happy Path)
- [ ] Desktop Chrome: camera stream starts, hand detection works
- [ ] iPad Safari: stream starts, FPS >= 25
- [ ] Android Chrome: stream starts, no crashes
- [ ] Samsung Internet: stream starts

### Scenario 2: Permission Denied (First Attempt)
- [ ] Click "Allow" → camera works
- [ ] Click "Block" → see "Permission denied" message with [Retry] and [Settings] buttons
- [ ] Click [Retry] → permission prompt appears again
- [ ] After 3 denials, [Settings] button shows with instructions

### Scenario 3: No Camera Device
- [ ] Desktop without camera (VM): see "No camera device found"
- [ ] Disable camera in OS settings: see "No camera device found"
- [ ] iPad with camera disabled via restrictions: see clear message

### Scenario 4: Device Busy
- [ ] Open Zoom/Teams video call, then try app: see "Camera in use by another app"
- [ ] After closing call and clicking [Retry]: stream starts

### Scenario 5: Constraints Fallback
- [ ] Old Android device: app automatically uses 480×360 without crashing
- [ ] Browser supporting only lower resolution: fallback succeeds, app notes degradation in logs

### Cross-Browser Matrix

| Scenario | Chrome Desktop | Safari iPad | Chrome Android | Samsung Internet | Safari iPhone |
|----------|---|---|---|---|---|
| Permission granted | ✓ | ✓ | ✓ | ✓ | ✓ |
| Permission denied | ✓ | ✓ | ✓ | ? | ✓ |
| No device | ✓ | ✓ | ? | ? | N/A |
| Device busy | ✓ | ✓ | ? | ? | ? |
| Constraints fallback | ✓ | ✓ | ✓ | ? | ✓ |

**?** = Needs testing on hardware

---

## Implementation Checklist

- [ ] Add HTTPS check upfront in useWebcam.ts
- [ ] Replace hard constraints with ideal constraints
- [ ] Implement fallback chain (ideal → relaxed → no constraints)
- [ ] Add error detection logic (map DOMException names to messages)
- [ ] Implement retry button for NotAllowedError
- [ ] Add [Settings] button with instructions for persistent denial
- [ ] Log actual stream resolution/FPS to perf tier adjuster
- [ ] Test on 5 scenarios × 4 browsers per checklist
- [ ] Document camera setup troubleshooting in Help screen
