/**
 * Fill Bucket Tool
 * 
 * Phase 9: Pixel flood fill
 * - Tolerance for color matching
 * - Max pixel guard (prevent freezing on large fills)
 * - Run in slices to avoid blocking
 */

export interface FillConfig {
    tolerance: number; // 0-255, color difference tolerance
    maxPixels: number; // Max pixels to fill (safety limit)
    chunkSize: number; // Pixels to process per chunk
    chunkDelay: number; // ms delay between chunks
}

const DEFAULT_FILL_CONFIG: FillConfig = {
    tolerance: 10,
    maxPixels: 1000000, // 1M pixels max
    chunkSize: 10000, // 10k pixels per chunk
    chunkDelay: 0 // No delay for now (can add if needed)
};

export class FillBucket {
    private config: FillConfig = { ...DEFAULT_FILL_CONFIG };
    
    /**
     * Set fill configuration
     */
    setConfig(config: Partial<FillConfig>): void {
        this.config = { ...this.config, ...config };
    }
    
    /**
     * Flood fill at point (x, y) with fillColor
     * Returns promise that resolves when fill is complete
     */
    async fill(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        fillColor: string
    ): Promise<{ filled: number; bounds: { x: number; y: number; width: number; height: number } }> {
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Convert fill color to RGBA
        const fillRgba = this.hexToRgba(fillColor);
        
        // Get target color at (x, y)
        const targetIndex = (Math.floor(y) * width + Math.floor(x)) * 4;
        if (targetIndex < 0 || targetIndex >= data.length) {
            return { filled: 0, bounds: { x: 0, y: 0, width: 0, height: 0 } };
        }
        
        const targetR = data[targetIndex];
        const targetG = data[targetIndex + 1];
        const targetB = data[targetIndex + 2];
        const targetA = data[targetIndex + 3];
        
        // Check if already filled
        if (this.colorsMatch(targetR, targetG, targetB, targetA, fillRgba.r, fillRgba.g, fillRgba.b, fillRgba.a, 0)) {
            return { filled: 0, bounds: { x: 0, y: 0, width: 0, height: 0 } };
        }
        
        // Flood fill using scanline algorithm (more efficient than recursive)
        const filled = new Set<number>();
        const stack: Array<{ x: number; y: number }> = [{ x: Math.floor(x), y: Math.floor(y) }];
        
        let minX = width;
        let maxX = 0;
        let minY = height;
        let maxY = 0;
        let pixelsFilled = 0;
        
        while (stack.length > 0 && pixelsFilled < this.config.maxPixels) {
            const point = stack.pop()!;
            const { x: px, y: py } = point;
            
            if (px < 0 || px >= width || py < 0 || py >= height) {
                continue;
            }
            
            const key = py * width + px;
            if (filled.has(key)) {
                continue;
            }
            
            const index = key * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];
            
            if (!this.colorsMatch(r, g, b, a, targetR, targetG, targetB, targetA, this.config.tolerance)) {
                continue;
            }
            
            // Fill this pixel
            data[index] = fillRgba.r;
            data[index + 1] = fillRgba.g;
            data[index + 2] = fillRgba.b;
            data[index + 3] = fillRgba.a;
            
            filled.add(key);
            pixelsFilled++;
            
            // Update bounds
            minX = Math.min(minX, px);
            maxX = Math.max(maxX, px);
            minY = Math.min(minY, py);
            maxY = Math.max(maxY, py);
            
            // Add neighbors (scanline optimization: only add left/right edges)
            if (px > 0) {
                const leftKey = py * width + (px - 1);
                if (!filled.has(leftKey)) {
                    stack.push({ x: px - 1, y: py });
                }
            }
            if (px < width - 1) {
                const rightKey = py * width + (px + 1);
                if (!filled.has(rightKey)) {
                    stack.push({ x: px + 1, y: py });
                }
            }
            if (py > 0) {
                const upKey = (py - 1) * width + px;
                if (!filled.has(upKey)) {
                    stack.push({ x: px, y: py - 1 });
                }
            }
            if (py < height - 1) {
                const downKey = (py + 1) * width + px;
                if (!filled.has(downKey)) {
                    stack.push({ x: px, y: py + 1 });
                }
            }
            
            // Chunk processing (yield to prevent blocking)
            if (pixelsFilled % this.config.chunkSize === 0) {
                await new Promise(resolve => setTimeout(resolve, this.config.chunkDelay));
            }
        }
        
        // Apply filled pixels to canvas
        ctx.putImageData(imageData, 0, 0);
        
        return {
            filled: pixelsFilled,
            bounds: {
                x: minX,
                y: minY,
                width: maxX - minX + 1,
                height: maxY - minY + 1
            }
        };
    }
    
    /**
     * Check if two colors match within tolerance
     */
    private colorsMatch(
        r1: number, g1: number, b1: number, a1: number,
        r2: number, g2: number, b2: number, a2: number,
        tolerance: number
    ): boolean {
        const dr = Math.abs(r1 - r2);
        const dg = Math.abs(g1 - g2);
        const db = Math.abs(b1 - b2);
        const da = Math.abs(a1 - a2);
        
        return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance;
    }
    
    /**
     * Convert hex color to RGBA
     */
    private hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
        
        return { r, g, b, a: Math.round(a * 255) };
    }
}

export const fillBucket = new FillBucket();
