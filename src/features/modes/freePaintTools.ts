/**
 * Free Paint Tools System
 * 
 * Phase 5: Paint toolset
 * - Brushes (Brush, Pencil, Marker)
 * - Eraser (destination-out composite)
 * - Shapes (Line, Rectangle, Circle)
 * - Fill bucket (async, chunked)
 * - Undo/Redo (min 30 steps)
 * - Save PNG
 * - Backgrounds (blank, grid, ruled, dotted letters)
 */

export type PaintTool = 
    | 'brush'
    | 'pencil'
    | 'marker'
    | 'eraser'
    | 'fill'
    | 'line'
    | 'rectangle'
    | 'circle'
    | 'stamp';

export interface BrushConfig {
    size: number;
    opacity: number;
    smoothing: boolean;
    color: string;
}

export interface ToolState {
    activeTool: PaintTool;
    brushConfig: BrushConfig;
    showGrid: boolean;
    showRuled: boolean;
    showDotted: boolean;
}

const DEFAULT_BRUSH_CONFIG: BrushConfig = {
    size: 8,
    opacity: 1.0,
    smoothing: true,
    color: '#ff006e'
};

const DEFAULT_TOOL_STATE: ToolState = {
    activeTool: 'brush',
    brushConfig: DEFAULT_BRUSH_CONFIG,
    showGrid: false,
    showRuled: false,
    showDotted: false
};

export class PaintToolsManager {
    private state: ToolState = { ...DEFAULT_TOOL_STATE };
    
    /**
     * Set active tool
     */
    setTool(tool: PaintTool): void {
        this.state.activeTool = tool;
    }
    
    /**
     * Get active tool
     */
    getTool(): PaintTool {
        return this.state.activeTool;
    }
    
    /**
     * Set brush size
     */
    setBrushSize(size: number): void {
        this.state.brushConfig.size = Math.max(1, Math.min(100, size));
    }
    
    /**
     * Set brush opacity
     */
    setBrushOpacity(opacity: number): void {
        this.state.brushConfig.opacity = Math.max(0, Math.min(1, opacity));
    }
    
    /**
     * Set brush color
     */
    setBrushColor(color: string): void {
        this.state.brushConfig.color = color;
    }
    
    /**
     * Toggle smoothing
     */
    setSmoothing(enabled: boolean): void {
        this.state.brushConfig.smoothing = enabled;
    }
    
    /**
     * Get brush config
     */
    getBrushConfig(): BrushConfig {
        return { ...this.state.brushConfig };
    }
    
    /**
     * Get full tool state
     */
    getState(): ToolState {
        return { ...this.state };
    }
    
    /**
     * Check if tool is a brush type
     */
    isBrushTool(): boolean {
        return ['brush', 'pencil', 'marker'].includes(this.state.activeTool);
    }
    
    /**
     * Check if tool is eraser
     */
    isEraser(): boolean {
        return this.state.activeTool === 'eraser';
    }
    
    /**
     * Check if tool is fill
     */
    isFill(): boolean {
        return this.state.activeTool === 'fill';
    }
    
    /**
     * Check if tool is a shape
     */
    isShape(): boolean {
        return ['line', 'rectangle', 'circle'].includes(this.state.activeTool);
    }
}

export const paintToolsManager = new PaintToolsManager();
