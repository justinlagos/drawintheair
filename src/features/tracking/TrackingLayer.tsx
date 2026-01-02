import { useEffect, useRef, useState } from 'react';
import { useWebcam } from '../../core/useWebcam';
import { handTracker } from '../../core/handTracker';
import { DrawingUtils, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

interface TrackingLayerProps {
    onFrame?: (
        ctx: CanvasRenderingContext2D,
        results: HandLandmarkerResult | null,
        width: number,
        height: number,
        drawingUtils: DrawingUtils | null
    ) => void;
    // Children can be a function receiving results, or standard nodes
    children?: React.ReactNode | ((results: HandLandmarkerResult | null) => React.ReactNode);
}

export const TrackingLayer = ({ onFrame, children }: TrackingLayerProps) => {
    const { videoRef, stream, isLoading: isWebcamLoading } = useWebcam();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [lastResults, setLastResults] = useState<HandLandmarkerResult | null>(null);

    useEffect(() => {
        let animationFrameId: number;
        let drawingUtils: DrawingUtils | null = null;

        const startTracking = async () => {
            await handTracker.initialize();

            if (canvasRef.current) {
                drawingUtils = new DrawingUtils(canvasRef.current.getContext('2d')!);
            }

            const loop = () => {
                if (videoRef.current && videoRef.current.readyState >= 2 && canvasRef.current) {
                    const video = videoRef.current;
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');

                    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                    }

                    // Detect
                    const results: HandLandmarkerResult | null = handTracker.detect(video, Date.now());
                    setLastResults(results);

                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        if (onFrame) {
                            onFrame(ctx, results, canvas.width, canvas.height, drawingUtils);
                        }
                    }
                }
                animationFrameId = requestAnimationFrame(loop);
            };

            loop();
        };

        if (stream && !isWebcamLoading) {
            startTracking();
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [stream, isWebcamLoading, videoRef, onFrame]);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <video
                ref={videoRef}
                style={{
                    position: 'absolute',
                    top: '-9999px',
                    left: '-9999px',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    opacity: 0,
                    visibility: 'hidden' // Safest combo with off-screen
                }}
                autoPlay
                playsInline
                muted
            />
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    pointerEvents: 'none'
                }}
            />

            {/* HUD Layer */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                {/* Optional small status */}
            </div>

            {typeof children === 'function' ? children(lastResults) : children}
        </div>
    );
};
