/**
 * Lightweight Kalman Filter for 2D position prediction
 * 
 * Used for predictive smoothing to reduce perceived latency.
 * Predicts next frame position based on velocity.
 */

export interface KalmanFilterConfig {
    /** Process noise (how much we trust the model). Default: 0.01 */
    processNoise: number;
    /** Measurement noise (how much we trust measurements). Default: 0.1 */
    measurementNoise: number;
    /** Maximum prediction distance in pixels. Default: 50 */
    maxPredictionDistancePx: number;
}

const DEFAULT_CONFIG: KalmanFilterConfig = {
    processNoise: 0.01,
    measurementNoise: 0.1,
    maxPredictionDistancePx: 50,
};

export class KalmanFilter2D {
    private config: KalmanFilterConfig;
    
    // State: [x, y, vx, vy]
    private state: [number, number, number, number] = [0, 0, 0, 0];
    
    // Covariance matrix (4x4, simplified to diagonal for performance)
    private P: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    
    private lastTimestamp: number | null = null;
    private initialized: boolean = false;

    constructor(config: Partial<KalmanFilterConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Update filter with new measurement
     */
    update(x: number, y: number, timestamp: number): void {
        if (!this.initialized) {
            this.state = [x, y, 0, 0];
            this.lastTimestamp = timestamp;
            this.initialized = true;
            return;
        }

        const dt = Math.max((timestamp - this.lastTimestamp!) / 1000, 0.001);
        this.lastTimestamp = timestamp;

        // Predict step
        const [px, py, pvx, pvy] = this.state;
        const predictedX = px + pvx * dt;
        const predictedY = py + pvy * dt;

        // Update covariance (simplified)
        const Q = this.config.processNoise;
        for (let i = 0; i < 16; i++) {
            this.P[i] += Q * dt;
        }

        // Update step (Kalman gain)
        const R = this.config.measurementNoise;
        const Kx = this.P[0] / (this.P[0] + R);
        const Ky = this.P[5] / (this.P[5] + R);

        // Update state
        this.state[0] = predictedX + Kx * (x - predictedX);
        this.state[1] = predictedY + Ky * (y - predictedY);

        // Update velocity (simplified)
        this.state[2] = (this.state[0] - px) / dt;
        this.state[3] = (this.state[1] - py) / dt;

        // Update covariance
        this.P[0] *= (1 - Kx);
        this.P[5] *= (1 - Ky);
    }

    /**
     * Predict position ahead by predictionMs milliseconds
     */
    predict(predictionMs: number, canvasWidth: number, canvasHeight: number): { x: number; y: number } | null {
        if (!this.initialized || this.lastTimestamp === null) {
            return null;
        }

        const dt = predictionMs / 1000;
        const [px, py, vx, vy] = this.state;

        const predictedX = px + vx * dt;
        const predictedY = py + vy * dt;

        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(1, predictedX));
        const clampedY = Math.max(0, Math.min(1, predictedY));

        // Check max prediction distance
        const currentCanvas = {
            x: px * canvasWidth,
            y: py * canvasHeight,
        };
        const predictedCanvas = {
            x: clampedX * canvasWidth,
            y: clampedY * canvasHeight,
        };
        const distancePx = Math.hypot(
            predictedCanvas.x - currentCanvas.x,
            predictedCanvas.y - currentCanvas.y
        );

        if (distancePx > this.config.maxPredictionDistancePx) {
            // Prediction too far, return current position
            return { x: px, y: py };
        }

        return { x: clampedX, y: clampedY };
    }

    /**
     * Get current filtered position
     */
    getPosition(): { x: number; y: number } | null {
        if (!this.initialized) return null;
        return { x: this.state[0], y: this.state[1] };
    }

    /**
     * Get current velocity
     */
    getVelocity(): { vx: number; vy: number } | null {
        if (!this.initialized) return null;
        return { vx: this.state[2], vy: this.state[3] };
    }

    /**
     * Reset filter
     */
    reset(): void {
        this.state = [0, 0, 0, 0];
        this.P = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        this.lastTimestamp = null;
        this.initialized = false;
    }
}
