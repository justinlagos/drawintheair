/**
 * Rainbow Bridge Logic
 *
 * A sequence of coloured clouds floats across the top of the screen.
 * Stepping stones at the bottom match those colours.
 * Kids dwell-hover on each stone IN ORDER to build a glowing rainbow bridge.
 *
 * Gesture: Index-finger dwell (0.6 s) on a stepping stone.
 * Correct order → arc added to rainbow + step advances.
 * Wrong stone  → gentle bounce, try again.
 */

import type { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { normalizedToCanvas } from '../../../core/coordinateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Colour definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface RainbowColour {
    id: string;
    hex: string;
    name: string;
    glow: string;
}

const COLOURS: RainbowColour[] = [
    { id: 'red', hex: '#FF4444', name: 'Red', glow: 'rgba(255,68,68,0.6)' },
    { id: 'orange', hex: '#FF8C00', name: 'Orange', glow: 'rgba(255,140,0,0.6)' },
    { id: 'yellow', hex: '#FFD700', name: 'Yellow', glow: 'rgba(255,215,0,0.6)' },
    { id: 'green', hex: '#00CC66', name: 'Green', glow: 'rgba(0,204,102,0.6)' },
    { id: 'blue', hex: '#3399FF', name: 'Blue', glow: 'rgba(51,153,255,0.6)' },
    { id: 'purple', hex: '#9B59B6', name: 'Purple', glow: 'rgba(155,89,182,0.6)' },
    { id: 'pink', hex: '#FF69B4', name: 'Pink', glow: 'rgba(255,105,180,0.6)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface Stone {
    colourId: string;
    x: number;    // 0-1 normalized
    y: number;    // 0-1 normalized
    radius: number;
    bouncing: boolean;
    bounceStart: number;
    dwellStart: number | null;
}

export interface RainbowArc {
    colourId: string;
    step: number;    // which step (0-indexed) this arc belongs to
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level state
// ─────────────────────────────────────────────────────────────────────────────

const DWELL_MS = 600;
const BOUNCE_DURATION_MS = 350;
const STONE_RADIUS = 0.055;
const HIT_MULTIPLIER = 1.45;

let pattern: RainbowColour[] = [];    // the target sequence
let currentStep = 0;                   // which step we're on
let stones: Stone[] = [];              // all available stones (shuffled)
let arcs: RainbowArc[] = [];          // completed arcs
let levelComplete = false;
let celebrationTime = 0;
let levelIndex = 0;
let totalCompleted = 0;

const LEVEL_LENGTHS = [3, 4, 5, 5, 6];  // pattern length per level

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildLevel(): void {
    const patternLength = LEVEL_LENGTHS[Math.min(levelIndex, LEVEL_LENGTHS.length - 1)];
    // Pick random colour sequence (no immediate repeats)
    pattern = [];
    let lastId = '';
    for (let i = 0; i < patternLength; i++) {
        let col: RainbowColour;
        do { col = COLOURS[Math.floor(Math.random() * COLOURS.length)]; }
        while (col.id === lastId);
        pattern.push(col);
        lastId = col.id;
    }

    currentStep = 0;
    arcs = [];
    levelComplete = false;
    celebrationTime = 0;

    // Build stones: one per unique colour in pattern + a couple of distractors
    const patternColourIds = new Set(pattern.map(c => c.id));
    const extras = COLOURS.filter(c => !patternColourIds.has(c.id)).slice(0, 2);
    const stoneColours = shuffle([
        ...COLOURS.filter(c => patternColourIds.has(c.id)),
        ...extras,
    ]);

    const count = stoneColours.length;
    stones = stoneColours.map((col, i) => ({
        colourId: col.id,
        x: 0.06 + (i / (count - 1)) * 0.88,
        y: 0.75 + Math.sin(i * 1.3) * 0.04,
        radius: STONE_RADIUS,
        bouncing: false,
        bounceStart: 0,
        dwellStart: null,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function initRainbowBridge(): void {
    levelIndex = 0;
    totalCompleted = 0;
    buildLevel();
}

export function getRainbowPattern(): RainbowColour[] { return pattern; }
export function getRainbowCurrentStep(): number { return currentStep; }
export function getRainbowArcs(): RainbowArc[] { return arcs; }
export function isRainbowLevelComplete(): boolean { return levelComplete; }
export function getRainbowCelebrationTime(): number { return celebrationTime; }
export function getRainbowLevel(): number { return levelIndex + 1; }
export function getRainbowTotalCompleted(): number { return totalCompleted; }

export function advanceRainbowLevel(): void {
    levelIndex = Math.min(levelIndex + 1, LEVEL_LENGTHS.length - 1);
    totalCompleted++;
    buildLevel();
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas drawing helpers
// ─────────────────────────────────────────────────────────────────────────────

function getColour(id: string): RainbowColour {
    return COLOURS.find(c => c.id === id) ?? COLOURS[0];
}

function drawCloud(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, scale: number,
    colour: RainbowColour,
    isActive: boolean,
    index: number,
    now: number,
): void {
    const r = scale;
    const pulse = isActive ? 1 + 0.06 * Math.sin(now * 0.004 + index) : 1;
    const pr = r * pulse;

    // Colour glow
    ctx.shadowBlur = isActive ? 30 : 10;
    ctx.shadowColor = colour.glow;

    // Cloud puffs
    ctx.fillStyle = isActive ? colour.hex : colour.hex + '99';
    const puffs = [
        { dx: 0, dy: 0, wf: 1.0 },
        { dx: -0.8, dy: 0.15, wf: 0.7 },
        { dx: 0.85, dy: 0.1, wf: 0.75 },
        { dx: -0.4, dy: -0.5, wf: 0.65 },
        { dx: 0.45, dy: -0.5, wf: 0.6 },
    ];
    puffs.forEach(p => {
        ctx.beginPath();
        ctx.arc(cx + p.dx * pr, cy + p.dy * pr, pr * p.wf, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Colour name label
    ctx.save();
    ctx.font = `bold ${Math.round(r * 0.55)}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.fillText(colour.name, cx, cy + r * 0.1);
    ctx.restore();
}

function drawStone(
    ctx: CanvasRenderingContext2D,
    stone: Stone,
    isTarget: boolean,
    isCompleted: boolean,
    dwellProgress: number,
    bounceOffset: number,
    width: number, height: number,
    now: number,
): void {
    const sc = normalizedToCanvas({ x: stone.x, y: stone.y }, width, height);
    const r = stone.radius * Math.min(width, height);
    const cy = sc.y + bounceOffset;
    const col = getColour(stone.colourId);

    // Glow
    ctx.shadowBlur = isTarget ? 25 : 10;
    ctx.shadowColor = col.glow;

    // Stone body
    const grad = ctx.createRadialGradient(sc.x - r * 0.25, cy - r * 0.25, r * 0.05, sc.x, cy, r);
    grad.addColorStop(0, col.hex + 'ff');
    grad.addColorStop(0.6, col.hex + 'cc');
    grad.addColorStop(1, col.hex + '66');

    ctx.beginPath();
    ctx.arc(sc.x, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    if (isCompleted) {
        // Check mark overlay
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(sc.x - r * 0.35, cy);
        ctx.lineTo(sc.x - r * 0.05, cy + r * 0.35);
        ctx.lineTo(sc.x + r * 0.4, cy - r * 0.25);
        ctx.stroke();
    }

    // Highlight
    const spec = ctx.createRadialGradient(sc.x - r * 0.3, cy - r * 0.3, 0, sc.x - r * 0.3, cy - r * 0.3, r * 0.5);
    spec.addColorStop(0, 'rgba(255,255,255,0.8)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(sc.x - r * 0.3, cy - r * 0.3, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = spec;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Colour label
    ctx.save();
    ctx.font = `bold ${Math.round(r * 0.5)}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.fillText(col.name, sc.x, cy + r + Math.round(r * 0.5) + 4);
    ctx.restore();

    // Dwell arc
    if (dwellProgress > 0 && !isCompleted) {
        ctx.beginPath();
        ctx.arc(sc.x, cy, r + 7, -Math.PI / 2, -Math.PI / 2 + dwellProgress * Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    // Target pulse ring
    if (isTarget && !isCompleted) {
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
        ctx.beginPath();
        ctx.arc(sc.x, cy, r + 12 + pulse * 5, 0, Math.PI * 2);
        ctx.strokeStyle = col.hex + '88';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

function drawRainbowArcs(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (arcs.length === 0) return;
    const cx = w / 2;
    const groundY = h * 0.78;
    const startR = Math.min(w, h) * 0.07;

    arcs.forEach((arc, i) => {
        const col = getColour(arc.colourId);
        const r = startR + i * Math.min(w, h) * 0.055;
        ctx.beginPath();
        ctx.arc(cx, groundY, r, Math.PI, 0, false);
        ctx.strokeStyle = col.hex;
        ctx.lineWidth = Math.min(w, h) * 0.025;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 12;
        ctx.shadowColor = col.glow;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Core per-frame logic
// ─────────────────────────────────────────────────────────────────────────────

export const rainbowBridgeLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null,
): void => {
    if (!pattern.length) initRainbowBridge();

    const now = Date.now();
    const { filteredPoint } = frameData;

    // ── Transparent canvas — HTML RainbowBridgeBackground provides the
    // sky, hills, rainbow centrepiece and clouds. Game-relevant elements
    // (rainbow arcs being built, pattern clouds, stones) still draw below.
    ctx.clearRect(0, 0, width, height);

    // ── Draw rainbow arcs (completed steps) ───────────────────────────────────
    drawRainbowArcs(ctx, width, height);

    // ── Draw pattern clouds at top ────────────────────────────────────────────
    const cloudScale = Math.min(width, height) * 0.05;
    const cloudY = height * 0.18;
    const cloudSpacing = width / (pattern.length + 1);
    pattern.forEach((col, i) => {
        const cx = cloudSpacing * (i + 1);
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        drawCloud(ctx, cx, cloudY, cloudScale, col, isActive, i, now);

        // Step number
        ctx.save();
        ctx.font = `bold ${Math.round(cloudScale * 0.6)}px Outfit, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDone ? '#00FF88' : 'rgba(255,255,255,0.7)';
        ctx.fillText(isDone ? '✓' : String(i + 1), cx, cloudY - cloudScale * 0.9);
        ctx.restore();
    });

    // ── Dwell detection on stones ─────────────────────────────────────────────
    const targetColourId = pattern[currentStep]?.id;
    const fingerCanvas = filteredPoint ? normalizedToCanvas(filteredPoint, width, height) : null;

    if (fingerCanvas && !levelComplete) {
        stones.forEach(stone => {
            const sc = normalizedToCanvas({ x: stone.x, y: stone.y }, width, height);
            const r = stone.radius * Math.min(width, height);
            const dist = Math.hypot(fingerCanvas.x - sc.x, fingerCanvas.y - sc.y);

            const isCompleted = arcs.some((_a, i) => {
                // A stone colour is spent only if ALL steps of that colour before current are done
                const stepsOfThisColour = pattern.slice(0, currentStep).filter(p => p.id === stone.colourId).length;
                const arcsOfThisColour = arcs.filter(a2 => a2.colourId === stone.colourId).length;
                return arcsOfThisColour >= stepsOfThisColour + 1 && i < currentStep;
            });
            void isCompleted;

            if (dist < r * HIT_MULTIPLIER) {
                if (stone.dwellStart === null) stone.dwellStart = now;
                const elapsed = now - stone.dwellStart;

                if (elapsed >= DWELL_MS) {
                    stone.dwellStart = null;
                    if (stone.colourId === targetColourId) {
                        // ✅ Correct
                        arcs.push({ colourId: stone.colourId, step: currentStep });
                        currentStep++;
                        if (currentStep >= pattern.length) {
                            levelComplete = true;
                            celebrationTime = now;
                        }
                    } else {
                        // ❌ Wrong — bounce
                        stone.bouncing = true;
                        stone.bounceStart = now;
                    }
                }
            } else {
                stone.dwellStart = null;
            }
        });
    }

    // ── Draw stones ───────────────────────────────────────────────────────────
    stones.forEach(stone => {
        const isTargetStone = stone.colourId === targetColourId;
        const isCompletedStone = arcs.some(a => a.colourId === stone.colourId && a.step < currentStep);
        const dwellP = stone.dwellStart !== null ? Math.min((now - stone.dwellStart) / DWELL_MS, 1) : 0;

        let bounceOffset = 0;
        if (stone.bouncing) {
            const t = (now - stone.bounceStart) / BOUNCE_DURATION_MS;
            bounceOffset = -Math.abs(Math.sin(t * Math.PI * 2.5)) * 18 * Math.max(0, 1 - t);
            if (t > 1) stone.bouncing = false;
        }

        drawStone(ctx, stone, isTargetStone, isCompletedStone, dwellP, bounceOffset, width, height, now);
    });

    // ── Finger cursor ─────────────────────────────────────────────────────────
    if (fingerCanvas) {
        ctx.beginPath();
        ctx.arc(fingerCanvas.x, fingerCanvas.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
};
