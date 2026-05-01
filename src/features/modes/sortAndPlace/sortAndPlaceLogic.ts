import { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { normalizedToCanvas } from '../../../core/coordinateUtils';
import { OneEuroFilter2D } from '../../../core/filters/OneEuroFilter';
import { trackingFeatures } from '../../../core/trackingFeatures';
import { tactileAudioManager } from '../../../core/TactileAudioManager';
import { isCountdownActive } from '../../../core/countdownService';
import { pilotAnalytics } from '../../../lib/pilotAnalytics';
import {
    getKidIconSprite,
    isKidIconReady,
    hasKidIcon,
    preloadKidIcons,
} from '../../../components/kid-ui/kidIcons';

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
        // Colors level
        'color.red': '#EF4444',
        'color.blue': '#3B82F6',
        'color.green': '#22C55E',
        'color.yellow': '#EAB308',
        'color.orange': '#F97316',
        'color.purple': '#A855F7',
        'color.pink': '#EC4899',
        'color.white': '#F1F5F9',
        // Shapes level
        'shape.circle': '#6C47FF',
        'shape.square': '#FF6B6B',
        'shape.triangle': '#4ECDC4',
        'shape.star': '#FFD700',
        'shape.heart': '#F43F5E',
        'shape.diamond': '#8B5CF6',
        'shape.oval': '#06B6D4',
        'shape.rectangle': '#F59E0B',
        // Letters level
        'letter.a': '#F43F5E', 'letter.e': '#EC4899',
        'letter.i': '#F97316', 'letter.o': '#EAB308',
        'letter.u': '#22C55E', 'letter.b': '#3B82F6',
        'letter.c': '#6C47FF', 'letter.d': '#8B5CF6',
        // Numbers level
        'number.1': '#EF4444', 'number.2': '#F97316',
        'number.3': '#EAB308', 'number.4': '#22C55E',
        'number.5': '#3B82F6', 'number.6': '#6C47FF',
        'number.7': '#A855F7', 'number.8': '#EC4899',
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
        // Colors
        'color.red': '🔴', 'color.blue': '🔵',
        'color.green': '🟢', 'color.yellow': '🟡',
        'color.orange': '🟠', 'color.purple': '🟣',
        'color.pink': '🩷', 'color.white': '⬜',
        // Shapes
        'shape.circle': '⭕', 'shape.square': '⬛',
        'shape.triangle': '🔺', 'shape.star': '⭐',
        'shape.heart': '❤️', 'shape.diamond': '💎',
        'shape.oval': '🥚', 'shape.rectangle': '▬',
        // Letters (vowels vs consonants)
        'letter.a': '🅰️', 'letter.e': '📧',
        'letter.i': '🆔', 'letter.o': '⭕',
        'letter.u': '☂️', 'letter.b': '🅱️',
        'letter.c': '🌙', 'letter.d': '🦆',
        // Numbers (odd vs even)
        'number.1': '1️⃣', 'number.2': '2️⃣',
        'number.3': '3️⃣', 'number.4': '4️⃣',
        'number.5': '5️⃣', 'number.6': '6️⃣',
        'number.7': '7️⃣', 'number.8': '8️⃣',
    };
    return iconMap[key] || '📦';
}

export const STAGE_TEMPLATES: StageTemplate[] = [
    // ── Starter Pack (existing stages) ──────────────────────────────────────
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
    },
    // ── Level 1: Colours ────────────────────────────────────────────────────
    {
        id: 'colors-sort',
        title: 'Warm Colours vs Cool Colours',
        instruction: 'Sort the colours — warm on the left, cool on the right!',
        bins: {
            left: { id: 'warm', label: 'Warm', icon: '🔆', color: '#F97316' },
            right: { id: 'cool', label: 'Cool', icon: '❄️', color: '#3B82F6' }
        },
        items: [
            { key: 'color.red', binId: 'warm', label: 'Red' },
            { key: 'color.orange', binId: 'warm', label: 'Orange' },
            { key: 'color.yellow', binId: 'warm', label: 'Yellow' },
            { key: 'color.pink', binId: 'warm', label: 'Pink' },
            { key: 'color.blue', binId: 'cool', label: 'Blue' },
            { key: 'color.green', binId: 'cool', label: 'Green' },
            { key: 'color.purple', binId: 'cool', label: 'Purple' },
            { key: 'color.white', binId: 'cool', label: 'White' }
        ]
    },
    // ── Level 2: Shapes ─────────────────────────────────────────────────────
    {
        id: 'shapes-sort',
        title: 'Curved vs Straight Shapes',
        instruction: 'Sort shapes — curved on the left, straight edges on the right!',
        bins: {
            left: { id: 'curved', label: 'Curved', icon: '⭕', color: '#6C47FF' },
            right: { id: 'straight', label: 'Straight', icon: '⬛', color: '#FF6B6B' }
        },
        items: [
            { key: 'shape.circle', binId: 'curved', label: 'Circle' },
            { key: 'shape.oval', binId: 'curved', label: 'Oval' },
            { key: 'shape.heart', binId: 'curved', label: 'Heart' },
            { key: 'shape.diamond', binId: 'curved', label: 'Diamond' },
            { key: 'shape.square', binId: 'straight', label: 'Square' },
            { key: 'shape.triangle', binId: 'straight', label: 'Triangle' },
            { key: 'shape.star', binId: 'straight', label: 'Star' },
            { key: 'shape.rectangle', binId: 'straight', label: 'Rectangle' }
        ]
    },
    // ── Level 3: Letters ────────────────────────────────────────────────────
    {
        id: 'letters-sort',
        title: 'Vowels vs Consonants',
        instruction: 'Is it a vowel (A E I O U) or a consonant?',
        bins: {
            left: { id: 'vowels', label: 'Vowels', icon: '🅰️', color: '#F43F5E' },
            right: { id: 'consonants', label: 'Consonants', icon: '🅱️', color: '#3B82F6' }
        },
        items: [
            { key: 'letter.a', binId: 'vowels', label: 'A' },
            { key: 'letter.e', binId: 'vowels', label: 'E' },
            { key: 'letter.i', binId: 'vowels', label: 'I' },
            { key: 'letter.o', binId: 'vowels', label: 'O' },
            { key: 'letter.b', binId: 'consonants', label: 'B' },
            { key: 'letter.c', binId: 'consonants', label: 'C' },
            { key: 'letter.d', binId: 'consonants', label: 'D' },
            { key: 'letter.u', binId: 'vowels', label: 'U' }
        ]
    },
    // ── Level 4: Numbers ────────────────────────────────────────────────────
    {
        id: 'numbers-sort',
        title: 'Odd vs Even Numbers',
        instruction: 'Sort numbers — odd on the left, even on the right!',
        bins: {
            left: { id: 'odd', label: 'Odd', icon: '1️⃣', color: '#A855F7' },
            right: { id: 'even', label: 'Even', icon: '2️⃣', color: '#22C55E' }
        },
        items: [
            { key: 'number.1', binId: 'odd', label: '1' },
            { key: 'number.3', binId: 'odd', label: '3' },
            { key: 'number.5', binId: 'odd', label: '5' },
            { key: 'number.7', binId: 'odd', label: '7' },
            { key: 'number.2', binId: 'even', label: '2' },
            { key: 'number.4', binId: 'even', label: '4' },
            { key: 'number.6', binId: 'even', label: '6' },
            { key: 'number.8', binId: 'even', label: '8' }
        ]
    },
];

// ── Level Progression ────────────────────────────────────────────────────────
// Ordered sequence of stages for the level progression UI.
// Difficulty curve: visual → categorical → cognitive.
//   1 Colours        — direct visual sort (warm vs cool)
//   2 Shapes         — visual classification (curved vs straight)
//   3 Foods & Toys   — first categorical sort (food vs toys)
//   4 Animals & Vehicles — categorical sort with more variety
//   5 Recycle & Trash — categorical sort with abstract concept
//   6 Letters        — symbolic / cognitive (vowel vs consonant)
//   7 Numbers        — symbolic / cognitive (odd vs even)
export const LEVEL_ORDER: string[] = [
    'colors-sort',
    'shapes-sort',
    'food-vs-toys',
    'animals-vs-vehicles',
    'recycle-vs-trash',
    'letters-sort',
    'numbers-sort',
];

export const LEVEL_LABELS: Record<string, string> = {
    'colors-sort': 'Level 1 — Colours',
    'shapes-sort': 'Level 2 — Shapes',
    'food-vs-toys': 'Level 3 — Foods & Toys',
    'animals-vs-vehicles': 'Level 4 — Animals & Vehicles',
    'recycle-vs-trash': 'Level 5 — Recycle & Trash',
    'letters-sort': 'Level 6 — Letters',
    'numbers-sort': 'Level 7 — Numbers',
};

let _currentLevelIndex = 0; // tracks which LEVEL_ORDER stage we're on

export function getCurrentLevel(): number { return _currentLevelIndex + 1; }
export function getTotalLevels(): number { return LEVEL_ORDER.length; }
export function getCurrentLevelLabel(): string {
    return LEVEL_LABELS[LEVEL_ORDER[_currentLevelIndex]] ?? `Level ${_currentLevelIndex + 1}`;
}

export function startLevel(levelIndex: number) {
    _currentLevelIndex = Math.min(Math.max(0, levelIndex), LEVEL_ORDER.length - 1);
    const templateId = LEVEL_ORDER[_currentLevelIndex];
    const idx = STAGE_TEMPLATES.findIndex(t => t.id === templateId);
    if (idx !== -1) startStage(idx);
}

export function advanceLevel(): boolean {
    if (_currentLevelIndex < LEVEL_ORDER.length - 1) {
        _currentLevelIndex++;
        const templateId = LEVEL_ORDER[_currentLevelIndex];
        const idx = STAGE_TEMPLATES.findIndex(t => t.id === templateId);
        if (idx !== -1) startStage(idx);
        return true;
    }
    return false; // all levels complete
}

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

    // Eager-preload sprite illustrations for the active stage so the first
    // few frames don't have to fall back to the colour-only ball render.
    preloadKidIcons(currentStage.items.map(it => ({ key: it.key, color: it.color })));
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
        pilotAnalytics.logEvent('item_dropped', { gameId: 'sortAndPlace', stageId: currentStage.id, itemKey: itemId, itemInstanceId: obj.id, isCorrect: false });
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

        pilotAnalytics.logEvent('item_dropped', { gameId: 'sortAndPlace', stageId: currentStage.id, itemKey: itemId, itemInstanceId: obj.id, binId: dropBinId || undefined, isCorrect: true });

        return;
    } else {
        obj.vx = (obj.x - x) * 0.015;
        obj.vy = (obj.y - y) * 0.015;
        obj.grabbed = false;

        pilotAnalytics.logEvent('item_dropped', { gameId: 'sortAndPlace', stageId: currentStage.id, itemKey: itemId, itemInstanceId: obj.id, binId: dropBinId || undefined, isCorrect: false });

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
                if (currentStage) {
                    pilotAnalytics.logEvent('item_grabbed', { gameId: 'sortAndPlace', stageId: currentStage.id, itemKey: nearest.key, itemInstanceId: nearest.id });
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

                        pilotAnalytics.logEvent('item_dropped', { gameId: 'sortAndPlace', stageId: currentStage.id, itemKey: grabbed.key, itemInstanceId: grabbed.id, binId: bin.id, isCorrect: true });
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

        pilotAnalytics.logEvent('stage_completed', { gameId: 'sortAndPlace', stageId: currentStage.id });
    }

    if (!currentStage) return;

    [currentStage.bins.left, currentStage.bins.right].forEach(bin => {
        const binCanvas = normalizedToCanvas({ x: bin.x, y: bin.y }, width, height);
        const binW = bin.width * width;
        const binH = bin.height * height;
        const bx = binCanvas.x - binW / 2;
        const by = binCanvas.y - binH / 2;
        const cornerR = 28;

        // ─── Bright Kid-UI drop zone ─────────────────────────────────────
        // Cream card-stock surface with a soft accent border tinted by the
        // bin's themed colour. Replaces the old wood-grain treatment.

        // Soft glow halo when hovered with a correct item.
        if (bin.glow) {
            ctx.save();
            ctx.shadowColor = bin.color;
            ctx.shadowBlur = 36;
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = bin.color;
            ctx.beginPath();
            ctx.roundRect(bx - 6, by - 6, binW + 12, binH + 12, cornerR + 6);
            ctx.fill();
            ctx.restore();
        }

        // Tactile drop shadow underneath.
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#6C3FA4';
        ctx.beginPath();
        ctx.ellipse(binCanvas.x, by + binH + 10, binW * 0.42, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Card-stock surface — cream-white with a subtle vertical gradient
        // for soft 2.5D feel (top is brighter, bottom slightly tinted).
        const cardGrad = ctx.createLinearGradient(bx, by, bx, by + binH);
        cardGrad.addColorStop(0, '#FFFFFF');
        cardGrad.addColorStop(0.6, '#FBFCFF');
        cardGrad.addColorStop(1, '#EFF4FA');
        ctx.fillStyle = cardGrad;
        ctx.beginPath();
        ctx.roundRect(bx, by, binW, binH, cornerR);
        ctx.fill();

        // Top inner highlight — pillowy "lit from above" hint.
        ctx.save();
        ctx.globalAlpha = 0.7;
        const topShine = ctx.createLinearGradient(bx, by, bx, by + binH * 0.4);
        topShine.addColorStop(0, 'rgba(255,255,255,0.95)');
        topShine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = topShine;
        ctx.beginPath();
        ctx.roundRect(bx + 3, by + 3, binW - 6, binH * 0.4, cornerR - 2);
        ctx.fill();
        ctx.restore();

        // Outer border — accent colour when glowing, deep plum at rest.
        ctx.strokeStyle = bin.glow ? bin.color : '#6C3FA4';
        ctx.globalAlpha = bin.glow ? 1 : 0.18;
        ctx.lineWidth = bin.glow ? 5 : 3;
        ctx.beginPath();
        ctx.roundRect(bx, by, binW, binH, cornerR);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Bin label — Fredoka, charcoal, large and friendly. The legacy
        // emoji icon (bin.icon) is intentionally not rendered here; the
        // label alone reads cleanly. Phase 2 swaps icon emojis for SVG.
        ctx.save();
        ctx.font = `700 ${Math.max(22, Math.round(binH * 0.32))}px Fredoka, "Baloo 2", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#3F4052';
        ctx.fillText(bin.label, binCanvas.x, binCanvas.y);
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

        // Drop shadow underneath — sells the 2.5D depth regardless of sprite/ball.
        ctx.save();
        ctx.globalAlpha = obj.grabbed ? 0.18 : 0.32;
        ctx.fillStyle = 'rgba(40, 30, 80, 0.55)';
        ctx.beginPath();
        ctx.ellipse(cx + 3, cy + r * 0.85, r * 0.7, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Try to draw a bespoke SVG illustration for this item key. If the
        // sprite is registered AND parsed, use it. Otherwise fall back to
        // the glossy coloured ball (still a clean 2.5D look).
        const sprite = hasKidIcon(obj.key) ? getKidIconSprite(obj.key, obj.color) : null;
        if (sprite && isKidIconReady(sprite)) {
            // Match aspect ratio: scale the longer dimension to match 2*r,
            // preserve the sprite's intrinsic proportions.
            const aspect = sprite.naturalWidth / sprite.naturalHeight;
            const drawW = aspect >= 1 ? 2 * r : 2 * r * aspect;
            const drawH = aspect >= 1 ? 2 * r / aspect : 2 * r;
            ctx.drawImage(sprite, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
        } else {
            // Glossy coloured ball fallback (used for color.*, food.*, etc.
            // until those sprite categories land in Phase 3).
            const bodyGrad = ctx.createRadialGradient(
                cx - r * 0.25, cy - r * 0.25, r * 0.05,
                cx + r * 0.05, cy + r * 0.05, r,
            );
            bodyGrad.addColorStop(0, obj.color + 'FF');
            bodyGrad.addColorStop(0.4, obj.color + 'EE');
            bodyGrad.addColorStop(0.75, obj.color + 'BB');
            bodyGrad.addColorStop(1, obj.color + '88');

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = bodyGrad;
            ctx.fill();

            const specGrad = ctx.createRadialGradient(
                cx - r * 0.3, cy - r * 0.3, 0,
                cx - r * 0.3, cy - r * 0.3, r * 0.5,
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

            ctx.strokeStyle = 'rgba(20, 15, 40, 0.18)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Selection / placement highlight ring — drawn on top of either
        // the sprite or the ball so it's always visible.
        if (obj.grabbed || obj.placed) {
            ctx.save();
            ctx.shadowColor = obj.grabbed ? '#FFD84D' : '#7ED957';
            ctx.shadowBlur = obj.grabbed ? 22 : 16;
            ctx.strokeStyle = obj.grabbed ? '#FFD84D' : '#7ED957';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

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
    CanvasRenderingContext2D.prototype.roundRect = function (x: number, y: number, w: number, h: number, r: number) {
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
