/**
 * Unified Interaction State System
 * 
 * PRIORITY A: Global Stability
 * 
 * Single source of truth for all interaction state across all modes.
 * Provides filtered, stable tracking data with confidence gating,
 * jump protection, and pinch detection with hysteresis.
 * 
 * Enhanced with optional features:
 * - Predictive smoothing (Stage A: One Euro + Stage B: Kalman)
 * - Depth sensitivity (z-based press signal)
 * - Occlusion recovery (ghost landmarks for pinch stability)
 */

import { OneEuroFilter2D, getFilterProfileForMode, type FilterProfileMode } from './filters/OneEuroFilter';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { trackingFeatures } from './trackingFeatures';
import { PredictiveSmoothing } from './tracking/PredictiveSmoothing';
import { DepthSensitivity } from './tracking/DepthSensitivity';
import { OcclusionRecovery, type LandmarkData } from './tracking/OcclusionRecovery';
import { getTrackingFlag, isDebugModeEnabled } from './flags/TrackingFlags';
import { computePinchState } from './tracking/PinchLogic';

export interface StabilityState {
    isStable: boolean;
    stableDuration: number;
    stablePosition: { x: number; y: number } | null;
    movementMagnitude: number;
    isHovering: boolean;
}

export interface InteractionState {
    // Hand presence
    hasHand: boolean;
    confidence: number;
    
    // Raw points (for reference)
    rawPoint: { x: number; y: number } | null;
    rawThumbTip: { x: number; y: number } | null;
    
    // Filtered points (for use in modes)
    filteredPoint: { x: number; y: number } | null;
    filteredThumbTip: { x: number; y: number } | null;
    
    // Predicted point (for rendering only, not scoring)
    predictedPoint: { x: number; y: number } | null;
    
    // Pen state
    penDown: boolean;
    pinchActive: boolean;
    
    // Hand properties
    handScale: number;
    
    // Depth/press value (0-1, from z coordinate)
    pressValue: number;
    
    // Stability state (Part E)
    stability?: StabilityState;
    
    // Raw MediaPipe results (for compatibility)
    results: HandLandmarkerResult | null;
    
    // Timestamp
    timestamp: number;
}

/**
 * Interaction State Manager
 * 
 * Maintains stable, filtered interaction state with:
 * - One Euro Filter smoothing (low-latency, adaptive)
 * - Confidence gating (force penUp/grabRelease on low confidence)
 * - Hysteresis on pinch detection (prevent flicker)
 * - Jump protection (break strokes/release grabs on large movements)
 */
export class InteractionStateManager {
    private filter: OneEuroFilter2D;
    private thumbFilter: OneEuroFilter2D;
    
    // Enhanced features (behind flags)
    private predictiveSmoothing: PredictiveSmoothing | null = null;
    private depthSensitivity: DepthSensitivity | null = null;
    private occlusionRecovery: OcclusionRecovery | null = null;
    
    // Pinch detection state (hysteresis)
    private lastPinchState: boolean = false;
    
    // Mode-specific filter profiles (Part E)
    private currentMode: FilterProfileMode = 'default';
    
    // Configuration - Optimized for pen-like precision and kid-friendly robustness
    private readonly minConfidence: number = 0.6; // Slightly lower for kids with smaller hands
    private readonly lowConfidenceFramesThreshold: number = 3; // More forgiving dropout detection (legacy, frame-based)
    private readonly jumpThreshold: number = 0.05; // Tighter jump detection (5% of screen)
    private readonly pinchDownThreshold: number = 0.32; // Slightly looser for kids (easier to start)
    private readonly pinchUpThreshold: number = 0.48; // Wider hysteresis gap for stability
    private readonly confidenceHoldWindow: number = 5; // Frames to hold state during confidence dips (legacy)
    
    // Time-based confidence gating (Part E - behind flag)
    private readonly confidenceDropTimeThreshold: number = 100; // ms
    private readonly confidenceHoldDuration: number = 200; // ms
    private readonly confidenceRecoveryGrace: number = 150; // ms
    
    // State tracking
    private lowConfidenceFrames: number = 0;
    private confidenceHoldFrames: number = 0; // Hold pen state during brief confidence dips (legacy)
    private lastFilteredPoint: { x: number; y: number } | null = null;
    private currentPenDown: boolean = false;
    private canvasWidth: number = 1920;
    private canvasHeight: number = 1080;
    
    // Time-based confidence tracking (Part E)
    private confidenceDropStartTime: number | null = null;
    private lastConfidenceValue: number = 1.0;
    private frozenRenderPoint: { x: number; y: number } | null = null; // Frozen point during confidence hold
    
    // Teleport and jitter spike guards (Part E)
    private velocityHistory: Array<{ x: number; y: number; timestamp: number }> = []; // Last 3 points for spike detection
    private lastVelocity: { x: number; y: number } = { x: 0, y: 0 };
    
    // Velocity pinch tolerance (Part E)
    private pinchStateHistory: Array<{ isPinching: boolean; timestamp: number }> = []; // For debounce
    private readonly pinchDebounceTime: number = 50; // ms - require consistent state for 50ms before toggling
    private readonly maxVelocityBoost: number = 0.15; // 15% max boost
    
    // Stability detection (Part E)
    private pointHistory: Array<{ x: number; y: number; timestamp: number }> = []; // Last 15 points for stability
    private readonly stabilityThreshold: number = 0.01; // Normalized movement threshold
    private readonly hoverDuration: number = 500; // ms - time stable before hovering
    
    // Session calibration (Part E)
    private calibrationSamples: Array<{ pinchDistance: number; handScale: number; timestamp: number }> = [];
    private calibrationStartTime: number | null = null;
    private readonly calibrationDuration: number = 5000; // 5 seconds
    private calibratedPinchStartDistance: number | null = null;
    private calibratedPinchEndDistance: number | null = null;
    private readonly minCalibrationSamples: number = 20;
    private readonly calibrationVelocityThreshold: number = 0.5; // Only sample when moving slowly
    
    // Regression logging
    private lastRegressionLogTime: number = 0;
    
    constructor() {
        // One Euro Filter config - Default profile (will be swapped on mode change if flag enabled)
        const filterConfig = getFilterProfileForMode('default');
        
        this.filter = new OneEuroFilter2D(filterConfig);
        this.thumbFilter = new OneEuroFilter2D(filterConfig);
        
        // Initialize enhanced features if flags are enabled
        this.updateFeatureFlags();
    }
    
    /**
     * Set current mode and swap filter profiles (Part E)
     * Only swaps if TrackingFlags.modeFilterProfiles is enabled
     */
    setMode(mode: FilterProfileMode): void {
        const useModeProfiles = getTrackingFlag('modeFilterProfiles');
        
        if (!useModeProfiles) {
            // Flag OFF - do nothing, maintain current behavior
            if (isDebugModeEnabled() || getTrackingFlag('metricsHud')) {
                console.log("[Tracking] Mode set (profiles disabled):", mode);
            }
            return;
        }
        
        if (mode === this.currentMode) {
            // Already in this mode
            return;
        }
        
        // Swap filter instances with mode-specific config
        const profile = getFilterProfileForMode(mode);
        this.filter = new OneEuroFilter2D(profile);
        this.thumbFilter = new OneEuroFilter2D(profile);
        
        // Reset state cleanly to prevent cursor jumps
        this.lastFilteredPoint = null;
        this.lastPinchState = false;
        this.velocityHistory = [];
        this.lastVelocity = { x: 0, y: 0 };
        this.pinchStateHistory = [];
        this.confidenceDropStartTime = null;
        this.frozenRenderPoint = null;
        
        // Don't reset filters here - they're already new instances
        // Don't reset predictiveSmoothing, depthSensitivity, occlusionRecovery - they're mode-agnostic
        
        this.currentMode = mode;
        console.log("[Tracking] Mode set:", mode, "Profile:", profile);
    }
    
    /**
     * Update feature flags and initialize/teardown features accordingly
     */
    private updateFeatureFlags(): void {
        const flags = trackingFeatures.getFlags();
        
        // Predictive smoothing
        if (flags.enablePredictiveSmoothing) {
            if (!this.predictiveSmoothing) {
                const config = trackingFeatures.getPredictiveConfig();
                this.predictiveSmoothing = new PredictiveSmoothing(config);
                this.predictiveSmoothing.setCanvasSize(this.canvasWidth, this.canvasHeight);
            }
        } else {
            this.predictiveSmoothing = null;
        }
        
        // Depth sensitivity
        if (flags.enableDepthSensitivity) {
            if (!this.depthSensitivity) {
                const config = trackingFeatures.getDepthConfig();
                this.depthSensitivity = new DepthSensitivity(config);
            }
        } else {
            this.depthSensitivity = null;
        }
        
        // Occlusion recovery
        if (flags.enableOcclusionRecovery) {
            if (!this.occlusionRecovery) {
                const config = trackingFeatures.getOcclusionConfig();
                this.occlusionRecovery = new OcclusionRecovery(config);
            }
        } else {
            this.occlusionRecovery = null;
        }
    }
    
    /**
     * Set canvas dimensions (for prediction distance calculations)
     */
    setCanvasSize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
        if (this.predictiveSmoothing) {
            this.predictiveSmoothing.setCanvasSize(width, height);
        }
    }
    
    /**
     * Process a frame of tracking data and return unified interaction state
     */
    process(
        results: HandLandmarkerResult | null,
        timestamp: number
    ): InteractionState {
        // Regression check: log once on first process call if all flags are off
        if (this.lastRegressionLogTime === 0) {
            const hasAnyFlags = getTrackingFlag('modeFilterProfiles') ||
                getTrackingFlag('timeBasedConfidence') ||
                getTrackingFlag('velocityPinchTolerance') ||
                getTrackingFlag('stabilityDetection') ||
                getTrackingFlag('visualGuidance') ||
                getTrackingFlag('gradualQualityScaling') ||
                getTrackingFlag('sessionCalibration') ||
                getTrackingFlag('teleportGuard') ||
                getTrackingFlag('jitterSpikeGuard');
            
            if (!hasAnyFlags) {
                console.log("[Regression] All TrackingFlags off, using legacy behavior");
            }
            this.lastRegressionLogTime = timestamp; // Mark as logged
        }
        
        // Update feature flags (in case they changed)
        this.updateFeatureFlags();
        
        // Extract raw data
        const rawPoint = this.extractIndexTip(results);
        const rawThumbTip = this.extractThumbTip(results);
        const confidence = this.extractConfidence(results);
        const handScale = this.extractHandScale(results);
        const hasHand = rawPoint !== null && confidence >= this.minConfidence;
        
        // Extract z coordinate for depth sensitivity
        const indexTipZ = this.extractIndexTipZ(results);
        let pressValue = 0.5; // Default neutral
        
        // Process depth sensitivity if enabled
        if (this.depthSensitivity && indexTipZ !== null) {
            pressValue = this.depthSensitivity.process(indexTipZ, timestamp);
        }
        
        // Extract landmarks for occlusion recovery
        const thumbLandmark = this.extractThumbLandmark(results);
        const indexLandmark = this.extractIndexLandmark(results);
        const wristLandmark = this.extractWristLandmark(results);
        
        // Process occlusion recovery if enabled
        let occlusionState = null;
        let thumbToUse: { x: number; y: number } | null = rawThumbTip;
        if (this.occlusionRecovery && thumbLandmark && indexLandmark && wristLandmark) {
            occlusionState = this.occlusionRecovery.process(
                thumbLandmark,
                indexLandmark,
                wristLandmark,
                timestamp
            );
            
            // Use inferred thumb if occluded
            if (occlusionState.thumbOccluded && occlusionState.inferredThumb) {
                thumbToUse = occlusionState.inferredThumb;
            }
            
            // End stroke on full hand loss
            if (occlusionState.handLost) {
                this.currentPenDown = false;
                this.lastFilteredPoint = null;
                this.filter.reset();
                this.thumbFilter.reset();
                if (this.predictiveSmoothing) {
                    this.predictiveSmoothing.reset();
                }
                // Return early with pen up state
                return {
                    hasHand: false,
                    confidence: 0,
                    rawPoint: null,
                    rawThumbTip: null,
                    filteredPoint: null,
                    filteredThumbTip: null,
                    predictedPoint: null,
                    penDown: false,
                    pinchActive: false,
                    handScale: 0.1,
                    pressValue: 0.5,
                    results: null,
                    timestamp
                };
            }
        }
        
        // Confidence gating: time-based (Part E) or frame-based (legacy)
        const useTimeBasedConfidence = getTrackingFlag('timeBasedConfidence');
        
        if (!hasHand) {
            if (useTimeBasedConfidence) {
                // Time-based confidence gating (Part E)
                const now = timestamp;
                
                // Start tracking drop time if not already
                if (this.confidenceDropStartTime === null) {
                    this.confidenceDropStartTime = now;
                    if (isDebugModeEnabled() || getTrackingFlag('metricsHud')) {
                        console.log("[Confidence] dropStart", { confidence: this.lastConfidenceValue, now });
                    }
                }
                
                const timeSinceDrop = now - this.confidenceDropStartTime;
                
                // If pen was down, use hold window before forcing up
                if (this.currentPenDown && timeSinceDrop < this.confidenceHoldDuration) {
                    // Hold current state during brief confidence dip
                    // Freeze render point to prevent drawing during hold
                    if (this.frozenRenderPoint === null && this.lastFilteredPoint) {
                        this.frozenRenderPoint = { ...this.lastFilteredPoint };
                    }
                    if (isDebugModeEnabled() || getTrackingFlag('metricsHud')) {
                        console.log("[Confidence] holding", { ms: timeSinceDrop });
                    }
                } else if (timeSinceDrop >= this.confidenceDropTimeThreshold) {
                    // Sustained low confidence - force pen up
                    this.currentPenDown = false;
                    this.lastFilteredPoint = null;
                    this.frozenRenderPoint = null;
                    this.filter.reset();
                    this.thumbFilter.reset();
                    if (this.predictiveSmoothing) {
                        this.predictiveSmoothing.reset();
                    }
                    if (isDebugModeEnabled() || getTrackingFlag('metricsHud')) {
                        console.log("[Confidence] forcePenUp", { ms: timeSinceDrop });
                    }
                }
            } else {
                // Legacy frame-based confidence gating (current behavior)
                this.lowConfidenceFrames++;
                
                // If pen was down, use hold window before forcing up
                if (this.currentPenDown && this.lowConfidenceFrames < this.confidenceHoldWindow) {
                    // Hold current state during brief confidence dip
                    this.confidenceHoldFrames++;
                } else if (this.lowConfidenceFrames >= this.lowConfidenceFramesThreshold) {
                    // Sustained low confidence - force pen up
                    this.currentPenDown = false;
                    this.lastFilteredPoint = null;
                    this.filter.reset();
                    this.thumbFilter.reset();
                    if (this.predictiveSmoothing) {
                        this.predictiveSmoothing.reset();
                    }
                    this.confidenceHoldFrames = 0;
                }
            }
        } else {
            // Good confidence - reset tracking
            if (useTimeBasedConfidence) {
                // Check if we're in recovery grace period
                if (this.confidenceDropStartTime !== null) {
                    const timeSinceRecovery = timestamp - this.confidenceDropStartTime;
                    if (timeSinceRecovery < this.confidenceRecoveryGrace) {
                        // Still in grace period, maintain frozen point
                        // (handled below in filteredPoint assignment)
                    } else {
                        // Recovery complete, clear frozen state
                        this.confidenceDropStartTime = null;
                        this.frozenRenderPoint = null;
                    }
                } else {
                    this.confidenceDropStartTime = null;
                    this.frozenRenderPoint = null;
                }
            } else {
                // Legacy frame-based reset
                this.lowConfidenceFrames = 0;
                this.confidenceHoldFrames = 0;
            }
            this.lastConfidenceValue = confidence;
        }
        
        // Filter points with One Euro Filter or Predictive Smoothing
        let filteredPoint: { x: number; y: number } | null = null;
        let filteredThumbTip: { x: number; y: number } | null = null;
        let predictedPoint: { x: number; y: number } | null = null;
        
        if (hasHand && rawPoint) {
            if (this.predictiveSmoothing && rawPoint) {
                // Use predictive smoothing (Stage A + Stage B)
                const smoothingResult = this.predictiveSmoothing.process(
                    rawPoint.x,
                    rawPoint.y,
                    timestamp,
                    confidence
                );
                filteredPoint = smoothingResult.filtered;
                predictedPoint = smoothingResult.predicted;
            } else {
                // Use standard One Euro Filter
                const filtered = this.filter.filter(rawPoint.x, rawPoint.y, timestamp);
                filteredPoint = { x: filtered.x, y: filtered.y };
            }
            
            // Clamp filtered point to [0, 1] — prevents right-side/edge blind spots
            if (filteredPoint) {
                filteredPoint = {
                    x: Math.max(0, Math.min(1, filteredPoint.x)),
                    y: Math.max(0, Math.min(1, filteredPoint.y)),
                };
            }

            // Filter thumb tip (use inferred thumb if occluded, otherwise raw)
            if (thumbToUse) {
                const filteredThumb = this.thumbFilter.filter(thumbToUse.x, thumbToUse.y, timestamp);
                filteredThumbTip = {
                    x: Math.max(0, Math.min(1, filteredThumb.x)),
                    y: Math.max(0, Math.min(1, filteredThumb.y)),
                };
            } else if (rawThumbTip) {
                // Fallback to raw thumb if no inferred thumb available
                const filteredThumb = this.thumbFilter.filter(rawThumbTip.x, rawThumbTip.y, timestamp);
                filteredThumbTip = {
                    x: Math.max(0, Math.min(1, filteredThumb.x)),
                    y: Math.max(0, Math.min(1, filteredThumb.y)),
                };
            }
            
            // Teleport guard and jitter spike guard (Part E)
            const useTeleportGuard = getTrackingFlag('teleportGuard');
            const useJitterSpikeGuard = getTrackingFlag('jitterSpikeGuard');
            
            if (this.lastFilteredPoint) {
                const dx = filteredPoint.x - this.lastFilteredPoint.x;
                const dy = filteredPoint.y - this.lastFilteredPoint.y;
                const distance = Math.hypot(dx, dy);
                
                // Calculate velocity for spike detection
                const lastPoint = this.velocityHistory[this.velocityHistory.length - 1];
                const dt = lastPoint ? (timestamp - lastPoint.timestamp) / 1000 : 0.033; // Default to ~30fps if no history
                const vx = dt > 0 ? dx / dt : 0;
                const vy = dt > 0 ? dy / dt : 0;
                const velocity = Math.hypot(vx, vy);
                
                // Jitter spike guard (Part E)
                if (useJitterSpikeGuard && this.velocityHistory.length >= 2) {
                    const prevVelocity = this.lastVelocity;
                    const prevVelocityMag = Math.hypot(prevVelocity.x, prevVelocity.y);
                    const acceleration = Math.abs(velocity - prevVelocityMag) / Math.max(dt, 0.001);
                    const velocityJump = Math.abs(velocity - prevVelocityMag);
                    
                    // Detect sudden spike (acceleration > threshold OR velocity jump > threshold)
                    const accelerationThreshold = 5.0; // Normalized units per second squared
                    const velocityJumpThreshold = 2.0; // Normalized units per second
                    
                    if (acceleration > accelerationThreshold || velocityJump > velocityJumpThreshold) {
                        // Ignore this frame's point update, keep previous filteredPoint
                        filteredPoint = this.lastFilteredPoint; // Use previous point
                        if (isDebugModeEnabled() || getTrackingFlag('metricsHud')) {
                            console.log("[Guard] jitterSpikeIgnored", { v: velocity.toFixed(3), a: acceleration.toFixed(3) });
                        }
                    } else {
                        // Update velocity history
                        this.velocityHistory.push({ x: filteredPoint.x, y: filteredPoint.y, timestamp });
                        if (this.velocityHistory.length > 3) {
                            this.velocityHistory.shift();
                        }
                        this.lastVelocity = { x: vx, y: vy };
                    }
                } else {
                    // Update velocity history
                    this.velocityHistory.push({ x: filteredPoint.x, y: filteredPoint.y, timestamp });
                    if (this.velocityHistory.length > 3) {
                        this.velocityHistory.shift();
                    }
                    if (dt > 0) {
                        this.lastVelocity = { x: vx, y: vy };
                    }
                }
                
                // Teleport guard (Part E) - replaces legacy jump protection when enabled
                if (useTeleportGuard) {
                    // Check if distance exceeds threshold relative to handScale OR absolute jumpThreshold
                    const relativeThreshold = this.jumpThreshold * (1 + handScale * 2); // Scale with hand size
                    const absoluteThreshold = this.jumpThreshold;
                    const teleportThreshold = Math.max(relativeThreshold, absoluteThreshold);
                    
                    if (distance > teleportThreshold) {
                        // Teleport detected - end current stroke, don't connect
                        this.currentPenDown = false;
                        this.lastFilteredPoint = null;
                        this.velocityHistory = [];
                        this.lastVelocity = { x: 0, y: 0 };
                        if (isDebugModeEnabled() || getTrackingFlag('metricsHud')) {
                            console.log("[Guard] teleportBreak", { dist: distance.toFixed(4), threshold: teleportThreshold.toFixed(4) });
                        }
                        // Don't update lastFilteredPoint, will start fresh on next frame
                        // Return early with pen up state
                        return {
                            hasHand,
                            confidence,
                            rawPoint,
                            rawThumbTip,
                            filteredPoint: null, // No point to render after teleport
                            filteredThumbTip,
                            predictedPoint: null,
                            penDown: false,
                            pinchActive: false,
                            handScale,
                            pressValue,
                            results,
                            timestamp
                        };
                    }
                } else {
                    // Legacy jump protection (current behavior when flag OFF)
                    if (this.currentPenDown && distance > this.jumpThreshold) {
                        // Large jump detected - force pen up
                        this.currentPenDown = false;
                        this.lastFilteredPoint = null;
                    }
                }
            } else {
                // First point or no previous point - initialize velocity history
                this.velocityHistory = [{ x: filteredPoint.x, y: filteredPoint.y, timestamp }];
                this.lastVelocity = { x: 0, y: 0 };
            }
            
            // Use frozen point during confidence hold (time-based only)
            if (useTimeBasedConfidence && this.frozenRenderPoint && this.currentPenDown) {
                // Keep using frozen point during hold window to prevent drawing spikes
                filteredPoint = this.frozenRenderPoint;
            }
            
            this.lastFilteredPoint = filteredPoint;
        } else {
            // No hand - reset filters
            this.lastFilteredPoint = null;
            this.frozenRenderPoint = null;
        }
        
        // Session calibration (Part E - Phase 9)
        const useSessionCalibration = getTrackingFlag('sessionCalibration');
        if (useSessionCalibration && hasHand && filteredPoint && filteredThumbTip) {
            const now = timestamp;
            const velocityMag = Math.hypot(this.lastVelocity.x, this.lastVelocity.y);
            
            // Start calibration on first stable hand detection
            if (this.calibrationStartTime === null && velocityMag < this.calibrationVelocityThreshold) {
                // Check if hand is stable (using stability detection if available)
                const isStable = getTrackingFlag('stabilityDetection') 
                    ? (this.pointHistory.length >= 5 && this.pointHistory.slice(-5).every((p, i, arr) => 
                        i === 0 || Math.hypot(p.x - arr[i-1].x, p.y - arr[i-1].y) < this.stabilityThreshold
                    ))
                    : true; // Assume stable if stability detection not enabled
                
                if (isStable) {
                    this.calibrationStartTime = now;
                    this.calibrationSamples = [];
                }
            }
            
            // Collect samples during calibration window
            if (this.calibrationStartTime !== null) {
                const elapsed = now - this.calibrationStartTime;
                
                if (elapsed < this.calibrationDuration && velocityMag < this.calibrationVelocityThreshold) {
                    // Sample both open hand and pinching states
                    const pinchDistance = Math.hypot(
                        filteredPoint.x - filteredThumbTip.x,
                        filteredPoint.y - filteredThumbTip.y
                    );
                    this.calibrationSamples.push({ pinchDistance, handScale, timestamp: now });
                } else if (elapsed >= this.calibrationDuration && this.calibrationSamples.length >= this.minCalibrationSamples) {
                    // Calibration complete - compute thresholds from percentiles
                    const sortedDistances = this.calibrationSamples
                        .map(s => s.pinchDistance / s.handScale) // Normalize by hand scale
                        .sort((a, b) => a - b);
                    
                    const p20 = sortedDistances[Math.floor(sortedDistances.length * 0.2)];
                    const p60 = sortedDistances[Math.floor(sortedDistances.length * 0.6)];
                    
                    // Clamp to safe bounds (0.2 to 0.6 normalized)
                    this.calibratedPinchStartDistance = Math.max(0.2, Math.min(0.6, p20));
                    this.calibratedPinchEndDistance = Math.max(0.3, Math.min(0.7, p60));
                    
                    // Ensure end > start
                    if (this.calibratedPinchEndDistance <= this.calibratedPinchStartDistance) {
                        this.calibratedPinchEndDistance = this.calibratedPinchStartDistance + 0.1;
                    }
                    
                    if (isDebugModeEnabled() || getTrackingFlag('metricsHud')) {
                        console.log("[Calib] pinch thresholds", { 
                            start: this.calibratedPinchStartDistance.toFixed(3), 
                            end: this.calibratedPinchEndDistance.toFixed(3),
                            samples: this.calibrationSamples.length 
                        });
                    }
                    
                    this.calibrationStartTime = null; // Mark as complete
                }
            }
        }
        
        // Pinch detection with hysteresis, velocity tolerance, and debounce (Part E)
        const useVelocityPinchTolerance = getTrackingFlag('velocityPinchTolerance');
        let pinchActive = false;
        
        if (hasHand && filteredPoint && filteredThumbTip) {
            // Use calibrated thresholds if available, otherwise use defaults
            const pinchDownThresh = useSessionCalibration && this.calibratedPinchStartDistance !== null
                ? this.calibratedPinchStartDistance
                : this.pinchDownThreshold;
            const pinchUpThresh = useSessionCalibration && this.calibratedPinchEndDistance !== null
                ? this.calibratedPinchEndDistance
                : this.pinchUpThreshold;
            if (useVelocityPinchTolerance) {
                // Use pure function for pinch detection with velocity tolerance
                const velocityMag = Math.hypot(this.lastVelocity.x, this.lastVelocity.y);
                const pinchResult = computePinchState({
                    indexTip: filteredPoint,
                    thumbTip: filteredThumbTip,
                    handScale,
                    lastPinchState: this.lastPinchState,
                    velocity: { x: this.lastVelocity.x, y: this.lastVelocity.y, magnitude: velocityMag },
                    pinchDownThreshold: pinchDownThresh,
                    pinchUpThreshold: pinchUpThresh,
                    maxVelocityBoost: this.maxVelocityBoost
                });
                
                // Add to history for debounce
                this.pinchStateHistory.push({ isPinching: pinchResult.isPinching, timestamp });
                // Keep only recent history (last 200ms)
                const cutoff = timestamp - 200;
                this.pinchStateHistory = this.pinchStateHistory.filter(h => h.timestamp >= cutoff);
                
                // Debounce: require consistent state for pinchDebounceTime
                const recentStates = this.pinchStateHistory.filter(h => h.timestamp >= timestamp - this.pinchDebounceTime);
                if (recentStates.length > 0) {
                    const allSame = recentStates.every(h => h.isPinching === pinchResult.isPinching);
                    if (allSame && recentStates.length >= 2) {
                        // State has been consistent for debounce time
                        pinchActive = pinchResult.isPinching;
                        if (pinchActive !== this.lastPinchState && (isDebugModeEnabled() || getTrackingFlag('metricsHud'))) {
                            console.log("[Pinch] toggle", { 
                                penDown: pinchActive, 
                                pinchDistance: pinchResult.pinchDistance.toFixed(4), 
                                threshold: pinchResult.threshold.toFixed(4), 
                                velocity: velocityMag.toFixed(3),
                                velocityBoost: (pinchResult.velocityBoost * 100).toFixed(1) + '%'
                            });
                        }
                        this.lastPinchState = pinchActive;
                    } else {
                        // Still in debounce period, maintain last state
                        pinchActive = this.lastPinchState;
                    }
                } else {
                    // Not enough history yet, use current state
                    pinchActive = pinchResult.isPinching;
                    this.lastPinchState = pinchActive;
                }
            } else {
                // Legacy pinch detection (current behavior when flag OFF)
                const pinchDistance = Math.hypot(
                    filteredPoint.x - filteredThumbTip.x,
                    filteredPoint.y - filteredThumbTip.y
                );
                
                // Use separate thresholds for start/end with hysteresis (use calibrated if available)
                const pinchStartDistance = pinchDownThresh * handScale;
                const pinchEndDistance = pinchUpThresh * handScale;
                
                // Hysteresis: easier to start, harder to end (prevents flicker)
                if (this.lastPinchState) {
                    // Already pinching - need to open wider to release
                    pinchActive = pinchDistance < pinchEndDistance;
                } else {
                    // Not pinching - easier to start
                    pinchActive = pinchDistance < pinchStartDistance;
                }
                
                this.lastPinchState = pinchActive;
            }
        } else {
            // No hand or missing points - force pinch inactive
            this.lastPinchState = false;
            pinchActive = false;
            this.pinchStateHistory = [];
        }
        
        // Update pen state based on pinch (only if confidence is good and not in hold window)
        // Dropout guard: if tracking lost, stop drawing immediately
        if (!hasHand || !filteredPoint || !filteredThumbTip) {
            // Tracking lost - stop drawing immediately, don't connect to next point
            this.currentPenDown = false;
        } else {
            const inHoldWindow = useTimeBasedConfidence
                ? (this.confidenceDropStartTime !== null && (timestamp - this.confidenceDropStartTime) < this.confidenceHoldDuration)
                : (this.lowConfidenceFrames < this.confidenceHoldWindow);
            
            if (pinchActive && inHoldWindow) {
                // Good tracking and pinching - pen down (or held during confidence dip)
                this.currentPenDown = true;
            } else if (!pinchActive) {
                // Not pinching - pen up
                this.currentPenDown = false;
            }
            // Note: During confidence hold window, maintain current state (handled above)
        }
        
        // Stability detection (Part E)
        const useStabilityDetection = getTrackingFlag('stabilityDetection');
        let stability: StabilityState | undefined = undefined;
        
        if (useStabilityDetection && hasHand && filteredPoint) {
            // Add current point to history
            this.pointHistory.push({ x: filteredPoint.x, y: filteredPoint.y, timestamp });
            // Keep only last 15 points (~500ms at 30fps)
            const cutoff = timestamp - 500;
            this.pointHistory = this.pointHistory.filter(p => p.timestamp >= cutoff);
            
            if (this.pointHistory.length >= 5) {
                // Calculate average movement magnitude
                let totalMovement = 0;
                for (let i = 1; i < this.pointHistory.length; i++) {
                    const dx = this.pointHistory[i].x - this.pointHistory[i - 1].x;
                    const dy = this.pointHistory[i].y - this.pointHistory[i - 1].y;
                    totalMovement += Math.hypot(dx, dy);
                }
                const avgMovement = totalMovement / (this.pointHistory.length - 1);
                
                // Check if stable (movement below threshold)
                const isStable = avgMovement < this.stabilityThreshold;
                const stablePosition = isStable && this.pointHistory.length > 0
                    ? { x: this.pointHistory[this.pointHistory.length - 1].x, y: this.pointHistory[this.pointHistory.length - 1].y }
                    : null;
                
                // Calculate stable duration
                let stableDuration = 0;
                if (isStable) {
                    // Find when stability started
                    for (let i = this.pointHistory.length - 1; i > 0; i--) {
                        const dx = this.pointHistory[i].x - this.pointHistory[i - 1].x;
                        const dy = this.pointHistory[i].y - this.pointHistory[i - 1].y;
                        const movement = Math.hypot(dx, dy);
                        if (movement >= this.stabilityThreshold) {
                            // Stability started at this point
                            stableDuration = timestamp - this.pointHistory[i].timestamp;
                            break;
                        }
                    }
                    if (stableDuration === 0) {
                        // Been stable for entire history
                        stableDuration = timestamp - this.pointHistory[0].timestamp;
                    }
                }
                
                const isHovering = isStable && stableDuration >= this.hoverDuration;
                
                stability = {
                    isStable,
                    stableDuration,
                    stablePosition,
                    movementMagnitude: avgMovement,
                    isHovering
                };
                
                if (isHovering && !this.pointHistory.some(p => p.timestamp < timestamp - 100)) {
                    // Log hover start (throttle to once per 100ms)
                    if (isDebugModeEnabled() || getTrackingFlag('metricsHud')) {
                        console.log("[Stability] hovering", { ms: stableDuration, pos: stablePosition });
                    }
                }
            }
        } else if (!hasHand) {
            // Clear history when hand is lost
            this.pointHistory = [];
        }
        
        return {
            hasHand,
            confidence,
            rawPoint,
            rawThumbTip,
            filteredPoint,
            filteredThumbTip,
            predictedPoint,
            penDown: this.currentPenDown,
            pinchActive,
            handScale,
            pressValue,
            stability,
            results,
            timestamp
        };
    }
    
    /**
     * Reset all state (call when switching modes)
     */
    reset(): void {
        this.filter.reset();
        this.thumbFilter.reset();
        if (this.predictiveSmoothing) {
            this.predictiveSmoothing.reset();
        }
        if (this.depthSensitivity) {
            this.depthSensitivity.reset();
        }
        if (this.occlusionRecovery) {
            this.occlusionRecovery.reset();
        }
        this.lastPinchState = false;
        this.lowConfidenceFrames = 0;
        this.confidenceHoldFrames = 0;
        this.confidenceDropStartTime = null;
        this.frozenRenderPoint = null;
        this.velocityHistory = [];
        this.lastVelocity = { x: 0, y: 0 };
        this.pinchStateHistory = [];
        this.pointHistory = [];
        this.calibrationSamples = [];
        this.calibrationStartTime = null;
        this.calibratedPinchStartDistance = null;
        this.calibratedPinchEndDistance = null;
        this.lastFilteredPoint = null;
        this.currentPenDown = false;
    }
    
    private extractIndexTip(results: HandLandmarkerResult | null): { x: number; y: number } | null {
        if (!results?.landmarks?.[0]) return null;
        const hand = results.landmarks[0];
        if (hand.length < 9) return null;
        const indexTip = hand[8];
        return { x: indexTip.x, y: indexTip.y };
    }
    
    private extractThumbTip(results: HandLandmarkerResult | null): { x: number; y: number } | null {
        if (!results?.landmarks?.[0]) return null;
        const hand = results.landmarks[0];
        if (hand.length < 5) return null;
        const thumbTip = hand[4];
        return { x: thumbTip.x, y: thumbTip.y };
    }
    
    private extractIndexTipZ(results: HandLandmarkerResult | null): number | null {
        if (!results?.worldLandmarks?.[0]) return null;
        const hand = results.worldLandmarks[0];
        if (hand.length < 9) return null;
        const indexTip = hand[8];
        return indexTip.z;
    }
    
    private extractThumbLandmark(results: HandLandmarkerResult | null): LandmarkData | null {
        if (!results?.landmarks?.[0] || !results?.worldLandmarks?.[0]) return null;
        const hand = results.landmarks[0];
        const worldHand = results.worldLandmarks[0];
        if (hand.length < 5 || worldHand.length < 5) return null;
        const thumbTip = hand[4];
        // Use visibility as confidence proxy (MediaPipe doesn't provide per-landmark confidence)
        const confidence = thumbTip.visibility || 0.5;
        return {
            position: { x: thumbTip.x, y: thumbTip.y },
            confidence,
            timestamp: Date.now(),
        };
    }
    
    private extractIndexLandmark(results: HandLandmarkerResult | null): LandmarkData | null {
        if (!results?.landmarks?.[0] || !results?.worldLandmarks?.[0]) return null;
        const hand = results.landmarks[0];
        const worldHand = results.worldLandmarks[0];
        if (hand.length < 9 || worldHand.length < 9) return null;
        const indexTip = hand[8];
        const confidence = indexTip.visibility || 0.5;
        return {
            position: { x: indexTip.x, y: indexTip.y },
            confidence,
            timestamp: Date.now(),
        };
    }
    
    private extractWristLandmark(results: HandLandmarkerResult | null): LandmarkData | null {
        if (!results?.landmarks?.[0] || !results?.worldLandmarks?.[0]) return null;
        const hand = results.landmarks[0];
        const worldHand = results.worldLandmarks[0];
        if (hand.length < 1 || worldHand.length < 1) return null;
        const wrist = hand[0];
        const confidence = wrist.visibility || 0.5;
        return {
            position: { x: wrist.x, y: wrist.y },
            confidence,
            timestamp: Date.now(),
        };
    }
    
    private extractConfidence(results: HandLandmarkerResult | null): number {
        if (!results?.handedness?.[0]?.[0]) return 0;
        return results.handedness[0][0].score ?? 0;
    }
    
    private extractHandScale(results: HandLandmarkerResult | null): number {
        if (!results?.landmarks?.[0]) return 0.1;
        const hand = results.landmarks[0];
        if (hand.length < 10) return 0.1;
        
        const wrist = hand[0];
        const middleMCP = hand[9];
        const dist = Math.hypot(middleMCP.x - wrist.x, middleMCP.y - wrist.y);
        return Math.max(0.05, Math.min(0.2, dist));
    }
}

// Singleton instance
export const interactionStateManager = new InteractionStateManager();

