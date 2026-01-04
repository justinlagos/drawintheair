import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebcam } from '../../core/useWebcam';
import { handTracker } from '../../core/handTracker';
import { DrawingUtils, type HandLandmarkerResult, type NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * Mirror X coordinate for natural interaction
 * When user moves hand right, cursor should move right on screen
 */
const mirrorX = (x: number): number => 1 - x;

/**
 * Transform landmarks to mirrored coordinate space for natural interaction
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
        worldLandmarks: results.worldLandmarks // Keep world landmarks as-is
    };
};

/**
 * TrackingFrameData - Mirrored coordinate space for natural interaction
 * Move hand right → cursor moves right
 */
export interface TrackingFrameData {
    results: HandLandmarkerResult | null;
    confidence: number;
    timestamp: number;
    indexTip: { x: number; y: number } | null;
    thumbTip: { x: number; y: number } | null;
    handScale: number; // Estimated hand size for pinch detection
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

/**
 * Estimate hand scale from wrist to middle finger MCP distance
 */
function estimateHandScale(landmarks: any[]): number {
    if (landmarks.length < 10) return 0.1; // Default
    
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];
    const dist = Math.hypot(middleMCP.x - wrist.x, middleMCP.y - wrist.y);
    return Math.max(0.05, Math.min(0.2, dist)); // Clamp to reasonable range
}

export const TrackingLayer = ({ onFrame, children }: TrackingLayerProps) => {
    const { videoRef, stream, isLoading: isWebcamLoading } = useWebcam();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [lastFrameData, setLastFrameData] = useState<TrackingFrameData>({
        results: null,
        confidence: 0,
        timestamp: 0,
        indexTip: null,
        thumbTip: null,
        handScale: 0.1
    });

    // Separate render rate from detection rate
    const lastRenderTime = useRef<number>(0);
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    const extractFrameData = useCallback((
        results: HandLandmarkerResult | null,
        timestamp: number
    ): TrackingFrameData => {
        if (!results || !results.landmarks || results.landmarks.length === 0) {
            return {
                results: null,
                confidence: 0,
                timestamp,
                indexTip: null,
                thumbTip: null,
                handScale: 0.1
            };
        }

        const hand = results.landmarks[0];
        const indexTip = hand[8]; // Index finger tip
        const thumbTip = hand[4]; // Thumb tip

        // Get confidence from handedness if available
        let confidence = 0.8; // Default confidence
        if (results.handedness && results.handedness.length > 0) {
            const handedness = results.handedness[0];
            if (handedness.length > 0) {
                confidence = handedness[0].score ?? 0.8;
            }
        }

        // Estimate hand scale for pinch detection
        const handScale = estimateHandScale(hand);

        return {
            results,
            confidence,
            timestamp,
            indexTip: { x: indexTip.x, y: indexTip.y },
            thumbTip: { x: thumbTip.x, y: thumbTip.y },
            handScale
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

            const loop = (currentTime: number) => {
                if (!isRunning) return;

                // Throttle rendering to target FPS
                const elapsed = currentTime - lastRenderTime.current;
                
                if (elapsed >= frameInterval) {
                    lastRenderTime.current = currentTime - (elapsed % frameInterval);

                    if (videoRef.current && videoRef.current.readyState >= 2 && canvasRef.current) {
                        const video = videoRef.current;
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d');

                        // Match canvas size to video
                        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                        }

                        // Detect hands
                        const timestamp = Date.now();
                        const rawResults = handTracker.detect(video, timestamp);

                        // Mirror results for natural interaction (move right = cursor moves right)
                        const results = rawResults ? mirrorResults(rawResults) : null;

                        // Extract frame data (mirrored coordinates)
                        const frameData = extractFrameData(results, timestamp);

                        // Update state for UI (batched)
                        setLastFrameData(frameData);

                        if (ctx) {
                            // Clear canvas
                            ctx.clearRect(0, 0, canvas.width, canvas.height);

                            // Call frame callback with mirrored data
                            if (onFrame) {
                                onFrame(ctx, frameData, canvas.width, canvas.height, drawingUtils);
                            }
                        }
                    }
                }

                animationFrameId = requestAnimationFrame(loop);
            };

            animationFrameId = requestAnimationFrame(loop);
        };

        if (stream && !isWebcamLoading) {
            startTracking();
        }

        return () => {
            isRunning = false;
            cancelAnimationFrame(animationFrameId);
        };
    }, [stream, isWebcamLoading, videoRef, onFrame, extractFrameData, frameInterval]);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            {/* Hidden video element */}
            <video
                ref={videoRef}
                style={{
                    position: 'absolute',
                    top: '-9999px',
                    left: '-9999px',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0,
                    visibility: 'hidden'
                }}
                autoPlay
                playsInline
                muted
            />

            {/* Canvas for drawing - coordinates already mirrored */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none'
                }}
            />

            {/* Children receive mirrored frame data */}
            {typeof children === 'function' ? children(lastFrameData) : children}
        </div>
    );
};
