/**
 * Tracing Debug Overlay
 * 
 * Hidden by default, accessible via ?debug=tracing
 * Shows instrumentation for tuning tracing parameters.
 */

import { useEffect, useState } from 'react';
import { getTracingState } from '../features/modes/tracing/tracingLogicV2';
import { getCurrentPath } from '../features/modes/tracing/tracingProgress';

export interface TracingDebugMetrics {
    tolerance: number;
    assistStrength: number;
    nearestDistance: number;
    progressPercent: number;
    onPath: boolean;
    accuracy: number;
    timeOnPath: number;
    timeOffPath: number;
}

interface TracingDebugOverlayProps {
    canvasWidth: number;
    canvasHeight: number;
}

export const TracingDebugOverlay = ({ canvasWidth, canvasHeight }: TracingDebugOverlayProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [metrics, setMetrics] = useState<TracingDebugMetrics | null>(null);

    useEffect(() => {
        // Check URL parameter
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === 'tracing') {
            setIsVisible(true);
        }
        
        // Toggle with ESC key
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsVisible(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        
        // Update metrics periodically (10fps)
        const interval = setInterval(() => {
            if (isVisible) {
                const state = getTracingState();
                const path = getCurrentPath();
                
                if (path) {
                    setMetrics({
                        tolerance: path.tolerancePx,
                        assistStrength: path.assistStrength,
                        nearestDistance: state.nearestDistance,
                        progressPercent: Math.round(state.progress * 100),
                        onPath: state.onPath,
                        accuracy: Math.round(state.accuracy * 100) / 100,
                        timeOnPath: Math.round(state.timeOnPath * 10) / 10,
                        timeOffPath: Math.round(state.timeOffPath * 10) / 10
                    });
                }
            }
        }, 100);
        
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
            clearInterval(interval);
        };
    }, [isVisible]);

    if (!isVisible || !metrics) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 10,
                right: 10,
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
                🔍 Tracing Debug
            </div>
            
            <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                <strong>Debug Info:</strong>
            </div>
            
            <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                <strong>Progress:</strong>
            </div>
            <div style={{ marginLeft: '8px', marginBottom: '8px' }}>
                Progress: <span style={{ fontWeight: 'bold', color: '#51cf66' }}>{metrics.progressPercent}%</span>
                <br />
                On Path: <span style={{ color: metrics.onPath ? '#51cf66' : '#ff6b6b', fontWeight: 'bold' }}>
                    {metrics.onPath ? 'YES' : 'NO'}
                </span>
                <br />
                Accuracy: <span style={{ color: metrics.accuracy > 0.7 ? '#51cf66' : metrics.accuracy > 0.5 ? '#ffd43b' : '#ff6b6b' }}>
                    {(metrics.accuracy * 100).toFixed(1)}%
                </span>
            </div>
            
            <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                <strong>Distance:</strong>
            </div>
            <div style={{ marginLeft: '8px', marginBottom: '8px' }}>
                Nearest: <span style={{ fontWeight: 'bold' }}>{metrics.nearestDistance.toFixed(1)}px</span>
                <br />
                Tolerance: <span style={{ fontWeight: 'bold' }}>{metrics.tolerance}px</span>
                <br />
                Assist: <span style={{ fontWeight: 'bold' }}>{(metrics.assistStrength * 100).toFixed(0)}%</span>
            </div>
            
            <div style={{ marginBottom: '4px', marginTop: '8px' }}>
                <strong>Time:</strong>
            </div>
            <div style={{ marginLeft: '8px', marginBottom: '8px' }}>
                On Path: <span style={{ color: '#51cf66' }}>{metrics.timeOnPath.toFixed(1)}s</span>
                <br />
                Off Path: <span style={{ color: '#ff6b6b' }}>{metrics.timeOffPath.toFixed(1)}s</span>
            </div>
            
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#999', borderTop: '1px solid #555', paddingTop: '4px' }}>
                Press ESC to toggle | Canvas: {canvasWidth}x{canvasHeight}
            </div>
        </div>
    );
};
