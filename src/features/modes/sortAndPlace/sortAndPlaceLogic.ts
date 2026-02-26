import { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { normalizedToCanvas } from '../../../core/coordinateUtils';
import { OneEuroFilter2D } from '../../../core/filters/OneEuroFilter';
import { trackingFeatures } from '../../../core/trackingFeatures';
import { tactileAudioManager } from '../../../core/TactileAudioManager';
import { isCountdownActive } from '../../../core/countdownService';

export type BinId = string;

export type StageBin = {
    id: BinId;
    label: string;
    icon: string;
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
    glow: boolean;
    glowIntensity: number;
};

export type StageItem = {
    id: string;
    key: string;
    label: string;
    binId: BinId;
    x: number;
    y: number;
    width: number;
    height: number;
    icon: string;
    color: string;
    grabbed: boolean;
    placed: boolean;
    placedZone: string | null;
    vx: number;
    vy: number;
    rotation: number;
    pulse: number;
};

export type StageConfig = {
    id: string;
    title: string;
    instruction: string;
    bins: {
        left: StageBin;
        right: StageBin;
    };
    items: StageItem[];
};

export type StageTemplate = {
    id: string;
    title: string;
    instruction: string;
    bins: {
        left: { id: BinId; label: string; icon: string; color: string };
        right: { id: BinId; label: string; icon: string; color: string };
    };
    items: Array<{ key: string; binId: BinId; label: string }>;
};

export type DropResult = 'correct' | 'wrong' | 'none';

export function makeItemId(key: string, index: number): string {
    return `${key}-${String(index).padStart(4, '0')}`;
}

export function validateDrop(args: {
    stage: StageConfig;
    itemId: string;
    dropBinId: BinId | null;
}): DropResult {
    const { stage, itemId, dropBinId } = args;
    if (!dropBinId) return 'none';

    const item = stage.items.find((i) => i.id === itemId);
    if (!item) return 'none';

    return item.binId === dropBinId ? 'correct' : 'wrong';
}

export function instantiateStage(template: StageTemplate): StageConfig {
    const leftBin: StageBin = {
        ...template.bins.left,
        x: 0.25,
        y: 0.82,
        width: 0.38,
        height: 0.14,
        glow: false,
        glowIntensity: 0
    };
    const rightBin: StageBin = {
        ...template.bins.right,
        x: 0.75,
        y: 0.82,
        width: 0.38,
        height: 0.14,
        glow: false,
        glowIntensity: 0
    };

    const itemColorMap: Record<string, string> = {
        'food.apple': '#FF6B6B',
        'food.banana': '#FFE66D',
        'food.pizza': '#FF8C00',
        'food.cake': '#FFB6C1',
        'food.carrot': '#FF7F50',
        'food.grape': '#9370DB',
        'food.avocado': '#98FB98',
        'food.strawberry': '#FF4444',
        'toy.teddy': '#D2691E',
        'toy.car': '#4169E1',
        'toy.balloon': '#FF69B4',
        'toy.controller': '#2F4F4F',
        'toy.dart': '#DC143C',
        'toy.basketball': '#FF8C00',
        'toy.palette': '#DA70D6',
        'toy.puzzle': '#8B4513',
        'animal.dog': '#D2B48C',
        'animal.cat': '#A9A9A9',
        'animal.rabbit': '#FFB6C1',
        'animal.bear': '#8B4513',
        'animal.fox': '#FF7F50',
        'animal.panda': '#F5F5F5',
        'animal.koala': '#D3D3D3',
        'animal.lion': '#DAA520',
        'vehicle.car.red': '#DC143C',
        'vehicle.car.blue': '#4169E1',
        'vehicle.car.green': '#228B22',
        'vehicle.car.yellow': '#FFD700',
        'vehicle.plane': '#87CEEB',
        'vehicle.boat': '#1E90FF',
        'vehicle.bus': '#FFD700',
        'vehicle.bike': '#FF6347',
        'recycle.bottle': '#90EE90',
        'recycle.can': '#C0C0C0',
        'recycle.paper': '#FFFACD',
        'recycle.glass': '#ADD8E6',
        'trash.banana': '#FFD700',
        'trash.wrapper': '#808080',
        'trash.paper': '#F5DEB3',
        'trash.cup': '#DEB887',
    };

    const items: StageItem[] = template.items.map((it, idx) => ({
        id: makeItemId(it.key, idx),
        key: it.key,
        label: it.label,
        binId: it.binId,
        x: 0.15 + Math.random() * 0.7,
        y: 0.15 + Math.random() * 0.5,
        width: 0.08,
        height: 0.08,
        icon: getItemIcon(it.key),
        color: itemColorMap[it.key] || '#A855F7',
        grabbed: false,
        placed: false,
        placedZone: null,
        rotation: Math.random() * Math.PI * 2,
        pulse: Math.random(),
        vx: (Math.random() - 0.5) * 0.00015,
        vy: (Math.random() - 0.5) * 0.00015
    }));

    return {
        id: template.id,
        title: template.title,
        instruction: template.instruction,
        bins: { left: leftBin, right: rightBin },
        items
    };
}

function getItemIcon(key: string): string {
    const iconMap: Record<string, string> = {
        'food.apple': '🍎',
        'food.banana': '🍌',
        'food.pizza': '🍕',
        'food.cake': '🍰',
        'food.carrot': '🥕',
        'food.grape': '🍇',
        'food.avocado': '🥑',
        'food.strawberry': '🍓',
        'toy.teddy': '🧸',
        'toy.car': '🚗',
        'toy.balloon': '🎈',
        'toy.controller': '🎮',
        'toy.dart': '🎯',
        'toy.basketball': '🏀',
        'toy.palette': '🎨',
        'toy.puzzle': '🧩',
        'animal.dog': '🐶',
        'animal.cat': '🐱',
        'animal.rabbit': '🐰',
        'animal.bear': '🐻',
        'animal.fox': '🦊',
        'animal.panda': '🐼',
        'animal.koala': '🐨',
        'animal.lion': '🦁',
        'vehicle.car.red': '🚗',
        'vehicle.car.blue': '🚙',
        'vehicle.car.green': '🚗',
        'vehicle.car.yellow': '🚕',
        'vehicle.plane': '✈️',
        'vehicle.boat': '⛵',
        'vehicle.bus': '🚌',
        'vehicle.bike': '🚲',
        'recycle.bottle': '🧴',
        'recycle.can': '🥫',
        'recycle.paper': '📄',
        'recycle.glass': '🫙',
        'trash.banana': '🍌',
        'trash.wrapper': '🍬',
        'trash.paper': '🧻',
        'trash.cup': '🥤',
    };
    return iconMap[key] || '📦';
}

export const STAGE_TEMPLATES: StageTemplate[] = [
    {
        id: 'food-vs-toys',
        title: 'Food vs Toys',
        instruction: 'Sort the items into the correct bins!',
        bins: {
            left: { id: 'food', label: 'Food', icon: '🍎', color: '#FF6B6B' },
            right: { id: 'toys', label: 'Toys', icon: '🧸', color: '#4ECDC4' }
        },
        items: [
            { key: 'food.apple', binId: 'food', label: 'Apple' },
            { key: 'food.banana', binId: 'food', label: 'Banana' },
            { key: 'food.pizza', binId: 'food', label: 'Pizza' },
            { key: 'food.cake', binId: 'food', label: 'Cake' },
            { key: 'toy.teddy', binId: 'toys', label: 'Teddy' },
            { key: 'toy.car', binId: 'toys', label: 'Car' },
            { key: 'toy.balloon', binId: 'toys', label: 'Balloon' },
            { key: 'toy.controller', binId: 'toys', label: 'Controller' }
        ]
    },
    {
        id: 'animals-vs-vehicles',
        title: 'Animals vs Vehicles',
        instruction: 'Sort the items into the correct bins!',
        bins: {
            left: { id: 'animals', label: 'Animals', icon: '🐶', color: '#A855F7' },
            right: { id: 'vehicles', label: 'Vehicles', icon: '🚗', color: '#4ECDC4' }
        },
        items: [
            { key: 'animal.dog', binId: 'animals', label: 'Dog' },
            { key: 'animal.cat', binId: 'animals', label: 'Cat' },
            { key: 'animal.rabbit', binId: 'animals', label: 'Rabbit' },
            { key: 'animal.bear', binId: 'animals', label: 'Bear' },
            { key: 'vehicle.car.red', binId: 'vehicles', label: 'Red Car' },
            { key: 'vehicle.car.blue', binId: 'vehicles', label: 'Blue Car' },
            { key: 'vehicle.plane', binId: 'vehicles', label: 'Plane' },
            { key: 'vehicle.boat', binId: 'vehicles', label: 'Boat' }
        ]
    },
    {
        id: 'recycle-vs-trash',
        title: 'Recycle vs Trash',
        instruction: 'Sort the items into the correct bins!',
        bins: {
            left: { id: 'recycle', label: 'Recycle', icon: '♻️', color: '#4ade80' },
            right: { id: 'trash', label: 'Trash', icon: '🗑️', color: '#6b7280' }
        },
        items: [
            { key: 'recycle.bottle', binId: 'recycle', label: 'Bottle' },
            { key: 'recycle.can', binId: 'recycle', label: 'Can' },
            { key: 'recycle.paper', binId: 'recycle', label: 'Paper' },
            { key: 'recycle.glass', binId: 'recycle', label: 'Glass' },
            { key: 'trash.banana', binId: 'trash', label: 'Banana Peel' },
            { key: 'trash.wrapper', binId: 'trash', label: 'Wrapper' },
            { key: 'trash.paper', binId: 'trash', label: 'Used Tissue' },
            { key: 'trash.cup', binId: 'trash', label: 'Cup' }
        ]
    }
];

let currentStageIndex = 0;
let currentStage: StageConfig | null = null;
let currentStageTemplate: StageTemplate | null = null;
let playedStages: Set<string> = new Set();
let grabbedObject: StageItem | null = null;
let score = 0;
let totalObjects = 0;
let roundComplete = false;
let celebrationTime = 0;
let isTransitioning = false;

let grabFilter: OneEuroFilter2D | null = null;

export function getCurrentStage() { return currentStage; }
export function getCurrentStageIndex() { return currentStageIndex; }
export function getScore() { return score; }
export function getTotalObjects() { return totalObjects; }
export function isRoundComplete() { return roundComplete; }
export function getCelebrationTime() { return celebrationTime; }

export function startStage(stageIndex?: number) {
    isTransitioning = false;
    if (stageIndex !== undefined) {
        currentStageIndex = stageIndex;
    } else {
        const unplayedTemplates = STAGE_TEMPLATES.filter(t => !playedStages.has(t.id));
        if (unplayedTemplates.length > 0) {
            currentStageIndex = STAGE_TEMPLATES.indexOf(unplayedTemplates[Math.floor(Math.random() * unplayedTemplates.length)]);
        } else {
            currentStageTemplate = STAGE_TEMPLATES[Math.floor(Math.random() * STAGE_TEMPLATES.length)];
            playedStages.clear();
            currentStageIndex = STAGE_TEMPLATES.indexOf(currentStageTemplate);
        }
    }

    currentStageTemplate = STAGE_TEMPLATES[currentStageIndex];
    playedStages.add(currentStageTemplate.id);
    currentStage = instantiateStage(currentStageTemplate);
    grabbedObject = null;
    score = 0;
    totalObjects = currentStage.items.length;
    roundComplete = false;
    celebrationTime = 0;
    grabFilter = new OneEuroFilter2D({ minCutoff: 1.5, beta: 0.02, dCutoff: 1.0 });
}

export function getItems() { 
    return currentStage?.items || []; 
}

export function getBins() { 
    return currentStage ? [currentStage.bins.left, currentStage.bins.right] : []; 
}

export function getGrabbedObject() { return grabbedObject; }

export function updateItemPosition(itemId: string, x: number, y: number) {
    const obj = currentStage?.items.find(o => o.id === itemId);
    if (obj && obj.grabbed) {
        obj.x = x;
        obj.y = y;
    }
}

function determineDropBinId(x: number, y: number): BinId | null {
    if (!currentStage) return null;

    const left = currentStage.bins.left;
    const right = currentStage.bins.right;

    const inLeft = 
        x >= left.x - left.width / 2 &&
        x <= left.x + left.width / 2 &&
        y >= left.y - left.height / 2 &&
        y <= left.y + left.height / 2;

    if (inLeft) return left.id;

    const inRight = 
        x >= right.x - right.width / 2 &&
        x <= right.x + right.width / 2 &&
        y >= right.y - right.height / 2 &&
        y <= right.y + right.height / 2;

    if (inRight) return right.id;

    return null;
}

export function releaseItem(itemId: string, x: number, y: number) {
    const obj = currentStage?.items.find(o => o.id === itemId);
    if (!obj || !obj.grabbed || !currentStage) return;

    const dropBinId = determineDropBinId(x, y);
    const result = validateDrop({ stage: currentStage, itemId, dropBinId });

    if (result === 'none') {
        obj.grabbed = false;
        return;
    }

    if (result === 'correct') {
        const bin = dropBinId === currentStage.bins.left.id ? currentStage.bins.left : currentStage.bins.right;
        const placedInBin = currentStage.items.filter(o => o.placed && o.placedZone === bin.id);
        const stackIndex = placedInBin.length;

        const zoneW = bin.width;
        const objW = obj.width;
        const objH = obj.height;
        const objectsPerRow = Math.floor(zoneW / (objW * 1.2));
        const row = Math.floor(stackIndex / objectsPerRow);
        const col = stackIndex % objectsPerRow;
        const rowsTotal = Math.ceil(totalObjects / objectsPerRow);
        const totalWidth = Math.min(objectsPerRow, totalObjects) * objW * 1.2;
        const startX = bin.x - totalWidth / 2 + objW * 0.6;
        const stackHeight = rowsTotal * objH * 1.2;
        const startY = bin.y - stackHeight / 2 + objH * 0.6;

        obj.x = startX + col * objW * 1.2;
        obj.y = startY + row * objH * 1.2;
        obj.placed = true;
        obj.placedZone = bin.id;
        obj.grabbed = false;
        obj.vx = 0;
        obj.vy = 0;
        obj.rotation = 0;
        score++;
        return;
    } else {
        obj.vx = (obj.x - x) * 0.015;
        obj.vy = (obj.y - y) * 0.015;
        obj.grabbed = false;
        return;
    }
}

export function nextStage() {
    const unplayedTemplates = STAGE_TEMPLATES.filter(t => !playedStages.has(t.id));

    if (unplayedTemplates.length > 0) {
        const nextIndex = STAGE_TEMPLATES.indexOf(unplayedTemplates[Math.floor(Math.random() * unplayedTemplates.length)]);
        startStage(nextIndex);
        return true;
    } else {
        playedStages.clear();
        const nextIndex = Math.floor(Math.random() * STAGE_TEMPLATES.length);
        startStage(nextIndex);
        return true;
    }
}

export function resetAllStages() {
    playedStages.clear();
    startStage();
}

export const sortAndPlaceLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null
) => {
    if (!currentStage) return;

    // Block input during countdown
    if (isCountdownActive()) return;

    const { filteredPoint, pinchActive, timestamp } = frameData;
    
    const flags = trackingFeatures.getFlags();
    if (flags.enableTactileAudio) {
        tactileAudioManager.updatePinchState(pinchActive);
        if (filteredPoint) {
            tactileAudioManager.updateMovement(filteredPoint, timestamp);
        }
    }

    const now = Date.now();

    currentStage.items.forEach(obj => {
        if (!obj.placed) {
            obj.pulse += 0.02;
            obj.rotation += obj.grabbed ? 0.05 : 0.01;
        }
    });

    [currentStage.bins.left, currentStage.bins.right].forEach(bin => {
        bin.glowIntensity = Math.sin(now / 300) * 0.5 + 0.5;
    });

    currentStage.items.forEach(obj => {
        if (!obj.grabbed && !obj.placed) {
            obj.x += obj.vx;
            obj.y += obj.vy;
            
            if (obj.x < 0.05 || obj.x > 0.95) obj.vx *= -1;
            if (obj.y < 0.05 || obj.y > 0.65) obj.vy *= -1;
            obj.x = Math.max(0.05, Math.min(0.95, obj.x));
            obj.y = Math.max(0.05, Math.min(0.65, obj.y));
        }
    });

    if (pinchActive && filteredPoint) {
        if (!grabbedObject) {
            let minDist = Infinity;
            let nearest: StageItem | null = null;
            
            for (const obj of currentStage.items) {
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
                if (grabFilter) {
                    grabFilter.reset();
                }
            }
        } else if (grabbedObject) {
            let targetX = filteredPoint.x;
            let targetY = filteredPoint.y;
            
            const magneticConfig = trackingFeatures.getMagneticTargetsConfig();
            let snappedToBin: StageBin | null = null;
            
            if (flags.enableMagneticTargets) {
                let nearestBin: StageBin | null = null;
                let minSnapDist = Infinity;
                
                const bins = [currentStage.bins.left, currentStage.bins.right];
                for (const bin of bins) {
                    const objCanvas = normalizedToCanvas(
                        { x: filteredPoint.x, y: filteredPoint.y },
                        width,
                        height
                    );
                    const binCanvas = normalizedToCanvas(
                        { x: bin.x, y: bin.y },
                        width,
                        height
                    );
                    
                    const dx = objCanvas.x - binCanvas.x;
                    const dy = objCanvas.y - binCanvas.y;
                    const dist = Math.hypot(dx, dy);
                    
                    if (dist < magneticConfig.snapDistancePx) {
                        const isCorrect = grabbedObject!.binId === bin.id;
                        
                        if (isCorrect && dist < minSnapDist) {
                            minSnapDist = dist;
                            nearestBin = bin;
                        }
                    }
                }
                
                if (nearestBin !== null && minSnapDist < magneticConfig.snapDistancePx) {
                    const snapBinCanvas = normalizedToCanvas(
                        { x: nearestBin.x, y: nearestBin.y },
                        width,
                        height
                    );
                    
                    const snapTargetX = snapBinCanvas.x / width;
                    const snapTargetY = snapBinCanvas.y / height;
                    
                    const easing = magneticConfig.snapEasingStrength;
                    targetX = targetX + (snapTargetX - targetX) * easing;
                    targetY = targetY + (snapTargetY - targetY) * easing;
                    
                    snappedToBin = nearestBin;
                }
            }
            
            if (grabFilter) {
                const smoothed = grabFilter.filter(targetX, targetY, timestamp);
                grabbedObject.x = smoothed.x;
                grabbedObject.y = smoothed.y;
            } else {
                grabbedObject.x = targetX;
                grabbedObject.y = targetY;
            }

            const bins = [currentStage.bins.left, currentStage.bins.right];
            bins.forEach(bin => {
                const objCanvas = normalizedToCanvas(
                    { x: grabbedObject!.x, y: grabbedObject!.y },
                    width,
                    height
                );
                const binCanvas = normalizedToCanvas(
                    { x: bin.x, y: bin.y },
                    width,
                    height
                );
                const binW = bin.width * width;
                const binH = bin.height * height;
                
                const isHovering = 
                    objCanvas.x >= binCanvas.x - binW / 2 &&
                    objCanvas.x <= binCanvas.x + binW / 2 &&
                    objCanvas.y >= binCanvas.y - binH / 2 &&
                    objCanvas.y <= binCanvas.y + binH / 2;

                const isCorrect = grabbedObject!.binId === bin.id;

                bin.glow = isHovering || (snappedToBin !== null && bin === snappedToBin);
                bin.glowIntensity = (isHovering || (snappedToBin !== null && bin === snappedToBin)) && isCorrect ? 1 : bin.glowIntensity;
            });
        }
    } else {
        if (grabbedObject) {
            const grabbed = grabbedObject;
            const flags = trackingFeatures.getFlags();
            
            let droppedInBin = false;
            let requiresPressConfirm = false;
            
            if (flags.enablePressIntegration) {
                const bins = [currentStage.bins.left, currentStage.bins.right];
                bins.forEach(bin => {
                    const objCanvas = normalizedToCanvas(
                        { x: grabbed.x, y: grabbed.y },
                        width,
                        height
                    );
                    const binCanvas = normalizedToCanvas(
                        { x: bin.x, y: bin.y },
                        width,
                        height
                    );
                    const binW = bin.width * width;
                    const binH = bin.height * height;
                    
                    const isHovering = 
                        objCanvas.x >= binCanvas.x - binW / 2 &&
                        objCanvas.x <= binCanvas.x + binW / 2 &&
                        objCanvas.y >= binCanvas.y - binH / 2 &&
                        objCanvas.y <= binCanvas.y + binH / 2;
                    
                    const isCorrect = grabbed.binId === bin.id;
                    
                    if (isHovering && isCorrect) {
                        requiresPressConfirm = true;
                    }
                });
            }
            
            let hasPressed = true;
            if (flags.enablePressIntegration && frameData.pressValue) {
                const pressConfig = trackingFeatures.getPressIntegrationConfig();
                hasPressed = frameData.pressValue >= pressConfig.sortingConfirmThreshold;
            }
            
            const bins = [currentStage.bins.left, currentStage.bins.right];
            bins.forEach(bin => {
                const objCanvas = normalizedToCanvas(
                    { x: grabbed.x, y: grabbed.y },
                    width,
                    height
                );
                const binCanvas = normalizedToCanvas(
                    { x: bin.x, y: bin.y },
                    width,
                    height
                );
                const binW = bin.width * width;
                const binH = bin.height * height;
                
                if (
                    objCanvas.x >= binCanvas.x - binW / 2 &&
                    objCanvas.x <= binCanvas.x + binW / 2 &&
                    objCanvas.y >= binCanvas.y - binH / 2 &&
                    objCanvas.y <= binCanvas.y + binH / 2
                ) {
                    const isCorrect = grabbed.binId === bin.id;
                    
                    if (isCorrect && (!requiresPressConfirm || hasPressed)) {
                        if (!currentStage) return;
                        const placedInBin = currentStage.items.filter(o => o.placed && o.placedZone === bin.id);
                        const stackIndex = placedInBin.length;
                        
                        const binCanvasCoords = normalizedToCanvas({ x: bin.x, y: bin.y }, width, height);
                        const zoneW = bin.width * width;
                        const objW = grabbed.width * width;
                        const objH = grabbed.height * height;
                        
                        const objectsPerRow = Math.floor(zoneW / (objW * 1.2));
                        const row = Math.floor(stackIndex / objectsPerRow);
                        const col = stackIndex % objectsPerRow;
                        const rowsTotal = Math.ceil(totalObjects / objectsPerRow);
                        
                        const totalWidth = Math.min(objectsPerRow, totalObjects) * objW * 1.2;
                        const startX = binCanvasCoords.x - totalWidth / 2 + objW * 0.6;
                        const stackHeight = rowsTotal * objH * 1.2;
                        const startY = binCanvasCoords.y - stackHeight / 2 + objH * 0.6;
                        
                        const stackX = startX + col * objW * 1.2;
                        const stackY = startY + row * objH * 1.2;
                        
                        const stackNormalized = {
                            x: stackX / width,
                            y: stackY / height
                        };
                        
                        grabbed.x = stackNormalized.x;
                        grabbed.y = stackNormalized.y;
                        grabbed.placed = true;
                        grabbed.placedZone = bin.id;
                        grabbed.grabbed = false;
                        grabbed.vx = 0;
                        grabbed.vy = 0;
                        grabbed.rotation = 0;
                        score++;
                        droppedInBin = true;
                        bin.glow = false;
                        
                        if (flags.enableTactileAudio) {
                            tactileAudioManager.playSuccess('sorting');
                        }
                    } else {
                        grabbed.vx = (grabbed.x - bin.x) * 0.015;
                        grabbed.vy = (grabbed.y - bin.y) * 0.015;
                    }
                }
            });
            
            if (!droppedInBin) {
                grabbed.grabbed = false;
            }
            
            grabbedObject = null;
        }

        if (currentStage) {
            [currentStage.bins.left, currentStage.bins.right].forEach(bin => {
                bin.glow = false;
            });
        }
    }

    if (currentStage && currentStage.items.filter(o => o.placed).length === totalObjects && !roundComplete && !isTransitioning) {
        roundComplete = true;
        celebrationTime = Date.now();
        isTransitioning = true;
    }

    if (!currentStage) return;

    [currentStage.bins.left, currentStage.bins.right].forEach(bin => {
        const binCanvas = normalizedToCanvas({ x: bin.x, y: bin.y }, width, height);
        const binW = bin.width * width;
        const binH = bin.height * height;
        const bx = binCanvas.x - binW / 2;
        const by = binCanvas.y - binH / 2;
        const cornerR = 16;

        if (bin.glow) {
            ctx.save();
            ctx.shadowColor = bin.color;
            ctx.shadowBlur = 30;
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = bin.color;
            ctx.beginPath();
            ctx.roundRect(bx - 4, by - 4, binW + 8, binH + 8, cornerR + 4);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(binCanvas.x, by + binH + 8, binW * 0.4, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const woodGrad = ctx.createLinearGradient(bx, by, bx, by + binH);
        woodGrad.addColorStop(0, '#C4956A');
        woodGrad.addColorStop(0.15, '#A67C52');
        woodGrad.addColorStop(0.5, '#8B6538');
        woodGrad.addColorStop(0.85, '#6D4E2D');
        woodGrad.addColorStop(1, '#5A3E22');

        ctx.fillStyle = woodGrad;
        ctx.beginPath();
        ctx.roundRect(bx, by, binW, binH, cornerR);
        ctx.fill();

        ctx.save();
        ctx.globalAlpha = 0.08;
        for (let ly = by + 8; ly < by + binH - 8; ly += 6) {
            ctx.strokeStyle = ly % 12 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx + 8, ly);
            ctx.lineTo(bx + binW - 8, ly);
            ctx.stroke();
        }
        ctx.restore();

        const innerGrad = ctx.createLinearGradient(bx, by, bx, by + binH);
        innerGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
        innerGrad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
        innerGrad.addColorStop(1, 'rgba(0,0,0,0.30)');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.roundRect(bx + 8, by + 8, binW - 16, binH - 16, cornerR - 4);
        ctx.fill();

        ctx.save();
        ctx.globalAlpha = 0.2;
        const topShine = ctx.createLinearGradient(bx, by, bx, by + binH * 0.3);
        topShine.addColorStop(0, 'rgba(255,255,255,0.6)');
        topShine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = topShine;
        ctx.beginPath();
        ctx.roundRect(bx + 2, by + 2, binW - 4, binH * 0.3, cornerR);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = bin.glow ? bin.color : '#5A3E22';
        ctx.lineWidth = bin.glow ? 4 : 3;
        ctx.beginPath();
        ctx.roundRect(bx, by, binW, binH, cornerR);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(200, 160, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx + 4, by + 4, binW - 8, binH - 8, cornerR - 2);
        ctx.stroke();

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.font = 'bold 44px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bin.icon, binCanvas.x, binCanvas.y - 12);
        ctx.restore();

        ctx.save();
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(255, 220, 160, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeText(bin.label, binCanvas.x, binCanvas.y + 28);
        ctx.fillStyle = 'rgba(255, 240, 210, 0.9)';
        ctx.fillText(bin.label, binCanvas.x, binCanvas.y + 28);
        ctx.restore();
    });

    currentStage.items.forEach(obj => {
        const objCanvas = normalizedToCanvas({ x: obj.x, y: obj.y }, width, height);
        const objW = obj.width * width;
        const objH = obj.height * height;
        const baseScale = obj.grabbed ? 1.2 : obj.placed ? 0.95 : 1.0 + Math.sin(obj.pulse) * 0.06;
        const r = Math.min(objW, objH) * 0.5 * baseScale;
        const cx = objCanvas.x;
        const cy = objCanvas.y;

        ctx.save();

        ctx.save();
        ctx.globalAlpha = obj.grabbed ? 0.15 : 0.3;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(cx + 3, cy + r * 0.8, r * 0.6, r * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const bodyGrad = ctx.createRadialGradient(
            cx - r * 0.25, cy - r * 0.25, r * 0.05,
            cx + r * 0.05, cy + r * 0.05, r
        );
        bodyGrad.addColorStop(0, obj.color + 'FF');
        bodyGrad.addColorStop(0.4, obj.color + 'EE');
        bodyGrad.addColorStop(0.75, obj.color + 'BB');
        bodyGrad.addColorStop(1, obj.color + '77');

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        const rimGrad = ctx.createRadialGradient(
            cx + r * 0.3, cy + r * 0.3, r * 0.2,
            cx, cy, r * 1.05
        );
        rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
        rimGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
        rimGrad.addColorStop(1, 'rgba(255,255,255,0.25)');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = rimGrad;
        ctx.fill();

        const specGrad = ctx.createRadialGradient(
            cx - r * 0.3, cy - r * 0.3, 0,
            cx - r * 0.3, cy - r * 0.3, r * 0.5
        );
        specGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
        specGrad.addColorStop(0.4, 'rgba(255,255,255,0.3)');
        specGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = specGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx - r * 0.2, cy - r * 0.25, r * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();

        if (obj.grabbed || obj.placed) {
            ctx.save();
            ctx.shadowColor = obj.grabbed ? '#FFD700' : '#00FF88';
            ctx.shadowBlur = obj.grabbed ? 25 : 18;
            ctx.strokeStyle = obj.grabbed ? '#FFD700' : '#00FF88';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.font = `${Math.round(r * 1.1)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.icon, cx, cy);
        ctx.restore();

        ctx.restore();
    });

    if (filteredPoint) {
        const fingerCanvas = normalizedToCanvas(filteredPoint, width, height);
        
        ctx.beginPath();
        ctx.arc(fingerCanvas.x, fingerCanvas.y, 28, 0, Math.PI * 2);
        ctx.strokeStyle = pinchActive ? '#FFD700' : 'rgba(0, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(fingerCanvas.x, fingerCanvas.y, pinchActive ? 18 : 12, 0, Math.PI * 2);
        ctx.fillStyle = pinchActive ? '#FFD700' : 'rgba(255, 255, 255, 0.9)';
        ctx.shadowColor = pinchActive ? '#FFD700' : '#00FFFF';
        ctx.shadowBlur = pinchActive ? 20 : 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
};

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
