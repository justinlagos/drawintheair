/**
 * Dynamic Resolution Scaling for MediaPipe Detection
 * 
 * Monitors FPS and detection latency, and downscales video frames
 * used for hand detection when performance drops.
 * Canvas stays at native resolution.
 */

import type { DynamicResolutionConfig } from '../trackingFeatures';

export interface PerformanceMetrics {
    renderFps: number;
    detectFps: number;
    detectionLatencyMs: number;
}

export class DynamicResolutionManager {
    private config: DynamicResolutionConfig;
    private currentResolutionIndex: number = 0;
    private performanceHistory: Array<{ timestamp: number; metrics: PerformanceMetrics }> = [];
    private lastScaleTime: number = 0;

    constructor(config: DynamicResolutionConfig) {
        this.config = config;
    }

    /**
     * Update performance metrics and determine if resolution should change
     */
    updateMetrics(metrics: PerformanceMetrics): void {
        const now = Date.now();
        
        // Add to history
        this.performanceHistory.push({
            timestamp: now,
            metrics,
        });
        
        // Keep only recent history (last 2 seconds)
        const cutoff = now - 2000;
        this.performanceHistory = this.performanceHistory.filter(
            entry => entry.timestamp >= cutoff
        );
        
        // Check if we should scale
        this.evaluateScaling(now);
    }

    /**
     * Get current detection resolution
     */
    getDetectionResolution(videoWidth: number, videoHeight: number): { width: number; height: number } {
        const levels = this.config.resolutionLevels;
        const currentLevel = levels[this.currentResolutionIndex];
        
        if (!currentLevel) {
            return { width: videoWidth, height: videoHeight };
        }
        
        return {
            width: currentLevel[0],
            height: currentLevel[1],
        };
    }

    /**
     * Get current resolution scale factor
     */
    getScaleFactor(): number {
        const levels = this.config.resolutionLevels;
        if (levels.length === 0 || this.currentResolutionIndex >= levels.length) {
            return 1.0;
        }
        
        // Assume first level is full resolution
        const fullRes = levels[0];
        const currentRes = levels[this.currentResolutionIndex];
        
        return currentRes[0] / fullRes[0];
    }

    /**
     * Get current resolution index (for debug)
     */
    getResolutionIndex(): number {
        return this.currentResolutionIndex;
    }

    private evaluateScaling(now: number): void {
        if (this.performanceHistory.length < 10) {
            // Not enough data yet
            return;
        }
        
        // Check sustained performance over last sustainDurationMs
        const cutoff = now - this.config.sustainDurationMs;
        const recentHistory = this.performanceHistory.filter(
            entry => entry.timestamp >= cutoff
        );
        
        if (recentHistory.length === 0) return;
        
        // Calculate averages
        const avgRenderFps = recentHistory.reduce((sum, e) => sum + e.metrics.renderFps, 0) / recentHistory.length;
        const avgLatency = recentHistory.reduce((sum, e) => sum + e.metrics.detectionLatencyMs, 0) / recentHistory.length;
        
        const shouldScaleDown = avgRenderFps < this.config.fpsThreshold || 
                                avgLatency > this.config.latencyThresholdMs;
        const shouldScaleUp = avgRenderFps > this.config.fpsHysteresis && 
                             avgLatency < this.config.latencyThresholdMs * 0.8 &&
                             this.currentResolutionIndex > 0;
        
        // Apply hysteresis: don't scale too frequently
        const timeSinceLastScale = now - this.lastScaleTime;
        const minScaleInterval = 2000; // 2 seconds minimum between scales (increased for stability)
        
        // More aggressive scaling down, more conservative scaling up
        if (shouldScaleDown && this.currentResolutionIndex < this.config.resolutionLevels.length - 1) {
            if (timeSinceLastScale >= minScaleInterval) {
                this.currentResolutionIndex++;
                this.lastScaleTime = now;
                console.log(`[DynamicResolution] Scaled DOWN to level ${this.currentResolutionIndex} (FPS: ${avgRenderFps.toFixed(1)}, Latency: ${avgLatency.toFixed(1)}ms)`);
            }
        } else if (shouldScaleUp && timeSinceLastScale >= minScaleInterval * 2) {
            // Require 2x longer stable period before scaling up (prevent oscillation)
            if (timeSinceLastScale >= minScaleInterval * 2) {
                this.currentResolutionIndex--;
                this.lastScaleTime = now;
                console.log(`[DynamicResolution] Scaled UP to level ${this.currentResolutionIndex} (FPS: ${avgRenderFps.toFixed(1)}, Latency: ${avgLatency.toFixed(1)}ms)`);
            }
        }
    }

    /**
     * Reset to full resolution
     */
    reset(): void {
        this.currentResolutionIndex = 0;
        this.performanceHistory = [];
        this.lastScaleTime = 0;
    }
}
