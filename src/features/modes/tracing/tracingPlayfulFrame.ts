/**
 * Playful Tracing frame adapter — bridges the PlayfulTracingEngine to the
 * shared TrackingLayer `onFrame` contract and the existing tracingProgress
 * store (so packs, unlocks and saved learner state stay compatible).
 *
 * This module is mounted ONLY when the `tracingPlayfulUiV1` flag is on. When
 * the flag is off, App routes the legacy preWritingLogic instead — the two
 * engines never run together (one onFrame, one render loop).
 */

import type { TrackingFrameData } from '../../../features/tracking/TrackingLayer';
import type { DrawingUtils } from '@mediapipe/tasks-vision';
import { perf } from '../../../core/perf';
import { isCountdownActive } from '../../../core/countdownService';
import { getCurrentActivity, completeCurrent, advance as advanceProgress, setSection } from './playfulProgress';
import { getSafeRegion, type PerfTier } from './tracingThemes';
import { PlayfulTracingEngine, type EngineSnapshot } from './playfulTracingEngine';

let engine: PlayfulTracingEngine | null = null;
let canvasW = 0;
let canvasH = 0;
let completionCb: (() => void) | null = null;
let lastSnapshot: EngineSnapshot | null = null;
let initFailed = false;

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

const buildEngine = (w: number, h: number): PlayfulTracingEngine | null => {
    const activity = getCurrentActivity();
    if (!activity) return null;
    const region = getSafeRegion(w, h);
    const e = new PlayfulTracingEngine(activity, w, h, region, {
        perfTier: perfTier(),
        reducedMotion: reducedMotion(),
    });
    e.setCompletionCallback(() => {
        completeCurrent();
        if (completionCb) completionCb();
    });
    return e;
};

/** True if the engine could not initialise (App uses this to fall back). */
export const playfulInitFailed = (): boolean => initFailed;

export const initPlayfulTracing = (width: number, height: number): void => {
    canvasW = width;
    canvasH = height;
    try {
        engine = buildEngine(width, height);
        initFailed = engine === null;
    } catch (err) {
        // Surface the failure; App's withFeatureFlag guard falls back to legacy.
        console.error('[tracingPlayful] init failed:', err);
        engine = null;
        initFailed = true;
    }
};

export const setPlayfulCompletionCallback = (cb: (() => void) | null): void => {
    completionCb = cb;
};

export const reloadPlayfulActivity = (): void => {
    engine = buildEngine(canvasW, canvasH);
};

export const resetPlayfulLevel = (): void => {
    engine?.reset();
};

/** Advance to the next activity (wraps around — never gets stuck). */
export const nextPlayfulLevel = (): boolean => {
    advanceProgress();
    reloadPlayfulActivity();
    return true;
};

/** Jump straight to a section (Warm-up / Shapes / Letters / Numbers). */
export const setPlayfulSection = (pack: number, index = 0): void => {
    setSection(pack, index);
    reloadPlayfulActivity();
};

export const getPlayfulSnapshot = (): EngineSnapshot | null => lastSnapshot;

/**
 * onFrame callback for TrackingLayer. Maps the shared filtered interaction
 * point + pinch into the engine and renders. No analytics here — telemetry is
 * fired from the React layer, never inside the 60fps loop.
 */
export const playfulTracingFrame = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null
): void => {
    if (!engine || canvasW !== width || canvasH !== height) {
        canvasW = width;
        canvasH = height;
        engine = buildEngine(width, height);
        if (!engine) return;
    }

    // During the 3-2-1 countdown, show the scene but accept no input yet.
    const countdown = isCountdownActive(frameData.timestamp);

    lastSnapshot = engine.update({
        pointer: frameData.filteredPoint,
        pinch: frameData.pinchActive && !countdown,
        hasHand: frameData.hasHand,
        now: frameData.timestamp,
    });
    engine.render(ctx, frameData.timestamp);
};
