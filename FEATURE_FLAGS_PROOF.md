# Feature Flags Proof - Complete Documentation

## C. Feature Flag Proof

### All Feature Flags (Default: OFF)

All flags are located in: **`src/core/trackingFeatures.ts`**

#### Flag Definitions

```typescript
export interface TrackingFeatureFlags {
    /** Enable predictive smoothing (Stage A: One Euro + Stage B: Kalman/constant-velocity) */
    enablePredictiveSmoothing: boolean;  // DEFAULT: false
    
    /** Enable dynamic resolution scaling for MediaPipe detection */
    enableDynamicResolution: boolean;    // DEFAULT: false
    
    /** Enable depth sensitivity using z coordinate for "press" signal */
    enableDepthSensitivity: boolean;      // DEFAULT: false
    
    /** Enable occlusion recovery for pinch stability */
    enableOcclusionRecovery: boolean;      // DEFAULT: false
    
    /** Show debug overlay (hidden by default, accessible via ?debug=tracking) */
    showDebugOverlay: boolean;            // DEFAULT: false (auto-enabled if ?debug=tracking)
}
```

### Default Values (All OFF)

```typescript
const DEFAULT_FLAGS: TrackingFeatureFlags = {
    enablePredictiveSmoothing: false,  // ✅ OFF by default
    enableDynamicResolution: false,   // ✅ OFF by default
    enableDepthSensitivity: false,     // ✅ OFF by default
    enableOcclusionRecovery: false,   // ✅ OFF by default
    showDebugOverlay: false,           // ✅ OFF by default
};
```

**Location:** `src/core/trackingFeatures.ts` lines 48-54

### How to Toggle Each Flag

#### Method 1: Programmatically (Recommended)

```typescript
import { trackingFeatures } from './core/trackingFeatures';

// Enable a single flag
trackingFeatures.setFlags({ 
    enablePredictiveSmoothing: true 
});

// Enable multiple flags
trackingFeatures.setFlags({
    enablePredictiveSmoothing: true,
    enableDepthSensitivity: true,
});

// Disable a flag
trackingFeatures.setFlags({ 
    enablePredictiveSmoothing: false 
});

// Check current flags
const flags = trackingFeatures.getFlags();
console.log(flags);
```

#### Method 2: Enable for Specific Mode

```typescript
// In your mode component or App.tsx
trackingFeatures.enableForMode('free'); // Currently a placeholder - customize as needed
```

#### Method 3: Debug Overlay (Automatic)

The `showDebugOverlay` flag is automatically enabled when you add `?debug=tracking` to the URL:
- `http://localhost:5173/?debug=tracking` → Debug overlay appears
- Remove `?debug=tracking` → Debug overlay hidden

### Flag Usage Locations

1. **Feature Flag Manager:** `src/core/trackingFeatures.ts`
   - Lines 48-54: Default flag values
   - Lines 90-95: `getFlags()` method
   - Lines 97-100: `setFlags()` method

2. **InteractionState Integration:** `src/core/InteractionState.ts`
   - Line 163: `updateFeatureFlags()` called on each frame
   - Lines 125-141: Feature initialization based on flags

3. **TrackingLayer Integration:** `src/features/tracking/TrackingLayer.tsx`
   - Line 159: Checks `flags.enableDynamicResolution`
   - Line 177: Checks `flags.showDebugOverlay`

### Verification Commands

```typescript
// In browser console or code:
import { trackingFeatures } from './core/trackingFeatures';

// Verify all flags are OFF by default
console.log('Default flags:', trackingFeatures.getFlags());
// Expected: { enablePredictiveSmoothing: false, enableDynamicResolution: false, ... }

// Enable one flag
trackingFeatures.setFlags({ enablePredictiveSmoothing: true });
console.log('After enabling:', trackingFeatures.getFlags());
// Expected: { enablePredictiveSmoothing: true, enableDynamicResolution: false, ... }
```

### Configuration Objects (Separate from Flags)

Each feature also has a configuration object (separate from the on/off flag):

```typescript
// Predictive Smoothing Config
trackingFeatures.setPredictiveConfig({
    minCutoff: 0.8,
    beta: 0.01,
    dCutoff: 1.0,
    predictionMs: 16,
    maxPredictionDistancePx: 50,
    confidenceGate: 0.6
});

// Dynamic Resolution Config
trackingFeatures.setDynamicResolutionConfig({
    fpsThreshold: 50,
    latencyThresholdMs: 60,
    sustainDurationMs: 500,
    fpsHysteresis: 55,
    resolutionLevels: [[1280, 720], [960, 540], [640, 360]]
});

// Depth Sensitivity Config
trackingFeatures.setDepthConfig({
    zNear: null,  // Auto-calibrated
    zFar: null,   // Auto-calibrated
    calibrationDurationMs: 10000,
    minCalibrationSamples: 100
});

// Occlusion Recovery Config
trackingFeatures.setOcclusionConfig({
    graceWindowMs: 200,
    minLandmarkConfidence: 0.5,
    maxInferenceDistance: 0.1
});
```

### Summary

✅ **All flags default to OFF**  
✅ **Located in:** `src/core/trackingFeatures.ts`  
✅ **Toggle via:** `trackingFeatures.setFlags({ flagName: true/false })`  
✅ **Verify via:** `trackingFeatures.getFlags()`  
✅ **Debug overlay:** Auto-enabled with `?debug=tracking` URL parameter
