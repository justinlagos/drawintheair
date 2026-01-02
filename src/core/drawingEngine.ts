export interface Point {
    x: number;
    y: number;
}

export interface Stroke {
    points: Point[];
    color: string;
    width: number;
}

export class DrawingEngine {
    private strokes: Stroke[] = [];
    private currentStroke: Stroke | null = null;
    private currentColor: string = '#ff006e';
    private currentWidth: number = 8;
    private smoothingFactor = 0.5; // Simple exponential smoothing

    constructor() { }

    setColor(color: string) {
        this.currentColor = color;
    }

    setWidth(width: number) {
        this.currentWidth = width;
    }

    startStroke(point: Point) {
        // If we're already drawing (and maybe lost tracking for a frame), we might want to continue?
        // For now, start new stroke.
        this.currentStroke = {
            points: [point],
            color: this.currentColor,
            width: this.currentWidth,
        };
        this.strokes.push(this.currentStroke);
    }

    addPoint(point: Point) {
        if (!this.currentStroke) {
            this.startStroke(point);
            return;
        }

        const lastPoint = this.currentStroke.points[this.currentStroke.points.length - 1];

        // Simple smoothing
        const smoothedPoint = {
            x: lastPoint.x + (point.x - lastPoint.x) * this.smoothingFactor,
            y: lastPoint.y + (point.y - lastPoint.y) * this.smoothingFactor,
        };

        // Filter jitter: don't add if too close
        const dist = Math.hypot(smoothedPoint.x - lastPoint.x, smoothedPoint.y - lastPoint.y);
        if (dist > 0.001) { // Authorized normalized distance
            this.currentStroke.points.push(smoothedPoint);
        }
    }

    endStroke() {
        this.currentStroke = null;
    }

    clear() {
        this.strokes = [];
        this.currentStroke = null;
    }

    render(ctx: CanvasRenderingContext2D, width: number, height: number) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        this.strokes.forEach(stroke => {
            if (stroke.points.length < 2) return;

            ctx.beginPath();
            ctx.lineWidth = stroke.width;
            ctx.strokeStyle = stroke.color;

            // Draw stroke
            ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
            for (let i = 1; i < stroke.points.length; i++) {
                // Quadratic bezier for smoothness? Or just lineTo for MVP first pass?
                // Let's do simple lineTo for now, can upgrade to Catmull-Rom or Quadratic later.
                // Actually, quadratic is easy and looks much better.
                // For MVP, lineTo with smoothed points is okay.
                ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
            }
            ctx.stroke();
        });
    }
}

export const drawingEngine = new DrawingEngine();
