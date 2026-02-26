/**
 * Canvas Coordinate Mapper
 * 
 * Phase 3: Unified coordinate mapping system
 * 
 * Single source of truth for mapping normalized coordinates (0-1) to canvas device pixels.
 * Ensures cursor, stroke preview, and committed ink all use the same mapping.
 * 
 * Rules:
 * - Canvas CSS size matches layout (viewport)
 * - Canvas device size = CSS size * DPR (for crisp rendering)
 * - Mirroring applied once, early (in TrackingLayer)
 * - Object-fit handled if needed (video cover/contain)
 */

export interface NormalizedPoint {
    x: number; // 0-1, normalized coordinates (already mirrored)
    y: number; // 0-1, normalized coordinates
}

export interface CanvasDevicePoint {
    x: number; // Canvas device pixels
    y: number; // Canvas device pixels
}

export interface CanvasCoordinateMapperConfig {
    canvasWidth: number;   // Canvas device width (backing store)
    canvasHeight: number;  // Canvas device height (backing store)
    cssWidth: number;      // Canvas CSS width (layout)
    cssHeight: number;     // Canvas CSS height (layout)
    devicePixelRatio: number; // DPR (typically 1, 1.5, or 2)
}

/**
 * Canvas Coordinate Mapper
 * 
 * Maps normalized coordinates to canvas device pixels consistently.
 */
export class CanvasCoordinateMapper {
    private config: CanvasCoordinateMapperConfig;

    constructor(config: CanvasCoordinateMapperConfig) {
        this.config = config;
    }

    /**
     * Update canvas dimensions
     */
    updateConfig(config: Partial<CanvasCoordinateMapperConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Map normalized point (0-1) to canvas device pixels
     * 
     * This is the single source of truth for coordinate mapping.
     * Use this everywhere: cursor, stroke preview, committed ink.
     * 
     * @param point Normalized point (already mirrored, 0-1 range)
     * @returns Canvas device pixel coordinates
     */
    mapToCanvasDevicePixels(point: NormalizedPoint): CanvasDevicePoint {
        return {
            x: point.x * this.config.canvasWidth,
            y: point.y * this.config.canvasHeight
        };
    }

    /**
     * Map canvas device pixels to normalized coordinates (0-1)
     */
    mapFromCanvasDevicePixels(point: CanvasDevicePoint): NormalizedPoint {
        return {
            x: point.x / this.config.canvasWidth,
            y: point.y / this.config.canvasHeight
        };
    }

    /**
     * Get current canvas device dimensions
     */
    getCanvasDeviceSize(): { width: number; height: number } {
        return {
            width: this.config.canvasWidth,
            height: this.config.canvasHeight
        };
    }

    /**
     * Get current canvas CSS dimensions
     */
    getCanvasCssSize(): { width: number; height: number } {
        return {
            width: this.config.cssWidth,
            height: this.config.cssHeight
        };
    }

    /**
     * Get device pixel ratio
     */
    getDevicePixelRatio(): number {
        return this.config.devicePixelRatio;
    }
}

/**
 * Global canvas coordinate mapper instance
 * Initialized when canvas is set up
 */
let globalMapper: CanvasCoordinateMapper | null = null;

/**
 * Initialize the global canvas coordinate mapper
 */
export function initCanvasCoordinateMapper(config: CanvasCoordinateMapperConfig): void {
    globalMapper = new CanvasCoordinateMapper(config);
}

/**
 * Update the global canvas coordinate mapper config
 */
export function updateCanvasCoordinateMapper(config: Partial<CanvasCoordinateMapperConfig>): void {
    if (globalMapper) {
        globalMapper.updateConfig(config);
    }
}

/**
 * Get the global canvas coordinate mapper
 */
export function getCanvasCoordinateMapper(): CanvasCoordinateMapper | null {
    return globalMapper;
}

/**
 * Map normalized point to canvas device pixels (convenience function using global mapper)
 */
export function mapToCanvasDevicePixels(point: NormalizedPoint): CanvasDevicePoint | null {
    if (!globalMapper) {
        console.warn('[CanvasCoordinateMapper] Global mapper not initialized');
        return null;
    }
    return globalMapper.mapToCanvasDevicePixels(point);
}

/**
 * Map canvas device pixels to normalized coordinates (convenience function using global mapper)
 */
export function mapFromCanvasDevicePixels(point: CanvasDevicePoint): NormalizedPoint | null {
    if (!globalMapper) {
        console.warn('[CanvasCoordinateMapper] Global mapper not initialized');
        return null;
    }
    return globalMapper.mapFromCanvasDevicePixels(point);
}
