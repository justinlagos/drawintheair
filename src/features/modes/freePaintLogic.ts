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
    const { filteredPoint, filteredThumbTip, penDown, confidence, timestamp, handScale } = frameData;

    // Update canvas size for resampling
    drawingEngine.setCanvasSize(width, height);

    // Process point using filtered data from unified state
    // Only draw when pen is down (pinch active)
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
