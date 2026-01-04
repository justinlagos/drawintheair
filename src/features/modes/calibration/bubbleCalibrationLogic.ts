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
    vx: number; // Velocity X (normalized per frame)
    vy: number; // Velocity Y (normalized per frame)
}

const COLORS = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF6B6B', '#4ECDC4', '#A855F7', '#FF6B9D', '#C44569'];

let bubbles: Bubble[] = [];
let score = 0;
let nextBubbleId = 0;
let lastSpawnTime = 0;
let gameStartTime: number | null = null;
let gameEndTime: number | null = null;
let gameDuration = 30000; // 30 seconds
let milestoneReached = false;

const spawnBubble = (): Bubble => {
    const margin = 0.1;
    const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    
    let x, y, vx, vy;
    
    if (side === 0) { // Top
        x = margin + Math.random() * (1 - margin * 2);
        y = -0.1;
        vx = (Math.random() - 0.5) * 0.0005; // Slow drift
        vy = 0.0008 + Math.random() * 0.0004; // Slow downward
    } else if (side === 1) { // Right
        x = 1.1;
        y = margin + Math.random() * (1 - margin * 2);
        vx = -(0.0008 + Math.random() * 0.0004);
        vy = (Math.random() - 0.5) * 0.0005;
    } else if (side === 2) { // Bottom
        x = margin + Math.random() * (1 - margin * 2);
        y = 1.1;
        vx = (Math.random() - 0.5) * 0.0005;
        vy = -(0.0008 + Math.random() * 0.0004);
    } else { // Left
        x = -0.1;
        y = margin + Math.random() * (1 - margin * 2);
        vx = 0.0008 + Math.random() * 0.0004;
        vy = (Math.random() - 0.5) * 0.0005;
    }
    
    return {
        id: nextBubbleId++,
        x,
        y,
        radius: 0.035 + Math.random() * 0.025,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        popping: false,
        createdAt: Date.now(),
        vx,
        vy
    };
};

export const startBubbleGame = () => {
    bubbles = [];
    score = 0;
    nextBubbleId = 0;
    lastSpawnTime = 0;
    gameStartTime = Date.now();
    gameEndTime = null;
    milestoneReached = false;
    
    // Spawn initial bubbles
    for (let i = 0; i < 4; i++) {
        bubbles.push(spawnBubble());
    }
};

export const resetBubbles = () => {
    startBubbleGame();
};

export const getBubbles = () => bubbles;
export const getScore = () => score;
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
export const getGameEndTime = () => gameEndTime;

export const bubbleCalibrationLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null
) => {
    const now = Date.now();
    const { indexTip } = frameData;
    
    // Initialize game if not started
    if (gameStartTime === null) {
        startBubbleGame();
    }

    const timeRemaining = getTimeRemaining();
    const isActive = isGameActive();

    // Update bubble positions
    bubbles.forEach(bubble => {
        if (!bubble.popping && isActive) {
            bubble.x += bubble.vx;
            bubble.y += bubble.vy;
            
            // Remove if off-screen
            if (bubble.x < -0.2 || bubble.x > 1.2 || bubble.y < -0.2 || bubble.y > 1.2) {
                bubble.popping = true;
                bubble.createdAt = now;
            }
        }
    });

    // Spawn new bubbles periodically (slower rate)
    if (isActive && now - lastSpawnTime > 1200 && bubbles.filter(b => !b.popping).length < 6) {
        bubbles.push(spawnBubble());
        lastSpawnTime = now;
    }

    // Remove old popping bubbles
    bubbles = bubbles.filter(b => !b.popping || now - b.createdAt < 400);

    // Check milestone
    if (score >= 20 && !milestoneReached) {
        milestoneReached = true;
    }

    // End game if time expired
    if (isActive && timeRemaining <= 0 && gameEndTime === null) {
        gameEndTime = now;
    }

    // Draw bubbles on canvas - UNMIRRORED
    bubbles.forEach(bubble => {
        const canvasPoint = normalizedToCanvas({ x: bubble.x, y: bubble.y }, width, height);
        const r = bubble.radius * Math.min(width, height);

        if (bubble.popping) {
            // Pop effect
            const age = now - bubble.createdAt;
            const scale = 1 + age / 80;
            const alpha = Math.max(0, 1 - age / 400);

            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, r * scale, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fill();

            // Sparkles
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + age / 40;
                const dist = r * (1 + age / 80);
                const sx = canvasPoint.x + Math.cos(angle) * dist;
                const sy = canvasPoint.y + Math.sin(angle) * dist;

                ctx.beginPath();
                ctx.arc(sx, sy, 5 * alpha, 0, Math.PI * 2);
                ctx.fillStyle = bubble.color;
                ctx.fill();
            }
        } else {
            // Bubble glow
            const gradient = ctx.createRadialGradient(
                canvasPoint.x - r * 0.3,
                canvasPoint.y - r * 0.3,
                0,
                canvasPoint.x,
                canvasPoint.y,
                r
            );
            gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
            gradient.addColorStop(0.3, bubble.color + 'AA');
            gradient.addColorStop(0.7, bubble.color + '66');
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(canvasPoint.x, canvasPoint.y, r, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Border
            ctx.strokeStyle = bubble.color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Highlight
            ctx.beginPath();
            ctx.arc(canvasPoint.x - r * 0.3, canvasPoint.y - r * 0.3, r * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fill();
        }
    });

    // Check for hand collision
    if (indexTip && isActive) {
        const fingerCanvas = normalizedToCanvas(indexTip, width, height);

        // Draw finger indicator
        ctx.beginPath();
        ctx.arc(fingerCanvas.x, fingerCanvas.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Check collision with each bubble
        bubbles.forEach(bubble => {
            if (bubble.popping) return;

            const bubbleCanvas = normalizedToCanvas({ x: bubble.x, y: bubble.y }, width, height);
            const dx = fingerCanvas.x - bubbleCanvas.x;
            const dy = fingerCanvas.y - bubbleCanvas.y;
            const dist = Math.hypot(dx, dy);
            const bubbleRadiusPx = bubble.radius * Math.min(width, height);

            if (dist < bubbleRadiusPx * 1.3) {
                bubble.popping = true;
                bubble.createdAt = now;
                score++;
            }
        });
    }
};
