/** TEMP: headless render of the Magic Canvas engine for visual review. */
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { MagicCanvasEngine, type SizeId } from '../src/features/modes/magicCanvas/magicCanvasEngine';
import type { BrushId } from '../src/features/modes/magicCanvas/paintBrushes';
import { getChallengeById } from '../src/features/modes/magicCanvas/paintChallenges';

const OUT = '/sessions/serene-beautiful-dijkstra/mnt/outputs';
const W = 1366, H = 768;

function ctxFor() {
    const c = createCanvas(W, H);
    return { c, ctx: c.getContext('2d') as unknown as CanvasRenderingContext2D };
}
function save(c: ReturnType<typeof createCanvas>, name: string) { writeFileSync(`${OUT}/${name}.png`, c.toBuffer('image/png')); console.log('wrote', name); }

let T = 0;
function dab(e: MagicCanvasEngine, x: number, y: number, colour: string, brush: BrushId = 'crayon', size: SizeId = 'medium') {
    e.setColour(colour); e.setBrush(brush); e.setSize(size);
    e.update({ pointer: { x, y }, pinch: false, hasHand: true, now: (T += 16) });
    e.update({ pointer: { x, y }, pinch: true, hasHand: true, now: (T += 16) });
    e.update({ pointer: { x: x + 0.02, y: y + 0.02 }, pinch: true, hasHand: true, now: (T += 16) });
    e.update({ pointer: { x: x + 0.04, y: y + 0.01 }, pinch: false, hasHand: true, now: (T += 16) });
}
function stroke(e: MagicCanvasEngine, pts: [number, number][], colour: string, brush: BrushId = 'crayon', size: SizeId = 'big') {
    e.setColour(colour); e.setBrush(brush); e.setSize(size);
    e.update({ pointer: { x: pts[0][0], y: pts[0][1] }, pinch: false, hasHand: true, now: (T += 16) });
    e.update({ pointer: { x: pts[0][0], y: pts[0][1] }, pinch: true, hasHand: true, now: (T += 16) });
    for (const [x, y] of pts) e.update({ pointer: { x, y }, pinch: true, hasHand: true, now: (T += 16) });
    const last = pts[pts.length - 1];
    e.update({ pointer: { x: last[0], y: last[1] }, pinch: false, hasHand: true, now: (T += 16) });
}

// 1. Night sky — sparkle stars + reaction.
{
    const { c, ctx } = ctxFor();
    const e = new MagicCanvasEngine('night', W, H, { perfTier: 'high', reducedMotion: false });
    e.setChallenge(getChallengeById('sky-stars')!);
    for (let i = 0; i < 12; i++) dab(e, 0.12 + (i % 6) * 0.13, 0.14 + Math.floor(i / 6) * 0.16, '#FFE9A8', 'sparkle', 'medium');
    e.render(ctx, T);
    save(c, 'mc-1-night-stars');
}
// 2. Magic paper — free create scene with mixed brushes.
{
    const { c, ctx } = ctxFor();
    const e = new MagicCanvasEngine('magicpaper', W, H, { perfTier: 'high', reducedMotion: false });
    stroke(e, [[0.2, 0.7], [0.3, 0.45], [0.4, 0.7]], '#F07A5C', 'crayon');           // red roof-ish
    stroke(e, [[0.5, 0.3], [0.6, 0.3]], '#FFC83D', 'glow', 'medium');                 // sun glow
    stroke(e, [[0.62, 0.7], [0.7, 0.5], [0.78, 0.7]], '#5BCE9A', 'paint');            // green hill
    stroke(e, [[0.15, 0.78], [0.85, 0.78]], '#8A66F0', 'rainbow', 'big');             // rainbow ground
    e.render(ctx, T);
    save(c, 'mc-2-paper-create');
}
// 3. Sunny playground — Finish-the-World garden bloom reaction.
{
    const { c, ctx } = ctxFor();
    const e = new MagicCanvasEngine('playground', W, H, { perfTier: 'high', reducedMotion: false });
    e.setChallenge(getChallengeById('garden-flowers')!);
    for (let i = 0; i < 6; i++) dab(e, 0.18 + i * 0.12, 0.78, ['#F07A5C', '#FFC83D', '#8A66F0'][i % 3], 'paint', 'medium');
    e.render(ctx, T);
    save(c, 'mc-3-playground-garden');
}
// 4. Low-performance tier (flat strokes, no glow/particles).
{
    const { c, ctx } = ctxFor();
    const e = new MagicCanvasEngine('magicpaper', W, H, { perfTier: 'low', reducedMotion: false });
    stroke(e, [[0.2, 0.7], [0.3, 0.45], [0.4, 0.7]], '#F07A5C', 'crayon');
    stroke(e, [[0.5, 0.3], [0.6, 0.3]], '#FFC83D', 'glow', 'medium');
    stroke(e, [[0.62, 0.7], [0.7, 0.5], [0.78, 0.7]], '#5BCE9A', 'paint');
    e.render(ctx, T);
    save(c, 'mc-4-low-perf');
}
// 5. Reduced motion (night scene, minimal effects).
{
    const { c, ctx } = ctxFor();
    const e = new MagicCanvasEngine('night', W, H, { perfTier: 'high', reducedMotion: true });
    e.setChallenge(getChallengeById('sky-stars')!);
    for (let i = 0; i < 12; i++) dab(e, 0.12 + (i % 6) * 0.13, 0.16 + Math.floor(i / 6) * 0.16, '#FFE9A8', 'sparkle', 'medium');
    e.render(ctx, T);
    save(c, 'mc-5-reduced-motion');
}
// 6 + 7. Guided colouring — line-art and a coloured state.
import { ColouringEngine } from '../src/features/modes/magicCanvas/colouringEngine';
import { getColouringPage } from '../src/features/modes/magicCanvas/colouringPages';
{
    const { c, ctx } = ctxFor();
    const e = new ColouringEngine(getColouringPage('house')!, W, H, { perfTier: 'high', reducedMotion: false });
    e.render(ctx, 0);
    save(c, 'mc-6-colouring-blank');
}
{
    const { c, ctx } = ctxFor();
    const e = new ColouringEngine(getColouringPage('house')!, W, H, { perfTier: 'high', reducedMotion: false });
    const fill = (cx: number, cy: number, colour: string) => {
        e.setColour(colour);
        let n = 1000;
        e.update({ pointer: { x: cx, y: cy }, pinch: false, hasHand: true, now: n++ });
        e.update({ pointer: { x: cx, y: cy }, pinch: true, hasHand: true, now: n++ });
        for (let y = cy - 0.18; y <= cy + 0.18; y += 0.008) for (let x = cx - 0.26; x <= cx + 0.26; x += 0.008) e.update({ pointer: { x, y }, pinch: true, hasHand: true, now: n++ });
        e.update({ pointer: { x: cx, y: cy }, pinch: false, hasHand: true, now: n++ });
    };
    fill(0.5, 0.38, '#F07A5C');  // roof
    fill(0.5, 0.55, '#FFC83D');  // wall
    e.render(ctx, 800);
    save(c, 'mc-7-colouring-filled');
}
console.log('done');
