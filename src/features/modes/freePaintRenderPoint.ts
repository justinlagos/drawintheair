/**
 * Render Point Smoothing System
 * 
 * Phase 3: Two-path pointer system
 * - filteredPoint → logic (used for stroke data)
 * - renderPoint → visuals (smoothed, predicted, for cursor display)
 * 
 * Features:
 * - One Euro filter for smooth movement
 * - Velocity prediction 16ms ahead
 * - maxPredictionDistancePx clamp
 * - Confidence gate
 * - Dropout hold 120ms
 * 
 * No teleports. No spikes. No jitter.
 */

import { OneEuroFilter2D } from '../../core/filters/OneEuroFilter';
import { normalizedToCanvas } from '../../core/coordinateUtils';
import type { NormalizedPoint } from '../../core/coordinateUtils';

interface RenderPointConfig {
    minConfidence: number;
    dropoutHoldMs: number;
    predictionTimeMs: number;
    maxPredictionDistancePx: number;
    canvasWidth: number;
    canvasHeight: number;
}

const DEFAULT_CONFIG: RenderPointConfig = {
    minConfidence: 0.6,
    dropoutHoldMs: 120,
    predictionTimeMs: 16, // 16ms ahead (1 frame at 60fps)
    maxPredictionDistancePx: 20, // Max 20px prediction
    canvasWidth: 1920,
    canvasHeight: 1080
};

export class RenderPointSmoother {
    private config: RenderPointConfig;
    private filter: OneEuroFilter2D;
    
    // Velocity tracking for prediction
    private lastPoint: { x: number; y: number; timestamp: number } | null = null;
    private velocity: { vx: number; vy: number } = { vx: 0, vy: 0 };
    
    // Dropout handling
    private lastValidPoint: { x: number; y: number } | null = null;
    private dropoutStartTime: number | null = null;
    
    constructor(config: Partial<RenderPointConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        // One Euro filter tuned for visual smoothness (more aggressive than logic filter)
        this.filter = new OneEuroFilter2D({
            minCutoff: 0.8,  // More smoothing for visuals
            beta: 0.01,      // Less responsive to speed changes
            dCutoff: 1.0
        });
    }
    
    /**
     * Set canvas size for pixel-based calculations
     */
    setCanvasSize(width: number, height: number): void {
        this.config.canvasWidth = width;
        this.config.canvasHeight = height;
    }
    
    /**
     * Process a point and return smoothed render point
     * Returns null if confidence is too low or in dropout period
     */
    process(
        filteredPoint: NormalizedPoint | null,
        confidence: number,
        timestamp: number
    ): { x: number; y: number } | null {
        // Confidence gate
        if (confidence < this.config.minConfidence) {
            // Enter dropout
            if (this.dropoutStartTime === null) {
                this.dropoutStartTime = timestamp;
            }
            
            // Check if we're still in dropout hold period
            const dropoutDuration = timestamp - (this.dropoutStartTime || timestamp);
            if (dropoutDuration < this.config.dropoutHoldMs && this.lastValidPoint) {
                // Still in hold period - return last valid point
                return this.lastValidPoint;
            }
            
            // Dropout period expired - return null
            this.lastValidPoint = null;
            this.lastPoint = null;
            this.velocity = { vx: 0, vy: 0 };
            return null;
        }
        
        // Good confidence - exit dropout
        this.dropoutStartTime = null;
        
        if (!filteredPoint) {
            return null;
        }
        
        // Apply One Euro filter
        const smoothed = this.filter.filter(filteredPoint.x, filteredPoint.y, timestamp);
        
        // Calculate velocity for prediction
        if (this.lastPoint) {
            const dt = Math.max((timestamp - this.lastPoint.timestamp) / 1000, 0.001);
            const dx = smoothed.x - this.lastPoint.x;
            const dy = smoothed.y - this.lastPoint.y;
            
            // Smooth velocity with exponential moving average
            const alpha = 0.3; // Smoothing factor
            this.velocity.vx = alpha * (dx / dt) + (1 - alpha) * this.velocity.vx;
            this.velocity.vy = alpha * (dy / dt) + (1 - alpha) * this.velocity.vy;
        }
        
        // Predict position 16ms ahead
        const predictionTime = this.config.predictionTimeMs / 1000; // Convert to seconds
        let predictedX = smoothed.x + this.velocity.vx * predictionTime;
        let predictedY = smoothed.y + this.velocity.vy * predictionTime;
        
        // Clamp prediction distance
        const currentCanvas = normalizedToCanvas(
            { x: smoothed.x, y: smoothed.y },
            this.config.canvasWidth,
            this.config.canvasHeight
        );
        const predictedCanvas = normalizedToCanvas(
            { x: predictedX, y: predictedY },
            this.config.canvasWidth,
            this.config.canvasHeight
        );
        const predictionDistancePx = Math.hypot(
            predictedCanvas.x - currentCanvas.x,
            predictedCanvas.y - currentCanvas.y
        );
        
        if (predictionDistancePx > this.config.maxPredictionDistancePx) {
            // Clamp to max distance
            const scale = this.config.maxPredictionDistancePx / predictionDistancePx;
            const clampedCanvas = {
                x: currentCanvas.x + (predictedCanvas.x - currentCanvas.x) * scale,
                y: currentCanvas.y + (predictedCanvas.y - currentCanvas.y) * scale
            };
            // Convert back to normalized
            predictedX = clampedCanvas.x / this.config.canvasWidth;
            predictedY = clampedCanvas.y / this.config.canvasHeight;
        }
        
        // Update last point
        this.lastPoint = { x: smoothed.x, y: smoothed.y, timestamp };
        this.lastValidPoint = { x: predictedX, y: predictedY };
        
        return this.lastValidPoint;
    }
    
    /**
     * Reset filter state (call when starting new stroke or mode change)
     */
    reset(): void {
        this.filter.reset();
        this.lastPoint = null;
        this.velocity = { vx: 0, vy: 0 };
        this.lastValidPoint = null;
        this.dropoutStartTime = null;
    }
}
