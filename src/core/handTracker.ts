/**
 * HandTracker — wrapper around MediaPipe HandLandmarker with hardening.
 *
 * Resilience guarantees:
 *   • Pinned WASM URL (no `@latest` resolution flakiness — locks to the
 *     exact version installed in package.json).
 *   • GPU delegate is preferred but falls back to CPU on failure, so the
 *     app works on devices without WebGL2 / hardware acceleration.
 *   • initialize() races against a 15-second timeout so the UI never
 *     hangs forever waiting for a stalled CDN download.
 *   • Errors are captured to `lastError` for read-out by UI diagnostics.
 *
 * Why this matters: any failure in MediaPipe init was previously silent
 * (caught and logged only when CAMERA_DEBUG=true), which meant kids on
 * affected devices saw "Looking for your hand…" forever with zero clue
 * what was wrong. See docs/HAND_TRACKING_AUDIT.md.
 */

import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { trackingFeatures } from './trackingFeatures';

// Pin to the version actually resolved in package-lock.json (the
// installed JS). If we pin to the package.json range instead, the WASM
// can drift to a different version than the JS — and the JS↔WASM API
// contract is version-locked, so a mismatch breaks createFromOptions.
//
// To verify after a `npm install`:
//   grep -A1 '"node_modules/@mediapipe/tasks-vision"' package-lock.json
// and update this constant if the version changed.
const TASKS_VISION_VERSION = '0.10.32';
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const INIT_TIMEOUT_MS = 15_000;

export type HandTrackerDelegate = 'GPU' | 'CPU';

export interface HandTrackerError {
    /** A short identifier we can show in UI / log to analytics. */
    code: 'WASM_LOAD' | 'MODEL_LOAD' | 'GPU_INIT' | 'CPU_INIT' | 'TIMEOUT' | 'UNKNOWN';
    message: string;
    /** Whichever delegate(s) we tried before giving up. */
    triedDelegates: HandTrackerDelegate[];
}

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => {
            reject(new Error(`Timeout after ${ms}ms: ${label}`));
        }, ms);
        promise.then(
            (v) => { clearTimeout(t); resolve(v); },
            (e) => { clearTimeout(t); reject(e); },
        );
    });
};

export class HandTracker {
    private handLandmarker: HandLandmarker | null = null;
    private runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';
    private currentNumHands: number = 1;
    private initialized: boolean = false;
    private activeDelegate: HandTrackerDelegate | null = null;
    private lastError: HandTrackerError | null = null;

    /** Try GPU first, fall back to CPU. Throws on total failure. */
    async initialize(): Promise<void> {
        if (this.initialized && this.handLandmarker) return;

        const flags = trackingFeatures.getFlags();
        const numHands = flags.enableTwoHandMode ? 2 : 1;
        this.currentNumHands = numHands;

        const tried: HandTrackerDelegate[] = [];

        // Step 1: Load WASM. This is shared across delegate attempts.
        let vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;
        try {
            vision = await withTimeout(
                FilesetResolver.forVisionTasks(WASM_BASE_URL),
                INIT_TIMEOUT_MS,
                'forVisionTasks',
            );
        } catch (err) {
            const isTimeout = err instanceof Error && err.message.startsWith('Timeout');
            this.lastError = {
                code: isTimeout ? 'TIMEOUT' : 'WASM_LOAD',
                message: err instanceof Error ? err.message : String(err),
                triedDelegates: [],
            };
            console.error('[HandTracker]', this.lastError);
            throw err;
        }

        // Step 2: Try GPU delegate first.
        try {
            this.handLandmarker = await withTimeout(
                HandLandmarker.createFromOptions(vision, {
                    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
                    runningMode: this.runningMode,
                    numHands,
                    minHandDetectionConfidence: 0.5,
                    minHandPresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                }),
                INIT_TIMEOUT_MS,
                'createFromOptions(GPU)',
            );
            this.activeDelegate = 'GPU';
            tried.push('GPU');
            this.initialized = true;
            this.lastError = null;
            console.log(`[HandTracker] initialised (delegate=GPU, numHands=${numHands})`);
            return;
        } catch (gpuErr) {
            tried.push('GPU');
            console.warn('[HandTracker] GPU delegate failed, falling back to CPU:', gpuErr);
        }

        // Step 3: CPU fallback.
        try {
            this.handLandmarker = await withTimeout(
                HandLandmarker.createFromOptions(vision, {
                    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
                    runningMode: this.runningMode,
                    numHands,
                    minHandDetectionConfidence: 0.5,
                    minHandPresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                }),
                INIT_TIMEOUT_MS,
                'createFromOptions(CPU)',
            );
            this.activeDelegate = 'CPU';
            tried.push('CPU');
            this.initialized = true;
            this.lastError = null;
            console.log(`[HandTracker] initialised (delegate=CPU fallback, numHands=${numHands})`);
            return;
        } catch (cpuErr) {
            tried.push('CPU');
            const isTimeout = cpuErr instanceof Error && cpuErr.message.startsWith('Timeout');
            this.lastError = {
                code: isTimeout ? 'TIMEOUT' : (tried[0] === 'GPU' ? 'CPU_INIT' : 'GPU_INIT'),
                message: cpuErr instanceof Error ? cpuErr.message : String(cpuErr),
                triedDelegates: tried,
            };
            console.error('[HandTracker] both GPU and CPU init failed:', this.lastError);
            throw cpuErr;
        }
    }

    isReady(): boolean {
        return this.initialized && this.handLandmarker !== null;
    }

    /** Returns the delegate that successfully initialised, or null. */
    getActiveDelegate(): HandTrackerDelegate | null {
        return this.activeDelegate;
    }

    /** Returns the most recent init error, or null if init succeeded. */
    getLastError(): HandTrackerError | null {
        return this.lastError;
    }

    /** Reinitialise with a different numHands count (closes existing). */
    async reinitialize(numHands: number): Promise<void> {
        if (this.currentNumHands === numHands && this.handLandmarker) return;
        this.close();
        this.currentNumHands = numHands;
        await this.initialize();
    }

    detect(video: HTMLVideoElement, startTimeMs: number): HandLandmarkerResult | null {
        if (!this.handLandmarker) return null;
        try {
            return this.handLandmarker.detectForVideo(video, startTimeMs);
        } catch (e) {
            console.error('[HandTracker] detection error:', e);
            return null;
        }
    }

    close() {
        this.handLandmarker?.close();
        this.handLandmarker = null;
        this.initialized = false;
        this.activeDelegate = null;
    }
}

export const handTracker = new HandTracker();
