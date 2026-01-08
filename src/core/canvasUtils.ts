/**
 * Canvas Resolution Utilities
 * 
 * Properly handles devicePixelRatio for crisp rendering on all devices
 * Adaptive quality based on device performance
 */

import { perf } from './perf';

export interface CanvasResolutionConfig {
    dprCap: number; // Maximum devicePixelRatio to use (1, 1.5, 2, etc.)
    minWidth?: number; // Minimum canvas width
    minHeight?: number; // Minimum canvas height
}

/**
 * Get adaptive DPR cap based on device performance
 */
export const getAdaptiveDPRCap = (): number => {
    const perfConfig = perf.getConfig();
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Cap DPR based on performance tier
    switch (perfConfig.tier) {
        case 'high':
            // Desktop/High-end: Cap at 2x for most displays
            return Math.min(devicePixelRatio, 2);
        case 'medium':
            // Mid-range: Cap at 1.5x or 2x if device supports it
            return Math.min(devicePixelRatio, 2);
        case 'low':
            // Low-end/Android tablets: Cap at 1.5x for performance
            return Math.min(devicePixelRatio, 1.5);
        default:
            return Math.min(devicePixelRatio, 2);
    }
};

/**
 * Set canvas resolution with proper devicePixelRatio handling
 * 
 * Rules:
 * - dpr = min(window.devicePixelRatio || 1, dprCap)
 * - canvas.style.width = cssWidth + "px"
 * - canvas.style.height = cssHeight + "px"
 * - canvas.width = Math.round(cssWidth * dpr)
 * - canvas.height = Math.round(cssHeight * dpr)
 * - ctx.setTransform(dpr, 0, 0, dpr, 0, 0) (so drawing code stays in CSS pixels)
 */
export const setCanvasResolution = (
    canvas: HTMLCanvasElement,
    cssWidth: number,
    cssHeight: number,
    config?: CanvasResolutionConfig
): { width: number; height: number; dpr: number } => {
    // Use provided dprCap or get from perf config
    const dprCap = config?.dprCap ?? getAdaptiveDPRCap();
    const devicePixelRatio = window.devicePixelRatio || 1;
    const dpr = Math.min(devicePixelRatio, dprCap);
    
    // Ensure minimum dimensions
    const width = Math.max(cssWidth, config?.minWidth ?? 1);
    const height = Math.max(cssHeight, config?.minHeight ?? 1);
    
    // Set CSS size (display size)
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Set actual canvas resolution (for rendering)
    const actualWidth = Math.round(width * dpr);
    const actualHeight = Math.round(height * dpr);
    
    canvas.width = actualWidth;
    canvas.height = actualHeight;
    
    // Set transform so drawing code can use CSS pixels
    const ctx = canvas.getContext('2d', { 
        alpha: true, 
        desynchronized: false,
        willReadFrequently: false
    });
    if (ctx) {
        // Set DPR transform so drawing code uses CSS pixels
        // Drawing code should use CSS dimensions, transform handles DPR scaling
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        // Enable image smoothing for crisp rendering at high DPR
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = dpr >= 2 ? 'high' : 'medium';
        
        // Set text rendering for sharp text on canvas
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
    }
    
    // Dev-only logging
    if (import.meta.env.DEV && typeof window !== 'undefined') {
        const debug = (window as any).__canvasDebug;
        if (debug === true || (typeof debug === 'object' && debug[canvas.id || 'canvas'])) {
            console.log(`[CanvasResolution] ${canvas.id || 'canvas'}:`, {
                css: `${width}x${height}`,
                actual: `${actualWidth}x${actualHeight}`,
                dpr: dpr.toFixed(2),
                devicePixelRatio: devicePixelRatio.toFixed(2),
                dprCap: dprCap.toFixed(2),
                scalingCorrect: actualWidth === Math.round(width * dpr)
            });
        }
    }
    
    return { width: actualWidth, height: actualHeight, dpr };
};

/**
 * Set canvas resolution based on element's CSS size
 * Useful when canvas should match its container
 */
export const setCanvasResolutionFromElement = (
    canvas: HTMLCanvasElement,
    config?: CanvasResolutionConfig
): { width: number; height: number; dpr: number } => {
    const rect = canvas.getBoundingClientRect();
    return setCanvasResolution(canvas, rect.width, rect.height, config);
};

/**
 * Set canvas resolution from video element dimensions
 * Ensures canvas matches video size with proper DPR
 */
export const setCanvasResolutionFromVideo = (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    config?: CanvasResolutionConfig
): { width: number; height: number; dpr: number } => {
    // Use video's intrinsic dimensions (not CSS size)
    const videoWidth = video.videoWidth || video.clientWidth || 1280;
    const videoHeight = video.videoHeight || video.clientHeight || 720;
    
    return setCanvasResolution(canvas, videoWidth, videoHeight, config);
};

/**
 * Create a resize observer for automatic canvas resolution updates
 */
export const createCanvasResizeObserver = (
    canvas: HTMLCanvasElement,
    config?: CanvasResolutionConfig,
    onResize?: (width: number, height: number, dpr: number) => void
): ResizeObserver => {
    const observer = new ResizeObserver(() => {
        const result = setCanvasResolutionFromElement(canvas, config);
        if (onResize) {
            onResize(result.width, result.height, result.dpr);
        }
    });
    
    observer.observe(canvas);
    return observer;
};

/**
 * Handle window resize and orientation change for canvas
 */
export const setupCanvasAutoResize = (
    canvas: HTMLCanvasElement,
    getCssSize: () => { width: number; height: number },
    config?: CanvasResolutionConfig,
    onResize?: (width: number, height: number, dpr: number) => void
): (() => void) => {
    const handleResize = () => {
        const { width, height } = getCssSize();
        const result = setCanvasResolution(canvas, width, height, config);
        if (onResize) {
            onResize(result.width, result.height, result.dpr);
        }
    };
    
    // Initial setup
    handleResize();
    
    // Listen for resize and orientation changes
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Return cleanup
    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
    };
};

/**
 * Dev-only: Enable canvas debug logging
 * Call with ?debug=canvas or window.__canvasDebug = true
 */
export const initCanvasDebug = (): void => {
    if (typeof window === 'undefined' || !import.meta.env.DEV) return;
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'canvas') {
        (window as any).__canvasDebug = true;
        console.log('[CanvasDebug] Canvas resolution debugging enabled');
    }
};

// Auto-initialize debug on load
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCanvasDebug);
    } else {
        initCanvasDebug();
    }
}
