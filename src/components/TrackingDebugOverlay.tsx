/**
 * Tracking Debug Overlay
 * 
 * Hidden by default, accessible via ?debug=tracking
 * Shows instrumentation for tuning parameters.
 */

import { useEffect, useState } from 'react';

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
}

interface TrackingDebugOverlayProps {
    metrics: DebugMetrics | null;
    canvasWidth: number;
    canvasHeight: number;
}

export const TrackingDebugOverlay = ({ metrics, canvasWidth, canvasHeight }: TrackingDebugOverlayProps) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check URL parameter
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === 'tracking') {
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
            
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#999', borderTop: '1px solid #555', paddingTop: '4px' }}>
                Press ESC to toggle | Canvas: {canvasWidth}x{canvasHeight}
            </div>
        </div>
    );
};
