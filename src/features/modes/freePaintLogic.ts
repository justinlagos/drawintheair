import { drawingEngine } from '../../core/drawingEngine';
import { DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../tracking/TrackingLayer';

/**
 * Free Paint Mode Logic
 * 
 * Uses the refined drawing engine with:
 * - One Euro Filter smoothing
 * - Pinch-to-draw pen model
 * - Curve rendering
 * - Jump protection
 */
export const freePaintLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    drawingUtils: DrawingUtils | null
) => {
    const { results, confidence, timestamp, indexTip, thumbTip, handScale } = frameData;

    // Process point through drawing engine (handles pen state, filtering, etc.)
    if (indexTip && thumbTip) {
        drawingEngine.processPoint(
            indexTip,
            thumbTip,
            handScale,
            confidence,
            timestamp
        );
    } else {
        // No hand detected - signal to drawing engine
        drawingEngine.processPoint(null, null, 0.1, 0, timestamp);
    }

    // Debug: Draw hand skeleton (optional, subtle)
    if (results && results.landmarks && results.landmarks.length > 0 && drawingUtils) {
        const landmarks = results.landmarks[0];
        
        // Draw very subtle hand outline
        ctx.save();
        ctx.globalAlpha = 0.2;
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
            color: "#00FFFF",
            lineWidth: 1
        });
        drawingUtils.drawLandmarks(landmarks, {
            color: "#FF00FF",
            lineWidth: 1,
            radius: 1
        });
        ctx.restore();
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
