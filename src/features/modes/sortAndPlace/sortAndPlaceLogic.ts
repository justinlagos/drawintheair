import { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { normalizedToCanvas } from '../../../core/coordinateUtils';

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
    placed: boolean; // NEW: Track if object is correctly placed
    placedZone: string | null; // NEW: Which zone it's in
    vx: number; // Velocity for drift
    vy: number;
    icon: string; // NEW: Visual icon for the object
}

interface Zone {
    id: string;
    x: number; // Normalized
    y: number; // Normalized
    width: number;
    height: number;
    label: string;
    icon: string;
    targetValue: string; // Color, size, or category
    glow: boolean;
    color: string; // NEW: Zone color for visual clarity
}

let currentRound: SortCategory = 'color';
let roundIndex = 0;
let objects: SortableObject[] = [];
let zones: Zone[] = [];
let grabbedObject: SortableObject | null = null;
let score = 0;
let totalObjects = 0;
let roundComplete = false;
let celebrationTime = 0;

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#FF6B9D'];
const CATEGORIES = {
    food: ['🍎', '🍌', '🍕', '🍰', '🥕', '🍇'],
    toy: ['🧸', '🚗', '🎈', '🎮', '🎯', '🏀'],
    animal: ['🐶', '🐱', '🐰', '🐻', '🦊', '🐼']
};

function createObjects(count: number, category: SortCategory): SortableObject[] {
    const objs: SortableObject[] = [];
    const values = category === 'color' ? COLORS.slice(0, 2) :
                   category === 'size' ? ['small', 'large'] :
                   ['food', 'toy'];
    
    for (let i = 0; i < count; i++) {
        const value = values[Math.floor(Math.random() * values.length)];
        const size = category === 'size' ? (value as 'small' | 'large') :
                     Math.random() > 0.5 ? 'large' : 'small';
        const objCategory = category === 'category' ? (value as 'food' | 'toy' | 'animal') :
                           Math.random() > 0.5 ? 'food' : 'toy';
        const color = category === 'color' ? value : COLORS[Math.floor(Math.random() * COLORS.length)];
        
        // Get icon based on category
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
            vx: (Math.random() - 0.5) * 0.0002,
            vy: (Math.random() - 0.5) * 0.0002
        });
    }
    return objs;
}

function createZones(category: SortCategory): Zone[] {
    const zones: Zone[] = [];
    
    if (category === 'color') {
        zones.push({
            id: 'red',
            x: 0.25,
            y: 0.8,
            width: 0.4,
            height: 0.12,
            label: 'Red Things',
            icon: '🔴',
            targetValue: COLORS[0],
            glow: false,
            color: COLORS[0]
        });
        zones.push({
            id: 'blue',
            x: 0.75,
            y: 0.8,
            width: 0.4,
            height: 0.12,
            label: 'Blue Things',
            icon: '🔵',
            targetValue: COLORS[1],
            glow: false,
            color: COLORS[1]
        });
    } else if (category === 'size') {
        zones.push({
            id: 'big',
            x: 0.25,
            y: 0.8,
            width: 0.4,
            height: 0.12,
            label: 'Big',
            icon: '📦',
            targetValue: 'large',
            glow: false,
            color: '#FFD700'
        });
        zones.push({
            id: 'small',
            x: 0.75,
            y: 0.8,
            width: 0.4,
            height: 0.12,
            label: 'Small',
            icon: '📦',
            targetValue: 'small',
            glow: false,
            color: '#87CEEB'
        });
    } else {
        zones.push({
            id: 'food',
            x: 0.25,
            y: 0.8,
            width: 0.4,
            height: 0.12,
            label: 'Food',
            icon: '🍎',
            targetValue: 'food',
            glow: false,
            color: '#FF6B6B'
        });
        zones.push({
            id: 'toy',
            x: 0.75,
            y: 0.8,
            width: 0.4,
            height: 0.12,
            label: 'Toys',
            icon: '🧸',
            targetValue: 'toy',
            glow: false,
            color: '#4ECDC4'
        });
    }
    
    return zones;
}

export function startSortRound(category: SortCategory) {
    currentRound = category;
    objects = createObjects(6, category);
    zones = createZones(category);
    grabbedObject = null;
    score = 0;
    totalObjects = objects.length;
    roundComplete = false;
    celebrationTime = 0;
}

export function getCurrentRound() { return currentRound; }
export function getScore() { return score; }
export function getTotalObjects() { return totalObjects; }
export function isRoundComplete() { return roundComplete; }
export function getCelebrationTime() { return celebrationTime; }

export function nextRound() {
    roundIndex++;
    if (roundIndex === 1) {
        startSortRound('size');
    } else if (roundIndex === 2) {
        startSortRound('category');
    } else {
        return false; // All rounds complete
    }
    return true;
}

export function resetAllRounds() {
    roundIndex = 0;
    startSortRound('color');
}

export const sortAndPlaceLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null
) => {
    const { indexTip, thumbTip, handScale, confidence } = frameData;
    
    // Detect pinch
    let isPinching = false;
    if (indexTip && thumbTip) {
        const pinchDistance = Math.hypot(
            indexTip.x - thumbTip.x,
            indexTip.y - thumbTip.y
        );
        isPinching = pinchDistance < handScale * 0.4 && confidence >= 0.6;
    }

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

    // Handle grab/release
    if (isPinching && indexTip) {
        if (!grabbedObject) {
            // Try to grab nearest unplaced object
            let minDist = Infinity;
            let nearest: SortableObject | null = null;
            
            for (const obj of objects) {
                if (obj.grabbed || obj.placed) continue;
                const dist = Math.hypot(
                    indexTip.x - obj.x,
                    indexTip.y - obj.y
                );
                if (dist < obj.width && dist < minDist) {
                    minDist = dist;
                    nearest = obj;
                }
            }
            
            if (nearest) {
                grabbedObject = nearest;
                nearest.grabbed = true;
            }
        } else {
            // Move grabbed object
            grabbedObject.x = indexTip.x;
            grabbedObject.y = indexTip.y;
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
                        // Correct placement - snap to zone center and mark as placed
                        grabbed.x = zone.x;
                        grabbed.y = zone.y;
                        grabbed.placed = true;
                        grabbed.placedZone = zone.id;
                        grabbed.grabbed = false;
                        grabbed.vx = 0;
                        grabbed.vy = 0;
                        score++;
                        droppedInZone = true;
                    } else {
                        // Wrong zone - bounce back
                        grabbed.vx = (grabbed.x - zone.x) * 0.01;
                        grabbed.vy = (grabbed.y - zone.y) * 0.01;
                    }
                }
            });
            
            if (!droppedInZone) {
                // Release in empty space
                grabbed.grabbed = false;
            }
            
            grabbedObject = null;
        }
    }

    // Check round completion
    if (objects.filter(o => o.placed).length === totalObjects && !roundComplete) {
        roundComplete = true;
        celebrationTime = Date.now();
    }

    // Draw zones first (background)
    zones.forEach(zone => {
        const zoneCanvas = normalizedToCanvas({ x: zone.x, y: zone.y }, width, height);
        const zoneW = zone.width * width;
        const zoneH = zone.height * height;
        
        // Zone background with color
        ctx.fillStyle = zone.glow ? zone.color + 'CC' : zone.color + '44';
        ctx.fillRect(
            zoneCanvas.x - zoneW / 2,
            zoneCanvas.y - zoneH / 2,
            zoneW,
            zoneH
        );
        
        // Zone border
        ctx.strokeStyle = zone.glow ? zone.color : 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = zone.glow ? 5 : 3;
        ctx.strokeRect(
            zoneCanvas.x - zoneW / 2,
            zoneCanvas.y - zoneH / 2,
            zoneW,
            zoneH
        );
        
        // Zone label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(zone.icon, zoneCanvas.x, zoneCanvas.y - 15);
        ctx.font = '20px Arial';
        ctx.fillText(zone.label, zoneCanvas.x, zoneCanvas.y + 25);
    });

    // Draw objects (including placed ones)
    objects.forEach(obj => {
        const objCanvas = normalizedToCanvas({ x: obj.x, y: obj.y }, width, height);
        const objW = obj.width * width;
        const objH = obj.height * height;
        
        // Object shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(
            objCanvas.x - objW / 2 + 4,
            objCanvas.y - objH / 2 + 4,
            objW,
            objH
        );
        
        // Object background
        ctx.fillStyle = obj.placed ? obj.color + 'DD' : obj.color;
        ctx.fillRect(
            objCanvas.x - objW / 2,
            objCanvas.y - objH / 2,
            objW,
            objH
        );
        
        // Object border
        ctx.strokeStyle = obj.grabbed ? '#FFD700' : obj.placed ? '#00FF00' : 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = obj.grabbed ? 5 : obj.placed ? 4 : 2;
        ctx.strokeRect(
            objCanvas.x - objW / 2,
            objCanvas.y - objH / 2,
            objW,
            objH
        );
        
        // Category icon (always visible, even when placed)
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(obj.icon, objCanvas.x, objCanvas.y + 12);
    });

    // Draw finger indicator
    if (indexTip) {
        const fingerCanvas = normalizedToCanvas(indexTip, width, height);
        ctx.beginPath();
        ctx.arc(fingerCanvas.x, fingerCanvas.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = isPinching ? '#FFD700' : 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
        ctx.strokeStyle = isPinching ? '#FFD700' : '#00FFFF';
        ctx.lineWidth = 4;
        ctx.stroke();
    }
};
