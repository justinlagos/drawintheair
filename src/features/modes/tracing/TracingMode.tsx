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
import { TracingBackground } from './TracingBackground';
import { KidChip, KidPanel, KidButton, KidObjectiveCard } from '../../../components/kid-ui';
import { tokens } from '../../../styles/tokens';
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

    // advanceTimeoutRef schedules the post-celebration level advance.
    // Celebration's internal timer handles dismissal via onComplete.
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

                // Cancel any pending advance from a previous round.
                if (advanceTimeoutRef.current) {
                    clearTimeout(advanceTimeoutRef.current);
                }
                // Celebration's internal timer (duration=1500ms) auto-dismisses
                // and calls handleCelebrationDone() — see prop on the component.
                // The advance is scheduled there.
            });
        });

        return () => {
            setCompletionCallback(null);
            if (advanceTimeoutRef.current) {
                clearTimeout(advanceTimeoutRef.current);
            }
        };
    }, []);

    // Single source of truth for celebration dismissal + level advance.
    // Called by Celebration's onComplete after its internal 1500ms timer.
    const handleCelebrationDone = () => {
        showCelebrationRef.current = false;
        setShowCelebration(false);
        // Auto-advance to next level after 600ms breathing room.
        advanceTimeoutRef.current = window.setTimeout(() => {
            completionCallbackFiredRef.current = false;
            if (nextLevel()) {
                reloadCurrentPath();
            } else {
                // All levels complete - reset to first level.
                resetLevel();
                reloadCurrentPath();
            }
            const path = getCurrentPath();
            if (path) {
                setPathName(path.name);
                setCurrentPack(path.pack);
                setProgress(0);
            }
        }, 600);
    };

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
                // But only if celebration isn't already showing (prevent duplicates).
                // Celebration's internal timer + handleCelebrationDone now handle
                // both dismissal and level advance.
                if (state.isCompleted && !showCelebrationRef.current && !showCelebration) {
                    showCelebrationRef.current = true;
                    setShowCelebration(true);
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

    const { hudSpacing, isCompact } = layout;

    const handleRestart = () => {
        resetLevel();
        setProgress(0);
        showCelebrationRef.current = false;
        setShowCelebration(false);
        completionCallbackFiredRef.current = false;
        if (advanceTimeoutRef.current) {
            clearTimeout(advanceTimeoutRef.current);
        }
    };

    return (
        <>
            <TracingBackground />

            {/* Back to menu — stage label omitted, mode card below shows it */}
            {onExit && (
                <GameTopBar onBack={onExit} compact={isCompact} />
            )}

            {/* TOP-LEFT: Mode + pack + level info in a soft white panel */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: hudSpacing,
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'none',
                maxWidth: isCompact ? 'calc(50% - 20px)' : '300px',
            }}>
                <KidPanel size={isCompact ? 'sm' : 'md'}>
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: tokens.spacing.sm,
                        marginBottom: tokens.spacing.sm,
                    }}>
                        <span style={{ fontSize: isCompact ? '1.2rem' : '1.5rem' }}>✏️</span>
                        <span style={{
                            fontFamily: tokens.fontFamily.heading,
                            fontWeight: tokens.fontWeight.bold,
                            fontSize: isCompact ? tokens.fontSize.label : tokens.fontSize.button,
                            color: tokens.semantic.primary,
                        }}>Tracing</span>
                    </div>
                    <div style={{
                        fontFamily: tokens.fontFamily.body,
                        fontSize: tokens.fontSize.caption,
                        color: tokens.semantic.textSecondary,
                        marginBottom: tokens.spacing.xs,
                        display: 'flex', alignItems: 'center', gap: tokens.spacing.xs,
                    }}>
                        <span>{packInfo.icon}</span>
                        <span>{packInfo.name}</span>
                    </div>
                    <div style={{
                        fontFamily: tokens.fontFamily.heading,
                        fontWeight: tokens.fontWeight.bold,
                        fontSize: isCompact ? tokens.fontSize.label : tokens.fontSize.button,
                        color: tokens.semantic.textPrimary,
                        marginBottom: tokens.spacing.sm,
                    }}>{pathName}</div>
                    {/* Level progress dots */}
                    <div style={{
                        display: 'flex',
                        gap: isCompact ? '5px' : '7px',
                        flexWrap: 'wrap',
                        maxWidth: isCompact ? '160px' : '260px',
                    }}>
                        {Array.from({ length: packProgress.unlockedLevelIndex + 1 }).map((_, i) => (
                            <div key={i} style={{
                                width: isCompact ? '9px' : '12px',
                                height: isCompact ? '9px' : '12px',
                                borderRadius: '50%',
                                background: i < packProgress.completedLevels
                                    ? tokens.colors.aqua
                                    : i === packProgress.completedLevels
                                        ? `conic-gradient(${tokens.colors.aqua} ${progressPercent}%, rgba(108,63,164,0.18) ${progressPercent}%)`
                                        : 'rgba(108,63,164,0.18)',
                                boxShadow: i <= packProgress.completedLevels
                                    ? `0 0 10px rgba(85, 221, 224, 0.55)` : 'none',
                                transition: 'all 0.3s ease',
                            }} />
                        ))}
                    </div>
                </KidPanel>
            </div>

            {/* TOP-CENTER: Progress bar + streak meter */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'none',
                maxWidth: isCompact ? 'calc(100% - 200px)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing.sm,
                alignItems: 'center',
            }}>
                <KidPanel size="sm" style={{
                    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                    display: 'flex', alignItems: 'center',
                    gap: isCompact ? tokens.spacing.sm : tokens.spacing.md,
                }}>
                    <span style={{
                        fontSize: isCompact ? '1.2rem' : '1.6rem',
                        filter: progress >= 0.95 ? 'drop-shadow(0 0 10px #FFD84D)' : 'none',
                    }}>
                        {progress >= 0.95 ? '⭐' : progress > 0.5 ? '🌟' : '✨'}
                    </span>
                    <div style={{
                        width: isCompact ? 'clamp(80px, 20vw, 150px)' : '230px',
                        height: isCompact ? '10px' : '12px',
                        background: 'rgba(108,63,164,0.12)',
                        borderRadius: tokens.radius.pill,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: progress >= 0.95
                                ? `linear-gradient(90deg, ${tokens.colors.sunshine}, ${tokens.colors.warmOrange})`
                                : `linear-gradient(90deg, ${tokens.colors.aqua}, ${tokens.colors.skyBlue})`,
                            borderRadius: tokens.radius.pill,
                            transition: 'width 0.18s ease',
                            boxShadow: progress >= 0.95
                                ? `0 0 14px ${tokens.colors.sunshine}88`
                                : `0 0 12px ${tokens.colors.aqua}88`,
                        }} />
                    </div>
                    <span style={{
                        fontFamily: tokens.fontFamily.heading,
                        fontWeight: tokens.fontWeight.bold,
                        fontSize: isCompact ? tokens.fontSize.label : tokens.fontSize.button,
                        color: progress >= 0.95 ? tokens.colors.warmOrange : tokens.semantic.primary,
                        minWidth: isCompact ? '42px' : '54px',
                        textAlign: 'right',
                    }}>
                        {progressPercent}%
                    </span>
                </KidPanel>

                {/* Streak meter — kept as a feature, restyled bright */}
                {streakEnabled && streakMeter > 0 && (
                    <KidPanel size="sm" style={{
                        padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
                        display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
                        border: streakRainbow
                            ? `2px solid ${tokens.colors.sunshine}`
                            : streakSparkle
                                ? `2px solid rgba(255, 216, 77, 0.5)`
                                : `1.5px solid ${tokens.semantic.borderPanel}`,
                        boxShadow: streakRainbow
                            ? `0 0 18px rgba(255, 216, 77, 0.5), 0 0 36px rgba(255, 107, 157, 0.3)`
                            : tokens.shadow.float,
                    }}>
                        <span style={{ fontSize: isCompact ? '0.95rem' : '1.1rem' }}>
                            {streakRainbow ? '🌈' : streakSparkle ? '✨' : '⚡'}
                        </span>
                        <div style={{
                            width: isCompact ? '70px' : '110px',
                            height: '6px',
                            background: 'rgba(108,63,164,0.10)',
                            borderRadius: tokens.radius.pill,
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                width: `${streakMeter * 100}%`,
                                height: '100%',
                                background: streakRainbow
                                    ? `linear-gradient(90deg, ${tokens.colors.coral}, ${tokens.colors.sunshine}, ${tokens.colors.aqua}, ${tokens.colors.coral})`
                                    : `linear-gradient(90deg, ${tokens.colors.sunshine}, ${tokens.colors.coral})`,
                                backgroundSize: streakRainbow ? '200% 100%' : '100% 100%',
                                animation: streakRainbow ? 'streakRainbowGradient 2s linear infinite' : 'none',
                                borderRadius: tokens.radius.pill,
                                transition: 'width 0.2s ease',
                            }} />
                        </div>
                        <span style={{
                            fontFamily: tokens.fontFamily.heading,
                            fontWeight: tokens.fontWeight.bold,
                            fontSize: tokens.fontSize.caption,
                            color: tokens.semantic.textPrimary,
                            minWidth: isCompact ? '28px' : '36px',
                            textAlign: 'right',
                        }}>
                            {Math.round(streakMeter * 10)}s
                        </span>
                    </KidPanel>
                )}
            </div>

            {/* Restart button — bottom center */}
            <div style={{
                position: 'absolute',
                bottom: isCompact ? '12px' : '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'auto',
            }}>
                <KidButton variant="secondary" size="md" onClick={handleRestart} icon={<span>🔄</span>}>
                    {isCompact ? 'Restart' : 'Restart Level'}
                </KidButton>
            </div>

            {/* Bottom-center instructions — show at level start */}
            {((progress < 0.15 && !showCelebration) || (isPaused && progress < 0.15)) && (
                <div style={{
                    position: 'absolute',
                    bottom: isCompact ? '90px' : '120px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: tokens.zIndex.hud,
                    pointerEvents: 'none',
                    maxWidth: isCompact ? 'calc(100% - 32px)' : 'none',
                }}>
                    <KidObjectiveCard icon="👆">
                        {isCompact ? 'Pinch to trace' : 'Pinch to trace — start at the green dot!'}
                    </KidObjectiveCard>
                </div>
            )}

            {/* Paused indicator */}
            {isPaused && (
                <div style={{
                    position: 'absolute',
                    bottom: isCompact ? '90px' : '120px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: tokens.zIndex.hud,
                    pointerEvents: 'none',
                }}>
                    <KidChip variant="reward" size="md" icon={<span>⏸</span>}>
                        Paused — Pinch to continue
                    </KidChip>
                </div>
            )}

            {/* Celebration 2.0 with stars — same dismissal flow as before */}
            <Celebration
                show={showCelebration}
                message="Great Job!"
                subMessage={`You traced ${pathName}!`}
                icon="⭐"
                duration={1500}
                stars={2}
                showConfetti
                soundEffect
                onComplete={handleCelebrationDone}
            />

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
