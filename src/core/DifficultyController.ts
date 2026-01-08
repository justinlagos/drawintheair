/**
 * Dynamic Difficulty Scaling (DDS) Controller
 * 
 * Adjusts difficulty parameters based on user performance:
 * - Tightens when user succeeds with high accuracy
 * - Eases when user fails repeatedly or struggles
 * - Respects tracking confidence (reduces difficulty when confidence is low)
 * 
 * Outputs: pathTolerance, assistStrength, dwellTime, bubbleSpeed, bubbleSize, spawnRate
 */

import { trackingFeatures } from './trackingFeatures';
import type { DynamicDifficultyConfig } from './trackingFeatures';

export interface DifficultyParams {
    /** Path tolerance multiplier (for tracing) */
    pathTolerance: number;
    /** Assist strength (0-1, for magnetic targets) */
    assistStrength: number;
    /** Dwell time in ms (for bubble calibration) */
    dwellTime: number;
    /** Bubble speed multiplier (for bubble calibration) */
    bubbleSpeed: number;
    /** Bubble size multiplier (for bubble calibration) */
    bubbleSize: number;
    /** Bubble spawn rate multiplier (for bubble calibration) */
    spawnRate: number;
}

export class DifficultyController {
    private config: DynamicDifficultyConfig;
    
    // Performance tracking
    private successCount: number = 0;
    private failureCount: number = 0;
    private recentAccuracies: number[] = [];
    private recentHitRates: number[] = [];
    private offPathSpikes: number = 0;
    private lowConfidenceFrames: number = 0;
    
    // Current difficulty parameters
    private currentToleranceMultiplier: number = 1.0;
    private currentAssistStrength: number = 0.3;
    
    // Bubble-specific parameters (normalized, 1.0 = default)
    private currentBubbleSpeed: number = 1.0;
    private currentBubbleSize: number = 1.0;
    private currentSpawnRate: number = 1.0;
    private currentDwellTime: number = 100; // ms
    
    // Tracking state
    private lastUpdateTime: number = Date.now();
    private readonly updateIntervalMs: number = 1000; // Update every second
    
    constructor() {
        this.config = trackingFeatures.getDynamicDifficultyConfig();
        this.currentAssistStrength = (this.config.minAssistStrength + this.config.maxAssistStrength) / 2;
    }
    
    /**
     * Record a success (high accuracy or hit)
     */
    recordSuccess(accuracy?: number, hitRate?: number): void {
        this.successCount++;
        if (accuracy !== undefined) {
            this.recentAccuracies.push(accuracy);
            // Keep only last 10 accuracies
            if (this.recentAccuracies.length > 10) {
                this.recentAccuracies.shift();
            }
        }
        if (hitRate !== undefined) {
            this.recentHitRates.push(hitRate);
            if (this.recentHitRates.length > 10) {
                this.recentHitRates.shift();
            }
        }
        // Reset failure count on success
        this.failureCount = 0;
    }
    
    /**
     * Record a failure
     */
    recordFailure(): void {
        this.failureCount++;
        this.successCount = 0;
    }
    
    /**
     * Record off-path spike (indicates struggle)
     */
    recordOffPathSpike(): void {
        this.offPathSpikes++;
    }
    
    /**
     * Record low confidence frame (indicates tracking issues)
     */
    recordLowConfidence(): void {
        this.lowConfidenceFrames++;
    }
    
    /**
     * Update difficulty based on performance (call periodically)
     */
    update(confidence: number = 1.0): void {
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateIntervalMs) {
            return;
        }
        this.lastUpdateTime = now;
        
        // Calculate average accuracy/hit rate
        const avgAccuracy = this.recentAccuracies.length > 0
            ? this.recentAccuracies.reduce((a, b) => a + b, 0) / this.recentAccuracies.length
            : 0.5;
        
        const avgHitRate = this.recentHitRates.length > 0
            ? this.recentHitRates.reduce((a, b) => a + b, 0) / this.recentHitRates.length
            : 0.5;
        
        const performanceScore = Math.max(avgAccuracy, avgHitRate);
        
        // Adjust based on performance
        // If high performance and high confidence -> tighten
        if (performanceScore >= this.config.tightenThreshold && confidence >= 0.75) {
            // Tighten tolerance slightly
            this.currentToleranceMultiplier = Math.max(
                this.config.minToleranceMultiplier,
                this.currentToleranceMultiplier - this.config.adjustmentRate
            );
            // Reduce assist slightly
            this.currentAssistStrength = Math.max(
                this.config.minAssistStrength,
                this.currentAssistStrength - this.config.adjustmentRate * 0.5
            );
        }
        
        // If failures or off-path spikes -> ease
        if (this.failureCount >= this.config.failureThreshold || this.offPathSpikes > 3) {
            // Increase tolerance
            this.currentToleranceMultiplier = Math.min(
                this.config.maxToleranceMultiplier,
                this.currentToleranceMultiplier + this.config.adjustmentRate * 2
            );
            // Increase assist
            this.currentAssistStrength = Math.min(
                this.config.maxAssistStrength,
                this.currentAssistStrength + this.config.adjustmentRate
            );
        }
        
        // If low confidence -> ease (don't force failure)
        if (confidence < 0.6) {
            this.currentToleranceMultiplier = Math.min(
                this.config.maxToleranceMultiplier,
                this.currentToleranceMultiplier + this.config.adjustmentRate
            );
            this.currentAssistStrength = Math.min(
                this.config.maxAssistStrength,
                this.currentAssistStrength + this.config.adjustmentRate * 0.5
            );
        }
        
        // Reset counters for next interval
        this.offPathSpikes = 0;
        this.lowConfidenceFrames = 0;
    }
    
    /**
     * Update bubble-specific difficulty
     */
    updateBubbleDifficulty(_score: number, _timeRemaining: number, hits: number, misses: number): void {
        const totalAttempts = hits + misses;
        const hitRate = totalAttempts > 0 ? hits / totalAttempts : 0.5;
        
        // Adjust bubble speed (slower if struggling)
        if (hitRate < 0.4) {
            this.currentBubbleSpeed = Math.max(0.7, this.currentBubbleSpeed - 0.05);
        } else if (hitRate > 0.8) {
            this.currentBubbleSpeed = Math.min(1.3, this.currentBubbleSpeed + 0.02);
        }
        
        // Adjust bubble size (larger if struggling)
        if (hitRate < 0.4) {
            this.currentBubbleSize = Math.min(1.3, this.currentBubbleSize + 0.05);
        } else if (hitRate > 0.8) {
            this.currentBubbleSize = Math.max(0.9, this.currentBubbleSize - 0.02);
        }
        
        // Adjust spawn rate (slower if struggling)
        if (hitRate < 0.4) {
            this.currentSpawnRate = Math.max(0.7, this.currentSpawnRate - 0.05);
        } else if (hitRate > 0.8) {
            this.currentSpawnRate = Math.min(1.2, this.currentSpawnRate + 0.02);
        }
    }
    
    /**
     * Get current difficulty parameters
     */
    getParams(): DifficultyParams {
        return {
            pathTolerance: this.currentToleranceMultiplier,
            assistStrength: this.currentAssistStrength,
            dwellTime: this.currentDwellTime,
            bubbleSpeed: this.currentBubbleSpeed,
            bubbleSize: this.currentBubbleSize,
            spawnRate: this.currentSpawnRate,
        };
    }
    
    /**
     * Reset difficulty to defaults
     */
    reset(): void {
        this.successCount = 0;
        this.failureCount = 0;
        this.recentAccuracies = [];
        this.recentHitRates = [];
        this.offPathSpikes = 0;
        this.lowConfidenceFrames = 0;
        this.currentToleranceMultiplier = 1.0;
        this.currentAssistStrength = (this.config.minAssistStrength + this.config.maxAssistStrength) / 2;
        this.currentBubbleSpeed = 1.0;
        this.currentBubbleSize = 1.0;
        this.currentSpawnRate = 1.0;
        this.currentDwellTime = 100;
    }
}
