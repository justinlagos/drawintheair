/**
 * Tracking Layer - PRIORITY A: Global Stability
 * 
 * Provides stable, filtered interaction state with:
 * - Separated detection and rendering loops
 * - Unified interaction state (single source of truth)
 * - One Euro Filter smoothing
 * - Confidence gating
 * - Jump protection
 * - Pinch detection with hysteresis
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebcam } from '../../core/useWebcam';
import { handTracker } from '../../core/handTracker';
import { DrawingUtils, type HandLandmarkerResult, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { interactionStateManager, type InteractionState } from '../../core/InteractionState';
import { perf } from '../../core/perf';

/**
 * Mirror X coordinate for natural interaction
 * When user moves hand right, cursor should move right on screen
 */
const mirrorX = (x: number): number => 1 - x;

/**
 * Transform landmarks to mirrored coordinate space
 */
const mirrorLandmarks = (landmarks: NormalizedLandmark[]): NormalizedLandmark[] => {
    return landmarks.map(lm => ({
        ...lm,
        x: mirrorX(lm.x)
    }));
};

/**
 * Transform full results to mirrored space
 */
const mirrorResults = (results: HandLandmarkerResult): HandLandmarkerResult => {
    return {
        ...results,
        landmarks: results.landmarks.map(hand => mirrorLandmarks(hand)),
        worldLandmarks: results.worldLandmarks
    };
};

/**
 * TrackingFrameData - Mirrored, filtered, stable interaction state
 */
export interface TrackingFrameData {
    results: HandLandmarkerResult | null;
    confidence: number;
    timestamp: number;
    indexTip: { x: number; y: number } | null;
    thumbTip: { x: number; y: number } | null;
    handScale: number;
    
    // Unified interaction state
    hasHand: boolean;
    penDown: boolean;
    pinchActive: boolean;
    filteredPoint: { x: number; y: number } | null;
    filteredThumbTip: { x: number; y: number } | null;
}

interface TrackingLayerProps {
    onFrame?: (
        ctx: CanvasRenderingContext2D,
        frameData: TrackingFrameData,
        width: number,
        height: number,
        drawingUtils: DrawingUtils | null
    ) => void;
    children?: React.ReactNode | ((frameData: TrackingFrameData) => React.ReactNode);
}

export const TrackingLayer = ({ onFrame, children }: TrackingLayerProps) => {
    const { videoRef, stream, isLoading: isWebcamLoading } = useWebcam();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Store frame data in ref to avoid per-frame React updates
    const lastFrameDataRef = useRef<TrackingFrameData>({
        results: null,
        confidence: 0,
        timestamp: 0,
        indexTip: null,
        thumbTip: null,
        handScale: 0.1,
        hasHand: false,
        penDown: false,
        pinchActive: false,
        filteredPoint: null,
        filteredThumbTip: null
    });
    
    // Only update React state when values actually change (throttled for UI updates)
    const [lastFrameData, setLastFrameData] = useState<TrackingFrameData>(lastFrameDataRef.current);
    const lastUpdateTimeRef = useRef<number>(0);
    const UPDATE_THROTTLE_MS = 100; // Update React state at most every 100ms

    // Separate detection and rendering
    const detectionIntervalRef = useRef<number | undefined>(undefined);
    const lastDetectionTime = useRef<number>(0);
    
    // Get detection rate from perf config
    const detectionRate = perf.getConfig().targetDetectFps;
    const detectionInterval = 1000 / detectionRate;
    
    // Rendering at 60 FPS
    const lastRenderTime = useRef<number>(0);
    const renderFPS = 60;
    const renderInterval = 1000 / renderFPS;
    
    // Store latest interaction state (updated by detection loop, read by render loop)
    const latestInteractionStateRef = useRef<InteractionState | null>(null);
    
    // Convert InteractionState to TrackingFrameData (for compatibility)
    const convertToFrameData = useCallback((state: InteractionState): TrackingFrameData => {
        return {
            results: state.results,
            confidence: state.confidence,
            timestamp: state.timestamp,
            indexTip: state.rawPoint,
            thumbTip: state.rawThumbTip,
            handScale: state.handScale,
            hasHand: state.hasHand,
            penDown: state.penDown,
            pinchActive: state.pinchActive,
            filteredPoint: state.filteredPoint,
            filteredThumbTip: state.filteredThumbTip
        };
    }, []);

    useEffect(() => {
        let animationFrameId: number;
        let drawingUtils: DrawingUtils | null = null;
        let isRunning = true;

        const startTracking = async () => {
            await handTracker.initialize();

            if (canvasRef.current) {
                drawingUtils = new DrawingUtils(canvasRef.current.getContext('2d')!);
            }

            // Detection loop (separate from rendering, stable cadence based on perf tier)
            const detectionLoop = () => {
                if (!isRunning) return;

                const now = Date.now();
                const elapsed = now - lastDetectionTime.current;
                
                // Re-read detection interval in case perf config changed
                const currentDetectionRate = perf.getConfig().targetDetectFps;
                const currentDetectionInterval = 1000 / currentDetectionRate;

                if (elapsed >= currentDetectionInterval && videoRef.current && videoRef.current.readyState >= 2) {
                    lastDetectionTime.current = now - (elapsed % currentDetectionInterval);

                    const timestamp = Date.now();
                    const rawResults = handTracker.detect(videoRef.current, timestamp);
                    
                    // Mirror results for natural interaction
                    const results = rawResults ? mirrorResults(rawResults) : null;
                    
                    // Process through unified interaction state manager
                    const interactionState = interactionStateManager.process(results, timestamp);
                    latestInteractionStateRef.current = interactionState;
                    
                    // Update frame data ref (no React state update here)
                    const frameData = convertToFrameData(interactionState);
                    lastFrameDataRef.current = frameData;
                    
                    // Throttled React state update for UI components that need it
                    if (now - lastUpdateTimeRef.current >= UPDATE_THROTTLE_MS) {
                        setLastFrameData(frameData);
                        lastUpdateTimeRef.current = now;
                    }
                }

                detectionIntervalRef.current = window.setTimeout(detectionLoop, currentDetectionInterval);
            };

            // Render loop (60 FPS, decoupled from detection)
            const renderLoop = (currentTime: number) => {
                if (!isRunning) return;

                const elapsed = currentTime - lastRenderTime.current;
                
                if (elapsed >= renderInterval) {
                    lastRenderTime.current = currentTime - (elapsed % renderInterval);

                    if (canvasRef.current && latestInteractionStateRef.current) {
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d');

                        // Match canvas size to video
                        if (videoRef.current) {
                            if (canvas.width !== videoRef.current.videoWidth || 
                                canvas.height !== videoRef.current.videoHeight) {
                                canvas.width = videoRef.current.videoWidth;
                                canvas.height = videoRef.current.videoHeight;
                            }
                        }

                        // Use latest frame data from ref (already updated by detection loop)
                        const frameData = lastFrameDataRef.current;

                        if (ctx) {
                            // Clear canvas
                            ctx.clearRect(0, 0, canvas.width, canvas.height);

                            // Call frame callback with stable, filtered data
                            if (onFrame) {
                                onFrame(ctx, frameData, canvas.width, canvas.height, drawingUtils);
                            }
                        }
                    }
                }

                animationFrameId = requestAnimationFrame(renderLoop);
            };

            // Start both loops
            detectionLoop();
            animationFrameId = requestAnimationFrame(renderLoop);
        };

        if (stream && !isWebcamLoading) {
            startTracking();
        }

        return () => {
            isRunning = false;
            if (detectionIntervalRef.current) {
                clearTimeout(detectionIntervalRef.current);
            }
            cancelAnimationFrame(animationFrameId);
            interactionStateManager.reset();
        };
    }, [stream, isWebcamLoading, videoRef, onFrame, convertToFrameData, renderInterval]);

    return (
        <div style={{ 
            position: 'relative', 
            width: '100vw', 
            height: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            overflow: 'hidden',
            boxSizing: 'border-box'
        }}>
            {/* Hidden video element */}
            <video
                ref={videoRef}
                style={{
                    position: 'absolute',
                    top: '-9999px',
                    left: '-9999px',
                    width: '100%',
                    height: '100%',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'cover',
                    opacity: 0,
                    visibility: 'hidden'
                }}
                autoPlay
                playsInline
                muted
            />

            {/* Canvas for drawing */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    maxWidth: '100vw',
                    maxHeight: '100vh',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    boxSizing: 'border-box'
                }}
            />

            {/* Children receive stable, filtered frame data (from ref, updated throttled) */}
            {typeof children === 'function' ? children(lastFrameDataRef.current) : children}
        </div>
    );
};
