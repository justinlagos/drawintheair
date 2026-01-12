/**
 * Free Paint Metrics Tracker
 * 
 * Tracks performance metrics for Free Paint mode debug HUD.
 * Metrics are updated by freePaintLogic and read by FreePaintMode.
 */

import type { FreePaintDebugMetrics } from '../../components/FreePaintDebugHUD';
import { drawingEngine } from '../../core/drawingEngine';
import type { TrackingFrameData } from '../tracking/TrackingLayer';
import { paintToolsManager } from './freePaintTools';
import { undoRedoManager } from './freePaintUndo';

class FreePaintMetricsTracker {
    private metrics: FreePaintDebugMetrics = {
        renderFps: 60,
        detectFps: 30,
        detectionLatencyMs: 0,
        drawLoopTimeMs: 0,
        avgDrawLoopTimeMs: 0,
        rawPoint: null,
        filteredPoint: null,
        renderPoint: null,
        renderPointCssPx: null,
        renderPointDevicePx: null,
        activeTool: 'brush',
        drawingState: 'idle',
        pinchState: 'open',
        confidence: 0,
        strokePoints: 0,
        undoStackSize: 0,
        memoryEstimateMB: 0
    };

    private drawLoopStartTime: number = 0;
    private drawLoopTimeHistory: number[] = [];
    private readonly MAX_HISTORY = 60; // Keep last 60 frames for average

    /**
     * Update FPS metrics from TrackingLayer
     */
    updateFpsMetrics(renderFps: number, detectFps: number, detectionLatencyMs: number): void {
        this.metrics.renderFps = renderFps;
        this.metrics.detectFps = detectFps;
        this.metrics.detectionLatencyMs = detectionLatencyMs;
    }
    
    /**
     * Update render point for debug display
     */
    updateRenderPoint(renderPoint: { x: number; y: number }): void {
        this.metrics.renderPoint = renderPoint;
    }

    /**
     * Start timing the draw loop
     */
    startDrawLoop(): void {
        this.drawLoopStartTime = performance.now();
    }

    /**
     * End timing the draw loop and update metrics
     */
    endDrawLoop(frameData: TrackingFrameData, canvasWidth: number, canvasHeight: number): void {
        const drawLoopTime = performance.now() - this.drawLoopStartTime;

        // Track draw loop time history for average
        this.drawLoopTimeHistory.push(drawLoopTime);
        if (this.drawLoopTimeHistory.length > this.MAX_HISTORY) {
            this.drawLoopTimeHistory.shift();
        }
        const avgDrawLoopTime = this.drawLoopTimeHistory.length > 0
            ? this.drawLoopTimeHistory.reduce((a, b) => a + b, 0) / this.drawLoopTimeHistory.length
            : drawLoopTime;

        // Get stroke info from drawing engine
        const strokeCount = drawingEngine.getStrokeCount();
        // Estimate stroke points (rough - actual count would require exposing internal state)
        const estimatedStrokePoints = strokeCount * 50; // Rough estimate

        // Calculate renderPoint in CSS px and device px
        const renderPointNorm = frameData.predictedPoint ?? frameData.filteredPoint;
        let renderPointCssPx: { x: number; y: number } | null = null;
        let renderPointDevicePx: { x: number; y: number } | null = null;
        
        if (renderPointNorm) {
            // CSS px: normalized * canvas CSS size (assume canvas fills viewport)
            const canvasCssWidth = window.innerWidth;
            const canvasCssHeight = window.innerHeight;
            renderPointCssPx = {
                x: renderPointNorm.x * canvasCssWidth,
                y: renderPointNorm.y * canvasCssHeight
            };
            // Device px: normalized * canvas device size (width/height)
            renderPointDevicePx = {
                x: renderPointNorm.x * canvasWidth,
                y: renderPointNorm.y * canvasHeight
            };
        }

        this.metrics = {
            ...this.metrics, // Preserve FPS metrics updated via updateFpsMetrics
            drawLoopTimeMs: drawLoopTime,
            avgDrawLoopTimeMs: avgDrawLoopTime,
            rawPoint: frameData.indexTip,
            filteredPoint: frameData.filteredPoint,
            renderPoint: renderPointNorm,
            renderPointCssPx,
            renderPointDevicePx,
            activeTool: paintToolsManager.getTool(),
            drawingState: frameData.penDown ? 'drawing' : 'idle',
            pinchState: frameData.pinchActive ? 'pinched' : 'open',
            confidence: frameData.confidence,
            strokePoints: estimatedStrokePoints,
            undoStackSize: undoRedoManager.getUndoCount(),
            memoryEstimateMB: this.estimateMemory() + undoRedoManager.getMemoryUsageMB()
        };
    }

    /**
     * Get current metrics
     */
    getMetrics(): FreePaintDebugMetrics {
        return { ...this.metrics };
    }

    /**
     * Estimate memory usage (rough calculation)
     */
    private estimateMemory(): number {
        const strokeCount = drawingEngine.getStrokeCount();
        // Rough estimate: each stroke has ~50 points, each point is ~24 bytes
        const estimatedBytes = strokeCount * 50 * 24;
        return estimatedBytes / (1024 * 1024); // Convert to MB
    }
}

export const freePaintMetricsTracker = new FreePaintMetricsTracker();
