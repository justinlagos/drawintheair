/**
 * Word Search Render Helpers - Kid-First Design
 * 
 * Canvas rendering functions with:
 * - Bigger, softer tiles with rounded corners
 * - Clear visual feedback without overwhelming
 * - Gentle glow effects
 * - Kid-friendly color palette
 */

import type { Grid, Tile, SelectionState } from './wordSearchTypes';
import { TILE_BORDER_RADIUS, HOVER_GLOW_INTENSITY, SELECTION_GLOW_INTENSITY, FOUND_GLOW_INTENSITY } from './wordSearchConstants';
import { THEME_COLORS } from './wordSearchAssets';
import type { Theme } from './wordSearchTypes';

/**
 * Render the word search grid
 */
export function renderGrid(
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    theme: Theme,
    hoverTileId: string | null,
    selectionState: SelectionState,
    foundTileIds: Set<string>,
    width: number,
    height: number,
    hintTileIds: string[] = [],
    hintPhase: 0 | 1 | 2 | 3 = 0
): void {
    const colors = THEME_COLORS[theme];
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Render grid container background (subtle rounded rectangle)
    renderGridContainer(ctx, grid, width, height);
    
    // Render each tile
    for (const row of grid.tiles) {
        for (const tile of row) {
            const isHovered = hoverTileId === tile.id;
            const isSelected = selectionState.selectionPath.includes(tile.id);
            const isFound = foundTileIds.has(tile.id);
            
            renderTile(ctx, tile, colors, isHovered, isSelected, isFound, width, height);
        }
    }
    
    // Render selection path highlight (rounded corridor for kids)
    if (selectionState.isActive && selectionState.selectionPath.length > 0) {
        renderSelectionPath(ctx, grid, selectionState, colors, width, height);
    }
    
    // Render hints (gentle glow, no shaking)
    if (hintPhase > 0 && hintTileIds.length > 0) {
        renderHints(ctx, grid, hintTileIds, hintPhase, colors, width, height);
    }
}

/**
 * Render a subtle container around the grid
 */
function renderGridContainer(
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    width: number,
    height: number
): void {
    if (grid.tiles.length === 0 || grid.tiles[0].length === 0) return;
    
    const firstTile = grid.tiles[0][0];
    const lastTile = grid.tiles[grid.size - 1][grid.size - 1];
    
    const padding = 0.015; // Small padding around grid
    const x = (firstTile.x - padding) * width;
    const y = (firstTile.y - padding) * height;
    const w = (lastTile.x + lastTile.width - firstTile.x + padding * 2) * width;
    const h = (lastTile.y + lastTile.height - firstTile.y + padding * 2) * height;
    const radius = 24;
    
    // Subtle container background
    ctx.fillStyle = 'rgba(10, 8, 25, 0.4)';
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    
    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

/**
 * Render a single tile - Kid-friendly with soft gradients
 */
function renderTile(
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    colors: { primary: string; secondary: string; accent: string; background: string },
    isHovered: boolean,
    isSelected: boolean,
    isFound: boolean,
    width: number,
    height: number
): void {
    const x = tile.x * width;
    const y = tile.y * height;
    const w = tile.width * width;
    const h = tile.height * height;
    const radius = Math.min(w, h) * TILE_BORDER_RADIUS;
    
    // Calculate gap between tiles
    const gap = 4;
    const adjustedX = x + gap / 2;
    const adjustedY = y + gap / 2;
    const adjustedW = w - gap;
    const adjustedH = h - gap;
    
    // Determine colors based on state
    let bgGradient: CanvasGradient;
    let borderColor = 'rgba(255, 255, 255, 0.25)';
    let glowColor = '';
    let glowIntensity = 0;
    let letterColor = 'white';
    
    if (isFound) {
        // Found tiles: warm, settled glow
        bgGradient = ctx.createLinearGradient(adjustedX, adjustedY, adjustedX, adjustedY + adjustedH);
        bgGradient.addColorStop(0, hexToRgba(colors.primary, 0.35));
        bgGradient.addColorStop(1, hexToRgba(colors.primary, 0.25));
        borderColor = colors.primary;
        glowColor = colors.primary;
        glowIntensity = FOUND_GLOW_INTENSITY;
        letterColor = colors.primary;
    } else if (isSelected) {
        // Selected tiles: teal/sky blue active selection
        bgGradient = ctx.createLinearGradient(adjustedX, adjustedY, adjustedX, adjustedY + adjustedH);
        bgGradient.addColorStop(0, 'rgba(78, 205, 196, 0.45)');
        bgGradient.addColorStop(1, 'rgba(78, 205, 196, 0.35)');
        borderColor = '#4ECDC4';
        glowColor = '#4ECDC4';
        glowIntensity = SELECTION_GLOW_INTENSITY;
        letterColor = 'white';
    } else if (isHovered) {
        // Hovered tiles: subtle highlight
        bgGradient = ctx.createLinearGradient(adjustedX, adjustedY, adjustedX, adjustedY + adjustedH);
        bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
        bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
        borderColor = 'rgba(255, 255, 255, 0.5)';
        glowColor = 'rgba(255, 255, 255, 0.5)';
        glowIntensity = HOVER_GLOW_INTENSITY;
    } else {
        // Default tiles: soft dark with gradient
        bgGradient = ctx.createLinearGradient(adjustedX, adjustedY, adjustedX, adjustedY + adjustedH);
        bgGradient.addColorStop(0, 'rgba(30, 25, 50, 0.9)');
        bgGradient.addColorStop(1, 'rgba(20, 18, 40, 0.9)');
    }
    
    // Draw glow shadow
    if (glowColor && glowIntensity > 0) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = adjustedW * 0.2 * glowIntensity;
    } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
    }
    
    // Draw tile background with rounded corners
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.moveTo(adjustedX + radius, adjustedY);
    ctx.lineTo(adjustedX + adjustedW - radius, adjustedY);
    ctx.quadraticCurveTo(adjustedX + adjustedW, adjustedY, adjustedX + adjustedW, adjustedY + radius);
    ctx.lineTo(adjustedX + adjustedW, adjustedY + adjustedH - radius);
    ctx.quadraticCurveTo(adjustedX + adjustedW, adjustedY + adjustedH, adjustedX + adjustedW - radius, adjustedY + adjustedH);
    ctx.lineTo(adjustedX + radius, adjustedY + adjustedH);
    ctx.quadraticCurveTo(adjustedX, adjustedY + adjustedH, adjustedX, adjustedY + adjustedH - radius);
    ctx.lineTo(adjustedX, adjustedY + radius);
    ctx.quadraticCurveTo(adjustedX, adjustedY, adjustedX + radius, adjustedY);
    ctx.closePath();
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw letter - Bigger, rounded font
    ctx.fillStyle = letterColor;
    const fontSize = Math.min(adjustedW, adjustedH) * 0.48;
    ctx.font = `bold ${fontSize}px 'Outfit', 'Nunito', 'Comic Neue', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Slight text shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
    ctx.fillText(tile.letter, adjustedX + adjustedW / 2, adjustedY + adjustedH / 2 + 2);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
}

/**
 * Render selection path highlight - Rounded corridor for kids
 */
function renderSelectionPath(
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    selectionState: SelectionState,
    colors: { primary: string; secondary: string; accent: string; background: string },
    width: number,
    height: number
): void {
    if (selectionState.selectionPath.length < 2) return;
    
    // Draw thick rounded corridor connecting selected tiles
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = width * 0.035; // 3.5% of screen width - thick friendly line
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#4ECDC4';
    ctx.shadowBlur = width * 0.025;
    
    ctx.beginPath();
    
    for (let i = 0; i < selectionState.selectionPath.length; i++) {
        const tileId = selectionState.selectionPath[i];
        const tile = findTileById(grid, tileId);
        
        if (tile) {
            const x = (tile.x + tile.width / 2) * width;
            const y = (tile.y + tile.height / 2) * height;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    }
    
    ctx.stroke();
    ctx.shadowBlur = 0;
}

/**
 * Find tile by ID
 */
function findTileById(grid: Grid, tileId: string): Tile | null {
    for (const row of grid.tiles) {
        for (const tile of row) {
            if (tile.id === tileId) {
                return tile;
            }
        }
    }
    return null;
}

/**
 * Render hint visualizations - Gentle, no shaking or fast sparkles
 */
function renderHints(
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    hintTileIds: string[],
    hintPhase: 0 | 1 | 2 | 3,
    colors: { primary: string; secondary: string; accent: string; background: string },
    width: number,
    height: number
): void {
    if (hintTileIds.length === 0) return;
    
    const time = Date.now() / 1000;
    
    // Phase 1: Gentle pulse on first letter tile
    if (hintPhase === 1 && hintTileIds.length >= 1) {
        const tile = findTileById(grid, hintTileIds[0]);
        if (tile) {
            // Slow, calm pulse (not fast or jarring)
            const pulse = Math.sin(time * 2) * 0.25 + 0.75; // Slower pulse
            const x = (tile.x + tile.width / 2) * width;
            const y = (tile.y + tile.height / 2) * height;
            const radius = (tile.width * width / 2) * (1 + pulse * 0.15);
            
            ctx.strokeStyle = `rgba(255, 230, 109, ${0.5 + pulse * 0.3})`;
            ctx.lineWidth = 4;
            ctx.shadowColor = colors.accent;
            ctx.shadowBlur = 20 * pulse;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
        }
    }
    
    // Phase 2: Soft shimmer path for first 2 letters
    if (hintPhase === 2 && hintTileIds.length >= 2) {
        const tiles = hintTileIds.slice(0, 2).map(id => findTileById(grid, id)).filter(Boolean) as Tile[];
        if (tiles.length === 2) {
            const shimmer = Math.sin(time * 2.5) * 0.4 + 0.6; // Calm shimmer
            
            ctx.strokeStyle = `rgba(255, 230, 109, ${0.35 + shimmer * 0.3})`;
            ctx.lineWidth = width * 0.025;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = colors.accent;
            ctx.shadowBlur = width * 0.02 * shimmer;
            
            ctx.beginPath();
            const x1 = (tiles[0].x + tiles[0].width / 2) * width;
            const y1 = (tiles[0].y + tiles[0].height / 2) * height;
            const x2 = (tiles[1].x + tiles[1].width / 2) * width;
            const y2 = (tiles[1].y + tiles[1].height / 2) * height;
            
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            // Draw soft circles at endpoints
            ctx.fillStyle = `rgba(255, 230, 109, ${0.2 + shimmer * 0.2})`;
            ctx.beginPath();
            ctx.arc(x1, y1, width * 0.02, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x2, y2, width * 0.02, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
        }
    }
    
    // Phase 3: Brief reveal of full word path (calm, translucent)
    if (hintPhase === 3 && hintTileIds.length > 0) {
        const tiles = hintTileIds.map(id => findTileById(grid, id)).filter(Boolean) as Tile[];
        if (tiles.length > 0) {
            const fadeIn = Math.min(1, (time % 3) * 2); // Slow fade in
            
            // Draw translucent highlight over word path
            ctx.strokeStyle = `rgba(255, 230, 109, ${0.5 * fadeIn})`;
            ctx.lineWidth = width * 0.02;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Draw path connecting tiles
            ctx.beginPath();
            for (let i = 0; i < tiles.length; i++) {
                const tile = tiles[i];
                const x = (tile.x + tile.width / 2) * width;
                const y = (tile.y + tile.height / 2) * height;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            
            // Draw soft glow over each tile
            for (const tile of tiles) {
                const x = tile.x * width + 4;
                const y = tile.y * height + 4;
                const w = tile.width * width - 8;
                const h = tile.height * height - 8;
                const radius = Math.min(w, h) * 0.22;
                
                ctx.fillStyle = `rgba(255, 230, 109, ${0.15 * fadeIn})`;
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + w - radius, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
                ctx.lineTo(x + w, y + h - radius);
                ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
                ctx.lineTo(x + radius, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}

/**
 * Convert hex color to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(255, 255, 255, ${alpha})`;
}
