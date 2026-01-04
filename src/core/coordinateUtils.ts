/**
 * Coordinate Utilities
 * 
 * Centralized coordinate mapping from MediaPipe normalized coordinates (0-1)
 * to canvas pixel coordinates.
 * 
 * MediaPipe coordinates are NOT mirrored - left is left, right is right.
 */

export interface NormalizedPoint {
    x: number; // 0-1, where 0 is left, 1 is right
    y: number; // 0-1, where 0 is top, 1 is bottom
}

export interface CanvasPoint {
    x: number; // Pixel X coordinate
    y: number; // Pixel Y coordinate
}

/**
 * Convert normalized MediaPipe coordinates to canvas pixel coordinates
 * 
 * @param point Normalized point from MediaPipe (0-1 range)
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @returns Canvas pixel coordinates
 */
export function normalizedToCanvas(
    point: NormalizedPoint,
    canvasWidth: number,
    canvasHeight: number
): CanvasPoint {
    return {
        x: point.x * canvasWidth,
        y: point.y * canvasHeight
    };
}

/**
 * Convert canvas pixel coordinates to normalized coordinates
 */
export function canvasToNormalized(
    point: CanvasPoint,
    canvasWidth: number,
    canvasHeight: number
): NormalizedPoint {
    return {
        x: point.x / canvasWidth,
        y: point.y / canvasHeight
    };
}

/**
 * Calculate distance between two normalized points
 */
export function distance(
    p1: NormalizedPoint,
    p2: NormalizedPoint
): number {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Calculate distance in pixels between two normalized points
 */
export function distancePx(
    p1: NormalizedPoint,
    p2: NormalizedPoint,
    canvasWidth: number,
    canvasHeight: number
): number {
    const c1 = normalizedToCanvas(p1, canvasWidth, canvasHeight);
    const c2 = normalizedToCanvas(p2, canvasWidth, canvasHeight);
    return Math.hypot(c2.x - c1.x, c2.y - c1.y);
}

