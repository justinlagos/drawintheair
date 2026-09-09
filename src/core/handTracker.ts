/**
 * HandTracker, wrapper around MediaPipe HandLandmarker with hardening.
 *
 * Resilience guarantees:
 *   • Self-hosted runtime first (own origin, /mediapipe/<version>/), public
 *     CDNs as automatic fallback. See src/core/trackingAssets.ts (DIA-020).
 *   • Pinned WASM version (no `@latest` resolution flakiness, locks to the
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
import { logEvent } from '../lib/analytics';
import { resolveTrackingAssets, type TrackingAssetSource } from './trackingAssets';

// Version pinning and all asset URLs live in ./trackingAssets.ts so the
// self-hosted copy under public/mediapipe/<version>/ and the CDN
// fallback cannot drift apart from each other.

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
    private assetSources: { wasm: TrackingAssetSource; model: TrackingAssetSource } | null = null;

    /** Try GPU first, fall back to CPU. Throws on total failure. */
    async initialize(): Promise<void> {
        if (this.initialized && this.handLandmarker) return;

        const flags = trackingFeatures.getFlags();
        const numHands = flags.enableTwoHandMode ? 2 : 1;
        this.currentNumHands = numHands;

        const tried: HandTrackerDelegate[] = [];

        // Activation funnel: kicked off the MediaPipe init pipeline.
        // Captured here so we can compute init_duration_ms for the
        // succeeded/failed events below.
        const initStartedAt = Date.now();
        logEvent('tracker_init_started', { meta: { num_hands: numHands } });

        // Step 1: Decide where the runtime loads from (own origin first,
        // CDN fallback) and download the model. Then load the WASM
        // fileset. Shared across delegate attempts.
        let vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;
        let modelBuffer: ArrayBuffer;
        let wasmBaseUrl: string;
        try {
            const assets = await resolveTrackingAssets();
            this.assetSources = { wasm: assets.wasm.source, model: assets.model.source };
            modelBuffer = assets.model.buffer;
            wasmBaseUrl = assets.wasm.baseUrl;
            console.log(
                `[HandTracker] assets: wasm=${assets.wasm.source} model=${assets.model.source}`
                + (assets.wasm.selfError ? ` (self wasm skipped: ${assets.wasm.selfError})` : '')
                + (assets.model.selfError ? ` (self model skipped: ${assets.model.selfError})` : ''),
            );
            logEvent('tracker_assets_resolved', {
                meta: {
                    wasm_source: assets.wasm.source,
                    model_source: assets.model.source,
                    self_wasm_error: assets.wasm.selfError ?? null,
                    self_model_error: assets.model.selfError ?? null,
                    resolve_duration_ms: Date.now() - initStartedAt,
                },
            });
        } catch (err) {
            const isTimeout = err instanceof Error && err.message.startsWith('Timeout');
            this.lastError = {
                code: isTimeout ? 'TIMEOUT' : 'MODEL_LOAD',
                message: err instanceof Error ? err.message : String(err),
                triedDelegates: [],
            };
            console.error('[HandTracker]', this.lastError);
            logEvent('tracker_init_failed', {
                value_number: Date.now() - initStartedAt,
                meta: {
                    code: this.lastError.code,
                    message: this.lastError.message,
                    tried_delegates: this.lastError.triedDelegates,
                    stage: 'model_load',
                },
            });
            throw err;
        }

        try {
            vision = await withTimeout(
                FilesetResolver.forVisionTasks(wasmBaseUrl),
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
            logEvent('tracker_init_failed', {
                value_number: Date.now() - initStartedAt,
                meta: {
                    code: this.lastError.code,
                    message: this.lastError.message,
                    tried_delegates: this.lastError.triedDelegates,
                    stage: 'wasm_load',
                    wasm_source: this.assetSources.wasm,
                },
            });
            throw err;
        }

        // The WASM binary itself is fetched inside createFromOptions using
        // the same base URL. MediaPipe copies the model bytes into its own
        // heap, so one buffer is safe to reuse for the CPU retry.
        const modelAssetBuffer = new Uint8Array(modelBuffer);

        // Step 2: Try GPU delegate first.
        try {
            this.handLandmarker = await withTimeout(
                HandLandmarker.createFromOptions(vision, {
                    baseOptions: { modelAssetBuffer, delegate: 'GPU' },
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
            logEvent('tracker_init_succeeded', {
                value_number: Date.now() - initStartedAt,
                meta: {
                    delegate: 'GPU',
                    num_hands: numHands,
                    tried_delegates: ['GPU'],
                    wasm_source: this.assetSources.wasm,
                    model_source: this.assetSources.model,
                },
            });
            return;
        } catch (gpuErr) {
            tried.push('GPU');
            console.warn('[HandTracker] GPU delegate failed, falling back to CPU:', gpuErr);
        }

        // Step 3: CPU fallback.
        try {
            this.handLandmarker = await withTimeout(
                HandLandmarker.createFromOptions(vision, {
                    baseOptions: { modelAssetBuffer, delegate: 'CPU' },
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
            logEvent('tracker_init_succeeded', {
                value_number: Date.now() - initStartedAt,
                meta: {
                    delegate: 'CPU',
                    num_hands: numHands,
                    tried_delegates: tried,
                    fell_back_from_gpu: true,
                    wasm_source: this.assetSources.wasm,
                    model_source: this.assetSources.model,
                },
            });
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
            logEvent('tracker_init_failed', {
                value_number: Date.now() - initStartedAt,
                meta: {
                    code: this.lastError.code,
                    message: this.lastError.message,
                    tried_delegates: tried,
                    stage: 'create_from_options',
                    wasm_source: this.assetSources.wasm,
                    model_source: this.assetSources.model,
                },
            });
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

    /** Where the WASM runtime and model were loaded from ('self' or 'cdn'), or null before init. */
    getAssetSources(): { wasm: TrackingAssetSource; model: TrackingAssetSource } | null {
        return this.assetSources;
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
