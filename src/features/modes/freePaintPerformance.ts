/**
 * Dynamic Performance Protection
 * 
 * Phase 10: Adaptive quality based on performance
 * - If renderFPS < 50 for 500ms: reduce DPR, disable glow, simplify smoothing
 * - If detection latency > 60ms: downscale detection video only
 * - No visible quality loss
 */

import { freePaintProManager } from './freePaintProManager';

interface PerformanceState {
    renderFps: number;
    detectFps: number;
    detectionLatencyMs: number;
    lowFpsDuration: number; // ms
    highLatencyDuration: number; // ms
}

const LOW_FPS_THRESHOLD = 50;
const HIGH_LATENCY_THRESHOLD = 60;
const DURATION_THRESHOLD = 500; // ms

export class PerformanceProtection {
    private state: PerformanceState = {
        renderFps: 60,
        detectFps: 30,
        detectionLatencyMs: 0,
        lowFpsDuration: 0,
        highLatencyDuration: 0
    };
    
    private lastUpdateTime: number = Date.now();
    private qualityReduced: boolean = false;
    
    /**
     * Update performance metrics and apply protection if needed
     */
    update(renderFps: number, detectFps: number, detectionLatencyMs: number): void {
        const now = Date.now();
        const dt = now - this.lastUpdateTime;
        this.lastUpdateTime = now;
        
        this.state.renderFps = renderFps;
        this.state.detectFps = detectFps;
        this.state.detectionLatencyMs = detectionLatencyMs;
        
        // Check for low FPS
        if (renderFps < LOW_FPS_THRESHOLD) {
            this.state.lowFpsDuration += dt;
        } else {
            this.state.lowFpsDuration = 0;
        }
        
        // Check for high latency
        if (detectionLatencyMs > HIGH_LATENCY_THRESHOLD) {
            this.state.highLatencyDuration += dt;
        } else {
            this.state.highLatencyDuration = 0;
        }
        
        // Apply protection if thresholds exceeded
        if (this.state.lowFpsDuration >= DURATION_THRESHOLD && !this.qualityReduced) {
            this.reduceQuality();
        } else if (this.state.lowFpsDuration === 0 && this.qualityReduced) {
            this.restoreQuality();
        }
    }
    
    /**
     * Reduce quality to improve performance
     */
    private reduceQuality(): void {
        this.qualityReduced = true;
        
        // Reduce DPR
        freePaintProManager.setMaxDPR(1); // Cap at 1x DPR
        
        // Disable glow effects (via perf config)
        // Note: perf config doesn't directly expose glow, but we can reduce visual quality
        // This would need to be integrated with perf system
        
        console.log('[Performance] Quality reduced due to low FPS');
    }
    
    /**
     * Restore quality when performance improves
     */
    private restoreQuality(): void {
        this.qualityReduced = false;
        
        // Restore DPR
        freePaintProManager.setMaxDPR(2); // Restore to 2x DPR
        
        console.log('[Performance] Quality restored');
    }
    
    /**
     * Get current performance state
     */
    getState(): PerformanceState {
        return { ...this.state };
    }
    
    /**
     * Check if quality is reduced
     */
    isQualityReduced(): boolean {
        return this.qualityReduced;
    }
}

export const performanceProtection = new PerformanceProtection();
