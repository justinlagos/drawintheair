/**
 * Tracing Renderer — paints the playful "learning park" world onto a 2D
 * canvas. Pure drawing: every function takes a context + a fully resolved
 * RenderScene, so the live engine and the dev harness share one renderer.
 *
 * Layered depth (Workstream / redesign pass):
 *   1. Sky          — soft atmospheric gradient
 *   2. Distant      — low-contrast hills + clouds
 *   3. Midground    — sparse trees / flowers / route sign at the EDGES
 *   4. Track + set pieces — contact shadow, lane, start platform, finish
 *   5. Dynamic      — completed fill, progress blooms, preview, vehicle (engine)
 *
 * The scene is split into a STATIC world (cacheable to an offscreen layer)
 * and a DYNAMIC world (redrawn each frame). Coordinates are canvas-normalized
 * (0..1) except `region`, which is in pixels.
 */

import type { ActivityType, SafeRegion, StrokePoint } from './tracingStrokeModel';
import { polylineLengthPx } from './tracingStrokeModel';
import type { QualityProfile, TracingTheme, TrackMetrics } from './tracingThemes';

export type StrokeStatus = 'done' | 'current' | 'upcoming';

export interface RenderStroke {
    points: StrokePoint[];
    progress: number;
    status: StrokeStatus;
    order: number;
}

export interface TrailParticle {
    x: number;
    y: number;
    life: number;
    color: string;
    size: number;
}

export interface RenderScene {
    width: number;
    height: number;
    now: number;
    theme: TracingTheme;
    metrics: TrackMetrics;
    quality: QualityProfile;
    region: SafeRegion;
    glyphType: ActivityType;
    overallProgress: number;
    strokes: RenderStroke[];
    start: StrokePoint;
    finish: StrokePoint;
    pulseStart: boolean;
    showStartSign: boolean;
    emphasizeFinish: boolean;
    preview?: { strokeIndex: number; t: number };
    showStrokeNumbers: boolean;
    particles: TrailParticle[];
    /** When off-path, the nearest valid point — draws a soft guide beam from it. */
    guideTarget?: StrokePoint | null;
    vehicle?: { x: number; y: number };
    envEnabled: boolean;
}

// ── polyline helpers (canvas-normalized) ──
const sliceTo = (pts: StrokePoint[], t: number, w: number, h: number): StrokePoint[] => {
    if (pts.length < 2 || t <= 0) return pts.length ? [pts[0]] : [];
    if (t >= 1) return pts;
    const total = polylineLengthPx(pts, w, h);
    const target = total * t;
    const out: StrokePoint[] = [pts[0]];
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
        const segLen = Math.hypot((pts[i + 1].x - pts[i].x) * w, (pts[i + 1].y - pts[i].y) * h);
        if (acc + segLen >= target) {
            const local = segLen === 0 ? 0 : (target - acc) / segLen;
            out.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * local, y: pts[i].y + (pts[i + 1].y - pts[i].y) * local });
            break;
        }
        out.push(pts[i + 1]);
        acc += segLen;
    }
    return out;
};

const tracePath = (ctx: CanvasRenderingContext2D, pts: StrokePoint[], w: number, h: number, dx = 0, dy = 0): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x * w + dx, pts[0].y * h + dy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * w + dx, pts[i].y * h + dy);
};

/**
 * Smoothed path through points using quadratic curves between segment
 * midpoints. Turns the authored polylines into soft, premium-looking roads
 * (rounded corners) without changing the educational data.
 */
const smoothPath = (ctx: CanvasRenderingContext2D, pts: StrokePoint[], w: number, h: number, dx = 0, dy = 0): void => {
    if (pts.length < 3) {
        tracePath(ctx, pts, w, h, dx, dy);
        return;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x * w + dx, pts[0].y * h + dy);
    for (let i = 1; i < pts.length - 1; i++) {
        const mx = ((pts[i].x + pts[i + 1].x) / 2) * w + dx;
        const my = ((pts[i].y + pts[i + 1].y) / 2) * h + dy;
        ctx.quadraticCurveTo(pts[i].x * w + dx, pts[i].y * h + dy, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x * w + dx, pts[pts.length - 1].y * h + dy);
};

const vectorStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * 0.44;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};

// ─────────────────────────────────────────────────────────────────────────
// LAYER 1–2: sky + distant world
// ─────────────────────────────────────────────────────────────────────────

const drawSky = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    const { width: w, height: h, theme } = s;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, theme.background.skyTop);
    sky.addColorStop(1, theme.background.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
};

const drawCloud = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.9, cy + r * 0.1, r * 0.78, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.9, cy + r * 0.12, r * 0.7, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.1, cy + r * 0.5, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
};

const drawDistant = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    const { width: w, height: h, theme, quality } = s;

    // Clouds — kept to the upper corners only, never behind the central glyph.
    const cloudPos = quality.maxParticles <= 0
        ? [{ x: 0.12, y: 0.14 }, { x: 0.88, y: 0.12 }]
        : [{ x: 0.1, y: 0.15 }, { x: 0.9, y: 0.12 }, { x: 0.18, y: 0.3 }];
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const c of cloudPos) drawCloud(ctx, w * c.x, h * c.y, h * 0.04);
    ctx.restore();

    // Distant hills — two muted humps, calm and slightly desaturated.
    const hillTop = h * 0.66;
    ctx.save();
    ctx.fillStyle = theme.background.ground;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, hillTop + h * 0.05);
    ctx.quadraticCurveTo(w * 0.28, hillTop - h * 0.06, w * 0.55, hillTop + h * 0.03);
    ctx.quadraticCurveTo(w * 0.8, hillTop + h * 0.09, w, hillTop - h * 0.02);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.82);
    ctx.quadraticCurveTo(w * 0.45, h * 0.74, w, h * 0.83);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};

// ─────────────────────────────────────────────────────────────────────────
// LAYER 3: midground props — kept to the EDGES so the glyph stays the hero
// ─────────────────────────────────────────────────────────────────────────

const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, leaf: string): void => {
    ctx.save();
    ctx.fillStyle = '#9A6B43';
    ctx.fillRect(x - 4 * scale, y - 14 * scale, 8 * scale, 26 * scale);
    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.arc(x, y - 24 * scale, 20 * scale, 0, Math.PI * 2);
    ctx.arc(x - 16 * scale, y - 14 * scale, 14 * scale, 0, Math.PI * 2);
    ctx.arc(x + 16 * scale, y - 14 * scale, 14 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawFlower = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string, open = 1): void => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(open, open);
    ctx.fillStyle = petal;
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#FFD24D';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawMidground = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    const { width: w, height: h, region, theme, quality } = s;
    const baseY = region.y + region.height; // ground line near safe-region bottom
    const scale = Math.max(0.8, Math.min(1.6, (h / 768)));

    // Trees hug the outer left/right edges, clear of the central glyph.
    const leaf = theme.id === 'number' ? '#7FB3E8' : theme.id === 'alphabet' ? '#9C84E8' : '#6FC79A';
    drawTree(ctx, w * 0.06, baseY, scale * 1.05, leaf);
    drawTree(ctx, w * 0.95, baseY + h * 0.02, scale * 0.9, leaf);

    if (quality.maxParticles > 0) {
        // A few flowers in the bottom corners only.
        drawFlower(ctx, w * 0.12, baseY + h * 0.05, 6 * scale, theme.background.accent);
        drawFlower(ctx, w * 0.9, baseY + h * 0.06, 6 * scale, theme.background.accent);
    }
};

// ─────────────────────────────────────────────────────────────────────────
// LAYER 4: track (contact shadow + base) and set pieces (start / finish)
// ─────────────────────────────────────────────────────────────────────────

const drawTrackShadow = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    const { width: w, height: h, metrics, quality } = s;
    if (!quality.glow) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(48,38,70,0.16)';
    ctx.lineWidth = metrics.trackWidthPx;
    const off = metrics.trackWidthPx * 0.16;
    for (const stroke of s.strokes) {
        if (stroke.points.length < 2) continue;
        smoothPath(ctx, stroke.points, w, h, 0, off);
        ctx.stroke();
    }
    ctx.restore();
};

const drawTrackBase = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    const { width: w, height: h, metrics, theme, quality } = s;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of s.strokes) {
        if (stroke.points.length < 2) continue;
        smoothPath(ctx, stroke.points, w, h);
        ctx.strokeStyle = theme.track.edge;
        ctx.lineWidth = metrics.trackWidthPx;
        ctx.stroke();

        smoothPath(ctx, stroke.points, w, h);
        ctx.strokeStyle = theme.track.surface;
        ctx.lineWidth = Math.max(2, metrics.trackWidthPx - metrics.trackBorderPx * 2);
        ctx.stroke();

        if (quality.centreGuide) {
            ctx.save();
            smoothPath(ctx, stroke.points, w, h);
            ctx.strokeStyle = theme.track.centreGuide;
            ctx.lineWidth = metrics.centreGuidePx;
            ctx.setLineDash([metrics.centreGuidePx * 3, metrics.centreGuidePx * 4]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
    ctx.restore();
};

const drawStartPlatform = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    const { width: w, height: h, metrics, theme, quality } = s;
    const cx = s.start.x * w;
    const cy = s.start.y * h;
    const r = metrics.startMarkerPx / 2;
    const pulse = s.pulseStart && quality.animate ? 0.5 + 0.5 * Math.sin(s.now * 0.005) : 0;

    ctx.save();
    // Launch pad (an ellipse the vehicle parks on).
    ctx.fillStyle = 'rgba(48,38,70,0.14)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.5, r * 1.15, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.startMarker.ring;
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.42, r * 1.05, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    if (s.pulseStart && quality.glow) {
        ctx.globalAlpha = 0.22 + 0.2 * pulse;
        ctx.fillStyle = theme.startMarker.fill;
        ctx.beginPath();
        ctx.arc(cx, cy, r * (1.2 + 0.12 * pulse), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    // Green start disc + star.
    ctx.fillStyle = theme.startMarker.ring;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.startMarker.fill;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2);
    ctx.fill();
    vectorStar(ctx, cx, cy, r * 0.4, theme.startMarker.ring);
    ctx.restore();

    // "Start here" sign only during first-time guidance.
    if (s.showStartSign) {
        const sx = cx - r * 1.6;
        const sy = cy - r * 1.5;
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        roundRectPath(ctx, sx - r * 0.9, sy - r * 0.5, r * 1.8, r * 0.7, r * 0.18);
        ctx.fill();
        ctx.fillStyle = theme.startMarker.fill;
        ctx.font = `bold ${Math.round(r * 0.34)}px Outfit, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Start here', sx, sy - r * 0.14);
        // little post
        ctx.fillStyle = '#9A6B43';
        ctx.fillRect(sx - r * 0.05, sy - r * 0.14, r * 0.1, r * 0.7);
        ctx.restore();
    }
};

const drawFinishDestination = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    const { width: w, height: h, metrics, theme, quality } = s;
    const cx = s.finish.x * w;
    const cy = s.finish.y * h;
    const r = (metrics.finishMarkerPx / 2) * (s.emphasizeFinish ? 1.05 : 0.92);
    const glow = s.emphasizeFinish && quality.glow;

    ctx.save();
    // Goal pad.
    ctx.fillStyle = 'rgba(48,38,70,0.14)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.5, r * 1.1, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flag pole + pennant — themed by glyph type via the pennant glyph.
    const poleX = cx + r * 0.7;
    ctx.strokeStyle = '#9A6B43';
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(poleX, cy + r * 0.3);
    ctx.lineTo(poleX, cy - r * 1.2);
    ctx.stroke();
    ctx.fillStyle = theme.finishMarker.fill;
    if (glow) {
        ctx.shadowBlur = 18 * quality.shadowScale;
        ctx.shadowColor = theme.finishMarker.fill;
    }
    ctx.beginPath();
    ctx.moveTo(poleX, cy - r * 1.2);
    ctx.lineTo(poleX - r * 0.9, cy - r * 0.95);
    ctx.lineTo(poleX, cy - r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Destination disc + gold star.
    ctx.globalAlpha = s.emphasizeFinish ? 1 : 0.9;
    ctx.fillStyle = theme.finishMarker.ring;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.finishMarker.fill;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.64, 0, Math.PI * 2);
    ctx.fill();
    vectorStar(ctx, cx, cy, r * 0.4, theme.finishMarker.ring);

    // Small type-specific token on the pennant area.
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(r * 0.34)}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const token = s.glyphType === 'number' ? '#' : s.glyphType === 'shape' ? '◇' : 'A';
    ctx.fillText(token, poleX - r * 0.42, cy - r * 0.95);
    ctx.restore();
};

const roundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, ww: number, hh: number, r: number): void => {
    const rr = Math.min(r, ww / 2, hh / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + ww, y, x + ww, y + hh, rr);
    ctx.arcTo(x + ww, y + hh, x, y + hh, rr);
    ctx.arcTo(x, y + hh, x, y, rr);
    ctx.arcTo(x, y, x + ww, y, rr);
    ctx.closePath();
};

// ─────────────────────────────────────────────────────────────────────────
// DYNAMIC: completed fill, progress blooms, preview, numbers, beam, particles
// ─────────────────────────────────────────────────────────────────────────

const drawCompleted = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    const { width: w, height: h, metrics, theme, quality } = s;
    for (const stroke of s.strokes) {
        const frac = stroke.status === 'done' ? 1 : stroke.status === 'current' ? stroke.progress : 0;
        if (frac <= 0 || stroke.points.length < 2) continue;
        const filled = sliceTo(stroke.points, frac, w, h);
        if (filled.length < 2) continue;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (quality.glow) {
            ctx.shadowBlur = 16 * quality.shadowScale;
            ctx.shadowColor = theme.track.glow;
        }
        smoothPath(ctx, filled, w, h);
        ctx.strokeStyle = theme.track.completed;
        ctx.lineWidth = Math.max(2, metrics.trackWidthPx - metrics.trackBorderPx * 2);
        ctx.stroke();

        if (stroke.status === 'current' && quality.animate) {
            const head = filled[filled.length - 1];
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(head.x * w, head.y * h, Math.max(2, metrics.centreGuidePx * 1.5), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
};

// Progress blooms: a couple of flowers beside the route that open as the
// child passes them (one or two responses per activity, not the whole scene).
const drawProgressBlooms = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    if (s.strokes.length === 0 || s.quality.maxParticles <= 0) return;
    const { width: w, height: h, theme } = s;
    const marks = [0.4, 0.78];
    const main = s.strokes[Math.floor(s.strokes.length / 2)] ?? s.strokes[0];
    if (!main || main.points.length < 2) return;
    marks.forEach((m, idx) => {
        const open = Math.max(0, Math.min(1, (s.overallProgress - m + 0.12) / 0.12));
        if (open <= 0) return;
        const p = sliceTo(main.points, m, w, h);
        const tip = p[p.length - 1];
        const nx = tip.x * w + (idx === 0 ? -1 : 1) * s.metrics.trackWidthPx * 0.9;
        const ny = tip.y * h - s.metrics.trackWidthPx * 0.5;
        drawFlower(ctx, nx, ny, 5 * Math.max(0.8, h / 768), theme.background.accent, open);
    });
};

const drawGuideBeam = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    if (!s.guideTarget || !s.vehicle) return;
    const { width: w, height: h, theme } = s;
    ctx.save();
    ctx.strokeStyle = theme.track.glow;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(2, s.metrics.centreGuidePx);
    ctx.setLineDash([s.metrics.centreGuidePx * 2, s.metrics.centreGuidePx * 3]);
    ctx.beginPath();
    ctx.moveTo(s.vehicle.x * w, s.vehicle.y * h);
    ctx.lineTo(s.guideTarget.x * w, s.guideTarget.y * h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
};

const drawDirectionPreview = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    if (!s.preview) return;
    const stroke = s.strokes[s.preview.strokeIndex];
    if (!stroke || stroke.points.length < 2) return;
    const { width: w, height: h, metrics, theme } = s;
    const head = sliceTo(stroke.points, s.preview.t, w, h);
    if (head.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.5;
    smoothPath(ctx, head, w, h);
    ctx.strokeStyle = theme.track.glow;
    ctx.lineWidth = Math.max(2, metrics.trackWidthPx - metrics.trackBorderPx * 2);
    ctx.stroke();
    ctx.restore();
    const tip = head[head.length - 1];
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = s.quality.glow ? 14 * s.quality.shadowScale : 0;
    ctx.shadowColor = theme.track.completed;
    ctx.beginPath();
    ctx.arc(tip.x * w, tip.y * h, metrics.centreGuidePx * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawStrokeNumbers = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    if (!s.showStrokeNumbers) return;
    const { width: w, height: h, metrics, theme } = s;
    for (const stroke of s.strokes) {
        if (stroke.status === 'done') continue;
        const p = stroke.points[0];
        const cx = p.x * w;
        const cy = p.y * h;
        const r = metrics.centreGuidePx * 3.4;
        ctx.save();
        ctx.fillStyle = stroke.status === 'current' ? theme.track.completed : theme.startMarker.fill;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.round(r * 1.3)}px Outfit, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(stroke.order), cx, cy + r * 0.05);
        ctx.restore();
    }
};

export const drawParticles = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    if (s.particles.length === 0) return;
    const { width: w, height: h } = s;
    ctx.save();
    for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.color;
        if (s.quality.glow) {
            ctx.shadowBlur = 4 * s.quality.shadowScale;
            ctx.shadowColor = p.color;
        }
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.size * Math.max(0.2, p.life), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
};

// ─────────────────────────────────────────────────────────────────────────
// Composition
// ─────────────────────────────────────────────────────────────────────────

/**
 * Static world — cacheable scenery that only changes on resize/theme/activity:
 * sky, distant layer, midground props, track contact shadow + base lanes.
 * Animated/progress-driven set pieces live in the dynamic layer.
 */
export const drawStaticWorld = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    drawSky(ctx, s);
    if (s.envEnabled) {
        drawDistant(ctx, s);
        drawMidground(ctx, s);
    }
    drawTrackShadow(ctx, s);
    drawTrackBase(ctx, s);
};

/** Dynamic world — redrawn each frame (vehicle is drawn by the engine after). */
export const drawDynamicWorld = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    if (s.envEnabled) drawFinishDestination(ctx, s);
    drawStartPlatform(ctx, s);
    drawCompleted(ctx, s);
    if (s.envEnabled) drawProgressBlooms(ctx, s);
    drawDirectionPreview(ctx, s);
    drawStrokeNumbers(ctx, s);
    drawGuideBeam(ctx, s);
    drawParticles(ctx, s);
};

/** Convenience for non-cached callers (e.g. headless screenshots). */
export const renderTrackWorld = (ctx: CanvasRenderingContext2D, s: RenderScene): void => {
    drawStaticWorld(ctx, s);
    drawDynamicWorld(ctx, s);
};

/** Create an offscreen canvas for static-layer caching, or null if unavailable. */
export const makeOffscreen = (w: number, h: number): { canvas: CanvasImageSource; ctx: CanvasRenderingContext2D } | null => {
    try {
        if (typeof OffscreenCanvas !== 'undefined') {
            const c = new OffscreenCanvas(w, h);
            const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
            return ctx ? { canvas: c as unknown as CanvasImageSource, ctx } : null;
        }
        if (typeof document !== 'undefined') {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            return ctx ? { canvas: c, ctx } : null;
        }
    } catch {
        // fall through
    }
    return null;
};
