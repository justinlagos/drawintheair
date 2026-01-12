/**
 * Free Paint Debug HUD
 * 
 * Displays performance metrics when ?debug=freepaint is in URL.
 * Shows:
 * - renderFPS
 * - detectFPS
 * - detection latency ms
 * - draw loop time
 * - rawPoint → filteredPoint → renderPoint
 * - active tool
 * - stroke points
 * - undo stack size
 * - memory estimate
 * 
 * Includes "Record 10s Metrics" button to log avg + p95 to console.
 */

import { useEffect, useRef, useState } from 'react';

export interface FreePaintDebugMetrics {
    renderFps: number;
    detectFps: number;
    detectionLatencyMs: number;
    drawLoopTimeMs: number;
    rawPoint: { x: number; y: number } | null;
    filteredPoint: { x: number; y: number } | null;
    renderPoint: { x: number; y: number } | null;
    activeTool: string;
    strokePoints: number;
    undoStackSize: number;
    memoryEstimateMB: number;
}

interface FreePaintDebugHUDProps {
    metrics: FreePaintDebugMetrics | null;
    onRecordMetrics?: () => void;
}

export const FreePaintDebugHUD = ({ metrics, onRecordMetrics }: FreePaintDebugHUDProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const recordingStartTimeRef = useRef<number>(0);
    const metricsHistoryRef = useRef<FreePaintDebugMetrics[]>([]);

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
                background: 'rgba(0, 0, 0, 0.85)',
                color: '#00ff00',
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 255, 0, 0.3)',
                zIndex: 10000,
                maxWidth: '300px',
                lineHeight: '1.4',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
            }}
        >
            <div style={{ marginBottom: '8px', fontWeight: 'bold', borderBottom: '1px solid rgba(0, 255, 0, 0.3)', paddingBottom: '4px' }}>
                🎨 Free Paint Debug
            </div>
            
            <div style={{ marginBottom: '4px' }}>
                <span style={{ color: '#888' }}>renderFPS:</span> {metrics.renderFps.toFixed(1)}
            </div>
            <div style={{ marginBottom: '4px' }}>
                <span style={{ color: '#888' }}>detectFPS:</span> {metrics.detectFps.toFixed(1)}
            </div>
            <div style={{ marginBottom: '4px' }}>
                <span style={{ color: '#888' }}>detectLatency:</span> {metrics.detectionLatencyMs.toFixed(2)}ms
            </div>
            <div style={{ marginBottom: '4px' }}>
                <span style={{ color: '#888' }}>drawLoopTime:</span> {metrics.drawLoopTimeMs.toFixed(2)}ms
            </div>
            
            <div style={{ marginTop: '8px', marginBottom: '4px', borderTop: '1px solid rgba(0, 255, 0, 0.2)', paddingTop: '4px' }}>
                <div style={{ marginBottom: '2px', fontSize: '10px', color: '#888' }}>Points:</div>
                <div style={{ marginBottom: '2px', marginLeft: '8px' }}>
                    raw: {metrics.rawPoint ? `${(metrics.rawPoint.x * 100).toFixed(1)}, ${(metrics.rawPoint.y * 100).toFixed(1)}` : 'null'}
                </div>
                <div style={{ marginBottom: '2px', marginLeft: '8px' }}>
                    filtered: {metrics.filteredPoint ? `${(metrics.filteredPoint.x * 100).toFixed(1)}, ${(metrics.filteredPoint.y * 100).toFixed(1)}` : 'null'}
                </div>
                <div style={{ marginBottom: '2px', marginLeft: '8px' }}>
                    render: {metrics.renderPoint ? `${(metrics.renderPoint.x * 100).toFixed(1)}, ${(metrics.renderPoint.y * 100).toFixed(1)}` : 'null'}
                </div>
            </div>
            
            <div style={{ marginTop: '8px', marginBottom: '4px', borderTop: '1px solid rgba(0, 255, 0, 0.2)', paddingTop: '4px' }}>
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#888' }}>tool:</span> {metrics.activeTool}
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
                    marginTop: '8px',
                    width: '100%',
                    padding: '6px',
                    background: isRecording ? '#ff4444' : '#00aa00',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    borderTop: '1px solid rgba(0, 255, 0, 0.2)',
                    paddingTop: '8px',
                    marginTop: '8px'
                }}
            >
                {isRecording ? '⏹ Stop Recording' : '⏺ Record 10s Metrics'}
            </button>
        </div>
    );
};
