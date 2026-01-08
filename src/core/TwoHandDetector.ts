/**
 * Two-Hand Detection Manager
 * 
 * Detects when two hands are consistently present and manages palette panel state.
 * Requires hand tracker to be initialized with numHands: 2 when flag is enabled.
 */

import { trackingFeatures } from './trackingFeatures';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

export interface TwoHandState {
    /** Whether two hands are detected and stable */
    isActive: boolean;
    /** Position of left hand (for palette anchoring) */
    leftHandPosition: { x: number; y: number } | null;
    /** Position of right hand (for drawing/interaction) */
    rightHandPosition: { x: number; y: number } | null;
}

export class TwoHandDetector {
    private config = trackingFeatures.getTwoHandConfig();
    
    // Detection state
    private twoHandFrames: number = 0;
    private lastDetectionTime: number = 0;
    private leftHandHistory: Array<{ x: number; y: number; timestamp: number }> = [];
    private rightHandHistory: Array<{ x: number; y: number; timestamp: number }> = [];
    
    // Current state
    private currentState: TwoHandState = {
        isActive: false,
        leftHandPosition: null,
        rightHandPosition: null,
    };
    
    /**
     * Process hand detection results and update two-hand state
     */
    process(results: HandLandmarkerResult | null): TwoHandState {
        const flags = trackingFeatures.getFlags();
        
        // Only process if flag is enabled
        if (!flags.enableTwoHandMode) {
            this.reset();
            return this.currentState;
        }
        
        // Check if two hands are detected
        const numHands = results?.landmarks?.length || 0;
        const now = Date.now();
        
        if (numHands >= 2) {
            // Two hands detected
            this.twoHandFrames++;
            
            // Extract hand positions (left is typically x < 0.5, right is x > 0.5)
            const hands = results!.landmarks;
            const leftHand = hands[0].x < 0.5 ? hands[0] : hands[1];
            const rightHand = hands[0].x >= 0.5 ? hands[0] : hands[1];
            
            const leftIndexTip = leftHand[8]; // Index tip landmark
            const rightIndexTip = rightHand[8];
            
            // Add to history for stability checking
            this.leftHandHistory.push({
                x: leftIndexTip.x,
                y: leftIndexTip.y,
                timestamp: now
            });
            this.rightHandHistory.push({
                x: rightIndexTip.x,
                y: rightIndexTip.y,
                timestamp: now
            });
            
            // Keep only recent history (last 500ms)
            const cutoffTime = now - this.config.detectionDurationMs;
            this.leftHandHistory = this.leftHandHistory.filter(h => h.timestamp > cutoffTime);
            this.rightHandHistory = this.rightHandHistory.filter(h => h.timestamp > cutoffTime);
            
            // Check stability (hands must be consistently detected for detectionDurationMs)
            const requiredFrames = (this.config.detectionDurationMs / 16.67); // ~60fps
            const stableFrames = Math.min(this.leftHandHistory.length, this.rightHandHistory.length);
            
            if (stableFrames >= requiredFrames * this.config.stabilityThreshold) {
                // Calculate average positions for stability
                const avgLeftX = this.leftHandHistory.reduce((sum, h) => sum + h.x, 0) / this.leftHandHistory.length;
                const avgLeftY = this.leftHandHistory.reduce((sum, h) => sum + h.y, 0) / this.leftHandHistory.length;
                const avgRightX = this.rightHandHistory.reduce((sum, h) => sum + h.x, 0) / this.rightHandHistory.length;
                const avgRightY = this.rightHandHistory.reduce((sum, h) => sum + h.y, 0) / this.rightHandHistory.length;
                
                // Update state
                this.currentState = {
                    isActive: true,
                    leftHandPosition: { x: avgLeftX, y: avgLeftY },
                    rightHandPosition: { x: avgRightX, y: avgRightY },
                };
            }
        } else {
            // Not enough hands - reset
            this.reset();
        }
        
        return this.currentState;
    }
    
    /**
     * Get current two-hand state
     */
    getState(): TwoHandState {
        return { ...this.currentState };
    }
    
    /**
     * Reset detection state
     */
    reset(): void {
        this.twoHandFrames = 0;
        this.leftHandHistory = [];
        this.rightHandHistory = [];
        this.currentState = {
            isActive: false,
            leftHandPosition: null,
            rightHandPosition: null,
        };
    }
}

// Singleton instance
export const twoHandDetector = new TwoHandDetector();
