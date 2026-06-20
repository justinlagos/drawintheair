/**
 * The Trailblazer — Draw in the Air's guide vehicle.
 *
 * An original, vector-drawn "magical drawing buggy": a compact rounded car
 * that carries a pencil/brush whose glowing tip draws the route. It has a
 * clear nose (front), a windscreen with two small eyes, front + rear wheels,
 * a soft contact shadow, a brand-purple body and a warm accent. It is NOT an
 * emoji, NOT inside a circular badge, and reads its travel direction at a
 * glance.
 *
 * Context-agnostic: only standard CanvasRenderingContext2D calls, so it
 * renders identically in the browser and headless (Skia) for screenshots.
 * The car's local frame points along +x (nose to the right); the caller
 * rotates by the path tangent.
 */

import type { CharacterTheme } from './tracingThemes';

export type VehicleState =
    | 'idle'
    | 'ready'
    | 'moving'
    | 'turning'
    | 'paused'
    | 'offPath'
    | 'returning'
    | 'recovered'
    | 'finishing'
    | 'celebrating';

export interface VehicleDrawOptions {
    x: number;
    y: number;
    /** Facing angle in radians (path tangent / direction of travel). */
    angle: number;
    /** Vehicle WIDTH (length) in px; height derives from it. */
    size: number;
    theme: CharacterTheme;
    state: VehicleState;
    /** Lean −1..1, a small body roll into turns. */
    lean: number;
    now: number;
    glow: boolean;
    shadowScale: number;
    animate: boolean;
}

const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
): void => {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
};

const drawWheel = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, spin: number): void => {
    ctx.save();
    ctx.translate(cx, cy);
    // Tyre.
    ctx.fillStyle = '#34304A';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Hub.
    ctx.fillStyle = '#F4F1FA';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.46, 0, Math.PI * 2);
    ctx.fill();
    // Spoke (communicates rotation while moving).
    ctx.rotate(spin);
    ctx.strokeStyle = '#B9B3CC';
    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, 0);
    ctx.lineTo(r * 0.4, 0);
    ctx.stroke();
    ctx.restore();
};

export const drawVehicle = (ctx: CanvasRenderingContext2D, o: VehicleDrawOptions): void => {
    const t = o.theme;
    const L = o.size;          // length
    const H = o.size * 0.62;   // height
    const wheelR = L * 0.15;

    const moving = o.state === 'moving' || o.state === 'turning' || o.state === 'finishing';
    const dim = o.state === 'offPath' || o.state === 'paused' || o.state === 'idle';
    const alpha = o.state === 'offPath' ? 0.66 : o.state === 'returning' ? 0.85 : 1;
    const tipOn = o.state !== 'idle' && o.state !== 'paused' && o.state !== 'offPath';

    // Vertical motion: idle/ready breathe; finishing/celebrating hop.
    let bob = 0;
    if (o.animate) {
        if (o.state === 'idle') bob = Math.sin(o.now * 0.004) * (L * 0.03);
        else if (o.state === 'ready') bob = -L * 0.04;
        else if (o.state === 'finishing' || o.state === 'celebrating') bob = -Math.abs(Math.sin(o.now * 0.012)) * (L * 0.12);
    }
    // Off-path wobble: a gentle body shimmy, never a flip.
    const wobble = o.state === 'offPath' && o.animate ? Math.sin(o.now * 0.02) * 0.06 : 0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(o.x, o.y + bob);
    ctx.rotate(o.angle + wobble);
    ctx.rotate(o.lean * 0.16);

    // ── Soft contact shadow (under the car, in world-ish down). ──
    if (o.glow && o.shadowScale > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(48,38,70,0.20)';
        ctx.beginPath();
        ctx.ellipse(0, H * 0.52, L * 0.5, H * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // (The moving trail is drawn as themed particles by the engine, behind
    // the car — kept off the body so it never looks like a detached blob.)

    // ── Wheels (rear then front). ──
    const spin = o.animate && moving ? o.now * 0.02 : 0;
    drawWheel(ctx, -L * 0.26, H * 0.4, wheelR, spin);
    drawWheel(ctx, L * 0.28, H * 0.4, wheelR, spin);

    // ── Lower hull (brand purple), with a forward-pointing nose. ──
    ctx.save();
    if (o.glow && (moving || o.state === 'recovered' || o.state === 'celebrating')) {
        ctx.shadowBlur = 16 * o.shadowScale;
        ctx.shadowColor = t.accent;
    }
    ctx.fillStyle = t.body;
    ctx.beginPath();
    // Body outline: rounded rear, rising hood, pointed rounded nose.
    ctx.moveTo(-L * 0.46, H * 0.30);
    ctx.lineTo(-L * 0.50, -H * 0.02);
    ctx.quadraticCurveTo(-L * 0.50, -H * 0.16, -L * 0.34, -H * 0.18);
    ctx.lineTo(L * 0.16, -H * 0.18);
    ctx.quadraticCurveTo(L * 0.40, -H * 0.18, L * 0.50, H * 0.04); // hood to nose top
    ctx.quadraticCurveTo(L * 0.56, H * 0.16, L * 0.46, H * 0.30);  // nose tip (front)
    ctx.lineTo(-L * 0.46, H * 0.30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Belly accent stripe.
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(ctx, -L * 0.44, H * 0.16, L * 0.9, H * 0.12, H * 0.06);
    ctx.fill();

    // ── Cabin / windscreen (toward the front) with two small eyes. ──
    ctx.fillStyle = t.cabin;
    roundRect(ctx, -L * 0.10, -H * 0.46, L * 0.46, H * 0.4, H * 0.2);
    ctx.fill();
    // Windscreen tint.
    ctx.fillStyle = 'rgba(123,182,255,0.35)';
    roundRect(ctx, L * 0.02, -H * 0.42, L * 0.30, H * 0.3, H * 0.16);
    ctx.fill();
    // Eyes — small, looking forward (toward the nose).
    const eyeY = -H * 0.24;
    const eyeR = L * 0.045;
    ctx.fillStyle = '#241F38';
    if (o.state === 'finishing' || o.state === 'celebrating') {
        ctx.lineWidth = Math.max(1.5, eyeR);
        ctx.strokeStyle = '#241F38';
        for (const ex of [L * 0.06, L * 0.22]) {
            ctx.beginPath();
            ctx.arc(ex, eyeY + eyeR, eyeR, Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();
        }
    } else {
        for (const ex of [L * 0.06, L * 0.22]) {
            ctx.beginPath();
            ctx.arc(ex + eyeR * 0.6, eyeY, eyeR, 0, Math.PI * 2); // pupils nudged forward
            ctx.fill();
        }
    }

    // ── Headlight at the nose (warm accent → clear "front"). ──
    ctx.save();
    if (o.glow && tipOn) {
        ctx.shadowBlur = 10 * o.shadowScale;
        ctx.shadowColor = t.accent;
    }
    ctx.fillStyle = t.accent;
    ctx.beginPath();
    ctx.arc(L * 0.46, H * 0.02, L * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Pencil/brush mounted at the FRONT, reaching forward-down to the road
    // so it never covers the eyes/windscreen and clearly marks the front. ──
    ctx.save();
    ctx.translate(L * 0.3, -H * 0.22);
    ctx.rotate(0.62); // angled forward-down toward the nose/road
    const penLen = L * 0.62;
    const penW = L * 0.12;
    // Barrel.
    ctx.fillStyle = '#F2A65A';
    roundRect(ctx, 0, -penW / 2, penLen * 0.74, penW, penW * 0.4);
    ctx.fill();
    // Band.
    ctx.fillStyle = t.body;
    roundRect(ctx, penLen * 0.66, -penW / 2, penLen * 0.1, penW, 1);
    ctx.fill();
    // Wooden tip.
    ctx.fillStyle = '#F6E2C0';
    ctx.beginPath();
    ctx.moveTo(penLen * 0.76, -penW / 2);
    ctx.lineTo(penLen, 0);
    ctx.lineTo(penLen * 0.76, penW / 2);
    ctx.closePath();
    ctx.fill();
    // Glowing nib.
    if (tipOn) {
        ctx.save();
        if (o.glow) {
            ctx.shadowBlur = 12 * o.shadowScale;
            ctx.shadowColor = t.trail;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(penLen, 0, penW * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    } else {
        ctx.fillStyle = '#2B2742';
        ctx.beginPath();
        ctx.arc(penLen, 0, penW * 0.22, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Recovered/celebrating sparkle above the cabin.
    if ((o.state === 'recovered' || o.state === 'celebrating') && o.glow) {
        drawSpark(ctx, L * 0.1, -H * 0.62, L * 0.12, t.accent);
    }
    void dim;
    ctx.restore();
};

const drawSpark = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, r * 0.22);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
    }
    ctx.restore();
};
