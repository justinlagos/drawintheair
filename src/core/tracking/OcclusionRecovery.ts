/**
 * Occlusion Recovery for Pinch Stability
 * 
 * Implements "ghost landmark" logic for pinch stability:
 * - If thumb tip is occluded but wrist and index remain stable,
 *   infer thumb position using last stable thumb-to-wrist vector
 * - Keep pinch state stable for a grace window (150-250ms)
 * - End stroke on full hand loss
 */

import type { OcclusionRecoveryConfig } from '../trackingFeatures';

export interface LandmarkData {
    position: { x: number; y: number };
    confidence: number;
    timestamp: number;
}

export interface OcclusionState {
    /** Inferred thumb position (if occluded) */
    inferredThumb: { x: number; y: number } | null;
    /** Whether thumb is currently occluded */
    thumbOccluded: boolean;
    /** Whether hand is fully lost */
    handLost: boolean;
}

export class OcclusionRecovery {
    private config: OcclusionRecoveryConfig;
    
    // Last stable positions
    private lastStableThumb: { x: number; y: number } | null = null;
    private lastStableWrist: { x: number; y: number } | null = null;
    private lastStableThumbToWrist: { dx: number; dy: number } | null = null;
    
    // Occlusion tracking
    private thumbOcclusionStartTime: number | null = null;
    private handLossStartTime: number | null = null;

    constructor(config: OcclusionRecoveryConfig) {
        this.config = config;
    }

    /**
     * Process landmarks and return occlusion state
     */
    process(
        thumbTip: LandmarkData | null,
        indexTip: LandmarkData | null,
        wrist: LandmarkData | null,
        timestamp: number
    ): OcclusionState {
        const thumbValid = thumbTip && thumbTip.confidence >= this.config.minLandmarkConfidence;
        const indexValid = indexTip && indexTip.confidence >= this.config.minLandmarkConfidence;
        const wristValid = wrist && wrist.confidence >= this.config.minLandmarkConfidence;
        
        // Check if hand is fully lost
        const handLost = !thumbValid && !indexValid && !wristValid;
        
        if (handLost) {
            if (this.handLossStartTime === null) {
                this.handLossStartTime = timestamp;
            }
            // Reset all state on full hand loss
            this.lastStableThumb = null;
            this.lastStableWrist = null;
            this.lastStableThumbToWrist = null;
            this.thumbOcclusionStartTime = null;
            
            return {
                inferredThumb: null,
                thumbOccluded: false,
                handLost: true,
            };
        } else {
            this.handLossStartTime = null;
        }
        
        // Update stable positions when landmarks are valid
        if (wristValid && wrist) {
            this.lastStableWrist = { ...wrist.position };
        }
        if (thumbValid && thumbTip) {
            this.lastStableThumb = { ...thumbTip.position };
            
            // Update thumb-to-wrist vector if both are valid
            if (this.lastStableWrist) {
                this.lastStableThumbToWrist = {
                    dx: thumbTip.position.x - this.lastStableWrist.x,
                    dy: thumbTip.position.y - this.lastStableWrist.y,
                };
            }
            
            // Thumb is visible, clear occlusion
            this.thumbOcclusionStartTime = null;
        }
        
        // Check if thumb is occluded
        const thumbOccluded = !thumbValid && 
                              indexValid && 
                              wristValid &&
                              this.lastStableThumb !== null &&
                              this.lastStableThumbToWrist !== null;
        
        if (thumbOccluded) {
            if (this.thumbOcclusionStartTime === null) {
                this.thumbOcclusionStartTime = timestamp;
            }
            
            // Check grace window
            const occlusionDuration = timestamp - this.thumbOcclusionStartTime;
            if (occlusionDuration <= this.config.graceWindowMs && this.lastStableWrist && this.lastStableThumbToWrist) {
                // Infer thumb position
                const inferredThumb = {
                    x: this.lastStableWrist.x + this.lastStableThumbToWrist.dx,
                    y: this.lastStableWrist.y + this.lastStableThumbToWrist.dy,
                };
                
                // Validate inference distance
                if (this.lastStableThumb && this.lastStableThumbToWrist) {
                    const inferenceDistance = Math.hypot(
                        inferredThumb.x - this.lastStableThumb.x,
                        inferredThumb.y - this.lastStableThumb.y
                    );
                    
                    if (inferenceDistance <= this.config.maxInferenceDistance) {
                        return {
                            inferredThumb,
                            thumbOccluded: true,
                            handLost: false,
                        };
                    }
                }
            }
        } else {
            this.thumbOcclusionStartTime = null;
        }
        
        return {
            inferredThumb: null,
            thumbOccluded: false,
            handLost: false,
        };
    }

    /**
     * Reset all state
     */
    reset(): void {
        this.lastStableThumb = null;
        this.lastStableWrist = null;
        this.lastStableThumbToWrist = null;
        this.thumbOcclusionStartTime = null;
        this.handLossStartTime = null;
    }
}
