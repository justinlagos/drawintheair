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
import { trackingFeatures } from '../../core/trackingFeatures';
import { DynamicResolutionManager } from '../../core/tracking/DynamicResolution';
import { TrackingDebugOverlay, type DebugMetrics } from '../../components/TrackingDebugOverlay';
import { initCanvasCoordinateMapper, updateCanvasCoordinateMapper, getCanvasCoordinateMapper } from '../../core/canvasCoordinateMapper';
import { getTrackingFlag, isDebugModeEnabled } from '../../core/flags/TrackingFlags';
import { HandGuidanceOverlay } from '../../components/HandGuidanceOverlay';

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
    
    // Enhanced features
    predictedPoint: { x: number; y: number } | null;
    pressValue: number;
    
    // Performance metrics (for debug HUD)
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
        filteredThumbTip: null,
        predictedPoint: null,
        pressValue: 0.5
    });
    
    // Only update React state when values actually change (throttled for UI updates)
    // Note: lastFrameData state is kept for potential future use but currently unused
    const [, setLastFrameData] = useState<TrackingFrameData>(lastFrameDataRef.current);
    const lastUpdateTimeRef = useRef<number>(0);
    const UPDATE_THROTTLE_MS = 100; // Update React state at most every 100ms

    // Separate detection and rendering
    const detectionIntervalRef = useRef<number | undefined>(undefined);
    const lastDetectionTime = useRef<number>(0);
    
    // Rendering at 60 FPS
    const lastRenderTime = useRef<number>(0);
    const renderFPS = 60;
    const renderInterval = 1000 / renderFPS;
    
    // Store latest interaction state (updated by detection loop, read by render loop)
    const latestInteractionStateRef = useRef<InteractionState | null>(null);
    
    // Dynamic resolution manager
    const dynamicResolutionRef = useRef<DynamicResolutionManager | null>(null);
    
    // Performance metrics for debug overlay
    const debugMetricsRef = useRef<DebugMetrics | null>(null);
    const renderFpsHistory = useRef<number[]>([]);
    const detectFpsHistory = useRef<number[]>([]);
    const detectionLatencyHistory = useRef<number[]>([]);
    
    // Enhanced metrics tracking (Part E)
    const lastRawPointRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
    const velocityRef = useRef<{ x: number; y: number; magnitude: number }>({ x: 0, y: 0, magnitude: 0 });
    const drawLoopTimeRef = useRef<number>(0);
    
    // Kid-friendly framing guidance
    const [framingGuidance, setFramingGuidance] = useState<string | null>(null);
    const lastGuidanceTime = useRef<number>(0);
    const guidanceTimeoutRef = useRef<number | undefined>(undefined);
    const GUIDANCE_COOLDOWN_MS = 2000; // Don't spam guidance messages
    
    // Camera connection and positioning notifications
    const [cameraNotification, setCameraNotification] = useState<string | null>(null);
    const noHandFramesRef = useRef<number>(0);
    const NO_HAND_THRESHOLD_FRAMES = 90; // ~3 seconds at 30fps detection
    const TOO_CLOSE_HAND_SCALE = 0.16; // Hand scale threshold for "too close"
    
    // Offscreen canvas for dynamic resolution scaling
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    
    // Performance logging refs
    const performanceLogRef = useRef<Array<{
        timestamp: number;
        renderFps: number;
        detectFps: number;
        detectionLatencyMs: number;
        resolutionScale: number;
        resolutionIndex: number;
    }>>([]);
    const sessionStartTimeRef = useRef<number>(0);
    
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
            filteredThumbTip: state.filteredThumbTip,
            predictedPoint: state.predictedPoint,
            pressValue: state.pressValue
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
            
            // Initialize dynamic resolution manager if enabled
            const flags = trackingFeatures.getFlags();
            if (flags.enableDynamicResolution) {
                const config = trackingFeatures.getDynamicResolutionConfig();
                dynamicResolutionRef.current = new DynamicResolutionManager(config);
                
                // Create offscreen canvas for downscaled detection
                offscreenCanvasRef.current = document.createElement('canvas');
                offscreenCtxRef.current = offscreenCanvasRef.current.getContext('2d');
            }
            
            // Set canvas size for interaction state manager
            if (canvasRef.current) {
                interactionStateManager.setCanvasSize(
                    canvasRef.current.width || 1920,
                    canvasRef.current.height || 1080
                );
            }

            // Performance tracking
            let lastDetectTime = Date.now();
            let detectFrameCount = 0;
            let detectFps = 0;
            let detectionLatency = 0;
            
            // Performance logging for 2-minute run analysis
            performanceLogRef.current = [];
            sessionStartTimeRef.current = Date.now();
            const LOG_INTERVAL_MS = 1000; // Log every second
            let lastLogTime = Date.now();
            
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
                    
                    const detectStartTime = performance.now();
                    const timestamp = Date.now();
                    
                    // Dynamic resolution: get scaled video frame if enabled
                    // NOTE: MediaPipe's detectForVideo() currently requires a video element, not a canvas.
                    // The dynamic resolution scaling infrastructure is in place, but cannot be fully utilized
                    // until MediaPipe supports canvas/ImageData input or we find a workaround.
                    // For now, we track metrics and can adjust camera resolution via useWebcam constraints.
                    let videoElement: HTMLVideoElement = videoRef.current;
                    if (flags.enableDynamicResolution && dynamicResolutionRef.current && 
                        offscreenCanvasRef.current && offscreenCtxRef.current && videoRef.current) {
                        // Track resolution state for debug overlay
                        // Actual scaling would require MediaPipe API changes or workaround
                        const videoWidth = videoRef.current.videoWidth;
                        const videoHeight = videoRef.current.videoHeight;
                        dynamicResolutionRef.current.getDetectionResolution(videoWidth, videoHeight);
                        
                        // TODO: When MediaPipe supports canvas/ImageData input:
                        // 1. Draw video to offscreen canvas at detection resolution
                        // 2. Convert canvas to ImageData or createImageBitmap
                        // 3. Pass to MediaPipe detection
                        videoElement = videoRef.current; // Use original for now
                    }
                    
                    const rawResults = handTracker.detect(videoElement, timestamp);
                    const detectEndTime = performance.now();
                    detectionLatency = detectEndTime - detectStartTime;
                    
                    // Update detection FPS
                    detectFrameCount++;
                    if (now - lastDetectTime >= 1000) {
                        detectFps = detectFrameCount;
                        detectFrameCount = 0;
                        lastDetectTime = now;
                    }
                    detectFpsHistory.current.push(detectFps);
                    if (detectFpsHistory.current.length > 60) {
                        detectFpsHistory.current.shift();
                    }
                    detectionLatencyHistory.current.push(detectionLatency);
                    if (detectionLatencyHistory.current.length > 60) {
                        detectionLatencyHistory.current.shift();
                    }
                    
                    // Mirror results for natural interaction
                    const results = rawResults ? mirrorResults(rawResults) : null;
                    
                    // Process through unified interaction state manager
                    const interactionState = interactionStateManager.process(results, timestamp);
                    latestInteractionStateRef.current = interactionState;
                    
                    // Update dynamic resolution metrics if enabled
                    if (flags.enableDynamicResolution && dynamicResolutionRef.current) {
                        // Calculate render FPS (will be updated in render loop)
                        const avgRenderFps = renderFpsHistory.current.length > 0
                            ? renderFpsHistory.current.reduce((a, b) => a + b, 0) / renderFpsHistory.current.length
                            : 60;
                        const avgDetectFps = detectFpsHistory.current.length > 0
                            ? detectFpsHistory.current.reduce((a, b) => a + b, 0) / detectFpsHistory.current.length
                            : detectFps;
                        const avgLatency = detectionLatencyHistory.current.length > 0
                            ? detectionLatencyHistory.current.reduce((a, b) => a + b, 0) / detectionLatencyHistory.current.length
                            : detectionLatency;
                        
                        dynamicResolutionRef.current.updateMetrics({
                            renderFps: avgRenderFps,
                            detectFps: avgDetectFps,
                            detectionLatencyMs: avgLatency,
                        });
                    }
                    
                    // Performance logging (every second)
                    if (now - lastLogTime >= LOG_INTERVAL_MS) {
                        const avgRenderFps = renderFpsHistory.current.length > 0
                            ? renderFpsHistory.current.reduce((a, b) => a + b, 0) / renderFpsHistory.current.length
                            : 60;
                        const avgDetectFps = detectFpsHistory.current.length > 0
                            ? detectFpsHistory.current.reduce((a, b) => a + b, 0) / detectFpsHistory.current.length
                            : detectFps;
                        const avgLatency = detectionLatencyHistory.current.length > 0
                            ? detectionLatencyHistory.current.reduce((a, b) => a + b, 0) / detectionLatencyHistory.current.length
                            : detectionLatency;
                        
                        const logEntry = {
                            timestamp: now,
                            renderFps: avgRenderFps,
                            detectFps: avgDetectFps,
                            detectionLatencyMs: avgLatency,
                            resolutionScale: dynamicResolutionRef.current?.getScaleFactor() || 1.0,
                            resolutionIndex: dynamicResolutionRef.current?.getResolutionIndex() || 0,
                        };
                        
                        performanceLogRef.current.push(logEntry);
                        
                        // Keep only last 2 minutes of logs (120 entries at 1 per second)
                        if (performanceLogRef.current.length > 120) {
                            performanceLogRef.current.shift();
                        }
                        
                        lastLogTime = now;
                    }
                    
                    // Kid-friendly framing guidance: detect if hand is too close to edges
                    const point = interactionState.filteredPoint;
                    const edgeThreshold = 0.15; // 15% from edges
                    let guidance: string | null = null;
                    
                    if (interactionState.hasHand && point) {
                        // Check if hand is too close to edges
                        if (point.x < edgeThreshold) {
                            guidance = 'Move hands to the centre';
                        } else if (point.x > 1 - edgeThreshold) {
                            guidance = 'Move hands to the centre';
                        } else if (point.y < edgeThreshold) {
                            guidance = 'Step back a little';
                        } else if (point.y > 1 - edgeThreshold) {
                            guidance = 'Step back a little';
                        }
                    }
                    
                    // Clear any existing timeout
                    if (guidanceTimeoutRef.current !== undefined) {
                        clearTimeout(guidanceTimeoutRef.current);
                        guidanceTimeoutRef.current = undefined;
                    }
                    
                    // Update guidance if needed
                    if (guidance && guidance !== framingGuidance) {
                        // Only show new guidance if cooldown has passed
                        if (now - lastGuidanceTime.current >= GUIDANCE_COOLDOWN_MS) {
                            setFramingGuidance(guidance);
                            lastGuidanceTime.current = now;
                        }
                    } else if (!guidance && framingGuidance) {
                        // Clear guidance immediately when hands move to center
                        setFramingGuidance(null);
                    }
                    
                    // Camera connection and positioning notifications
                    let notification: string | null = null;
                    
                    if (!interactionState.hasHand) {
                        // No hand detected - track frames
                        noHandFramesRef.current++;
                        if (noHandFramesRef.current >= NO_HAND_THRESHOLD_FRAMES) {
                            notification = 'Make sure your hands are visible to the camera';
                        } else {
                            // Not enough frames yet - clear notification if it was showing
                            notification = null;
                        }
                    } else {
                        // Hand detected - reset counter
                        noHandFramesRef.current = 0;
                        
                        // Check if too close to camera (large handScale)
                        if (interactionState.handScale > TOO_CLOSE_HAND_SCALE) {
                            notification = 'Step back a bit for better tracking';
                        } else {
                            // Hand is detected and not too close - explicitly clear notification
                            notification = null;
                        }
                    }
                    
                    // Update notification - always set to current value to ensure it clears when null
                    // Use functional update to avoid stale closure issues
                    setCameraNotification(prev => {
                        // Always update to current notification value (null clears it)
                        return notification;
                    });
                    
                    // Update frame data ref (no React state update here)
                    const frameData = convertToFrameData(interactionState);
                    // Add FPS metrics to frame data
                    const avgRenderFps = renderFpsHistory.current.length > 0
                        ? renderFpsHistory.current[renderFpsHistory.current.length - 1]
                        : 60;
                    frameData.renderFps = avgRenderFps;
                    frameData.detectFps = detectFps;
                    frameData.detectionLatencyMs = detectionLatency;
                    lastFrameDataRef.current = frameData;
                    
                    // Calculate velocity (for enhanced metrics)
                    if (frameData.indexTip && lastRawPointRef.current) {
                        const dt = (timestamp - lastRawPointRef.current.timestamp) / 1000; // seconds
                        if (dt > 0) {
                            const dx = (frameData.indexTip.x - lastRawPointRef.current.x) / dt;
                            const dy = (frameData.indexTip.y - lastRawPointRef.current.y) / dt;
                            const magnitude = Math.hypot(dx, dy);
                            // EMA smoothing for velocity
                            const alpha = 0.3;
                            velocityRef.current = {
                                x: alpha * dx + (1 - alpha) * velocityRef.current.x,
                                y: alpha * dy + (1 - alpha) * velocityRef.current.y,
                                magnitude: alpha * magnitude + (1 - alpha) * velocityRef.current.magnitude
                            };
                        }
                        lastRawPointRef.current = { x: frameData.indexTip.x, y: frameData.indexTip.y, timestamp };
                    } else if (frameData.indexTip) {
                        lastRawPointRef.current = { x: frameData.indexTip.x, y: frameData.indexTip.y, timestamp };
                    } else {
                        lastRawPointRef.current = null;
                        velocityRef.current = { x: 0, y: 0, magnitude: 0 };
                    }
                    
                    // Update debug metrics (show if flag enabled OR existing debug param)
                    const shouldShowMetrics = getTrackingFlag('metricsHud') || flags.showDebugOverlay || isDebugModeEnabled();
                    if (shouldShowMetrics) {
                        const pinchDistance = frameData.filteredPoint && frameData.filteredThumbTip
                            ? Math.hypot(
                                frameData.filteredPoint.x - frameData.filteredThumbTip.x,
                                frameData.filteredPoint.y - frameData.filteredThumbTip.y
                            )
                            : 0;
                        
                        // Get device hints
                        const deviceHints = {
                            deviceMemory: (navigator as any).deviceMemory || 0,
                            hardwareConcurrency: navigator.hardwareConcurrency || 0,
                            isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase())
                        };
                        
                        // Get quality level (Part E - Phase 8)
                        const qualityLevel = perf.getQualityLevel();
                        const qualityLevelName = perf.getQualityLevelName();
                        
                        // Update performance metrics for gradual scaling
                        if (getTrackingFlag('gradualQualityScaling')) {
                            perf.updatePerformanceMetrics(avgRenderFps, detectionLatency);
                        }
                        
                        debugMetricsRef.current = {
                            renderFps: renderFpsHistory.current.length > 0
                                ? renderFpsHistory.current[renderFpsHistory.current.length - 1]
                                : 60,
                            detectFps: detectFps,
                            detectionLatencyMs: detectionLatency,
                            confidence: frameData.confidence,
                            penState: frameData.penDown ? 'down' : 'up',
                            pinchDistance: pinchDistance,
                            pressValue: frameData.pressValue,
                            resolutionScale: dynamicResolutionRef.current?.getScaleFactor() || 1.0,
                            resolutionIndex: dynamicResolutionRef.current?.getResolutionIndex() || 0,
                            rawPoint: frameData.indexTip,
                            filteredPoint: frameData.filteredPoint,
                            predictedPoint: frameData.predictedPoint,
                            // Enhanced metrics (Part E)
                            velocity: velocityRef.current,
                            qualityLevel: qualityLevel,
                            qualityLevelName: qualityLevelName,
                            deviceHints: deviceHints,
                            drawLoopMs: drawLoopTimeRef.current,
                            // Stability (Part E - Phase 6)
                            stability: interactionState.stability ? {
                                isStable: interactionState.stability.isStable,
                                stableDuration: interactionState.stability.stableDuration,
                                movementMagnitude: interactionState.stability.movementMagnitude,
                                isHovering: interactionState.stability.isHovering
                            } : undefined
                        };
                    }
                    
                    // Throttled React state update for UI components that need it
                    if (now - lastUpdateTimeRef.current >= UPDATE_THROTTLE_MS) {
                        setLastFrameData(frameData);
                        lastUpdateTimeRef.current = now;
                    }
                }

                detectionIntervalRef.current = window.setTimeout(detectionLoop, currentDetectionInterval);
            };

            // Render loop (60 FPS, decoupled from detection)
            let lastRenderFpsTime = Date.now();
            let renderFrameCount = 0;
            let renderFps = 60;
            
            const renderLoop = (currentTime: number) => {
                if (!isRunning) return;

                const elapsed = currentTime - lastRenderTime.current;
                
                if (elapsed >= renderInterval) {
                    const renderStartTime = performance.now();
                    lastRenderTime.current = currentTime - (elapsed % renderInterval);
                    
                    // Update render FPS
                    renderFrameCount++;
                    const now = Date.now();
                    if (now - lastRenderFpsTime >= 1000) {
                        renderFps = renderFrameCount;
                        renderFrameCount = 0;
                        lastRenderFpsTime = now;
                    }
                    renderFpsHistory.current.push(renderFps);
                    if (renderFpsHistory.current.length > 60) {
                        renderFpsHistory.current.shift();
                    }

                    if (canvasRef.current && latestInteractionStateRef.current) {
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d');

                        // Phase 3: Unified coordinate mapping - set up canvas with DPR scaling
                        // Canvas CSS size matches layout (viewport), device size = CSS * DPR
                        const rect = canvas.getBoundingClientRect();
                        const dpr = window.devicePixelRatio || 1;
                        const cssWidth = rect.width;
                        const cssHeight = rect.height;
                        const deviceWidth = Math.round(cssWidth * dpr);
                        const deviceHeight = Math.round(cssHeight * dpr);

                        // Update canvas device size if changed
                        if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
                            canvas.width = deviceWidth;
                            canvas.height = deviceHeight;
                            
                            // Initialize or update global coordinate mapper
                            const mapper = getCanvasCoordinateMapper();
                            if (mapper) {
                                updateCanvasCoordinateMapper({
                                    canvasWidth: deviceWidth,
                                    canvasHeight: deviceHeight,
                                    cssWidth,
                                    cssHeight,
                                    devicePixelRatio: dpr
                                });
                            } else {
                                initCanvasCoordinateMapper({
                                    canvasWidth: deviceWidth,
                                    canvasHeight: deviceHeight,
                                    cssWidth,
                                    cssHeight,
                                    devicePixelRatio: dpr
                                });
                            }
                            
                            // Update interaction state manager with new canvas size
                            interactionStateManager.setCanvasSize(deviceWidth, deviceHeight);
                        }

                        // Use latest frame data from ref (already updated by detection loop)
                        const frameData = lastFrameDataRef.current;

                        if (ctx) {
                            // Phase 4: Reset canvas state before clearing
                            // (clearRect clears pixels, but state remains)
                            ctx.setTransform(1, 0, 0, 1, 0, 0);
                            ctx.globalAlpha = 1;
                            ctx.globalCompositeOperation = 'source-over';
                            ctx.filter = 'none';
                            ctx.shadowBlur = 0;
                            ctx.shadowColor = 'transparent';
                            
                            // Clear canvas
                            ctx.clearRect(0, 0, canvas.width, canvas.height);

                            // Call frame callback with stable, filtered data
                            if (onFrame) {
                                try {
                                    onFrame(ctx, frameData, canvas.width, canvas.height, drawingUtils);
                                } catch (error) {
                                    console.error('Error in onFrame callback:', error);
                                }
                            }
                        }
                        
                        // Track draw loop time
                        const renderEndTime = performance.now();
                        drawLoopTimeRef.current = renderEndTime - renderStartTime;
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
            if (guidanceTimeoutRef.current !== undefined) {
                clearTimeout(guidanceTimeoutRef.current);
            }
            cancelAnimationFrame(animationFrameId);
            interactionStateManager.reset();
            if (dynamicResolutionRef.current) {
                dynamicResolutionRef.current.reset();
            }
            // Reset notification state
            noHandFramesRef.current = 0;
            setCameraNotification(null);
            setFramingGuidance(null);
            
            // Performance logging data is collected but not currently used
            // Can be enabled for debugging/analytics in the future
            // const performanceLog = performanceLogRef.current;
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
                    boxSizing: 'border-box',
                    zIndex: 100 // High enough to be above game mode overlays (which are z-index 1-2) but below UI elements (200-9999)
                }}
            />

            {/* Children receive stable, filtered frame data (from ref, updated throttled) */}
            {typeof children === 'function' ? children(lastFrameDataRef.current) : children}
            
            {/* Kid-friendly framing guidance */}
            {framingGuidance && (
                <>
                    <style>{`
                        @keyframes guidanceFadeIn {
                            from {
                                opacity: 0;
                                transform: translate(-50%, -50%) scale(0.9);
                            }
                            to {
                                opacity: 1;
                                transform: translate(-50%, -50%) scale(1);
                            }
                        }
                    `}</style>
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 200,
                        background: 'rgba(15, 12, 41, 0.9)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        padding: '16px 24px',
                        border: '2px solid rgba(255, 217, 61, 0.5)',
                        color: '#FFD93D',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        textAlign: 'center',
                        pointerEvents: 'none',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        animation: 'guidanceFadeIn 0.3s ease-out'
                    }}>
                        {framingGuidance}
                    </div>
                </>
            )}
            
            {/* Subtle camera connection/positioning notification */}
            {cameraNotification && (
                <>
                    <style>{`
                        @keyframes notificationSlideUp {
                            from {
                                opacity: 0;
                                transform: translateY(20px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                        @keyframes notificationSlideDown {
                            from {
                                opacity: 1;
                                transform: translateY(0);
                            }
                            to {
                                opacity: 0;
                                transform: translateY(20px);
                            }
                        }
                    `}</style>
                    <div style={{
                        position: 'absolute',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 150, // Below guidance but above canvas
                        background: 'rgba(15, 12, 41, 0.85)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '12px',
                        padding: '12px 20px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        textAlign: 'center',
                        pointerEvents: 'none',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                        animation: 'notificationSlideUp 0.3s ease-out',
                        maxWidth: '90%',
                        whiteSpace: 'nowrap'
                    }}>
                        {cameraNotification}
                    </div>
                </>
            )}
            
            {/* Visual guidance overlay (Part E) */}
            {getTrackingFlag('visualGuidance') && latestInteractionStateRef.current && (
                <HandGuidanceOverlay
                    hasHand={latestInteractionStateRef.current.hasHand}
                    confidence={latestInteractionStateRef.current.confidence}
                    filteredPoint={latestInteractionStateRef.current.filteredPoint}
                    minConfidence={0.6}
                />
            )}
            
            {/* Debug overlay - show if flag enabled OR existing debug param */}
            {(getTrackingFlag('metricsHud') || trackingFeatures.getFlags().showDebugOverlay || isDebugModeEnabled()) && (
                <TrackingDebugOverlay
                    metrics={debugMetricsRef.current}
                    canvasWidth={canvasRef.current?.width || 1920}
                    canvasHeight={canvasRef.current?.height || 1080}
                />
            )}
        </div>
    );
};
