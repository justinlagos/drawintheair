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

// Draw in the Air 2.0 balloon palette — lavender / sky / mint / sun / peach.
const BALLOON_COLORS = [
    '#9D7DFF', '#7BB6FF', '#5BCE9A', '#FFC83D',
    '#FF9B7E', '#F07A5C', '#B69BFF', '#93C5FF', '#7BD9A8',
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

// Draw in the Air 2.0 — elevated glossy balloon.
// True teardrop body, floating contact shadow, layered specular + rim
// shine, a real knot and a gently curling string. Hit-testing is still
// the circle (cx,cy,r) the caller owns; only the rendering is richer.
const BURST_GLYPHS = ['✦', '✧', '★', '●'];
function drawBalloon(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, r: number,
    color: string,
    num: number,
    dwellProgress: number,   // 0-1
    shakeOffset: number,
): void {
    const x = cx + shakeOffset;
    const ry = r * 1.14;            // balloons are a touch taller than wide
    const tipY = cy + ry + r * 0.16; // where the neck/knot meets

    // Soft outer glow (stronger while dwelling)
    const glowR = r * (1.55 + dwellProgress * 0.55);
    const glow = ctx.createRadialGradient(x, cy, r * 0.6, x, cy, glowR);
    glow.addColorStop(0, color + (dwellProgress > 0 ? '66' : '40'));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(x, cy, glowR, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Floating contact shadow on the meadow below
    const shY = cy + ry + 96;
    const sh = ctx.createRadialGradient(x, shY, 0, x, shY, r * 0.9);
    sh.addColorStop(0, 'rgba(31,27,46,0.18)');
    sh.addColorStop(1, 'rgba(31,27,46,0)');
    ctx.beginPath();
    ctx.ellipse(x, shY, r * 0.78, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = sh;
    ctx.fill();

    // Knot + curling string (drawn behind the body)
    ctx.beginPath();
    ctx.moveTo(x, tipY);
    ctx.bezierCurveTo(x - r * 0.18, tipY + r * 0.5, x + r * 0.16, tipY + r * 0.95, x - r * 0.1, tipY + r * 1.5);
    ctx.strokeStyle = 'rgba(31,27,46,0.28)';
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.lineCap = 'round';
    ctx.stroke();

    // Balloon body — teardrop: rounded ellipse that tapers to the neck
    ctx.beginPath();
    ctx.moveTo(x, cy - ry);
    ctx.bezierCurveTo(x + r * 1.25, cy - ry, x + r * 1.05, cy + ry * 0.72, x + r * 0.18, tipY - r * 0.06);
    ctx.quadraticCurveTo(x, tipY + r * 0.06, x - r * 0.18, tipY - r * 0.06);
    ctx.bezierCurveTo(x - r * 1.05, cy + ry * 0.72, x - r * 1.25, cy - ry, x, cy - ry);
    ctx.closePath();
    const body = ctx.createRadialGradient(x - r * 0.32, cy - r * 0.42, r * 0.05, x + r * 0.12, cy + r * 0.18, ry * 1.15);
    body.addColorStop(0, lighten(color, 52));
    body.addColorStop(0.38, lighten(color, 18));
    body.addColorStop(0.74, color);
    body.addColorStop(1, darken(color, 30));
    ctx.fillStyle = body;
    ctx.fill();

    // Rim light along the lower-right edge
    ctx.save();
    ctx.clip();
    const rim = ctx.createLinearGradient(x + r * 0.2, cy - ry * 0.5, x + r, cy + ry);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(1, lighten(color, 30) + 'cc');
    ctx.fillStyle = rim;
    ctx.fillRect(x - r * 1.3, cy - ry * 1.2, r * 2.6, ry * 2.6);
    ctx.restore();

    // Primary specular highlight (soft oval)
    ctx.save();
    ctx.globalAlpha = 0.95;
    const spec = ctx.createRadialGradient(x - r * 0.34, cy - r * 0.42, 0, x - r * 0.34, cy - r * 0.42, r * 0.58);
    spec.addColorStop(0, 'rgba(255,255,255,0.95)');
    spec.addColorStop(0.55, 'rgba(255,255,255,0.28)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.ellipse(x - r * 0.34, cy - r * 0.42, r * 0.42, r * 0.58, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = spec;
    ctx.fill();
    ctx.restore();

    // Tiny crisp sparkle dot on the highlight
    ctx.beginPath();
    ctx.arc(x - r * 0.5, cy - r * 0.58, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();

    // Knot
    ctx.beginPath();
    ctx.moveTo(x - r * 0.16, tipY - r * 0.04);
    ctx.quadraticCurveTo(x, tipY + r * 0.22, x + r * 0.16, tipY - r * 0.04);
    ctx.quadraticCurveTo(x, tipY + r * 0.06, x - r * 0.16, tipY - r * 0.04);
    ctx.closePath();
    ctx.fillStyle = darken(color, 18);
    ctx.fill();

    // Number label
    ctx.save();
    ctx.font = `800 ${Math.round(r * 0.92)}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(31,27,46,0.45)';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(num), x, cy);
    ctx.restore();

    // Dwell ring (sky-blue, glowing)
    if (dwellProgress > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, cy, r + 9, -Math.PI / 2, -Math.PI / 2 + dwellProgress * Math.PI * 2);
        ctx.strokeStyle = '#7BB6FF';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(123,182,255,0.8)';
        ctx.stroke();
        ctx.restore();
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
    const ease = 1 - Math.pow(1 - t, 2);
    const scale = 1 + ease * 1.8;

    // White flash core
    const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * scale * 0.9);
    flash.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
    flash.addColorStop(0.5, `rgba(255,236,179,${alpha * 0.5})`);
    flash.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = flash;
    ctx.fill();

    // Confetti shards + sparkle glyphs spraying outward
    const particleCount = 14;
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + i;
        const dist = r * scale * 1.5;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (i % 3 === 0) {
            ctx.fillStyle = '#fff';
            ctx.font = `${Math.round((10 + r * 0.3))}px Outfit, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(BURST_GLYPHS[i % BURST_GLYPHS.length], px, py);
        } else {
            const pr = (7 + (i % 4) * 2) * alpha;
            ctx.beginPath();
            ctx.arc(px, py, Math.max(0, pr), 0, Math.PI * 2);
            ctx.fillStyle = i % 2 ? color : '#FFC83D';
            ctx.fill();
        }
        ctx.restore();
    }

    // Twin expanding rings (sun + lavender)
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,200,61,${alpha * 0.9})`;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(157,125,255,${alpha * 0.6})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Rising "+1"
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '900 28px Outfit, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#C88A0F';
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(31,27,46,0.2)';
    ctx.fillText('+1', cx, cy - 30 - ease * 46);
    ctx.restore();
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

    // ── Transparent canvas, HTML BalloonMathBackground provides the scene
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
                        // ❌ Wrong, shake
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
    // Removed 2026-05-11: the canvas-drawn cursor sat at the raw landmark
    // position while the global <MagicCursor> overlay sat at the smoothed
    // position, producing a visible 60–80 px offset between two cursors.
    // MagicCursor is now the only on-screen cursor. fingerCanvas above
    // is still computed for balloon hit-testing.
};
