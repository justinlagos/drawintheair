/**
 * Adaptive Performance System
 * 
 * Detects device capabilities and applies appropriate quality settings
 * to ensure smooth performance on low-power devices while maintaining
 * premium experience on desktop.
 * 
 * Part E: Gradual quality scaling with 6 levels (behind flag)
 */

import { getTrackingFlag } from './flags/TrackingFlags';

export type PerformanceTier = 'high' | 'medium' | 'low';
export type VisualQuality = 'high' | 'low';
export type PerformanceOverride = 'auto' | 'high' | 'low';

/**
 * Quality Level (Part E - 6 levels for gradual scaling)
 */
export type QualityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface QualityLevelConfig {
    level: QualityLevel;
    name: string;
    targetDetectFps: number;
    cameraWidth: number;
    cameraHeight: number;
    visualQuality: VisualQuality;
    enableBackdropBlur: boolean;
    maxParticles: number;
    shadowBlurScale: number;
    glowPasses: number;
    resampleSpacingPx: number;
    canvasDPR: number; // Device pixel ratio cap
}

/**
 * Quality Levels - 6 levels for gradual scaling (Part E)
 * Degrade order: 5→4→3→2→1→0 (reduce expensive effects first)
 */
export const QUALITY_LEVELS: QualityLevelConfig[] = [
    // Level 5: Highest quality
    {
        level: 5,
        name: 'High',
        targetDetectFps: 30,
        cameraWidth: 1280,
        cameraHeight: 720,
        visualQuality: 'high',
        enableBackdropBlur: true,
        maxParticles: 50,
        shadowBlurScale: 1.0,
        glowPasses: 3,
        resampleSpacingPx: 2,
        canvasDPR: 2.0
    },
    // Level 4: Reduce particles and glow
    {
        level: 4,
        name: 'Medium High',
        targetDetectFps: 30,
        cameraWidth: 1280,
        cameraHeight: 720,
        visualQuality: 'high',
        enableBackdropBlur: true,
        maxParticles: 35,
        shadowBlurScale: 0.9,
        glowPasses: 2,
        resampleSpacingPx: 2,
        canvasDPR: 2.0
    },
    // Level 3: Reduce visual complexity
    {
        level: 3,
        name: 'Medium',
        targetDetectFps: 30,
        cameraWidth: 960,
        cameraHeight: 540,
        visualQuality: 'high',
        enableBackdropBlur: true,
        maxParticles: 25,
        shadowBlurScale: 0.8,
        glowPasses: 2,
        resampleSpacingPx: 2.5,
        canvasDPR: 1.5
    },
    // Level 2: Reduce DPR cap
    {
        level: 2,
        name: 'Medium Low',
        targetDetectFps: 30,
        cameraWidth: 960,
        cameraHeight: 540,
        visualQuality: 'high',
        enableBackdropBlur: true,
        maxParticles: 20,
        shadowBlurScale: 0.7,
        glowPasses: 1,
        resampleSpacingPx: 2.5,
        canvasDPR: 1.25
    },
    // Level 1: Reduce detection resolution
    {
        level: 1,
        name: 'Low',
        targetDetectFps: 24,
        cameraWidth: 640,
        cameraHeight: 480,
        visualQuality: 'low',
        enableBackdropBlur: false,
        maxParticles: 15,
        shadowBlurScale: 0.5,
        glowPasses: 1,
        resampleSpacingPx: 3,
        canvasDPR: 1.0
    },
    // Level 0: Lowest quality
    {
        level: 0,
        name: 'Very Low',
        targetDetectFps: 20,
        cameraWidth: 640,
        cameraHeight: 480,
        visualQuality: 'low',
        enableBackdropBlur: false,
        maxParticles: 10,
        shadowBlurScale: 0.3,
        glowPasses: 1,
        resampleSpacingPx: 3.5,
        canvasDPR: 1.0
    }
];

export interface PerformanceConfig {
    tier: PerformanceTier;
    targetDetectFps: number;
    cameraWidth: number;
    cameraHeight: number;
    visualQuality: VisualQuality;
    enableBackdropBlur: boolean;
    maxParticles: number;
    shadowBlurScale: number;
    glowPasses: number;
    resampleSpacingPx: number;
}

/**
 * Detect if device is mobile/tablet
 */
function isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
    
    // Also check screen size for tablets
    const isTablet = window.innerWidth <= 1024 && window.innerWidth >= 768;
    const isPhone = window.innerWidth <= 768;
    
    return isMobileUA || isTablet || isPhone;
}

/**
 * Detect if device is Android tablet specifically
 */
function isAndroidTablet(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android/i.test(ua.toLowerCase()) && window.innerWidth >= 600;
}

/**
 * Measure initial FPS over 2 seconds
 */
async function measureInitialFPS(): Promise<number> {
    return new Promise((resolve) => {
        const frames: number[] = [];
        let lastTime = performance.now();
        let frameCount = 0;
        const targetFrames = 60; // Measure over ~1 second at 60fps

        const measure = (currentTime: number) => {
            frameCount++;
            frames.push(currentTime - lastTime);
            lastTime = currentTime;

            if (frameCount >= targetFrames) {
                // Calculate average FPS
                const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
                const fps = 1000 / avgFrameTime;
                resolve(Math.min(60, Math.max(0, fps)));
            } else {
                requestAnimationFrame(measure);
            }
        };

        requestAnimationFrame(measure);
    });
}

/**
 * Determine performance tier based on device capabilities
 */
async function detectTier(override: PerformanceOverride): Promise<PerformanceTier> {
    // Respect user override
    if (override === 'high') return 'high';
    if (override === 'low') return 'low';

    // Auto-detection
    const isMobile = isMobileDevice();
    const isAndroid = isAndroidTablet();
    
    // Check hardware capabilities
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4; // GB
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Measure initial FPS
    const initialFPS = await measureInitialFPS();

    // Tier selection logic
    if (isAndroid || (isMobile && (hardwareConcurrency <= 4 || deviceMemory <= 2))) {
        return 'low';
    }
    
    if (isMobile || hardwareConcurrency <= 6 || deviceMemory <= 4 || initialFPS < 50 || prefersReducedMotion) {
        return 'medium';
    }
    
    return 'high';
}

/**
 * Get performance configuration for a given tier
 */
function getConfigForTier(tier: PerformanceTier): PerformanceConfig {
    switch (tier) {
        case 'high':
            return {
                tier: 'high',
                targetDetectFps: 30,
                cameraWidth: 1280,
                cameraHeight: 720,
                visualQuality: 'high',
                enableBackdropBlur: true,
                maxParticles: 50,
                shadowBlurScale: 1.0,
                glowPasses: 3,
                resampleSpacingPx: 2
            };
        
        case 'medium':
            return {
                tier: 'medium',
                targetDetectFps: 30,  // Increased from 24 for better responsiveness
                cameraWidth: 960,
                cameraHeight: 540,
                visualQuality: 'high',
                enableBackdropBlur: true,
                maxParticles: 25,  // Slightly reduced for stability
                shadowBlurScale: 0.8,
                glowPasses: 2,
                resampleSpacingPx: 2.5
            };
        
        case 'low':
            return {
                tier: 'low',
                targetDetectFps: 20,  // Increased from 15 for better responsiveness
                cameraWidth: 640,
                cameraHeight: 480,
                visualQuality: 'low',
                enableBackdropBlur: false,
                maxParticles: 15,  // Reduced for better performance
                shadowBlurScale: 0.5,
                glowPasses: 1,
                resampleSpacingPx: 3
            };
    }
}

/**
 * Performance Manager - Singleton
 */
class PerformanceManager {
    private config: PerformanceConfig;
    private override: PerformanceOverride = 'auto';
    private initialized: boolean = false;
    
    // Gradual quality scaling (Part E)
    private currentQualityLevel: QualityLevel = 5;
    private lastQualityChangeTime: number = 0;
    private readonly qualityChangeCooldown: number = 2000; // 2 seconds between degrade changes
    private readonly qualityUpgradeCooldown: number = 3000; // 3 seconds between upgrade changes
    private performanceHistory: Array<{ timestamp: number; renderFps: number; latency: number }> = [];
    
    constructor() {
        // Default to high tier until measured
        this.config = getConfigForTier('high');
    }

    /**
     * Initialize performance detection (async, call on app start)
     */
    async initialize(override?: PerformanceOverride): Promise<void> {
        if (override !== undefined) {
            this.override = override;
        }
        
        const tier = await detectTier(this.override);
        this.config = getConfigForTier(tier);
        this.initialized = true;
        
        console.log(`[Perf] Tier: ${tier}, Detect FPS: ${this.config.targetDetectFps}, Camera: ${this.config.cameraWidth}x${this.config.cameraHeight}`);
    }

    /**
     * Get current performance configuration
     */
    getConfig(): PerformanceConfig {
        const useGradualScaling = getTrackingFlag('gradualQualityScaling');
        
        if (useGradualScaling) {
            // Use quality level config
            const qualityConfig = QUALITY_LEVELS[this.currentQualityLevel];
            return {
                tier: this.config.tier, // Keep tier for compatibility
                targetDetectFps: qualityConfig.targetDetectFps,
                cameraWidth: qualityConfig.cameraWidth,
                cameraHeight: qualityConfig.cameraHeight,
                visualQuality: qualityConfig.visualQuality,
                enableBackdropBlur: qualityConfig.enableBackdropBlur,
                maxParticles: qualityConfig.maxParticles,
                shadowBlurScale: qualityConfig.shadowBlurScale,
                glowPasses: qualityConfig.glowPasses,
                resampleSpacingPx: qualityConfig.resampleSpacingPx
            };
        }
        
        // Legacy tier-based config (current behavior when flag OFF)
        return { ...this.config };
    }
    
    /**
     * Update performance metrics for gradual quality scaling (Part E)
     */
    updatePerformanceMetrics(renderFps: number, latency: number): void {
        if (!getTrackingFlag('gradualQualityScaling')) {
            return; // Flag OFF - do nothing
        }
        
        const now = Date.now();
        this.performanceHistory.push({ timestamp: now, renderFps, latency });
        
        // Keep only last 5 seconds
        const cutoff = now - 5000;
        this.performanceHistory = this.performanceHistory.filter(h => h.timestamp >= cutoff);
        
        if (this.performanceHistory.length < 10) {
            return; // Not enough data
        }
        
        // Check cooldown
        const timeSinceLastChange = now - this.lastQualityChangeTime;
        if (timeSinceLastChange < this.qualityChangeCooldown) {
            return;
        }
        
        // Calculate averages over last 3 seconds
        const recentHistory = this.performanceHistory.filter(h => h.timestamp >= now - 3000);
        if (recentHistory.length === 0) return;
        
        const avgFps = recentHistory.reduce((sum, h) => sum + h.renderFps, 0) / recentHistory.length;
        const avgLatency = recentHistory.reduce((sum, h) => sum + h.latency, 0) / recentHistory.length;
        
        // Degrade thresholds
        const fpsDegradeThreshold = 45; // Degrade if FPS drops below 45
        const latencyDegradeThreshold = 50; // Degrade if latency exceeds 50ms
        
        // Upgrade thresholds (more conservative)
        const fpsUpgradeThreshold = 55; // Upgrade if FPS stable above 55
        const latencyUpgradeThreshold = 30; // Upgrade if latency below 30ms
        
        const shouldDegrade = avgFps < fpsDegradeThreshold || avgLatency > latencyDegradeThreshold;
        const shouldUpgrade = avgFps > fpsUpgradeThreshold && avgLatency < latencyUpgradeThreshold && this.currentQualityLevel < 5;
        
        if (shouldDegrade && this.currentQualityLevel > 0) {
            // Degrade: step down one level (2 second cooldown)
            this.currentQualityLevel = (this.currentQualityLevel - 1) as QualityLevel;
            this.lastQualityChangeTime = now;
            const levelConfig = QUALITY_LEVELS[this.currentQualityLevel];
            console.log("[Quality] scaleDown", { level: this.currentQualityLevel, name: levelConfig.name, fps: avgFps.toFixed(1), latency: avgLatency.toFixed(1) });
        } else if (shouldUpgrade && timeSinceLastChange >= this.qualityUpgradeCooldown) {
            // Upgrade: require 3 second cooldown period of stable performance
            this.currentQualityLevel = (this.currentQualityLevel + 1) as QualityLevel;
            this.lastQualityChangeTime = now;
            const levelConfig = QUALITY_LEVELS[this.currentQualityLevel];
            console.log("[Quality] scaleUp", { level: this.currentQualityLevel, name: levelConfig.name, fps: avgFps.toFixed(1), latency: avgLatency.toFixed(1) });
        }
    }
    
    /**
     * Get current quality level (Part E)
     */
    getQualityLevel(): QualityLevel {
        return getTrackingFlag('gradualQualityScaling') ? this.currentQualityLevel : 5;
    }
    
    /**
     * Get quality level name (Part E)
     */
    getQualityLevelName(): string {
        if (getTrackingFlag('gradualQualityScaling')) {
            return QUALITY_LEVELS[this.currentQualityLevel].name;
        }
        // Legacy: map tier to level name
        return this.config.tier === 'high' ? 'High' : this.config.tier === 'medium' ? 'Medium' : 'Low';
    }

    /**
     * Update override setting
     */
    setOverride(override: PerformanceOverride): void {
        this.override = override;
        this.initialize(override);
    }

    /**
     * Get current override setting
     */
    getOverride(): PerformanceOverride {
        return this.override;
    }

    /**
     * Check if initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }
}

// Export singleton instance
export const perf = new PerformanceManager();

// Auto-initialize on module load (non-blocking)
if (typeof window !== 'undefined') {
    // Check for saved override in localStorage
    const savedOverride = localStorage.getItem('perf-override') as PerformanceOverride | null;
    if (savedOverride && ['auto', 'high', 'low'].includes(savedOverride)) {
        perf.initialize(savedOverride).catch(console.error);
    } else {
        perf.initialize('auto').catch(console.error);
    }
}

