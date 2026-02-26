/**
 * Layered Canvas System for Free Paint
 * 
 * Phase 4: Multi-layer rendering architecture
 * 
 * Layers:
 * - BaseCanvas: Committed strokes only, never cleared per frame
 * - PreviewCanvas: Active stroke or shape, cleared per frame
 * - CursorCanvas: Cursor only
 * - UIOverlay: DOM only (handled separately)
 * 
 * Performance optimizations:
 * - BaseCanvas only redrawn on: stroke commit, undo/redo, clear, fill
 * - PreviewCanvas uses dirty-rect clearing only
 * - DPR control: devicePixelRatio scaling, cap internal DPR on weak devices
 */

import type { Stroke } from '../../core/drawingEngine';

export interface CanvasLayer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    dpr: number;
}

export interface DirtyRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class LayeredCanvasSystem {
    private baseLayer: CanvasLayer | null = null;
    private previewLayer: CanvasLayer | null = null;
    private cursorLayer: CanvasLayer | null = null;
    
    private container: HTMLElement | null = null;
    private committedStrokes: Stroke[] = [];
    
    // DPR management
    private maxDPR: number = 2; // Cap DPR on weak devices
    private currentDPR: number = 1;
    
    // Dirty rect tracking for preview layer
    private previewDirtyRect: DirtyRect | null = null;
    
    /**
     * Initialize layered canvas system
     */
    initialize(container: HTMLElement, width: number, height: number): void {
        this.container = container;
        
        // Calculate DPR (capped for performance)
        const deviceDPR = window.devicePixelRatio || 1;
        this.currentDPR = Math.min(deviceDPR, this.maxDPR);
        
        // Create base layer (committed strokes)
        this.baseLayer = this.createLayer('base', width, height);
        
        // Create preview layer (active stroke)
        this.previewLayer = this.createLayer('preview', width, height);
        
        // Create cursor layer
        this.cursorLayer = this.createLayer('cursor', width, height);
        
        // Position layers absolutely
        this.positionLayers();
    }
    
    /**
     * Create a canvas layer
     */
    private createLayer(name: string, width: number, height: number): CanvasLayer {
        const canvas = document.createElement('canvas');
        canvas.className = `free-paint-layer free-paint-layer-${name}`;
        canvas.width = width * this.currentDPR;
        canvas.height = height * this.currentDPR;
        
        const ctx = canvas.getContext('2d', { alpha: name !== 'base' });
        if (!ctx) {
            throw new Error(`Failed to get 2d context for ${name} layer`);
        }
        
        // Scale context for DPR
        ctx.scale(this.currentDPR, this.currentDPR);
        
        // Set CSS size (not internal size)
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        
        return {
            canvas,
            ctx,
            width,
            height,
            dpr: this.currentDPR
        };
    }
    
    /**
     * Position layers in z-order
     */
    private positionLayers(): void {
        if (!this.container || !this.baseLayer || !this.previewLayer || !this.cursorLayer) {
            return;
        }
        
        // Base layer (bottom)
        this.baseLayer.canvas.style.zIndex = '1';
        this.container.appendChild(this.baseLayer.canvas);
        
        // Preview layer (middle)
        this.previewLayer.canvas.style.zIndex = '2';
        this.container.appendChild(this.previewLayer.canvas);
        
        // Cursor layer (top)
        this.cursorLayer.canvas.style.zIndex = '3';
        this.container.appendChild(this.cursorLayer.canvas);
    }
    
    /**
     * Resize all layers
     */
    resize(width: number, height: number): void {
        if (!this.baseLayer || !this.previewLayer || !this.cursorLayer) {
            return;
        }
        
        // Recalculate DPR
        const deviceDPR = window.devicePixelRatio || 1;
        this.currentDPR = Math.min(deviceDPR, this.maxDPR);
        
        // Resize base layer
        this.baseLayer.canvas.width = width * this.currentDPR;
        this.baseLayer.canvas.height = height * this.currentDPR;
        this.baseLayer.canvas.style.width = `${width}px`;
        this.baseLayer.canvas.style.height = `${height}px`;
        this.baseLayer.ctx.scale(this.currentDPR / this.baseLayer.dpr, this.currentDPR / this.baseLayer.dpr);
        this.baseLayer.width = width;
        this.baseLayer.height = height;
        this.baseLayer.dpr = this.currentDPR;
        
        // Resize preview layer
        this.previewLayer.canvas.width = width * this.currentDPR;
        this.previewLayer.canvas.height = height * this.currentDPR;
        this.previewLayer.canvas.style.width = `${width}px`;
        this.previewLayer.canvas.style.height = `${height}px`;
        this.previewLayer.ctx.scale(this.currentDPR / this.previewLayer.dpr, this.currentDPR / this.previewLayer.dpr);
        this.previewLayer.width = width;
        this.previewLayer.height = height;
        this.previewLayer.dpr = this.currentDPR;
        
        // Resize cursor layer
        this.cursorLayer.canvas.width = width * this.currentDPR;
        this.cursorLayer.canvas.height = height * this.currentDPR;
        this.cursorLayer.canvas.style.width = `${width}px`;
        this.cursorLayer.canvas.style.height = `${height}px`;
        this.cursorLayer.ctx.scale(this.currentDPR / this.cursorLayer.dpr, this.currentDPR / this.cursorLayer.dpr);
        this.cursorLayer.width = width;
        this.cursorLayer.height = height;
        this.cursorLayer.dpr = this.currentDPR;
        
        // Redraw base layer (all committed strokes)
        this.redrawBaseLayer();
    }
    
    /**
     * Get base layer context (for committing strokes)
     */
    getBaseContext(): CanvasRenderingContext2D | null {
        return this.baseLayer?.ctx ?? null;
    }
    
    /**
     * Get preview layer context (for active stroke)
     */
    getPreviewContext(): CanvasRenderingContext2D | null {
        return this.previewLayer?.ctx ?? null;
    }
    
    /**
     * Get cursor layer context
     */
    getCursorContext(): CanvasRenderingContext2D | null {
        return this.cursorLayer?.ctx ?? null;
    }
    
    /**
     * Clear preview layer (called every frame)
     */
    clearPreview(): void {
        if (!this.previewLayer) return;
        
        if (this.previewDirtyRect) {
            // Dirty rect clearing
            const { x, y, width, height } = this.previewDirtyRect;
            this.previewLayer.ctx.clearRect(x, y, width, height);
            this.previewDirtyRect = null;
        } else {
            // Full clear (first frame or no dirty rect)
            this.previewLayer.ctx.clearRect(0, 0, this.previewLayer.width, this.previewLayer.height);
        }
    }
    
    /**
     * Clear cursor layer (called every frame)
     */
    clearCursor(): void {
        if (!this.cursorLayer) return;
        this.cursorLayer.ctx.clearRect(0, 0, this.cursorLayer.width, this.cursorLayer.height);
    }
    
    /**
     * Mark preview dirty rect for next clear
     */
    markPreviewDirty(x: number, y: number, width: number, height: number): void {
        if (!this.previewDirtyRect) {
            this.previewDirtyRect = { x, y, width, height };
        } else {
            // Expand dirty rect to include new area
            const minX = Math.min(this.previewDirtyRect.x, x);
            const minY = Math.min(this.previewDirtyRect.y, y);
            const maxX = Math.max(
                this.previewDirtyRect.x + this.previewDirtyRect.width,
                x + width
            );
            const maxY = Math.max(
                this.previewDirtyRect.y + this.previewDirtyRect.height,
                y + height
            );
            this.previewDirtyRect = {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        }
    }
    
    /**
     * Commit a stroke to base layer (stroke is finished)
     */
    commitStroke(stroke: Stroke): void {
        if (!this.baseLayer) return;
        
        this.committedStrokes.push(stroke);
        this.redrawBaseLayer();
    }
    
    /**
     * Redraw entire base layer (only called on commit, undo, redo, clear, fill)
     */
    private redrawBaseLayer(): void {
        if (!this.baseLayer) return;
        
        // Clear base layer
        this.baseLayer.ctx.clearRect(0, 0, this.baseLayer.width, this.baseLayer.height);
        
        // Redraw all committed strokes
        // TODO: This will be implemented when we integrate with drawing engine
        // For now, strokes are stored in committedStrokes array
    }
    
    /**
     * Clear all layers (clear command)
     */
    clear(): void {
        if (!this.baseLayer || !this.previewLayer || !this.cursorLayer) return;
        
        this.committedStrokes = [];
        this.baseLayer.ctx.clearRect(0, 0, this.baseLayer.width, this.baseLayer.height);
        this.previewLayer.ctx.clearRect(0, 0, this.previewLayer.width, this.previewLayer.height);
        this.cursorLayer.ctx.clearRect(0, 0, this.cursorLayer.width, this.cursorLayer.height);
        this.previewDirtyRect = null;
    }
    
    /**
     * Get current DPR
     */
    getDPR(): number {
        return this.currentDPR;
    }
    
    /**
     * Set max DPR (for performance tuning)
     */
    setMaxDPR(maxDPR: number): void {
        this.maxDPR = maxDPR;
        if (this.currentDPR > maxDPR && this.baseLayer) {
            // Need to resize with new DPR
            this.resize(this.baseLayer.width, this.baseLayer.height);
        }
    }
    
    /**
     * Cleanup (remove canvases from DOM)
     */
    destroy(): void {
        if (this.baseLayer?.canvas.parentNode) {
            this.baseLayer.canvas.parentNode.removeChild(this.baseLayer.canvas);
        }
        if (this.previewLayer?.canvas.parentNode) {
            this.previewLayer.canvas.parentNode.removeChild(this.previewLayer.canvas);
        }
        if (this.cursorLayer?.canvas.parentNode) {
            this.cursorLayer.canvas.parentNode.removeChild(this.cursorLayer.canvas);
        }
        
        this.baseLayer = null;
        this.previewLayer = null;
        this.cursorLayer = null;
        this.container = null;
        this.committedStrokes = [];
    }
}
