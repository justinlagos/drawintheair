/**
 * Free Paint Mode Logic - PRIORITY B
 * 
 * Uses unified interaction state for stable, smooth drawing:
 * - Pre-filtered points from InteractionState
 * - Pinch-to-draw pen model (open hand to pause)
 * - Spline rendering for smooth curves
 * - Jump protection
 */

import { drawingEngine } from '../../core/drawingEngine';
import type { TrackingFrameData } from '../tracking/TrackingLayer';

export const freePaintLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: any
) => {
    // Use unified interaction state (pre-filtered, stable)
    const { filteredPoint, filteredThumbTip, penDown, confidence, timestamp, handScale, pressValue } = frameData;

    // Update canvas size for resampling
    drawingEngine.setCanvasSize(width, height);

    // Apply depth sensitivity: increase brush width with press (if enabled)
    // Press value: 0 = no press, 1 = full press
    // Only apply if pressValue is different from default (0.5)
    if (pressValue !== 0.5) {
        const baseWidth = drawingEngine.getCurrentWidth();
        const pressWidthMultiplier = 1.0 + ((pressValue - 0.5) * 0.5); // 0.75 to 1.25 range
        drawingEngine.setWidth(baseWidth * pressWidthMultiplier);
    }

    // Process point using filtered data from unified state
    // Only draw when pen is down (pinch active)
    // Note: Use filteredPoint for actual stroke data (not predictedPoint)
    if (penDown && filteredPoint && filteredThumbTip) {
        drawingEngine.processPoint(
            filteredPoint,
            filteredThumbTip,
            handScale,
            confidence,
            timestamp
        );
    } else {
        // Pen up or no hand - signal to drawing engine
        drawingEngine.processPoint(null, null, 0.1, 0, timestamp);
    }

    // Render all strokes
    drawingEngine.render(ctx, width, height);
};

/**
 * Get current pen state for UI feedback
 */
export const getFreePaintPenState = () => {
    return drawingEngine.getPenState();
};
