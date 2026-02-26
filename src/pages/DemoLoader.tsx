/**
 * Demo Loader Page
 * 
 * Full-screen splash with logo and animated loading bar.
 * Checks camera permission and navigates to Wave screen when ready.
 */

import { useState, useEffect, useRef } from 'react';
import { useWebcam } from '../core/useWebcam';
import './demoLoader.css';

export const DemoLoader = () => {
    const { stream, error, requestAccess, isLoading } = useWebcam({ autoStart: false });
    const [progress, setProgress] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [cameraBlocked, setCameraBlocked] = useState(false);
    const [showHelpOverlay, setShowHelpOverlay] = useState(false);
    const progressRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);

    // Start camera request immediately
    useEffect(() => {
        // Track loading view
        if (typeof window !== 'undefined' && (window as any).analytics) {
            (window as any).analytics.logEvent('demo_loading_view', {
                load_stage: 'initial'
            });
        }
        requestAccess();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Handle camera permission result and start loading animation
    useEffect(() => {
        if (error) {
            setCameraBlocked(true);
            return;
        }
        
        if (!stream) {
            return;
        }

        setCameraBlocked(false);
        startTimeRef.current = Date.now();
        const minTotalTime = 2200; // Minimum 2200ms total

        const animate = () => {
            const elapsed = Date.now() - startTimeRef.current;
            let newProgress = 0;

            if (elapsed < 600) {
                // 0 to 35% in 600ms
                newProgress = (elapsed / 600) * 35;
            } else if (elapsed < 1400) {
                // 35 to 70% in 800ms (600ms + 800ms)
                const stageElapsed = elapsed - 600;
                newProgress = 35 + (stageElapsed / 800) * 35;
            } else if (elapsed < 2200) {
                // 70 to 92% in 800ms (1400ms + 800ms = 2200ms)
                // Adjusted duration to ensure we reach 92% by 2200ms minimum time
                const stageElapsed = elapsed - 1400;
                newProgress = 70 + (stageElapsed / 800) * 22;
            } else if (elapsed < minTotalTime + 400) {
                // Hold at 92% until minimum time (2200ms), then finish to 100% in 400ms
                if (elapsed < minTotalTime) {
                    newProgress = 92;
                } else {
                    // Finish to 100% in 400ms (after 2200ms)
                    const stageElapsed = elapsed - minTotalTime;
                    newProgress = 92 + (stageElapsed / 400) * 8;
                    newProgress = Math.min(newProgress, 100);
                }
            } else {
                // Ensure we cap at 100%
                newProgress = 100;
            }

            setProgress(newProgress);
            progressRef.current = newProgress;

            if (newProgress < 100) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                // Track loading complete
                if (typeof window !== 'undefined' && (window as any).analytics) {
                    const duration = Date.now() - startTimeRef.current;
                    (window as any).analytics.logEvent('demo_loading_complete', {
                        duration_ms: duration
                    });
                }
                // Show confetti/shine effect
                setShowConfetti(true);
                // Navigate after a brief moment
                setTimeout(() => {
                    window.location.pathname = '/play';
                }, 500);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [error, stream]);

    const handleRetryCamera = async () => {
        setCameraBlocked(false);
        await requestAccess();
    };

    return (
        <div className="demo-loader">
            <div className="demo-loader-background">
                {/* Space background with stars */}
                <div className="demo-loader-stars"></div>
            </div>

            {!cameraBlocked ? (
                <div className="demo-loader-content">
                    {/* Logo */}
                    <div className="demo-loader-logo">
                        <img 
                            src="/logo.png" 
                            alt="Draw in the Air"
                            className="demo-loader-logo-img"
                        />
                    </div>

                    {/* Loading Bar */}
                    <div className="demo-loader-progress-container">
                        <div className="demo-loader-progress-bar">
                            <div 
                                className="demo-loader-progress-fill"
                                style={{ width: `${progress}%` }}
                            >
                                {showConfetti && (
                                    <div className="demo-loader-shine"></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="demo-loader-blocker">
                    <div className="demo-loader-blocker-content">
                        <h2 className="demo-loader-blocker-title">We need camera access</h2>
                        <p className="demo-loader-blocker-body">
                            It lets your child draw in the air
                        </p>
                        <div className="demo-loader-blocker-actions">
                            <button 
                                className="demo-loader-blocker-primary"
                                onClick={handleRetryCamera}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Requesting...' : 'Enable camera'}
                            </button>
                            <button 
                                className="demo-loader-blocker-secondary"
                                onClick={() => setShowHelpOverlay(true)}
                            >
                                How to fix
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Overlay */}
            {showHelpOverlay && (
                <div className="demo-loader-help-overlay" onClick={() => setShowHelpOverlay(false)}>
                    <div className="demo-loader-help-content" onClick={(e) => e.stopPropagation()}>
                        <button 
                            className="demo-loader-help-close"
                            onClick={() => setShowHelpOverlay(false)}
                        >
                            ×
                        </button>
                        <h3>How to enable camera access</h3>
                        <ol className="demo-loader-help-steps">
                            <li>Look for the camera permission prompt in your browser</li>
                            <li>Click "Allow" or "Yes" when asked</li>
                            <li>If you don't see a prompt, check your browser's address bar for a camera icon</li>
                            <li>Click the icon and select "Always allow" for this site</li>
                            <li>Refresh the page and try again</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
};

