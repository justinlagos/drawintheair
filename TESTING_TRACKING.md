# Testing Tracking Improvements

## Quick Start

### 1. Enable Debug Overlay
Add `?debug=tracking` to your URL:
```
http://localhost:5173/?debug=tracking
```

The debug overlay shows:
- Render FPS, Detect FPS, Detection Latency
- Confidence, Pen State, Pinch Distance, Press Value
- Resolution Scale, Raw/Filtered/Predicted Points

**Toggle with ESC key** to show/hide.

---

### 2. Enable Feature Flags via URL

#### Enable Individual Features:
```
?predictive=true      # Predictive smoothing
?depth=true           # Depth sensitivity (press value)
?occlusion=true       # Occlusion recovery
?resolution=true      # Dynamic resolution
```

#### Enable All Features:
```
?enableAll=true&debug=tracking
```

#### Combined Example:
```
http://localhost:5173/?predictive=true&depth=true&debug=tracking
```

---

### 3. Enable via Browser Console

Open browser console (F12) and run:

```javascript
// Enable individual features
trackingFeatures.setFlags({ enablePredictiveSmoothing: true });
trackingFeatures.setFlags({ enableDepthSensitivity: true });
trackingFeatures.setFlags({ enableOcclusionRecovery: true });
trackingFeatures.setFlags({ enableDynamicResolution: true });

// Enable debug overlay
trackingFeatures.setFlags({ showDebugOverlay: true });

// Enable all at once
trackingFeatures.setFlags({
    enablePredictiveSmoothing: true,
    enableDepthSensitivity: true,
    enableOcclusionRecovery: true,
    enableDynamicResolution: true,
    showDebugOverlay: true
});

// Check current flags
trackingFeatures.getFlags();
```

---

## Testing Each Feature

### Predictive Smoothing
**What to test:**
- Cursor feels attached to finger (no lag)
- No overshoot on slow movements
- No wobble on fast movements
- No teleport lines on tracking dropout

**How to test:**
1. Enable: `?predictive=true&debug=tracking`
2. Go to Free Paint mode
3. Move finger slowly - should be smooth
4. Move finger quickly - should follow without overshoot
5. Check debug overlay - "Predicted" point should be slightly ahead of "Filtered"

---

### Depth Sensitivity (Press Value)
**What to test:**
- Free Paint: Brush width increases when hand moves closer (press increases)
- Bubble Pop: Larger pop radius and more particles when pressing
- Sort and Place: Requires 70% press to confirm drop in correct zone

**How to test:**

**Free Paint:**
1. Enable: `?depth=true&debug=tracking`
2. Go to Free Paint mode
3. Move hand closer to camera (press value increases in debug overlay)
4. Draw - brush should get wider and glow more intense

**Bubble Pop:**
1. Enable: `?depth=true&debug=tracking`
2. Go to Bubble Calibration mode
3. Move hand closer to camera while popping bubbles
4. Should see larger pop radius and more particles

**Sort and Place:**
1. Enable: `?depth=true&debug=tracking`
2. Go to Sort and Place mode
3. Grab an object and hover over correct zone
4. Move hand closer (press > 0.7) to confirm drop
5. Without press, object should not place

---

### Occlusion Recovery
**What to test:**
- Pinch doesn't flicker when thumb hides
- No random marks during occlusion
- No diagonal slash lines on reacquire
- Immediate penUp on full hand loss

**How to test:**
1. Enable: `?occlusion=true&debug=tracking`
2. Go to Free Paint mode
3. Start drawing (pinch)
4. Hide thumb behind hand - pinch should stay stable for ~200ms
5. Fully hide hand - should immediately stop drawing
6. Reveal hand - should resume cleanly without artifacts

---

### Dynamic Resolution
**What to test:**
- Tracking stays stable on weaker devices
- Resolution scales down when FPS drops
- No stutter when switching scales

**How to test:**
1. Enable: `?resolution=true&debug=tracking`
2. Check debug overlay - "Resolution Scale" and "Level"
3. On weaker devices, should see scale drop when FPS < 50 or latency > 60ms
4. Note: Actual scaling is limited by MediaPipe API (see code comments)

---

## Testing Checklist

### Acceptance Criteria

**Predictive Smoothing:**
- [ ] Cursor feels attached to finger
- [ ] No overshoot on slow moves
- [ ] No wobble on fast moves
- [ ] No teleport lines on tracking dropout
- [ ] If confidence drops, system ends interaction cleanly

**Depth Sensitivity:**
- [ ] Adds physicality without new learning burden
- [ ] No accidental triggers
- [ ] If press flag off, behavior is unchanged

**Occlusion Recovery:**
- [ ] Pinch does not flicker when thumb hides
- [ ] No random marks during occlusion
- [ ] No diagonal slash lines on reacquire

**Debug Overlay:**
- [ ] No perf cost when debug is off
- [ ] Shows all required metrics
- [ ] Accessible via ?debug=tracking

---

## Recommended Test Devices

1. **Android Tablet** (mid-range) - Primary target
2. **Older Laptop** - Secondary target
3. **High-end Device** - Baseline comparison

---

## Troubleshooting

**Features not working?**
- Check browser console for errors
- Verify flags are enabled: `trackingFeatures.getFlags()`
- Check debug overlay shows metrics

**Performance issues?**
- Disable features one by one to isolate
- Check debug overlay FPS metrics
- Try on different device

**Press value not changing?**
- Ensure depth sensitivity is enabled
- Wait 10 seconds for auto-calibration
- Check debug overlay "Press Value" metric
