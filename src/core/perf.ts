/**
 * Adaptive Performance System
 * 
 * Detects device capabilities and applies appropriate quality settings
 * to ensure smooth performance on low-power devices while maintaining
 * premium experience on desktop.
 */

export type PerformanceTier = 'high' | 'medium' | 'low';
export type VisualQuality = 'high' | 'low';
export type PerformanceOverride = 'auto' | 'high' | 'low';

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
                targetDetectFps: 24,
                cameraWidth: 960,
                cameraHeight: 540,
                visualQuality: 'high',
                enableBackdropBlur: true,
                maxParticles: 30,
                shadowBlurScale: 0.8,
                glowPasses: 2,
                resampleSpacingPx: 2.5
            };
        
        case 'low':
            return {
                tier: 'low',
                targetDetectFps: 15,
                cameraWidth: 640,
                cameraHeight: 480,
                visualQuality: 'low',
                enableBackdropBlur: false,
                maxParticles: 20,
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
        return { ...this.config };
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

