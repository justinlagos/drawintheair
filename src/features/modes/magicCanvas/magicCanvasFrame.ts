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
import { ColouringEngine, type ColouringSnapshot } from './colouringEngine';
import { getColouringPage } from './colouringPages';
import { setGesturePointer } from '../../../core/gestureInput';

let engine: MagicCanvasEngine | null = null;
let colouring: ColouringEngine | null = null;
let colouringSnap: ColouringSnapshot | null = null;
let currentColour = '#7BB6FF';
let currentSize: SizeId = 'medium';
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
export const setMagicColour = (hex: string): void => { currentColour = hex; engine?.setColour(hex); colouring?.setColour(hex); };
export const setMagicBrush = (b: BrushId): void => engine?.setBrush(b);
export const setMagicSize = (s: SizeId): void => { currentSize = s; engine?.setSize(s); colouring?.setSize(s); };
export const magicUndo = (): void => (colouring ? colouring.undo() : engine?.undo());
export const magicClear = (): void => (colouring ? colouring.clear() : engine?.clear());
export const getMagicSnapshot = (): EngineSnapshot | null => lastSnapshot;
export const getMagicColouringSnapshot = (): ColouringSnapshot | null => colouringSnap;
export const setMagicCompletionCallback = (cb: (() => void) | null): void => { completionCb = cb; };

/** Enter/leave guided colouring. Pass a page id to enter, null to return to freeform. */
export const setMagicColouringPage = (pageId: string | null): void => {
    if (!pageId) { colouring = null; colouringSnap = null; return; }
    const page = getColouringPage(pageId);
    if (!page) { colouring = null; return; }
    colouring = new ColouringEngine(page, canvasW || 1280, canvasH || 720, { perfTier: perfTier(), reducedMotion: reducedMotion() });
    colouring.setColour(currentColour);
    colouring.setSize(currentSize);
    colouring.setCompletionCallback(() => completionCb?.());
};
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

    // Publish the hand point so the React UI (entry cards, dock) can be driven
    // in the air by <GestureLayer>.
    setGesturePointer(frameData.filteredPoint, frameData.pinchActive, frameData.hasHand);

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
    const input = { pointer, pinch, hasHand: hasHand && !overUi, now: frameData.timestamp, confidence };

    // Guided colouring takes over when a page is active (its own engine).
    if (colouring) {
        if (colouringSnap === null || canvasW !== width || canvasH !== height) colouring.resize(width, height);
        const prevDone = colouringSnap?.completed ?? false;
        colouringSnap = colouring.update(input);
        colouring.render(ctx, frameData.timestamp);
        if (colouringSnap.completed && !prevDone && completionCb) completionCb();
        return;
    }

    const prevCompleted = lastSnapshot?.challenge?.completed ?? false;
    lastSnapshot = engine.update(input);
    engine.render(ctx, frameData.timestamp);

    if (lastSnapshot.challengeJustCompleted && !prevCompleted && completionCb) {
        completionCb();
    }
};
