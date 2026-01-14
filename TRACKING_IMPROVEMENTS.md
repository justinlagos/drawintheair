# Tracking Improvements - Part D

## Overview
This document explains the tracking reliability improvements, pinch detection enhancements, and adaptive quality system implemented in Part D.

## Pinch Detection Robustness

### Hysteresis Thresholds
The pinch detection uses two separate thresholds with hysteresis to prevent flickering:

- **pinchStartDistance**: `0.32 * handScale` - Threshold to start drawing (easier for kids)
- **pinchEndDistance**: `0.48 * handScale` - Threshold to stop drawing (wider gap for stability)

The wider gap between start and end thresholds prevents accidental toggling when hands are near the threshold boundary, making it more forgiving for children with smaller hands.

### Confidence Gating
- **minConfidence**: `0.6` - Minimum confidence to consider hand present (slightly lower for kids)
- **lowConfidenceFramesThreshold**: `3` frames - Frames below confidence before triggering pen up
- **confidenceHoldWindow**: `5` frames - Hold pen state during brief confidence dips

When confidence dips below threshold, the system freezes pen state for a short hold window instead of immediately stopping drawing. This prevents accidental stroke breaks during brief tracking loss.

### Dropout Guard
If tracking is completely lost (no hand detected), drawing stops immediately and does not connect the last point to the next reacquired point. This prevents stray lines when tracking drops.

### Debounce
State changes are debounced to prevent accidental toggles. The system requires consistent pinch state for multiple frames before changing pen state.

## Input Smoothing

### One Euro Filter Tuning
The One Euro Filter is tuned for a sharp, anchored feel without lag:

- **minCutoff**: `2.0` - Less smoothing = sharper, more responsive feel
- **beta**: `0.01` - Slightly increased for more adaptive response to speed changes
- **dCutoff**: `1.0` - Derivative cutoff for velocity smoothing

This configuration provides fast response while maintaining stability, avoiding the laggy feel of over-smoothing.

## Adaptive Quality System

### Performance Tiers
The system automatically detects device capabilities and applies appropriate quality settings:

- **Low Tier**: 
  - Detection FPS: 20 (increased from 15)
  - Camera: 640x480
  - Visual quality: Low
  - Particles: 15 (reduced)
  - Glow passes: 1

- **Medium Tier**:
  - Detection FPS: 30 (increased from 24)
  - Camera: 960x540
  - Visual quality: High
  - Particles: 25
  - Glow passes: 2

- **High Tier**:
  - Detection FPS: 30
  - Camera: 1280x720
  - Visual quality: High
  - Particles: 50
  - Glow passes: 3

### Runtime Adaptation
The DynamicResolution system monitors performance and adapts quality:

- **Scale Down**: When FPS drops below threshold or latency exceeds threshold for sustained period (2 seconds)
- **Scale Up**: When FPS is stable above threshold and latency is low for extended period (4 seconds minimum)
- **Hysteresis**: 2 second minimum between scale changes to prevent oscillation

The system does not restart the camera when scaling - it only adjusts detection resolution if MediaPipe supports it in the future.

## Kid-Friendly Framing Guidance

When hands are detected too close to camera edges (within 15% of screen edges), a subtle guidance message appears:

- "Move hands to the centre" - When hands are too close to left/right edges
- "Step back a little" - When hands are too close to top/bottom edges

The guidance has a 2-second cooldown to prevent spamming and automatically clears when hands move to center.

## Camera Constraints

### Frame Rate Optimization
Camera frame rate is optimized based on performance tier:

- **Low Tier**: 20-30 FPS
- **Medium Tier**: 24-60 FPS (ideal 30)
- **High Tier**: 30-60 FPS (ideal 60)

### Aspect Ratio Stability
Camera constraints include aspect ratio matching to ensure stable framing and prevent distortion.

## Mobile Responsiveness

All CSS uses responsive design with:
- Media queries for mobile, tablet, and desktop
- Clamp() for fluid font sizing
- Safe padding and touch targets (minimum 44px)
- No hardcoded widths that break on small screens
- Proper overflow handling

## Testing Checklist

- [ ] Mobile Safari (iOS)
- [ ] Android Chrome
- [ ] Laptop Chrome
- [ ] Low tier throttling simulation (Chrome DevTools Performance tab)
