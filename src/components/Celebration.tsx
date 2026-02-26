/**
 * Celebration Component — Performance-Optimised
 *
 * Renders a brief celebration overlay on task completion.
 * Rules:
 *   - NO backdrop-filter / blur
 *   - NO box-shadow on animated elements
 *   - NO setParticles per frame (was causing React rerenders every frame)
 *   - Confetti rendered via lightweight CSS-only animation (no JS per-frame updates)
 *   - transform + opacity only for animations
 *   - pointer-events: none
 *   - Auto-dismisses after `duration`
 */

import { useEffect, useState, useRef, useMemo } from 'react';
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

interface StaticParticle {
    x: number;   // 0-100 start x %
    y: number;   // start y %
    dx: number;  // end x offset %
    dy: number;  // end y offset %
    color: string;
    size: number;
    delay: number; // animation-delay seconds
}

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#FF6B9D', '#95E1D3'];

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
    const timerRef = useRef<number | undefined>(undefined);

    // Generate confetti once when shown — never updated per frame
    const particles = useMemo<StaticParticle[]>(() => {
        if (!show || !showConfetti) return [];
        const perfConfig = perf.getConfig();
        const count = Math.min(perfConfig.maxParticles, 30); // Cap at 30 for perf
        return Array.from({ length: count }, () => ({
            x: 40 + Math.random() * 20,  // cluster near center
            y: 35 + Math.random() * 10,
            dx: (Math.random() - 0.5) * 60,
            dy: Math.random() * 50 + 20,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            size: Math.random() * 6 + 4,
            delay: Math.random() * 0.15,
        }));
    }, [show, showConfetti]);

    // Play sound effect
    const playSound = () => {
        if (!soundEffect) return;
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx({ sampleRate: 44100 });
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch {
            // Sound not supported
        }
    };

    useEffect(() => {
        if (show) {
            setVisible(true);
            if (soundEffect) playSound();

            timerRef.current = window.setTimeout(() => {
                setVisible(false);
                onComplete?.();
            }, duration);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [show, duration, onComplete, soundEffect]);

    if (!visible) return null;

    const durationSec = (duration / 1000).toFixed(2);

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
            pointerEvents: 'none',
        }}>
            {/* Semi-transparent scrim — no blur */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                animation: `celebFadeIn 0.3s ease forwards`,
            }} />

            {/* Confetti — pure CSS animations, zero JS per-frame updates */}
            {showConfetti && particles.map((p, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        borderRadius: '50%',
                        background: p.color,
                        opacity: 0,
                        willChange: 'transform, opacity',
                        animation: `celebConfetti ${durationSec}s ease-out ${p.delay}s forwards`,
                        // CSS custom properties for per-particle end positions
                        ['--dx' as any]: `${p.dx}vw`,
                        ['--dy' as any]: `${p.dy}vh`,
                    }}
                />
            ))}

            {/* Main message panel — no blur, no box-shadow */}
            <div style={{
                position: 'relative',
                textAlign: 'center',
                padding: 'clamp(24px, 5vw, 48px)',
                maxWidth: '90vw',
                background: 'linear-gradient(145deg, rgba(20,16,50,0.92) 0%, rgba(10,8,30,0.85) 100%)',
                borderRadius: '28px',
                border: '1.5px solid rgba(255,255,255,0.15)',
                opacity: 0,
                willChange: 'transform, opacity',
                animation: 'celebPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}>
                <div style={{
                    fontSize: 'clamp(3rem, 12vw, 5.5rem)',
                    marginBottom: 'clamp(12px, 3vw, 24px)',
                    animation: 'celebBounce 0.8s ease infinite',
                }}>
                    {icon}
                </div>
                <div style={{
                    fontSize: 'clamp(1.75rem, 7vw, 3.5rem)',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #FFD93D 0%, #FFE580 50%, #FFD93D 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: 'clamp(8px, 2vw, 16px)',
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                    letterSpacing: '-0.5px',
                }}>
                    {message}
                </div>
                {subMessage && (
                    <div style={{
                        fontSize: 'clamp(1rem, 4vw, 2rem)',
                        color: 'rgba(255,255,255,0.9)',
                        fontWeight: 600,
                        lineHeight: 1.3,
                    }}>
                        {subMessage}
                    </div>
                )}
            </div>

            {/* CSS keyframes — all transform + opacity only */}
            <style>{`
                @keyframes celebFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes celebPop {
                    0% {
                        transform: scale(0.5);
                        opacity: 0;
                    }
                    60% {
                        transform: scale(1.05);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                @keyframes celebBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-15px); }
                }
                @keyframes celebConfetti {
                    0% {
                        opacity: 1;
                        transform: translate(0, 0) scale(1);
                    }
                    70% {
                        opacity: 0.8;
                    }
                    100% {
                        opacity: 0;
                        transform: translate(var(--dx), var(--dy)) scale(0.3);
                    }
                }
            `}</style>
        </div>
    );
};
