/**
 * Unified Interaction State System
 * 
 * PRIORITY A: Global Stability
 * 
 * Single source of truth for all interaction state across all modes.
 * Provides filtered, stable tracking data with confidence gating,
 * jump protection, and pinch detection with hysteresis.
 */

import { OneEuroFilter2D } from './filters/OneEuroFilter';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

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
    
    // Pen state
    penDown: boolean;
    pinchActive: boolean;
    
    // Hand properties
    handScale: number;
    
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
    
    constructor() {
        // One Euro Filter config for smooth, low-latency tracking
        const filterConfig = {
            minCutoff: 1.0,    // Smooth but responsive
            beta: 0.01,        // Low beta for stable tracking
            dCutoff: 1.0
        };
        
        this.filter = new OneEuroFilter2D(filterConfig);
        this.thumbFilter = new OneEuroFilter2D(filterConfig);
    }
    
    /**
     * Process a frame of tracking data and return unified interaction state
     */
    process(
        results: HandLandmarkerResult | null,
        timestamp: number
    ): InteractionState {
        // Extract raw data
        const rawPoint = this.extractIndexTip(results);
        const rawThumbTip = this.extractThumbTip(results);
        const confidence = this.extractConfidence(results);
        const handScale = this.extractHandScale(results);
        const hasHand = rawPoint !== null && confidence >= this.minConfidence;
        
        // Confidence gating: force pen up if confidence drops
        if (!hasHand) {
            this.lowConfidenceFrames++;
            if (this.lowConfidenceFrames >= this.lowConfidenceFramesThreshold) {
                this.currentPenDown = false;
                this.lastFilteredPoint = null;
                this.filter.reset();
                this.thumbFilter.reset();
            }
        } else {
            this.lowConfidenceFrames = 0;
        }
        
        // Filter points with One Euro Filter (only if hand is present)
        let filteredPoint: { x: number; y: number } | null = null;
        let filteredThumbTip: { x: number; y: number } | null = null;
        
        if (hasHand && rawPoint && rawThumbTip) {
            // Apply smoothing
            const filtered = this.filter.filter(rawPoint.x, rawPoint.y, timestamp);
            const filteredThumb = this.thumbFilter.filter(rawThumbTip.x, rawThumbTip.y, timestamp);
            
            filteredPoint = { x: filtered.x, y: filtered.y };
            filteredThumbTip = { x: filteredThumb.x, y: filteredThumb.y };
            
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
            penDown: this.currentPenDown,
            pinchActive,
            handScale,
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

