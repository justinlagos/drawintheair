/**
 * Drawing Engine - Production Ready
 * 
 * Features:
 * - One Euro Filter for low-latency smoothing
 * - Point resampling for consistent density
 * - Quadratic bezier curve rendering
 * - Proper stroke segmentation with jump protection
 * - Glow effects
 * - Variable width based on velocity
 * - Pinch-to-draw pen model
 */

import { OneEuroFilter2D } from './filters/OneEuroFilter';
import { PenStateManager, PenState, type PenState as PenStateType, type PenStateEvent } from './PenStateManager';
import { normalizedToCanvas, type NormalizedPoint } from './coordinateUtils';

// Re-export PenState for use in other components
export { PenState, type PenStateType };

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

// Filter config tuned for drawing (smooth but responsive)
const FILTER_CONFIG = {
    minCutoff: 1.2,
    beta: 0.02,
    dCutoff: 1.0
};

// Pen state config
const PEN_CONFIG = {
    minConfidence: 0.6,
    dropoutFrameThreshold: 3,
    jumpThreshold: 0.08,
    minMovement: 0.001,
    debounceFrames: 2,
    pinchDownThreshold: 0.35,
    pinchUpThreshold: 0.45
};

// Resampling config
const RESAMPLE_SPACING_PX = 3; // Pixels between resampled points
const JUMP_THRESHOLD_PX = 60; // Maximum pixel jump before breaking stroke

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

    constructor() {
        this.filter = new OneEuroFilter2D(FILTER_CONFIG);
        this.penManager = new PenStateManager(PEN_CONFIG);
    }

    setColor(color: string): void {
        this.currentColor = color;
    }

    setWidth(width: number): void {
        this.currentWidth = width;
    }

    /**
     * Update canvas dimensions for resampling and jump detection
     */
    setCanvasSize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
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

        // Smooth velocity with rolling average
        this.velocityHistory.push(velocity);
        if (this.velocityHistory.length > 5) {
            this.velocityHistory.shift();
        }
        const avgVelocity = this.velocityHistory.reduce((a, b) => a + b, 0) / this.velocityHistory.length;

        // Convert velocity to pressure (slower = higher pressure = thicker)
        const normalizedVelocity = Math.min(avgVelocity / 3, 1);
        const pressure = Math.max(0.4, 1 - normalizedVelocity * 0.5);

        // Resample points for consistent density
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

        if (distancePx < RESAMPLE_SPACING_PX) {
            // Points are close enough, just add the endpoint
            return [p1];
        }

        // Interpolate points along the line
        const numPoints = Math.floor(distancePx / RESAMPLE_SPACING_PX);
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
    }

    clear(): void {
        this.strokes = [];
        this.currentStroke = null;
        this.lastFilteredPoint = null;
        this.filter.reset();
        this.penManager.reset();
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

    /**
     * Render all strokes to canvas
     */
    render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        // Update canvas size for resampling
        if (this.canvasWidth !== width || this.canvasHeight !== height) {
            this.setCanvasSize(width, height);
        }

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const stroke of this.strokes) {
            if (stroke.points.length < 2) continue;

            // Render glow layer
            this.renderGlow(ctx, stroke, width, height);

            // Render main stroke with curves
            this.renderStroke(ctx, stroke, width, height);
        }
    }

    private renderGlow(
        ctx: CanvasRenderingContext2D,
        stroke: Stroke,
        width: number,
        height: number
    ): void {
        ctx.save();

        // Multiple glow passes
        const glowLayers = [
            { blur: 15, alpha: 0.1, widthMult: 2.5 },
            { blur: 8, alpha: 0.15, widthMult: 1.8 },
            { blur: 4, alpha: 0.2, widthMult: 1.3 },
        ];

        for (const layer of glowLayers) {
            ctx.filter = `blur(${layer.blur}px)`;
            ctx.globalAlpha = layer.alpha;
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.baseWidth * layer.widthMult;

            this.drawCurvePath(ctx, stroke.points, width, height);
            ctx.stroke();
        }

        ctx.restore();
    }

    private renderStroke(
        ctx: CanvasRenderingContext2D,
        stroke: Stroke,
        width: number,
        height: number
    ): void {
        const points = stroke.points;

        // For very short strokes, just draw a simple line
        if (points.length < 3) {
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.baseWidth;
            ctx.moveTo(points[0].x * width, points[0].y * height);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x * width, points[i].y * height);
            }
            ctx.stroke();
            return;
        }

        // Draw with variable width using segments
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = i > 0 ? points[i - 1] : points[i];
            const p1 = points[i];
            const p2 = points[i + 1];

            // Interpolated pressure
            const pressure = (p1.pressure ?? 1) * 0.5 + (p2.pressure ?? 1) * 0.5;
            const segmentWidth = stroke.baseWidth * pressure;

            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = segmentWidth;

            // Calculate control points for smooth curve
            if (i === 0) {
                ctx.moveTo(p1.x * width, p1.y * height);
            } else {
                const midX = (p0.x + p1.x) / 2;
                const midY = (p0.y + p1.y) / 2;
                ctx.moveTo(midX * width, midY * height);
            }

            // Quadratic bezier to midpoint of next segment
            const nextMidX = (p1.x + p2.x) / 2;
            const nextMidY = (p1.y + p2.y) / 2;

            ctx.quadraticCurveTo(
                p1.x * width,
                p1.y * height,
                nextMidX * width,
                nextMidY * height
            );

            ctx.stroke();
        }

        // Draw final segment to last point
        if (points.length >= 2) {
            const lastIdx = points.length - 1;
            const p1 = points[lastIdx - 1];
            const p2 = points[lastIdx];

            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.baseWidth * (p2.pressure ?? 1);

            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            ctx.moveTo(midX * width, midY * height);
            ctx.lineTo(p2.x * width, p2.y * height);
            ctx.stroke();
        }

        // Add subtle highlight
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, stroke.baseWidth * 0.15);
        this.drawCurvePath(ctx, points, width, height, -1, -1);
        ctx.stroke();
        ctx.restore();
    }

    private drawCurvePath(
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
}

export const drawingEngine = new DrawingEngine();
