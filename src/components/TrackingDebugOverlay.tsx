/**
 * Tracking Debug Overlay
 * 
 * Hidden by default, accessible via ?debug=tracking or TrackingFlags.metricsHud
 * Shows instrumentation for tuning parameters.
 */

import { useEffect, useState, useRef } from 'react';
import { getTrackingFlag, isDebugModeEnabled } from '../core/flags/TrackingFlags';

export interface DebugMetrics {
    renderFps: number;
    detectFps: number;
    detectionLatencyMs: number;
    confidence: number;
    penState: string;
    pinchDistance: number;
    pressValue: number;
    resolutionScale: number;
    resolutionIndex: number;
    rawPoint: { x: number; y: number } | null;
    filteredPoint: { x: number; y: number } | null;
    predictedPoint: { x: number; y: number } | null;
    // Enhanced metrics (Part E)
    velocity?: { x: number; y: number; magnitude: number };
    stability?: { isStable: boolean; stableDuration: number; movementMagnitude: number; isHovering: boolean };
    qualityLevel?: number;
    qualityLevelName?: string;
    deviceHints?: { deviceMemory: number; hardwareConcurrency: number; isMobile: boolean };
    drawLoopMs?: number;
}

interface TrackingDebugOverlayProps {
    metrics: DebugMetrics | null;
    canvasWidth: number;
    canvasHeight: number;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export const TrackingDebugOverlay = ({ metrics, canvasWidth, canvasHeight }: TrackingDebugOverlayProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingComplete, setRecordingComplete] = useState(false);
    const recordingSamplesRef = useRef<Array<{
        renderFps: number;
        detectFps: number;
        latency: number;
        drawLoopMs: number;
    }>>([]);
    const recordingStartTimeRef = useRef<number>(0);
    const recordingIntervalRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        // Check URL parameter or flag
        const params = new URLSearchParams(window.location.search);
        const debugParam = params.get('debug');
        const shouldShow = isDebugModeEnabled() || getTrackingFlag('metricsHud');
        
        if (shouldShow || debugParam === 'tracking' || debugParam === 'freepaint' || debugParam === 'bubblepop') {
            setIsVisible(true);
        }
        
        // Toggle with ESC key
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsVisible(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    const startRecording = () => {
        setIsRecording(true);
        setRecordingComplete(false);
        recordingSamplesRef.current = [];
        recordingStartTimeRef.current = Date.now();
        
        // Collect samples every 100ms for 10 seconds
        recordingIntervalRef.current = window.setInterval(() => {
            if (metrics) {
                recordingSamplesRef.current.push({
                    renderFps: metrics.renderFps,
                    detectFps: metrics.detectFps,
                    latency: metrics.detectionLatencyMs,
                    drawLoopMs: metrics.drawLoopMs || 0
                });
            }
            
            const elapsed = Date.now() - recordingStartTimeRef.current;
            if (elapsed >= 10000) {
                stopRecording();
            }
        }, 100);
    };

    const stopRecording = () => {
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = undefined;
        }
        setIsRecording(false);
        setRecordingComplete(true);
        
        // Calculate metrics
        const samples = recordingSamplesRef.current;
        if (samples.length > 0) {
            const renderFps = samples.map(s => s.renderFps);
            const detectFps = samples.map(s => s.detectFps);
            const latency = samples.map(s => s.latency);
            const drawLoopMs = samples.map(s => s.drawLoopMs);
            
            const avg = {
                renderFps: renderFps.reduce((a, b) => a + b, 0) / renderFps.length,
                detectFps: detectFps.reduce((a, b) => a + b, 0) / detectFps.length,
                latency: latency.reduce((a, b) => a + b, 0) / latency.length,
                drawLoopMs: drawLoopMs.reduce((a, b) => a + b, 0) / drawLoopMs.length
            };
            
            const p95 = {
                renderFps: percentile(renderFps, 95),
                detectFps: percentile(detectFps, 95),
                latency: percentile(latency, 95),
                drawLoopMs: percentile(drawLoopMs, 95)
            };
            
            console.log("[Metrics10s] summary", {
                avg,
                p95,
                samplesCount: samples.length
            });
        }
    };

    useEffect(() => {
        return () => {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        };
    }, []);

    if (!isVisible || !metrics) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 10,
                left: 10,
                background: 'rgba(0, 0, 0, 0.85)',
                color: '#fff',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '12px',
                zIndex: 10000,
                maxWidth: '320px',
                lineHeight: '1.4',
                border: '1px solid #555',
            }}
        >
            <div style={{ marginBottom: '8px', fontWeight: 'bold', borderBottom: '1px solid #555', paddingBottom: '4px', fontSize: '13px' }}>
                🔍 Tracking Debug
            </div>
            
            <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                <strong>Performance:</strong>
            </div>
            <div style={{ marginLeft: '8px', marginBottom: '8px' }}>
                Render FPS: <span style={{ color: metrics.renderFps < 50 ? '#ff6b6b' : '#51cf66', fontWeight: 'bold' }}>{metrics.renderFps.toFixed(1)}</span>
                <br />
                Detect FPS: <span style={{ color: metrics.detectFps < 20 ? '#ff6b6b' : '#51cf66', fontWeight: 'bold' }}>{metrics.detectFps.toFixed(1)}</span>
                <br />
                Latency: <span style={{ color: metrics.detectionLatencyMs > 60 ? '#ff6b6b' : '#51cf66', fontWeight: 'bold' }}>{metrics.detectionLatencyMs.toFixed(1)}ms</span>
            </div>
            
            <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                <strong>Tracking:</strong>
            </div>
            <div style={{ marginLeft: '8px', marginBottom: '8px' }}>
                Confidence: <span style={{ color: metrics.confidence > 0.7 ? '#51cf66' : metrics.confidence > 0.5 ? '#ffd43b' : '#ff6b6b' }}>{(metrics.confidence * 100).toFixed(1)}%</span>
                <br />
                Pen State: <span style={{ color: metrics.penState === 'down' ? '#51cf66' : '#ffd43b', fontWeight: 'bold' }}>{metrics.penState.toUpperCase()}</span>
                <br />
                Pinch Distance: {metrics.pinchDistance.toFixed(3)}
                <br />
                Press Value: <span style={{ color: metrics.pressValue > 0.6 ? '#51cf66' : '#999' }}>{metrics.pressValue.toFixed(2)}</span>
            </div>
            
            <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                <strong>Resolution:</strong>
            </div>
            <div style={{ marginLeft: '8px', marginBottom: '8px' }}>
                Scale: <span style={{ fontWeight: 'bold' }}>{metrics.resolutionScale.toFixed(2)}x</span>
                <br />
                Level: {metrics.resolutionIndex}
            </div>
            
            <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                <strong>Points (normalized 0-1):</strong>
            </div>
            <div style={{ marginLeft: '8px', fontSize: '10px', fontFamily: 'monospace' }}>
                <div style={{ color: '#ff6b6b' }}>
                    Raw: {metrics.rawPoint ? `${(metrics.rawPoint.x * 100).toFixed(1)}%, ${(metrics.rawPoint.y * 100).toFixed(1)}%` : 'N/A'}
                </div>
                <div style={{ color: '#51cf66' }}>
                    Filtered: {metrics.filteredPoint ? `${(metrics.filteredPoint.x * 100).toFixed(1)}%, ${(metrics.filteredPoint.y * 100).toFixed(1)}%` : 'N/A'}
                </div>
                <div style={{ color: '#4dabf7' }}>
                    Predicted: {metrics.predictedPoint ? `${(metrics.predictedPoint.x * 100).toFixed(1)}%, ${(metrics.predictedPoint.y * 100).toFixed(1)}%` : 'N/A'}
                </div>
            </div>
            
            {/* Enhanced metrics (Part E) */}
            {metrics.velocity && (
                <>
                    <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                        <strong>Velocity:</strong>
                    </div>
                    <div style={{ marginLeft: '8px', marginBottom: '8px', fontSize: '10px' }}>
                        Magnitude: {metrics.velocity.magnitude.toFixed(3)}
                        <br />
                        X: {metrics.velocity.x.toFixed(3)}, Y: {metrics.velocity.y.toFixed(3)}
                    </div>
                </>
            )}
            
            {metrics.stability && (
                <>
                    <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                        <strong>Stability:</strong>
                    </div>
                    <div style={{ marginLeft: '8px', marginBottom: '8px', fontSize: '10px' }}>
                        Stable: <span style={{ color: metrics.stability.isStable ? '#51cf66' : '#999' }}>{metrics.stability.isStable ? 'YES' : 'NO'}</span>
                        <br />
                        Duration: {metrics.stability.stableDuration.toFixed(0)}ms
                        <br />
                        Hovering: <span style={{ color: metrics.stability.isHovering ? '#51cf66' : '#999' }}>{metrics.stability.isHovering ? 'YES' : 'NO'}</span>
                        <br />
                        Movement: {metrics.stability.movementMagnitude.toFixed(4)}
                    </div>
                </>
            )}
            
            {metrics.qualityLevel !== undefined && (
                <>
                    <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                        <strong>Quality:</strong>
                    </div>
                    <div style={{ marginLeft: '8px', marginBottom: '8px' }}>
                        Level: <span style={{ fontWeight: 'bold' }}>{metrics.qualityLevel}</span> ({metrics.qualityLevelName || 'N/A'})
                    </div>
                </>
            )}
            
            {metrics.deviceHints && (
                <>
                    <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                        <strong>Device:</strong>
                    </div>
                    <div style={{ marginLeft: '8px', marginBottom: '8px', fontSize: '10px' }}>
                        Memory: {metrics.deviceHints.deviceMemory || 'N/A'}GB
                        <br />
                        Cores: {metrics.deviceHints.hardwareConcurrency || 'N/A'}
                        <br />
                        Mobile: {metrics.deviceHints.isMobile ? 'YES' : 'NO'}
                    </div>
                </>
            )}
            
            {metrics.drawLoopMs !== undefined && (
                <div style={{ marginLeft: '8px', marginBottom: '8px', fontSize: '10px' }}>
                    Draw Loop: <span style={{ color: metrics.drawLoopMs > 16 ? '#ff6b6b' : '#51cf66' }}>{metrics.drawLoopMs.toFixed(2)}ms</span>
                </div>
            )}
            
            {/* 10s Metrics Recorder */}
            <div style={{ marginTop: '12px', borderTop: '1px solid #555', paddingTop: '8px' }}>
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isRecording}
                    style={{
                        width: '100%',
                        padding: '6px 12px',
                        background: isRecording ? '#666' : '#4dabf7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isRecording ? 'not-allowed' : 'pointer',
                        fontSize: '11px',
                        fontWeight: 'bold'
                    }}
                >
                    {isRecording ? 'Recording... (10s)' : 'Record 10s Metrics'}
                </button>
                {recordingComplete && (
                    <div style={{ marginTop: '4px', fontSize: '10px', color: '#51cf66' }}>
                        ✓ Check console for summary
                    </div>
                )}
            </div>
            
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#999', borderTop: '1px solid #555', paddingTop: '4px' }}>
                Press ESC to toggle | Canvas: {canvasWidth}x{canvasHeight}
            </div>
        </div>
    );
};
