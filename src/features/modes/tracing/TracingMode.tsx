/**
 * Tracing Mode V2 - UI Shell
 * 
 * Full progression game with:
 * - Pack 1: Warm-up Lines
 * - Pack 2: Shapes
 * - Pack 3: Letters A-Z
 * - Pack 4: Numbers 1-9
 * 
 * Features:
 * - Auto-advance to next level
 * - Centered celebration that auto-dismisses
 * - Progress tracking and unlocks
 * - Pause/resume support
 */

import { useState, useEffect, useRef } from 'react';
import { Celebration } from '../../../components/Celebration';
import { GameTopBar } from '../../../components/GameTopBar';
import { initializeTracing, getTracingState, resetLevel, nextLevel, setCompletionCallback, reloadCurrentPath } from './tracingLogicV2';
import { getCurrentPath, getCurrentPackProgress } from './tracingProgress';
import { calculateHUDMetrics, getPackInfo } from './tracingUI';
import { TracingDebugOverlay } from '../../../components/TracingDebugOverlay';
import { earnSticker } from '../../../core/stickerBook';
import { narrate } from '../../../core/narrator';
import { featureFlags } from '../../../core/featureFlags';
import { showToast, getRandomMotivation } from '../../../core/toastService';

interface TracingModeProps {
    onExit?: () => void;
}

export const TracingMode = ({ onExit }: TracingModeProps = {}) => {
    const [progress, setProgress] = useState(0);
    const [pathName, setPathName] = useState('');
    const [currentPack, setCurrentPack] = useState(1);
    const [showCelebration, setShowCelebration] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [streakMeter, setStreakMeter] = useState(0);
    const [streakSparkle, setStreakSparkle] = useState(false);
    const [streakRainbow, setStreakRainbow] = useState(false);
    const streakEnabled = featureFlags.getFlag('tracingStreak');
    const stickerEnabled = featureFlags.getFlag('stickerRewards');

    const celebrationTimeoutRef = useRef<number | undefined>(undefined);
    const advanceTimeoutRef = useRef<number | undefined>(undefined);
    const layoutRef = useRef<{ width: number; height: number }>({ width: window.innerWidth, height: window.innerHeight });
    const showCelebrationRef = useRef(false);
    const completionCallbackFiredRef = useRef(false);

    // Calculate responsive layout
    const [layout, setLayout] = useState(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        layoutRef.current = { width: w, height: h };
        return calculateHUDMetrics(w, h);
    });

    // Set up completion callback - with guard to prevent duplicate calls
    useEffect(() => {
        setCompletionCallback(() => {
            // Guard against duplicate calls
            if (completionCallbackFiredRef.current || showCelebrationRef.current) {
                return; // Already fired, ignore
            }
            completionCallbackFiredRef.current = true;

            // Use requestAnimationFrame to ensure UI updates happen immediately (prevents lag)
            requestAnimationFrame(() => {
                // Double-check guard
                if (showCelebrationRef.current) {
                    return; // Already showing, ignore
                }

                showCelebrationRef.current = true;
                setShowCelebration(true);
                showToast(getRandomMotivation(), 'success', 1500);

                // Earn sticker on completion (if enabled)
                if (stickerEnabled) {
                    earnSticker('tracing-complete');
                }
                // Narrate on completion (if enabled)
                if (featureFlags.getFlag('narrator')) {
                    narrate('mode_complete');
                }

                // Clear any existing timeouts
                if (celebrationTimeoutRef.current) {
                    clearTimeout(celebrationTimeoutRef.current);
                }
                if (advanceTimeoutRef.current) {
                    clearTimeout(advanceTimeoutRef.current);
                }

                // Auto-dismiss celebration after 1.5 seconds (1.2-2.0s range per requirement)
                celebrationTimeoutRef.current = window.setTimeout(() => {
                    showCelebrationRef.current = false;
                    setShowCelebration(false);

                    // Auto-advance to next level after 600ms
                    advanceTimeoutRef.current = window.setTimeout(() => {
                        // Reset guard for next level
                        completionCallbackFiredRef.current = false;

                        if (nextLevel()) {
                            // Reload new level state
                            reloadCurrentPath();
                            const path = getCurrentPath();
                            if (path) {
                                setPathName(path.name);
                                setCurrentPack(path.pack);
                                setProgress(0);
                            }
                        } else {
                            // All levels complete - reset to first level
                            resetLevel();
                            reloadCurrentPath();
                            const path = getCurrentPath();
                            if (path) {
                                setPathName(path.name);
                                setCurrentPack(path.pack);
                                setProgress(0);
                            }
                        }
                    }, 600);
                }, 1500);
            });
        });

        return () => {
            setCompletionCallback(null);
            if (celebrationTimeoutRef.current) {
                clearTimeout(celebrationTimeoutRef.current);
            }
            if (advanceTimeoutRef.current) {
                clearTimeout(advanceTimeoutRef.current);
            }
        };
    }, []);

    // Initialize tracing
    useEffect(() => {
        if (!isInitialized) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            initializeTracing(w, h);
            setIsInitialized(true);

            // Load current path
            const path = getCurrentPath();
            if (path) {
                setPathName(path.name);
                setCurrentPack(path.pack);
            }
        }
    }, [isInitialized]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            layoutRef.current = { width: w, height: h };
            setLayout(calculateHUDMetrics(w, h));
            if (isInitialized) {
                initializeTracing(w, h);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isInitialized]);

    // Poll for updates (increased to 20fps for more responsive completion detection, avoid React per-frame updates)
    useEffect(() => {
        const interval = setInterval(() => {
            try {
                const state = getTracingState();
                setProgress(state.progress);
                setIsPaused(state.isPaused);

                // Update streak meter (if enabled)
                if (streakEnabled && state.streakMeter !== undefined) {
                    setStreakMeter(state.streakMeter);
                    // Sparkle at 5s (0.5), rainbow at 10s (1.0)
                    if (state.streakMeter >= 0.5 && !streakSparkle) {
                        setStreakSparkle(true);
                        setTimeout(() => setStreakSparkle(false), 1000);
                    }
                    if (state.streakMeter >= 1.0 && !streakRainbow) {
                        setStreakRainbow(true);
                        setTimeout(() => setStreakRainbow(false), 1500);
                    }
                    if (state.streakMeter < 0.5) {
                        setStreakSparkle(false);
                    }
                    if (state.streakMeter < 1.0) {
                        setStreakRainbow(false);
                    }
                }

                // Check for completion state changes (in case callback missed it)
                // But only if celebration isn't already showing (prevent duplicates)
                if (state.isCompleted && !showCelebrationRef.current && !showCelebration) {
                    // Completion happened but celebration didn't show - trigger it
                    showCelebrationRef.current = true;
                    setShowCelebration(true);
                    celebrationTimeoutRef.current = window.setTimeout(() => {
                        showCelebrationRef.current = false;
                        setShowCelebration(false);
                        advanceTimeoutRef.current = window.setTimeout(() => {
                            if (nextLevel()) {
                                reloadCurrentPath();
                                const path = getCurrentPath();
                                if (path) {
                                    setPathName(path.name);
                                    setCurrentPack(path.pack);
                                    setProgress(0);
                                }
                            } else {
                                resetLevel();
                                reloadCurrentPath();
                                const path = getCurrentPath();
                                if (path) {
                                    setPathName(path.name);
                                    setCurrentPack(path.pack);
                                    setProgress(0);
                                }
                            }
                        }, 600);
                    }, 1500);
                }

                const path = getCurrentPath();
                if (path) {
                    setPathName(path.name);
                    setCurrentPack(path.pack);
                }
            } catch (error) {
                console.error('[TracingMode] Error in poll interval:', error);
            }
        }, 50); // 20fps for more responsive detection

        return () => clearInterval(interval);
    }, []);

    let packProgress;
    let packInfo;
    try {
        packProgress = getCurrentPackProgress();
        packInfo = getPackInfo(currentPack);
    } catch (error) {
        console.error('[TracingMode] Error getting progress:', error);
        // Fallback values
        packProgress = {
            pack: 1,
            unlocked: true,
            completedLevels: 0,
            unlockedLevelIndex: 0
        };
        packInfo = getPackInfo(1);
    }

    const progressPercent = Math.round(progress * 100);

    const { hudSpacing, hudPadding, hudRadius, isCompact } = layout;

    const handleRestart = () => {
        resetLevel();
        setProgress(0);
        setShowCelebration(false);
        if (celebrationTimeoutRef.current) {
            clearTimeout(celebrationTimeoutRef.current);
        }
        if (advanceTimeoutRef.current) {
            clearTimeout(advanceTimeoutRef.current);
        }
    };

    return (
        <>
            {/* Back to menu */}
            {onExit && (
                <GameTopBar
                    onBack={onExit}
                    stage={packInfo ? `${packInfo.icon} ${packInfo.name}` : undefined}
                    compact={isCompact}
                />
            )}

            {/* Top Left - Mode indicator */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: hudSpacing,
                zIndex: 20,
                maxWidth: isCompact ? 'calc(50% - 20px)' : 'none'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                    
                    
                    borderRadius: hudRadius,
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    padding: hudPadding,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCompact ? '8px' : '14px',
                        marginBottom: isCompact ? '8px' : '16px'
                    }}>
                        <span style={{ fontSize: isCompact ? '1.3rem' : '2rem' }}>✏️</span>
                        <span style={{
                            fontSize: isCompact ? '0.95rem' : '1.3rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            {isCompact ? 'Tracing' : 'Tracing Mode'}
                        </span>
                    </div>

                    {/* Pack info */}
                    <div style={{
                        fontSize: isCompact ? '0.8rem' : '1rem',
                        color: 'rgba(255,255,255,0.8)',
                        marginBottom: isCompact ? '6px' : '12px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>{packInfo.icon}</span>
                        <span>{packInfo.name}</span>
                    </div>

                    {/* Level info */}
                    <div style={{
                        fontSize: isCompact ? '1rem' : '1.2rem',
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: isCompact ? '8px' : '16px'
                    }}>
                        {pathName}
                    </div>

                    {/* Progress dots */}
                    <div style={{
                        display: 'flex',
                        gap: isCompact ? '5px' : '8px',
                        flexWrap: 'wrap',
                        maxWidth: isCompact ? '160px' : '280px'
                    }}>
                        {Array.from({ length: packProgress.unlockedLevelIndex + 1 }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: isCompact ? '8px' : '12px',
                                    height: isCompact ? '8px' : '12px',
                                    borderRadius: '50%',
                                    background: i < packProgress.completedLevels
                                        ? '#00f5d4'
                                        : i === packProgress.completedLevels
                                            ? `conic-gradient(#00f5d4 ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`
                                            : 'rgba(255,255,255,0.2)',
                                    boxShadow: i <= packProgress.completedLevels ? '0 0 10px #00f5d4' : 'none',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Progress Bar - Top Center */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                pointerEvents: 'none',
                maxWidth: isCompact ? 'calc(100% - 180px)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: isCompact ? '8px' : '12px',
                alignItems: 'center'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                    
                    
                    borderRadius: isCompact ? '20px' : '9999px',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    padding: isCompact ? '10px 16px' : '14px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCompact ? '10px' : '20px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
                }}>
                    <span style={{
                        fontSize: isCompact ? '1.3rem' : '2rem',
                        filter: progress >= 0.95 ? 'drop-shadow(0 0 15px #FFD700)' : 'none'
                    }}>
                        {progress >= 0.95 ? '⭐' : progress > 0.5 ? '🌟' : '✨'}
                    </span>

                    <div style={{
                        width: isCompact ? 'clamp(80px, 20vw, 150px)' : '250px',
                        height: isCompact ? '10px' : '14px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '7px',
                        overflow: 'hidden',
                        border: '2px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: progress >= 0.95
                                ? 'linear-gradient(90deg, #FFD700, #FFA500)'
                                : 'linear-gradient(90deg, #00f5d4, #4facfe)',
                            borderRadius: '7px',
                            transition: 'width 0.15s ease',
                            boxShadow: `0 0 20px ${progress >= 0.95 ? '#FFD700' : '#00f5d4'}88`
                        }} />
                    </div>

                    <span style={{
                        fontSize: isCompact ? '1rem' : '1.3rem',
                        fontWeight: 'bold',
                        color: progress >= 0.95 ? '#FFD700' : '#00f5d4',
                        minWidth: isCompact ? '40px' : '60px',
                        textAlign: 'right',
                        textShadow: progress >= 0.95 ? '0 0 15px #FFD700' : 'none'
                    }}>
                        {progressPercent}%
                    </span>
                </div>

                {/* Streak Meter - if enabled */}
                {streakEnabled && streakMeter > 0 && (
                    <div style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                        
                        
                        borderRadius: isCompact ? '16px' : '20px',
                        border: streakRainbow ? '2px solid rgba(255, 230, 109, 0.8)' : streakSparkle ? '2px solid rgba(255, 230, 109, 0.5)' : '2px solid rgba(255, 255, 255, 0.2)',
                        padding: isCompact ? '8px 12px' : '10px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCompact ? '8px' : '12px',
                        boxShadow: streakRainbow
                            ? '0 0 30px rgba(255, 230, 109, 0.6), 0 0 60px rgba(255, 107, 157, 0.4), 0 0 90px rgba(77, 255, 255, 0.3)'
                            : streakSparkle
                                ? '0 0 20px rgba(255, 230, 109, 0.4)'
                                : '0 8px 24px rgba(0, 0, 0, 0.3)',
                        animation: streakRainbow ? 'streakRainbow 1.5s ease infinite' : streakSparkle ? 'streakSparkle 1s ease infinite' : 'none'
                    }}>
                        <span style={{
                            fontSize: isCompact ? '1rem' : '1.2rem',
                            filter: streakRainbow
                                ? 'drop-shadow(0 0 10px rgba(255, 230, 109, 1)) drop-shadow(0 0 20px rgba(255, 107, 157, 0.8)) drop-shadow(0 0 30px rgba(77, 255, 255, 0.6))'
                                : streakSparkle
                                    ? 'drop-shadow(0 0 8px rgba(255, 230, 109, 0.8))'
                                    : 'none'
                        }}>
                            {streakRainbow ? '🌈' : streakSparkle ? '✨' : '⚡'}
                        </span>
                        <div style={{
                            width: isCompact ? '80px' : '120px',
                            height: isCompact ? '6px' : '8px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                            <div style={{
                                width: `${streakMeter * 100}%`,
                                height: '100%',
                                background: streakRainbow
                                    ? 'linear-gradient(90deg, #FF6B9D, #FFE66D, #4DFFFF, #FF6B9D)'
                                    : streakSparkle
                                        ? 'linear-gradient(90deg, #FFE66D, #FF6B9D)'
                                        : 'linear-gradient(90deg, #FFE66D, #FF6B9D)',
                                backgroundSize: streakRainbow ? '200% 100%' : '100% 100%',
                                animation: streakRainbow ? 'streakRainbowGradient 2s linear infinite' : 'none',
                                borderRadius: '4px',
                                transition: 'width 0.2s ease',
                                boxShadow: streakRainbow
                                    ? '0 0 15px rgba(255, 230, 109, 0.8), 0 0 30px rgba(255, 107, 157, 0.6)'
                                    : streakSparkle
                                        ? '0 0 10px rgba(255, 230, 109, 0.6)'
                                        : '0 0 5px rgba(255, 230, 109, 0.4)'
                            }} />
                        </div>
                        <span style={{
                            fontSize: isCompact ? '0.7rem' : '0.85rem',
                            fontWeight: 600,
                            color: streakRainbow ? '#FFE66D' : streakSparkle ? '#FFE66D' : 'rgba(255, 230, 109, 0.9)',
                            minWidth: isCompact ? '30px' : '40px',
                            textAlign: 'right'
                        }}>
                            {Math.round(streakMeter * 10)}s
                        </span>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div style={{
                position: 'absolute',
                bottom: isCompact ? '12px' : '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                pointerEvents: 'auto',
                maxWidth: isCompact ? 'calc(100% - 24px)' : 'none'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                    
                    
                    borderRadius: isCompact ? '18px' : '9999px',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    padding: isCompact ? '10px 14px' : '14px 24px',
                    display: 'flex',
                    gap: isCompact ? '8px' : '12px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={handleRestart}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isCompact ? '4px' : '8px',
                            padding: isCompact ? '10px 14px' : '14px 24px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: isCompact ? '12px' : '16px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: isCompact ? '0.85rem' : '1rem',
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            minWidth: '44px',
                            minHeight: '44px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                    >
                        <span>🔄</span>
                        {isCompact ? 'Restart' : 'Restart Level'}
                    </button>
                </div>
            </div>

            {/* Instructions - Bottom Center - Show at level start and when paused */}
            {((progress < 0.15 && !showCelebration) || (isPaused && progress < 0.15)) && (
                <div style={{
                    position: 'absolute',
                    bottom: isCompact ? '90px' : '120px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 15,
                    pointerEvents: 'none',
                    maxWidth: isCompact ? 'calc(100% - 32px)' : 'none'
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                        border: '1.5px solid rgba(0, 245, 212, 0.3)',
                        borderRadius: '9999px',
                        padding: isCompact ? '10px 20px' : '14px 28px',
                        color: '#00f5d4',
                        fontSize: isCompact ? '0.9rem' : '1.1rem',
                        fontWeight: 600,
                        
                        
                        boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
                        animation: progress < 0.05 ? 'pulse 2s ease-in-out infinite' : 'float 3s ease-in-out infinite',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        👆 {isCompact ? 'Pinch to trace' : 'Pinch to trace — start at the green dot!'}
                    </div>
                </div>
            )}

            {/* Paused Indicator */}
            {isPaused && (
                <div style={{
                    position: 'absolute',
                    bottom: isCompact ? '90px' : '120px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 15,
                    pointerEvents: 'none',
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                    border: '1.5px solid rgba(255, 217, 61, 0.3)',
                    borderRadius: '9999px',
                    padding: isCompact ? '10px 20px' : '14px 28px',
                    color: '#FFD93D',
                    fontSize: isCompact ? '0.9rem' : '1.1rem',
                    fontWeight: 600,
                    
                    
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
                }}>
                    Paused - Pinch to continue
                </div>
            )}

            {/* Celebration - Centered and auto-dismissing */}
            {showCelebration && (
                <Celebration
                    show={true}
                    message="Great Job!"
                    subMessage={`You traced ${pathName}!`}
                    icon="⭐"
                    duration={1500}
                    showConfetti={true}
                    soundEffect={true}
                />
            )}

            {/* Debug overlay */}
            <TracingDebugOverlay
                canvasWidth={layoutRef.current.width}
                canvasHeight={layoutRef.current.height}
            />

            {/* CSS animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateX(-50%) translateY(0px); }
                    50% { transform: translateX(-50%) translateY(-10px); }
                }
                @keyframes pulse {
                    0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
                    50% { transform: translateX(-50%) scale(1.05); opacity: 0.9; }
                }
                @keyframes streakSparkle {
                    0%, 100% { 
                        box-shadow: 0 0 20px rgba(255, 230, 109, 0.4);
                        transform: scale(1);
                    }
                    50% { 
                        box-shadow: 0 0 30px rgba(255, 230, 109, 0.7), 0 0 50px rgba(255, 107, 157, 0.4);
                        transform: scale(1.02);
                    }
                }
                @keyframes streakRainbow {
                    0%, 100% { 
                        box-shadow: 0 0 30px rgba(255, 230, 109, 0.6), 0 0 60px rgba(255, 107, 157, 0.4), 0 0 90px rgba(77, 255, 255, 0.3);
                        transform: scale(1);
                    }
                    25% { 
                        box-shadow: 0 0 40px rgba(255, 107, 157, 0.8), 0 0 80px rgba(77, 255, 255, 0.6), 0 0 120px rgba(255, 230, 109, 0.4);
                        transform: scale(1.03);
                    }
                    50% { 
                        box-shadow: 0 0 40px rgba(77, 255, 255, 0.8), 0 0 80px rgba(255, 230, 109, 0.6), 0 0 120px rgba(255, 107, 157, 0.4);
                        transform: scale(1.05);
                    }
                    75% { 
                        box-shadow: 0 0 40px rgba(255, 230, 109, 0.8), 0 0 80px rgba(255, 107, 157, 0.6), 0 0 120px rgba(77, 255, 255, 0.4);
                        transform: scale(1.03);
                    }
                }
                @keyframes streakRainbowGradient {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
            `}</style>
        </>
    );
};
