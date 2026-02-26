/**
 * Depth Sensitivity using MediaPipe Z Coordinate
 * 
 * Uses z from index tip landmark to create a "press" signal.
 * Auto-calibrates zNear and zFar during first 10 seconds of use.
 */

import type { DepthSensitivityConfig } from '../trackingFeatures';

export class DepthSensitivity {
    private config: DepthSensitivityConfig;
    private zSamples: number[] = [];
    private calibrationStartTime: number | null = null;
    private isCalibrated: boolean = false;
    private zNear: number = 0;
    private zFar: number = 0;

    constructor(config: DepthSensitivityConfig) {
        this.config = config;
        
        // Use provided values if available
        if (config.zNear !== null && config.zFar !== null) {
            this.zNear = config.zNear;
            this.zFar = config.zFar;
            this.isCalibrated = true;
        }
    }

    /**
     * Process z coordinate and return normalized press value (0-1)
     */
    process(z: number, timestamp: number): number {
        // Start calibration if not started
        if (this.calibrationStartTime === null) {
            this.calibrationStartTime = timestamp;
        }
        
        // Collect samples during calibration period
        if (!this.isCalibrated) {
            this.zSamples.push(z);
            
            const elapsed = timestamp - this.calibrationStartTime;
            const hasEnoughSamples = this.zSamples.length >= this.config.minCalibrationSamples;
            
            if (elapsed >= this.config.calibrationDurationMs && hasEnoughSamples) {
                this.finishCalibration();
            }
        }
        
        // If not calibrated yet, return neutral press
        if (!this.isCalibrated) {
            return 0.5;
        }
        
        // Map z to press value (0 = far/pressed, 1 = near/not pressed)
        // MediaPipe z: negative = closer to camera, positive = farther
        // We want: lower z (more negative) = higher press
        const normalized = this.normalizeZ(z);
        return Math.max(0, Math.min(1, normalized));
    }

    /**
     * Get current press value without processing (for debug)
     */
    getPressValue(z: number): number {
        if (!this.isCalibrated) {
            return 0.5;
        }
        return Math.max(0, Math.min(1, this.normalizeZ(z)));
    }

    /**
     * Check if calibration is complete
     */
    isCalibrationComplete(): boolean {
        return this.isCalibrated;
    }

    /**
     * Get calibration bounds (for debug)
     */
    getCalibrationBounds(): { zNear: number; zFar: number } | null {
        if (!this.isCalibrated) {
            return null;
        }
        return { zNear: this.zNear, zFar: this.zFar };
    }

    /**
     * Reset calibration
     */
    reset(): void {
        this.zSamples = [];
        this.calibrationStartTime = null;
        this.isCalibrated = false;
        
        if (this.config.zNear !== null && this.config.zFar !== null) {
            this.zNear = this.config.zNear;
            this.zFar = this.config.zFar;
            this.isCalibrated = true;
        }
    }

    private finishCalibration(): void {
        if (this.zSamples.length === 0) {
            return;
        }
        
        // Find min (closest) and max (farthest) z values
        // Add some padding for stability
        const minZ = Math.min(...this.zSamples);
        const maxZ = Math.max(...this.zSamples);
        const padding = (maxZ - minZ) * 0.1;
        
        this.zNear = minZ - padding; // Closest (most negative)
        this.zFar = maxZ + padding;   // Farthest (most positive)
        
        this.isCalibrated = true;
        console.log(`[DepthSensitivity] Calibrated: zNear=${this.zNear.toFixed(3)}, zFar=${this.zFar.toFixed(3)}`);
    }

    private normalizeZ(z: number): number {
        // Map z from [zNear, zFar] to [1, 0]
        // Lower z (closer) = higher press value
        if (this.zFar === this.zNear) {
            return 0.5;
        }
        
        const normalized = (z - this.zNear) / (this.zFar - this.zNear);
        // Invert: closer (lower z) = higher press
        return 1 - normalized;
    }
}
