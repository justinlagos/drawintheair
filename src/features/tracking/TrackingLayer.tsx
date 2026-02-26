/**
 * Tracking Layer — camera + vision + render
 *
 * Camera is started once. It is never restarted unless the user explicitly
 * triggers restartCamera(). The vision loop runs when the camera is active
 * and the HandLandmarker is initialised. The render loop runs at 60 fps
 * independently.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { DrawingUtils, type HandLandmarkerResult, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { handTracker } from '../../core/handTracker';
import { interactionStateManager, type InteractionState } from '../../core/InteractionState';
import { perf } from '../../core/perf';
import { trackingFeatures } from '../../core/trackingFeatures';
import { DynamicResolutionManager } from '../../core/tracking/DynamicResolution';
import { TrackingDebugOverlay, type DebugMetrics } from '../../components/TrackingDebugOverlay';
import { initCanvasCoordinateMapper, updateCanvasCoordinateMapper, getCanvasCoordinateMapper } from '../../core/canvasCoordinateMapper';
import { getTrackingFlag, isDebugModeEnabled } from '../../core/flags/TrackingFlags';
import { HandGuidanceOverlay } from '../../components/HandGuidanceOverlay';
import { useCameraController } from '../../camera/useCameraController';
import { useVisionLoop } from '../../camera/useVisionLoop';
import { CameraDebugBadge, CAMERA_DEBUG } from '../../camera/debug';
import type { VisionLoopResult } from '../../camera/useVisionLoop';

// ---------------------------------------------------------------------------
// Mirror helpers (front-facing camera — natural left/right orientation)
// ---------------------------------------------------------------------------

const mirrorX = (x: number): number => 1 - x;

const mirrorLandmarks = (landmarks: NormalizedLandmark[]): NormalizedLandmark[] =>
    landmarks.map(lm => ({ ...lm, x: mirrorX(lm.x) }));

const mirrorResults = (results: HandLandmarkerResult): HandLandmarkerResult => ({
    ...results,
    landmarks: results.landmarks.map(hand => mirrorLandmarks(hand)),
    worldLandmarks: results.worldLandmarks,
});

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TrackingFrameData {
    results: HandLandmarkerResult | null;
    confidence: number;
    timestamp: number;
    indexTip: { x: number; y: number } | null;
    thumbTip: { x: number; y: number } | null;
    handScale: number;

    hasHand: boolean;
    penDown: boolean;
    pinchActive: boolean;
    filteredPoint: { x: number; y: number } | null;
    filteredThumbTip: { x: number; y: number } | null;

    predictedPoint: { x: number; y: number } | null;
    pressValue: number;

    // Performance metrics (debug HUD only)
    renderFps?: number;
    detectFps?: number;
    detectionLatencyMs?: number;
}

interface TrackingLayerProps {
    onFrame?: (
        ctx: CanvasRenderingContext2D,
        frameData: TrackingFrameData,
        width: number,
        height: number,
        drawingUtils: DrawingUtils | null,
    ) => void;
    children?: React.ReactNode | ((frameData: TrackingFrameData) => React.ReactNode);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EMPTY_FRAME: TrackingFrameData = {
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
    filteredThumbTip: null,
    predictedPoint: null,
    pressValue: 0.5,
};

export const TrackingLayer = ({ onFrame, children }: TrackingLayerProps) => {
    const { videoRef, state: cameraState, startCamera, updateVisionMetrics } = useCameraController();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Latest frame stored in a ref — avoids per-frame React re-renders
    const lastFrameDataRef = useRef<TrackingFrameData>(EMPTY_FRAME);

    // Throttled state for child components that need frameData reactively
    const [, setLastFrameData] = useState<TrackingFrameData>(EMPTY_FRAME);
    const lastUpdateTimeRef = useRef<number>(0);
    const UPDATE_THROTTLE_MS = 100;

    // Latest interaction state (written by vision loop, read by render loop)
    const latestInteractionStateRef = useRef<InteractionState | null>(null);

    // Dynamic resolution
    const dynamicResolutionRef = useRef<DynamicResolutionManager | null>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    // Render FPS history (read by vision loop for debug metrics)
    const renderFpsHistoryRef = useRef<number[]>([]);

    // Debug metrics (only populated when debug overlay is active)
    const debugMetricsRef = useRef<DebugMetrics | null>(null);

    // Velocity tracking for debug HUD
    const lastRawPointRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
    const velocityRef = useRef<{ x: number; y: number; magnitude: number }>({ x: 0, y: 0, magnitude: 0 });
    const drawLoopTimeRef = useRef<number>(0);

    // No-hand counter for camera notification
    const noHandFramesRef = useRef<number>(0);
    const NO_HAND_THRESHOLD_FRAMES = 90; // ~3 s at 30 fps
    const TOO_CLOSE_HAND_SCALE = 0.16;
    const [cameraNotification, setCameraNotification] = useState<string | null>(null);

    // HandLandmarker tracker readiness
    const [trackerReady, setTrackerReady] = useState(false);

    // Vision loop enabled only when camera is live AND tracker is ready
    const visionEnabled = cameraState.status === 'running' && cameraState.streamActive && trackerReady;

    // ------------------------------------------------------------------
    // Initialise HandLandmarker once
    // ------------------------------------------------------------------
    useEffect(() => {
        // Skip if already initialized by asset preloader
        if (handTracker.isReady()) {
            setTrackerReady(true);
            return;
        }
        
        handTracker.initialize()
            .then(() => setTrackerReady(true))
            .catch(err => {
                if (CAMERA_DEBUG) console.error('[HandTracker] init failed:', err);
            });
    }, []);

    // ------------------------------------------------------------------
    // Start camera once on mount
    // ------------------------------------------------------------------
    useEffect(() => {
        startCamera();
    }, [startCamera]);

    // ------------------------------------------------------------------
    // Initialise dynamic resolution manager when flags are loaded
    // ------------------------------------------------------------------
    useEffect(() => {
        const flags = trackingFeatures.getFlags();
        if (flags.enableDynamicResolution) {
            const config = trackingFeatures.getDynamicResolutionConfig();
            dynamicResolutionRef.current = new DynamicResolutionManager(config);
            offscreenCanvasRef.current = document.createElement('canvas');
            offscreenCtxRef.current = offscreenCanvasRef.current.getContext('2d');
        }
        return () => {
            if (dynamicResolutionRef.current) {
                dynamicResolutionRef.current.reset();
            }
        };
    }, []);

    // ------------------------------------------------------------------
    // Convert InteractionState → TrackingFrameData
    // ------------------------------------------------------------------
    const convertToFrameData = useCallback((state: InteractionState): TrackingFrameData => ({
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
        filteredThumbTip: state.filteredThumbTip,
        predictedPoint: state.predictedPoint,
        pressValue: state.pressValue,
    }), []);

    // ------------------------------------------------------------------
    // Vision loop result handler
    // ------------------------------------------------------------------
    const handleVisionResults = useCallback(({ handLandmarkerResult: rawResults, timestamp }: VisionLoopResult) => {
        const flags = trackingFeatures.getFlags();

        // Mirror for natural (front-facing) interaction
        const results = rawResults ? mirrorResults(rawResults) : null;

        // Process through unified interaction state manager
        const interactionState = interactionStateManager.process(results, timestamp);
        latestInteractionStateRef.current = interactionState;

        // Dynamic resolution metrics
        if (flags.enableDynamicResolution && dynamicResolutionRef.current) {
            const videoEl = videoRef.current;
            if (videoEl) {
                dynamicResolutionRef.current.getDetectionResolution(videoEl.videoWidth, videoEl.videoHeight);
            }
            const avgRenderFps = renderFpsHistoryRef.current.length > 0
                ? renderFpsHistoryRef.current.reduce((a, b) => a + b, 0) / renderFpsHistoryRef.current.length
                : 60;
            dynamicResolutionRef.current.updateMetrics({
                renderFps: avgRenderFps,
                detectFps: 0,
                detectionLatencyMs: 0,
            });
        }

        // Camera notification
        let notification: string | null = null;
        if (!interactionState.hasHand) {
            noHandFramesRef.current++;
            if (noHandFramesRef.current >= NO_HAND_THRESHOLD_FRAMES) {
                notification = '\uD83D\uDC4B Hi! I need to see your hands';
            }
        } else {
            noHandFramesRef.current = 0;
            if (interactionState.handScale > TOO_CLOSE_HAND_SCALE) {
                notification = '\u2728 Step back a little \u2014 you\u2019re doing great!';
            }
        }
        setCameraNotification(_prev => notification);

        // Build frame data
        const frameData = convertToFrameData(interactionState);
        const latestRenderFps = renderFpsHistoryRef.current.length > 0
            ? renderFpsHistoryRef.current[renderFpsHistoryRef.current.length - 1]
            : 60;
        frameData.renderFps = latestRenderFps;
        frameData.detectFps = cameraState.fpsVision;
        frameData.detectionLatencyMs = 0;
        lastFrameDataRef.current = frameData;

        // Velocity (debug only)
        if (frameData.indexTip && lastRawPointRef.current) {
            const dt = (timestamp - lastRawPointRef.current.timestamp) / 1000;
            if (dt > 0) {
                const dx = (frameData.indexTip.x - lastRawPointRef.current.x) / dt;
                const dy = (frameData.indexTip.y - lastRawPointRef.current.y) / dt;
                const magnitude = Math.hypot(dx, dy);
                const alpha = 0.3;
                velocityRef.current = {
                    x: alpha * dx + (1 - alpha) * velocityRef.current.x,
                    y: alpha * dy + (1 - alpha) * velocityRef.current.y,
                    magnitude: alpha * magnitude + (1 - alpha) * velocityRef.current.magnitude,
                };
            }
            lastRawPointRef.current = { x: frameData.indexTip.x, y: frameData.indexTip.y, timestamp };
        } else if (frameData.indexTip) {
            lastRawPointRef.current = { x: frameData.indexTip.x, y: frameData.indexTip.y, timestamp };
        } else {
            lastRawPointRef.current = null;
            velocityRef.current = { x: 0, y: 0, magnitude: 0 };
        }

        // Debug metrics
        const shouldShowMetrics = getTrackingFlag('metricsHud') || flags.showDebugOverlay || isDebugModeEnabled();
        if (shouldShowMetrics) {
            const pinchDistance = frameData.filteredPoint && frameData.filteredThumbTip
                ? Math.hypot(
                    frameData.filteredPoint.x - frameData.filteredThumbTip.x,
                    frameData.filteredPoint.y - frameData.filteredThumbTip.y,
                )
                : 0;
            const deviceHints = {
                deviceMemory: (navigator as unknown as Record<string, number>).deviceMemory || 0,
                hardwareConcurrency: navigator.hardwareConcurrency || 0,
                isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()),
            };
            const qualityLevel = perf.getQualityLevel();
            const qualityLevelName = perf.getQualityLevelName();
            if (getTrackingFlag('gradualQualityScaling')) {
                perf.updatePerformanceMetrics(latestRenderFps, 0);
            }
            debugMetricsRef.current = {
                renderFps: latestRenderFps,
                detectFps: cameraState.fpsVision,
                detectionLatencyMs: 0,
                confidence: frameData.confidence,
                penState: frameData.penDown ? 'down' : 'up',
                pinchDistance,
                pressValue: frameData.pressValue,
                resolutionScale: dynamicResolutionRef.current?.getScaleFactor() || 1.0,
                resolutionIndex: dynamicResolutionRef.current?.getResolutionIndex() || 0,
                rawPoint: frameData.indexTip,
                filteredPoint: frameData.filteredPoint,
                predictedPoint: frameData.predictedPoint,
                velocity: velocityRef.current,
                qualityLevel,
                qualityLevelName,
                deviceHints,
                drawLoopMs: drawLoopTimeRef.current,
                stability: interactionState.stability ? {
                    isStable: interactionState.stability.isStable,
                    stableDuration: interactionState.stability.stableDuration,
                    movementMagnitude: interactionState.stability.movementMagnitude,
                    isHovering: interactionState.stability.isHovering,
                } : undefined,
            };
        }

        // Throttled React state update for child consumers
        const now = Date.now();
        if (now - lastUpdateTimeRef.current >= UPDATE_THROTTLE_MS) {
            setLastFrameData(frameData);
            lastUpdateTimeRef.current = now;
        }
    }, [convertToFrameData, cameraState.fpsVision, videoRef]);

    // Wire vision fps into camera state
    const handleFpsUpdate = useCallback((fps: number, qualityTier: 'good' | 'ok' | 'poor') => {
        updateVisionMetrics(fps, qualityTier);
    }, [updateVisionMetrics]);

    // ------------------------------------------------------------------
    // Vision loop (replaces inline detection setTimeout loop)
    // ------------------------------------------------------------------
    useVisionLoop({
        enabled: visionEnabled,
        videoRef,
        onResults: handleVisionResults,
        onFpsUpdate: handleFpsUpdate,
    });

    // ------------------------------------------------------------------
    // Render loop — 60 fps, fully decoupled from vision loop
    // ------------------------------------------------------------------
    useEffect(() => {
        let animationFrameId: number;
        let isRunning = true;
        let drawingUtils: DrawingUtils | null = null;

        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) drawingUtils = new DrawingUtils(ctx);
        }

        // Render-loop FPS tracking
        let lastRenderFpsTime = Date.now();
        let renderFrameCount = 0;
        let renderFps = 60;
        const RENDER_FPS = 60;
        const RENDER_INTERVAL = 1000 / RENDER_FPS;
        let lastRenderTime = 0;

        // Set up initial canvas coordinate mapper
        if (canvasRef.current) {
            interactionStateManager.setCanvasSize(
                canvasRef.current.width || 1920,
                canvasRef.current.height || 1080,
            );
        }

        const renderLoop = (currentTime: number) => {
            if (!isRunning) return;

            const elapsed = currentTime - lastRenderTime;
            if (elapsed >= RENDER_INTERVAL) {
                const renderStartTime = performance.now();
                lastRenderTime = currentTime - (elapsed % RENDER_INTERVAL);

                // Render FPS
                renderFrameCount++;
                const now = Date.now();
                if (now - lastRenderFpsTime >= 1000) {
                    renderFps = renderFrameCount;
                    renderFrameCount = 0;
                    lastRenderFpsTime = now;
                }
                renderFpsHistoryRef.current.push(renderFps);
                if (renderFpsHistoryRef.current.length > 60) renderFpsHistoryRef.current.shift();

                if (canvasRef.current && latestInteractionStateRef.current) {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');

                    // DPR-aware canvas sizing
                    const rect = canvas.getBoundingClientRect();
                    const dpr = window.devicePixelRatio || 1;
                    const cssWidth = rect.width;
                    const cssHeight = rect.height;
                    const deviceWidth = Math.round(cssWidth * dpr);
                    const deviceHeight = Math.round(cssHeight * dpr);

                    if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
                        canvas.width = deviceWidth;
                        canvas.height = deviceHeight;
                        const mapper = getCanvasCoordinateMapper();
                        if (mapper) {
                            updateCanvasCoordinateMapper({ canvasWidth: deviceWidth, canvasHeight: deviceHeight, cssWidth, cssHeight, devicePixelRatio: dpr });
                        } else {
                            initCanvasCoordinateMapper({ canvasWidth: deviceWidth, canvasHeight: deviceHeight, cssWidth, cssHeight, devicePixelRatio: dpr });
                        }
                        interactionStateManager.setCanvasSize(deviceWidth, deviceHeight);
                    }

                    const frameData = lastFrameDataRef.current;

                    if (ctx) {
                        ctx.setTransform(1, 0, 0, 1, 0, 0);
                        ctx.globalAlpha = 1;
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.filter = 'none';
                        ctx.shadowBlur = 0;
                        ctx.shadowColor = 'transparent';
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        if (onFrame) {
                            try {
                                onFrame(ctx, frameData, canvas.width, canvas.height, drawingUtils);
                            } catch (error) {
                                if (CAMERA_DEBUG) console.error('[RenderLoop] onFrame error:', error);
                            }
                        }
                    }

                    drawLoopTimeRef.current = performance.now() - renderStartTime;
                }
            }

            animationFrameId = requestAnimationFrame(renderLoop);
        };

        animationFrameId = requestAnimationFrame(renderLoop);

        return () => {
            isRunning = false;
            cancelAnimationFrame(animationFrameId);
            interactionStateManager.reset();
            noHandFramesRef.current = 0;
            setCameraNotification(null);
        };
    }, [onFrame]);

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
    return (
        <div style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            overflow: 'hidden',
            boxSizing: 'border-box',
        }}>
            {/* Hidden video element — off-screen, no size attributes */}
            <video
                ref={videoRef}
                style={{
                    position: 'absolute',
                    top: '-9999px',
                    left: '-9999px',
                    opacity: 0,
                    visibility: 'hidden',
                    // Use CSS contain so the browser doesn't allocate a visible surface
                    contain: 'strict',
                }}
                playsInline
                muted
                autoPlay
            />

            {/* Main drawing canvas */}
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
                    boxSizing: 'border-box',
                    zIndex: 100,
                }}
            />

            {/* Children receive frame data via render-prop or as static children */}
            {typeof children === 'function' ? children(lastFrameDataRef.current) : children}

            {/* Camera / positioning notification */}
            {cameraNotification && (
                <>
                    <style>{`
                        @keyframes notificationSlideUp {
                            from { opacity: 0; transform: translateY(20px); }
                            to   { opacity: 1; transform: translateY(0);    }
                        }
                    `}</style>
                    <div style={{
                        position: 'absolute',
                        bottom: 'clamp(18px, 3vh, 32px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 150,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'linear-gradient(145deg, rgba(30,26,60,0.92) 0%, rgba(18,14,45,0.88) 100%)',
                        borderRadius: '9999px',
                        padding: '14px 24px',
                        border: '1.5px solid rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.95)',
                        fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                        fontWeight: 600,
                        textAlign: 'center',
                        pointerEvents: 'none',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
                        animation: 'notificationSlideUp 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                        maxWidth: '90%',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.2px',
                    }}>
                        {cameraNotification}
                    </div>
                </>
            )}

            {/* Visual guidance overlay */}
            {getTrackingFlag('visualGuidance') && latestInteractionStateRef.current && (
                <HandGuidanceOverlay
                    hasHand={latestInteractionStateRef.current.hasHand}
                    confidence={latestInteractionStateRef.current.confidence}
                    filteredPoint={latestInteractionStateRef.current.filteredPoint}
                    minConfidence={0.6}
                />
            )}

            {/* Debug overlay */}
            {(getTrackingFlag('metricsHud') || trackingFeatures.getFlags().showDebugOverlay || isDebugModeEnabled()) && (
                <TrackingDebugOverlay
                    metrics={debugMetricsRef.current}
                    canvasWidth={canvasRef.current?.width || 1920}
                    canvasHeight={canvasRef.current?.height || 1080}
                />
            )}

            {/* Camera debug badge (visible only with ?debug=camera) */}
            <CameraDebugBadge state={cameraState} />
        </div>
    );
};
