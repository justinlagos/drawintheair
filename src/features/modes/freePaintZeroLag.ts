/**
 * Zero-Lag Stroke System
 * 
 * Phase 7: Optimized stroke rendering
 * - Sample points at fixed spacing (4-6px)
 * - Ring buffer for stroke points
 * - Incremental Path2D drawing
 * - Never redraw entire stroke
 */

import type { Point } from '../../core/drawingEngine';
import { normalizedToCanvas } from '../../core/coordinateUtils';

interface StrokeSegment {
    path: Path2D;
    bounds: { x: number; y: number; width: number; height: number };
    pointCount: number;
}

export class ZeroLagStrokeRenderer {
    private sampleSpacingPx: number = 4; // Fixed spacing for sampling
    private canvasWidth: number = 1920;
    private canvasHeight: number = 1080;
    
    /**
     * Set canvas size
     */
    setCanvasSize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
    
    /**
     * Sample points at fixed spacing
     */
    samplePoints(points: Point[]): Point[] {
        if (points.length < 2) {
            return points;
        }
        
        const sampled: Point[] = [points[0]]; // Always include first point
        
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            
            const prevCanvas = normalizedToCanvas(prev, this.canvasWidth, this.canvasHeight);
            const currCanvas = normalizedToCanvas(curr, this.canvasWidth, this.canvasHeight);
            
            const distancePx = Math.hypot(currCanvas.x - prevCanvas.x, currCanvas.y - prevCanvas.y);
            
            if (distancePx >= this.sampleSpacingPx) {
                // Need to interpolate
                const numSamples = Math.floor(distancePx / this.sampleSpacingPx);
                for (let j = 1; j <= numSamples; j++) {
                    const t = j / (numSamples + 1);
                    sampled.push({
                        x: prev.x + (curr.x - prev.x) * t,
                        y: prev.y + (curr.y - prev.y) * t,
                        pressure: (prev.pressure ?? 1) + ((curr.pressure ?? 1) - (prev.pressure ?? 1)) * t,
                        timestamp: curr.timestamp
                    });
                }
            }
            
            sampled.push(curr); // Always include current point
        }
        
        return sampled;
    }
    
    /**
     * Create incremental Path2D from points
     * Returns path and bounds for efficient rendering
     */
    createPath(points: Point[]): StrokeSegment {
        const path = new Path2D();
        
        if (points.length === 0) {
            return {
                path,
                bounds: { x: 0, y: 0, width: 0, height: 0 },
                pointCount: 0
            };
        }
        
        // Convert first point to canvas coordinates
        const firstCanvas = normalizedToCanvas(points[0], this.canvasWidth, this.canvasHeight);
        path.moveTo(firstCanvas.x, firstCanvas.y);
        
        let minX = firstCanvas.x;
        let maxX = firstCanvas.x;
        let minY = firstCanvas.y;
        let maxY = firstCanvas.y;
        
        // Add remaining points
        for (let i = 1; i < points.length; i++) {
            const canvas = normalizedToCanvas(points[i], this.canvasWidth, this.canvasHeight);
            path.lineTo(canvas.x, canvas.y);
            
            minX = Math.min(minX, canvas.x);
            maxX = Math.max(maxX, canvas.x);
            minY = Math.min(minY, canvas.y);
            maxY = Math.max(maxY, canvas.y);
        }
        
        return {
            path,
            bounds: {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            },
            pointCount: points.length
        };
    }
    
    /**
     * Render stroke segment incrementally
     * Only redraws the new segment, not the entire stroke
     */
    renderSegment(
        ctx: CanvasRenderingContext2D,
        segment: StrokeSegment,
        color: string,
        lineWidth: number
    ): void {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(segment.path);
        ctx.restore();
    }
}

export const zeroLagStrokeRenderer = new ZeroLagStrokeRenderer();
