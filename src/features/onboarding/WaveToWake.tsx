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
            backgroundColor: 'rgba(15, 12, 41, 0.85)', // Dark overlay (increased opacity to compensate for no blur)
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
                    src="/logo.png" 
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
                    <GlassPanel style={{ padding: isCompact ? '28px 24px' : '40px 48px' }}>
                        <h1 style={{
                            fontSize: isCompact ? 'clamp(1.8rem, 7vw, 2.8rem)' : '3.5rem',
                            margin: 0,
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #FFD93D 0%, #FF6B9D 50%, #00E5FF 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 4px 12px rgba(255,107,157,0.3))',
                            textAlign: 'center',
                            letterSpacing: '-0.5px',
                            lineHeight: 1.15
                        }}>
                            Draw in the Air
                        </h1>
                        <p style={{
                            fontSize: isCompact ? '1.1rem' : '1.4rem',
                            color: 'rgba(255,255,255,0.9)',
                            marginTop: isCompact ? '16px' : '24px',
                            textAlign: 'center',
                            fontWeight: 500,
                            letterSpacing: '0.3px'
                        }}>
                            Wave your hand to start! 👋
                        </p>

                        {/* Visual Progress - 3D dots */}
                        <div style={{
                            display: 'flex',
                            gap: isCompact ? '10px' : '14px',
                            justifyContent: 'center',
                            marginTop: isCompact ? '24px' : '32px'
                        }}>
                            {[...Array(wakeThreshold)].map((_, i) => (
                                <div key={i} style={{
                                    width: isCompact ? '16px' : '22px',
                                    height: isCompact ? '16px' : '22px',
                                    borderRadius: '50%',
                                    background: i < waveCount
                                        ? 'linear-gradient(145deg, #00F5A0 0%, #00D48A 100%)'
                                        : 'linear-gradient(145deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                                    boxShadow: i < waveCount
                                        ? '0 2px 8px rgba(0,245,160,0.5), 0 0 16px rgba(0,245,160,0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                                        : '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                                    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    transform: i < waveCount ? 'scale(1.15)' : 'scale(1)',
                                    border: i < waveCount ? '1px solid rgba(0,245,160,0.3)' : '1px solid rgba(255,255,255,0.08)'
                                }} />
                            ))}
                        </div>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
};
