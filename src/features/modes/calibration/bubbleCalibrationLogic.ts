/**
 * Bubble Pop Logic - PRIORITY C
 * 
 * Timed 30-second rounds with:
 * - Level progression (3 environments)
 * - Slow, gentle bubble movement
 * - 3D realistic balloons with depth
 * - End-of-round modal
 * - Milestone rewards at 20 pops
 */

import { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { normalizedToCanvas } from '../../../core/coordinateUtils';

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

type Level = 1 | 2 | 3;

interface LevelConfig {
    bubbleSpeed: number;
    maxBubbles: number;
    spawnRate: number;
    hasParallax: boolean;
    hasBloom: boolean;
    backgroundColor: string; // Level-specific background color
    bubbleGlowIntensity: number; // Intensity of bubble glow effects
    particleCount: number; // Number of particles on pop
}

const LEVEL_CONFIGS: Record<Level, LevelConfig> = {
    1: {
        bubbleSpeed: 0.00035, // Gentle speed for beginners
        maxBubbles: 14, // Comfortable number of bubbles
        spawnRate: 400, // Moderate spawn rate
        hasParallax: false,
        hasBloom: false,
        backgroundColor: 'rgba(1, 12, 36, 1)', // Deep blue-black
        bubbleGlowIntensity: 0.3,
        particleCount: 12
    },
    2: {
        bubbleSpeed: 0.00050, // Elevated speed - faster than level 1
        maxBubbles: 12, // FEWER bubbles than level 1 (as requested)
        spawnRate: 350, // Slightly faster spawn
        hasParallax: true,
        hasBloom: true,
        backgroundColor: 'rgba(15, 25, 50, 1)', // Slightly lighter blue-purple
        bubbleGlowIntensity: 0.6,
        particleCount: 16
    },
    3: {
        bubbleSpeed: 0.00070, // Significantly faster - one notch harder
        maxBubbles: 16, // More bubbles than level 2, but still challenging
        spawnRate: 280, // Fast spawn rate
        hasParallax: true,
        hasBloom: true,
        backgroundColor: 'rgba(25, 20, 45, 1)', // Purple-tinted dark
        bubbleGlowIntensity: 0.9,
        particleCount: 20
    }
};

// Level goals
const LEVEL_GOALS: Record<Level, number> = {
    1: 20, // Level 1 goal: 20 pops
    2: 24, // Level 2 goal: 24 pops
    3: 28  // Level 3 goal: 28 pops
};

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#FF6B9D', '#95E1D3', '#FFA07A', '#98D8C8'];

let bubbles: Bubble[] = [];
let score = 0;
let nextBubbleId = 0;
let lastSpawnTime = 0;
let gameStartTime: number | null = null;
let gameEndTime: number | null = null;
let gameDuration = 30000; // 30 seconds
let milestoneReached = false;
let milestoneCelebrated = false;
let currentLevel: Level = 1;

const spawnBubble = (level: Level): Bubble => {
    const config = LEVEL_CONFIGS[level];
    const margin = 0.1;
    const side = Math.floor(Math.random() * 4);
    
    let x, y, vx, vy;
    const baseSpeed = config.bubbleSpeed;
    
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
    
    return {
        id: nextBubbleId++,
        x,
        y,
        radius: 0.04 + Math.random() * 0.025,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        popping: false,
        createdAt: Date.now(),
        vx,
        vy,
        rotation: Math.random() * Math.PI * 2,
        float: Math.random() * Math.PI * 2,
        z: Math.random() * 0.3 + 0.7 // Depth: 0.7 to 1.0
    };
};

export const startBubbleGame = (level: Level | undefined = 1) => {
    const actualLevel = (level ?? 1) as Level;
    currentLevel = actualLevel;
    bubbles = [];
    score = 0;
    nextBubbleId = 0;
    lastSpawnTime = 0;
    gameStartTime = Date.now();
    gameEndTime = null;
    milestoneReached = false;
    milestoneCelebrated = false;
    
    const config = LEVEL_CONFIGS[actualLevel];
    // Spawn initial bubbles - start with many on screen for immediate action
    // Use a higher percentage of max bubbles for better availability
    const initialCount = Math.min(Math.floor(config.maxBubbles * 0.7), config.maxBubbles - 1);
    for (let i = 0; i < initialCount; i++) {
        bubbles.push(spawnBubble(actualLevel));
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
export const getCurrentGoal = () => LEVEL_GOALS[currentLevel];
export const canAdvanceLevel = () => {
    const currentGoal = LEVEL_GOALS[currentLevel];
    return score >= currentGoal && currentLevel < 3;
};
export const hasReachedGoal = () => {
    const currentGoal = LEVEL_GOALS[currentLevel];
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
    const config = LEVEL_CONFIGS[currentLevel];
    
    // Initialize game if not started
    if (gameStartTime === null) {
        startBubbleGame(1 as Level);
    }

    const timeRemaining = getTimeRemaining();
    const isActive = isGameActive();

    // Draw level-specific background
    ctx.save();
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Draw parallax background layers (levels 2-3) with level-specific colors
    if (config.hasParallax) {
        ctx.save();
        ctx.globalAlpha = currentLevel === 2 ? 0.2 : 0.25;
        
        const time = now / 2000;
        const color1 = currentLevel === 2 ? 'rgba(100, 150, 255, 0.3)' : 'rgba(150, 100, 255, 0.3)';
        const color2 = currentLevel === 2 ? 'rgba(79, 172, 254, 0.2)' : 'rgba(200, 100, 255, 0.25)';
        
        // Multiple layers for depth
        for (let i = 0; i < (currentLevel === 3 ? 5 : 3); i++) {
            const x = (width * 0.3 + Math.sin(time + i * 0.7) * width * 0.15) % width;
            const y = height * 0.2 + i * height * 0.25;
            const size = 80 + i * 20;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = i % 2 === 0 ? color1 : color2;
            ctx.fill();
        }
        
        ctx.restore();
    }

    // Update bubble positions and animations
    bubbles.forEach(bubble => {
        if (!bubble.popping && isActive) {
            bubble.x += bubble.vx;
            bubble.y += bubble.vy;
            
            // Floating animation (gentle bobbing)
            bubble.float += 0.008;
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
        bubbles.push(spawnBubble(currentLevel));
        lastSpawnTime = now;
    }

    // Remove old popping bubbles
    bubbles = bubbles.filter(b => !b.popping || now - b.createdAt < 400);

    // Check milestone (level-based goal)
    const currentGoal = LEVEL_GOALS[currentLevel];
    if (score >= currentGoal && !milestoneReached) {
        milestoneReached = true;
    }

    // End game if time expired
    if (isActive && timeRemaining <= 0 && gameEndTime === null) {
        gameEndTime = now;
    }

    // Draw bubbles with 3D effect
    bubbles.forEach(bubble => {
        const canvasPoint = normalizedToCanvas({ x: bubble.x, y: bubble.y }, width, height);
        const baseRadius = bubble.radius * Math.min(width, height);
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
            const particleCount = config.particleCount;
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2 + age / 40;
                const dist = r * (1 + age / 80) * (currentLevel >= 2 ? 1.2 : 1);
                const sx = canvasPoint.x + Math.cos(angle) * dist;
                const sy = canvasPoint.y + floatOffset + Math.sin(angle) * dist;
                const particleSize = (currentLevel >= 2 ? 8 : 7) * alpha;

                // Level 3 gets extra glow on particles
                if (currentLevel === 3) {
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
            // 3D Bubble with depth
            const depthScale = bubble.z;
            
            // Shadow (darker for depth)
            ctx.save();
            ctx.globalAlpha = 0.3 * depthScale;
            ctx.beginPath();
            ctx.ellipse(
                canvasPoint.x + 3,
                canvasPoint.y + floatOffset + 3,
                r * 0.9,
                r * 0.6,
                0, 0, Math.PI * 2
            );
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fill();
            ctx.restore();

            // Main bubble with gradient
            const gradient = ctx.createRadialGradient(
                canvasPoint.x - r * 0.4 * depthScale,
                canvasPoint.y - r * 0.4 * depthScale + floatOffset,
                0,
                canvasPoint.x,
                canvasPoint.y + floatOffset,
                r
            );
            gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
            gradient.addColorStop(0.2, bubble.color + 'EE');
            gradient.addColorStop(0.5, bubble.color + 'AA');
            gradient.addColorStop(0.8, bubble.color + '66');
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y + floatOffset, r, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Enhanced outer glow (levels 2-3) with level-specific intensity
            if (config.hasBloom) {
                const glowSize = currentLevel === 3 ? 2.0 : 1.6;
                const glowIntensity = config.bubbleGlowIntensity;
                
                const glowGradient = ctx.createRadialGradient(
                    canvasPoint.x,
                    canvasPoint.y + floatOffset,
                    r * 0.7,
                    canvasPoint.x,
                    canvasPoint.y + floatOffset,
                    r * glowSize
                );
                
                // Level 3 gets more intense, multi-color glow
                if (currentLevel === 3) {
                    glowGradient.addColorStop(0, bubble.color + Math.floor(glowIntensity * 255).toString(16).padStart(2, '0'));
                    glowGradient.addColorStop(0.5, bubble.color + Math.floor(glowIntensity * 150).toString(16).padStart(2, '0'));
                    glowGradient.addColorStop(1, 'transparent');
                } else {
                    glowGradient.addColorStop(0, bubble.color + Math.floor(glowIntensity * 85).toString(16).padStart(2, '0'));
                    glowGradient.addColorStop(1, 'transparent');
                }

                ctx.beginPath();
                ctx.arc(canvasPoint.x, canvasPoint.y + floatOffset, r * glowSize, 0, Math.PI * 2);
                ctx.fillStyle = glowGradient;
                ctx.fill();
            }

            // Border
            ctx.strokeStyle = bubble.color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Highlight for 3D effect
            ctx.beginPath();
            ctx.arc(
                canvasPoint.x - r * 0.35 * depthScale,
                canvasPoint.y - r * 0.35 * depthScale + floatOffset,
                r * 0.3 * depthScale,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.fill();
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
            if (dist < r * 1.4) {
                bubble.popping = true;
                bubble.createdAt = now;
                score++;
            }
        });
    }
};
