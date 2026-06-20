/**
 * MagicCanvasMode — the Free Paint → Magic Canvas experience shell.
 *
 * Mounted only when `freePaintMagicCanvasV1` is ON (App falls back to the
 * legacy FreePaintMode otherwise). The world + artwork + live ink are drawn on
 * the shared TrackingLayer canvas by magicCanvasFrame; this component owns the
 * DOM: the entry chooser, the single creative tool dock, the challenge HUD,
 * completion + next actions, and coaching. It reports the dock/HUD rectangles
 * to the engine so no marks are painted under the controls.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameTopBar } from '../../../components/GameTopBar';
import { Celebration } from '../../../components/Celebration';
import { KidPanel, KidButton, KidObjectiveCard } from '../../../components/kid-ui';
import { tokens } from '../../../styles/tokens';
import { featureFlags } from '../../../core/featureFlags';
import { logEvent } from '../../../lib/analytics';
import { getWorldById } from './paintWorlds';
import { BRUSHES, BRUSH_IDS, type BrushId } from './paintBrushes';
import type { SizeId, EngineSnapshot } from './magicCanvasEngine';
import type { PaintChallenge } from './challengeModel';
import {
    initMagicCanvas,
    magicInitFailed,
    setMagicWorld,
    setMagicChallenge,
    setMagicColour,
    setMagicBrush,
    setMagicSize,
    magicUndo,
    magicClear,
    getMagicSnapshot,
    setMagicCompletionCallback,
    setMagicUiRegions,
    setMagicMouseInput,
    setMagicColouringPage,
    getMagicColouringSnapshot,
} from './magicCanvasFrame';
import { DRAW_THIS_PROMPTS, type DrawThisPrompt } from './drawThisPrompts';
import { COLOURING_PAGES } from './colouringPages';

type Phase = 'entry' | 'draw' | 'done';
type Experience = 'create' | 'challenge' | 'world' | 'drawthis' | 'colouring';

interface Props {
    onExit?: () => void;
}

const BRUSH_EMOJI: Record<BrushId, string> = {
    crayon: '🖍️', paint: '🖌️', glow: '✨', sparkle: '🌟', rainbow: '🌈',
};

export const MagicCanvasMode = ({ onExit }: Props = {}) => {
    const [phase, setPhase] = useState<Phase>('entry');
    const [experience, setExperience] = useState<Experience>('create');
    const [worldId, setWorldId] = useState('magicpaper');
    const [challenge, setChallenge] = useState<PaintChallenge | null>(null);
    const [colour, setColour] = useState('#7BB6FF');
    const [brush, setBrush] = useState<BrushId>('crayon');
    const [size, setSize] = useState<SizeId>('medium');
    const [snap, setSnap] = useState<EngineSnapshot | null>(null);
    const [showClear, setShowClear] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [prompt, setPrompt] = useState<DrawThisPrompt | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [colourDone, setColourDone] = useState({ done: 0, total: 0 });
    const promptIdx = useRef(0);
    const pageIdx = useRef(0);

    const dockRef = useRef<HTMLDivElement | null>(null);
    const hudRef = useRef<HTMLDivElement | null>(null);
    const celebratedRef = useRef(false);
    const mouseDownRef = useRef(false);
    const isCompact = typeof window !== 'undefined' && window.innerWidth <= 900;

    // Engine boots behind the entry chooser so a world is visible immediately.
    useEffect(() => {
        initMagicCanvas(window.innerWidth, window.innerHeight, worldId);
        if (magicInitFailed()) {
            console.error('[MagicCanvasMode] init failed — falling back to legacy Free Paint');
            featureFlags.setFlags({ freePaintMagicCanvasV1: false });
            return;
        }
        logEvent('magic_canvas_opened');
        logEvent('feature_flag_exposed', { meta: { flag_name: 'freePaintMagicCanvasV1', variant: 'magic_v1' } });
        setMagicCompletionCallback(() => {
            if (celebratedRef.current) return;
            celebratedRef.current = true;
            const s = getMagicSnapshot();
            logEvent('paint_challenge_completed', {
                game_mode: 'free',
                stage_id: s?.challenge ? challenge?.id : undefined,
                meta: { stroke_count: s?.strokeCount, active_seconds: Math.round(s?.signals.activeSeconds ?? 0) },
            });
            setShowCelebration(true);
            setPhase('done');
        });
        return () => setMagicCompletionCallback(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Poll snapshot for HUD (not per frame).
    useEffect(() => {
        const id = window.setInterval(() => setSnap(getMagicSnapshot()), 100);
        return () => window.clearInterval(id);
    }, []);

    // Report dock + HUD rects so the engine never paints under the controls.
    const reportRegions = useCallback(() => {
        const rects: { x: number; y: number; w: number; h: number }[] = [];
        const W = window.innerWidth, H = window.innerHeight;
        for (const el of [dockRef.current, hudRef.current]) {
            if (!el) continue;
            const r = el.getBoundingClientRect();
            rects.push({ x: r.left / W, y: r.top / H, w: r.width / W, h: r.height / H });
        }
        setMagicUiRegions(rects);
    }, []);
    useEffect(() => {
        reportRegions();
        window.addEventListener('resize', reportRegions);
        const id = window.setInterval(reportRegions, 500);
        return () => { window.removeEventListener('resize', reportRegions); window.clearInterval(id); };
    }, [reportRegions, phase]);

    useEffect(() => {
        const onResize = () => initMagicCanvas(window.innerWidth, window.innerHeight, worldId);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [worldId]);

    // Draw This: gentle per-prompt countdown that auto-advances (never fails).
    useEffect(() => {
        if (phase !== 'draw' || experience !== 'drawthis') return;
        if (timeLeft > 0) {
            const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
            return () => window.clearTimeout(id);
        }
        // Time's up → move on encouragingly.
        const ni = promptIdx.current + 1;
        promptIdx.current = ni;
        const p = DRAW_THIS_PROMPTS[ni % DRAW_THIS_PROMPTS.length];
        setPrompt(p);
        magicClear();
        setTimeLeft(p.timerSeconds);
    }, [phase, experience, timeLeft]);

    // Colouring: reflect per-region progress in the header.
    useEffect(() => {
        if (phase !== 'draw' || experience !== 'colouring') return;
        const id = window.setInterval(() => {
            const s = getMagicColouringSnapshot();
            if (s) setColourDone({ done: s.done, total: s.total });
        }, 200);
        return () => window.clearInterval(id);
    }, [phase, experience]);

    // ── Entry actions ────────────────────────────────────────────────────────
    const enterDraw = (exp: Experience, wId: string, ch: PaintChallenge | null) => {
        setMagicColouringPage(null); // ensure freeform engine (not colouring)
        setExperience(exp);
        setWorldId(wId);
        setChallenge(ch);
        setMagicWorld(wId);
        setMagicChallenge(ch);
        setMagicColour(colour);
        setMagicBrush(brush);
        setMagicSize(size);
        celebratedRef.current = false;
        setShowCelebration(false);
        setPhase('draw');
    };

    const startDrawThisPrompt = (idx: number) => {
        const p = DRAW_THIS_PROMPTS[idx % DRAW_THIS_PROMPTS.length];
        setPrompt(p);
        setTimeLeft(p.timerSeconds);
        magicClear();
    };
    const startDrawThis = () => {
        promptIdx.current = 0;
        logEvent('magic_canvas_entry_selected', { meta: { experience: 'drawthis' } });
        enterDraw('drawthis', 'magicpaper', null);
        startDrawThisPrompt(0);
    };
    const startColouring = () => {
        const page = COLOURING_PAGES[pageIdx.current % COLOURING_PAGES.length];
        setMagicChallenge(null);
        setMagicColour(colour);
        setMagicSize(size);
        setMagicColouringPage(page.id);
        setExperience('colouring');
        celebratedRef.current = false;
        setShowCelebration(false);
        setColourDone({ done: 0, total: page.regions.length });
        logEvent('magic_canvas_entry_selected', { meta: { experience: 'colouring' } });
        setPhase('draw');
    };
    const nextColouringPage = () => {
        pageIdx.current += 1;
        const page = COLOURING_PAGES[pageIdx.current % COLOURING_PAGES.length];
        setMagicColouringPage(page.id);
        setColourDone({ done: 0, total: page.regions.length });
        celebratedRef.current = false;
        setShowCelebration(false);
        setPhase('draw');
    };

    const startCreate = () => {
        logEvent('magic_canvas_entry_selected', { meta: { experience: 'create' } });
        logEvent('free_create_started', { game_mode: 'free', meta: { world_id: 'magicpaper' } });
        enterDraw('create', 'magicpaper', null);
    };
    // ── Tool actions ──────────────────────────────────────────────────────────
    const pickColour = (hex: string) => { setColour(hex); setMagicColour(hex); logEvent('paint_colour_selected', { game_mode: 'free' }); };
    const pickBrush = (b: BrushId) => { setBrush(b); setMagicBrush(b); logEvent('paint_brush_selected', { game_mode: 'free', meta: { brush: b } }); };
    const pickSize = (s: SizeId) => { setSize(s); setMagicSize(s); };
    const doUndo = () => { magicUndo(); logEvent('paint_undo_used', { game_mode: 'free' }); };
    const doClearConfirm = () => {
        const n = snap?.strokeCount ?? 0;
        magicClear(); setShowClear(false);
        logEvent('paint_clear_confirmed', { game_mode: 'free', meta: { stroke_count: n } });
    };
    const doFinish = () => {
        logEvent('paint_creation_finished', { game_mode: 'free', meta: { stroke_count: snap?.strokeCount, colour_count: snap?.coloursUsed } });
        setShowCelebration(true);
        setPhase('done');
    };

    const palette = getWorldById(worldId).palette;

    // ── Render ────────────────────────────────────────────────────────────────
    if (phase === 'entry') {
        return <EntryChooser onCreate={startCreate} onDrawThis={startDrawThis} onColouring={startColouring} onExit={onExit} />;
    }

    const progress = snap?.challenge;
    const isColouring = experience === 'colouring';
    const isDrawThis = experience === 'drawthis';
    const showHint = !isColouring && (snap?.strokeCount ?? 0) === 0 && phase === 'draw';

    const toNorm = (ev: React.PointerEvent) => ({ x: ev.clientX / window.innerWidth, y: ev.clientY / window.innerHeight });

    return (
        <>
            {onExit && <GameTopBar onBack={onExit} compact={isCompact} />}

            {/* Mouse / trackpad drawing layer — sits above the canvas, below the
                dock/HUD, so the canvas works with BOTH gestures and the mouse. */}
            <div
                style={{ position: 'absolute', inset: 0, zIndex: tokens.zIndex.hud - 1, cursor: 'crosshair', touchAction: 'none' }}
                onPointerDown={(ev) => { mouseDownRef.current = true; (ev.target as Element).setPointerCapture?.(ev.pointerId); setMagicMouseInput(toNorm(ev), true); }}
                onPointerMove={(ev) => setMagicMouseInput(toNorm(ev), mouseDownRef.current)}
                onPointerUp={(ev) => { mouseDownRef.current = false; setMagicMouseInput(toNorm(ev), false); }}
                onPointerLeave={(ev) => { mouseDownRef.current = false; setMagicMouseInput(toNorm(ev), false); }}
            />

            {/* Draw This: reference card to the side + countdown */}
            {isDrawThis && prompt && (
                <div style={{ position: 'absolute', top: tokens.spacing.lg, right: tokens.spacing.lg, zIndex: tokens.zIndex.hud, pointerEvents: 'none' }}>
                    <KidPanel size="sm" style={{ textAlign: 'center', padding: tokens.spacing.md }}>
                        <div style={{ fontFamily: tokens.fontFamily.body, fontSize: tokens.fontSize.caption, color: tokens.semantic.textSecondary, marginBottom: 4 }}>Draw this</div>
                        <DrawThisReference prompt={prompt} size={isCompact ? 96 : 132} />
                        <div style={{ fontFamily: tokens.fontFamily.heading, fontWeight: tokens.fontWeight.bold, color: tokens.semantic.textPrimary, marginTop: 4 }}>{prompt.label}</div>
                        <div style={{ marginTop: 6, height: 8, background: 'rgba(108,63,164,0.12)', borderRadius: tokens.radius.pill, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.max(0, (timeLeft / prompt.timerSeconds) * 100)}%`, height: '100%', background: timeLeft <= 5 ? tokens.colors.warmOrange : tokens.colors.aqua, borderRadius: tokens.radius.pill, transition: 'width 1s linear' }} />
                        </div>
                        <div style={{ fontSize: tokens.fontSize.caption, color: tokens.semantic.textSecondary, marginTop: 2 }}>{timeLeft}s · keep going!</div>
                    </KidPanel>
                </div>
            )}

            {/* TOP-CENTRE: title / challenge HUD (clear of the Menu on the left) */}
            <div ref={hudRef} style={{ position: 'absolute', top: tokens.spacing.lg, left: '50%', transform: 'translateX(-50%)', zIndex: tokens.zIndex.hud, pointerEvents: 'none', maxWidth: isCompact ? 'calc(100% - 160px)' : 520 }}>
                <KidPanel size="sm" style={{ padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`, textAlign: 'center' }}>
                    <div style={{ fontFamily: tokens.fontFamily.heading, fontWeight: tokens.fontWeight.bold, fontSize: tokens.fontSize.button, color: tokens.semantic.primary }}>
                        {isColouring ? '🖍️ Colour it in' : isDrawThis ? (prompt?.instruction ?? 'Draw This') : experience === 'create' ? '✨ Magic Canvas' : challenge?.title ?? 'Magic Canvas'}
                    </div>
                    {isColouring && (
                        <div style={{ fontFamily: tokens.fontFamily.body, fontSize: tokens.fontSize.label, color: tokens.semantic.textSecondary, marginTop: 2 }}>
                            {colourDone.done} of {colourDone.total} sections coloured
                        </div>
                    )}
                    {challenge && !isColouring && !isDrawThis && (
                        <div style={{ fontFamily: tokens.fontFamily.body, fontSize: tokens.fontSize.label, color: tokens.semantic.textSecondary, marginTop: 2 }}>
                            {challenge.instruction}
                        </div>
                    )}
                    {progress && !progress.completed && (
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                            <div style={{ width: 160, height: 8, background: 'rgba(108,63,164,0.12)', borderRadius: tokens.radius.pill, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.round(progress.overallProgress * 100)}%`, height: '100%', background: tokens.colors.aqua, borderRadius: tokens.radius.pill, transition: 'width 0.2s ease' }} />
                            </div>
                            <span style={{ fontFamily: tokens.fontFamily.body, fontSize: tokens.fontSize.caption, color: tokens.semantic.textSecondary }}>{progress.label}</span>
                        </div>
                    )}
                </KidPanel>
            </div>

            {/* First-use coaching */}
            {showHint && !showCelebration && (
                <div style={{ position: 'absolute', bottom: isCompact ? 120 : 150, left: '50%', transform: 'translateX(-50%)', zIndex: tokens.zIndex.hud, pointerEvents: 'none' }}>
                    <KidObjectiveCard icon="👆">Pinch your fingers and move your hand to paint</KidObjectiveCard>
                </div>
            )}
            {isColouring && colourDone.done === 0 && !showCelebration && (
                <div style={{ position: 'absolute', bottom: isCompact ? 120 : 150, left: '50%', transform: 'translateX(-50%)', zIndex: tokens.zIndex.hud, pointerEvents: 'none' }}>
                    <KidObjectiveCard icon="🖍️">Pick a colour, then paint inside a shape</KidObjectiveCard>
                </div>
            )}

            {/* BOTTOM: one coherent creative tool dock */}
            <div ref={dockRef} style={{ position: 'absolute', bottom: isCompact ? 10 : 18, left: '50%', transform: 'translateX(-50%)', zIndex: tokens.zIndex.hud, pointerEvents: 'auto' }}>
                <KidPanel size="sm" style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 8 : 14, padding: `${tokens.spacing.sm} ${tokens.spacing.md}`, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '96vw' }}>
                    {/* Colours (true circles) */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        {palette.slice(0, 7).map((hex) => (
                            <button key={hex} onClick={() => pickColour(hex)} aria-label={`colour ${hex}`} style={{
                                flex: '0 0 auto', width: 32, height: 32, padding: 0, boxSizing: 'border-box',
                                borderRadius: '50%', aspectRatio: '1 / 1', background: hex, cursor: 'pointer', appearance: 'none',
                                border: colour === hex ? `3px solid ${tokens.semantic.primary}` : '3px solid rgba(255,255,255,0.95)',
                                boxShadow: colour === hex ? tokens.shadow.glow : tokens.shadow.float,
                            }} />
                        ))}
                    </div>
                    {/* Brushes (icon + name) — not needed in guided colouring */}
                    {!isColouring && (
                        <>
                            <Divider />
                            <div style={{ display: 'flex', gap: 4 }}>
                                {BRUSH_IDS.map((b) => (
                                    <button key={b} onClick={() => pickBrush(b)} title={BRUSHES[b].name} style={dockTool(brush === b)}>
                                        <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{BRUSH_EMOJI[b]}</span>
                                        <span style={{ fontSize: 9, fontWeight: 700, color: brush === b ? tokens.semantic.primary : tokens.semantic.textSecondary }}>{BRUSHES[b].name}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                    <Divider />
                    {/* Sizes (dot + label) */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {([['small', 'S', 8], ['medium', 'M', 14], ['big', 'L', 20]] as [SizeId, string, number][]).map(([s, lbl, d]) => (
                            <button key={s} onClick={() => pickSize(s)} title={s} style={dockTool(size === s)}>
                                <span style={{ display: 'inline-block', borderRadius: '50%', background: colour, width: d, height: d }} />
                                <span style={{ fontSize: 9, fontWeight: 700, color: size === s ? tokens.semantic.primary : tokens.semantic.textSecondary }}>{lbl}</span>
                            </button>
                        ))}
                    </div>
                    <Divider />
                    <button onClick={doUndo} title="Undo" style={dockBtn(false)} disabled={!snap?.canUndo}>↩︎</button>
                    <button onClick={() => setShowClear(true)} title="Clear canvas" style={{ ...dockBtn(false), color: tokens.semantic.danger }}>🗑</button>
                    <KidButton variant="primary" size="md" onClick={doFinish} icon={<span>✓</span>}>Done</KidButton>
                </KidPanel>
            </div>

            {/* Clear confirmation (no accidental wipes) */}
            {showClear && (
                <div style={{ position: 'absolute', inset: 0, zIndex: tokens.zIndex.modal, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(31,27,46,0.35)' }}>
                    <KidPanel size="md" style={{ textAlign: 'center', maxWidth: 360 }}>
                        <div style={{ fontFamily: tokens.fontFamily.heading, fontWeight: tokens.fontWeight.bold, fontSize: tokens.fontSize.objective, color: tokens.semantic.textPrimary, marginBottom: tokens.spacing.lg }}>Clear everything?</div>
                        <div style={{ display: 'flex', gap: tokens.spacing.md, justifyContent: 'center' }}>
                            <KidButton variant="secondary" size="md" onClick={() => setShowClear(false)}>Keep drawing</KidButton>
                            <KidButton variant="primary" size="md" onClick={doClearConfirm}>Clear canvas</KidButton>
                        </div>
                    </KidPanel>
                </div>
            )}

            {/* Completion */}
            <Celebration
                show={showCelebration}
                message={isColouring ? 'All coloured in!' : progress?.completed ? 'You made it!' : 'Look what you made!'}
                subMessage={isColouring ? 'Your picture is bright!' : challenge ? 'Your world is ready!' : 'Beautiful creation!'}
                icon={isColouring ? '🖍️' : '🎨'}
                duration={1600}
                stars={2}
                showConfetti
                soundEffect
                onComplete={() => { setShowCelebration(false); if (isColouring) nextColouringPage(); }}
            />
            {phase === 'done' && !showCelebration && !isColouring && (
                <NextActions
                    onKeep={() => { setPhase('draw'); celebratedRef.current = false; }}
                    onNew={() => { magicClear(); setPhase('draw'); celebratedRef.current = false; }}
                    onMore={() => setPhase('entry')}
                />
            )}
        </>
    );
};

function DrawThisReference({ prompt, size }: { prompt: DrawThisPrompt; size: number }) {
    const ref = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext('2d'); if (!ctx) return;
        ctx.clearRect(0, 0, size, size);
        prompt.draw(ctx, size);
    }, [prompt, size]);
    return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size, display: 'block', margin: '0 auto' }} />;
}

// ── small UI helpers ─────────────────────────────────────────────────────────
const dockBtn = (active: boolean): React.CSSProperties => ({
    width: 38, height: 44, borderRadius: 12, cursor: 'pointer',
    border: active ? `2.5px solid ${tokens.semantic.primary}` : '2px solid rgba(31,27,46,0.12)',
    background: active ? 'rgba(138,102,240,0.12)' : '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
});
// Tool button with an icon + small label (brush / size).
const dockTool = (active: boolean): React.CSSProperties => ({
    minWidth: 46, height: 44, borderRadius: 12, cursor: 'pointer', padding: '2px 4px',
    border: active ? `2.5px solid ${tokens.semantic.primary}` : '2px solid rgba(31,27,46,0.12)',
    background: active ? 'rgba(138,102,240,0.12)' : '#fff',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
});
const Divider = () => <div style={{ width: 1, height: 28, background: 'rgba(31,27,46,0.12)' }} />;

function EntryChooser({ onCreate, onDrawThis, onColouring, onExit }: { onCreate: () => void; onDrawThis: () => void; onColouring: () => void; onExit?: () => void }) {
    const cards: { title: string; sub: string; emoji: string; onClick: () => void; tint: string }[] = [
        { title: 'Free Create', sub: 'Make anything you like.', emoji: '🎨', onClick: onCreate, tint: tokens.colors.aqua },
        { title: 'Draw This', sub: 'Copy the picture before time runs out.', emoji: '✏️', onClick: onDrawThis, tint: tokens.colors.warmOrange },
        { title: 'Colour It In', sub: 'Colour the picture, staying in the lines.', emoji: '🖍️', onClick: onColouring, tint: tokens.colors.coral },
    ];
    return (
        <>
            {onExit && <GameTopBar onBack={onExit} />}
            <div style={{ position: 'absolute', inset: 0, zIndex: tokens.zIndex.hud, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.xl, padding: tokens.spacing.lg, overflowY: 'auto' }}>
                <h1 style={{ fontFamily: tokens.fontFamily.heading, fontWeight: tokens.fontWeight.extrabold, fontSize: tokens.fontSize.heading, color: tokens.semantic.primary, textAlign: 'center', margin: 0 }}>
                    What do you want to make?
                </h1>
                <div style={{ display: 'flex', gap: tokens.spacing.lg, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 980 }}>
                    {cards.map((c) => (
                        <button key={c.title} onClick={c.onClick} style={{
                            width: 200, minHeight: 200, borderRadius: tokens.radius.xxl, cursor: 'pointer',
                            border: 'none', background: tokens.semantic.bgPanel, boxShadow: tokens.shadow.panel,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sm, padding: tokens.spacing.lg,
                        }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: c.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem' }}>{c.emoji}</div>
                            <div style={{ fontFamily: tokens.fontFamily.heading, fontWeight: tokens.fontWeight.bold, fontSize: tokens.fontSize.objective, color: tokens.semantic.textPrimary }}>{c.title}</div>
                            <div style={{ fontFamily: tokens.fontFamily.body, fontSize: tokens.fontSize.body, color: tokens.semantic.textSecondary, textAlign: 'center' }}>{c.sub}</div>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

function NextActions({ onKeep, onNew, onMore }: { onKeep: () => void; onNew: () => void; onMore: () => void }) {
    return (
        <div style={{ position: 'absolute', bottom: '12%', left: '50%', transform: 'translateX(-50%)', zIndex: tokens.zIndex.hud, display: 'flex', gap: tokens.spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
            <KidButton variant="secondary" size="md" onClick={onKeep}>Keep drawing</KidButton>
            <KidButton variant="secondary" size="md" onClick={onNew}>New canvas</KidButton>
            <KidButton variant="primary" size="md" onClick={onMore}>More activities</KidButton>
        </div>
    );
}

export default MagicCanvasMode;
