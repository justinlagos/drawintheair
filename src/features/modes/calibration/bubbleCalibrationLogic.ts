/**
 * Bubble Pop Logic - 3 Progressive Levels with Landscape Backgrounds
 * 
 * Timed 30-second rounds with:
 * - Level progression (3 levels)
 * - Progressive difficulty with increasing speed
 * - 3D realistic balloons with depth
 * - Illustrated landscape backgrounds per level
 * - End-of-round modal with auto-advance/retry
 * - Milestone rewards at level goals
 */

import { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { normalizedToCanvas } from '../../../core/coordinateUtils';
import { perf } from '../../../core/perf';
import { trackingFeatures } from '../../../core/trackingFeatures';
import { DifficultyController } from '../../../core/DifficultyController';
import { tactileAudioManager } from '../../../core/TactileAudioManager';
import { LANDSCAPE_BACKGROUNDS, type LandscapeBackground } from './landscapeBackgrounds';
import { renderLandscapeBackground } from './renderLandscape';

// Professional Level 1 background renderer - polished and well-designed
const renderLevel1Background = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timestamp: number
) => {
    // ===========================================
    // BASE: Fill entire canvas first to prevent gaps
    // ===========================================
    ctx.fillStyle = '#4CAF50';  // Green base (matches bottom of hills)
    ctx.fillRect(0, 0, width, height);
    
    // ===========================================
    // LAYER 1: SKY - Professional gradient with depth
    // ===========================================
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.65);  // Extend to 65% for overlap
    skyGradient.addColorStop(0, '#E8F4F8');    // Very light blue-white (zenith)
    skyGradient.addColorStop(0.3, '#D6EBF5');  // Soft sky blue
    skyGradient.addColorStop(0.6, '#B8D9E8');  // Light blue
    skyGradient.addColorStop(1, '#A8D0E0');    // Horizon blue
    
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height * 0.65);  // Fill sky area with overlap
    
    // ===========================================
    // LAYER 2: SUN - Professional sun with realistic glow
    // ===========================================
    const sunX = width * 0.75;
    const sunY = height * 0.2;
    const sunRadius = Math.min(width, height) * 0.06;
    
    // Outer glow layers for realistic sun
    const glowLayers = [
        { radius: sunRadius * 4, alpha: 0.15, color: 'rgba(255, 235, 59, 0.3)' },
        { radius: sunRadius * 3, alpha: 0.25, color: 'rgba(255, 245, 157, 0.4)' },
        { radius: sunRadius * 2, alpha: 0.35, color: 'rgba(255, 249, 196, 0.5)' },
    ];
    
    glowLayers.forEach(layer => {
        const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, layer.radius);
        glow.addColorStop(0, layer.color);
        glow.addColorStop(0.5, layer.color.replace(')', ', 0.2)').replace('rgba', 'rgba'));
        glow.addColorStop(1, 'rgba(255, 245, 157, 0)');
        
        ctx.save();
        ctx.globalAlpha = layer.alpha;
        ctx.beginPath();
        ctx.arc(sunX, sunY, layer.radius, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        ctx.restore();
    });
    
    // Sun core - bright and warm
    const sunCore = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    sunCore.addColorStop(0, '#FFFFFF');      // Pure white center
    sunCore.addColorStop(0.3, '#FFFDE7');    // Warm white
    sunCore.addColorStop(0.7, '#FFF9C4');    // Soft yellow
    sunCore.addColorStop(1, '#FFEB3B');      // Bright yellow edge
    
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = sunCore;
    ctx.fill();
    
    // Sun highlight
    ctx.beginPath();
    ctx.arc(sunX - sunRadius * 0.3, sunY - sunRadius * 0.3, sunRadius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
    
    // ===========================================
    // LAYER 3: PROFESSIONAL CLOUDS - Realistic and fluffy
    // ===========================================
    const drawProfessionalCloud = (x: number, y: number, scale: number, opacity: number = 0.9) => {
        ctx.save();
        ctx.globalAlpha = opacity;
        
        // Create soft cloud using multiple overlapping circles with smooth edges
        const cloudGradient = ctx.createRadialGradient(x + scale * 30, y, 0, x + scale * 30, y, scale * 60);
        cloudGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        cloudGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
        cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        // Main cloud body - larger, smoother circles
        const circles = [
            { x: x, y: y, r: 35 * scale },
            { x: x + 25 * scale, y: y - 10 * scale, r: 40 * scale },
            { x: x + 50 * scale, y: y - 5 * scale, r: 35 * scale },
            { x: x + 70 * scale, y: y, r: 30 * scale },
            { x: x + 30 * scale, y: y + 12 * scale, r: 32 * scale },
            { x: x + 55 * scale, y: y + 15 * scale, r: 28 * scale },
        ];
        
        // Draw with soft edges using composite operation
        ctx.globalCompositeOperation = 'source-over';
        circles.forEach(c => {
            const circleGradient = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
            circleGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            circleGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
            circleGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.fillStyle = circleGradient;
            ctx.fill();
        });
        
        ctx.restore();
    };
    
    // Animate clouds with smooth drifting
    const cloudSpeed = 0.003;
    const cloud1X = ((timestamp * cloudSpeed) % (width + 300)) - 150;
    const cloud2X = ((timestamp * cloudSpeed * 0.7 + width * 0.4) % (width + 300)) - 150;
    const cloud3X = ((timestamp * cloudSpeed * 0.5 + width * 0.7) % (width + 300)) - 150;
    
    drawProfessionalCloud(cloud1X, height * 0.15, 1.3, 0.92);
    drawProfessionalCloud(cloud2X, height * 0.1, 1.0, 0.88);
    drawProfessionalCloud(cloud3X, height * 0.2, 1.1, 0.9);
    
    // ===========================================
    // LAYER 4: DISTANT HILLS - Smooth, professional curves
    // ===========================================
    ctx.save();
    
    // Create smooth hill silhouette using bezier curves
    ctx.beginPath();
    ctx.moveTo(0, height * 0.6);
    
    // Use smooth curves for professional look
    const hillPoints = [
        { x: width * 0.1, y: height * 0.52 },
        { x: width * 0.25, y: height * 0.48 },
        { x: width * 0.4, y: height * 0.5 },
        { x: width * 0.55, y: height * 0.47 },
        { x: width * 0.7, y: height * 0.49 },
        { x: width * 0.85, y: height * 0.51 },
        { x: width, y: height * 0.53 },
    ];
    
    // Draw smooth curves between points
    for (let i = 0; i < hillPoints.length - 1; i++) {
        const current = hillPoints[i];
        const next = hillPoints[i + 1];
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;
        
        if (i === 0) {
            ctx.lineTo(current.x, current.y);
        }
        ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }
    
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    // Professional gradient for hills
    const hillGradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
    hillGradient.addColorStop(0, '#B2DFDB');   // Very light teal-green (distant)
    hillGradient.addColorStop(0.2, '#A5D6A7'); // Soft mint
    hillGradient.addColorStop(0.5, '#81C784'); // Medium green
    hillGradient.addColorStop(0.8, '#66BB6A'); // Fresh green
    hillGradient.addColorStop(1, '#4CAF50');   // Rich grass green
    
    ctx.fillStyle = hillGradient;
    ctx.fill();
    
    // Add subtle texture to hills with soft highlights
    ctx.globalAlpha = 0.2;
    for (let x = 0; x < width; x += 80) {
        const highlightY = height * 0.52 + Math.sin(x * 0.01) * 10;
        const highlightGradient = ctx.createRadialGradient(x, highlightY, 0, x, highlightY, 40);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(x, highlightY, 40, 0, Math.PI * 2);
        ctx.fillStyle = highlightGradient;
        ctx.fill();
    }
    ctx.restore();
    
    // ===========================================
    // LAYER 5: FOREGROUND - Professional grass with depth
    // ===========================================
    ctx.save();
    
    // Subtle grass texture with varying heights
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#388E3C';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    
    for (let x = 0; x < width; x += 12) {
        const grassHeight = 8 + (Math.sin(x * 0.1) * 0.5 + 0.5) * 12;
        const sway = Math.sin(timestamp * 0.0015 + x * 0.08) * 2;
        const variation = Math.sin(x * 0.15) * 1.5;
        
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.quadraticCurveTo(
            x + sway * 0.3 + variation, 
            height - grassHeight * 0.4, 
            x + sway * 0.6 + variation * 0.5, 
            height - grassHeight
        );
        ctx.stroke();
    }
    
    // Add some taller grass blades for variety
    ctx.globalAlpha = 0.2;
    for (let x = 0; x < width; x += 35) {
        const tallGrassHeight = 15 + Math.random() * 10;
        const sway = Math.sin(timestamp * 0.001 + x * 0.1) * 3;
        
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.quadraticCurveTo(x + sway * 0.4, height - tallGrassHeight * 0.5, x + sway * 0.7, height - tallGrassHeight);
        ctx.stroke();
    }
    
    ctx.restore();
    
    // ===========================================
    // LAYER 6: ATMOSPHERIC DEPTH - Subtle vignette
    // ===========================================
    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.8);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
    
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
};

interface Bubble {
    id: number;
    x: number;
    y: number;
    radius: number;
    color: string;
    popping: boolean;
    createdAt: number;
    vx: number;
    vy: number;
    rotation: number;
    float: number;
    z: number; // Depth for 3D effect
}

export type BubbleLevel = 1 | 2 | 3;

interface LevelConfig {
    level: BubbleLevel;
    name: string;
    targetScore: number;           // Bubbles needed to advance
    gameDuration: number;          // Time in milliseconds
    maxBubbles: number;            // Max bubbles on screen
    spawnRate: number;             // ms between spawns
    bubbleSpeed: number;           // Movement speed
    bubbleMinSize: number;         // Normalized (0-1)
    bubbleMaxSize: number;         // Normalized (0-1)
    specialBehavior?: string;      // Level-specific mechanics
    background: LandscapeBackground;
    bubbleColors: string[];
    particleCount: number;
}

const LEVEL_CONFIGS: Record<BubbleLevel, LevelConfig> = {
    1: {
        level: 1,
        name: "Sunny Meadow",
        targetScore: 20,
        gameDuration: 30000,         // 30 seconds
        maxBubbles: 6,               // Even fewer bubbles - less overwhelming
        spawnRate: 1200,             // Much slower spawn (1200ms = 1.2 seconds between bubbles)
        bubbleSpeed: 0.0005,          // Slow but visible movement
        bubbleMinSize: 0.055,        // Larger bubbles (easier to pop)
        bubbleMaxSize: 0.09,         // Larger bubbles (easier to pop)
        specialBehavior: 'float-gentle',
        background: LANDSCAPE_BACKGROUNDS.sunnyMeadow,
        bubbleColors: ['#FF5252', '#FF4081', '#7C4DFF', '#448AFF', '#FFAB40', '#69F0AE', '#FF6E40', '#E040FB'],  // Brighter, more vibrant colors
        particleCount: 12
    },
    2: {
        level: 2,
        name: "Misty Mountains",
        targetScore: 25,
        gameDuration: 30000,
        maxBubbles: 14,
        spawnRate: 350,              // Faster spawn
        bubbleSpeed: 0.0008,         // Medium speed
        bubbleMinSize: 0.04,         // Medium bubbles
        bubbleMaxSize: 0.07,
        specialBehavior: 'drift-wind',
        background: LANDSCAPE_BACKGROUNDS.mistyMountains,
        bubbleColors: ['#FF5722', '#E91E63', '#9C27B0', '#FFEB3B', '#00E676', '#FF1744'],
        particleCount: 16
    },
    3: {
        level: 3,
        name: "Sunset Peaks",
        targetScore: 30,
        gameDuration: 30000,
        maxBubbles: 16,
        spawnRate: 300,              // Fastest spawn
        bubbleSpeed: 0.001,          // Fast movement
        bubbleMinSize: 0.035,        // Smaller bubbles (harder)
        bubbleMaxSize: 0.06,
        specialBehavior: 'zigzag-rise',
        background: LANDSCAPE_BACKGROUNDS.sunsetPeaks,
        bubbleColors: ['#00E5FF', '#00BCD4', '#4DD0E1', '#FFEB3B', '#FFC107', '#FFFFFF'],
        particleCount: 20
    }
};

// Get colors for current level
const getColorsForLevel = (level: BubbleLevel): string[] => {
    return LEVEL_CONFIGS[level].bubbleColors;
};

let bubbles: Bubble[] = [];
let score = 0;
let nextBubbleId = 0;
let lastSpawnTime = 0;
let gameStartTime: number | null = null;
let gameEndTime: number | null = null;
let gameDuration = 30000; // 30 seconds
let milestoneReached = false;
let milestoneCelebrated = false;
let currentLevel: BubbleLevel = 1;

// Difficulty controller instance (lazy initialized)
let difficultyController: DifficultyController | null = null;
let lastDifficultyUpdateTime: number = 0;
let bubbleHits: number = 0;
let bubbleMisses: number = 0;

const getDifficultyController = (): DifficultyController | null => {
    const flags = trackingFeatures.getFlags();
    if (flags.enableDynamicDifficulty) {
        if (!difficultyController) {
            difficultyController = new DifficultyController();
        }
        return difficultyController;
    }
    return null;
};

const spawnBubble = (level: BubbleLevel, onScreen: boolean = false): Bubble => {
    const config = LEVEL_CONFIGS[level];
    const margin = 0.1;
    
    let x, y, vx, vy;
    const baseSpeed = config.bubbleSpeed;
    
    if (onScreen) {
        // Spawn on-screen for immediate visibility
        x = margin + Math.random() * (1 - margin * 2);
        y = margin + Math.random() * (1 - margin * 2);
        // Random gentle movement
        vx = (Math.random() - 0.5) * baseSpeed * 2;
        vy = (Math.random() - 0.5) * baseSpeed * 2;
    } else {
        // Spawn off-screen and move in
        const side = Math.floor(Math.random() * 4);
        
        if (side === 0) { // Top
            x = margin + Math.random() * (1 - margin * 2);
            y = -0.1;
            vx = (Math.random() - 0.5) * baseSpeed * 0.7;
            vy = baseSpeed + Math.random() * baseSpeed * 0.5;
        } else if (side === 1) { // Right
            x = 1.1;
            y = margin + Math.random() * (1 - margin * 2);
            vx = -(baseSpeed + Math.random() * baseSpeed * 0.5);
            vy = (Math.random() - 0.5) * baseSpeed * 0.7;
        } else if (side === 2) { // Bottom
            x = margin + Math.random() * (1 - margin * 2);
            y = 1.1;
            vx = (Math.random() - 0.5) * baseSpeed * 0.7;
            vy = -(baseSpeed + Math.random() * baseSpeed * 0.5);
        } else { // Left
            x = -0.1;
            y = margin + Math.random() * (1 - margin * 2);
            vx = baseSpeed + Math.random() * baseSpeed * 0.5;
            vy = (Math.random() - 0.5) * baseSpeed * 0.7;
        }
    }
    
    // Use level-specific colors
    const colors = getColorsForLevel(currentLevel);
    const levelConfig = LEVEL_CONFIGS[level];
    
    return {
        id: nextBubbleId++,
        x,
        y,
        radius: levelConfig.bubbleMinSize + Math.random() * (levelConfig.bubbleMaxSize - levelConfig.bubbleMinSize),
        color: colors[Math.floor(Math.random() * colors.length)],
        popping: false,
        createdAt: Date.now(),
        vx,
        vy,
        rotation: Math.random() * Math.PI * 2,
        float: Math.random() * Math.PI * 2,
        z: Math.random() * 0.3 + 0.7 // Depth: 0.7 to 1.0
    };
};

export const startBubbleGame = (level: BubbleLevel | undefined = 1) => {
    const actualLevel = Math.min(Math.max(1, level ?? 1), 3) as BubbleLevel;
    currentLevel = actualLevel;
    bubbles = [];
    score = 0;
    nextBubbleId = 0;
    lastSpawnTime = 0;
    gameStartTime = Date.now();
    gameEndTime = null;
    milestoneReached = false;
    milestoneCelebrated = false;
    bubbleHits = 0;
    bubbleMisses = 0;
    
    // Reset difficulty controller if enabled
    const dds = getDifficultyController();
    if (dds) {
        dds.reset();
    }
    
    const config = LEVEL_CONFIGS[actualLevel];
    // Spawn initial bubbles - Level 1 starts with fewer bubbles for gentler start
    // Spawn them ON-SCREEN so they're immediately visible
    const initialCount = actualLevel === 1 ? 3 : Math.min(Math.floor(config.maxBubbles * 0.7), config.maxBubbles - 1);
    for (let i = 0; i < initialCount; i++) {
        bubbles.push(spawnBubble(actualLevel, true)); // true = spawn on-screen
    }
};

export const resetBubbles = () => {
    startBubbleGame(currentLevel);
};

export const getBubbles = () => bubbles;
export const getScore = () => score;
export const getCurrentLevel = () => currentLevel;
export const getTimeRemaining = () => {
    if (!gameStartTime) return gameDuration;
    const elapsed = Date.now() - gameStartTime;
    return Math.max(0, gameDuration - elapsed);
};
export const isGameActive = () => {
    if (!gameStartTime) return false;
    return getTimeRemaining() > 0;
};
export const hasReachedMilestone = () => milestoneReached;
export const hasCelebratedMilestone = () => milestoneCelebrated;
export const setMilestoneCelebrated = () => { milestoneCelebrated = true; };
export const getGameEndTime = () => gameEndTime;
export const getCurrentGoal = () => LEVEL_CONFIGS[currentLevel].targetScore;
export const canAdvanceLevel = () => {
    const currentGoal = LEVEL_CONFIGS[currentLevel].targetScore;
    return score >= currentGoal && currentLevel < 3;
};
export const hasReachedGoal = () => {
    const currentGoal = LEVEL_CONFIGS[currentLevel].targetScore;
    return score >= currentGoal;
};

export const bubbleCalibrationLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null
) => {
    const now = Date.now();
    const { filteredPoint } = frameData;
    let config = LEVEL_CONFIGS[currentLevel];
    
    // Initialize game if not started
    if (gameStartTime === null) {
        startBubbleGame(1 as BubbleLevel);
    }
    
    // Apply dynamic difficulty scaling if enabled
    const flags = trackingFeatures.getFlags();
    let difficultyMultipliers = { speed: 1.0, size: 1.0, spawnRate: 1.0 };
    
    if (flags.enableDynamicDifficulty) {
        const dds = getDifficultyController();
        if (dds) {
            // Update difficulty based on performance
            if (now - lastDifficultyUpdateTime > 1000) {
                const timeRemaining = getTimeRemaining();
                dds.updateBubbleDifficulty(score, timeRemaining, bubbleHits, bubbleMisses);
                lastDifficultyUpdateTime = now;
            }
            
            const params = dds.getParams();
            difficultyMultipliers = {
                speed: params.bubbleSpeed,
                size: params.bubbleSize,
                spawnRate: params.spawnRate
            };
            
            // Apply multipliers to config (create modified config)
            config = {
                ...config,
                bubbleSpeed: config.bubbleSpeed * difficultyMultipliers.speed,
                spawnRate: config.spawnRate / difficultyMultipliers.spawnRate, // Lower spawnRate = faster spawn
            };
        }
    }
    
    // Update tactile audio if enabled
    if (flags.enableTactileAudio) {
        tactileAudioManager.updatePinchState(frameData.pinchActive);
        if (filteredPoint) {
            tactileAudioManager.updateMovement(filteredPoint, frameData.timestamp);
        }
    }

    const timeRemaining = getTimeRemaining();
    const isActive = isGameActive();

    // Render level-specific landscape background
    const levelConfig = LEVEL_CONFIGS[currentLevel];
    renderLandscapeBackground(ctx, levelConfig.background, width, height, now);

    // Update bubble positions and animations with level-specific behaviors
    bubbles.forEach(bubble => {
        if (!bubble.popping && isActive) {
            // Apply DDS speed multiplier if enabled
            const speedMultiplier = flags.enableDynamicDifficulty ? difficultyMultipliers.speed : 1.0;
            
            // Level-specific movement behaviors
            const behavior = config.specialBehavior || 'float-gentle';
            switch (behavior) {
                case 'float-gentle':
                    // Level 1: Gentle floating, mostly upward
                    bubble.vy -= 0.0001 * (now - bubble.createdAt) * 0.001;
                    bubble.vx += Math.sin(now * 0.001 + bubble.id) * 0.00001;
                    bubble.float += 0.008;
                    break;
                case 'drift-wind':
                    // Level 2: Wind effect, horizontal drift
                    bubble.vx += 0.00005 * (now - bubble.createdAt) * 0.001;
                    bubble.vy += Math.sin(now * 0.002 + bubble.id * 0.5) * 0.00002;
                    bubble.float += 0.008;
                    break;
                case 'zigzag-rise':
                    // Level 3: Zigzag pattern, faster and more erratic
                    bubble.vy -= 0.00015 * (now - bubble.createdAt) * 0.001;
                    bubble.vx = Math.sin(now * 0.005 + bubble.id * 2) * 0.001;
                    bubble.float += 0.008;
                    bubble.rotation += 0.02;
                    break;
            }
            
            bubble.x += bubble.vx * speedMultiplier;
            bubble.y += bubble.vy * speedMultiplier;
            bubble.rotation += 0.003;
            
            // Remove if off-screen
            if (bubble.x < -0.2 || bubble.x > 1.2 || bubble.y < -0.2 || bubble.y > 1.2) {
                bubble.popping = true;
                bubble.createdAt = now;
            }
        }
    });

    // Spawn new bubbles periodically
    if (isActive && now - lastSpawnTime > config.spawnRate && 
        bubbles.filter(b => !b.popping).length < config.maxBubbles) {
        // Alternate between on-screen and off-screen spawns for variety
        const spawnOnScreen = bubbles.filter(b => !b.popping).length < 2;
        bubbles.push(spawnBubble(currentLevel, spawnOnScreen));
        lastSpawnTime = now;
    }

    // Remove old popping bubbles
    bubbles = bubbles.filter(b => !b.popping || now - b.createdAt < 400);

    // Check milestone (level-based goal)
    const currentGoal = config.targetScore;
    if (score >= currentGoal && !milestoneReached) {
        milestoneReached = true;
    }

    // End game if time expired
    if (isActive && timeRemaining <= 0 && gameEndTime === null) {
        gameEndTime = now;
    }

    // Helper functions for color manipulation
    const lightenColor = (hex: string, percent: number): string => {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    };

    const darkenColor = (hex: string, percent: number): string => {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    };

    // Draw bubbles with enhanced 3D realistic balloon effect
    bubbles.forEach(bubble => {
        const canvasPoint = normalizedToCanvas({ x: bubble.x, y: bubble.y }, width, height);
        let baseRadius = bubble.radius * Math.min(width, height);
        
        // Apply DDS size multiplier if enabled
        if (flags.enableDynamicDifficulty) {
            baseRadius *= difficultyMultipliers.size;
        }
        
        const r = baseRadius * bubble.z; // Scale by depth
        const floatOffset = Math.sin(bubble.float) * 4; // Gentle floating

        if (bubble.popping) {
            // Enhanced pop effect with level-specific particles
            const age = now - bubble.createdAt;
            const scale = 1 + age / 80;
            const alpha = Math.max(0, 1 - age / 400);

            // Main pop burst
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y + floatOffset, r * scale, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`;
            ctx.fill();

            // Enhanced sparkles with level-specific count and effects
            // Reduce particles on low tier
            const particleCount = perfConfig.visualQuality === 'low' 
                ? Math.floor(config.particleCount * 0.6)
                : config.particleCount;
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2 + age / 40;
                const dist = r * (1 + age / 80) * (currentLevel >= 2 ? 1.2 : 1);
                const sx = canvasPoint.x + Math.cos(angle) * dist;
                const sy = canvasPoint.y + floatOffset + Math.sin(angle) * dist;
                const particleSize = (currentLevel >= 2 ? 8 : 7) * alpha;

                // Level 3 gets extra glow on particles (skip on low tier)
                if (currentLevel === 3 && perfConfig.visualQuality === 'high') {
                    ctx.save();
                    ctx.globalAlpha = alpha * 0.5;
                    ctx.beginPath();
                    ctx.arc(sx, sy, particleSize * 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = bubble.color;
                    ctx.fill();
                    ctx.restore();
                }

                ctx.beginPath();
                ctx.arc(sx, sy, particleSize, 0, Math.PI * 2);
                ctx.fillStyle = bubble.color;
                ctx.fill();
            }
        } else {
            // Enhanced realistic balloon rendering with high contrast
            const depthScale = bubble.z;
            const baseColor = bubble.color;
            const lightColor = lightenColor(baseColor, 40);  // +40% lighter
            const darkColor = darkenColor(baseColor, 30);    // -30% darker
            const isLevel1 = currentLevel === 1;
            
            // 1. SHADOW - Lighter for Level 1, normal for other levels
            ctx.save();
            if (isLevel1) {
                // Level 1: Much lighter shadow (0.15 opacity)
                ctx.globalAlpha = 0.15 * depthScale;
            } else {
                // Other levels: Normal shadow
                ctx.globalAlpha = perfConfig.visualQuality === 'high' ? 0.4 * depthScale : 0.3 * depthScale;
            }
            ctx.beginPath();
            ctx.ellipse(
                canvasPoint.x + r * 0.15,
                canvasPoint.y + floatOffset + r * 0.15,
                r * 0.9,
                r * 0.7,
                0, 0, Math.PI * 2
            );
            ctx.fillStyle = isLevel1 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.4)';
            ctx.fill();
            ctx.restore();

            // 2. MAIN BALLOON BODY - Brighter gradient for Level 1
            const mainGradient = ctx.createRadialGradient(
                canvasPoint.x - r * 0.3,  // Offset highlight
                canvasPoint.y - r * 0.3 + floatOffset,
                r * 0.1,      // Inner radius (highlight)
                canvasPoint.x,
                canvasPoint.y + floatOffset,
                r             // Outer radius
            );
            
            if (isLevel1) {
                // Level 1: Brighter, more vibrant gradient
                mainGradient.addColorStop(0, '#FFFFFF');              // Pure white highlight
                mainGradient.addColorStop(0.2, lightenColor(baseColor, 30));  // Very light color
                mainGradient.addColorStop(0.6, baseColor);            // Main color
                mainGradient.addColorStop(1, darkenColor(baseColor, 15));    // Less dark edge
            } else {
                // Other levels: Normal gradient
                mainGradient.addColorStop(0, lightColor);        // Bright highlight
                mainGradient.addColorStop(0.3, baseColor);       // Main color
                mainGradient.addColorStop(0.7, baseColor);       // Main color
                mainGradient.addColorStop(1, darkColor);         // Shadow edge
            }
            
            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y + floatOffset, r, 0, Math.PI * 2);
            ctx.fillStyle = mainGradient;
            ctx.fill();
            
            // 3. BORDER - Thinner for Level 1, normal for others
            ctx.strokeStyle = isLevel1 ? darkenColor(baseColor, 10) : darkenColor(baseColor, 20);
            ctx.lineWidth = isLevel1 ? Math.max(1.5, r * 0.04) : Math.max(2, r * 0.08);
            ctx.stroke();
            
            // 4. GLOSSY HIGHLIGHT - Bigger and brighter for Level 1
            const highlightGradient = ctx.createRadialGradient(
                canvasPoint.x - r * 0.35,
                canvasPoint.y - r * 0.35 + floatOffset,
                0,
                canvasPoint.x - r * 0.35,
                canvasPoint.y - r * 0.35 + floatOffset,
                r * (isLevel1 ? 0.5 : 0.4)  // Bigger highlight for Level 1
            );
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');    // Brighter for Level 1
            highlightGradient.addColorStop(0.5, isLevel1 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.4)');
            highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.beginPath();
            ctx.arc(
                canvasPoint.x - r * 0.35,
                canvasPoint.y - r * 0.35 + floatOffset,
                r * (isLevel1 ? 0.5 : 0.45),  // Bigger highlight area for Level 1
                0, Math.PI * 2
            );
            ctx.fillStyle = highlightGradient;
            ctx.fill();
            
            // 5. SECONDARY HIGHLIGHT - Small bright dot
            ctx.beginPath();
            ctx.arc(
                canvasPoint.x - r * 0.25,
                canvasPoint.y - r * 0.25 + floatOffset,
                r * 0.12,
                0, Math.PI * 2
            );
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill();
            
            // 6. OUTER GLOW - Makes balloon stand out (enhanced for all levels)
            if (perfConfig.visualQuality !== 'low') {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.shadowColor = baseColor;
                ctx.shadowBlur = r * 0.5;
                ctx.beginPath();
                ctx.arc(canvasPoint.x, canvasPoint.y + floatOffset, r * 0.95, 0, Math.PI * 2);
                ctx.strokeStyle = baseColor;
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.restore();
            }
        }
    });

    // Check for hand collision using filtered point
    if (filteredPoint && isActive) {
        const fingerCanvas = normalizedToCanvas(filteredPoint, width, height);

        // Draw finger indicator
        ctx.beginPath();
        ctx.arc(fingerCanvas.x, fingerCanvas.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Check collision with each bubble
        bubbles.forEach(bubble => {
            if (bubble.popping) return;

            const bubbleCanvas = normalizedToCanvas({ x: bubble.x, y: bubble.y }, width, height);
            const floatOffset = Math.sin(bubble.float) * 4;
            const baseRadius = bubble.radius * Math.min(width, height);
            const r = baseRadius * bubble.z;
            
            const dx = fingerCanvas.x - bubbleCanvas.x;
            const dy = fingerCanvas.y - (bubbleCanvas.y + floatOffset);
            const dist = Math.hypot(dx, dy);

            // More forgiving pop radius (1.4x instead of 1.3x)
            // Apply DDS size multiplier to pop radius for consistency
            const popRadiusMultiplier = flags.enableDynamicDifficulty ? difficultyMultipliers.size : 1.0;
            const effectivePopRadius = r * 1.4 * popRadiusMultiplier;
            
            if (dist < effectivePopRadius) {
                bubble.popping = true;
                bubble.createdAt = now;
                score++;
                bubbleHits++;
                
                // Play success audio if enabled
                if (flags.enableTactileAudio) {
                    tactileAudioManager.playSuccess('bubble');
                }
            } else {
                // Track near misses for difficulty adjustment
                if (dist < effectivePopRadius * 1.5) {
                    bubbleMisses++;
                }
            }
        });
    }
};
