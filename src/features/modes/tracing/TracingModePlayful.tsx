/**
 * TracingModePlayful — HUD shell for the redesigned (V2) tracing experience.
 *
 * Mounted only when `tracingPlayfulUiV1` is ON (App falls back to the legacy
 * PreWritingMode otherwise). The canvas track + vehicle are drawn by the
 * shared engine via the TrackingLayer onFrame adapter (tracingPlayfulFrame);
 * this component owns only the lightweight DOM HUD: a compact activity card,
 * a calm progress bar, ONE contextual coaching line, and the restart control,
 * plus the completion celebration + auto-advance.
 */

import { useEffect, useRef, useState } from 'react';
import { Celebration } from '../../../components/Celebration';
import { GameTopBar } from '../../../components/GameTopBar';
import { KidPanel, KidButton, KidObjectiveCard } from '../../../components/kid-ui';
import { tokens } from '../../../styles/tokens';
import { getCurrentPath, getCurrentPackProgress } from './tracingProgress';
import { getActivitiesByPack, PACK_INFO } from './tracingActivities';
import {
    initPlayfulTracing,
    setPlayfulCompletionCallback,
    resetPlayfulLevel,
    reloadPlayfulActivity,
    nextPlayfulLevel,
    getPlayfulSnapshot,
    playfulInitFailed,
} from './tracingPlayfulFrame';
import { featureFlags } from '../../../core/featureFlags';
import { logEvent } from '../../../lib/analytics';

interface Props {
    onExit?: () => void;
}

const CATEGORY: Record<string, string> = {
    prewriting: 'Tracing',
    shape: 'Shape',
    letter: 'Letter',
    number: 'Number',
};

const RESTART_LABEL: Record<string, string> = {
    prewriting: 'Restart',
    shape: 'Restart Shape',
    letter: 'Restart Letter',
    number: 'Restart Number',
};

export const TracingModePlayful = ({ onExit }: Props = {}) => {
    const [progress, setProgress] = useState(0);
    const [label, setLabel] = useState('');
    const [type, setType] = useState<string>('letter');
    const [pack, setPack] = useState(1);
    const [strokeIndex, setStrokeIndex] = useState(0);
    const [totalStrokes, setTotalStrokes] = useState(1);
    const [message, setMessage] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);

    const isCompact = typeof window !== 'undefined' && window.innerWidth <= 900;
    const celebratingRef = useRef(false);
    const advanceRef = useRef<number | undefined>(undefined);
    // Transition trackers so telemetry fires on edges only (React layer,
    // never the 60fps frame loop).
    const prevActivityRef = useRef('');
    const prevStrokeRef = useRef(0);
    const prevCoachRef = useRef<string | null>(null);

    // Init engine + completion bridge + one-time engine-version telemetry.
    useEffect(() => {
        initPlayfulTracing(window.innerWidth, window.innerHeight);

        // Init-failure fallback: if the V2 engine could not initialise, log it
        // and disable the flag so App swaps back to the legacy experience
        // BEFORE gameplay begins (no code rollback needed).
        if (playfulInitFailed()) {
            console.error('[TracingModePlayful] V2 init failed — falling back to legacy PreWritingMode');
            featureFlags.setFlags({ tracingPlayfulUiV1: false });
            return;
        }

        const path = getCurrentPath();
        if (path) setLabel(path.name);

        // Record which engine the child is on (legacy vs playful_v1) — fired
        // once here in the React layer, never from the render loop.
        logEvent('feature_flag_exposed', {
            meta: { flag_name: 'tracingPlayfulUiV1', variant: 'playful_v1' },
        });

        setPlayfulCompletionCallback(() => {
            if (celebratingRef.current) return;
            celebratingRef.current = true;
            setShowCelebration(true);
            const snap = getPlayfulSnapshot();
            logEvent('tracing_letter_completed', {
                game_mode: 'pre-writing',
                stage_id: snap?.activityId,
                meta: { tracing_engine: 'playful_v1', strokes: snap?.totalStrokes },
            });
        });

        return () => {
            setPlayfulCompletionCallback(null);
            if (advanceRef.current) clearTimeout(advanceRef.current);
        };
    }, []);

    // Re-init on resize (keeps the safe region + track sized correctly).
    useEffect(() => {
        const onResize = () => initPlayfulTracing(window.innerWidth, window.innerHeight);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Poll the engine snapshot for the HUD (not per animation frame).
    useEffect(() => {
        const id = window.setInterval(() => {
            const snap = getPlayfulSnapshot();
            if (!snap) return;
            setProgress(snap.overallProgress);
            setLabel(snap.label);
            setType(snap.type);
            setStrokeIndex(snap.currentStrokeIndex);
            setTotalStrokes(snap.totalStrokes);
            setMessage(snap.message);
            const path = getCurrentPath();
            if (path) setPack(path.pack);

            // ── Edge-triggered telemetry (React layer, not the frame loop) ──
            if (snap.activityId && snap.activityId !== prevActivityRef.current) {
                prevActivityRef.current = snap.activityId;
                prevStrokeRef.current = snap.currentStrokeIndex;
                logEvent('tracing_activity_loaded', {
                    game_mode: 'pre-writing',
                    stage_id: snap.activityId,
                    meta: { type: snap.type, strokes: snap.totalStrokes, tracing_engine: 'playful_v1' },
                });
            } else if (snap.currentStrokeIndex > prevStrokeRef.current) {
                logEvent('tracing_stroke_completed', {
                    game_mode: 'pre-writing',
                    stage_id: snap.activityId,
                    meta: { stroke: prevStrokeRef.current + 1, tracing_engine: 'playful_v1' },
                });
                prevStrokeRef.current = snap.currentStrokeIndex;
            }

            if (snap.coach === 'offpath' && prevCoachRef.current !== 'offpath') {
                logEvent('tracing_off_path', { game_mode: 'pre-writing', stage_id: snap.activityId });
            } else if (prevCoachRef.current === 'offpath' && snap.coach !== 'offpath' && !snap.completed) {
                logEvent('tracing_recovered', { game_mode: 'pre-writing', stage_id: snap.activityId });
            }
            prevCoachRef.current = snap.coach;
        }, 80);
        return () => window.clearInterval(id);
    }, []);

    const handleCelebrationDone = () => {
        setShowCelebration(false);
        advanceRef.current = window.setTimeout(() => {
            celebratingRef.current = false;
            if (!nextPlayfulLevel()) {
                // All levels done — reload current as a gentle loop.
                reloadPlayfulActivity();
            }
            const path = getCurrentPath();
            if (path) {
                setLabel(path.name);
                setPack(path.pack);
                setProgress(0);
            }
        }, 500);
    };

    const handleRestart = () => {
        resetPlayfulLevel();
        setShowCelebration(false);
        celebratingRef.current = false;
        prevStrokeRef.current = 0;
        prevCoachRef.current = null;
        if (advanceRef.current) clearTimeout(advanceRef.current);
    };

    const packInfo = PACK_INFO[pack] ?? PACK_INFO[1];
    const packProgress = (() => {
        try { return getCurrentPackProgress(); } catch { return { completedLevels: 0, unlockedLevelIndex: 0 } as never; }
    })();
    const packTotal = getActivitiesByPack(pack).length || 1;
    const percent = Math.round(progress * 100);
    const hud = tokens.spacing.lg;

    return (
        <>
            {onExit && <GameTopBar onBack={onExit} compact={isCompact} />}

            {/* TOP-LEFT: compact activity card */}
            <div style={{ position: 'absolute', top: hud, left: hud, zIndex: tokens.zIndex.hud, pointerEvents: 'none', maxWidth: isCompact ? '46%' : 260 }}>
                <KidPanel size={isCompact ? 'sm' : 'md'}>
                    <div style={{ fontFamily: tokens.fontFamily.body, fontSize: tokens.fontSize.caption, color: tokens.semantic.textSecondary, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span>{packInfo.icon}</span><span>{CATEGORY[type] ?? 'Tracing'}</span>
                    </div>
                    <div style={{ fontFamily: tokens.fontFamily.heading, fontWeight: tokens.fontWeight.extrabold, fontSize: isCompact ? '2rem' : '2.6rem', color: tokens.semantic.textPrimary, lineHeight: 1.05, margin: '2px 0 4px' }}>
                        {label}
                    </div>
                    <div style={{ fontFamily: tokens.fontFamily.body, fontSize: tokens.fontSize.caption, color: tokens.semantic.textSecondary }}>
                        {packInfo.name} · {Math.min((packProgress.completedLevels ?? 0) + 1, packTotal)} of {packTotal}
                    </div>
                    {/* Stroke sequence indicator */}
                    {totalStrokes > 1 && (
                        <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                            {Array.from({ length: totalStrokes }).map((_, i) => (
                                <div key={i} style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: i < strokeIndex ? tokens.colors.meadowGreen : i === strokeIndex ? tokens.colors.aqua : 'rgba(108,63,164,0.18)',
                                    transition: 'all 0.3s ease',
                                }} />
                            ))}
                        </div>
                    )}
                </KidPanel>
            </div>

            {/* TOP-CENTER: calm progress bar */}
            <div style={{ position: 'absolute', top: hud, left: '50%', transform: 'translateX(-50%)', zIndex: tokens.zIndex.hud, pointerEvents: 'none' }}>
                <KidPanel size="sm" style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md, padding: `${tokens.spacing.sm} ${tokens.spacing.lg}` }}>
                    <span style={{ fontSize: isCompact ? '1.2rem' : '1.5rem' }}>{percent >= 95 ? '⭐' : '✨'}</span>
                    <div style={{ width: isCompact ? 120 : 220, height: 12, background: 'rgba(108,63,164,0.12)', borderRadius: tokens.radius.pill, overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: `linear-gradient(90deg, ${tokens.colors.aqua}, ${tokens.colors.meadowGreen})`, borderRadius: tokens.radius.pill, transition: 'width 0.18s ease' }} />
                    </div>
                    <span style={{ fontFamily: tokens.fontFamily.heading, fontWeight: tokens.fontWeight.bold, fontSize: tokens.fontSize.button, color: tokens.semantic.primary, minWidth: 48, textAlign: 'right' }}>{percent}%</span>
                </KidPanel>
            </div>

            {/* BOTTOM-CENTER: restart */}
            <div style={{ position: 'absolute', bottom: isCompact ? 12 : 24, left: '50%', transform: 'translateX(-50%)', zIndex: tokens.zIndex.hud }}>
                <KidButton variant="secondary" size="md" onClick={handleRestart} icon={<span>🔄</span>}>
                    {isCompact ? 'Restart' : (RESTART_LABEL[type] ?? 'Restart')}
                </KidButton>
            </div>

            {/* ONE contextual coaching message */}
            {message && !showCelebration && (
                <div style={{ position: 'absolute', bottom: isCompact ? 86 : 110, left: '50%', transform: 'translateX(-50%)', zIndex: tokens.zIndex.hud, pointerEvents: 'none', maxWidth: 'calc(100% - 32px)' }}>
                    <KidObjectiveCard icon="👆">{message}</KidObjectiveCard>
                </div>
            )}

            <Celebration
                show={showCelebration}
                message="Great tracing!"
                subMessage={`You traced ${label}!`}
                icon="⭐"
                duration={1500}
                stars={2}
                showConfetti
                soundEffect
                onComplete={handleCelebrationDone}
            />
        </>
    );
};

export default TracingModePlayful;
