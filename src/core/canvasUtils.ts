/**
 * Canvas Utilities
 * 
 * Phase 4: Canvas state hygiene helpers
 * 
 * Ensures canvas state is properly reset and restored to prevent
 * state leakage between render passes and tools.
 */

/**
 * Reset canvas context state to defaults
 * 
 * Resets all canvas state properties to their default values:
 * - Transform (identity matrix)
 * - Global alpha (1)
 * - Global composite operation (source-over)
 * - Filter (none)
 * - Shadow blur and color (disabled)
 * - Line cap and join (round)
 * 
 * Call this before any render pass or after using tools that modify state.
 */
export function resetCanvasState(ctx: CanvasRenderingContext2D): void {
    // Reset transform to identity matrix
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Reset global alpha
    ctx.globalAlpha = 1;
    
    // Reset global composite operation
    ctx.globalCompositeOperation = 'source-over';
    
    // Reset filter
    ctx.filter = 'none';
    
    // Reset shadow (disable)
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    
    // Reset line styling
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Reset line dash (empty = solid line)
    ctx.setLineDash([]);
}
