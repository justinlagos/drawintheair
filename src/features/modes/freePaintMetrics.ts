/**
 * Free Paint Metrics Tracker
 * 
 * Tracks performance metrics for Free Paint mode debug HUD.
 * Metrics are updated by freePaintLogic and read by FreePaintMode.
 */

import type { FreePaintDebugMetrics } from '../../components/FreePaintDebugHUD';
import { drawingEngine } from '../../core/drawingEngine';
import type { TrackingFrameData } from '../tracking/TrackingLayer';

class FreePaintMetricsTracker {
    private metrics: FreePaintDebugMetrics = {
        renderFps: 60,
        detectFps: 30,
        detectionLatencyMs: 0,
        drawLoopTimeMs: 0,
        rawPoint: null,
        filteredPoint: null,
        renderPoint: null,
        activeTool: 'brush',
        strokePoints: 0,
        undoStackSize: 0,
        memoryEstimateMB: 0
    };

    private drawLoopStartTime: number = 0;

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
    endDrawLoop(frameData: TrackingFrameData): void {
        const drawLoopTime = performance.now() - this.drawLoopStartTime;

        // Get stroke info from drawing engine
        const strokeCount = drawingEngine.getStrokeCount();
        // Estimate stroke points (rough - actual count would require exposing internal state)
        const estimatedStrokePoints = strokeCount * 50; // Rough estimate

        // Import managers for metrics
        const { paintToolsManager } = require('./freePaintTools');
        const { undoRedoManager } = require('./freePaintUndo');

        this.metrics = {
            ...this.metrics, // Preserve FPS metrics updated via updateFpsMetrics
            drawLoopTimeMs: drawLoopTime,
            rawPoint: frameData.indexTip,
            filteredPoint: frameData.filteredPoint,
            renderPoint: frameData.predictedPoint ?? frameData.filteredPoint, // Use predicted if available, else filtered
            activeTool: paintToolsManager.getTool(),
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
