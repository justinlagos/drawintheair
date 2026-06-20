/**
 * Magic Canvas frame adapter — bridges MagicCanvasEngine to the shared
 * TrackingLayer `onFrame` contract and exposes lifecycle/tool setters for the
 * React shell. Mounted only when `freePaintMagicCanvasV1` is ON; the legacy
 * FreePaintMode/freePaintLogic is the fallback (never both at once).
 *
 * Tool-region prevention: the React layer reports the dock/HUD rectangles via
 * setUiRegions(); while the tracked point is inside one, we suppress pinch so
 * no marks are painted under the controls and drawing only resumes with a
 * clean pen-down back on the canvas.
 */

import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import type { DrawingUtils } from '@mediapipe/tasks-vision';
import { perf } from '../../../core/perf';
import { isCountdownActive } from '../../../core/countdownService';
import {
    MagicCanvasEngine,
    type EngineSnapshot,
    type PerfTier,
    type SizeId,
} from './magicCanvasEngine';
import type { BrushId } from './paintBrushes';
import type { PaintChallenge } from './challengeModel';
import { DEFAULT_WORLD_ID } from './paintWorlds';

let engine: MagicCanvasEngine | null = null;
let canvasW = 0;
let canvasH = 0;
let worldId = DEFAULT_WORLD_ID;
let uiRegions: { x: number; y: number; w: number; h: number }[] = [];
let completionCb: (() => void) | null = null;
let lastSnapshot: EngineSnapshot | null = null;
let initFailed = false;
// Mouse/trackpad input so the canvas works with BOTH hand gestures and mouse.
const mouse = { x: 0, y: 0, down: false, lastMove: 0 };

/** Report mouse/pointer input from the React layer (normalized 0..1). */
export const setMagicMouseInput = (p: { x: number; y: number } | null, down: boolean): void => {
    if (p) { mouse.x = p.x; mouse.y = p.y; mouse.lastMove = Date.now(); }
    mouse.down = down;
};

const reducedMotion = (): boolean => {
    try {
        return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    } catch {
        return false;
    }
};
const perfTier = (): PerfTier => {
    try {
        const t = perf.getConfig().tier as PerfTier;
        return t === 'low' || t === 'medium' || t === 'high' ? t : 'high';
    } catch {
        return 'high';
    }
};

export const initMagicCanvas = (width: number, height: number, world = worldId): void => {
    canvasW = width;
    canvasH = height;
    worldId = world;
    try {
        engine = new MagicCanvasEngine(world, width, height, { perfTier: perfTier(), reducedMotion: reducedMotion() });
        initFailed = false;
    } catch (err) {
        console.error('[magicCanvas] init failed:', err);
        engine = null;
        initFailed = true;
    }
};

export const magicInitFailed = (): boolean => initFailed;
export const getMagicEngine = (): MagicCanvasEngine | null => engine;
export const setMagicWorld = (id: string): void => { worldId = id; engine?.setWorld(id); };
export const setMagicChallenge = (c: PaintChallenge | null): void => engine?.setChallenge(c);
export const setMagicColour = (hex: string): void => engine?.setColour(hex);
export const setMagicBrush = (b: BrushId): void => engine?.setBrush(b);
export const setMagicSize = (s: SizeId): void => engine?.setSize(s);
export const magicUndo = (): void => engine?.undo();
export const magicClear = (): void => engine?.clear();
export const getMagicSnapshot = (): EngineSnapshot | null => lastSnapshot;
export const setMagicCompletionCallback = (cb: (() => void) | null): void => { completionCb = cb; };
export const setMagicUiRegions = (rects: { x: number; y: number; w: number; h: number }[]): void => { uiRegions = rects; };

const inUiRegion = (p: { x: number; y: number } | null): boolean => {
    if (!p) return false;
    for (const r of uiRegions) {
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return true;
    }
    return false;
};

export const magicCanvasFrame = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null
): void => {
    if (!engine || canvasW !== width || canvasH !== height) {
        canvasW = width;
        canvasH = height;
        if (engine) engine.resize(width, height);
        else { initMagicCanvas(width, height); if (!engine) return; }
    }

    const countdown = isCountdownActive(frameData.timestamp);

    // Prefer mouse/trackpad when recently active, else hand tracking — so the
    // canvas responds to BOTH input methods.
    const mouseActive = mouse.down || Date.now() - mouse.lastMove < 700;
    let pointer: { x: number; y: number } | null;
    let rawPinch: boolean;
    let hasHand: boolean;
    let confidence: number;
    if (mouseActive) {
        pointer = { x: mouse.x, y: mouse.y };
        rawPinch = mouse.down;
        hasHand = true;
        confidence = 1;
    } else {
        pointer = frameData.filteredPoint;
        rawPinch = frameData.pinchActive;
        hasHand = frameData.hasHand;
        confidence = frameData.confidence;
    }

    // Suppress drawing during countdown or while the pointer is over UI controls.
    const overUi = inUiRegion(pointer);
    const pinch = rawPinch && !countdown && !overUi;

    const prevCompleted = lastSnapshot?.challenge?.completed ?? false;
    lastSnapshot = engine.update({
        pointer,
        pinch,
        hasHand: hasHand && !overUi,
        now: frameData.timestamp,
        confidence,
    });
    engine.render(ctx, frameData.timestamp);

    if (lastSnapshot.challengeJustCompleted && !prevCompleted && completionCb) {
        completionCb();
    }
};
