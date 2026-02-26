import { useRef, useCallback, useEffect } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { handTracker } from '../core/handTracker';
import { VISION_FPS_TARGET } from './constants';
import { computeQualityTier } from './quality';
import { CAMERA_DEBUG } from './debug';

export interface VisionLoopResult {
    handLandmarkerResult: HandLandmarkerResult | null;
    timestamp: number;
}

interface UseVisionLoopOptions {
    enabled: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onResults: (result: VisionLoopResult) => void;
    onFpsUpdate?: (fps: number, qualityTier: 'good' | 'ok' | 'poor') => void;
}

const TARGET_INTERVAL_MS = 1000 / VISION_FPS_TARGET; // ~33 ms at 30 fps

export function useVisionLoop({
    enabled,
    videoRef,
    onResults,
    onFpsUpdate,
}: UseVisionLoopOptions): void {
    // Keep callbacks in refs so the loop function never needs to be recreated
    const onResultsRef = useRef(onResults);
    const onFpsUpdateRef = useRef(onFpsUpdate);
    onResultsRef.current = onResults;
    onFpsUpdateRef.current = onFpsUpdate;

    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // FPS measurement (no per-frame allocations)
    // We count frames in 1-second buckets and keep a 5-bucket rolling window.
    const frameCountRef = useRef(0);
    const bucketStartRef = useRef(0);
    // Fixed-size ring buffer – avoids push/shift allocations
    const fpsBuckets = useRef(new Float32Array(5));
    const fpsBucketIdxRef = useRef(0);
    const fpsBucketFilledRef = useRef(0);
    const lastFpsReportRef = useRef(0);

    // Missing-frame window: 30-entry Uint8 ring buffer (0=missing, 1=detected)
    const detectionWindow = useRef(new Uint8Array(30));
    const detectionIdxRef = useRef(0);
    const detectionFilledRef = useRef(0);

    const runLoop = useCallback(() => {
        if (!enabledRef.current) return;

        const loopStart = Date.now();
        const video = videoRef.current;

        if (video && video.readyState >= 2 && !video.paused && !document.hidden) {
            const result = handTracker.detect(video, loopStart);

            // Update detection ring buffer (no allocation)
            const detected: number = (result !== null && result.landmarks.length > 0) ? 1 : 0;
            detectionWindow.current[detectionIdxRef.current % 30] = detected;
            detectionIdxRef.current++;
            if (detectionFilledRef.current < 30) detectionFilledRef.current++;

            // Deliver results immediately — hot path, no state update
            onResultsRef.current({ handLandmarkerResult: result, timestamp: loopStart });
            frameCountRef.current++;
        }

        // --- FPS measurement (1-second buckets) ---
        const elapsed = loopStart - bucketStartRef.current;
        if (elapsed >= 1000) {
            const fps = Math.round((frameCountRef.current / elapsed) * 1000);
            fpsBuckets.current[fpsBucketIdxRef.current % 5] = fps;
            fpsBucketIdxRef.current++;
            if (fpsBucketFilledRef.current < 5) fpsBucketFilledRef.current++;
            frameCountRef.current = 0;
            bucketStartRef.current = loopStart;
        }

        // Report fps at most 5×/second
        if (loopStart - lastFpsReportRef.current >= 200 && onFpsUpdateRef.current) {
            const filled = fpsBucketFilledRef.current;
            let avgFps = 0;
            if (filled > 0) {
                let sum = 0;
                for (let i = 0; i < filled; i++) sum += fpsBuckets.current[i];
                avgFps = Math.round(sum / filled);
            }

            // Count missing frames in current window
            const windowSize = detectionFilledRef.current;
            let missingCount = 0;
            for (let i = 0; i < windowSize; i++) {
                if (detectionWindow.current[i] === 0) missingCount++;
            }

            const qualityTier = computeQualityTier(avgFps, missingCount);
            onFpsUpdateRef.current(avgFps, qualityTier);
            lastFpsReportRef.current = loopStart;
        }

        // Schedule next tick — account for time spent in detection
        const elapsed2 = Date.now() - loopStart;
        const nextDelay = Math.max(0, TARGET_INTERVAL_MS - elapsed2);
        timerRef.current = setTimeout(runLoop, nextDelay);
    }, []); // Empty deps: everything accessed via refs

    useEffect(() => {
        if (!enabled) {
            if (timerRef.current !== undefined) {
                clearTimeout(timerRef.current);
                timerRef.current = undefined;
            }
            return;
        }

        // Reset FPS state on (re-)enable
        frameCountRef.current = 0;
        bucketStartRef.current = Date.now();
        fpsBuckets.current.fill(0);
        fpsBucketIdxRef.current = 0;
        fpsBucketFilledRef.current = 0;
        detectionWindow.current.fill(0);
        detectionIdxRef.current = 0;
        detectionFilledRef.current = 0;
        lastFpsReportRef.current = 0;

        if (CAMERA_DEBUG) console.log('[VisionLoop] started');

        timerRef.current = setTimeout(runLoop, 0);

        return () => {
            enabledRef.current = false;
            if (timerRef.current !== undefined) {
                clearTimeout(timerRef.current);
                timerRef.current = undefined;
            }
            if (CAMERA_DEBUG) console.log('[VisionLoop] stopped');
        };
    }, [enabled, runLoop]);
}
