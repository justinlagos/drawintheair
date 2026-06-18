/**
 * WarmupTutorial — learn by doing, not by watching.
 *
 * Offered (not forced) right after the wave gate: "Quick warm-up? Pop 3
 * balloons!" Each balloon teaches one core gesture — wave, point, pinch —
 * so by the time the child reaches the menu they're fluent, with zero
 * reading and a guaranteed first success. Completing it IS the activation
 * event (mode_completed), the thing the whole funnel optimises toward.
 *
 * Gesture detection is delegated to the pure, tested warmupLogic module;
 * this component only samples the live frame and renders balloons.
 */

import React, { useEffect, useRef, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { logEvent } from '../../lib/analytics';
import type { TrackingFrameData } from '../tracking/TrackingLayer';
import {
    advanceWarmup,
    createWarmupState,
    WARMUP_STEPS,
    type WarmupGesture,
    type WarmupState,
} from './warmupLogic';

interface WarmupTutorialProps {
    frameRef: React.MutableRefObject<TrackingFrameData>;
    onComplete: () => void;
    onSkip: () => void;
    isCompact?: boolean;
}

const PROMPTS: Record<WarmupGesture, { verb: string; emoji: string }> = {
    wave: { verb: 'Wave to pop it!', emoji: '👋' },
    point: { verb: 'Hold still and point!', emoji: '☝️' },
    pinch: { verb: 'Pinch to pop it!', emoji: '🤏' },
};

const BALLOON_COLORS = [tokens.colors.coral, tokens.colors.aqua, tokens.colors.sunshine];

export const WarmupTutorial: React.FC<WarmupTutorialProps> = ({
    frameRef,
    onComplete,
    onSkip,
    isCompact = false,
}) => {
    const [phase, setPhase] = useState<'offer' | 'playing' | 'done'>('offer');
    const [stepIndex, setStepIndex] = useState(0);
    const stateRef = useRef<WarmupState | null>(null);
    const startedAt = useRef<number>(0);
    const loggedSteps = useRef<Set<number>>(new Set());

    useEffect(() => {
        logEvent('tutorial_offered');
    }, []);

    // Gesture sampling loop — runs only while playing.
    useEffect(() => {
        if (phase !== 'playing') return;
        let raf = 0;
        let running = true;

        const tick = () => {
            if (!running) return;
            const now = Date.now();
            const fd = frameRef.current;
            const indexX = fd.results?.landmarks?.[0]?.[8]?.x ?? null;
            const prev = stateRef.current ?? createWarmupState(now);
            const next = advanceWarmup(
                prev,
                { hasHand: fd.hasHand, indexX, pinchActive: fd.pinchActive },
                now,
            );
            stateRef.current = next;

            if (next.stepIndex !== prev.stepIndex && !loggedSteps.current.has(prev.stepIndex)) {
                loggedSteps.current.add(prev.stepIndex);
                logEvent('tutorial_step_completed', {
                    meta: { gesture: WARMUP_STEPS[prev.stepIndex] },
                });
            }
            if (next.stepIndex !== stepIndex) setStepIndex(next.stepIndex);

            if (next.completed) {
                logEvent('mode_completed', {
                    game_mode: 'tutorial',
                    value_number: now - startedAt.current,
                    meta: { activation: true },
                });
                logEvent('tutorial_completed', { value_number: now - startedAt.current });
                setPhase('done');
                window.setTimeout(onComplete, 1900);
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => {
            running = false;
            cancelAnimationFrame(raf);
        };
    }, [phase, frameRef, onComplete, stepIndex]);

    const start = () => {
        startedAt.current = Date.now();
        stateRef.current = createWarmupState(startedAt.current);
        logEvent('tutorial_started');
        logEvent('mode_started', { game_mode: 'tutorial' });
        setPhase('playing');
    };

    const skip = () => {
        logEvent('tutorial_skipped');
        onSkip();
    };

    // Derived from state (not the ref) so render stays pure.
    const activeGesture: WarmupGesture | null = WARMUP_STEPS[stepIndex] ?? null;

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 70,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isCompact ? 16 : 24,
                background:
                    'linear-gradient(180deg, #BEEBFF 0%, #DEF5FF 35%, #FFF6E5 75%, #FFFAEB 100%)',
                fontFamily: tokens.fontFamily.body,
                padding: 20,
                textAlign: 'center',
            }}
        >
            {phase === 'offer' && (
                <div
                    style={{
                        background: '#fff',
                        borderRadius: 28,
                        padding: isCompact ? '28px 24px' : '40px 48px',
                        maxWidth: 460,
                        boxShadow: '0 20px 50px rgba(108,63,164,0.22)',
                    }}
                >
                    <div style={{ fontSize: isCompact ? '3rem' : '4rem' }}>🎈🎈🎈</div>
                    <h2
                        style={{
                            fontFamily: tokens.fontFamily.display,
                            fontSize: isCompact ? '1.6rem' : '2rem',
                            color: tokens.colors.charcoal,
                            margin: '8px 0 4px',
                        }}
                    >
                        Quick warm-up?
                    </h2>
                    <p style={{ color: tokens.colors.charcoal, opacity: 0.75, margin: '0 0 20px' }}>
                        Pop 3 balloons with your hand — it takes 20 seconds.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={start} style={primaryBtn}>
                            Let's go! 🎈
                        </button>
                        <button onClick={skip} style={ghostBtn}>
                            Skip for now
                        </button>
                    </div>
                </div>
            )}

            {phase === 'playing' && (
                <>
                    <p
                        style={{
                            fontFamily: tokens.fontFamily.display,
                            fontSize: isCompact ? '1.4rem' : '1.8rem',
                            fontWeight: 700,
                            color: tokens.colors.charcoal,
                            margin: 0,
                        }}
                    >
                        {activeGesture
                            ? `${PROMPTS[activeGesture].emoji} ${PROMPTS[activeGesture].verb}`
                            : 'Great!'}
                    </p>
                    <div style={{ display: 'flex', gap: isCompact ? 18 : 32 }}>
                        {WARMUP_STEPS.map((g, i) => {
                            const popped = i < stepIndex;
                            const active = i === stepIndex;
                            return (
                                <div
                                    key={g}
                                    aria-label={popped ? `${g} balloon popped` : `${g} balloon`}
                                    style={{
                                        width: isCompact ? 64 : 92,
                                        height: isCompact ? 80 : 116,
                                        borderRadius: '50% 50% 50% 50% / 46% 46% 54% 54%',
                                        background: popped
                                            ? 'transparent'
                                            : `radial-gradient(circle at 35% 30%, #ffffffcc, ${BALLOON_COLORS[i]})`,
                                        boxShadow: popped ? 'none' : `0 10px 24px ${BALLOON_COLORS[i]}66`,
                                        opacity: popped ? 0 : 1,
                                        transform: active ? 'scale(1.12)' : 'scale(1)',
                                        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: isCompact ? '1.6rem' : '2.2rem',
                                        animation: active && !popped ? 'wt-bob 1.4s ease-in-out infinite' : 'none',
                                    }}
                                >
                                    {popped ? '✨' : PROMPTS[g].emoji}
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={skip} style={{ ...ghostBtn, opacity: 0.6 }}>
                        Skip
                    </button>
                </>
            )}

            {phase === 'done' && (
                <div style={{ fontSize: isCompact ? '1.8rem' : '2.4rem', fontWeight: 800, color: tokens.colors.charcoal }}>
                    🎉 You did it! 🎉
                </div>
            )}

            <style>{`
                @keyframes wt-bob {
                    0%, 100% { transform: translateY(0) scale(1.12); }
                    50% { transform: translateY(-10px) scale(1.12); }
                }
            `}</style>
        </div>
    );
};

const primaryBtn: React.CSSProperties = {
    appearance: 'none',
    border: 'none',
    borderRadius: 9999,
    padding: '14px 28px',
    fontWeight: 800,
    fontSize: '1.05rem',
    cursor: 'pointer',
    background: tokens.colors.deepPlum,
    color: '#fff',
    fontFamily: tokens.fontFamily.body,
};
const ghostBtn: React.CSSProperties = {
    appearance: 'none',
    background: 'transparent',
    border: `2px solid ${tokens.colors.deepPlum}33`,
    borderRadius: 9999,
    padding: '12px 22px',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    color: tokens.colors.deepPlum,
    fontFamily: tokens.fontFamily.body,
};
