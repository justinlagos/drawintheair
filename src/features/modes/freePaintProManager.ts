/**
 * Free Paint Pro Manager
 * 
 * Coordinates AIR PAINT PRO features:
 * - Render point smoothing (Phase 3)
 * - Layered canvas system (Phase 4)
 * 
 * All features behind feature flags, default OFF.
 */

import { featureFlags } from '../../core/featureFlags';
import { RenderPointSmoother } from './freePaintRenderPoint';
import { LayeredCanvasSystem } from './freePaintLayeredCanvas';
import type { TrackingFrameData } from '../tracking/TrackingLayer';

class FreePaintProManager {
    private renderPointSmoother: RenderPointSmoother | null = null;
    private layeredCanvasSystem: LayeredCanvasSystem | null = null;
    private lastRenderPoint: { x: number; y: number } | null = null;
    private lastFilteredPoint: { x: number; y: number } | null = null;
    
    /**
     * Initialize AIR PAINT PRO features if flags are enabled
     */
    initialize(width: number, height: number, container?: HTMLElement): void {
        const flags = featureFlags.getFlags();
        
        // Initialize render point smoother if airPaintEnabled
        if (flags.airPaintEnabled) {
            this.renderPointSmoother = new RenderPointSmoother({
                canvasWidth: width,
                canvasHeight: height
            });
        }
        
        // Initialize layered canvas system if layersEnabled
        if (flags.layersEnabled && container) {
            this.layeredCanvasSystem = new LayeredCanvasSystem();
            this.layeredCanvasSystem.initialize(container, width, height);
        }
    }
    
    /**
     * Resize all systems
     */
    resize(width: number, height: number): void {
        if (this.renderPointSmoother) {
            this.renderPointSmoother.setCanvasSize(width, height);
        }
        
        if (this.layeredCanvasSystem) {
            this.layeredCanvasSystem.resize(width, height);
        }
    }
    
    /**
     * Get render point (smoothed, predicted) for visuals
     * Returns filteredPoint if airPaintEnabled is OFF
     */
    getRenderPoint(frameData: TrackingFrameData): { x: number; y: number } | null {
        const flags = featureFlags.getFlags();
        
        if (flags.airPaintEnabled && this.renderPointSmoother) {
            // Use render point smoother for visuals
            const renderPoint = this.renderPointSmoother.process(
                frameData.filteredPoint,
                frameData.confidence,
                frameData.timestamp
            );
            this.lastRenderPoint = renderPoint;
            return renderPoint;
        }
        
        // Fallback to filteredPoint (or predictedPoint if available)
        const fallback = frameData.predictedPoint ?? frameData.filteredPoint;
        this.lastRenderPoint = fallback;
        return fallback;
    }
    
    /**
     * Get last render point (for cursor display)
     */
    getLastRenderPoint(): { x: number; y: number } | null {
        return this.lastRenderPoint;
    }
    
    /**
     * Get filtered point for logic (stroke data)
     * Always use filteredPoint for actual drawing
     */
    getFilteredPoint(frameData: TrackingFrameData): { x: number; y: number } | null {
        this.lastFilteredPoint = frameData.filteredPoint;
        return frameData.filteredPoint;
    }
    
    /**
     * Get last filtered point (for cursor display - matches drawing position)
     */
    getLastFilteredPoint(): { x: number; y: number } | null {
        return this.lastFilteredPoint;
    }
    
    /**
     * Get base layer context (for committed strokes)
     */
    getBaseContext(): CanvasRenderingContext2D | null {
        return this.layeredCanvasSystem?.getBaseContext() ?? null;
    }
    
    /**
     * Get preview layer context (for active stroke)
     */
    getPreviewContext(): CanvasRenderingContext2D | null {
        return this.layeredCanvasSystem?.getPreviewContext() ?? null;
    }
    
    /**
     * Get cursor layer context
     */
    getCursorContext(): CanvasRenderingContext2D | null {
        return this.layeredCanvasSystem?.getCursorContext() ?? null;
    }
    
    /**
     * Clear preview layer (called every frame)
     */
    clearPreview(): void {
        this.layeredCanvasSystem?.clearPreview();
    }
    
    /**
     * Clear cursor layer (called every frame)
     */
    clearCursor(): void {
        this.layeredCanvasSystem?.clearCursor();
    }
    
    /**
     * Check if layered canvases are enabled
     */
    isLayeredEnabled(): boolean {
        return this.layeredCanvasSystem !== null;
    }
    
    /**
     * Check if render point smoothing is enabled
     */
    isRenderPointEnabled(): boolean {
        return this.renderPointSmoother !== null;
    }
    
    /**
     * Set max DPR (for performance tuning)
     */
    setMaxDPR(maxDPR: number): void {
        if (this.layeredCanvasSystem) {
            this.layeredCanvasSystem.setMaxDPR(maxDPR);
        }
    }
    
    /**
     * Reset all systems (call on mode change or stroke end)
     */
    reset(): void {
        this.renderPointSmoother?.reset();
    }
    
    /**
     * Cleanup (call on mode exit)
     */
    destroy(): void {
        this.layeredCanvasSystem?.destroy();
        this.renderPointSmoother = null;
        this.layeredCanvasSystem = null;
    }
}

// Singleton instance
export const freePaintProManager = new FreePaintProManager();
