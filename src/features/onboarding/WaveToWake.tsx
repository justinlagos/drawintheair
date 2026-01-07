import { useRef, useEffect, useState } from 'react';
import { GlassPanel } from '../../components/GlassPanel';
import { type HandLandmarkerResult } from '@mediapipe/tasks-vision';

// Responsive hook
const useResponsiveLayout = () => {
    const [layout, setLayout] = useState(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
            isMobile: w <= 480,
            isTabletSmall: w > 480 && w <= 768,
            isLandscapePhone: w > h && h <= 500,
            screenWidth: w
        };
    });

    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setLayout({
                isMobile: w <= 480,
                isTabletSmall: w > 480 && w <= 768,
                isLandscapePhone: w > h && h <= 500,
                screenWidth: w
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return layout;
};

interface WaveToWakeProps {
    onWake: () => void;
    // We receive tracking data from the parent layer
    trackingResults: HandLandmarkerResult | null;
}

export const WaveToWake = ({ onWake, trackingResults }: WaveToWakeProps) => {
    const [waveCount, setWaveCount] = useState(0);
    const prevX = useRef<number | null>(null);
    const wakeThreshold = 5; // Valid "swipes" to wake
    const lastWaveTime = useRef<number>(0);
    const waveStartTime = useRef<number>(Date.now());
    const hasTrackedView = useRef<boolean>(false);
    
    const layout = useResponsiveLayout();
    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;

    useEffect(() => {
        if (trackingResults && trackingResults.landmarks && trackingResults.landmarks.length > 0) {
            const hand = trackingResults.landmarks[0];
            const tip = hand[8]; // Index tip

            if (prevX.current !== null) {
                const dx = tip.x - prevX.current;
                const now = Date.now();

                // Detect fast horizontal movement (wave)
                if (Math.abs(dx) > 0.05 && (now - lastWaveTime.current > 300)) {
                    setWaveCount(c => c + 1);
                    lastWaveTime.current = now;
                }
            }
            prevX.current = tip.x;
        }
    }, [trackingResults]);

    useEffect(() => {
        // Track wave screen view
        if (!hasTrackedView.current && typeof window !== 'undefined' && (window as any).analytics) {
            hasTrackedView.current = true;
            (window as any).analytics.logEvent('demo_wave_screen_view', {
                camera_permission: 'granted' // Assuming granted if we're here
            });
        }
    }, []);

    useEffect(() => {
        if (waveCount >= wakeThreshold) {
            // Track wave success
            if (typeof window !== 'undefined' && (window as any).analytics) {
                const timeToWave = Date.now() - waveStartTime.current;
                (window as any).analytics.logEvent('demo_wave_success', {
                    time_to_wave_ms: timeToWave
                });
                (window as any).analytics.logEvent('demo_mode_select_view');
            }
            onWake();
        }
    }, [waveCount, onWake]);

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50,
            backgroundColor: 'rgba(15, 12, 41, 0.8)', // Dark overlay
            backdropFilter: 'blur(5px)'
        }}>
            {/* Header with Logo - Responsive */}
            <div style={{
                width: '100%',
                padding: isCompact ? '1rem' : '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1
            }}>
                <img 
                    src="https://i.postimg.cc/d3nR91sy/logo.png" 
                    alt="Draw in the Air"
                    style={{
                        height: isCompact ? '30px' : '40px',
                        width: 'auto',
                        filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))'
                    }}
                />
            </div>

            {/* Centered Wave Card - Responsive */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isCompact ? '1rem' : '2rem'
            }}>
                <div style={{ 
                    animation: 'float 3s ease-in-out infinite',
                    width: '100%',
                    maxWidth: isCompact ? '90%' : '600px'
                }}>
                    <GlassPanel>
                        <h1 style={{
                            fontSize: isCompact ? 'clamp(1.5rem, 6vw, 2.5rem)' : '4rem',
                            margin: 0,
                            background: 'linear-gradient(to right, #00FFFF, #FF00FF)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 0 10px rgba(255,0,255,0.5))',
                            textAlign: 'center'
                        }}>
                            Draw in the Air
                        </h1>
                        <p style={{ 
                            fontSize: isCompact ? '1rem' : '1.5rem', 
                            color: '#fff', 
                            marginTop: isCompact ? '12px' : '20px',
                            textAlign: 'center'
                        }}>
                            Wave your hand to start! 👋
                        </p>

                        {/* Visual Progress - Responsive */}
                        <div style={{ 
                            display: 'flex', 
                            gap: isCompact ? '8px' : '10px', 
                            justifyContent: 'center', 
                            marginTop: isCompact ? '20px' : '30px' 
                        }}>
                            {[...Array(wakeThreshold)].map((_, i) => (
                                <div key={i} style={{
                                    width: isCompact ? '14px' : '20px',
                                    height: isCompact ? '14px' : '20px',
                                    borderRadius: '50%',
                                    background: i < waveCount ? 'var(--success-color)' : 'rgba(255,255,255,0.2)',
                                    boxShadow: i < waveCount ? '0 0 10px var(--success-color)' : 'none',
                                    transition: 'all 0.3s ease'
                                }} />
                            ))}
                        </div>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
};
