/**
 * Guided Colouring engine — clips paint inside the line-art region under the
 * pointer so colour never spills outside the shape, tracks per-region coverage
 * for gentle "section done" feedback, and fires completion when every region
 * is coloured. Reuses the same EngineInput shape as the freeform engine so the
 * shared frame adapter (and mouse + gesture input) drive it identically.
 */

import type { EngineInput, EngineConfig, SizeId } from './magicCanvasEngine';
import { renderStroke, BRUSHES, type StrokePoint } from './paintBrushes';
import {
    regionAt,
    pointInPolygon,
    type ColouringPage,
    type ColourRegion,
} from './colouringPages';

interface CStroke { region: string; colour: string; sizePx: number; pts: { x: number; y: number }[]; }

const GRID = 48;
const REGION_DONE = 0.5; // fraction of a region's cells painted = "coloured"

export interface ColouringSnapshot {
    total: number;
    done: number;
    completed: boolean;
    justCompletedRegion: string | null;
    drawing: boolean;
    canUndo: boolean;
}

export class ColouringEngine {
    private width: number;
    private height: number;
    private config: EngineConfig;
    private page: ColouringPage;

    private strokes: CStroke[] = [];
    private live: CStroke | null = null;
    private rendered: { x: number; y: number } | null = null;
    private pinchPrev = false;
    private lastNow = 0;

    private colour = '#F07A5C';
    private sizeId: SizeId = 'big';

    private regionCells = new Map<string, Set<number>>();
    private regionTotal = new Map<string, number>();
    private coloured = new Set<string>();
    private justCompletedRegion: string | null = null;
    private completed = false;
    private completionFired = false;
    private onComplete: (() => void) | null = null;

    constructor(page: ColouringPage, width: number, height: number, config: EngineConfig) {
        this.page = page;
        this.width = width;
        this.height = height;
        this.config = config;
        this.precomputeRegionTotals();
    }

    setCompletionCallback(cb: (() => void) | null): void { this.onComplete = cb; }
    setColour(hex: string): void { this.colour = hex; }
    setSize(s: SizeId): void { this.sizeId = s; }
    setConfig(c: EngineConfig): void { this.config = c; }
    resize(w: number, h: number): void { this.width = w; this.height = h; }
    setPage(page: ColouringPage): void { this.page = page; this.clear(); this.precomputeRegionTotals(); }

    get drawing(): boolean { return this.live !== null; }
    get canUndo(): boolean { return this.strokes.length > 0; }

    private sizePx(): number {
        const vmin = Math.min(this.width, this.height);
        const m = this.sizeId === 'small' ? 0.02 : this.sizeId === 'big' ? 0.05 : 0.035;
        return Math.max(4, vmin * m);
    }

    // The picture sits in a centred box (a colouring-book "page"), not full
    // bleed. Map between page DESIGN coords (0..1) and SCREEN-normalized coords.
    private box() { const s = Math.min(this.width, this.height) * 0.6; return { x: (this.width - s) / 2, y: (this.height - s) / 2 - this.height * 0.03, s }; }
    private d2s(p: { x: number; y: number }) { const b = this.box(); return { x: (b.x + p.x * b.s) / this.width, y: (b.y + p.y * b.s) / this.height }; }
    private s2d(p: { x: number; y: number }) { const b = this.box(); return { x: (p.x * this.width - b.x) / b.s, y: (p.y * this.height - b.y) / b.s }; }

    private precomputeRegionTotals(): void {
        this.regionTotal.clear();
        for (const r of this.page.regions) {
            let total = 0;
            for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) {
                if (pointInPolygon((gx + 0.5) / GRID, (gy + 0.5) / GRID, r.polygon)) total++;
            }
            this.regionTotal.set(r.id, Math.max(1, total));
        }
    }

    clear(): void {
        this.strokes = [];
        this.live = null;
        this.regionCells.clear();
        this.coloured.clear();
        this.completed = false;
        this.completionFired = false;
        this.justCompletedRegion = null;
    }

    undo(): void {
        if (this.strokes.length === 0) return;
        this.strokes.pop();
        this.rebuildCoverage();
    }

    private rebuildCoverage(): void {
        this.regionCells.clear();
        this.coloured.clear();
        this.completed = false;
        this.completionFired = false;
        for (const s of this.strokes) for (const p of s.pts) this.mark(s.region, p.x, p.y);
        for (const r of this.page.regions) this.checkRegion(r.id, false);
    }

    private mark(region: string, x: number, y: number): void {
        const r = this.page.regions.find((rr) => rr.id === region);
        if (!r) return;
        const d = this.s2d({ x, y }); // x,y are screen-normalized; coverage works in design space
        if (!pointInPolygon(d.x, d.y, r.polygon)) return; // coverage only counts INSIDE the region
        const gx = Math.max(0, Math.min(GRID - 1, Math.floor(d.x * GRID)));
        const gy = Math.max(0, Math.min(GRID - 1, Math.floor(d.y * GRID)));
        let set = this.regionCells.get(region);
        if (!set) { set = new Set(); this.regionCells.set(region, set); }
        set.add(gy * GRID + gx);
    }

    private checkRegion(region: string, allowFeedback: boolean): void {
        if (this.coloured.has(region)) return;
        const cov = (this.regionCells.get(region)?.size ?? 0) / (this.regionTotal.get(region) ?? 1);
        if (cov >= REGION_DONE) {
            this.coloured.add(region);
            if (allowFeedback) this.justCompletedRegion = region;
            if (this.coloured.size === this.page.regions.length && !this.completed) {
                this.completed = true;
                if (!this.completionFired) { this.completionFired = true; this.onComplete?.(); }
            }
        }
    }

    update(input: EngineInput): ColouringSnapshot {
        this.justCompletedRegion = null;
        const now = input.now;
        const pinch = input.pinch && input.hasHand;

        if (!input.hasHand) {
            if (this.live) this.endStroke(); // tracking loss ends the stroke (no reconnect)
            this.pinchPrev = pinch;
            this.lastNow = now;
            return this.snapshot();
        }
        if (input.pointer) this.updateRendered(input.pointer);

        const penDown = pinch && !this.pinchPrev;
        if (penDown && this.rendered) {
            const d = this.s2d(this.rendered);
            const r = regionAt(this.page, d.x, d.y);
            this.live = { region: r ? r.id : '', colour: this.colour, sizePx: this.sizePx(), pts: [] };
            this.addPoint();
        } else if (pinch && this.live && this.rendered) {
            this.addPoint();
        }
        if (!pinch && this.pinchPrev) this.endStroke();

        this.pinchPrev = pinch;
        this.lastNow = now;
        return this.snapshot();
    }

    private updateRendered(raw: { x: number; y: number }): void {
        // Track the (already-filtered) point directly — no added lag.
        this.rendered = { x: raw.x, y: raw.y };
    }

    private addPoint(): void {
        if (!this.live || !this.rendered) return;
        if (!this.live.region) return; // started outside any region — nothing to colour
        const p = this.rendered;
        const last = this.live.pts[this.live.pts.length - 1];
        // Interpolate big gaps so a quick swipe fills continuously (no specks).
        if (last) {
            const moved = Math.hypot(p.x - last.x, p.y - last.y);
            const STEP = 0.008;
            if (moved > STEP) {
                const n = Math.min(60, Math.floor(moved / STEP));
                for (let i = 1; i < n; i++) {
                    const t = i / n;
                    const ix = last.x + (p.x - last.x) * t;
                    const iy = last.y + (p.y - last.y) * t;
                    this.live.pts.push({ x: ix, y: iy });
                    this.mark(this.live.region, ix, iy);
                }
            }
        }
        this.live.pts.push({ x: p.x, y: p.y });
        this.mark(this.live.region, p.x, p.y);
        this.checkRegion(this.live.region, true);
    }

    private endStroke(): void {
        if (!this.live) return;
        if (this.live.pts.length > 0 && this.live.region) this.strokes.push(this.live);
        this.live = null;
    }

    private snapshot(): ColouringSnapshot {
        return {
            total: this.page.regions.length,
            done: this.coloured.size,
            completed: this.completed,
            justCompletedRegion: this.justCompletedRegion,
            drawing: this.live !== null,
            canUndo: this.strokes.length > 0,
        };
    }
    getSnapshot(): ColouringSnapshot { return this.snapshot(); }

    // ── rendering ──────────────────────────────────────────────────────────
    /** Region polygon mapped to SCREEN pixels (through the centred page box). */
    private polyPx(poly: { x: number; y: number }[]): { x: number; y: number }[] {
        return poly.map((p) => { const s = this.d2s(p); return { x: s.x * this.width, y: s.y * this.height }; });
    }
    private clipTo(ctx: CanvasRenderingContext2D, region: string): boolean {
        const r = this.page.regions.find((rr) => rr.id === region);
        if (!r) return false;
        const pts = this.polyPx(r.polygon);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.clip();
        return true;
    }
    private toPx(s: CStroke): StrokePoint[] {
        return s.pts.map((p) => ({ x: p.x * this.width, y: p.y * this.height, w: s.sizePx }));
    }
    private centroid(r: ColourRegion): { x: number; y: number } {
        let x = 0, y = 0; for (const p of r.polygon) { x += p.x; y += p.y; }
        const c = this.d2s({ x: x / r.polygon.length, y: y / r.polygon.length });
        return { x: c.x * this.width, y: c.y * this.height };
    }

    render(ctx: CanvasRenderingContext2D, now = this.lastNow): void {
        const q = { glow: false, shadowScale: 0, texture: false, particles: 0 } as const;
        // Paper background.
        ctx.fillStyle = '#FFFDF5';
        ctx.fillRect(0, 0, this.width, this.height);

        // Painted strokes, each clipped to its region.
        const drawClipped = (s: CStroke) => {
            ctx.save();
            if (this.clipTo(ctx, s.region)) renderStroke(ctx, this.toPx(s), s.colour, BRUSHES.paint, q, { settled: true });
            ctx.restore();
        };
        for (const s of this.strokes) drawClipped(s);
        if (this.live && this.live.pts.length > 0) drawClipped(this.live);

        // Line-art outline on top.
        ctx.save();
        ctx.strokeStyle = '#2B2742';
        ctx.lineWidth = Math.max(2.5, Math.min(this.width, this.height) * 0.006);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (const poly of this.page.outline) {
            const pts = this.polyPx(poly);
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();
        }
        ctx.restore();

        // Gentle "section done" check marks.
        for (const r of this.page.regions) {
            if (!this.coloured.has(r.id)) continue;
            const c = this.centroid(r);
            const pulse = this.config.reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(now * 0.004);
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = '#5BCE9A';
            const rr = Math.min(this.width, this.height) * 0.026 * pulse;
            ctx.beginPath(); ctx.arc(c.x, c.y, rr, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, rr * 0.22); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(c.x - rr * 0.4, c.y); ctx.lineTo(c.x - rr * 0.1, c.y + rr * 0.35); ctx.lineTo(c.x + rr * 0.45, c.y - rr * 0.35); ctx.stroke();
            ctx.restore();
        }

        // Pointer.
        if (this.rendered) {
            ctx.save();
            ctx.fillStyle = this.colour;
            ctx.beginPath(); ctx.arc(this.rendered.x * this.width, this.rendered.y * this.height, Math.max(3, this.sizePx() * 0.4), 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        }
    }
}
