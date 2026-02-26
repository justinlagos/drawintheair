/**
 * Landscape Background Renderer
 * 
 * Renders multi-layer landscape backgrounds with parallax and ambient elements
 */

import type { LandscapeBackground, LandscapeLayer } from './landscapeBackgrounds';

export const renderLandscapeBackground = (
    ctx: CanvasRenderingContext2D,
    landscape: LandscapeBackground,
    width: number,
    height: number,
    timestamp: number
) => {
    // Fill entire canvas with base color first to prevent gaps
    // Use the last color of the ground layer (or last layer) as the base
    const groundLayer = landscape.layers.find(l => l.type === 'ground') || landscape.layers[landscape.layers.length - 1];
    const baseColor = groundLayer?.colors[groundLayer.colors.length - 1] || '#4CAF50';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);
    
    // Render each layer from back to front
    landscape.layers.forEach(layer => {
        renderLayer(ctx, layer, width, height, timestamp, landscape.id);
    });
    
    // Render ambient elements
    landscape.ambientElements?.forEach(element => {
        renderAmbientElements(ctx, element, width, height, timestamp);
    });
    
    // Apply subtle lighting effects based on landscape type
    applyLightingEffects(ctx, landscape, width, height, timestamp);
};

const renderLayer = (
    ctx: CanvasRenderingContext2D,
    layer: LandscapeLayer,
    width: number,
    height: number,
    timestamp: number,
    landscapeId?: string
) => {
    const yStart = layer.yPosition * height;
    const layerHeight = layer.height * height;
    
    // Create gradient for layer
    const gradient = ctx.createLinearGradient(0, yStart, 0, yStart + layerHeight);
    
    layer.colors.forEach((color, index) => {
        gradient.addColorStop(index / (layer.colors.length - 1), color);
    });
    
    ctx.fillStyle = gradient;
    
    switch (layer.type) {
        case 'sky':
            // Simple rectangle for sky
            ctx.fillRect(0, yStart, width, layerHeight);
            break;
            
        case 'sun':
            // Enhanced sun with glow and lighting
            // Position varies by landscape
            const isDesertSun = landscapeId === 'sunset-peaks';
            const sunX = isDesertSun ? width * 0.2 : width * 0.75; // Left for desert, right for meadow
            const sunY = yStart + layerHeight * 0.5;
            const sunRadius = Math.min(width, height) * 0.08;
            
            // Outer glow layers for realistic sun
            const glowLayers = [
                { radius: sunRadius * 4, alpha: 0.2, color: layer.colors[2] || layer.colors[1] },
                { radius: sunRadius * 3, alpha: 0.3, color: layer.colors[1] },
                { radius: sunRadius * 2, alpha: 0.4, color: layer.colors[0] },
            ];
            
            glowLayers.forEach(layer => {
                const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, layer.radius);
                glow.addColorStop(0, layer.color);
                glow.addColorStop(0.5, layer.color.replace(')', ', 0.3)').replace('rgba', 'rgba'));
                glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                ctx.save();
                ctx.globalAlpha = layer.alpha;
                ctx.beginPath();
                ctx.arc(sunX, sunY, layer.radius, 0, Math.PI * 2);
                ctx.fillStyle = glow;
                ctx.fill();
                ctx.restore();
            });
            
            // Sun core
            const sunGradient = ctx.createRadialGradient(
                sunX, sunY, 0,
                sunX, sunY, sunRadius
            );
            sunGradient.addColorStop(0, '#FFFFFF');
            sunGradient.addColorStop(0.3, layer.colors[0]);
            sunGradient.addColorStop(0.7, layer.colors[1] || layer.colors[0]);
            sunGradient.addColorStop(1, layer.colors[2] || layer.colors[1] || layer.colors[0]);
            
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
            ctx.fillStyle = sunGradient;
            ctx.fill();
            
            // Sun highlight
            ctx.beginPath();
            ctx.arc(sunX - sunRadius * 0.3, sunY - sunRadius * 0.3, sunRadius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();
            break;
            
        case 'mountain':
            // Draw mountain silhouette with peaks
            renderMountainSilhouette(ctx, gradient, yStart, layerHeight, width, height, layer.parallaxSpeed || 0, timestamp);
            break;
            
        case 'hill':
            // Draw rolling hills
            renderHills(ctx, gradient, yStart, layerHeight, width, layer.parallaxSpeed || 0, timestamp);
            break;
            
        case 'forest':
            // Draw forest/tree silhouette
            renderForestSilhouette(ctx, gradient, yStart, layerHeight, width, layer.parallaxSpeed || 0, timestamp);
            break;
            
        case 'ground':
            // Simple ground fill - ensure it extends to bottom of canvas
            // Always fill from yStart to the very bottom (height) to prevent any gaps
            const groundFillHeight = height - yStart;
            ctx.fillRect(0, yStart, width, groundFillHeight);
            break;
            
        case 'dune':
            // Draw rolling sand dunes
            renderDunes(ctx, gradient, yStart, layerHeight, width, layer.parallaxSpeed || 0, timestamp);
            break;
            
        case 'desert':
            // Desert ground with texture
            renderDesertGround(ctx, gradient, yStart, layerHeight, width);
            break;
    }
};

const renderMountainSilhouette = (
    ctx: CanvasRenderingContext2D,
    fillStyle: CanvasGradient,
    yStart: number,
    layerHeight: number,
    width: number,
    _height: number,
    parallaxSpeed: number,
    timestamp: number
) => {
    const offset = (timestamp * parallaxSpeed * 0.01) % width;
    
    ctx.beginPath();
    ctx.moveTo(0, yStart + layerHeight);  // Bottom left
    
    // Generate mountain peaks
    const peakCount = 5;
    const peakWidth = width / peakCount;
    
    for (let i = 0; i <= peakCount; i++) {
        const x = i * peakWidth + offset;
        const peakHeight = layerHeight * (0.3 + Math.sin(i * 1.5) * 0.4);
        const peakY = yStart + layerHeight - peakHeight;
        
        if (i === 0) {
            ctx.lineTo(x, peakY);
        } else {
            // Create peak with bezier curves for smooth mountains
            const prevX = (i - 1) * peakWidth + offset;
            const midX = (prevX + x) / 2;
            ctx.quadraticCurveTo(midX, peakY - peakHeight * 0.3, x, peakY);
        }
    }
    
    ctx.lineTo(width, yStart + layerHeight);  // Bottom right
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
};

const renderHills = (
    ctx: CanvasRenderingContext2D,
    fillStyle: CanvasGradient,
    yStart: number,
    layerHeight: number,
    width: number,
    parallaxSpeed: number,
    timestamp: number
) => {
    const offset = (timestamp * parallaxSpeed * 0.005) % (width * 0.5);
    
    ctx.beginPath();
    ctx.moveTo(0, yStart + layerHeight);
    
    // Smooth rolling hills using sine waves
    for (let x = 0; x <= width; x += 10) {
        const hillY = yStart + layerHeight * 0.5 + 
                      Math.sin((x + offset) * 0.01) * layerHeight * 0.3 +
                      Math.sin((x + offset) * 0.005) * layerHeight * 0.2;
        ctx.lineTo(x, hillY);
    }
    
    ctx.lineTo(width, yStart + layerHeight);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
};

const renderForestSilhouette = (
    ctx: CanvasRenderingContext2D,
    fillStyle: CanvasGradient,
    yStart: number,
    layerHeight: number,
    width: number,
    parallaxSpeed: number,
    timestamp: number
) => {
    const offset = (timestamp * parallaxSpeed * 0.008) % (width * 0.3);
    
    ctx.beginPath();
    ctx.moveTo(0, yStart + layerHeight);
    
    // Create pine tree silhouette effect
    const treeWidth = 30;
    const treeCount = Math.ceil(width / treeWidth) + 2;
    
    for (let i = 0; i < treeCount; i++) {
        const x = i * treeWidth - offset;
        const treeHeight = layerHeight * (0.4 + Math.random() * 0.4);
        const treeY = yStart + layerHeight - treeHeight;
        
        // Triangle tree shape
        ctx.lineTo(x, yStart + layerHeight * 0.7);
        ctx.lineTo(x + treeWidth * 0.5, treeY);
        ctx.lineTo(x + treeWidth, yStart + layerHeight * 0.7);
    }
    
    ctx.lineTo(width, yStart + layerHeight);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
};

const renderAmbientElements = (
    ctx: CanvasRenderingContext2D,
    element: { type: 'cloud' | 'bird' | 'leaf' | 'sparkle' | 'flower' | 'palm' | 'camel'; count: number; speed: number; size: number },
    width: number,
    height: number,
    timestamp: number
) => {
    for (let i = 0; i < element.count; i++) {
        const seed = i * 12345;
        let x: number, y: number;
        
        // Different positioning logic for different element types
        if (element.type === 'flower' || element.type === 'palm' || element.type === 'camel') {
            // Ground-based elements - fixed positions on ground
            x = ((seed * 7919) % width);
            y = height * (0.7 + (seed % 3) * 0.1); // On ground level
        } else {
            // Air-based elements - moving
            x = ((timestamp * element.speed * 0.02 + seed) % (width + element.size * 2)) - element.size;
            y = (seed % (height * 0.5)) + height * 0.1;
        }
        
        switch (element.type) {
            case 'cloud':
                renderCloud(ctx, x, y, element.size);
                break;
            case 'bird':
                renderBird(ctx, x, y, element.size, timestamp, seed);
                break;
            case 'sparkle':
                renderSparkle(ctx, x, y, element.size, timestamp, seed);
                break;
            case 'flower':
                renderFlower(ctx, x, y, element.size, seed);
                break;
            case 'palm':
                renderPalmTree(ctx, x, y, element.size, seed);
                break;
            case 'camel':
                renderCamel(ctx, x, y, element.size, timestamp, seed);
                break;
        }
    }
};

const renderCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    
    // Cloud made of overlapping circles
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y - size * 0.1, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y + size * 0.15, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
};

const renderBird = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, timestamp: number, seed: number) => {
    ctx.save();
    
    // Animated wing flapping
    const wingFlap = Math.sin(timestamp * 0.008 + seed) * 0.4;
    const bodyOffset = Math.sin(timestamp * 0.003 + seed) * 2; // Subtle floating motion
    
    // Bird body (small oval)
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.beginPath();
    ctx.ellipse(x, y + bodyOffset, size * 0.3, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wings (animated)
    ctx.strokeStyle = 'rgba(40, 40, 40, 0.9)';
    ctx.lineWidth = 2;
    
    // Left wing
    ctx.beginPath();
    ctx.moveTo(x - size * 0.2, y + bodyOffset);
    ctx.quadraticCurveTo(
        x - size * 0.8, 
        y + bodyOffset - size * (0.3 + wingFlap), 
        x - size * 1.2, 
        y + bodyOffset + size * 0.1
    );
    ctx.stroke();
    
    // Right wing
    ctx.beginPath();
    ctx.moveTo(x + size * 0.2, y + bodyOffset);
    ctx.quadraticCurveTo(
        x + size * 0.8, 
        y + bodyOffset - size * (0.3 + wingFlap), 
        x + size * 1.2, 
        y + bodyOffset + size * 0.1
    );
    ctx.stroke();
    
    // Beak
    ctx.fillStyle = 'rgba(255, 200, 0, 0.9)';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.3, y + bodyOffset);
    ctx.lineTo(x + size * 0.6, y + bodyOffset - size * 0.1);
    ctx.lineTo(x + size * 0.6, y + bodyOffset + size * 0.1);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
};

const renderSparkle = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, timestamp: number, seed: number) => {
    ctx.save();
    const alpha = 0.4 + Math.sin(timestamp * 0.006 + seed) * 0.4;
    ctx.globalAlpha = alpha;
    
    // Twinkling star/sparkle effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 200, 0.6)';
    ctx.lineWidth = 1;
    
    // Main sparkle point
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Cross pattern for star effect
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();
    
    ctx.restore();
};

const renderDunes = (
    ctx: CanvasRenderingContext2D,
    fillStyle: CanvasGradient,
    yStart: number,
    layerHeight: number,
    width: number,
    parallaxSpeed: number,
    timestamp: number
) => {
    const offset = (timestamp * parallaxSpeed * 0.006) % (width * 0.4);
    
    ctx.beginPath();
    ctx.moveTo(0, yStart + layerHeight);
    
    // Create rolling dune curves
    for (let x = 0; x <= width; x += 8) {
        const duneY = yStart + layerHeight * 0.3 + 
                      Math.sin((x + offset) * 0.008) * layerHeight * 0.4 +
                      Math.sin((x + offset) * 0.003) * layerHeight * 0.2;
        ctx.lineTo(x, duneY);
    }
    
    ctx.lineTo(width, yStart + layerHeight);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    
    // Add subtle shadow on dune curves for depth
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
        const duneY = yStart + layerHeight * 0.3 + 
                      Math.sin((x + offset) * 0.008) * layerHeight * 0.4 +
                      Math.sin((x + offset) * 0.003) * layerHeight * 0.2;
        if (x === 0) ctx.moveTo(x, duneY);
        else ctx.lineTo(x, duneY);
    }
    ctx.lineTo(width, yStart + layerHeight);
    ctx.lineTo(0, yStart + layerHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};

const renderDesertGround = (
    ctx: CanvasRenderingContext2D,
    fillStyle: CanvasGradient,
    yStart: number,
    layerHeight: number,
    width: number
) => {
    ctx.fillStyle = fillStyle;
    ctx.fillRect(0, yStart, width, layerHeight);
    
    // Add subtle texture
    ctx.save();
    ctx.globalAlpha = 0.1;
    for (let x = 0; x < width; x += 20) {
        for (let y = yStart; y < yStart + layerHeight; y += 20) {
            ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
            ctx.beginPath();
            ctx.arc(x + Math.random() * 10, y + Math.random() * 10, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
};

const renderFlower = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number) => {
    ctx.save();
    
    // Random flower type (white or yellow)
    const isYellow = (seed % 2) === 0;
    const color = isYellow ? '#FFD700' : '#FFFFFF';
    
    // Flower center
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Petals (5-6 petals)
    const petalCount = 5 + (seed % 2);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petalX = x + Math.cos(angle) * size * 0.6;
        const petalY = y + Math.sin(angle) * size * 0.6;
        
        ctx.beginPath();
        ctx.arc(petalX, petalY, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
};

const renderPalmTree = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number) => {
    ctx.save();
    
    // Trunk
    ctx.fillStyle = 'rgba(139, 90, 43, 0.9)';
    ctx.fillRect(x - size * 0.1, y - size * 1.5, size * 0.2, size * 1.5);
    
    // Fronds (palm leaves)
    ctx.strokeStyle = 'rgba(34, 139, 34, 0.9)';
    ctx.fillStyle = 'rgba(34, 139, 34, 0.8)';
    ctx.lineWidth = 3;
    
    const frondCount = 6;
    for (let i = 0; i < frondCount; i++) {
        const angle = (i / frondCount) * Math.PI * 2 + (seed * 0.1);
        const startX = x;
        const startY = y - size * 1.5;
        const endX = startX + Math.cos(angle) * size * 0.8;
        const endY = startY + Math.sin(angle) * size * 0.8;
        
        // Curved frond
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(
            startX + Math.cos(angle) * size * 0.4,
            startY + Math.sin(angle) * size * 0.4,
            endX,
            endY
        );
        ctx.stroke();
    }
    
    ctx.restore();
};

const renderCamel = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, timestamp: number, seed: number) => {
    ctx.save();
    
    // Subtle walking animation
    const walkOffset = Math.sin(timestamp * 0.003 + seed) * 1;
    
    // Body (oval)
    ctx.fillStyle = 'rgba(210, 180, 140, 0.9)';
    ctx.beginPath();
    ctx.ellipse(x, y - size * 0.3 + walkOffset, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Neck and head
    ctx.beginPath();
    ctx.ellipse(x - size * 0.4, y - size * 0.8 + walkOffset, size * 0.25, size * 0.35, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Hump
    ctx.beginPath();
    ctx.arc(x + size * 0.2, y - size * 0.5 + walkOffset, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs (simplified)
    ctx.fillStyle = 'rgba(160, 120, 80, 0.9)';
    const legPositions = [-size * 0.3, -size * 0.1, size * 0.1, size * 0.3];
    legPositions.forEach(offset => {
        ctx.fillRect(x + offset - size * 0.05, y, size * 0.1, size * 0.4);
    });
    
    ctx.restore();
};

// Apply subtle lighting effects to the entire scene
const applyLightingEffects = (
    ctx: CanvasRenderingContext2D,
    landscape: LandscapeBackground,
    width: number,
    height: number,
    timestamp: number
) => {
    ctx.save();
    // Currently lighting is static, but we may animate it in future using `timestamp`
    // Read it to satisfy TypeScript's noUnusedParameters rule.
    void timestamp;
    
    // Different lighting based on landscape type
    if (landscape.id === 'sunny-meadow') {
        // Warm sunlight from top-right
        const lightGradient = ctx.createRadialGradient(
            width * 0.75, height * 0.2, 0,
            width * 0.75, height * 0.2, width * 1.5
        );
        lightGradient.addColorStop(0, 'rgba(255, 255, 200, 0.15)');
        lightGradient.addColorStop(0.4, 'rgba(255, 255, 200, 0.08)');
        lightGradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
        
        ctx.fillStyle = lightGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Subtle shadows on hills
        ctx.globalAlpha = 0.1;
        const shadowGradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = shadowGradient;
        ctx.fillRect(0, height * 0.5, width, height * 0.5);
        
    } else if (landscape.id === 'misty-mountains') {
        // Soft, diffused lighting from above
        const lightGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
        lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        lightGradient.addColorStop(0.5, 'rgba(200, 220, 255, 0.06)');
        lightGradient.addColorStop(1, 'rgba(200, 220, 255, 0)');
        
        ctx.fillStyle = lightGradient;
        ctx.fillRect(0, 0, width, height * 0.6);
        
        // Atmospheric haze on mountains
        ctx.globalAlpha = 0.15;
        const hazeGradient = ctx.createLinearGradient(0, height * 0.5, 0, height * 0.8);
        hazeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        hazeGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = hazeGradient;
        ctx.fillRect(0, height * 0.5, width, height * 0.3);
        
    } else if (landscape.id === 'sunset-peaks') {
        // Warm sunset lighting from left
        const lightGradient = ctx.createRadialGradient(
            width * 0.2, height * 0.2, 0,
            width * 0.2, height * 0.2, width * 1.2
        );
        lightGradient.addColorStop(0, 'rgba(255, 200, 100, 0.2)');
        lightGradient.addColorStop(0.3, 'rgba(255, 180, 80, 0.12)');
        lightGradient.addColorStop(0.6, 'rgba(255, 160, 60, 0.06)');
        lightGradient.addColorStop(1, 'rgba(255, 140, 40, 0)');
        
        ctx.fillStyle = lightGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Dune shadows (darker on right side)
        ctx.globalAlpha = 0.2;
        const shadowGradient = ctx.createLinearGradient(width * 0.5, 0, width, 0);
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = shadowGradient;
        ctx.fillRect(width * 0.5, height * 0.7, width * 0.5, height * 0.3);
    }
    
    // Subtle vignette for depth (all landscapes)
    ctx.globalAlpha = 0.15;
    const vignette = ctx.createRadialGradient(
        width * 0.5, height * 0.5, 0,
        width * 0.5, height * 0.5, Math.max(width, height) * 0.8
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    
    ctx.restore();
};
