/**
 * Magic Canvas — drawing engine.
 *
 * Owns the live-ink pipeline (the latency-critical path) plus settled artwork,
 * measurable signals, challenge + reaction evaluation, and rendering. Designed
 * to be driven both by the live TrackingLayer frame adapter and the dev preview
 * harness, and to be unit-testable headlessly (update() needs no canvas).
 *
 * Latency model (addendum):
 *  • Three positions: raw → (lightly) stabilised → rendered (adaptive smoothing
 *    + short clamped prediction for the DISPLAYED tip only).
 *  • Immediate pen-down: stroke starts the frame the pinch crosses, at the
 *    rendered tip, with smoothing snapped (no startup lag).
 *  • Clean pen-up: stroke ends immediately, no trailing tail.
 *  • Tracking loss ends the stroke (no long reconnect); recovery needs a fresh
 *    pinch transition before a new stroke begins.
 *  • Stored stroke points are the CORRECTED rendered points (not speculative
 *    prediction), so nothing jumps after release.
 */

import {
    SignalsAccumulator,
    evaluateChallenge,
    type ChallengeProgress,
} from './challengeEngine';
import type { DrawingSignals, PaintChallenge } from './challengeModel';
import {
    PAINT_WORLDS,
    evaluateReactions,
    getWorldById,
    type PaintWorld,
} from './paintWorlds';
import {
    BRUSHES,
    renderStroke,
    widthForSpeed,
    type BrushId,
    type RenderQuality,
    type StrokePoint,
} from './paintBrushes';

export type SizeId = 'small' | 'medium' | 'big';
export type PerfTier = 'low' | 'medium' | 'high';

export interface EngineInput {
    /** Normalized canvas position (0..1), or null when no point. */
    pointer: { x: number; y: number } | null;
    pinch: boolean;
    hasHand: boolean;
    now: number;
    confidence?: number;
}

export interface EngineConfig {
    perfTier: PerfTier;
    reducedMotion: boolean;
}

interface PaintStroke {
    brushId: BrushId;
    colour: string;
    sizePx: number;
    /** Normalized points with a width factor (0..~1.2). */
    pts: { x: number; y: number; wf: number }[];
}

export interface EngineSnapshot {
    strokeCount: number;
    coloursUsed: number;
    brushesUsed: number;
    drawing: boolean;
    canUndo: boolean;
    signals: DrawingSignals;
    challenge: ChallengeProgress | null;
    challengeJustCompleted: boolean;
    activeReactions: string[];
    /** Estimated displayed-tip lead from prediction, px (diagnostic). */
    predictionPx: number;
}

const RESOLVE_QUALITY = (tier: PerfTier, reduced: boolean): RenderQuality => {
    const base: Record<PerfTier, RenderQuality> = {
        low: { glow: false, shadowScale: 0, texture: false, particles: 0 },
        medium: { glow: true, shadowScale: 0.8, texture: true, particles: 6 },
        high: { glow: true, shadowScale: 1, texture: true, particles: 12 },
    };
    const q = { ...base[tier] };
    if (reduced) {
        q.particles = Math.min(q.particles, 3);
        q.shadowScale = Math.min(q.shadowScale, 0.5);
    }
    return q;
};


function makeOffscreen(w: number, h: number): { canvas: CanvasImageSource; ctx: CanvasRenderingContext2D } | null {
    try {
        if (typeof OffscreenCanvas !== 'undefined') {
            const c = new OffscreenCanvas(w, h);
            const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
            return ctx ? { canvas: c as unknown as CanvasImageSource, ctx } : null;
        }
        if (typeof document !== 'undefined') {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const ctx = c.getContext('2d');
            return ctx ? { canvas: c, ctx } : null;
        }
    } catch { /* headless */ }
    return null;
}

export class MagicCanvasEngine {
    private width: number;
    private height: number;
    private config: EngineConfig;
    private world: PaintWorld;
    private challenge: PaintChallenge | null = null;

    private settled: PaintStroke[] = [];
    private live: PaintStroke | null = null;
    private signals = new SignalsAccumulator();

    // Live pointer model.
    private rendered: { x: number; y: number } | null = null;
    private prevRendered: { x: number; y: number } | null = null;
    private velocity = { x: 0, y: 0 };
    private lastNow = 0;
    private pinchPrev = false;
    private recovered = false;
    private predictionPx = 0;

    // Tool state.
    private brushId: BrushId = 'crayon';
    private colour = '#7BB6FF';
    private sizeId: SizeId = 'medium';

    // Settled-layer cache.
    private settledLayer: { canvas: CanvasImageSource; ctx: CanvasRenderingContext2D } | null = null;
    private settledDirty = true;
    private challengeJustCompleted = false;
    private challengeWasComplete = false;

    constructor(worldId: string, width: number, height: number, config: EngineConfig) {
        this.world = getWorldById(worldId);
        this.width = width;
        this.height = height;
        this.config = config;
        this.signals.reset(this.challenge?.zones ?? []);
    }

    // ── Setup ────────────────────────────────────────────────────────────────
    setWorld(worldId: string): void { this.world = getWorldById(worldId); this.settledDirty = true; }
    setChallenge(c: PaintChallenge | null): void {
        this.challenge = c;
        this.signals.reset(c?.zones ?? []);
        this.challengeWasComplete = false;
    }
    setColour(hex: string): void { this.colour = hex; }
    setBrush(id: BrushId): void { this.brushId = id; }
    setSize(id: SizeId): void { this.sizeId = id; }
    setConfig(c: EngineConfig): void { this.config = c; }
    resize(width: number, height: number): void { this.width = width; this.height = height; this.settledDirty = true; }

    private sizePx(): number {
        const vmin = Math.min(this.width, this.height);
        const m = this.sizeId === 'small' ? 0.012 : this.sizeId === 'big' ? 0.034 : 0.02;
        return Math.max(2, vmin * m);
    }

    get drawing(): boolean { return this.live !== null; }
    get canUndo(): boolean { return this.settled.length > 0; }

    // ── Editing ──────────────────────────────────────────────────────────────
    undo(): void {
        if (this.settled.length === 0) return;
        this.settled.pop();
        this.rebuildSignals();
        this.settledDirty = true;
    }
    clear(): void {
        this.settled = [];
        this.live = null;
        this.signals.reset(this.challenge?.zones ?? []);
        this.settledDirty = true;
        this.challengeWasComplete = false;
    }

    /** Re-derive signals from settled strokes after an undo. */
    private rebuildSignals(): void {
        this.signals.reset(this.challenge?.zones ?? []);
        let t = 0;
        for (const s of this.settled) {
            this.signals.beginStroke(s.brushId, s.colour, t);
            for (const p of s.pts) this.signals.addPoint(p.x, p.y, (t += 16));
            this.signals.endStroke((t += 16));
        }
    }

    // ── Per-frame update (latency-critical) ───────────────────────────────────
    update(input: EngineInput): EngineSnapshot {
        const { now } = input;
        const dt = this.lastNow ? Math.max(1, now - this.lastNow) : 16;
        this.challengeJustCompleted = false;
        const hasPoint = input.hasHand && !!input.pointer;
        const pinch = input.pinch && input.hasHand;

        // Tracking loss → end stroke immediately, never reconnect.
        if (!input.hasHand) {
            if (this.live) this.endLiveStroke(now);
            this.recovered = true; // next valid frame snaps the pointer
            this.pinchPrev = pinch; // false
            this.lastNow = now;
            return this.snapshot(now);
        }

        // Update rendered pointer (adaptive smoothing + prediction for the tip).
        if (hasPoint) this.updateRendered(input.pointer!, dt, input.confidence ?? 1);

        const penDown = pinch && !this.pinchPrev;
        const penUp = !pinch && this.pinchPrev;

        if (penDown && this.rendered) {
            this.beginLiveStroke(now);
            this.addLivePoint(now, true);
        } else if (pinch && this.live && this.rendered) {
            this.addLivePoint(now, false);
        }
        if (penUp) this.endLiveStroke(now);

        this.pinchPrev = pinch;
        this.lastNow = now;
        return this.snapshot(now);
    }

    private updateRendered(raw: { x: number; y: number }, dt: number, confidence: number): void {
        if (!this.rendered || this.recovered) {
            // Snap on first frame / after recovery — no startup lag, no long line.
            this.rendered = { ...raw };
            this.prevRendered = { ...raw };
            this.velocity = { x: 0, y: 0 };
            this.recovered = false;
            this.predictionPx = 0;
            return;
        }
        this.prevRendered = { ...this.rendered };
        // The incoming point is ALREADY One-Euro filtered upstream. Track it
        // directly — no extra easing, no prediction — so the ink sits exactly
        // under the fingertip with no added lag or overshoot ("jerk").
        this.rendered = { x: raw.x, y: raw.y };
        this.velocity = {
            x: (this.rendered.x - this.prevRendered.x) / dt,
            y: (this.rendered.y - this.prevRendered.y) / dt,
        };
        this.predictionPx = 0;
        void confidence;
    }

    private beginLiveStroke(now: number): void {
        this.live = { brushId: this.brushId, colour: this.colour, sizePx: this.sizePx(), pts: [] };
        this.signals.beginStroke(this.brushId, this.colour, now);
    }

    private addLivePoint(now: number, first: boolean): void {
        if (!this.live || !this.rendered) return;
        const p = this.rendered;
        const last = this.live.pts[this.live.pts.length - 1];
        const speedPx = Math.hypot(this.velocity.x, this.velocity.y) * Math.min(this.width, this.height);
        const wf = widthForSpeed(this.live.sizePx, BRUSHES[this.brushId], speedPx) / this.live.sizePx;
        if (first || !last) {
            this.live.pts.push({ x: p.x, y: p.y, wf });
            this.signals.addPoint(p.x, p.y, now);
            return;
        }
        const moved = Math.hypot(p.x - last.x, p.y - last.y);
        if (moved < 0.0012) return; // dedupe only (no aggressive down-sampling)
        // Fill big gaps so fast strokes stay continuous (no beading).
        const STEP = 0.009;
        if (moved > STEP) {
            const n = Math.min(48, Math.floor(moved / STEP));
            for (let i = 1; i < n; i++) {
                const t = i / n;
                const ix = last.x + (p.x - last.x) * t;
                const iy = last.y + (p.y - last.y) * t;
                this.live.pts.push({ x: ix, y: iy, wf });
                this.signals.addPoint(ix, iy, now);
            }
        }
        this.live.pts.push({ x: p.x, y: p.y, wf });
        this.signals.addPoint(p.x, p.y, now);
    }

    private endLiveStroke(now: number): void {
        if (!this.live) return;
        this.signals.endStroke(now);
        if (this.live.pts.length > 0) {
            this.settled.push(this.live);
            this.settledDirty = true;
        }
        this.live = null;
    }

    // ── Snapshot ───────────────────────────────────────────────────────────────
    private snapshot(now: number): EngineSnapshot {
        const signals = this.signals.getSignals(now);
        const progress = this.challenge ? evaluateChallenge(this.challenge, signals) : null;
        if (progress?.completed && !this.challengeWasComplete) {
            this.challengeJustCompleted = true;
            this.challengeWasComplete = true;
        }
        const overall = progress?.overallProgress ?? 0;
        return {
            strokeCount: signals.strokeCount,
            coloursUsed: signals.coloursUsed.length,
            brushesUsed: signals.brushesUsed.length,
            drawing: this.live !== null,
            canUndo: this.settled.length > 0,
            signals,
            challenge: progress,
            challengeJustCompleted: this.challengeJustCompleted,
            activeReactions: evaluateReactions(this.world, signals, overall),
            predictionPx: this.predictionPx,
        };
    }

    getSnapshot(now = this.lastNow): EngineSnapshot { return this.snapshot(now); }

    // ── Rendering ──────────────────────────────────────────────────────────────
    private quality(): RenderQuality { return RESOLVE_QUALITY(this.config.perfTier, this.config.reducedMotion); }

    private toPx(s: PaintStroke): StrokePoint[] {
        return s.pts.map((p) => ({ x: p.x * this.width, y: p.y * this.height, w: s.sizePx * p.wf }));
    }

    private rebuildSettledLayer(): void {
        if (!this.settledLayer) this.settledLayer = makeOffscreen(this.width, this.height);
        const target = this.settledLayer?.ctx;
        const q = this.quality();
        const draw = (ctx: CanvasRenderingContext2D) => {
            ctx.clearRect(0, 0, this.width, this.height);
            drawWorldBackground(ctx, this.world, this.width, this.height, q);
            for (const s of this.settled) {
                renderStroke(ctx, this.toPx(s), s.colour, BRUSHES[s.brushId], q, { settled: true });
            }
        };
        if (target) { draw(target); this.settledDirty = false; }
    }

    /** Paint the whole frame to a 2D context. */
    render(ctx: CanvasRenderingContext2D, now = this.lastNow): void {
        const q = this.quality();
        if (this.settledDirty) this.rebuildSettledLayer();

        if (this.settledLayer) {
            ctx.drawImage(this.settledLayer.canvas, 0, 0);
        } else {
            // Headless / no-offscreen fallback: draw world + settled inline.
            drawWorldBackground(ctx, this.world, this.width, this.height, q);
            for (const s of this.settled) renderStroke(ctx, this.toPx(s), s.colour, BRUSHES[s.brushId], q, { settled: true });
        }

        // Active reactions (dynamic, cheap).
        const snap = this.snapshot(now);
        drawReactions(ctx, this.world, snap.activeReactions, this.width, this.height, now, q);

        // Live stroke on top, immediate.
        if (this.live && this.live.pts.length > 0) {
            renderStroke(ctx, this.toPx(this.live), this.live.colour, BRUSHES[this.live.brushId], q, { settled: false });
        }

        // Brush tip — drawn EXACTLY at the tracked point (no lead) so the
        // cursor and the ink are the same place. The global MagicCursor is
        // hidden for Magic Canvas so there is only this one tip.
        if (this.rendered) {
            const tx = this.rendered.x * this.width;
            const ty = this.rendered.y * this.height;
            ctx.save();
            ctx.fillStyle = this.colour;
            if (q.glow) { ctx.shadowBlur = 8 * q.shadowScale; ctx.shadowColor = this.colour; }
            ctx.beginPath();
            ctx.arc(tx, ty, Math.max(3, this.sizePx() * 0.4), 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Compact world backgrounds + reactions (cached via the settled layer)
// ─────────────────────────────────────────────────────────────────────────

export function drawWorldBackground(ctx: CanvasRenderingContext2D, world: PaintWorld, w: number, h: number, _q: RenderQuality): void {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (world.kind === 'night') { g.addColorStop(0, '#2B2A5E'); g.addColorStop(1, '#3E3A7A'); }
    else if (world.kind === 'underwater') { g.addColorStop(0, '#BfeaF0'); g.addColorStop(1, '#7FD0CC'); }
    else if (world.kind === 'paper') { g.addColorStop(0, '#FFFDF5'); g.addColorStop(1, '#FBF4E4'); }
    else { g.addColorStop(0, '#DCF1FF'); g.addColorStop(1, '#EAF7FF'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (world.kind === 'sky') {
        ctx.fillStyle = 'rgba(91,206,154,0.5)';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.quadraticCurveTo(w * 0.5, h * 0.82, w, h);
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    } else if (world.kind === 'night') {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 18; i++) {
            const x = ((i * 97) % 100) / 100 * w;
            const y = ((i * 53) % 60) / 100 * h;
            ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,233,168,0.9)';
        ctx.beginPath(); ctx.arc(w * 0.82, h * 0.2, Math.min(w, h) * 0.06, 0, Math.PI * 2); ctx.fill();
    } else if (world.kind === 'underwater') {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 0; i < 12; i++) {
            const x = ((i * 71) % 100) / 100 * w;
            const y = (((i * 37) % 100) / 100) * h;
            ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3) * 2, 0, Math.PI * 2); ctx.fill();
        }
    } else {
        // paper grain dots
        ctx.fillStyle = 'rgba(31,27,46,0.04)';
        for (let i = 0; i < 60; i++) {
            const x = ((i * 131) % 100) / 100 * w;
            const y = ((i * 79) % 100) / 100 * h;
            ctx.fillRect(x, y, 2, 2);
        }
    }
}

export function drawReactions(ctx: CanvasRenderingContext2D, world: PaintWorld, active: string[], w: number, h: number, now: number, q: RenderQuality): void {
    if (active.length === 0) return;
    const pulse = q.shadowScale > 0 ? 0.5 + 0.5 * Math.sin(now * 0.004) : 1;
    ctx.save();
    for (const id of active) {
        const r = world.reactions.find((x) => x.id === id);
        if (!r) continue;
        if (r.effect === 'starsTwinkle') {
            ctx.fillStyle = `rgba(255,233,168,${0.6 + 0.3 * pulse})`;
            for (let i = 0; i < 6; i++) {
                const x = (0.15 + i * 0.12) * w; const y = (0.1 + (i % 2) * 0.08) * h;
                star(ctx, x, y, Math.min(w, h) * 0.012);
            }
        } else if (r.effect === 'flowersBloom') {
            for (let i = 0; i < 4; i++) flower(ctx, (0.2 + i * 0.18) * w, 0.82 * h, Math.min(w, h) * 0.02 * (0.7 + 0.3 * pulse), '#F07A5C');
        } else if (r.effect === 'bubblesRise') {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            for (let i = 0; i < 5; i++) {
                const x = (0.2 + i * 0.15) * w; const y = (0.9 - ((now * 0.00005 + i * 0.2) % 1) * 0.8) * h;
                ctx.beginPath(); ctx.arc(x, y, 4 + i, 0, Math.PI * 2); ctx.fill();
            }
        } else if (r.effect === 'borderColour') {
            ctx.strokeStyle = `rgba(138,102,240,${0.5 + 0.3 * pulse})`;
            ctx.lineWidth = 8;
            ctx.strokeRect(8, 8, w - 16, h - 16);
        }
    }
    ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * 0.45;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
}
function flower(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colour: string): void {
    ctx.fillStyle = colour;
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#FFD24D';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
}

export const ALL_WORLD_IDS = PAINT_WORLDS.map((w) => w.id);
