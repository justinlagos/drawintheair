/**
 * Celebration Component
 * 
 * Reusable celebration animation for completed tasks
 */

import { useEffect, useState } from 'react';

interface CelebrationProps {
    show: boolean;
    message: string;
    subMessage?: string;
    icon?: string;
    duration?: number;
    onComplete?: () => void;
}

export const Celebration = ({
    show,
    message,
    subMessage,
    icon = '✨',
    duration = 2000,
    onComplete
}: CelebrationProps) => {
    const [visible, setVisible] = useState(false);
    const [particles, setParticles] = useState<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([]);

    useEffect(() => {
        if (show) {
            setVisible(true);
            
            // Generate particles
            const newParticles = Array.from({ length: 30 }, () => ({
                x: 0.5,
                y: 0.5,
                vx: (Math.random() - 0.5) * 0.02,
                vy: (Math.random() - 0.5) * 0.02 - 0.01,
                life: 1
            }));
            setParticles(newParticles);

            // Animate particles
            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;

                setParticles(prev => prev.map(p => ({
                    ...p,
                    x: p.x + p.vx,
                    y: p.y + p.vy,
                    life: Math.max(0, 1 - progress)
                })));

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setVisible(false);
                    if (onComplete) onComplete();
                }
            };
            requestAnimationFrame(animate);
        }
    }, [show, duration, onComplete]);

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            pointerEvents: 'none'
        }}>
            {/* Particles */}
            {particles.map((p, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${p.x * 100}%`,
                        top: `${p.y * 100}%`,
                        fontSize: '2rem',
                        opacity: p.life,
                        transform: `translate(-50%, -50%) scale(${p.life})`,
                        transition: 'opacity 0.1s ease'
                    }}
                >
                    ✨
                </div>
            ))}

            {/* Main message */}
            <div style={{
                textAlign: 'center',
                animation: 'bounce 0.5s ease infinite'
            }}>
                <div style={{
                    fontSize: '5rem',
                    marginBottom: '20px',
                    filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))'
                }}>
                    {icon}
                </div>
                <div style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: '#FFD700',
                    textShadow: '0 0 30px #FFD700',
                    marginBottom: '10px'
                }}>
                    {message}
                </div>
                {subMessage && (
                    <div style={{
                        fontSize: '1.5rem',
                        color: 'white',
                        textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                    }}>
                        {subMessage}
                    </div>
                )}
            </div>
        </div>
    );
};

