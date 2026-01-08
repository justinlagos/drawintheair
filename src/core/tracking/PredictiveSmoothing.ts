/**
 * Predictive Smoothing System
 * 
 * Two-stage stabilizer:
 * - Stage A: One Euro Filter for x and y
 * - Stage B: Kalman filter or constant-velocity predictor
 * 
 * Prediction is only used for rendering cursor and stroke preview,
 * not for scoring or hit tests.
 */

import { OneEuroFilter2D } from '../filters/OneEuroFilter';
import { KalmanFilter2D } from '../filters/KalmanFilter';
import type { PredictiveSmoothingConfig } from '../trackingFeatures';

export interface SmoothingResult {
    /** Filtered position (Stage A: One Euro) */
    filtered: { x: number; y: number };
    /** Predicted position (Stage B: Kalman) for rendering only */
    predicted: { x: number; y: number } | null;
}

export class PredictiveSmoothing {
    private oneEuroFilter: OneEuroFilter2D;
    private kalmanFilter: KalmanFilter2D;
    private config: PredictiveSmoothingConfig;
    private canvasWidth: number = 1920;
    private canvasHeight: number = 1080;

    constructor(config: PredictiveSmoothingConfig) {
        this.config = config;
        
        // Stage A: One Euro Filter
        this.oneEuroFilter = new OneEuroFilter2D({
            minCutoff: config.minCutoff,
            beta: config.beta,
            dCutoff: config.dCutoff,
        });
        
        // Stage B: Kalman Filter
        this.kalmanFilter = new KalmanFilter2D({
            maxPredictionDistancePx: config.maxPredictionDistancePx,
        });
    }

    /**
     * Set canvas dimensions for prediction distance calculations
     */
    setCanvasSize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    /**
     * Process a new point and return filtered + predicted positions
     */
    process(
        x: number,
        y: number,
        timestamp: number,
        confidence: number
    ): SmoothingResult {
        // Stage A: One Euro Filter
        const filtered = this.oneEuroFilter.filter(x, y, timestamp);
        
        // Stage B: Kalman prediction (only if confidence is high enough)
        let predicted: { x: number; y: number } | null = null;
        
        if (confidence >= this.config.confidenceGate) {
            // Update Kalman filter with filtered position
            this.kalmanFilter.update(filtered.x, filtered.y, timestamp);
            
            // Predict ahead
            predicted = this.kalmanFilter.predict(
                this.config.predictionMs,
                this.canvasWidth,
                this.canvasHeight
            );
        } else {
            // Low confidence - reset Kalman filter
            this.kalmanFilter.reset();
        }
        
        return {
            filtered,
            predicted: predicted || filtered, // Fallback to filtered if prediction fails
        };
    }

    /**
     * Reset all filters
     */
    reset(): void {
        this.oneEuroFilter.reset();
        this.kalmanFilter.reset();
    }
}
