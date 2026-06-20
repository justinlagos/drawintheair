/**
 * Magic Canvas — brush personalities (context-agnostic canvas rendering).
 *
 * Five distinct, performant brushes. Each renders in two phases:
 *   • LIVE  — cheap, immediate, never blocks the primary ink (drawn every frame
 *             for the active segment).
 *   • SETTLED — slightly richer pass after pen-up (texture, taper, glow).
 *
 * Decorative work (sparkle particles, heavy glow) must never delay the live
 * ink, so it is gated by quality and only added in the settled phase.
 */

export type BrushId = 'crayon' | 'paint' | 'glow' | 'sparkle' | 'rainbow';

export interface BrushStyle {
    id: BrushId;
    name: string;
    /** Width multiplier applied to the selected size. */
    widthScale: number;
    /** How much faster movement thins the stroke (0 = constant width). */
    speedThinning: number;
    glow: boolean;
    texture: 'grain' | 'smooth';
}

export const BRUSHES: Record<BrushId, BrushStyle> = {
    crayon: { id: 'crayon', name: 'Crayon', widthScale: 1.0, speedThinning: 0.25, glow: false, texture: 'grain' },
    paint: { id: 'paint', name: 'Paint', widthScale: 1.15, speedThinning: 0.4, glow: false, texture: 'smooth' },
    glow: { id: 'glow', name: 'Glow', widthScale: 1.0, speedThinning: 0.2, glow: true, texture: 'smooth' },
    sparkle: { id: 'sparkle', name: 'Sparkle', widthScale: 1.0, speedThinning: 0.3, glow: true, texture: 'smooth' },
    rainbow: { id: 'rainbow', name: 'Rainbow', widthScale: 1.1, speedThinning: 0.3, glow: false, texture: 'smooth' },
};

export const BRUSH_IDS: BrushId[] = ['crayon', 'paint', 'glow', 'sparkle', 'rainbow'];

export interface StrokePoint {
    x: number; // px
    y: number; // px
    w: number; // width px at this point
}

export interface RenderQuality {
    glow: boolean;
    shadowScale: number;
    texture: boolean;
    particles: number; // max sparkle particles per stroke
}

const hueShift = (hex: string, deg: number): string => {
    // Cheap HSL rotate for the rainbow brush; falls back to the input on parse fail.
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0; const l = (max + min) / 2; const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
    }
    h = (h + deg + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const mm = l - c / 2;
    let rr = 0, gg = 0, bb = 0;
    if (h < 60) [rr, gg, bb] = [c, x, 0];
    else if (h < 120) [rr, gg, bb] = [x, c, 0];
    else if (h < 180) [rr, gg, bb] = [0, c, x];
    else if (h < 240) [rr, gg, bb] = [0, x, c];
    else if (h < 300) [rr, gg, bb] = [x, 0, c];
    else [rr, gg, bb] = [c, 0, x];
    const to = (v: number) => Math.round((v + mm) * 255).toString(16).padStart(2, '0');
    return `#${to(rr)}${to(gg)}${to(bb)}`;
};

const drawSegmentPath = (ctx: CanvasRenderingContext2D, a: StrokePoint, b: StrokePoint, colour: string): void => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(1, (a.w + b.w) / 2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
};

/**
 * Render a stroke (or the newest segments of it). `from` lets the engine draw
 * only the new live segment instead of the whole stroke each frame.
 */
export const renderStroke = (
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    colour: string,
    brush: BrushStyle,
    quality: RenderQuality,
    opts: { settled?: boolean; from?: number } = {}
): void => {
    if (points.length === 0) return;
    const start = Math.max(1, opts.from ?? 1);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (brush.glow && quality.glow) {
        ctx.shadowBlur = (brush.id === 'glow' ? 16 : 8) * quality.shadowScale;
        ctx.shadowColor = colour;
    }

    if (points.length === 1) {
        const p = points[0];
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.w / 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
    }

    for (let i = start; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const colourAt = brush.id === 'rainbow' ? hueShift(colour, i * 6) : colour;
        drawSegmentPath(ctx, a, b, colourAt);
    }

    // Crayon grain: a faint, slightly narrower second pass with lowered alpha.
    if (brush.texture === 'grain' && quality.texture && opts.settled) {
        ctx.globalAlpha = 0.18;
        ctx.globalCompositeOperation = 'multiply';
        for (let i = 1; i < points.length; i++) {
            const a = { ...points[i - 1], w: points[i - 1].w * 0.6 };
            const b = { ...points[i], w: points[i].w * 0.6 };
            drawSegmentPath(ctx, a, b, colour);
        }
    }
    ctx.restore();

    // Sparkle particles — settled only, count-limited, never on the live path.
    if (brush.id === 'sparkle' && opts.settled && quality.particles > 0) {
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        const step = Math.max(1, Math.floor(points.length / quality.particles));
        for (let i = 0; i < points.length; i += step) {
            const p = points[i];
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(p.x + (i % 3 - 1) * p.w, p.y - (i % 2) * p.w, Math.max(1, p.w * 0.18), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
};

/** Width (px) for a point given selected size, brush and pointer speed. */
export const widthForSpeed = (sizePx: number, brush: BrushStyle, speedPx: number): number => {
    const thin = 1 - Math.min(0.6, (speedPx / 40) * brush.speedThinning);
    return Math.max(1.5, sizePx * brush.widthScale * thin);
};
