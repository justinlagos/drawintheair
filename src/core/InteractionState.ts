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

import { OneEuroFilter2D } from './filters/OneEuroFilter';
import type { HandLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { trackingFeatures } from './trackingFeatures';
import { PredictiveSmoothing } from './tracking/PredictiveSmoothing';
import { DepthSensitivity } from './tracking/DepthSensitivity';
import { OcclusionRecovery, type LandmarkData } from './tracking/OcclusionRecovery';

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
    
    // Configuration
    private readonly minConfidence: number = 0.6;
    private readonly lowConfidenceFramesThreshold: number = 3;
    private readonly jumpThreshold: number = 0.06; // 6% of screen
    private readonly pinchDownThreshold: number = 0.35;
    private readonly pinchUpThreshold: number = 0.45;
    
    // State tracking
    private lowConfidenceFrames: number = 0;
    private lastFilteredPoint: { x: number; y: number } | null = null;
    private currentPenDown: boolean = false;
    private canvasWidth: number = 1920;
    private canvasHeight: number = 1080;
    
    constructor() {
        // One Euro Filter config for smooth, low-latency tracking
        const filterConfig = {
            minCutoff: 1.0,    // Smooth but responsive
            beta: 0.01,        // Low beta for stable tracking
            dCutoff: 1.0
        };
        
        this.filter = new OneEuroFilter2D(filterConfig);
        this.thumbFilter = new OneEuroFilter2D(filterConfig);
        
        // Initialize enhanced features if flags are enabled
        this.updateFeatureFlags();
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
        
        // Confidence gating: force pen up if confidence drops
        if (!hasHand) {
            this.lowConfidenceFrames++;
            if (this.lowConfidenceFrames >= this.lowConfidenceFramesThreshold) {
                this.currentPenDown = false;
                this.lastFilteredPoint = null;
                this.filter.reset();
                this.thumbFilter.reset();
                if (this.predictiveSmoothing) {
                    this.predictiveSmoothing.reset();
                }
            }
        } else {
            this.lowConfidenceFrames = 0;
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
            
            // Filter thumb tip (use inferred thumb if occluded, otherwise raw)
            if (thumbToUse) {
                const filteredThumb = this.thumbFilter.filter(thumbToUse.x, thumbToUse.y, timestamp);
                filteredThumbTip = { x: filteredThumb.x, y: filteredThumb.y };
            } else if (rawThumbTip) {
                // Fallback to raw thumb if no inferred thumb available
                const filteredThumb = this.thumbFilter.filter(rawThumbTip.x, rawThumbTip.y, timestamp);
                filteredThumbTip = { x: filteredThumb.x, y: filteredThumb.y };
            }
            
            // Jump protection: break interaction on large movement
            if (this.lastFilteredPoint && this.currentPenDown) {
                const dx = filteredPoint.x - this.lastFilteredPoint.x;
                const dy = filteredPoint.y - this.lastFilteredPoint.y;
                const distance = Math.hypot(dx, dy);
                
                if (distance > this.jumpThreshold) {
                    // Large jump detected - force pen up
                    this.currentPenDown = false;
                    this.lastFilteredPoint = null;
                }
            }
            
            this.lastFilteredPoint = filteredPoint;
        } else {
            // No hand - reset filters
            this.lastFilteredPoint = null;
        }
        
        // Pinch detection with hysteresis
        let pinchActive = false;
        if (hasHand && filteredPoint && filteredThumbTip) {
            const pinchDistance = Math.hypot(
                filteredPoint.x - filteredThumbTip.x,
                filteredPoint.y - filteredThumbTip.y
            );
            
            const threshold = this.lastPinchState
                ? this.pinchUpThreshold * handScale    // Use higher threshold when already pinching (hysteresis)
                : this.pinchDownThreshold * handScale; // Use lower threshold to start pinching
            
            pinchActive = pinchDistance < threshold;
            this.lastPinchState = pinchActive;
        } else {
            this.lastPinchState = false;
        }
        
        // Update pen state based on pinch (only if confidence is good)
        if (hasHand && pinchActive) {
            this.currentPenDown = true;
        } else {
            this.currentPenDown = false;
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

