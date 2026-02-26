/**
 * Demo Prep Page
 * 
 * Pre-demo screen that requests camera permission and shows loading state
 * before navigating to the wave-to-start onboarding
 */

import { useState, useEffect } from 'react';
import { useWebcam } from '../core/useWebcam';
import { assetPreloader } from '../core/assetLoader';
import './demoPrep.css';

export const DemoPrep = () => {
    const { stream, isLoading, error, requestAccess } = useWebcam({ autoStart: false });
    const [step, setStep] = useState<'instructions' | 'loading' | 'ready'>('instructions');
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => {
        if (stream && step === 'instructions') {
            setStep('loading');
            // Simulate loading hand tracking (1.5-3 seconds)
            const duration = 2000; // 2 seconds
            const startTime = Date.now();
            
            // Start preloading assets in parallel
            assetPreloader.preload();
            
            const interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                setLoadingProgress(progress);
                
                if (progress >= 1) {
                    clearInterval(interval);
                    setStep('ready');
                    // Navigate to app after a brief moment
                    setTimeout(() => {
                        window.location.pathname = '/app';
                    }, 500);
                }
            }, 16); // ~60fps
            
            return () => clearInterval(interval);
        }
    }, [stream, step]);

    const handleStartWarmup = async () => {
        await requestAccess();
    };

    return (
        <div className="demo-prep">
            <div className="demo-prep-background">
                {/* Space background with stars */}
                <div className="demo-prep-stars"></div>
            </div>
            
            <div className="demo-prep-container">
                {/* Logo */}
                <div className="demo-prep-logo">
                    <img 
                        src="/logo.png" 
                        alt="Draw in the Air"
                        className="demo-prep-logo-img"
                    />
                </div>

                {/* Center Panel */}
                <div className="demo-prep-panel">
                    <h1 className="demo-prep-title">Get ready</h1>
                    
                    {step === 'instructions' && (
                        <div className="demo-prep-steps">
                            <div className="demo-prep-step">
                                <div className="demo-prep-step-number">1</div>
                                <div className="demo-prep-step-content">
                                    <h3>Allow camera access</h3>
                                    <p>We need your camera to track your hand movements</p>
                                </div>
                            </div>
                            
                            <div className="demo-prep-step">
                                <div className="demo-prep-step-number">2</div>
                                <div className="demo-prep-step-content">
                                    <h3>Stand back a little</h3>
                                    <p>Position yourself so your hands are visible in the camera</p>
                                </div>
                            </div>
                            
                            <div className="demo-prep-step">
                                <div className="demo-prep-step-number">3</div>
                                <div className="demo-prep-step-content">
                                    <h3>Pinch to draw, open hand to pause</h3>
                                    <p>Use a pinching gesture to draw and select</p>
                                </div>
                            </div>
                            
                            {error && (
                                <div className="demo-prep-error">
                                    <p>Camera access is required. Please allow camera permissions and try again.</p>
                                </div>
                            )}
                            
                            <button 
                                className="demo-prep-cta"
                                onClick={handleStartWarmup}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Requesting access...' : 'Start camera warmup'}
                            </button>
                        </div>
                    )}
                    
                    {step === 'loading' && (
                        <div className="demo-prep-loading">
                            <div className="demo-prep-loading-spinner">
                                <div className="demo-prep-spinner-ring"></div>
                                <div className="demo-prep-spinner-ring"></div>
                                <div className="demo-prep-spinner-ring"></div>
                            </div>
                            <h2 className="demo-prep-loading-text">Loading hand tracking</h2>
                            <div className="demo-prep-progress-bar">
                                <div 
                                    className="demo-prep-progress-fill"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                    
                    {step === 'ready' && (
                        <div className="demo-prep-ready">
                            <div className="demo-prep-checkmark">✓</div>
                            <h2>Ready to start!</h2>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

