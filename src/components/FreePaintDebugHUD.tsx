/**
 * Free Paint Debug HUD
 * 
 * Displays performance metrics when ?debug=airpaint is in URL.
 * Shows:
 * - Canvas CSS size (getBoundingClientRect)
 * - Canvas internal size (width/height backing store)
 * - devicePixelRatio
 * - Video element rect (getBoundingClientRect)
 * - objectFit mode (cover vs contain)
 * - rawPoint (x,y) and filteredPoint (x,y) in normalized space (0..1)
 * - computed renderPoint in CSS px and device px
 * - draw FPS and average draw loop time
 * - active tool, drawing state, pinch state, confidence
 * 
 * Includes crosshair rendering on canvas (renderPoint and committed ink position).
 * Includes "Record 10s Metrics" button to log avg + p95 to console.
 */

import { useEffect, useRef, useState } from 'react';

export interface FreePaintDebugMetrics {
    renderFps: number;
    detectFps: number;
    detectionLatencyMs: number;
    drawLoopTimeMs: number;
    avgDrawLoopTimeMs: number;
    rawPoint: { x: number; y: number } | null;
    filteredPoint: { x: number; y: number } | null;
    renderPoint: { x: number; y: number } | null;
    renderPointCssPx: { x: number; y: number } | null;
    renderPointDevicePx: { x: number; y: number } | null;
    activeTool: string;
    drawingState: 'idle' | 'drawing';
    pinchState: 'open' | 'pinched';
    confidence: number;
    strokePoints: number;
    undoStackSize: number;
    memoryEstimateMB: number;
}

interface FreePaintDebugHUDProps {
    metrics: FreePaintDebugMetrics | null;
}

export const FreePaintDebugHUD = ({ metrics }: FreePaintDebugHUDProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const recordingStartTimeRef = useRef<number>(0);
    const metricsHistoryRef = useRef<FreePaintDebugMetrics[]>([]);
    const [canvasInfo, setCanvasInfo] = useState<{
        cssRect: DOMRect | null;
        internalWidth: number;
        internalHeight: number;
        devicePixelRatio: number;
    }>({
        cssRect: null,
        internalWidth: 0,
        internalHeight: 0,
        devicePixelRatio: window.devicePixelRatio || 1
    });
    const [videoInfo, setVideoInfo] = useState<{
        rect: DOMRect | null;
        objectFit: string;
    }>({
        rect: null,
        objectFit: 'cover'
    });

    // Update canvas and video info periodically
    useEffect(() => {
        const updateInfo = () => {
            // Find canvas element (z-index 100)
            const canvas = document.querySelector('canvas[style*="z-index: 100"]') as HTMLCanvasElement;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                setCanvasInfo({
                    cssRect: rect,
                    internalWidth: canvas.width,
                    internalHeight: canvas.height,
                    devicePixelRatio: window.devicePixelRatio || 1
                });
            }

            // Find video element
            const video = document.querySelector('video') as HTMLVideoElement;
            if (video) {
                const rect = video.getBoundingClientRect();
                const objectFit = window.getComputedStyle(video).objectFit || 'cover';
                setVideoInfo({
                    rect,
                    objectFit
                });
            }
        };

        updateInfo();
        const interval = setInterval(updateInfo, 100); // Update every 100ms
        return () => clearInterval(interval);
    }, []);

    const handleRecordMetrics = () => {
        if (isRecording) {
            // Stop recording and log results
            const duration = Date.now() - recordingStartTimeRef.current;
            if (duration >= 10000 && metricsHistoryRef.current.length > 0) {
                const history = metricsHistoryRef.current;
                
                // Calculate averages
                const avgRenderFps = history.reduce((sum, m) => sum + m.renderFps, 0) / history.length;
                const avgDetectFps = history.reduce((sum, m) => sum + m.detectFps, 0) / history.length;
                const avgLatency = history.reduce((sum, m) => sum + m.detectionLatencyMs, 0) / history.length;
                const avgDrawLoop = history.reduce((sum, m) => sum + m.drawLoopTimeMs, 0) / history.length;
                
                // Calculate p95
                const sortedRenderFps = [...history.map(m => m.renderFps)].sort((a, b) => a - b);
                const sortedLatency = [...history.map(m => m.detectionLatencyMs)].sort((a, b) => a - b);
                const sortedDrawLoop = [...history.map(m => m.drawLoopTimeMs)].sort((a, b) => a - b);
                
                const p95Index = Math.floor(history.length * 0.95);
                const p95RenderFps = sortedRenderFps[p95Index] || 0;
                const p95Latency = sortedLatency[p95Index] || 0;
                const p95DrawLoop = sortedDrawLoop[p95Index] || 0;
                
                console.log('=== Free Paint Performance Metrics (10s) ===');
                console.log(`Render FPS: avg=${avgRenderFps.toFixed(1)}, p95=${p95RenderFps.toFixed(1)}`);
                console.log(`Detect FPS: avg=${avgDetectFps.toFixed(1)}`);
                console.log(`Detection Latency: avg=${avgLatency.toFixed(2)}ms, p95=${p95Latency.toFixed(2)}ms`);
                console.log(`Draw Loop Time: avg=${avgDrawLoop.toFixed(2)}ms, p95=${p95DrawLoop.toFixed(2)}ms`);
                console.log(`Samples: ${history.length}`);
                console.log('==========================================');
            }
            
            setIsRecording(false);
            metricsHistoryRef.current = [];
        } else {
            // Start recording
            setIsRecording(true);
            recordingStartTimeRef.current = Date.now();
            metricsHistoryRef.current = [];
        }
    };

    // Collect metrics while recording
    useEffect(() => {
        if (isRecording && metrics) {
            metricsHistoryRef.current.push(metrics);
            // Keep only last 10 seconds worth (assuming ~60fps = 600 samples max)
            if (metricsHistoryRef.current.length > 600) {
                metricsHistoryRef.current.shift();
            }
        }
    }, [isRecording, metrics]);

    if (!metrics) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#00ff00',
                fontFamily: 'monospace',
                fontSize: '10px',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid rgba(0, 255, 0, 0.3)',
                zIndex: 10000,
                maxWidth: '380px',
                maxHeight: '90vh',
                overflowY: 'auto',
                lineHeight: '1.3',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
            }}
        >
            <div style={{ marginBottom: '8px', fontWeight: 'bold', borderBottom: '1px solid rgba(0, 255, 0, 0.3)', paddingBottom: '4px' }}>
                🎨 Air Paint Debug
            </div>
            
            {/* Canvas Info */}
            <div style={{ marginBottom: '6px', borderTop: '1px solid rgba(0, 255, 0, 0.15)', paddingTop: '4px' }}>
                <div style={{ fontSize: '9px', color: '#888', marginBottom: '2px' }}>Canvas:</div>
                <div style={{ marginLeft: '8px', marginBottom: '1px' }}>
                    CSS: {canvasInfo.cssRect ? `${Math.round(canvasInfo.cssRect.width)}×${Math.round(canvasInfo.cssRect.height)}` : 'N/A'}
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '1px' }}>
                    Internal: {canvasInfo.internalWidth}×{canvasInfo.internalHeight}
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '1px' }}>
                    DPR: {canvasInfo.devicePixelRatio.toFixed(2)}
                </div>
            </div>

            {/* Video Info */}
            <div style={{ marginBottom: '6px', borderTop: '1px solid rgba(0, 255, 0, 0.15)', paddingTop: '4px' }}>
                <div style={{ fontSize: '9px', color: '#888', marginBottom: '2px' }}>Video:</div>
                <div style={{ marginLeft: '8px', marginBottom: '1px' }}>
                    Rect: {videoInfo.rect ? `${Math.round(videoInfo.rect.width)}×${Math.round(videoInfo.rect.height)}` : 'N/A'}
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '1px' }}>
                    objectFit: {videoInfo.objectFit}
                </div>
            </div>

            {/* Performance */}
            <div style={{ marginBottom: '6px', borderTop: '1px solid rgba(0, 255, 0, 0.15)', paddingTop: '4px' }}>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>renderFPS:</span> {metrics.renderFps.toFixed(1)}
                </div>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>detectFPS:</span> {metrics.detectFps.toFixed(1)}
                </div>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>detectLatency:</span> {metrics.detectionLatencyMs.toFixed(2)}ms
                </div>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>drawLoopTime:</span> {metrics.drawLoopTimeMs.toFixed(2)}ms
                </div>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>avgDrawLoopTime:</span> {metrics.avgDrawLoopTimeMs.toFixed(2)}ms
                </div>
            </div>
            
            {/* Coordinates */}
            <div style={{ marginBottom: '6px', borderTop: '1px solid rgba(0, 255, 0, 0.15)', paddingTop: '4px' }}>
                <div style={{ fontSize: '9px', color: '#888', marginBottom: '2px' }}>Points (norm 0-1):</div>
                <div style={{ marginLeft: '8px', marginBottom: '1px' }}>
                    raw: {metrics.rawPoint ? `${metrics.rawPoint.x.toFixed(3)}, ${metrics.rawPoint.y.toFixed(3)}` : 'null'}
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '1px' }}>
                    filtered: {metrics.filteredPoint ? `${metrics.filteredPoint.x.toFixed(3)}, ${metrics.filteredPoint.y.toFixed(3)}` : 'null'}
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '2px' }}>
                    render: {metrics.renderPoint ? `${metrics.renderPoint.x.toFixed(3)}, ${metrics.renderPoint.y.toFixed(3)}` : 'null'}
                </div>
                {metrics.renderPointCssPx && (
                    <div style={{ fontSize: '9px', color: '#888', marginTop: '2px', marginBottom: '1px' }}>renderPoint (CSS px):</div>
                )}
                {metrics.renderPointCssPx && (
                    <div style={{ marginLeft: '8px', marginBottom: '1px' }}>
                        {metrics.renderPointCssPx.x.toFixed(1)}, {metrics.renderPointCssPx.y.toFixed(1)}
                    </div>
                )}
                {metrics.renderPointDevicePx && (
                    <div style={{ fontSize: '9px', color: '#888', marginTop: '2px', marginBottom: '1px' }}>renderPoint (device px):</div>
                )}
                {metrics.renderPointDevicePx && (
                    <div style={{ marginLeft: '8px', marginBottom: '1px' }}>
                        {metrics.renderPointDevicePx.x.toFixed(1)}, {metrics.renderPointDevicePx.y.toFixed(1)}
                    </div>
                )}
            </div>
            
            {/* State */}
            <div style={{ marginBottom: '6px', borderTop: '1px solid rgba(0, 255, 0, 0.15)', paddingTop: '4px' }}>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>tool:</span> {metrics.activeTool}
                </div>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>drawingState:</span> {metrics.drawingState}
                </div>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>pinchState:</span> {metrics.pinchState}
                </div>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>confidence:</span> {metrics.confidence.toFixed(2)}
                </div>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>strokePoints:</span> {metrics.strokePoints}
                </div>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>undoStack:</span> {metrics.undoStackSize}
                </div>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>memory:</span> {metrics.memoryEstimateMB.toFixed(1)}MB
                </div>
            </div>
            
            <button
                onClick={handleRecordMetrics}
                style={{
                    marginTop: '6px',
                    width: '100%',
                    padding: '6px',
                    background: isRecording ? '#ff4444' : '#00aa00',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderTop: '1px solid rgba(0, 255, 0, 0.2)',
                    paddingTop: '8px'
                }}
            >
                {isRecording ? '⏹ Stop Recording' : '⏺ Record 10s Metrics'}
            </button>
        </div>
    );
};
