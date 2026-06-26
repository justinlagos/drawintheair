/**
 * Screenshot generator for the playful tracing redesign. Renders the
 * PRODUCTION engine/renderer headlessly with @napi-rs/canvas to produce clean
 * approval screenshots (no debug overlays).
 *
 *   npm i            # ensures @napi-rs/canvas (devDependency) is present
 *   npx vite-node scripts/gen-tracing-shots.mts
 */
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { PlayfulTracingEngine } from '../src/features/modes/tracing/playfulTracingEngine';
import { getActivityById } from '../src/features/modes/tracing/tracingActivities';
import { drawVehicle } from '../src/features/modes/tracing/tracingCharacter';
import { getTheme } from '../src/features/modes/tracing/tracingThemes';

const OUT = '/sessions/serene-beautiful-dijkstra/mnt/outputs';
const W = 1366, H = 768;

function newCtx(w = W, h = H) {
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    return { canvas, ctx };
}
function save(canvas: ReturnType<typeof createCanvas>, name: string) {
    writeFileSync(`${OUT}/${name}.png`, canvas.toBuffer('image/png'));
    console.log('wrote', name);
}
function makeEngine(id: string, cfg: { perfTier?: 'low' | 'medium' | 'high'; reducedMotion?: boolean } = {}) {
    const e = new PlayfulTracingEngine(getActivityById(id)!, W, H, { x: 0, y: 0, width: W, height: H } as never, {
        perfTier: cfg.perfTier ?? 'high', reducedMotion: cfg.reducedMotion ?? false,
    });
    e.skipPreview();
    return e;
}
function driveTo(e: PlayfulTracingEngine, target: number, startNow = 1000) {
    let now = startNow, idx = 0, localT = 0;
    let snap = e.update({ pointer: e.idealPointer(0), pinch: true, hasHand: true, now });
    for (let i = 0; i < 4000 && snap.overallProgress < target && !snap.completed; i++) {
        now += 16;
        snap = e.update({ pointer: e.idealPointer(localT), pinch: true, hasHand: true, now });
        if (snap.currentStrokeIndex !== idx) { idx = snap.currentStrokeIndex; localT = 0; }
        else localT = Math.min(1, localT + 0.02);
    }
    return now;
}
function shotIdle(id: string, name: string) {
    const { canvas, ctx } = newCtx();
    const e = makeEngine(id);
    e.setStateOverride('idle');
    e.update({ pointer: null, pinch: false, hasHand: false, now: 1000 });
    e.render(ctx, 1000);
    save(canvas, name);
}
function shotProgress(id: string, target: number, name: string, cfg = {}) {
    const { canvas, ctx } = newCtx();
    const e = makeEngine(id, cfg);
    const now = driveTo(e, target);
    e.render(ctx, now);
    save(canvas, name);
}
function shotRecovery(id: string, name: string) {
    const { canvas, ctx } = newCtx();
    const e = makeEngine(id);
    let now = driveTo(e, 0.4);
    const ideal = e.idealPointer(0.45)!;
    now += 16;
    e.update({ pointer: { x: ideal.x, y: Math.min(1, ideal.y + 0.1) }, pinch: true, hasHand: true, now });
    e.setStateOverride('returning');
    e.render(ctx, now);
    save(canvas, name);
}
function shotComplete(id: string, name: string) {
    const { canvas, ctx } = newCtx();
    const e = makeEngine(id);
    driveTo(e, 0.9);
    e.forceComplete();
    e.update({ pointer: null, pinch: false, hasHand: false, now: 99999 });
    e.render(ctx, 99999);
    save(canvas, name);
}
function shotVehicleCloseup() {
    const { canvas, ctx } = newCtx(520, 360);
    const g = ctx.createLinearGradient(0, 0, 0, 360);
    g.addColorStop(0, '#E7E0FF'); g.addColorStop(1, '#F4EFFF');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 520, 360);
    drawVehicle(ctx, {
        x: 260, y: 195, angle: -0.12, size: 190, theme: getTheme('alphabet').character,
        state: 'moving', lean: 0.2, now: 800, glow: true, shadowScale: 1, animate: true,
    });
    save(canvas, '08-vehicle-closeup');
}

shotIdle('letter-S', '01-S-idle');
shotProgress('letter-S', 0.45, '02-S-45');
shotRecovery('letter-S', '03-S-offpath-recovery');
shotComplete('letter-S', '04-S-complete');
shotIdle('number-5', '05-num5-idle');
shotProgress('number-5', 0.45, '06-num5-45');
shotComplete('number-5', '07-num5-complete');
shotVehicleCloseup();
shotProgress('letter-S', 0.45, '09-S-low-perf', { perfTier: 'low' });
shotProgress('letter-S', 0.45, '10-S-reduced-motion', { reducedMotion: true });
shotProgress('letter-A', 0.62, '11-A-multistroke');
console.log('done');
