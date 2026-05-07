/**
 * Balloon Pop Math Logic
 *
 * Kids float numbered balloons upward and pop the one matching
 * the target number/equation shown at the top of the screen.
 *
 * Gesture: Index-finger dwell (0.8 s) over the correct balloon → pop!
 * Wrong pops give a gentle shake but no penalty.
 *
 * Uses the same per-frame callback pattern as bubbleCalibrationLogic.ts
 */

import type { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { normalizedToCanvas } from '../../../core/coordinateUtils';
import { logEvent } from '../../../lib/analytics';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface MathBalloon {
    id: number;
    x: number;           // 0-1 normalized
    y: number;           // 0-1 normalized
    vy: number;          // velocity (normalized/frame, upward is negative)
    vx: number;
    radius: number;      // 0-1 normalized
    number: number;      // label
    color: string;
    popping: boolean;
    popTime: number;
    shaking: boolean;
    shakeTime: number;
    dwellStart: number | null;   // timestamp when finger started dwelling
    float: number;               // phase for sine float
}

export interface BalloonMathLevel {
    level: number;
    name: string;
    minNum: number;
    maxNum: number;
    balloonCount: number;
    useAddition: boolean;   // show A+B=? style equations
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DWELL_MS = 800;
const POP_DURATION_MS = 500;
const SHAKE_DURATION_MS = 400;
const BALLOON_RADIUS = 0.062;
const HIT_MULTIPLIER = 1.4;

const LEVEL_CONFIGS: BalloonMathLevel[] = [
    { level: 1, name: '🌟 Numbers 1–5', minNum: 1, maxNum: 5, balloonCount: 6, useAddition: false },
    { level: 2, name: '🚀 Numbers 1–10', minNum: 1, maxNum: 10, balloonCount: 7, useAddition: false },
    { level: 3, name: '➕ Easy Sums', minNum: 1, maxNum: 5, balloonCount: 8, useAddition: true },
    { level: 4, name: '🧠 Harder Sums', minNum: 1, maxNum: 10, balloonCount: 8, useAddition: true },
];

const BALLOON_COLORS = [
    '#FF5252', '#FF4081', '#E040FB', '#7C4DFF',
    '#448AFF', '#00BCD4', '#69F0AE', '#FFAB40', '#FF6E40',
];

// ─────────────────────────────────────────────────────────────────────────────
// Module-level state (matches bubbleCalibrationLogic pattern)
// ─────────────────────────────────────────────────────────────────────────────

let balloons: MathBalloon[] = [];
let nextId = 0;
let score = 0;
let levelIndex = 0;
let targetNumber = 1;
let equationA = 1;
let equationB = 1;
let levelComplete = false;
let popsThisLevel = 0;
let popsNeeded = 3;
let celebrationTime = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function pickTarget(cfg: BalloonMathLevel): void {
    if (cfg.useAddition) {
        equationA = Math.floor(rand(1, cfg.maxNum / 2 + 1));
        equationB = Math.floor(rand(1, cfg.maxNum - equationA + 1));
        targetNumber = equationA + equationB;
    } else {
        targetNumber = Math.floor(rand(cfg.minNum, cfg.maxNum + 1));
        equationA = 0;
        equationB = 0;
    }
}

function spawnBalloon(cfg: BalloonMathLevel, forceNumber?: number): MathBalloon {
    const num = forceNumber ?? Math.floor(rand(cfg.minNum, cfg.maxNum + 1));
    return {
        id: nextId++,
        x: rand(0.1, 0.9),
        y: rand(0.7, 1.1),           // spawn below screen then float up
        vy: -rand(0.0012, 0.0022),   // upward drift
        vx: (Math.random() - 0.5) * 0.0008,
        radius: BALLOON_RADIUS,
        number: num,
        color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
        popping: false,
        popTime: 0,
        shaking: false,
        shakeTime: 0,
        dwellStart: null,
        float: Math.random() * Math.PI * 2,
    };
}

function buildBalloons(cfg: BalloonMathLevel): MathBalloon[] {
    const pool: MathBalloon[] = [];
    // Guarantee at least 1 balloon has the correct answer
    pool.push(spawnBalloon(cfg, targetNumber));
    for (let i = 1; i < cfg.balloonCount; i++) {
        // Avoid duplicates of target to keep it exciting but forgiving
        let n: number;
        do { n = Math.floor(rand(cfg.minNum, cfg.maxNum + 1)); }
        while (n === targetNumber && pool.filter(b => b.number === targetNumber).length >= 1);
        pool.push(spawnBalloon(cfg, n));
    }
    // Stagger y positions so they aren't all bunched at the bottom
    pool.forEach((b, i) => {
        b.y = 0.5 + (i / pool.length) * 0.7 + Math.random() * 0.15;
        b.x = 0.08 + (i / pool.length) * 0.84 + (Math.random() - 0.5) * 0.1;
    });
    return pool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

// Tier B/C analytics: per-stage start time for time-to-complete.
let stageStartedAt = 0;

export function initBalloonMath(startLevel = 0): void {
    levelIndex = Math.min(startLevel, LEVEL_CONFIGS.length - 1);
    score = 0;
    popsThisLevel = 0;
    popsNeeded = 3;
    levelComplete = false;
    celebrationTime = 0;
    const cfg = LEVEL_CONFIGS[levelIndex];
    pickTarget(cfg);
    balloons = buildBalloons(cfg);
    stageStartedAt = Date.now();
    logEvent('stage_started', {
        game_mode: 'balloon-math',
        stage_id: cfg.name,
        meta: {
            stage_index: levelIndex,
            target_number: targetNumber,
            pops_needed: popsNeeded,
        },
    });
}

export function getBalloonMathScore(): number { return score; }
export function getBalloonMathLevel(): number { return levelIndex + 1; }
export function getBalloonMathTarget(): number { return targetNumber; }
export function getBalloonMathEquation(): [number, number] { return [equationA, equationB]; }
export function isBalloonMathLevelComplete(): boolean { return levelComplete; }
export function getBalloonMathCelebrationTime(): number { return celebrationTime; }
export function getBalloonMathLevelName(): string { return LEVEL_CONFIGS[levelIndex]?.name ?? ''; }
export function getBalloonMathPopsNeeded(): number { return popsNeeded; }
export function getBalloonMathPopsThisLevel(): number { return popsThisLevel; }
export function isLastBalloonMathLevel(): boolean { return levelIndex >= LEVEL_CONFIGS.length - 1; }

export function advanceBalloonMathLevel(): void {
    if (levelIndex < LEVEL_CONFIGS.length - 1) {
        levelIndex++;
    } else {
        // Loop back to 1st level (infinite play)
        levelIndex = 0;
    }
    score = 0;
    popsThisLevel = 0;
    levelComplete = false;
    celebrationTime = 0;
    const cfg = LEVEL_CONFIGS[levelIndex];
    pickTarget(cfg);
    balloons = buildBalloons(cfg);
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawing helpers
// ─────────────────────────────────────────────────────────────────────────────

function lighten(hex: string, pct: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const a = Math.round(2.55 * pct);
    const r = Math.min(255, (n >> 16) + a);
    const g = Math.min(255, ((n >> 8) & 0xff) + a);
    const b = Math.min(255, (n & 0xff) + a);
    return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function darken(hex: string, pct: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const a = Math.round(2.55 * pct);
    const r = Math.max(0, (n >> 16) - a);
    const g = Math.max(0, ((n >> 8) & 0xff) - a);
    const b = Math.max(0, (n & 0xff) - a);
    return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function drawBalloon(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, r: number,
    color: string,
    num: number,
    dwellProgress: number,   // 0-1
    shakeOffset: number,
): void {
    const x = cx + shakeOffset;

    // Outer glow (stronger while dwelling)
    const glowR = r * (1.5 + dwellProgress * 0.5);
    const glow = ctx.createRadialGradient(x, cy, r * 0.6, x, cy, glowR);
    glow.addColorStop(0, color + '55');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(x, cy, glowR, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Main body gradient
    const body = ctx.createRadialGradient(x - r * 0.28, cy - r * 0.28, r * 0.05, x, cy, r);
    body.addColorStop(0, lighten(color, 45));
    body.addColorStop(0.4, lighten(color, 15));
    body.addColorStop(0.75, color);
    body.addColorStop(1, darken(color, 35));
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();

    // Specular highlight
    const spec = ctx.createRadialGradient(x - r * 0.3, cy - r * 0.3, 0, x - r * 0.3, cy - r * 0.3, r * 0.5);
    spec.addColorStop(0, 'rgba(255,255,255,0.95)');
    spec.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(x - r * 0.3, cy - r * 0.3, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = spec;
    ctx.fill();

    // Knot (small triangle at bottom)
    ctx.beginPath();
    ctx.moveTo(x, cy + r);
    ctx.lineTo(x - 4, cy + r + 8);
    ctx.lineTo(x + 4, cy + r + 8);
    ctx.closePath();
    ctx.fillStyle = darken(color, 20);
    ctx.fill();

    // String
    ctx.beginPath();
    ctx.moveTo(x, cy + r + 8);
    ctx.bezierCurveTo(x - 10, cy + r + 28, x + 8, cy + r + 48, x - 4, cy + r + 68);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Number label
    ctx.save();
    ctx.font = `bold ${Math.round(r * 0.85)}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(num), x, cy + 2);
    ctx.restore();

    // Dwell ring
    if (dwellProgress > 0) {
        ctx.beginPath();
        ctx.arc(x, cy, r + 6, -Math.PI / 2, -Math.PI / 2 + dwellProgress * Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

function drawPopBurst(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, r: number,
    color: string,
    age: number,
): void {
    const t = age / POP_DURATION_MS; // 0→1
    const alpha = Math.max(0, 1 - t);
    const scale = 1 + t * 1.5;
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const dist = r * scale * 1.4;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        const pr = (8 + Math.random() * 6) * alpha;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0, pr), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    // Flash ring
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.8})`;
    ctx.lineWidth = 3;
    ctx.stroke();
}

// ─────────────────────────────────────────────────────────────────────────────
// Core per-frame logic (the onFrame callback)
// ─────────────────────────────────────────────────────────────────────────────

export const balloonMathLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null,
): void => {
    const now = Date.now();
    const { filteredPoint } = frameData;

    const cfg = LEVEL_CONFIGS[levelIndex];
    if (!cfg) return;

    // ── Transparent canvas — HTML BalloonMathBackground provides the scene
    // (sky + balloons + math symbols + hills). Clearing the previous frame
    // is essential because the canvas accumulates pixels otherwise.
    ctx.clearRect(0, 0, width, height);

    // ── Move + float each balloon ─────────────────────────────────────────────
    const fingerCanvas = filteredPoint ? normalizedToCanvas(filteredPoint, width, height) : null;

    balloons.forEach(b => {
        if (b.popping) return;

        b.float += 0.025;
        b.y += b.vy;
        b.x += b.vx + Math.sin(b.float) * 0.0002;

        // Wrap horizontally, recycle if floated off top
        if (b.x < -0.05) b.x = 1.05;
        if (b.x > 1.05) b.x = -0.05;
        if (b.y < -0.25) {
            // Respawn below
            b.y = 1.1;
            b.x = rand(0.08, 0.92);
            b.dwellStart = null;
        }
    });

    // ── Dwell detection ───────────────────────────────────────────────────────
    if (fingerCanvas && !levelComplete) {
        balloons.forEach(b => {
            if (b.popping) return;
            const bc = normalizedToCanvas({ x: b.x, y: b.y }, width, height);
            const r = b.radius * Math.min(width, height);
            const dx = fingerCanvas.x - bc.x;
            const dy = fingerCanvas.y - bc.y;
            const dist = Math.hypot(dx, dy);

            if (dist < r * HIT_MULTIPLIER) {
                if (b.dwellStart === null) b.dwellStart = now;
                const elapsed = now - b.dwellStart;

                if (elapsed >= DWELL_MS) {
                    b.dwellStart = null;
                    if (b.number === targetNumber) {
                        // ✅ Correct!
                        b.popping = true;
                        b.popTime = now;
                        score++;
                        popsThisLevel++;

                        // Mirror into learning_attempts via item_dropped.
                        // item_key = the *target* (what they had to pop),
                        // not the equation, so the mastery panel groups
                        // by which numbers kids reliably recognise.
                        logEvent('item_dropped', {
                            game_mode: 'balloon-math',
                            stage_id: cfg.name,
                            meta: {
                                itemKey: String(targetNumber),
                                isCorrect: true,
                                expected_value: String(targetNumber),
                                actual_value: String(b.number),
                                action_duration_ms: DWELL_MS,
                                equation_a: equationA,
                                equation_b: equationB,
                            },
                        });
                        logEvent('balloonmath_balloon_popped', {
                            game_mode: 'balloon-math',
                            stage_id: cfg.name,
                            meta: { number: b.number, target: targetNumber, isCorrect: true },
                        });

                        if (popsThisLevel >= popsNeeded) {
                            levelComplete = true;
                            celebrationTime = now;
                            const totalDurationMs = stageStartedAt > 0 ? now - stageStartedAt : null;
                            logEvent('mode_completed', { game_mode: 'balloon-math', stage_id: cfg.name });
                            logEvent('stage_completed', {
                                game_mode: 'balloon-math',
                                stage_id: cfg.name,
                                value_number: totalDurationMs ?? undefined,
                                meta: {
                                    stage_index: levelIndex,
                                    pops_needed: popsNeeded,
                                    pops_made: popsThisLevel,
                                    time_to_complete_ms: totalDurationMs,
                                },
                            });
                        } else {
                            // New target
                            pickTarget(cfg);
                            // Replace the popped balloon with a new one carrying the new target
                            balloons.push(spawnBalloon(cfg, targetNumber));
                        }
                    } else {
                        // ❌ Wrong — shake
                        b.shaking = true;
                        b.shakeTime = now;
                        b.dwellStart = null;
                        // Mistake-pattern row: which number did they
                        // confuse with the target?
                        logEvent('item_dropped', {
                            game_mode: 'balloon-math',
                            stage_id: cfg.name,
                            meta: {
                                itemKey: String(targetNumber),
                                isCorrect: false,
                                expected_value: String(targetNumber),
                                actual_value: String(b.number),
                                action_duration_ms: DWELL_MS,
                                equation_a: equationA,
                                equation_b: equationB,
                            },
                        });
                    }
                }
            } else {
                b.dwellStart = null;
            }
        });
    }

    // ── Draw balloons ─────────────────────────────────────────────────────────
    balloons.forEach(b => {
        const bc = normalizedToCanvas({ x: b.x, y: b.y }, width, height);
        const r = b.radius * Math.min(width, height);
        const floatPx = Math.sin(b.float) * 6;

        if (b.popping) {
            const age = now - b.popTime;
            if (age < POP_DURATION_MS) {
                drawPopBurst(ctx, bc.x, bc.y + floatPx, r, b.color, age);
            }
            return;
        }

        const shakeOffset = b.shaking
            ? Math.sin((now - b.shakeTime) * 0.05) * 12 * Math.max(0, 1 - (now - b.shakeTime) / SHAKE_DURATION_MS)
            : 0;

        if (b.shaking && now - b.shakeTime > SHAKE_DURATION_MS) {
            b.shaking = false;
        }

        const dwellProgress = b.dwellStart !== null
            ? Math.min((now - b.dwellStart) / DWELL_MS, 1)
            : 0;

        drawBalloon(ctx, bc.x, bc.y + floatPx, r, b.color, b.number, dwellProgress, shakeOffset);
    });

    // Remove fully popped
    balloons = balloons.filter(b => !b.popping || now - b.popTime < POP_DURATION_MS);

    // ── Finger cursor ─────────────────────────────────────────────────────────
    if (fingerCanvas) {
        ctx.beginPath();
        ctx.arc(fingerCanvas.x, fingerCanvas.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
};
