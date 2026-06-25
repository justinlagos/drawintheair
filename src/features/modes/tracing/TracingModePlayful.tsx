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
import { getCurrentPack, getPackProgress, getSections, type SectionInfo } from './playfulProgress';
import {
    initPlayfulTracing,
    setPlayfulCompletionCallback,
    resetPlayfulLevel,
    nextPlayfulLevel,
    getPlayfulSnapshot,
    playfulInitFailed,
    setPlayfulSection,
    setPlayfulActive,
} from './tracingPlayfulFrame';
import { featureFlags } from '../../../core/featureFlags';
import { logEvent } from '../../../lib/analytics';
import { GestureLayer } from '../../../components/GestureLayer';

interface Props {
    onExit?: () => void;
    /**
     * Whether the child may pick a category before tracing. Stated explicitly
     * by the caller (see canonicalTracing.tsx) — never inferred. When false the
     * shell skips the picker and enters `initialSection` directly, and the
     * in-game "Sections" escape is hidden so an assigned category can't be left.
     */
    allowCategorySelection?: boolean;
    /** Section (pack) to enter when category selection is not allowed. */
    initialSection?: number | null;
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

export const TracingModePlayful = ({
    onExit,
    allowCategorySelection = true,
    initialSection = null,
}: Props = {}) => {
    const [progress, setProgress] = useState(0);
    const [label, setLabel] = useState('');
    const [type, setType] = useState<string>('letter');
    const [pack, setPack] = useState(1);
    const [strokeIndex, setStrokeIndex] = useState(0);
    const [totalStrokes, setTotalStrokes] = useState(1);
    const [message, setMessage] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);
    // Start in the category picker only when selection is allowed. When a
    // specific category was assigned, enter the `draw` phase directly.
    const [phase, setPhase] = useState<'sections' | 'draw'>(
        allowCategorySelection ? 'sections' : 'draw',
    );
    const [sections, setSections] = useState<SectionInfo[]>(() => getSections());

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

        // When a category was assigned (no picker), enter it directly and arm
        // the engine. Otherwise the engine stays disarmed until the child picks.
        if (!allowCategorySelection) {
            if (initialSection != null) setPlayfulSection(initialSection, 0);
            setPlayfulActive(true);
        } else {
            setPlayfulActive(false);
        }

        return () => {
            setPlayfulCompletionCallback(null);
            setPlayfulActive(false);
            if (advanceRef.current) clearTimeout(advanceRef.current);
        };
    }, [allowCategorySelection, initialSection]);

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
            setPack(getCurrentPack());

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
            nextPlayfulLevel(); // wraps around — never stuck
            setPack(getCurrentPack());
            setProgress(0);
            setSections(getSections());
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

    const startSection = (p: number) => {
        setPlayfulSection(p, 0);
        setPack(p);
        setProgress(0);
        setShowCelebration(false);
        celebratingRef.current = false;
        prevStrokeRef.current = 0;
        prevActivityRef.current = '';
        prevCoachRef.current = null;
        setSections(getSections());
        // Arm the engine BEFORE switching to the draw phase so the first armed
        // frame already has a section loaded.
        setPlayfulActive(true);
        setPhase('draw');
    };

    if (phase === 'sections') {
        return <SectionPicker sections={sections} onPick={startSection} onExit={onExit} />;
    }

    const section = sections.find((s) => s.pack === pack) ?? sections[0];
    const pp = getPackProgress(pack);
    const packTotal = pp.total || 1;
    const positionInPack = Math.min(pp.currentIndex + 1, packTotal);
    const percent = Math.round(progress * 100);
    const hud = tokens.spacing.lg;

    return (
        <>
            <GestureLayer />
            {onExit && <GameTopBar onBack={onExit} compact={isCompact} />}

            {/* TOP-LEFT: compact activity card */}
            <div style={{ position: 'absolute', top: hud, left: hud, zIndex: tokens.zIndex.hud, pointerEvents: 'none', maxWidth: isCompact ? '46%' : 260 }}>
                <KidPanel size={isCompact ? 'sm' : 'md'}>
                    <div style={{ fontFamily: tokens.fontFamily.body, fontSize: tokens.fontSize.caption, color: tokens.semantic.textSecondary, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span>{section?.icon}</span><span>{CATEGORY[type] ?? 'Tracing'}</span>
                    </div>
                    <div style={{ fontFamily: tokens.fontFamily.heading, fontWeight: tokens.fontWeight.extrabold, fontSize: isCompact ? '2rem' : '2.6rem', color: tokens.semantic.textPrimary, lineHeight: 1.05, margin: '2px 0 4px' }}>
                        {label}
                    </div>
                    <div style={{ fontFamily: tokens.fontFamily.body, fontSize: tokens.fontSize.caption, color: tokens.semantic.textSecondary }}>
                        {section?.name} · {positionInPack} of {packTotal}
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

            {/* BOTTOM-CENTER: sections + restart */}
            <div style={{ position: 'absolute', bottom: isCompact ? 12 : 24, left: '50%', transform: 'translateX(-50%)', zIndex: tokens.zIndex.hud, display: 'flex', gap: tokens.spacing.md }}>
                {allowCategorySelection && (
                    <KidButton data-gesture variant="secondary" size="md" onClick={() => { setPlayfulActive(false); setPhase('sections'); setSections(getSections()); }} icon={<span>📚</span>}>
                        {isCompact ? '' : 'Sections'}
                    </KidButton>
                )}
                <KidButton data-gesture variant="secondary" size="md" onClick={handleRestart} icon={<span>🔄</span>}>
                    {isCompact ? '' : (RESTART_LABEL[type] ?? 'Restart')}
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

function SectionPicker({ sections, onPick, onExit }: { sections: SectionInfo[]; onPick: (pack: number) => void; onExit?: () => void }) {
    const tints = [tokens.colors.aqua, tokens.colors.meadowGreen, tokens.colors.deepPlum, tokens.colors.warmOrange];
    return (
        <>
            <GestureLayer />
            {onExit && <GameTopBar onBack={onExit} />}
            <div style={{ position: 'absolute', inset: 0, zIndex: tokens.zIndex.hud, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.xl, padding: tokens.spacing.lg }}>
                <h1 style={{ fontFamily: tokens.fontFamily.heading, fontWeight: tokens.fontWeight.extrabold, fontSize: tokens.fontSize.heading, color: tokens.semantic.primary, textAlign: 'center', margin: 0 }}>
                    Choose what to trace
                </h1>
                <div style={{ display: 'flex', gap: tokens.spacing.lg, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {sections.map((s, i) => (
                        <button key={s.pack} data-gesture onClick={() => onPick(s.pack)} style={{
                            width: 210, minHeight: 210, borderRadius: tokens.radius.xxl, cursor: 'pointer', border: 'none',
                            background: tokens.semantic.bgPanel, boxShadow: tokens.shadow.panel,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.md, padding: tokens.spacing.xl,
                        }}>
                            <div style={{ width: 88, height: 88, borderRadius: '50%', background: tints[i % tints.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem' }}>{s.icon}</div>
                            <div style={{ fontFamily: tokens.fontFamily.heading, fontWeight: tokens.fontWeight.bold, fontSize: tokens.fontSize.objective, color: tokens.semantic.textPrimary }}>{s.name}</div>
                            <div style={{ fontFamily: tokens.fontFamily.body, fontSize: tokens.fontSize.body, color: tokens.semantic.textSecondary }}>
                                {s.completed > 0 ? `${s.completed} of ${s.total} done` : `${s.total} to trace`}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

export default TracingModePlayful;
