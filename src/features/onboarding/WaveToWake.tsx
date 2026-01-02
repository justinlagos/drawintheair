import { useRef, useEffect, useState } from 'react';
import { GlassPanel } from '../../components/GlassPanel';
import { type HandLandmarkerResult } from '@mediapipe/tasks-vision';

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
        if (waveCount >= wakeThreshold) {
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
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            zIndex: 50,
            backgroundColor: 'rgba(15, 12, 41, 0.8)', // Dark overlay
            backdropFilter: 'blur(5px)'
        }}>
            <div style={{ animation: 'float 3s ease-in-out infinite' }}>
                <GlassPanel>
                    <h1 style={{
                        fontSize: '4rem',
                        margin: 0,
                        background: 'linear-gradient(to right, #00FFFF, #FF00FF)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 10px rgba(255,0,255,0.5))'
                    }}>
                        Draw in the Air
                    </h1>
                    <p style={{ fontSize: '1.5rem', color: '#fff', marginTop: '20px' }}>
                        Wave your hand to start! 👋
                    </p>

                    {/* Visual Progress */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '30px' }}>
                        {[...Array(wakeThreshold)].map((_, i) => (
                            <div key={i} style={{
                                width: '20px',
                                height: '20px',
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
    );
};
