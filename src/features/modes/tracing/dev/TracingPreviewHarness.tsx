/**
 * Tracing Preview Harness — DEV ONLY (route: /dev/tracing-preview).
 *
 * Drives the PRODUCTION PlayfulTracingEngine + renderer with a SIMULATED
 * pointer so the entire visual + interaction system can be exercised and
 * screenshotted without a webcam or MediaPipe. It does NOT duplicate the
 * renderer, never initialises the camera, and never sends analytics.
 *
 * Controls cover: activity/pack selection, start/pause/reset, simulated
 * pinch + manual drag, ideal-path replay, off-path replay, tracking
 * loss/recovery, jump-to-stroke, trigger completion, reduced motion, perf
 * tiers, viewport presets, freeze-for-screenshots, safe-bounds overlay, and
 * a live debug panel.
 */

import { useEffect, useRef, useState } from 'react';
import { PlayfulTracingEngine, type EngineSnapshot } from '../playfulTracingEngine';
import {
    ALL_TRACING_ACTIVITIES,
    PACK_INFO,
    getActivityById,
} from '../tracingActivities';
import { getSafeRegion, type PerfTier } from '../tracingThemes';
import type { VehicleState } from '../tracingCharacter';
import type { SafeRegion, StrokePoint } from '../tracingStrokeModel';

const VEHICLE_STATES: VehicleState[] = ['idle', 'ready', 'moving', 'turning', 'paused', 'offPath', 'returning', 'recovered', 'finishing', 'celebrating'];

type SimMode = 'manual' | 'replay-ideal' | 'replay-offpath';

const VIEWPORTS: { label: string; w: number; h: number }[] = [
    { label: '1366×768 Chromebook', w: 1366, h: 768 },
    { label: '1440×900 laptop', w: 1440, h: 900 },
    { label: '1920×1080 desktop', w: 1920, h: 1080 },
    { label: '1024×768 iPad (landscape)', w: 1024, h: 768 },
    { label: '1180×820 tablet (landscape)', w: 1180, h: 820 },
    { label: '1280×720 small display', w: 1280, h: 720 },
];

const PERF_TIERS: PerfTier[] = ['low', 'medium', 'high'];

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6B6580', textTransform: 'uppercase', letterSpacing: 0.4 };
const btn = (active = false): React.CSSProperties => ({
    padding: '7px 11px',
    borderRadius: 10,
    border: '1.5px solid ' + (active ? '#8A66F0' : 'rgba(31,27,46,0.15)'),
    background: active ? '#8A66F0' : '#fff',
    color: active ? '#fff' : '#1F1B2E',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
});
const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };

export default function TracingPreviewHarness() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<PlayfulTracingEngine | null>(null);
    const rafRef = useRef<number | undefined>(undefined);

    // Mutable control mirrors (read inside rAF without re-subscribing).
    const simModeRef = useRef<SimMode>('replay-ideal');
    const pinchRef = useRef(false);
    const frozenRef = useRef(false);
    const frozenNowRef = useRef(0);
    const trackingLossRef = useRef(false);
    const showBoundsRef = useRef(false);
    const cleanRef = useRef(false);
    const mouseRef = useRef<{ pos: StrokePoint; inside: boolean }>({ pos: { x: 0.5, y: 0.5 }, inside: false });
    const localTRef = useRef(0);
    const lastIdxRef = useRef(0);
    const regionRef = useRef<SafeRegion>({ x: 0, y: 0, width: 1, height: 1 });
    const snapRef = useRef<EngineSnapshot | null>(null);

    // React control state (drives recreation + UI).
    const [activityId, setActivityId] = useState('letter-A');
    const [viewport, setViewport] = useState(VIEWPORTS[2]);
    const [perfTier, setPerfTier] = useState<PerfTier>('high');
    const [reducedMotion, setReducedMotion] = useState(false);
    const [simMode, setSimMode] = useState<SimMode>('replay-ideal');
    const [pinch, setPinch] = useState(false);
    const [frozen, setFrozen] = useState(false);
    const [trackingLoss, setTrackingLoss] = useState(false);
    const [showBounds, setShowBounds] = useState(true);
    const [clean, setClean] = useState(false);
    const [envOn, setEnvOn] = useState(true);
    const [vehScale, setVehScale] = useState(1);
    const [stateOverride, setStateOverride] = useState<VehicleState | ''>('');
    const [snap, setSnap] = useState<EngineSnapshot | null>(null);

    // Sync state → refs.
    useEffect(() => { simModeRef.current = simMode; localTRef.current = 0; lastIdxRef.current = 0; }, [simMode]);
    useEffect(() => { pinchRef.current = pinch; }, [pinch]);
    useEffect(() => { frozenRef.current = frozen; if (frozen) frozenNowRef.current = performance.now(); }, [frozen]);
    useEffect(() => { trackingLossRef.current = trackingLoss; }, [trackingLoss]);
    useEffect(() => { showBoundsRef.current = showBounds; }, [showBounds]);
    useEffect(() => { cleanRef.current = clean; }, [clean]);

    // (Re)create the engine when activity or viewport changes.
    useEffect(() => {
        const activity = getActivityById(activityId);
        if (!activity) return;
        const region = getSafeRegion(viewport.w, viewport.h);
        regionRef.current = region;
        engineRef.current = new PlayfulTracingEngine(activity, viewport.w, viewport.h, region, {
            perfTier,
            reducedMotion,
        });
        localTRef.current = 0;
        lastIdxRef.current = 0;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activityId, viewport]);

    // Push config changes without resetting progress.
    useEffect(() => {
        engineRef.current?.setConfig({ perfTier, reducedMotion, envEnabled: envOn });
    }, [perfTier, reducedMotion, envOn]);

    // Apply environment / vehicle review controls (also after recreation).
    useEffect(() => {
        const e = engineRef.current;
        if (!e) return;
        e.setEnvEnabled(envOn);
        e.setVehicleScale(vehScale);
        e.setStateOverride(stateOverride === '' ? null : stateOverride);
    }, [activityId, viewport, envOn, vehScale, stateOverride]);

    // Single rAF loop for the lifetime of the component.
    useEffect(() => {
        const loop = (t: number) => {
            const engine = engineRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d') ?? null;
            if (engine && canvas && ctx) {
                const now = frozenRef.current ? frozenNowRef.current : t;
                if (!frozenRef.current) {
                    const mode = simModeRef.current;
                    let input;
                    if (mode === 'manual') {
                        const m = mouseRef.current;
                        input = {
                            pointer: m.inside ? m.pos : null,
                            pinch: pinchRef.current && !trackingLossRef.current,
                            hasHand: m.inside && !trackingLossRef.current,
                            now,
                        };
                    } else {
                        const ideal = engine.idealPointer(localTRef.current);
                        let pointer = ideal;
                        if (mode === 'replay-offpath' && ideal) {
                            pointer = { x: ideal.x, y: Math.min(1, ideal.y + 0.06) };
                        }
                        input = {
                            pointer: trackingLossRef.current ? null : pointer,
                            pinch: !trackingLossRef.current,
                            hasHand: !trackingLossRef.current,
                            now,
                        };
                    }
                    const s = engine.update(input);
                    snapRef.current = s;
                    if (simModeRef.current !== 'manual') {
                        if (s.currentStrokeIndex !== lastIdxRef.current) {
                            lastIdxRef.current = s.currentStrokeIndex;
                            localTRef.current = 0;
                        } else {
                            localTRef.current = Math.min(1, localTRef.current + 0.012);
                        }
                    }
                }
                engine.render(ctx, frozenRef.current ? frozenNowRef.current : t);
                if (showBoundsRef.current && !cleanRef.current) drawBounds(ctx, regionRef.current);
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    // Mirror the engine snapshot into React at ~10fps for the debug panel.
    useEffect(() => {
        const id = window.setInterval(() => setSnap(snapRef.current), 100);
        return () => window.clearInterval(id);
    }, []);

    const engine = () => engineRef.current;

    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseRef.current = {
            pos: { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height },
            inside: true,
        };
    };

    const total = snap?.totalStrokes ?? 1;

    return (
        <div style={{ minHeight: '100vh', background: '#F4EFFF', padding: 16, fontFamily: 'Nunito, system-ui, sans-serif' }}>
            <h1 style={{ fontFamily: 'Outfit, system-ui, sans-serif', color: '#1F1B2E', margin: '4px 0 12px' }}>
                Tracing Preview Harness <span style={{ fontSize: 14, color: '#8A66F0' }}>· dev only · no camera · no analytics</span>
            </h1>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Canvas stage */}
                <div style={{ flex: '1 1 720px', minWidth: 360 }}>
                    <div style={{
                        borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 40px rgba(64,50,90,0.18)',
                        aspectRatio: `${viewport.w} / ${viewport.h}`, background: '#000', maxWidth: '100%',
                    }}>
                        <canvas
                            ref={canvasRef}
                            width={viewport.w}
                            height={viewport.h}
                            style={{ display: 'block', width: '100%', height: '100%', cursor: simMode === 'manual' ? 'none' : 'default' }}
                            onPointerMove={onPointerMove}
                            onPointerDown={() => { if (simMode === 'manual') setPinch(true); }}
                            onPointerUp={() => { if (simMode === 'manual') setPinch(false); }}
                            onPointerLeave={() => { mouseRef.current.inside = false; }}
                        />
                    </div>
                    {!clean && <DebugPanel snap={snap} viewport={viewport} perfTier={perfTier} reducedMotion={reducedMotion} />}
                </div>

                {/* Controls */}
                <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 14, background: '#fff', padding: 16, borderRadius: 18, boxShadow: '0 6px 16px rgba(64,50,90,0.08)' }}>
                    <div>
                        <div style={labelStyle}>Activity</div>
                        <select value={activityId} onChange={(e) => setActivityId(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 10, marginTop: 6 }}>
                            {[1, 2, 3, 4].map((pack) => (
                                <optgroup key={pack} label={PACK_INFO[pack].name}>
                                    {ALL_TRACING_ACTIVITIES.filter((a) => a.pack === pack).map((a) => (
                                        <option key={a.id} value={a.id}>{a.label} — {a.id}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div style={labelStyle}>Simulated input</div>
                        <div style={{ ...row, marginTop: 6 }}>
                            <button style={btn(simMode === 'replay-ideal')} onClick={() => setSimMode('replay-ideal')}>Replay ideal</button>
                            <button style={btn(simMode === 'replay-offpath')} onClick={() => setSimMode('replay-offpath')}>Replay off-path</button>
                            <button style={btn(simMode === 'manual')} onClick={() => setSimMode('manual')}>Manual drag</button>
                        </div>
                        {simMode === 'manual' && (
                            <button style={{ ...btn(pinch), marginTop: 8 }} onClick={() => setPinch((p) => !p)}>
                                {pinch ? 'Pinching (click to release)' : 'Pinch (click to hold)'}
                            </button>
                        )}
                    </div>

                    <div>
                        <div style={labelStyle}>Activity controls</div>
                        <div style={{ ...row, marginTop: 6 }}>
                            <button style={btn()} onClick={() => engine()?.startPreview()}>Direction preview</button>
                            <button style={btn()} onClick={() => engine()?.skipPreview()}>Skip preview</button>
                            <button style={btn()} onClick={() => { engine()?.reset(); localTRef.current = 0; lastIdxRef.current = 0; }}>Reset</button>
                            <button style={btn()} onClick={() => engine()?.forceComplete()}>Trigger completion</button>
                        </div>
                    </div>

                    <div>
                        <div style={labelStyle}>Jump to stroke</div>
                        <div style={{ ...row, marginTop: 6 }}>
                            {Array.from({ length: total }).map((_, i) => (
                                <button key={i} style={btn(snap?.currentStrokeIndex === i)} onClick={() => { engine()?.jumpToStroke(i); localTRef.current = 0; lastIdxRef.current = i; }}>{i + 1}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div style={labelStyle}>States</div>
                        <div style={{ ...row, marginTop: 6 }}>
                            <button style={btn(trackingLoss)} onClick={() => setTrackingLoss((v) => !v)}>Tracking loss</button>
                            <button style={btn(frozen)} onClick={() => setFrozen((v) => !v)}>{frozen ? 'Frozen ✓' : 'Freeze (screenshot)'}</button>
                            <button style={btn(showBounds)} onClick={() => setShowBounds((v) => !v)}>Safe bounds</button>
                            <button style={btn(clean)} onClick={() => setClean((v) => !v)}>{clean ? 'Clean ✓' : 'Clean (hide debug)'}</button>
                        </div>
                    </div>

                    <div>
                        <div style={labelStyle}>Environment & vehicle</div>
                        <div style={{ ...row, marginTop: 6 }}>
                            <button style={btn(envOn)} onClick={() => setEnvOn((v) => !v)}>{envOn ? 'Environment ✓' : 'Environment off'}</button>
                        </div>
                        <div style={{ ...row, marginTop: 8 }}>
                            <span style={{ fontSize: 12, color: '#6B6580' }}>Scale</span>
                            {[1, 1.5, 2].map((sc) => (
                                <button key={sc} style={btn(vehScale === sc)} onClick={() => setVehScale(sc)}>{sc}×</button>
                            ))}
                        </div>
                        <select
                            value={stateOverride}
                            onChange={(e) => setStateOverride(e.target.value as VehicleState | '')}
                            style={{ width: '100%', padding: 8, borderRadius: 10, marginTop: 8 }}
                        >
                            <option value="">Vehicle state: live</option>
                            {VEHICLE_STATES.map((vs) => <option key={vs} value={vs}>{vs}</option>)}
                        </select>
                    </div>

                    <div>
                        <div style={labelStyle}>Performance tier</div>
                        <div style={{ ...row, marginTop: 6 }}>
                            {PERF_TIERS.map((tier) => (
                                <button key={tier} style={btn(perfTier === tier)} onClick={() => setPerfTier(tier)}>{tier}</button>
                            ))}
                        </div>
                        <button style={{ ...btn(reducedMotion), marginTop: 8 }} onClick={() => setReducedMotion((v) => !v)}>
                            {reducedMotion ? 'Reduced motion ✓' : 'Reduced motion'}
                        </button>
                    </div>

                    <div>
                        <div style={labelStyle}>Viewport preset</div>
                        <select
                            value={viewport.label}
                            onChange={(e) => setViewport(VIEWPORTS.find((v) => v.label === e.target.value) ?? VIEWPORTS[2])}
                            style={{ width: '100%', padding: 8, borderRadius: 10, marginTop: 6 }}
                        >
                            {VIEWPORTS.map((v) => <option key={v.label} value={v.label}>{v.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}

function drawBounds(ctx: CanvasRenderingContext2D, region: SafeRegion) {
    ctx.save();
    ctx.strokeStyle = 'rgba(240,122,92,0.9)';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(region.x, region.y, region.width, region.height);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(240,122,92,0.9)';
    ctx.font = 'bold 14px Nunito, system-ui, sans-serif';
    ctx.fillText('safe tracing region', region.x + 8, region.y + 20);
    ctx.restore();
}

function DebugPanel({ snap, viewport, perfTier, reducedMotion }: {
    snap: EngineSnapshot | null;
    viewport: { label: string; w: number; h: number };
    perfTier: PerfTier;
    reducedMotion: boolean;
}) {
    const cell: React.CSSProperties = { padding: '6px 10px', background: '#fff', borderRadius: 8, fontSize: 13, color: '#1F1B2E' };
    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <div style={cell}><b>state</b> {snap?.vehicleState ?? '—'}</div>
            <div style={cell}><b>stroke</b> {(snap ? snap.currentStrokeIndex + 1 : 1)}/{snap?.totalStrokes ?? 1}</div>
            <div style={cell}><b>progress</b> {snap ? Math.round(snap.overallProgress * 100) : 0}%</div>
            <div style={cell}><b>coach</b> {snap?.message ?? '—'}</div>
            <div style={cell}><b>preview</b> {snap?.previewActive ? 'yes' : 'no'}</div>
            <div style={cell}><b>paused</b> {snap?.paused ? 'yes' : 'no'}</div>
            <div style={cell}><b>completed</b> {snap?.completed ? 'yes' : 'no'}</div>
            <div style={cell}><b>tier</b> {perfTier}{reducedMotion ? ' · reduced-motion' : ''}</div>
            <div style={cell}><b>viewport</b> {viewport.w}×{viewport.h}</div>
        </div>
    );
}
