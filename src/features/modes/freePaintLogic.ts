import { drawingEngine } from '../../core/drawingEngine';
import { DrawingUtils, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

export const freePaintLogic = (
    ctx: CanvasRenderingContext2D,
    results: HandLandmarkerResult | null,
    width: number,
    height: number,
    drawingUtils: DrawingUtils | null
) => {
    // Clear logic is handled by the caller (TrackingLayer clears canvas) 
    // OR we can make this additive. 
    // TrackingLayer clears every frame. So we must redraw strokes every frame.

    if (results && results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const indexTip = landmarks[8];

        drawingEngine.addPoint({ x: indexTip.x, y: indexTip.y });

        // Debug Draw (Optional, maybe specific to mode?)
        if (drawingUtils) {
            drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 1
            });
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 1,
                radius: 3
            });
        }
    } else {
        drawingEngine.endStroke();
    }

    // Render Drawing
    drawingEngine.render(ctx, width, height);
};
