/**
 * Canvas Debug Overlay - Dev Only
 * 
 * Shows canvas resolution, DPR, and sizing info for debugging
 * Enabled via ?debug=canvas URL parameter
 */

import { useEffect, useState } from 'react';

interface CanvasInfo {
    id: string;
    cssWidth: number;
    cssHeight: number;
    actualWidth: number;
    actualHeight: number;
    dpr: string; // Formatted string
    devicePixelRatio: string; // Formatted string
    scalingCorrect: boolean;
}

export const CanvasDebugOverlay = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [canvasInfo, setCanvasInfo] = useState<CanvasInfo[]>([]);

    useEffect(() => {
        // Check URL parameter
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === 'canvas') {
            setIsVisible(true);
            (window as any).__canvasDebug = true;
        }
        
        if (!isVisible) return;
        
        // Update canvas info periodically
        const interval = setInterval(() => {
            const canvases = document.querySelectorAll('canvas');
            const info: CanvasInfo[] = [];
            
            canvases.forEach((canvas, index) => {
                const rect = canvas.getBoundingClientRect();
                const cssWidth = rect.width;
                const cssHeight = rect.height;
                const actualWidth = canvas.width;
                const actualHeight = canvas.height;
                const devicePixelRatio = window.devicePixelRatio || 1;
                const expectedWidth = Math.round(cssWidth * devicePixelRatio);
                const expectedHeight = Math.round(cssHeight * devicePixelRatio);
                const dpr = actualWidth > 0 ? actualWidth / cssWidth : devicePixelRatio;
                
                info.push({
                    id: canvas.id || `canvas-${index}`,
                    cssWidth: Math.round(cssWidth),
                    cssHeight: Math.round(cssHeight),
                    actualWidth,
                    actualHeight,
                    dpr: dpr.toFixed(2),
                    devicePixelRatio: devicePixelRatio.toFixed(2),
                    scalingCorrect: actualWidth === expectedWidth && actualHeight === expectedHeight
                });
            });
            
            setCanvasInfo(info);
        }, 500);
        
        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible || canvasInfo.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 10,
                right: 10,
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '11px',
                zIndex: 10001,
                maxWidth: '400px',
                maxHeight: '80vh',
                overflowY: 'auto',
                border: '2px solid #00F5D4',
                boxShadow: '0 4px 20px rgba(0, 245, 212, 0.3)'
            }}
        >
            <div style={{ marginBottom: '12px', fontWeight: 'bold', borderBottom: '1px solid #555', paddingBottom: '8px', fontSize: '13px', color: '#00F5D4' }}>
                🔍 Canvas Resolution Debug
            </div>
            
            <div style={{ marginBottom: '8px', fontSize: '10px', color: '#999' }}>
                Device DPR: {window.devicePixelRatio || 1}
            </div>
            
            {canvasInfo.map((info, index) => (
                <div key={index} style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: index < canvasInfo.length - 1 ? '1px solid #333' : 'none' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px', color: info.scalingCorrect ? '#51cf66' : '#ff6b6b' }}>
                        {info.id} {info.scalingCorrect ? '✓' : '✗'}
                    </div>
                    <div style={{ marginLeft: '8px', lineHeight: '1.6' }}>
                        <div>CSS: <span style={{ color: '#fff' }}>{info.cssWidth} × {info.cssHeight}px</span></div>
                        <div>Actual: <span style={{ color: '#fff' }}>{info.actualWidth} × {info.actualHeight}px</span></div>
                        <div>DPR Used: <span style={{ color: info.scalingCorrect ? '#51cf66' : '#ffd43b', fontWeight: 'bold' }}>{info.dpr}x</span></div>
                        <div>Device DPR: <span style={{ color: '#999' }}>{info.devicePixelRatio}x</span></div>
                        <div style={{ color: info.scalingCorrect ? '#51cf66' : '#ff6b6b', fontSize: '10px', marginTop: '4px' }}>
                            {info.scalingCorrect ? 'Scaling correct ✓' : 'Scaling mismatch - needs fix'}
                        </div>
                    </div>
                </div>
            ))}
            
            <div style={{ marginTop: '12px', fontSize: '10px', color: '#999', borderTop: '1px solid #555', paddingTop: '8px' }}>
                Press ESC to toggle | ?debug=canvas to enable
            </div>
        </div>
    );
};
