/**
 * Tracing UI - HUD Drawing Helpers
 * 
 * Helper functions for drawing UI elements in Tracing Mode:
 * - HUD layout calculations
 * - Progress bars
 * - Pack/level indicators
 * - Instructions
 */

export interface HUDMetrics {
    hudSpacing: string;
    hudPadding: string;
    hudRadius: string;
    isCompact: boolean;
    isMobile: boolean;
    isTablet: boolean;
    screenWidth: number;
    screenHeight: number;
}

/**
 * Calculate responsive HUD metrics based on screen size
 */
export const calculateHUDMetrics = (width: number, height: number): HUDMetrics => {
    const isMobile = width <= 480;
    const isTablet = width > 480 && width <= 1024;
    const isLandscapePhone = width > height && height <= 500;
    const isCompact = isMobile || isTablet || isLandscapePhone;
    
    return {
        hudSpacing: isCompact ? '12px' : '24px',
        hudPadding: isCompact ? '12px 16px' : '20px 28px',
        hudRadius: isCompact ? '16px' : '24px',
        isCompact,
        isMobile,
        isTablet,
        screenWidth: width,
        screenHeight: height
    };
};

/**
 * Get pack name and icon
 */
export const getPackInfo = (pack: number): { name: string; icon: string; description: string } => {
    const packs: Record<number, { name: string; icon: string; description: string }> = {
        1: { name: 'Warm-up Lines', icon: '📏', description: 'Simple lines to get started' },
        2: { name: 'Shapes', icon: '🔷', description: 'Circles, squares, and more' },
        3: { name: 'Letters', icon: '🔤', description: 'A to Z' },
        4: { name: 'Numbers', icon: '🔢', description: '1 to 9' }
    };
    
    return packs[pack] || packs[1];
};
