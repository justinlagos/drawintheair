# Tracking Improvements - Preview Guide

## What Changed

### New Files Created (7 files)
1. **`src/core/trackingFeatures.ts`** - Feature flag system and configuration
2. **`src/core/filters/KalmanFilter.ts`** - Kalman filter for predictive smoothing
3. **`src/core/tracking/PredictiveSmoothing.ts`** - Two-stage stabilizer (One Euro + Kalman)
4. **`src/core/tracking/DynamicResolution.ts`** - Dynamic resolution scaling manager
5. **`src/core/tracking/DepthSensitivity.ts`** - Z-coordinate based press detection
6. **`src/core/tracking/OcclusionRecovery.ts`** - Ghost landmark logic for pinch stability
7. **`src/components/TrackingDebugOverlay.tsx`** - Debug instrumentation panel

### Modified Files (4 files)
1. **`src/core/InteractionState.ts`** - Integrated all new features
2. **`src/core/drawingEngine.ts`** - Added `getCurrentWidth()` method
3. **`src/features/tracking/TrackingLayer.tsx`** - Added performance metrics and debug overlay
4. **`src/features/modes/freePaintLogic.ts`** - Uses pressValue for brush width variation

## How to Preview Changes

### 1. View Debug Overlay (Easiest Way to See What's Working)

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to the app with debug parameter:
   ```
   http://localhost:5173/?debug=tracking
   ```

3. The debug overlay will show:
   - Render FPS, Detect FPS, Detection Latency
   - Confidence, Pen State, Pinch Distance
   - Press Value (depth sensitivity)
   - Resolution Scale State
   - Raw vs Filtered vs Predicted point positions

### 2. Enable Features for Testing

**All features are OFF by default.** To enable them, add this to your code (e.g., in `App.tsx` or a mode component):

```typescript
import { trackingFeatures } from './core/trackingFeatures';

// Enable predictive smoothing
trackingFeatures.setFlags({ 
  enablePredictiveSmoothing: true 
});

// Or enable all features at once
trackingFeatures.setFlags({
  enablePredictiveSmoothing: true,
  enableDynamicResolution: true,
  enableDepthSensitivity: true,
  enableOcclusionRecovery: true,
});
```

### 3. Test Each Feature Individually

#### Predictive Smoothing
```typescript
trackingFeatures.setFlags({ enablePredictiveSmoothing: true });
// Tune parameters:
trackingFeatures.setPredictiveConfig({
  minCutoff: 0.8,
  beta: 0.01,
  predictionMs: 16, // Predict 16ms ahead
  maxPredictionDistancePx: 50
});
```
**What to look for:** Cursor should feel "tighter" and more attached to finger. Check debug overlay for predicted vs filtered point differences.

#### Depth Sensitivity
```typescript
trackingFeatures.setFlags({ enableDepthSensitivity: true });
```
**What to look for:** Move hand closer/farther from camera. In Free Paint mode, brush width should increase when hand is closer (press value increases). Check debug overlay for press value (0-1).

#### Occlusion Recovery
```typescript
trackingFeatures.setFlags({ enableOcclusionRecovery: true });
```
**What to look for:** Pinch gesture should remain stable when thumb briefly hides behind palm. No flickering of pen state.

#### Dynamic Resolution
```typescript
trackingFeatures.setFlags({ enableDynamicResolution: true });
```
**Note:** Currently tracks metrics but can't fully scale due to MediaPipe API limitation. Check debug overlay for resolution scale state.

### 4. Compare Before/After

**Before (default):**
- All features OFF
- Standard One Euro Filter smoothing
- No prediction
- No depth sensitivity
- No occlusion recovery

**After (with features enabled):**
- Predictive smoothing reduces perceived latency
- Depth sensitivity adds brush width variation
- Occlusion recovery prevents pinch flicker
- Debug overlay shows all metrics

## Quick Test Checklist

- [ ] Open app with `?debug=tracking` - see debug overlay
- [ ] Enable `enablePredictiveSmoothing` - cursor feels tighter
- [ ] Enable `enableDepthSensitivity` - move hand closer/farther, see brush width change
- [ ] Enable `enableOcclusionRecovery` - pinch, hide thumb briefly, should stay stable
- [ ] Check debug overlay shows all metrics updating

## Code Locations

- **Feature flags:** `src/core/trackingFeatures.ts`
- **Main integration:** `src/core/InteractionState.ts`
- **Debug overlay:** `src/components/TrackingDebugOverlay.tsx`
- **Usage example:** `src/features/modes/freePaintLogic.ts` (uses pressValue)

## Next Steps

1. Test on target devices (Android tablet, older laptop)
2. Tune parameters using debug overlay
3. Enable features per mode once verified
4. Monitor performance metrics
