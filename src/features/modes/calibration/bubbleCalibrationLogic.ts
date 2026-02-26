/**
 * Bubble Pop Logic - 6 Progressive Levels with Landscape Backgrounds
 * 
 * Timed 30-second rounds with:
 * - Level progression (6 levels)
 * - Progressive difficulty with increasing speed
 * - 3D realistic balloons with depth
 * - Illustrated landscape backgrounds per level
 * - End-of-round modal with auto-advance/retry
 * - Milestone rewards at level goals
 * - Kid-friendly gameplay with forgiving hit detection
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
    lastPopAttempt?: number; // Timestamp of last pop attempt to prevent double pops
}

export type BubbleLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface LevelConfig {
    level: BubbleLevel;
    name: string;
    targetScore: number;           // Bubbles needed to advance
    gameDuration: number;          // Time in milliseconds
    maxBubbles: number;            // Max bubbles on screen
    minOnScreenBubbles: number;   // Minimum bubbles to maintain on screen
    spawnRate: number;             // ms between spawns
    bubbleSpeed: number;           // Movement speed (normalized per second)
    driftSpeed: number;            // Drift speed (normalized per second)
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
        targetScore: 12,
        gameDuration: 30000,         // 30 seconds
        maxBubbles: 16,
        minOnScreenBubbles: 8,
        spawnRate: 300,
        bubbleSpeed: 0.10,           // Kid-friendly: 10% of canvas per second
        driftSpeed: 0.20,             // Drift speed
        bubbleMinSize: 0.05,         // Big bubbles for easy targeting
        bubbleMaxSize: 0.085,
        specialBehavior: 'float-gentle',
        background: LANDSCAPE_BACKGROUNDS.sunnyMeadow,
        bubbleColors: ['#FF5252', '#FF4081', '#7C4DFF', '#448AFF', '#FFAB40', '#69F0AE', '#FF6E40', '#E040FB'],
        particleCount: 12
    },
    2: {
        level: 2,
        name: "Misty Mountains",
        targetScore: 14,
        gameDuration: 30000,
        maxBubbles: 18,
        minOnScreenBubbles: 9,
        spawnRate: 300,
        bubbleSpeed: 0.12,            // Slightly faster
        driftSpeed: 0.22,
        bubbleMinSize: 0.045,        // Slightly smaller
        bubbleMaxSize: 0.08,
        specialBehavior: 'drift-wind',
        background: LANDSCAPE_BACKGROUNDS.mistyMountains,
        bubbleColors: ['#FF5722', '#E91E63', '#9C27B0', '#FFEB3B', '#00E676', '#FF1744'],
        particleCount: 16
    },
    3: {
        level: 3,
        name: "Sunset Peaks",
        targetScore: 16,
        gameDuration: 30000,
        maxBubbles: 20,
        minOnScreenBubbles: 10,
        spawnRate: 280,
        bubbleSpeed: 0.14,
        driftSpeed: 0.24,
        bubbleMinSize: 0.04,
        bubbleMaxSize: 0.075,
        specialBehavior: 'zigzag-rise',
        background: LANDSCAPE_BACKGROUNDS.sunsetPeaks,
        bubbleColors: ['#00E5FF', '#00BCD4', '#4DD0E1', '#FFEB3B', '#FFC107', '#FFFFFF'],
        particleCount: 20
    },
    4: {
        level: 4,
        name: "Sunny Meadow",
        targetScore: 18,
        gameDuration: 30000,
        maxBubbles: 22,
        minOnScreenBubbles: 11,
        spawnRate: 280,
        bubbleSpeed: 0.16,
        driftSpeed: 0.26,
        bubbleMinSize: 0.038,
        bubbleMaxSize: 0.07,
        specialBehavior: 'float-gentle',
        background: LANDSCAPE_BACKGROUNDS.sunnyMeadow,
        bubbleColors: ['#FF5252', '#FF4081', '#7C4DFF', '#448AFF', '#FFAB40', '#69F0AE', '#FF6E40', '#E040FB'],
        particleCount: 18
    },
    5: {
        level: 5,
        name: "Misty Mountains",
        targetScore: 20,
        gameDuration: 30000,
        maxBubbles: 24,
        minOnScreenBubbles: 12,
        spawnRate: 260,
        bubbleSpeed: 0.18,
        driftSpeed: 0.28,
        bubbleMinSize: 0.035,
        bubbleMaxSize: 0.065,
        specialBehavior: 'drift-wind',
        background: LANDSCAPE_BACKGROUNDS.mistyMountains,
        bubbleColors: ['#FF5722', '#E91E63', '#9C27B0', '#FFEB3B', '#00E676', '#FF1744'],
        particleCount: 20
    },
    6: {
        level: 6,
        name: "Sunset Peaks",
        targetScore: 22,
        gameDuration: 30000,
        maxBubbles: 26,
        minOnScreenBubbles: 13,
        spawnRate: 250,
        bubbleSpeed: 0.20,
        driftSpeed: 0.30,
        bubbleMinSize: 0.032,
        bubbleMaxSize: 0.06,
        specialBehavior: 'zigzag-rise',
        background: LANDSCAPE_BACKGROUNDS.sunsetPeaks,
        bubbleColors: ['#00E5FF', '#00BCD4', '#4DD0E1', '#FFEB3B', '#FFC107', '#FFFFFF'],
        particleCount: 22
    }
};

// Calculate MAX_LEVEL from config keys
export const MAX_LEVEL = Math.max(...Object.keys(LEVEL_CONFIGS).map(Number)) as BubbleLevel;

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
    // Convert speed from "per second" to "per frame" (assuming ~60fps)
    // bubbleSpeed is normalized (0-1), so 0.10 = 10% of canvas per second
    // Per frame: 0.10 / 60 ≈ 0.00167
    const baseSpeedPerFrame = config.bubbleSpeed / 60;
    const driftSpeedPerFrame = config.driftSpeed / 60;
    
    if (onScreen) {
        // Spawn on-screen for immediate visibility
        x = margin + Math.random() * (1 - margin * 2);
        y = margin + Math.random() * (1 - margin * 2);
        // Random gentle movement
        vx = (Math.random() - 0.5) * driftSpeedPerFrame * 2;
        vy = (Math.random() - 0.5) * driftSpeedPerFrame * 2;
    } else {
        // Spawn off-screen and move in - gentle entry speed
        const side = Math.floor(Math.random() * 4);
        const speedMultiplier = 1.2 + Math.random() * 0.3; // 1.2x to 1.5x base speed for entry
        
        if (side === 0) { // Top - bubbles float down
            x = margin + Math.random() * (1 - margin * 2);
            y = -0.12;
            vx = (Math.random() - 0.5) * driftSpeedPerFrame * 1.2;
            vy = baseSpeedPerFrame * speedMultiplier;
        } else if (side === 1) { // Right - bubbles drift left
            x = 1.12;
            y = margin + Math.random() * (1 - margin * 2);
            vx = -baseSpeedPerFrame * speedMultiplier;
            vy = (Math.random() - 0.5) * driftSpeedPerFrame * 1.2;
        } else if (side === 2) { // Bottom - bubbles rise up
            x = margin + Math.random() * (1 - margin * 2);
            y = 1.12;
            vx = (Math.random() - 0.5) * driftSpeedPerFrame * 1.2;
            vy = -baseSpeedPerFrame * speedMultiplier;
        } else { // Left - bubbles drift right
            x = -0.12;
            y = margin + Math.random() * (1 - margin * 2);
            vx = baseSpeedPerFrame * speedMultiplier;
            vy = (Math.random() - 0.5) * driftSpeedPerFrame * 1.2;
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
    const actualLevel = Math.min(Math.max(1, level ?? 1), MAX_LEVEL) as BubbleLevel;
    currentLevel = actualLevel;
    bubbles = [];
    score = 0;
    nextBubbleId = 0;
    gameStartTime = Date.now();
    lastSpawnTime = gameStartTime; // Initialize to game start so first spawn happens after spawnRate delay
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
    // Spawn initial bubbles to meet minimum on-screen requirement
    const initialCount = Math.min(config.maxBubbles, config.minOnScreenBubbles);
    for (let i = 0; i < initialCount; i++) {
        // Mix of on-screen and off-screen spawns for visual variety
        const spawnOnScreen = i < Math.min(4, initialCount * 0.3);
        bubbles.push(spawnBubble(actualLevel, spawnOnScreen));
    }
    // Set lastSpawnTime to now so first periodic spawn happens after spawnRate delay
    lastSpawnTime = Date.now();
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
    return score >= currentGoal && currentLevel < MAX_LEVEL;
};

export const isLastLevel = () => {
    return currentLevel === MAX_LEVEL;
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
    // Calculate max movement per frame to prevent teleports on low fps
    const maxPxPerFrame = Math.max(6, Math.min(width, height) * 0.01);
    const maxNormalizedPerFrame = maxPxPerFrame / Math.min(width, height);
    
    bubbles.forEach(bubble => {
        if (!bubble.popping && isActive) {
            // Apply DDS speed multiplier if enabled
            const speedMultiplier = flags.enableDynamicDifficulty ? difficultyMultipliers.speed : 1.0;
            
            // Level-specific movement behaviors - reduced jitter for smoother motion
            const behavior = config.specialBehavior || 'float-gentle';
            switch (behavior) {
                case 'float-gentle':
                    // Level 1: Gentle floating, mostly upward
                    bubble.vy -= 0.00005 * (now - bubble.createdAt) * 0.001; // Reduced acceleration
                    bubble.vx += Math.sin(now * 0.0005 + bubble.id) * 0.000005; // Slower, smoother drift
                    bubble.float += 0.008;
                    break;
                case 'drift-wind':
                    // Level 2: Wind effect, horizontal drift
                    bubble.vx += 0.00003 * (now - bubble.createdAt) * 0.001; // Reduced acceleration
                    bubble.vy += Math.sin(now * 0.001 + bubble.id * 0.5) * 0.00001; // Slower oscillation
                    bubble.float += 0.008;
                    break;
                case 'zigzag-rise':
                    // Level 3+: Zigzag pattern, but smoother
                    bubble.vy -= 0.00008 * (now - bubble.createdAt) * 0.001; // Reduced acceleration
                    bubble.vx = Math.sin(now * 0.003 + bubble.id * 2) * 0.0005; // Smoother zigzag
                    bubble.float += 0.008;
                    bubble.rotation += 0.02;
                    break;
            }
            
            // Calculate movement
            let dx = bubble.vx * speedMultiplier;
            let dy = bubble.vy * speedMultiplier;
            
            // Clamp movement to prevent teleports
            dx = Math.max(-maxNormalizedPerFrame, Math.min(maxNormalizedPerFrame, dx));
            dy = Math.max(-maxNormalizedPerFrame, Math.min(maxNormalizedPerFrame, dy));
            
            bubble.x += dx;
            bubble.y += dy;
            bubble.rotation += 0.003;
            
            // Remove if off-screen
            if (bubble.x < -0.2 || bubble.x > 1.2 || bubble.y < -0.2 || bubble.y > 1.2) {
                bubble.popping = true;
                bubble.createdAt = now;
            }
        }
    });

    // Spawn new bubbles periodically - maintain minimum on-screen count
    const activeBubbleCount = bubbles.filter(b => !b.popping).length;
    if (isActive && activeBubbleCount < config.maxBubbles) {
        // Check if enough time has passed since last spawn
        const timeSinceLastSpawn = now - lastSpawnTime;
        if (timeSinceLastSpawn >= config.spawnRate) {
            // Maintain minimum on-screen bubbles
            const onScreenBubbles = bubbles.filter(b => !b.popping && b.x >= 0 && b.x <= 1 && b.y >= 0 && b.y <= 1).length;
            const bubblesNeeded = Math.min(
                config.maxBubbles - activeBubbleCount,
                onScreenBubbles < config.minOnScreenBubbles 
                    ? config.minOnScreenBubbles - onScreenBubbles 
                    : 1
            );
            
            for (let i = 0; i < bubblesNeeded; i++) {
                // Spawn on-screen if we're below minimum, otherwise spawn from edges
                const spawnOnScreen = onScreenBubbles < config.minOnScreenBubbles && i < 2;
                bubbles.push(spawnBubble(currentLevel, spawnOnScreen));
            }
            lastSpawnTime = now;
        }
    }
    
    // Continuous spawn check to maintain minimum - spawn immediately if below threshold
    if (isActive && activeBubbleCount < config.maxBubbles) {
        let onScreenBubbles = bubbles.filter(b => !b.popping && b.x >= 0 && b.x <= 1 && b.y >= 0 && b.y <= 1).length;
        const bubblesToSpawn = Math.min(
            config.minOnScreenBubbles - onScreenBubbles,
            config.maxBubbles - activeBubbleCount
        );
        if (bubblesToSpawn > 0) {
            for (let i = 0; i < bubblesToSpawn; i++) {
                bubbles.push(spawnBubble(currentLevel, true)); // Always spawn on-screen when catching up
            }
        }
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

    // Get performance config once for all bubbles
    const perfConfig = perf.getConfig();
    
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

                // Level 3+ gets extra glow on particles (skip on low tier)
                if (currentLevel >= 3 && perfConfig.visualQuality === 'high') {
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
            // ═══════════════════════════════════════════════
            // 3D GLOSSY SPHERE RENDERING — Toy World Style
            // Specular highlight, rim light, translucency, soft shadow
            // ═══════════════════════════════════════════════
            const depthScale = bubble.z;
            const baseColor = bubble.color;
            const _lightColor = lightenColor(baseColor, 45); void _lightColor;
            const darkColor = darkenColor(baseColor, 35);
            const cx = canvasPoint.x;
            const cy = canvasPoint.y + floatOffset;

            // 1. SOFT GROUND SHADOW — elongated ellipse below sphere
            ctx.save();
            ctx.globalAlpha = 0.25 * depthScale;
            ctx.beginPath();
            ctx.ellipse(cx + r * 0.08, cy + r * 0.85, r * 0.7, r * 0.2, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fill();
            ctx.restore();

            // 2. OUTER GLOW — colored ambient light around sphere
            if (perfConfig.visualQuality !== 'low') {
                ctx.save();
                ctx.globalAlpha = 0.35;
                const outerGlow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.4);
                outerGlow.addColorStop(0, baseColor);
                outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.beginPath();
                ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
                ctx.fillStyle = outerGlow;
                ctx.fill();
                ctx.restore();
            }

            // 3. MAIN SPHERE BODY — rich radial gradient from highlight to dark edge
            const mainGrad = ctx.createRadialGradient(
                cx - r * 0.3, cy - r * 0.3, r * 0.05,
                cx + r * 0.05, cy + r * 0.05, r
            );
            mainGrad.addColorStop(0, lightenColor(baseColor, 50));
            mainGrad.addColorStop(0.25, lightenColor(baseColor, 20));
            mainGrad.addColorStop(0.55, baseColor);
            mainGrad.addColorStop(0.8, darkColor);
            mainGrad.addColorStop(1, darkenColor(baseColor, 45));

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = mainGrad;
            ctx.fill();

            // 4. RIM LIGHT — bright edge on bottom-right (backlit effect)
            const rimGrad = ctx.createRadialGradient(
                cx + r * 0.4, cy + r * 0.4, r * 0.3,
                cx + r * 0.2, cy + r * 0.2, r * 1.05
            );
            rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
            rimGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
            rimGrad.addColorStop(0.85, `${lightenColor(baseColor, 30)}44`);
            rimGrad.addColorStop(1, `${lightenColor(baseColor, 50)}88`);

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = rimGrad;
            ctx.fill();

            // 5. TRANSLUCENCY LAYER — subtle inner glow for glass/soap feel
            const transGrad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 0.85);
            transGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
            transGrad.addColorStop(0.5, 'rgba(255,255,255,0.03)');
            transGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = transGrad;
            ctx.fill();

            // 6. SPECULAR HIGHLIGHT — main glossy hotspot (top-left)
            const specGrad = ctx.createRadialGradient(
                cx - r * 0.32, cy - r * 0.32, 0,
                cx - r * 0.32, cy - r * 0.32, r * 0.55
            );
            specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            specGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
            specGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
            specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.beginPath();
            ctx.arc(cx - r * 0.32, cy - r * 0.32, r * 0.55, 0, Math.PI * 2);
            ctx.fillStyle = specGrad;
            ctx.fill();

            // 7. SECONDARY SPECULAR DOT — crisp white pinpoint
            ctx.beginPath();
            ctx.arc(cx - r * 0.22, cy - r * 0.28, r * 0.1, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fill();

            // 8. THIN EDGE STROKE — defines the sphere boundary crisply
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `${darkenColor(baseColor, 20)}66`;
            ctx.lineWidth = Math.max(1, r * 0.03);
            ctx.stroke();
        }
    });

    // Check for hand collision using filtered point
    // Pop works on hover (filteredPoint exists) - no pinch required
    // Pinch can still be used but is not required
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
            
            // Cooldown to prevent double pops (100ms cooldown per bubble)
            if (bubble.lastPopAttempt && now - bubble.lastPopAttempt < 100) {
                return;
            }

            const bubbleCanvas = normalizedToCanvas({ x: bubble.x, y: bubble.y }, width, height);
            const floatOffset = Math.sin(bubble.float) * 4;
            const baseRadius = bubble.radius * Math.min(width, height);
            const r = baseRadius * bubble.z;
            
            const dx = fingerCanvas.x - bubbleCanvas.x;
            const dy = fingerCanvas.y - (bubbleCanvas.y + floatOffset);
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);

            // More forgiving hit detection - 1.35x radius for kid-friendly gameplay
            // Apply DDS size multiplier to pop radius for consistency
            const popRadiusMultiplier = flags.enableDynamicDifficulty ? difficultyMultipliers.size : 1.0;
            const effectiveRadius = r * 1.35 * popRadiusMultiplier;
            const effectiveRadiusSq = effectiveRadius * effectiveRadius;
            
            // Pop on hover - no pinch required
            if (distSq <= effectiveRadiusSq) {
                bubble.popping = true;
                bubble.createdAt = now;
                bubble.lastPopAttempt = now;
                score++;
                bubbleHits++;
                
                // Play success audio if enabled
                if (flags.enableTactileAudio) {
                    tactileAudioManager.playSuccess('bubble');
                }
            } else {
                // Track near misses for difficulty adjustment
                if (dist < effectiveRadius * 1.5) {
                    bubbleMisses++;
                }
            }
        });
    }
};
