/**
 * AmbientWarmup — the no-modal warm-up (flag: ambientWarmupV1).
 *
 * Three balloons drift up over the activity menu for first-time devices.
 * No card, no buttons, no reading: pop them (pinch, touch-and-hold, or
 * tap) or ignore them and pick an activity. Popping all three is the
 * guaranteed first success — it fires the same activation events the old
 * "Quick warm-up?" interstitial fired (mode_completed game_mode:'tutorial'
 * with meta.activation), which is also what triggers SaveProgressNudge
 * for anonymous /play visitors.
 *
 * Rendering rules (product principles):
 *   • container is pointer-events:none — the menu stays fully usable;
 *   • balloon motion is driven imperatively in the rAF loop (transform
 *     updates on refs) — NO React state updates per frame;
 *   • gesture logic is delegated to the pure, tested ambientWarmupLogic.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { logEvent } from '../../lib/analytics';
import { tokens } from '../../styles/tokens';
import type { TrackingFrameData } from '../tracking/TrackingLayer';
import {
    advanceAmbientWarmup,
    balloonCenterAt,
    BALLOON_RADIUS_PX,
    createAmbientWarmupState,
    popBalloon,
    type AmbientWarmupState,
} from './ambientWarmupLogic';

interface AmbientWarmupProps {
    frameRef: React.MutableRefObject<TrackingFrameData>;
    /** Called ~1.6s after the third pop (celebration plays first). */
    onComplete: () => void;
}

const BALLOON_COLORS = [tokens.colors.coral, tokens.colors.aqua, tokens.colors.sunshine];

export const AmbientWarmup: React.FC<AmbientWarmupProps> = ({ frameRef, onComplete }) => {
    const stateRef = useRef<AmbientWarmupState | null>(null);
    const balloonEls = useRef<Array<HTMLDivElement | null>>([]);
    const startedRef = useRef(false);
    const [poppedIds, setPoppedIds] = useState<number[]>([]);
    const [done, setDone] = useState(false);

    useEffect(() => {
        logEvent('tutorial_offered', { meta: { variant: 'ambient' } });
    }, []);

    // Shared pop bookkeeping for both input paths (hand loop + pointer).
    const handleResult = (poppedNow: number[], justCompleted: boolean) => {
        if (poppedNow.length === 0) return;
        if (!startedRef.current) {
            startedRef.current = true;
            logEvent('tutorial_started', { meta: { variant: 'ambient' } });
            logEvent('mode_started', { game_mode: 'tutorial', meta: { variant: 'ambient' } });
        }
        for (const id of poppedNow) {
            logEvent('tutorial_step_completed', { meta: { variant: 'ambient', balloon: id } });
        }
        setPoppedIds(prev => [...prev, ...poppedNow]);
        if (justCompleted) {
            const s = stateRef.current;
            const durationMs = s?.completedAt != null && s.balloons[0]
                ? s.completedAt - s.balloons[0].spawnedAt
                : undefined;
            logEvent('mode_completed', {
                game_mode: 'tutorial',
                value_number: durationMs,
                meta: { activation: true, variant: 'ambient' },
            });
            logEvent('tutorial_completed', {
                value_number: durationMs,
                meta: { variant: 'ambient' },
            });
            setDone(true);
            window.setTimeout(onComplete, 1600);
        }
    };
    const handleResultRef = useRef(handleResult);
    useEffect(() => { handleResultRef.current = handleResult; });

    // Hand-tracking loop: sample the fingertip exactly the way the menu's
    // dwell cursor does (landmarks[0][8] × viewport), advance the pure
    // state machine, and write balloon transforms imperatively.
    useEffect(() => {
        let raf = 0;
        let running = true;

        const tick = () => {
            if (!running) return;
            const now = Date.now();
            const viewport = { width: window.innerWidth, height: window.innerHeight };
            const prev = stateRef.current ?? createAmbientWarmupState(now);

            const fd = frameRef.current;
            const tip = fd.results?.landmarks?.[0]?.[8];
            const result = advanceAmbientWarmup(
                prev,
                {
                    cursorX: tip ? tip.x * viewport.width : null,
                    cursorY: tip ? tip.y * viewport.height : null,
                    pinchActive: Boolean(fd.pinchActive),
                },
                now,
                viewport,
            );
            stateRef.current = result.state;
            if (result.poppedIds.length > 0) {
                handleResultRef.current(result.poppedIds, result.justCompleted);
            }

            // Imperative positioning — no React re-render per frame.
            for (const b of result.state.balloons) {
                const el = balloonEls.current[b.id];
                if (!el) continue;
                const c = balloonCenterAt(b, now, viewport);
                if (!c) {
                    if (!b.popped) el.style.opacity = '0';
                    continue;
                }
                el.style.opacity = '1';
                el.style.transform =
                    `translate(${c.x - BALLOON_RADIUS_PX}px, ${c.y - BALLOON_RADIUS_PX}px)`;
            }

            if (!result.state.completed) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => {
            running = false;
            cancelAnimationFrame(raf);
        };
    }, [frameRef]);

    // Pointer fallback (mouse / touch): tapping a balloon pops it too.
    const onBalloonPointerDown = useCallback((id: number) => {
        const now = Date.now();
        const prev = stateRef.current ?? createAmbientWarmupState(now);
        const result = popBalloon(prev, id, now);
        stateRef.current = result.state;
        handleResultRef.current(result.poppedIds, result.justCompleted);
    }, []);

    return (
        <div
            aria-hidden
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 55,           // above menu content (50), below dialogs
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        >
            <style>{`
                @keyframes dita-ambient-pop {
                    0%   { transform: scale(1);   opacity: 1; }
                    45%  { transform: scale(1.6); opacity: 0.9; }
                    100% { transform: scale(0.1); opacity: 0; }
                }
            `}</style>
            {[0, 1, 2].map(id => {
                const popped = poppedIds.includes(id);
                return (
                    <div
                        key={id}
                        ref={el => { balloonEls.current[id] = el; }}
                        onPointerDown={() => onBalloonPointerDown(id)}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: BALLOON_RADIUS_PX * 2,
                            height: BALLOON_RADIUS_PX * 2,
                            opacity: 0,
                            pointerEvents: popped || done ? 'none' : 'auto',
                            cursor: 'pointer',
                            willChange: 'transform',
                        }}
                    >
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50% 50% 48% 48%',
                                background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.25) 18%, ${BALLOON_COLORS[id]} 55%)`,
                                boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 26,
                                animation: popped ? 'dita-ambient-pop 420ms ease-out forwards' : undefined,
                            }}
                        >
                            {id === 2 ? '🤏' : ''}
                        </div>
                        {/* String */}
                        {!popped && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '96%',
                                    width: 2,
                                    height: 26,
                                    background: 'rgba(0,0,0,0.18)',
                                    borderRadius: 1,
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
