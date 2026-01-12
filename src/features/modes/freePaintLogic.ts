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
import { trackingFeatures } from '../../core/trackingFeatures';
import { tactileAudioManager } from '../../core/TactileAudioManager';
import { freePaintMetricsTracker } from './freePaintMetrics';
import { freePaintProManager } from './freePaintProManager';
import { featureFlags } from '../../core/featureFlags';
import { paintToolsManager } from './freePaintTools';
import { undoRedoManager } from './freePaintUndo';
import { fillBucket } from './freePaintFill';
import { performanceProtection } from './freePaintPerformance';

/**
 * Draw crosshair at point for debug visualization
 */
const drawCrosshair = (
    ctx: CanvasRenderingContext2D,
    point: { x: number; y: number },
    width: number,
    height: number,
    color: string = '#00ff00',
    size: number = 10
): void => {
    const x = point.x * width;
    const y = point.y * height;
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
};

export const freePaintLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: any
) => {
    // Start timing draw loop for metrics
    freePaintMetricsTracker.startDrawLoop();

    // Use unified interaction state (pre-filtered, stable)
    const { filteredPoint, filteredThumbTip, penDown, confidence, timestamp, handScale, pressValue } = frameData;

    // Update canvas size for resampling
    drawingEngine.setCanvasSize(width, height);

    // Apply depth sensitivity: increase brush width with press (if enabled)
    // Press value: 0 = no press, 1 = full press
    // Only apply if pressValue is different from default (0.5)
    const flags = trackingFeatures.getFlags();
    
    if (flags.enablePressIntegration && pressValue !== 0.5) {
        const baseWidth = drawingEngine.getCurrentWidth();
        const pressConfig = trackingFeatures.getPressIntegrationConfig();
        // Enhanced press signal: boost brush width and glow when pressing hard
        const pressAmount = Math.max(0, (pressValue - 0.5) * 2); // 0 to 1 range
        const pressWidthMultiplier = 1.0 + (pressAmount * (pressConfig.freePaintBoost - 1.0)); // Up to freePaintBoost multiplier
        drawingEngine.setWidth(baseWidth * pressWidthMultiplier);
    } else if (pressValue !== 0.5) {
        // Original behavior when press integration flag is off
        const baseWidth = drawingEngine.getCurrentWidth();
        const pressWidthMultiplier = 1.0 + ((pressValue - 0.5) * 0.5); // 0.75 to 1.25 range
        drawingEngine.setWidth(baseWidth * pressWidthMultiplier);
    }
    
    // Update tactile audio if enabled
    if (flags.enableTactileAudio) {
        tactileAudioManager.updatePinchState(penDown);
        if (filteredPoint) {
            tactileAudioManager.updateMovement(filteredPoint, timestamp);
        }
    }

    // Phase 3: Two-path pointer system
    // - filteredPoint → logic (stroke data)
    // - renderPoint → visuals (cursor display)
    const logicPoint = freePaintProManager.getFilteredPoint(frameData);
    const renderPoint = freePaintProManager.getRenderPoint(frameData);
    
    // Update metrics with render point
    if (renderPoint) {
        freePaintMetricsTracker.updateRenderPoint(renderPoint);
    }
    
    // Phase 5: Paint tools integration
    const paintFlags = featureFlags.getFlags();
    const activeTool = paintToolsManager.getTool();
    const brushConfig = paintToolsManager.getBrushConfig();
    
    // Update drawing engine with tool settings (only for brush tools)
    if (paintToolsManager.isBrushTool()) {
        drawingEngine.setColor(brushConfig.color);
        drawingEngine.setWidth(brushConfig.size);
    }
    
    // Process point using filtered data for logic (stroke data)
    // Only draw when pen is down (pinch active) and tool allows drawing
    if (penDown && logicPoint && filteredThumbTip) {
        // Check if tool is fill (special handling - only on stroke start)
        if (paintFlags.fillEnabled && activeTool === 'fill') {
            const currentStroke = drawingEngine.getCurrentStroke();
            // Only fill once per pen down (when no current stroke)
            if (!currentStroke) {
                // Fill tool: fill on pen down at point location
                const canvasX = logicPoint.x * width;
                const canvasY = logicPoint.y * height;
                
                // Get appropriate context (base for layered, main for single)
                const fillCtx = paintFlags.layersEnabled && freePaintProManager.isLayeredEnabled()
                    ? freePaintProManager.getBaseContext()
                    : ctx;
                
                if (fillCtx) {
                    // Get full canvas image data before fill for undo
                    const beforeImageData = fillCtx.getImageData(0, 0, width, height);
                    
                    // Perform fill operation (async)
                    fillBucket.fill(fillCtx, canvasX, canvasY, brushConfig.color).then((result) => {
                        // Commit fill to undo stack with before state
                        if (result.filled > 0) {
                            undoRedoManager.push({
                                type: 'fill',
                                imageData: beforeImageData,
                                bounds: { x: 0, y: 0, width, height }
                            });
                        }
                    }).catch((error) => {
                        console.error('Fill operation failed:', error);
                    });
                }
            }
        } else if (paintToolsManager.isBrushTool() || paintToolsManager.isEraser()) {
            // Brush or eraser: normal stroke drawing
            // Set eraser mode if needed
            if (activeTool === 'eraser') {
                // Eraser uses destination-out composite mode
                // This will be handled in rendering
            }
            drawingEngine.processPoint(
                logicPoint,
                filteredThumbTip,
                handScale,
                confidence,
                timestamp
            );
        }
    } else {
        // Pen up or no hand - signal to drawing engine
        // Capture stroke before it's cleared for undo
        const currentStroke = drawingEngine.getCurrentStroke();
        const event = drawingEngine.processPoint(null, null, 0.1, 0, timestamp);
        
        // Phase 8: Undo system - commit stroke to undo stack when it ends
        if (event.type === 'stroke_end' && paintFlags.airPaintEnabled && currentStroke) {
            undoRedoManager.push({ type: 'stroke', stroke: { ...currentStroke } });
        }
    }

    // Phase 5: Layered canvas rendering for performance
    if (paintFlags.layersEnabled && freePaintProManager.isLayeredEnabled()) {
        // Use layered canvas system
        const previewCtx = freePaintProManager.getPreviewContext();
        const baseCtx = freePaintProManager.getBaseContext();
        
        if (baseCtx && previewCtx) {
            // Clear preview layer (will be redrawn with active stroke)
            freePaintProManager.clearPreview();
            
            // Phase 5: Render committed strokes to base layer only once per frame
            // (Base layer is only redrawn when strokes change - handled separately)
            // For now, render every frame but this will be optimized
            
            // Phase 5: Render current stroke to preview layer (every frame)
            drawingEngine.renderCurrentStroke(previewCtx, width, height);
            
            // Phase 5: Render committed strokes to base layer (only once, but for now every frame)
            // TODO: Track stroke changes and only redraw when needed
            drawingEngine.renderCommittedStrokes(baseCtx, width, height);
        }
    } else {
        // Standard single canvas rendering (existing behavior)
        drawingEngine.render(ctx, width, height);
    }

    // Debug: Draw crosshairs if ?debug=airpaint
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === 'airpaint') {
            // Draw crosshair at renderPoint (cursor position - green)
            if (renderPoint) {
                drawCrosshair(ctx, renderPoint, width, height, '#00ff00', 12);
            }
            // Draw crosshair at filteredPoint (committed ink position - cyan)
            if (filteredPoint) {
                drawCrosshair(ctx, filteredPoint, width, height, '#00ffff', 10);
            }
        }
    }

    // End timing and update metrics (will be read by debug HUD)
    // Update FPS metrics from frameData if available
    if (frameData.renderFps !== undefined && frameData.detectFps !== undefined && frameData.detectionLatencyMs !== undefined) {
        freePaintMetricsTracker.updateFpsMetrics(
            frameData.renderFps,
            frameData.detectFps,
            frameData.detectionLatencyMs
        );
        
        // Phase 10: Dynamic performance protection
        if (paintFlags.airPaintEnabled) {
            performanceProtection.update(
                frameData.renderFps,
                frameData.detectFps,
                frameData.detectionLatencyMs
            );
        }
    }
    freePaintMetricsTracker.endDrawLoop(frameData, width, height);
};

/**
 * Get current pen state for UI feedback
 */
export const getFreePaintPenState = () => {
    return drawingEngine.getPenState();
};
