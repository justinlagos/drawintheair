/**
 * Drawing Engine - Production Ready with Ultra-Smooth Strokes
 * 
 * Features:
 * - One Euro Filter for low-latency smoothing
 * - Point resampling for consistent density
 * - Catmull-Rom spline rendering for ultra-smooth curves
 * - Proper stroke segmentation with jump protection
 * - Glow effects
 * - Variable width based on velocity
 * - Pinch-to-draw pen model
 */

import { OneEuroFilter2D } from './filters/OneEuroFilter';
import { PenStateManager, PenState, type PenStateEvent } from './PenStateManager';
import { normalizedToCanvas, type NormalizedPoint } from './coordinateUtils';
import { perf } from './perf';
import { resetCanvasState } from './canvasUtils';

// Re-export PenState for use in other components
export { PenState } from './PenStateManager';

export interface Point {
    x: number;
    y: number;
    pressure?: number;
    timestamp?: number;
}

export interface Stroke {
    points: Point[];
    color: string;
    baseWidth: number;
}

// Filter config tuned for sharp, responsive tracing
const FILTER_CONFIG = {
    minCutoff: 1.8,    // Higher = less smoothing, more immediate feel
    beta: 0.02,        // Higher = more responsive to fast movements
    dCutoff: 1.0
};

// Pen state config
const PEN_CONFIG = {
    minConfidence: 0.6,
    dropoutFrameThreshold: 3,
    jumpThreshold: 0.06,   // 6% of screen = teleport (tighter)
    minMovement: 0.0008,   // Smaller threshold (was 0.001)
    debounceFrames: 2,
    pinchDownThreshold: 0.35,
    pinchUpThreshold: 0.45
};

// Resampling config (will be overridden by perf tier)
const DEFAULT_RESAMPLE_SPACING_PX = 2; // Closer spacing for smoother lines (was 3)
const JUMP_THRESHOLD_PX = 50; // Tighter jump detection (was 60)

export class DrawingEngine {
    private strokes: Stroke[] = [];
    private currentStroke: Stroke | null = null;
    private currentColor: string = '#ff006e';
    private currentWidth: number = 8;

    // Stabilization
    private filter: OneEuroFilter2D;
    private penManager: PenStateManager;
    private lastFilteredPoint: Point | null = null;
    private velocityHistory: number[] = [];
    private canvasWidth: number = 1920;
    private canvasHeight: number = 1080;
    private resampleSpacingPx: number = DEFAULT_RESAMPLE_SPACING_PX;

    // Offscreen cache for committed strokes — avoids full redraw every frame
    private committedCanvas: HTMLCanvasElement | null = null;
    private committedCtx: CanvasRenderingContext2D | null = null;
    private committedDirty = true;

    constructor() {
        this.filter = new OneEuroFilter2D(FILTER_CONFIG);
        this.penManager = new PenStateManager(PEN_CONFIG);
        // Update resample spacing based on perf tier
        this.updatePerfSettings();
    }
    
    /**
     * Update performance settings from perf config
     */
    private updatePerfSettings(): void {
        const config = perf.getConfig();
        this.resampleSpacingPx = config.resampleSpacingPx;
    }

    setColor(color: string): void {
        this.currentColor = color;
    }

    setWidth(width: number): void {
        this.currentWidth = width;
    }

    getCurrentWidth(): number {
        return this.currentWidth;
    }

    /**
     * Update canvas dimensions for resampling and jump detection
     */
    setCanvasSize(width: number, height: number): void {
        if (this.canvasWidth !== width || this.canvasHeight !== height) {
            this.canvasWidth = width;
            this.canvasHeight = height;
            this.committedDirty = true; // Canvas resized — rebuild offscreen cache
        }
    }

    /**
     * Process a new point from tracking with pinch detection
     * Returns the pen state event for UI feedback
     */
    processPoint(
        indexTip: NormalizedPoint | null,
        thumbTip: NormalizedPoint | null,
        handScale: number,
        confidence: number,
        timestamp: number
    ): PenStateEvent {
        // Get pen state decision from pinch detection
        const event = this.penManager.process(
            indexTip,
            thumbTip,
            handScale,
            confidence
        );

        switch (event.type) {
            case 'stroke_start':
                if (event.position) {
                    this.startStroke(event.position, timestamp);
                }
                break;

            case 'stroke_continue':
                if (event.position) {
                    this.addPointInternal(event.position, timestamp);
                }
                break;

            case 'stroke_end':
                this.endStroke();
                break;
        }

        return event;
    }

    private startStroke(point: NormalizedPoint, timestamp: number): void {
        // Reset filter for new stroke
        this.filter.reset();
        this.velocityHistory = [];
        this.lastFilteredPoint = null;

        // Filter the starting point
        const filtered = this.filter.filter(point.x, point.y, timestamp);

        this.currentStroke = {
            points: [{
                x: filtered.x,
                y: filtered.y,
                pressure: 1.0,
                timestamp
            }],
            color: this.currentColor,
            baseWidth: this.currentWidth
        };
        this.strokes.push(this.currentStroke);
        this.lastFilteredPoint = { x: filtered.x, y: filtered.y, timestamp };
    }

    private addPointInternal(point: NormalizedPoint, timestamp: number): void {
        if (!this.currentStroke || !this.lastFilteredPoint) return;

        // Apply One Euro Filter
        const filtered = this.filter.filter(point.x, point.y, timestamp);

        // Jump protection in pixels
        const lastCanvas = normalizedToCanvas(
            this.lastFilteredPoint,
            this.canvasWidth,
            this.canvasHeight
        );
        const currentCanvas = normalizedToCanvas(
            { x: filtered.x, y: filtered.y },
            this.canvasWidth,
            this.canvasHeight
        );
        const jumpPx = Math.hypot(
            currentCanvas.x - lastCanvas.x,
            currentCanvas.y - lastCanvas.y
        );

        if (jumpPx > JUMP_THRESHOLD_PX) {
            // Break stroke due to jump
            this.endStroke();
            // Start new stroke at new position
            this.startStroke({ x: filtered.x, y: filtered.y }, timestamp);
            return;
        }

        // Calculate velocity for pressure simulation
        const dt = Math.max((timestamp - (this.lastFilteredPoint.timestamp ?? timestamp)) / 1000, 0.001);
        const distance = Math.hypot(
            filtered.x - this.lastFilteredPoint.x,
            filtered.y - this.lastFilteredPoint.y
        );
        const velocity = distance / dt;

        // Smooth velocity with rolling average (larger window)
        this.velocityHistory.push(velocity);
        if (this.velocityHistory.length > 8) {
            this.velocityHistory.shift();
        }
        const avgVelocity = this.velocityHistory.reduce((a, b) => a + b, 0) / this.velocityHistory.length;

        // Convert velocity to pressure (slower = higher pressure = thicker)
        const normalizedVelocity = Math.min(avgVelocity / 2.5, 1);
        const pressure = Math.max(0.5, 1 - normalizedVelocity * 0.4);

        // Resample points for consistent density (spacing varies by perf tier)
        const resampledPoints = this.resamplePoints(
            this.lastFilteredPoint,
            { x: filtered.x, y: filtered.y, pressure, timestamp }
        );

        // Add resampled points
        for (const resampled of resampledPoints) {
            this.currentStroke.points.push(resampled);
        }

        this.lastFilteredPoint = { x: filtered.x, y: filtered.y, timestamp };
    }

    /**
     * Resample points to maintain consistent spacing
     */
    private resamplePoints(
        p0: Point,
        p1: Point
    ): Point[] {
        const canvas0 = normalizedToCanvas(p0, this.canvasWidth, this.canvasHeight);
        const canvas1 = normalizedToCanvas(p1, this.canvasWidth, this.canvasHeight);
        const distancePx = Math.hypot(canvas1.x - canvas0.x, canvas1.y - canvas0.y);
        
        // Use perf-based resample spacing
        this.updatePerfSettings();

        if (distancePx < this.resampleSpacingPx) {
            // Points are close enough, just add the endpoint
            return [p1];
        }

        // Interpolate points along the line
        const numPoints = Math.floor(distancePx / this.resampleSpacingPx);
        const points: Point[] = [];

        for (let i = 1; i <= numPoints; i++) {
            const t = i / (numPoints + 1);
            const interpX = p0.x + (p1.x - p0.x) * t;
            const interpY = p0.y + (p1.y - p0.y) * t;
            const interpPressure = (p0.pressure ?? 1) + ((p1.pressure ?? 1) - (p0.pressure ?? 1)) * t;

            points.push({
                x: interpX,
                y: interpY,
                pressure: interpPressure,
                timestamp: p1.timestamp
            });
        }

        // Always include the endpoint
        points.push(p1);

        return points;
    }

    /**
     * Legacy method for backwards compatibility
     */
    addPoint(point: Point): void {
        const timestamp = Date.now();
        this.processPoint(
            point,
            { x: point.x, y: point.y }, // Dummy thumb tip
            0.1, // Default hand scale
            1.0,
            timestamp
        );
    }

    /**
     * Legacy method for backwards compatibility
     */
    startStrokeLegacy(point: Point): void {
        this.startStroke(point, Date.now());
    }

    endStroke(): void {
        this.currentStroke = null;
        this.lastFilteredPoint = null;
        this.filter.reset();
        this.committedDirty = true; // New committed stroke — rebuild offscreen cache
    }

    clear(): void {
        this.strokes = [];
        this.currentStroke = null;
        this.lastFilteredPoint = null;
        this.filter.reset();
        this.penManager.reset();
        this.committedDirty = true; // Canvas cleared — rebuild offscreen cache
    }

    /**
     * Get current pen state for UI
     */
    getPenState(): PenState {
        return this.penManager.getState();
    }

    /**
     * Force pen up
     */
    forcePenUp(): void {
        this.penManager.forceUp();
        this.endStroke();
    }

    // ─────────────────────────────────────────────────────────────
    // Offscreen committed-stroke cache helpers
    // ─────────────────────────────────────────────────────────────

    /**
     * Ensure the offscreen canvas exists and matches the target dimensions.
     * A dimension mismatch (e.g. window resize) sets committedDirty = true so
     * the cache is rebuilt on the next render call.
     */
    private _ensureCommittedCanvas(width: number, height: number): void {
        if (!this.committedCanvas) {
            this.committedCanvas = document.createElement('canvas');
            this.committedCtx = this.committedCanvas.getContext('2d');
        }
        if (this.committedCanvas.width !== width || this.committedCanvas.height !== height) {
            this.committedCanvas.width = width;
            this.committedCanvas.height = height;
            this.committedDirty = true; // Resize clears the offscreen — must rebuild
        }
    }

    /**
     * Redraw all committed strokes (all strokes except the live currentStroke)
     * into the offscreen canvas.  Called at most once per stroke-commit event.
     */
    private _rebuildCommittedCanvas(width: number, height: number): void {
        this._ensureCommittedCanvas(width, height);
        if (!this.committedCtx || !this.committedCanvas) return;

        const offCtx = this.committedCtx;
        const perfConfig = perf.getConfig();

        resetCanvasState(offCtx);
        offCtx.clearRect(0, 0, width, height);

        for (const stroke of this.strokes) {
            if (stroke === this.currentStroke) continue; // active stroke drawn separately
            if (stroke.points.length < 2) continue;
            this.renderStrokeWithGlow(offCtx, stroke, width, height, perfConfig);
        }
    }

    // ─────────────────────────────────────────────────────────────

    /**
     * Render all strokes to canvas using Catmull-Rom splines for ultra-smooth curves.
     * Performance: committed strokes are cached in an offscreen canvas and composited
     * with a single drawImage call each frame; only the live stroke is redrawn.
     */
    render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        // Sync canvas size (marks dirty if changed)
        if (this.canvasWidth !== width || this.canvasHeight !== height) {
            this.setCanvasSize(width, height);
        }

        this.updatePerfSettings();

        // Rebuild offscreen cache only when committed strokes changed
        if (this.committedDirty) {
            this._rebuildCommittedCanvas(width, height);
            this.committedDirty = false;
        }

        const perfConfig = perf.getConfig();

        // Phase 4: Reset canvas state at start of render pass
        resetCanvasState(ctx);

        // Composite cached committed strokes (O(1) per frame when not dirty)
        if (this.committedCanvas) {
            ctx.drawImage(this.committedCanvas, 0, 0);
        }

        // Render only the live stroke (the part that changes every frame)
        if (this.currentStroke && this.currentStroke.points.length >= 2) {
            this.renderStrokeWithGlow(ctx, this.currentStroke, width, height, perfConfig);
        }
    }

    /**
     * Phase 5: Render only committed strokes (for base layer).
     * Performance: same offscreen cache as render() — O(1) drawImage per frame.
     */
    renderCommittedStrokes(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        if (this.canvasWidth !== width || this.canvasHeight !== height) {
            this.setCanvasSize(width, height);
        }

        this.updatePerfSettings();

        if (this.committedDirty) {
            this._rebuildCommittedCanvas(width, height);
            this.committedDirty = false;
        }

        resetCanvasState(ctx);

        if (this.committedCanvas) {
            ctx.drawImage(this.committedCanvas, 0, 0);
        }
    }

    /**
     * Phase 5: Render only current stroke (for preview layer)
     * Called every frame while drawing
     */
    renderCurrentStroke(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        resetCanvasState(ctx);
        
        if (this.canvasWidth !== width || this.canvasHeight !== height) {
            this.setCanvasSize(width, height);
        }
        
        this.updatePerfSettings();
        const perfConfig = perf.getConfig();

        // Render only current stroke if active
        if (this.currentStroke && this.currentStroke.points.length >= 2) {
            this.renderStrokeWithGlow(ctx, this.currentStroke, width, height, perfConfig);
        }
    }

    /**
     * Phase 5: Helper to render a single stroke with glow
     */
    private renderStrokeWithGlow(
        ctx: CanvasRenderingContext2D,
        stroke: Stroke,
        width: number,
        height: number,
        perfConfig: { visualQuality: string; glowPasses: number; shadowBlurScale: number }
    ): void {
        // Check if stroke is eraser
        const isEraser = stroke.color === '#eraser' || (stroke as any).isEraser === true;

        // Render glow layer (only if visual quality is high and not eraser)
        if (perfConfig.visualQuality === 'high' && !isEraser) {
            this.renderGlow(ctx, stroke, width, height, perfConfig);
        }

        // Render main stroke with smooth curves
        this.renderStroke(ctx, stroke, width, height, perfConfig, isEraser);
    }

    private renderGlow(
        ctx: CanvasRenderingContext2D,
        stroke: Stroke,
        width: number,
        height: number,
        perfConfig: { glowPasses: number; shadowBlurScale: number }
    ): void {
        ctx.save();

        // Multiple glow passes (reduced on low tier)
        const baseGlowLayers = [
            { blur: 18, alpha: 0.12, widthMult: 2.8 },
            { blur: 10, alpha: 0.18, widthMult: 2.0 },
            { blur: 6, alpha: 0.25, widthMult: 1.5 },
        ];
        
        const glowLayers = baseGlowLayers.slice(0, perfConfig.glowPasses);
        
        for (const layer of glowLayers) {
            ctx.filter = `blur(${layer.blur * perfConfig.shadowBlurScale}px)`;
            ctx.globalAlpha = layer.alpha;
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.baseWidth * layer.widthMult * perfConfig.shadowBlurScale;

            this.drawSmoothPath(ctx, stroke.points, width, height);
            ctx.stroke();
        }

        ctx.restore();
    }

    private renderStroke(
        ctx: CanvasRenderingContext2D,
        stroke: Stroke,
        width: number,
        height: number,
        perfConfig: { shadowBlurScale: number },
        isEraser: boolean = false
    ): void {
        const points = stroke.points;
        
        // Phase 4: Use save/restore for eraser composite mode to prevent state leakage
        ctx.save();
        
        // Set composite mode for eraser (scoped to this stroke)
        if (isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        // Crisp stroke rendering
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 0;

        // For very short strokes, just draw a simple line
        if (points.length < 3) {
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.baseWidth * 1.75;
            ctx.moveTo(points[0].x * width, points[0].y * height);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x * width, points[i].y * height);
            }
            ctx.stroke();
            ctx.restore(); // Phase 4: Restore state before early return
            return;
        }

        // Draw with Catmull-Rom splines for ultra-smooth curves
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        
        // Move to first point
        const p0 = points[0];
        ctx.moveTo(p0.x * width, p0.y * height);

        // Draw smooth curve through all points
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = i + 2 < points.length ? points[i + 2] : p2;
            const p4 = i > 0 ? points[i - 1] : p1;

            // Catmull-Rom spline control points
            const t = 0.5; // Tension
            const cp1x = p1.x * width + (p2.x * width - p4.x * width) * t;
            const cp1y = p1.y * height + (p2.y * height - p4.y * height) * t;
            const cp2x = p2.x * width - (p3.x * width - p1.x * width) * t;
            const cp2y = p2.y * height - (p3.y * height - p1.y * height) * t;

            // Use bezier curve with control points
            ctx.bezierCurveTo(
                cp1x, cp1y,
                cp2x, cp2y,
                p2.x * width, p2.y * height
            );

            // Variable width based on pressure — 1.75x thicker for visibility
            const pressure = (p1.pressure ?? 1) * 0.4 + (p2.pressure ?? 1) * 0.6;
            ctx.lineWidth = stroke.baseWidth * 1.75 * pressure;
            ctx.stroke();
            
            // Restart path for next segment with new width
            ctx.beginPath();
            ctx.moveTo(p2.x * width, p2.y * height);
        }

        // Final segment
        if (points.length >= 2) {
            const last = points[points.length - 1];
            ctx.lineWidth = stroke.baseWidth * (last.pressure ?? 1);
            ctx.stroke();
        }

        // Add subtle highlight (only on high quality)
        if (perfConfig.shadowBlurScale >= 0.8) {
            ctx.globalAlpha = 0.3 * perfConfig.shadowBlurScale;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, stroke.baseWidth * 0.2);
            this.drawSmoothPath(ctx, points, width, height, -1, -1);
            ctx.stroke();
        }
        
        // Phase 4: Restore canvas state (composite operation, alpha, etc.)
        ctx.restore();
    }

    /**
     * Draw smooth path using quadratic curves
     */
    private drawSmoothPath(
        ctx: CanvasRenderingContext2D,
        points: Point[],
        width: number,
        height: number,
        offsetX: number = 0,
        offsetY: number = 0
    ): void {
        ctx.beginPath();

        if (points.length < 2) return;

        ctx.moveTo(
            points[0].x * width + offsetX,
            points[0].y * height + offsetY
        );

        if (points.length === 2) {
            ctx.lineTo(
                points[1].x * width + offsetX,
                points[1].y * height + offsetY
            );
            return;
        }

        // Draw smooth curve through all points
        for (let i = 1; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            ctx.quadraticCurveTo(
                p1.x * width + offsetX,
                p1.y * height + offsetY,
                midX * width + offsetX,
                midY * height + offsetY
            );
        }

        // Final point
        const last = points[points.length - 1];
        ctx.lineTo(
            last.x * width + offsetX,
            last.y * height + offsetY
        );
    }

    getStrokeCount(): number {
        return this.strokes.length;
    }
    
    /**
     * Get current stroke (for undo system)
     */
    getCurrentStroke(): Stroke | null {
        return this.currentStroke;
    }
    
    /**
     * Get all strokes (for undo/redo)
     */
    getStrokes(): Stroke[] {
        return [...this.strokes];
    }
    
    /**
     * Set strokes (for undo/redo restore)
     */
    setStrokes(strokes: Stroke[]): void {
        this.strokes = [...strokes];
        this.currentStroke = null;
        this.committedDirty = true; // Strokes replaced — rebuild offscreen cache
    }
}

export const drawingEngine = new DrawingEngine();
