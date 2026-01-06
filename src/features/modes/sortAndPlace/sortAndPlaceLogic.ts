import { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { normalizedToCanvas } from '../../../core/coordinateUtils';
import { OneEuroFilter2D } from '../../../core/filters/OneEuroFilter';

export type SortCategory = 'color' | 'size' | 'category';

interface SortableObject {
    id: number;
    x: number; // Normalized
    y: number; // Normalized
    width: number; // Normalized
    height: number; // Normalized
    color: string;
    size: 'small' | 'large';
    category: 'food' | 'toy' | 'animal';
    grabbed: boolean;
    placed: boolean;
    placedZone: string | null;
    vx: number;
    vy: number;
    icon: string;
    rotation: number; // For subtle rotation animation
    pulse: number; // For pulse animation
}

interface Zone {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    icon: string;
    targetValue: string;
    glow: boolean;
    color: string;
    glowIntensity: number; // For animated glow
}

let currentRound: SortCategory = 'color';
let roundIndex = 0;
let playedRounds: Set<SortCategory> = new Set();
let objects: SortableObject[] = [];
let zones: Zone[] = [];
let grabbedObject: SortableObject | null = null;
let score = 0;
let totalObjects = 0;
let roundComplete = false;
let celebrationTime = 0;

// Smoothing filter for grabbed object movement
let grabFilter: OneEuroFilter2D | null = null;

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#FF6B9D', '#95E1D3'];
// Track which colors are used in the current color round
let currentColorPair: [string, string] = [COLORS[0], COLORS[1]];
const CATEGORIES = {
    food: ['🍎', '🍌', '🍕', '🍰', '🥕', '🍇', '🥑', '🍓'],
    toy: ['🧸', '🚗', '🎈', '🎮', '🎯', '🏀', '🎨', '🧩'],
    animal: ['🐶', '🐱', '🐰', '🐻', '🦊', '🐼', '🐨', '🦁']
};

function createObjects(count: number, category: SortCategory): SortableObject[] {
    const objs: SortableObject[] = [];
    const values = category === 'color' ? [currentColorPair[0], currentColorPair[1]] :
                   category === 'size' ? ['small', 'large'] :
                   ['food', 'toy'];
    
    for (let i = 0; i < count; i++) {
        const value = values[Math.floor(Math.random() * values.length)];
        const size = category === 'size' ? (value as 'small' | 'large') :
                     Math.random() > 0.5 ? 'large' : 'small';
        const objCategory = category === 'category' ? (value as 'food' | 'toy' | 'animal') :
                           Math.random() > 0.5 ? 'food' : 'toy';
        const color = category === 'color' ? value : COLORS[Math.floor(Math.random() * COLORS.length)];
        
        const categoryIcons = CATEGORIES[objCategory];
        const icon = categoryIcons[Math.floor(Math.random() * categoryIcons.length)];
        
        objs.push({
            id: i,
            x: 0.15 + Math.random() * 0.7,
            y: 0.15 + Math.random() * 0.5,
            width: size === 'large' ? 0.08 : 0.06,
            height: size === 'large' ? 0.08 : 0.06,
            color,
            size,
            category: objCategory,
            grabbed: false,
            placed: false,
            placedZone: null,
            icon,
            rotation: Math.random() * Math.PI * 2,
            pulse: Math.random(),
            vx: (Math.random() - 0.5) * 0.00015,
            vy: (Math.random() - 0.5) * 0.00015
        });
    }
    return objs;
}

function createZones(category: SortCategory): Zone[] {
    const zones: Zone[] = [];
    
    if (category === 'color') {
        // Use the current color pair (randomized)
        const [color1, color2] = currentColorPair;
        // Create color names for labels (simplified - could be enhanced)
        const colorNames = {
            '#FF6B6B': { label: 'Red Things', icon: '🔴' },
            '#4ECDC4': { label: 'Blue Things', icon: '🔵' },
            '#FFE66D': { label: 'Yellow Things', icon: '🟡' },
            '#A855F7': { label: 'Purple Things', icon: '🟣' },
            '#FF6B9D': { label: 'Pink Things', icon: '🩷' },
            '#95E1D3': { label: 'Teal Things', icon: '🩵' }
        };
        const name1 = colorNames[color1 as keyof typeof colorNames] || { label: 'Color 1', icon: '🔴' };
        const name2 = colorNames[color2 as keyof typeof colorNames] || { label: 'Color 2', icon: '🔵' };
        
        zones.push({
            id: 'color1',
            x: 0.25,
            y: 0.82,
            width: 0.38,
            height: 0.14,
            label: name1.label,
            icon: name1.icon,
            targetValue: color1,
            glow: false,
            color: color1,
            glowIntensity: 0
        });
        zones.push({
            id: 'color2',
            x: 0.75,
            y: 0.82,
            width: 0.38,
            height: 0.14,
            label: name2.label,
            icon: name2.icon,
            targetValue: color2,
            glow: false,
            color: color2,
            glowIntensity: 0
        });
    } else if (category === 'size') {
        zones.push({
            id: 'big',
            x: 0.25,
            y: 0.82,
            width: 0.38,
            height: 0.14,
            label: 'Big',
            icon: '📦',
            targetValue: 'large',
            glow: false,
            color: '#FFD700',
            glowIntensity: 0
        });
        zones.push({
            id: 'small',
            x: 0.75,
            y: 0.82,
            width: 0.38,
            height: 0.14,
            label: 'Small',
            icon: '📦',
            targetValue: 'small',
            glow: false,
            color: '#87CEEB',
            glowIntensity: 0
        });
    } else {
        zones.push({
            id: 'food',
            x: 0.25,
            y: 0.82,
            width: 0.38,
            height: 0.14,
            label: 'Food',
            icon: '🍎',
            targetValue: 'food',
            glow: false,
            color: '#FF6B6B',
            glowIntensity: 0
        });
        zones.push({
            id: 'toy',
            x: 0.75,
            y: 0.82,
            width: 0.38,
            height: 0.14,
            label: 'Toys',
            icon: '🧸',
            targetValue: 'toy',
            glow: false,
            color: '#4ECDC4',
            glowIntensity: 0
        });
    }
    
    return zones;
}

export function startSortRound(category: SortCategory) {
    currentRound = category;
    playedRounds.add(category);
    
    // If starting a color round, randomize the color pair
    if (category === 'color') {
        // Pick two random different colors
        const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
        currentColorPair = [shuffled[0], shuffled[1]];
    }
    
    objects = createObjects(6, category);
    zones = createZones(category);
    grabbedObject = null;
    score = 0;
    totalObjects = objects.length;
    roundComplete = false;
    celebrationTime = 0;
    grabFilter = new OneEuroFilter2D({ minCutoff: 1.5, beta: 0.02, dCutoff: 1.0 });
}

export function getCurrentRound() { return currentRound; }
export function getScore() { return score; }
export function getTotalObjects() { return totalObjects; }
export function isRoundComplete() { return roundComplete; }
export function getCelebrationTime() { return celebrationTime; }

export function nextRound() {
    roundIndex++;
    const allRounds: SortCategory[] = ['color', 'size', 'category'];
    
    // Find a round type we haven't played yet
    const unplayedRounds = allRounds.filter(r => !playedRounds.has(r));
    
    if (unplayedRounds.length > 0) {
        // Play a random unplayed round
        const nextRoundType = unplayedRounds[Math.floor(Math.random() * unplayedRounds.length)];
        startSortRound(nextRoundType);
        return true;
    } else {
        // All rounds complete
        return false;
    }
}

export function resetAllRounds() {
    roundIndex = 0;
    playedRounds.clear();
    // Randomize starting round type so it's not always color
    const roundTypes: SortCategory[] = ['color', 'size', 'category'];
    const randomRound = roundTypes[Math.floor(Math.random() * roundTypes.length)];
    startSortRound(randomRound);
}

export const sortAndPlaceLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null
) => {
    // Use unified interaction state (pre-filtered, stable)
    const { filteredPoint, pinchActive, timestamp } = frameData;

    const now = Date.now();

    // Update object animations
    objects.forEach(obj => {
        if (!obj.placed) {
            obj.pulse += 0.02;
            obj.rotation += obj.grabbed ? 0.05 : 0.01;
        }
    });

    // Update zone glow animations
    zones.forEach(zone => {
        zone.glowIntensity = Math.sin(now / 300) * 0.5 + 0.5;
    });

    // Update object positions (drift if not grabbed and not placed)
    objects.forEach(obj => {
        if (!obj.grabbed && !obj.placed) {
            obj.x += obj.vx;
            obj.y += obj.vy;
            
            // Bounce off edges
            if (obj.x < 0.05 || obj.x > 0.95) obj.vx *= -1;
            if (obj.y < 0.05 || obj.y > 0.65) obj.vy *= -1;
            obj.x = Math.max(0.05, Math.min(0.95, obj.x));
            obj.y = Math.max(0.05, Math.min(0.65, obj.y));
        }
    });

    // Handle grab/release with smooth movement using unified state
    if (pinchActive && filteredPoint) {
        if (!grabbedObject) {
            // Try to grab nearest unplaced object
            let minDist = Infinity;
            let nearest: SortableObject | null = null;
            
            for (const obj of objects) {
                if (obj.grabbed || obj.placed) continue;
                const dist = Math.hypot(
                    filteredPoint.x - obj.x,
                    filteredPoint.y - obj.y
                );
                if (dist < obj.width * 1.5 && dist < minDist) {
                    minDist = dist;
                    nearest = obj;
                }
            }
            
            if (nearest) {
                grabbedObject = nearest;
                nearest.grabbed = true;
                // Reset filter for new grab
                if (grabFilter) {
                    grabFilter.reset();
                }
            }
        } else if (grabbedObject) {
            // Smooth movement using One Euro Filter (secondary smoothing on already-filtered point)
            if (grabFilter) {
                const smoothed = grabFilter.filter(filteredPoint.x, filteredPoint.y, timestamp);
                grabbedObject.x = smoothed.x;
                grabbedObject.y = smoothed.y;
            } else {
                grabbedObject.x = filteredPoint.x;
                grabbedObject.y = filteredPoint.y;
            }

            // Check if hovering over a zone for glow effect
            zones.forEach(zone => {
                const objCanvas = normalizedToCanvas(
                    { x: grabbedObject!.x, y: grabbedObject!.y },
                    width,
                    height
                );
                const zoneCanvas = normalizedToCanvas(
                    { x: zone.x, y: zone.y },
                    width,
                    height
                );
                const zoneW = zone.width * width;
                const zoneH = zone.height * height;
                
                const isHovering = 
                    objCanvas.x >= zoneCanvas.x - zoneW / 2 &&
                    objCanvas.x <= zoneCanvas.x + zoneW / 2 &&
                    objCanvas.y >= zoneCanvas.y - zoneH / 2 &&
                    objCanvas.y <= zoneCanvas.y + zoneH / 2;

                const isCorrect = 
                    (currentRound === 'color' && grabbedObject!.color === zone.targetValue) ||
                    (currentRound === 'size' && grabbedObject!.size === zone.targetValue) ||
                    (currentRound === 'category' && grabbedObject!.category === zone.targetValue);

                zone.glow = isHovering;
                zone.glowIntensity = isHovering && isCorrect ? 1 : zone.glowIntensity;
            });
        }
    } else {
        // Release
        if (grabbedObject) {
            const grabbed = grabbedObject;
            
            // Check if dropped in a zone
            let droppedInZone = false;
            
            zones.forEach(zone => {
                const objCanvas = normalizedToCanvas(
                    { x: grabbed.x, y: grabbed.y },
                    width,
                    height
                );
                const zoneCanvas = normalizedToCanvas(
                    { x: zone.x, y: zone.y },
                    width,
                    height
                );
                const zoneW = zone.width * width;
                const zoneH = zone.height * height;
                
                if (
                    objCanvas.x >= zoneCanvas.x - zoneW / 2 &&
                    objCanvas.x <= zoneCanvas.x + zoneW / 2 &&
                    objCanvas.y >= zoneCanvas.y - zoneH / 2 &&
                    objCanvas.y <= zoneCanvas.y + zoneH / 2
                ) {
                    // Check if correct
                    const isCorrect = 
                        (currentRound === 'color' && grabbed.color === zone.targetValue) ||
                        (currentRound === 'size' && grabbed.size === zone.targetValue) ||
                        (currentRound === 'category' && grabbed.category === zone.targetValue);
                    
                    if (isCorrect) {
                        // Correct placement - stack objects line by line in zone
                        const placedInZone = objects.filter(o => o.placed && o.placedZone === zone.id);
                        const stackIndex = placedInZone.length;
                        
                        // Calculate stacking position
                        const zoneCanvas = normalizedToCanvas({ x: zone.x, y: zone.y }, width, height);
                        const zoneW = zone.width * width;
                        const objW = grabbed.width * width;
                        const objH = grabbed.height * height;
                        
                        // Stack in rows (2-3 objects per row depending on zone size)
                        const objectsPerRow = Math.floor(zoneW / (objW * 1.2));
                        const row = Math.floor(stackIndex / objectsPerRow);
                        const col = stackIndex % objectsPerRow;
                        const rowsTotal = Math.ceil(totalObjects / objectsPerRow);
                        
                        // Center the stack within the zone
                        const totalWidth = Math.min(objectsPerRow, totalObjects) * objW * 1.2;
                        const startX = zoneCanvas.x - totalWidth / 2 + objW * 0.6;
                        const stackHeight = rowsTotal * objH * 1.2;
                        const startY = zoneCanvas.y - stackHeight / 2 + objH * 0.6;
                        
                        // Calculate position for this object
                        const stackX = startX + col * objW * 1.2;
                        const stackY = startY + row * objH * 1.2;
                        
                        // Convert back to normalized coordinates
                        const stackNormalized = {
                            x: stackX / width,
                            y: stackY / height
                        };
                        
                        grabbed.x = stackNormalized.x;
                        grabbed.y = stackNormalized.y;
                        grabbed.placed = true;
                        grabbed.placedZone = zone.id;
                        grabbed.grabbed = false;
                        grabbed.vx = 0;
                        grabbed.vy = 0;
                        grabbed.rotation = 0;
                        score++;
                        droppedInZone = true;
                        zone.glow = false;
                    } else {
                        // Wrong zone - bounce back with animation
                        grabbed.vx = (grabbed.x - zone.x) * 0.015;
                        grabbed.vy = (grabbed.y - zone.y) * 0.015;
                    }
                }
            });
            
            if (!droppedInZone) {
                grabbed.grabbed = false;
            }
            
            grabbedObject = null;
        }

        // Reset zone glows
        zones.forEach(zone => {
            zone.glow = false;
        });
    }

    // Check round completion
    if (objects.filter(o => o.placed).length === totalObjects && !roundComplete) {
        roundComplete = true;
        celebrationTime = Date.now();
    }

    // Draw zones with improved graphics
    zones.forEach(zone => {
        const zoneCanvas = normalizedToCanvas({ x: zone.x, y: zone.y }, width, height);
        const zoneW = zone.width * width;
        const zoneH = zone.height * height;
        
        // Outer glow effect
        if (zone.glow) {
            const glowRadius = zoneW * 0.6;
            const gradient = ctx.createRadialGradient(
                zoneCanvas.x, zoneCanvas.y, 0,
                zoneCanvas.x, zoneCanvas.y, glowRadius
            );
            gradient.addColorStop(0, zone.color + '88');
            gradient.addColorStop(0.5, zone.color + '44');
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(
                zoneCanvas.x - glowRadius,
                zoneCanvas.y - glowRadius,
                glowRadius * 2,
                glowRadius * 2
            );
        }
        
        // Zone background with gradient
        const bgGradient = ctx.createLinearGradient(
            zoneCanvas.x - zoneW / 2,
            zoneCanvas.y - zoneH / 2,
            zoneCanvas.x + zoneW / 2,
            zoneCanvas.y + zoneH / 2
        );
        bgGradient.addColorStop(0, zone.color + '66');
        bgGradient.addColorStop(1, zone.color + '33');
        
        ctx.fillStyle = bgGradient;
        ctx.beginPath();
        ctx.roundRect(
            zoneCanvas.x - zoneW / 2,
            zoneCanvas.y - zoneH / 2,
            zoneW,
            zoneH,
            20
        );
        ctx.fill();
        
        // Zone border with glow
        ctx.strokeStyle = zone.glow ? zone.color : 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = zone.glow ? 6 : 4;
        ctx.shadowColor = zone.glow ? zone.color : 'transparent';
        ctx.shadowBlur = zone.glow ? 20 : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Zone icon with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText(zone.icon, zoneCanvas.x, zoneCanvas.y - 10);
        ctx.restore();
        
        // Zone label
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(zone.label, zoneCanvas.x, zoneCanvas.y + 30);
    });

    // Draw objects with improved graphics and 3D effect
    objects.forEach(obj => {
        const objCanvas = normalizedToCanvas({ x: obj.x, y: obj.y }, width, height);
        const objW = obj.width * width;
        const objH = obj.height * height;
        const scale = obj.grabbed ? 1.15 : obj.placed ? 1.0 : 1.0 + Math.sin(obj.pulse) * 0.05;
        const currentW = objW * scale;
        const currentH = objH * scale;
        
        // 3D depth offset for placed objects
        const depthOffset = obj.placed ? 3 : 0;
        const shadowOffset = obj.placed ? 4 : 6;
        
        ctx.save();
        ctx.translate(objCanvas.x, objCanvas.y - depthOffset);
        ctx.rotate(obj.placed ? 0 : obj.rotation); // Stop rotation when placed
        
        // Shadow with perspective
        ctx.fillStyle = obj.placed ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(
            -currentW / 2 + shadowOffset,
            -currentH / 2 + shadowOffset,
            currentW,
            currentH,
            12
        );
        ctx.fill();
        
        // 3D perspective effect - darker bottom, lighter top
        const objGradient = ctx.createLinearGradient(
            -currentW / 2,
            -currentH / 2,
            currentW / 2,
            currentH / 2
        );
        
        if (obj.placed) {
            // More 3D effect for placed objects
            objGradient.addColorStop(0, obj.color + 'FF');
            objGradient.addColorStop(0.3, obj.color + 'EE');
            objGradient.addColorStop(0.6, obj.color + 'CC');
            objGradient.addColorStop(1, obj.color + 'AA');
        } else {
            objGradient.addColorStop(0, obj.color + 'FF');
            objGradient.addColorStop(0.5, obj.color + 'DD');
            objGradient.addColorStop(1, obj.color + 'BB');
        }
        
        ctx.fillStyle = objGradient;
        ctx.beginPath();
        ctx.roundRect(
            -currentW / 2,
            -currentH / 2,
            currentW,
            currentH,
            12
        );
        ctx.fill();
        
        // Object border with 3D effect
        const borderGradient = ctx.createLinearGradient(
            -currentW / 2,
            -currentH / 2,
            currentW / 2,
            currentH / 2
        );
        
        if (obj.grabbed) {
            borderGradient.addColorStop(0, '#FFD700');
            borderGradient.addColorStop(1, '#FFA500');
        } else if (obj.placed) {
            borderGradient.addColorStop(0, '#00FF00');
            borderGradient.addColorStop(1, '#00AA00');
        } else {
            borderGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            borderGradient.addColorStop(1, 'rgba(255, 255, 255, 0.6)');
        }
        
        ctx.strokeStyle = obj.grabbed ? '#FFD700' : obj.placed ? '#00FF00' : 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = obj.grabbed ? 6 : obj.placed ? 5 : 3;
        ctx.shadowColor = obj.grabbed ? '#FFD700' : obj.placed ? '#00FF00' : 'transparent';
        ctx.shadowBlur = obj.grabbed ? 15 : obj.placed ? 12 : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Top highlight for 3D effect
        if (obj.placed) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.roundRect(
                -currentW / 2,
                -currentH / 2,
                currentW,
                currentH * 0.3,
                12
            );
            ctx.fill();
        }
        
        // Icon with glow
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(obj.icon, 0, 0);
        ctx.restore();
    });

    // Draw finger indicator with improved design
    if (filteredPoint) {
        const fingerCanvas = normalizedToCanvas(filteredPoint, width, height);
        
        // Outer ring
        ctx.beginPath();
        ctx.arc(fingerCanvas.x, fingerCanvas.y, 28, 0, Math.PI * 2);
        ctx.strokeStyle = pinchActive ? '#FFD700' : 'rgba(0, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Inner dot
        ctx.beginPath();
        ctx.arc(fingerCanvas.x, fingerCanvas.y, pinchActive ? 18 : 12, 0, Math.PI * 2);
        ctx.fillStyle = pinchActive ? '#FFD700' : 'rgba(255, 255, 255, 0.9)';
        ctx.shadowColor = pinchActive ? '#FFD700' : '#00FFFF';
        ctx.shadowBlur = pinchActive ? 20 : 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
};

// Polyfill for roundRect if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
    };
}
