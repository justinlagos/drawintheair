/**
 * Performance Overlay - Dev Tool
 * 
 * Displays performance metrics when ?debugPerf=1 is in URL
 * Hidden by default for production
 */

import { useEffect, useState, useRef } from 'react';
import { perf } from '../core/perf';

export const PerfOverlay = () => {
    const [visible, setVisible] = useState(false);
    const [renderFPS, setRenderFPS] = useState(0);
    const [targetDetectFPS, setTargetDetectFPS] = useState(0);
    const [tier, setTier] = useState<string>('unknown');
    const [cameraRes, setCameraRes] = useState<string>('unknown');
    
    const renderFrameCount = useRef(0);
    const renderLastTime = useRef(performance.now());

    useEffect(() => {
        // Check URL param
        const params = new URLSearchParams(window.location.search);
        setVisible(params.get('debugPerf') === '1');
        
        if (!visible) return;
        
        // Update tier and camera res from perf config
        const updatePerfInfo = () => {
            const config = perf.getConfig();
            setTier(config.tier);
            setCameraRes(`${config.cameraWidth}x${config.cameraHeight}`);
            setTargetDetectFPS(config.targetDetectFps);
        };
        updatePerfInfo();
        const interval = setInterval(updatePerfInfo, 500);

        // Measure render FPS
        const measureRenderFPS = () => {
            renderFrameCount.current++;
            const now = performance.now();
            const elapsed = now - renderLastTime.current;
            
            if (elapsed >= 1000) {
                const fps = Math.round((renderFrameCount.current * 1000) / elapsed);
                setRenderFPS(fps);
                renderFrameCount.current = 0;
                renderLastTime.current = now;
            }
            
            if (visible) {
                requestAnimationFrame(measureRenderFPS);
            }
        };
        
        measureRenderFPS();

        return () => {
            clearInterval(interval);
        };
    }, [visible]);

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            background: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '12px 16px',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#fff',
            zIndex: 99999,
            minWidth: '200px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px' }}>
                🔧 Perf Debug
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Render FPS: <span style={{ color: renderFPS >= 55 ? '#4ade80' : renderFPS >= 30 ? '#fbbf24' : '#ef4444' }}>{renderFPS}</span></div>
                <div>Detect Target: <span>{targetDetectFPS} fps</span></div>
                <div>Tier: <span style={{ textTransform: 'uppercase', color: tier === 'low' ? '#ef4444' : tier === 'medium' ? '#fbbf24' : '#4ade80' }}>{tier}</span></div>
                <div>Camera: <span>{cameraRes}</span></div>
                <div style={{ marginTop: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                    Remove ?debugPerf=1 to hide
                </div>
            </div>
        </div>
    );
};

