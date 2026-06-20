/**
 * Free Paint / Magic Canvas preview harness — DEV ONLY (/dev/free-paint-preview).
 *
 * Drives the PRODUCTION MagicCanvasEngine with a simulated pointer (no webcam,
 * no MediaPipe, no production analytics) so the full drawing system, worlds,
 * brushes, challenges, reactions and the low-latency path can be reviewed and
 * screenshotted. Includes latency/FPS debug instrumentation.
 */

import { useEffect, useRef, useState } from 'react';
import { MagicCanvasEngine, type EngineSnapshot, type PerfTier, type SizeId } from '../magicCanvasEngine';
import { PAINT_WORLDS } from '../paintWorlds';
import { ALL_CHALLENGES, getChallengeById } from '../paintChallenges';
import { BRUSH_IDS, type BrushId } from '../paintBrushes';

type Replay = 'none' | 'line' | 'circle' | 'zigzag';
const VIEWPORTS = [
    { label: '1366×768 Chromebook', w: 1366, h: 768 },
    { label: '1440×900 laptop', w: 1440, h: 900 },
    { label: '1920×1080 desktop', w: 1920, h: 1080 },
    { label: '1024×768 iPad', w: 1024, h: 768 },
    { label: '1280×720 small', w: 1280, h: 720 },
];
const TIERS: PerfTier[] = ['low', 'medium', 'high'];

const btn = (a = false): React.CSSProperties => ({
    padding: '7px 11px', borderRadius: 10, border: '1.5px solid ' + (a ? '#8A66F0' : 'rgba(31,27,46,0.15)'),
    background: a ? '#8A66F0' : '#fff', color: a ? '#fff' : '#1F1B2E', fontWeight: 700, fontSize: 13, cursor: 'pointer',
});
const lab: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6B6580', textTransform: 'uppercase', letterSpacing: 0.4 };
const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };

export default function FreePaintPreviewHarness() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<MagicCanvasEngine | null>(null);
    const rafRef = useRef<number | undefined>(undefined);
    const mouse = useRef({ x: 0.5, y: 0.5, inside: false });
    const pinchRef = useRef(false);
    const replayRef = useRef<Replay>('none');
    const replayT = useRef(0);
    const frozenRef = useRef(false);
    const cleanRef = useRef(false);
    const snapRef = useRef<EngineSnapshot | null>(null);
    const fps = useRef({ frames: 0, last: 0, value: 0, frameMs: 0 });

    const [worldId, setWorldId] = useState('magicpaper');
    const [challengeId, setChallengeId] = useState('');
    const [brush, setBrush] = useState<BrushId>('crayon');
    const [size, setSize] = useState<SizeId>('medium');
    const [colour, setColour] = useState('#7BB6FF');
    const [tier, setTier] = useState<PerfTier>('high');
    const [reduced, setReduced] = useState(false);
    const [viewport, setViewport] = useState(VIEWPORTS[0]);
    const [replay, setReplay] = useState<Replay>('none');
    const [pinch, setPinch] = useState(false);
    const [frozen, setFrozen] = useState(false);
    const [clean, setClean] = useState(false);
    const [snap, setSnap] = useState<EngineSnapshot | null>(null);

    useEffect(() => { pinchRef.current = pinch; }, [pinch]);
    useEffect(() => { replayRef.current = replay; replayT.current = 0; }, [replay]);
    useEffect(() => { frozenRef.current = frozen; }, [frozen]);
    useEffect(() => { cleanRef.current = clean; }, [clean]);

    // (Re)create engine on world/viewport change.
    useEffect(() => {
        const e = new MagicCanvasEngine(worldId, viewport.w, viewport.h, { perfTier: tier, reducedMotion: reduced });
        e.setChallenge(challengeId ? getChallengeById(challengeId) ?? null : null);
        e.setColour(colour); e.setBrush(brush); e.setSize(size);
        engineRef.current = e;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [worldId, viewport]);

    useEffect(() => { engineRef.current?.setConfig({ perfTier: tier, reducedMotion: reduced }); }, [tier, reduced]);
    useEffect(() => { engineRef.current?.setChallenge(challengeId ? getChallengeById(challengeId) ?? null : null); }, [challengeId]);
    useEffect(() => { engineRef.current?.setColour(colour); }, [colour]);
    useEffect(() => { engineRef.current?.setBrush(brush); }, [brush]);
    useEffect(() => { engineRef.current?.setSize(size); }, [size]);

    useEffect(() => {
        const loop = (t: number) => {
            const e = engineRef.current; const cv = canvasRef.current; const ctx = cv?.getContext('2d') ?? null;
            if (e && cv && ctx) {
                // FPS / frame timing.
                const f = fps.current; f.frames++;
                if (t - f.last >= 500) { f.value = Math.round((f.frames * 1000) / (t - f.last)); f.frames = 0; f.last = t; }
                const t0 = performance.now();
                if (!frozenRef.current) {
                    let pointer = mouse.current.inside ? { x: mouse.current.x, y: mouse.current.y } : null;
                    let pinchOn = pinchRef.current && mouse.current.inside;
                    if (replayRef.current !== 'none') {
                        replayT.current = Math.min(1, replayT.current + 0.01);
                        pointer = replayPoint(replayRef.current, replayT.current);
                        pinchOn = replayT.current > 0 && replayT.current < 1;
                    }
                    snapRef.current = e.update({ pointer, pinch: pinchOn, hasHand: pointer !== null, now: t, confidence: 1 });
                }
                e.render(ctx, t);
                fps.current.frameMs = performance.now() - t0;
                if (!cleanRef.current) drawDebug(ctx, snapRef.current, fps.current, viewport);
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [viewport]);

    useEffect(() => { const id = window.setInterval(() => setSnap(snapRef.current), 120); return () => window.clearInterval(id); }, []);

    const onMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
        const r = ev.currentTarget.getBoundingClientRect();
        mouse.current = { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height, inside: true };
    };
    const e = () => engineRef.current;
    const palette = PAINT_WORLDS.find((w) => w.id === worldId)?.palette ?? [];

    return (
        <div style={{ minHeight: '100vh', background: '#F4EFFF', padding: 16, fontFamily: 'Nunito, system-ui, sans-serif' }}>
            <h1 style={{ fontFamily: 'Outfit, system-ui, sans-serif', color: '#1F1B2E', margin: '4px 0 12px' }}>
                Free Paint / Magic Canvas Harness <span style={{ fontSize: 14, color: '#8A66F0' }}>· dev only · no camera · no analytics</span>
            </h1>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 720px', minWidth: 360 }}>
                    <div style={{ borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 40px rgba(64,50,90,0.18)', aspectRatio: `${viewport.w} / ${viewport.h}`, maxWidth: '100%', background: '#000' }}>
                        <canvas ref={canvasRef} width={viewport.w} height={viewport.h}
                            style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
                            onPointerMove={onMove}
                            onPointerDown={() => setPinch(true)} onPointerUp={() => setPinch(false)}
                            onPointerLeave={() => { mouse.current.inside = false; }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        {[['strokes', snap?.strokeCount ?? 0], ['colours', snap?.coloursUsed ?? 0], ['drawing', snap?.drawing ? 'yes' : 'no'],
                        ['challenge', snap?.challenge ? `${Math.round((snap.challenge.overallProgress) * 100)}%` : '—'],
                        ['prediction', `${Math.round(snap?.predictionPx ?? 0)}px`], ['reactions', (snap?.activeReactions ?? []).join(',') || '—']].map(([k, v]) => (
                            <div key={String(k)} style={{ padding: '6px 10px', background: '#fff', borderRadius: 8, fontSize: 13 }}><b>{k}</b> {String(v)}</div>
                        ))}
                    </div>
                </div>

                <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 14, background: '#fff', padding: 16, borderRadius: 18, boxShadow: '0 6px 16px rgba(64,50,90,0.08)' }}>
                    <div><div style={lab}>World</div>
                        <select value={worldId} onChange={(ev) => setWorldId(ev.target.value)} style={{ width: '100%', padding: 8, borderRadius: 10, marginTop: 6 }}>
                            {PAINT_WORLDS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select></div>
                    <div><div style={lab}>Challenge</div>
                        <select value={challengeId} onChange={(ev) => setChallengeId(ev.target.value)} style={{ width: '100%', padding: 8, borderRadius: 10, marginTop: 6 }}>
                            <option value="">Free create (none)</option>
                            {ALL_CHALLENGES.map((c) => <option key={c.id} value={c.id}>{c.title} — {c.id}</option>)}
                        </select></div>
                    <div><div style={lab}>Colour</div>
                        <div style={{ ...row, marginTop: 6 }}>{palette.slice(0, 8).map((h) => (
                            <button key={h} onClick={() => setColour(h)} style={{ width: 26, height: 26, borderRadius: '50%', background: h, border: colour === h ? '3px solid #8A66F0' : '2px solid #fff', cursor: 'pointer' }} />
                        ))}</div></div>
                    <div><div style={lab}>Brush</div>
                        <div style={{ ...row, marginTop: 6 }}>{BRUSH_IDS.map((b) => <button key={b} style={btn(brush === b)} onClick={() => setBrush(b)}>{b}</button>)}</div></div>
                    <div><div style={lab}>Size</div>
                        <div style={{ ...row, marginTop: 6 }}>{(['small', 'medium', 'big'] as SizeId[]).map((s) => <button key={s} style={btn(size === s)} onClick={() => setSize(s)}>{s}</button>)}</div></div>
                    <div><div style={lab}>Simulated draw</div>
                        <div style={{ ...row, marginTop: 6 }}>
                            <button style={btn(replay === 'none')} onClick={() => setReplay('none')}>Manual</button>
                            <button style={btn(replay === 'line')} onClick={() => setReplay('line')}>Line</button>
                            <button style={btn(replay === 'circle')} onClick={() => setReplay('circle')}>Circle</button>
                            <button style={btn(replay === 'zigzag')} onClick={() => setReplay('zigzag')}>Zigzag</button>
                        </div>
                        {replay === 'none' && <button style={{ ...btn(pinch), marginTop: 8 }} onClick={() => setPinch((p) => !p)}>{pinch ? 'Pinching' : 'Pinch (hold)'}</button>}
                    </div>
                    <div><div style={lab}>Actions</div>
                        <div style={{ ...row, marginTop: 6 }}>
                            <button style={btn()} onClick={() => e()?.undo()}>Undo</button>
                            <button style={btn()} onClick={() => e()?.clear()}>Clear</button>
                            <button style={btn(frozen)} onClick={() => setFrozen((v) => !v)}>{frozen ? 'Frozen' : 'Freeze'}</button>
                            <button style={btn(clean)} onClick={() => setClean((v) => !v)}>{clean ? 'Clean ✓' : 'Clean (hide debug)'}</button>
                        </div></div>
                    <div><div style={lab}>Performance</div>
                        <div style={{ ...row, marginTop: 6 }}>{TIERS.map((tt) => <button key={tt} style={btn(tier === tt)} onClick={() => setTier(tt)}>{tt}</button>)}</div>
                        <button style={{ ...btn(reduced), marginTop: 8 }} onClick={() => setReduced((v) => !v)}>{reduced ? 'Reduced motion ✓' : 'Reduced motion'}</button>
                    </div>
                    <div><div style={lab}>Viewport</div>
                        <select value={viewport.label} onChange={(ev) => setViewport(VIEWPORTS.find((v) => v.label === ev.target.value) ?? VIEWPORTS[0])} style={{ width: '100%', padding: 8, borderRadius: 10, marginTop: 6 }}>
                            {VIEWPORTS.map((v) => <option key={v.label} value={v.label}>{v.label}</option>)}
                        </select></div>
                </div>
            </div>
        </div>
    );
}

function replayPoint(kind: Replay, t: number): { x: number; y: number } {
    if (kind === 'line') return { x: 0.1 + t * 0.8, y: 0.5 };
    if (kind === 'circle') { const a = t * Math.PI * 2; return { x: 0.5 + Math.cos(a) * 0.28, y: 0.5 + Math.sin(a) * 0.28 }; }
    // zigzag
    return { x: 0.1 + t * 0.8, y: 0.4 + (Math.floor(t * 10) % 2 === 0 ? 0.18 : -0.18) };
}

function drawDebug(ctx: CanvasRenderingContext2D, snap: EngineSnapshot | null, f: { value: number; frameMs: number }, vp: { w: number; h: number }) {
    ctx.save();
    ctx.fillStyle = 'rgba(31,27,46,0.7)';
    ctx.fillRect(8, 8, 230, 96);
    ctx.fillStyle = '#fff';
    ctx.font = '13px monospace';
    const lines = [
        `render fps : ${f.value}`,
        `frame ms   : ${f.frameMs.toFixed(1)} / 16.7`,
        `prediction : ${Math.round(snap?.predictionPx ?? 0)} px (tip lead)`,
        `strokes    : ${snap?.strokeCount ?? 0}  drawing:${snap?.drawing ? 'Y' : 'N'}`,
        `viewport   : ${vp.w}×${vp.h}`,
    ];
    lines.forEach((l, i) => ctx.fillText(l, 16, 28 + i * 16));
    ctx.restore();
}
