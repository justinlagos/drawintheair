/**
 * Celebration 2.0 — Bright-sky three-act reward overlay.
 *
 * Three acts, choreographed across `duration`:
 *   1. Build-up   (0-15%): scrim fades in, hero icon flies up
 *   2. Climax     (15-50%): message bursts in, confetti, stars cascade,
 *                           ascending arpeggio fanfare
 *   3. Wind-down  (50-100%): everything holds, then auto-dismisses cleanly
 *
 * Backwards-compatible API — every existing prop on the v1 Celebration
 * still works. New `stars` prop adds 1-3 star earn animation.
 *
 * Performance:
 *   - Confetti is generated once via useMemo, never per-frame
 *   - All animation = transform + opacity (compositor-friendly)
 *   - Honors prefers-reduced-motion (collapses to fade)
 *
 * Persistent-popup bug fix from v1 retained: when parent flips show -> false
 * externally (e.g., dual-timer race), `setVisible(false)` runs in the else
 * branch so the overlay always dismisses cleanly.
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { perf } from '../core/perf';
import { tokens } from '../styles/tokens';
import { KidBadge } from './kid-ui/KidBadge';

interface CelebrationProps {
    show: boolean;
    message: string;
    subMessage?: string;
    icon?: string;
    duration?: number;
    onComplete?: () => void;
    showConfetti?: boolean;
    soundEffect?: boolean;
    /** 0-3. Renders an earn-cascade of star badges. Default 0 (no stars). */
    stars?: 0 | 1 | 2 | 3;
}

interface StaticParticle {
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: string;
    size: number;
    delay: number;
    rotation: number;
}

// Bright-sky confetti — drawn from the kid-bright palette, not the neon v1 set.
const CONFETTI_COLORS = [
    tokens.colors.sunshine,
    tokens.colors.coral,
    tokens.colors.aqua,
    tokens.colors.deepPlum,
    tokens.colors.limeGlow,
    tokens.colors.bubbleBlue,
    tokens.colors.warmOrange,
];

const prefersReducedMotion = (): boolean => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Play an ascending arpeggio (C5 → E5 → G5) instead of v1's single chime.
 * Each note has a soft attack/release envelope so it lands warm, not harsh.
 */
const playArpeggio = () => {
    try {
        const Ctx = window.AudioContext
            || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx({ sampleRate: 44100 });
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        const start = ctx.currentTime;

        notes.forEach((freq, i) => {
            const t0 = start + i * 0.12;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;

            // Soft attack (10ms ramp up) → hold → exponential release
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.18, t0 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);

            osc.start(t0);
            osc.stop(t0 + 0.5);
        });

        // Final shimmer — brief high G to crown the chord
        const shimmer = ctx.createOscillator();
        const sgain = ctx.createGain();
        shimmer.connect(sgain);
        sgain.connect(ctx.destination);
        shimmer.type = 'triangle';
        shimmer.frequency.value = 1567.98; // G6
        const sStart = start + notes.length * 0.12;
        sgain.gain.setValueAtTime(0, sStart);
        sgain.gain.linearRampToValueAtTime(0.08, sStart + 0.02);
        sgain.gain.exponentialRampToValueAtTime(0.001, sStart + 0.6);
        shimmer.start(sStart);
        shimmer.stop(sStart + 0.65);
    } catch {
        // Audio not supported — silent fallback
    }
};

export const Celebration = ({
    show,
    message,
    subMessage,
    icon = '✨',
    duration = 2500,
    onComplete,
    showConfetti = true,
    soundEffect = false,
    stars = 0,
}: CelebrationProps) => {
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<number | undefined>(undefined);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        // setReduced runs once on mount with the actual media-query value;
        // intentional synchronization, not a cascading render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReduced(prefersReducedMotion());
    }, []);

    // Generate confetti when shown. Math.random is impure (React 19 purity
    // rule), so it lives in an effect instead of useMemo. Regenerated each
    // time `show` flips true so every celebration has fresh particles.
    const [particles, setParticles] = useState<StaticParticle[]>([]);
    useEffect(() => {
        if (!show || !showConfetti || reduced) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setParticles([]);
            return;
        }
        const perfConfig = perf.getConfig();
        const count = Math.min(perfConfig.maxParticles, 36);
        const next: StaticParticle[] = Array.from({ length: count }, () => ({
            x: 35 + Math.random() * 30,
            y: 35 + Math.random() * 12,
            dx: (Math.random() - 0.5) * 80,
            dy: Math.random() * 60 + 25,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            size: Math.random() * 8 + 5,
            delay: Math.random() * 0.2,
            rotation: 360 + Math.random() * 540,
        }));
        setParticles(next);
    }, [show, showConfetti, reduced]);

    // Single lifecycle effect: visible state, arpeggio timing, auto-dismiss.
    // Consolidated so there's only one source of truth for show transitions.
    useEffect(() => {
        if (show) {
            // Synchronizing visible with show — intentional state follow.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setVisible(true);

            // Arpeggio plays at the climax (~12% into duration), not on build-up.
            let arpeggioTimer: number | undefined;
            if (soundEffect && !reduced) {
                arpeggioTimer = window.setTimeout(
                    playArpeggio,
                    Math.max(0, Math.round(duration * 0.12)),
                );
            }

            // Auto-dismiss timer — fires onComplete and hides the overlay.
            timerRef.current = window.setTimeout(() => {
                setVisible(false);
                onCompleteRef.current?.();
            }, duration);

            return () => {
                if (arpeggioTimer) clearTimeout(arpeggioTimer);
                if (timerRef.current) clearTimeout(timerRef.current);
            };
        }

        // show flipped false — parent dismissed externally. Cancel any
        // pending timers and hide the overlay so the popup doesn't persist
        // (the Batch 1 bug fix preserved here).
        if (timerRef.current) clearTimeout(timerRef.current);
        setVisible(false);
    }, [show, duration, soundEffect, reduced]);

    if (!visible) return null;

    // ─── Style helpers ─────────────────────────────────────────────────
    const cardStyle: CSSProperties = {
        position: 'relative',
        textAlign: 'center',
        padding: 'clamp(28px, 5vw, 56px)',
        maxWidth: 'min(560px, 90vw)',
        background: tokens.semantic.bgPanel,
        borderRadius: tokens.radius.xxl,
        border: `2px solid ${tokens.semantic.borderPanel}`,
        boxShadow: tokens.shadow.modal,
        opacity: 0,
        willChange: 'transform, opacity',
        animation: reduced
            ? 'celebFadeIn 0.2s ease forwards'
            : 'celebCardClimax 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.12s forwards',
    };

    const iconStyle: CSSProperties = {
        display: 'inline-block',
        fontSize: 'clamp(3.2rem, 12vw, 5.5rem)',
        marginBottom: tokens.spacing.lg,
        animation: reduced ? undefined : 'celebIconBuildUp 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, celebIconBob 1.6s ease 0.55s infinite',
        opacity: 0,
        willChange: 'transform, opacity',
    };

    const messageStyle: CSSProperties = {
        fontFamily: tokens.fontFamily.display,
        fontSize: 'clamp(2rem, 7vw, 3.5rem)',
        fontWeight: tokens.fontWeight.bold,
        color: tokens.semantic.primary,
        marginBottom: subMessage ? tokens.spacing.md : 0,
        lineHeight: tokens.lineHeight.tight,
        wordBreak: 'break-word',
        letterSpacing: tokens.letterSpacing.tight,
    };

    const subMessageStyle: CSSProperties = {
        fontFamily: tokens.fontFamily.body,
        fontSize: 'clamp(1.05rem, 3.5vw, 1.6rem)',
        color: tokens.semantic.textPrimary,
        fontWeight: tokens.fontWeight.semibold,
        lineHeight: tokens.lineHeight.normal,
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: tokens.zIndex.celebration,
                pointerEvents: 'none',
            }}
        >
            {/* Sky-tint scrim — soft, not heavy. Fades in during build-up. */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(190, 235, 255, 0.55)',
                    animation: 'celebFadeIn 0.32s ease forwards',
                }}
            />

            {/* Confetti — climax timing, runs through wind-down */}
            {showConfetti && !reduced && particles.map((p, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        borderRadius: '40%',
                        background: p.color,
                        opacity: 0,
                        willChange: 'transform, opacity',
                        animation: `celebConfetti ${(duration / 1000).toFixed(2)}s ease-out ${p.delay + 0.15}s forwards`,
                        // CSS custom properties (typed via index signature) for per-particle physics
                        ['--dx' as never]: `${p.dx}vw`,
                        ['--dy' as never]: `${p.dy}vh`,
                        ['--cr' as never]: `${p.rotation}deg`,
                    }}
                />
            ))}

            <div style={cardStyle}>
                <div aria-hidden style={iconStyle}>{icon}</div>

                <div style={messageStyle}>{message}</div>

                {subMessage && <div style={subMessageStyle}>{subMessage}</div>}

                {stars > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: tokens.spacing.md,
                            marginTop: tokens.spacing.xl,
                        }}
                    >
                        {[1, 2, 3].map((slot) => (
                            <div
                                key={slot}
                                style={{
                                    opacity: 0,
                                    animation: reduced
                                        ? 'celebFadeIn 0.2s ease forwards'
                                        : `celebStarEarn 0.5s cubic-bezier(0.5, 1.8, 0.6, 1) ${0.4 + slot * 0.18}s forwards`,
                                }}
                            >
                                <KidBadge
                                    shape="star"
                                    tone={slot <= stars ? 'sunshine' : 'plum'}
                                    earned={slot <= stars}
                                    size="lg"
                                    ariaLabel={slot <= stars ? `Star ${slot} earned` : `Star ${slot} not earned`}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Keyframes scoped to this overlay */}
            <style>{`
                @keyframes celebFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes celebCardClimax {
                    0%   { transform: scale(0.4) translateY(40px); opacity: 0; }
                    55%  { transform: scale(1.06) translateY(-4px); opacity: 1; }
                    80%  { transform: scale(0.98); opacity: 1; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                @keyframes celebIconBuildUp {
                    0%   { transform: translateY(60px) scale(0.5); opacity: 0; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes celebIconBob {
                    0%, 100% { transform: translateY(0); }
                    50%      { transform: translateY(-12px); }
                }
                @keyframes celebStarEarn {
                    0%   { transform: scale(0.2) rotate(-30deg); opacity: 0; }
                    60%  { transform: scale(1.25) rotate(8deg); opacity: 1; }
                    100% { transform: scale(1) rotate(0); opacity: 1; }
                }
                @keyframes celebConfetti {
                    0%   { opacity: 1; transform: translate(0, 0) scale(1) rotate(0); }
                    75%  { opacity: 0.85; }
                    100% {
                        opacity: 0;
                        transform: translate(var(--dx), var(--dy)) scale(0.35) rotate(var(--cr));
                    }
                }
            `}</style>
        </div>
    );
};
