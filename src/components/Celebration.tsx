/**
 * Celebration Component - Enhanced with Confetti
 * 
 * Reusable celebration animation for completed tasks
 * Central, exciting, with confetti burst
 */

import { useEffect, useState, useRef } from 'react';
import { perf } from '../core/perf';

interface CelebrationProps {
    show: boolean;
    message: string;
    subMessage?: string;
    icon?: string;
    duration?: number;
    onComplete?: () => void;
    showConfetti?: boolean;
    soundEffect?: boolean;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}

export const Celebration = ({
    show,
    message,
    subMessage,
    icon = '✨',
    duration = 2500,
    onComplete,
    showConfetti = true,
    soundEffect = false
}: CelebrationProps) => {
    const [visible, setVisible] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Play sound effect (using Web Audio API)
    const playSound = () => {
        if (!soundEffect) return;
        try {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (!AudioContextClass) return;
            
            const audioContext = new AudioContextClass({ sampleRate: 44100 });
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Sound not supported or blocked
        }
    };

    useEffect(() => {
        if (show) {
            setVisible(true);
            if (soundEffect) playSound();
            
            // Generate confetti particles (reduced count on low tier)
            if (showConfetti) {
                const perfConfig = perf.getConfig();
                const particleCount = perfConfig.maxParticles;
                const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#FF6B9D', '#95E1D3'];
                const newParticles: Particle[] = Array.from({ length: particleCount }, () => ({
                    x: 0.5,
                    y: 0.5,
                    vx: (Math.random() - 0.5) * 0.03,
                    vy: (Math.random() - 0.5) * 0.03 - 0.02,
                    life: 1,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: Math.random() * 8 + 4
                }));
                setParticles(newParticles);
            }

            // Animate particles
            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;

                if (showConfetti) {
                    setParticles(prev => prev.map(p => ({
                        ...p,
                        x: p.x + p.vx,
                        y: p.y + p.vy,
                        vy: p.vy + 0.0005, // Gravity
                        life: Math.max(0, 1 - progress)
                    })));
                }

                if (progress < 1) {
                    animationFrameRef.current = requestAnimationFrame(animate);
                } else {
                    setVisible(false);
                    if (onComplete) onComplete();
                }
            };
            animationFrameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [show, duration, onComplete, showConfetti, soundEffect]);

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
            {/* Confetti particles */}
            {showConfetti && particles.map((p, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${p.x * 100}%`,
                        top: `${p.y * 100}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        background: p.color,
                        borderRadius: '50%',
                        opacity: p.life,
                        transform: `translate(-50%, -50%) scale(${p.life}) rotate(${p.life * 360}deg)`,
                        boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                        transition: 'opacity 0.05s ease'
                    }}
                />
            ))}

            {/* Main message - Center of screen */}
            <div style={{
                textAlign: 'center',
                animation: 'celebrationPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: 'translateY(-10vh)',
                padding: 'clamp(16px, 4vw, 32px)',
                maxWidth: '90vw'
            }}>
                <div style={{
                    fontSize: 'clamp(3rem, 12vw, 6rem)',
                    marginBottom: 'clamp(12px, 3vw, 24px)',
                    filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.9))',
                    animation: 'bounce 0.8s ease infinite'
                }}>
                    {icon}
                </div>
                <div style={{
                    fontSize: 'clamp(1.75rem, 8vw, 4rem)',
                    fontWeight: 'bold',
                    color: '#FFD700',
                    textShadow: '0 0 40px #FFD700, 0 0 60px #FFA500',
                    marginBottom: 'clamp(8px, 2vw, 16px)',
                    animation: 'glowPulse 1s ease infinite',
                    lineHeight: 1.2,
                    wordBreak: 'break-word'
                }}>
                    {message}
                </div>
                {subMessage && (
                    <div style={{
                        fontSize: 'clamp(1rem, 4vw, 2rem)',
                        color: 'white',
                        textShadow: '0 0 20px rgba(255, 255, 255, 0.8)',
                        fontWeight: 600,
                        lineHeight: 1.3
                    }}>
                        {subMessage}
                    </div>
                )}
            </div>

            {/* CSS animations */}
            <style>{`
                @keyframes celebrationPop {
                    0% {
                        transform: translateY(-10vh) scale(0);
                        opacity: 0;
                    }
                    60% {
                        transform: translateY(-10vh) scale(1.1);
                    }
                    100% {
                        transform: translateY(-10vh) scale(1);
                        opacity: 1;
                    }
                }
                
                @keyframes bounce {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-20px);
                    }
                }
                
                @keyframes glowPulse {
                    0%, 100% {
                        text-shadow: 0 0 40px #FFD700, 0 0 60px #FFA500;
                    }
                    50% {
                        text-shadow: 0 0 60px #FFD700, 0 0 80px #FFA500, 0 0 100px #FFD700;
                    }
                }
            `}</style>
        </div>
    );
};
