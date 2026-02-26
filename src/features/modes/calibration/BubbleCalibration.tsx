/**
 * Bubble Pop UI - Nintendo-Quality Casual Game Experience
 * 
 * Features:
 * - Clean, aligned top bar with mode name, timer, and score
 * - Level progression (6 levels)
 * - Smooth transitions and celebrations
 * - No frozen states - always recoverable
 * - Child-friendly messaging and encouragement
 * - Fully responsive across all screen sizes
 */

import { useEffect, useState, useRef } from 'react';
import {
    getScore,
    getTimeRemaining,
    isGameActive,
    hasReachedMilestone,
    hasCelebratedMilestone,
    setMilestoneCelebrated,
    getGameEndTime,
    startBubbleGame,
    getCurrentGoal,
    hasReachedGoal,
    MAX_LEVEL,
    type BubbleLevel
} from './bubbleCalibrationLogic';
import { Celebration } from '../../../components/Celebration';
import { GameTopBar } from '../../../components/GameTopBar';
import { earnSticker } from '../../../core/stickerBook';
import { featureFlags } from '../../../core/featureFlags';
import { showToast, getRandomMotivation } from '../../../core/toastService';

interface BubbleCalibrationProps {
    onComplete: () => void;
    onExit: () => void;
}

const GAME_DURATION = 30000; // 30 seconds

// Responsive hook
const useResponsiveHUD = () => {
    const [layout, setLayout] = useState(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
            isMobile: w <= 480,
            isTabletSmall: w > 480 && w <= 768,
            isTablet: w > 768 && w <= 1024,
            isLandscapePhone: w > h && h <= 500,
            screenWidth: w
        };
    });

    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setLayout({
                isMobile: w <= 480,
                isTabletSmall: w > 480 && w <= 768,
                isTablet: w > 768 && w <= 1024,
                isLandscapePhone: w > h && h <= 500,
                screenWidth: w
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return layout;
};

export const BubbleCalibration = ({ onComplete: _onComplete, onExit }: BubbleCalibrationProps) => {
    const [score, setScore] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
    const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
    const [showEndModal, setShowEndModal] = useState(false);
    const [showResultsOverlay, setShowResultsOverlay] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [level, setLevel] = useState<BubbleLevel>(1);
    const [autoAdvanceScheduled, setAutoAdvanceScheduled] = useState(false);
    const lastToastScoreRef = useRef(0);

    const layout = useResponsiveHUD();
    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;

    // Initialize game when level changes
    useEffect(() => {
        startBubbleGame(level as BubbleLevel);
        // Reset UI state when level changes
        setShowEndModal(false);
        setScore(0);
        setTimeRemaining(GAME_DURATION);
        setAutoAdvanceScheduled(false);
        lastToastScoreRef.current = 0;
    }, [level]);

    // Game state update interval
    useEffect(() => {
        let autoAdvanceTimeout: number | undefined;

        const interval = setInterval(() => {
            const currentScore = getScore();
            const currentTimeRemaining = getTimeRemaining();
            const currentMilestoneReached = hasReachedMilestone();
            const gameIsActive = isGameActive();

            // Update score and time only - do NOT overwrite React level state
            setScore(currentScore);
            setTimeRemaining(currentTimeRemaining);

            // Show milestone celebration when reached
            if (currentMilestoneReached && !hasCelebratedMilestone()) {
                setShowMilestoneCelebration(true);
                setMilestoneCelebrated();
                setTimeout(() => {
                    setShowMilestoneCelebration(false);
                }, 2500);
            }

            // Show motivation toast every 3 correct pops
            if (gameIsActive && currentScore > 0 && currentScore >= lastToastScoreRef.current + 3) {
                lastToastScoreRef.current = currentScore;
                showToast(getRandomMotivation(), 'success', 1800);
            }

            // Check for game end - more robust detection
            // Game ends when timer reaches 0 OR when gameEndTime is set
            const gameEnded = (!gameIsActive && currentTimeRemaining <= 0) || (!gameIsActive && getGameEndTime() !== null);

            if (gameEnded && !showEndModal && !showResultsOverlay && !autoAdvanceScheduled) {
                const goalReached = hasReachedGoal();
                const isLast = level === MAX_LEVEL;

                // Earn sticker on milestone (if enabled)
                if (goalReached && featureFlags.getFlag('stickerRewards')) {
                    earnSticker('bubble-milestone');
                }

                // Final level complete → show results overlay instead of regular modal
                if (goalReached && isLast) {
                    setFinalScore(currentScore);
                    setShowResultsOverlay(true);
                } else {
                    setShowEndModal(true);
                    // Auto-advance on success for non-final levels
                    if (goalReached && level < MAX_LEVEL) {
                        setAutoAdvanceScheduled(true);
                        autoAdvanceTimeout = window.setTimeout(() => {
                            const nextLevel = (level + 1) as BubbleLevel;
                            setShowEndModal(false);
                            setAutoAdvanceScheduled(false);
                            setLevel(nextLevel);
                        }, 1200);
                    }
                }
            }
        }, 100);

        return () => {
            clearInterval(interval);
            if (autoAdvanceTimeout !== undefined) {
                clearTimeout(autoAdvanceTimeout);
            }
        };
    }, [showEndModal, showResultsOverlay, autoAdvanceScheduled, level]);

    const handleTryAgain = () => {
        // Reset all state and restart game
        startBubbleGame(level as BubbleLevel);
        setShowEndModal(false);
        setShowResultsOverlay(false);
        setScore(0);
        setTimeRemaining(GAME_DURATION);
        lastToastScoreRef.current = 0;
        setAutoAdvanceScheduled(false);
    };

    // Play Again from results overlay — restart from level 1
    const handlePlayAgain = () => {
        setShowResultsOverlay(false);
        setAutoAdvanceScheduled(false);
        setLevel(1 as BubbleLevel);
        // level useEffect will call startBubbleGame(1) and reset UI state
    };

    const handleNextLevel = () => {
        if (level < MAX_LEVEL) {
            const nextLevel = (level + 1) as BubbleLevel;
            // Just set level - useEffect will handle starting the game
            setLevel(nextLevel);
            setShowEndModal(false);
            setAutoAdvanceScheduled(false);
        }
    };

    const currentGoal = getCurrentGoal();

    // Format time as M:SS
    const formatTime = (ms: number) => {
        const seconds = Math.ceil(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const goalReached = hasReachedGoal();
    const isLastLevel = level === MAX_LEVEL;

    // Responsive sizing
    const hudSpacing = isMobile ? '18px' : isTabletSmall ? '28px' : '40px';
    const hudPadding = isCompact ? '10px 16px' : '14px 20px';
    const hudRadius = isCompact ? '18px' : '22px';
    const hudGap = isCompact ? '10px' : '24px';

    return (
        <>
            {/* Back to menu + level chip */}
            <GameTopBar
                onBack={onExit}
                stage={`Level ${level} of ${MAX_LEVEL}`}
                compact={isCompact}
            />

            {/* Top Bar - Responsive layout */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 400,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: isCompact ? 'column' : 'row',
                gap: isCompact ? '8px' : hudGap,
                alignItems: 'center',
                justifyContent: 'center',
                width: isCompact ? 'auto' : '100%',
                maxWidth: isCompact ? 'calc(100% - 100px)' : '1200px',
                padding: isCompact ? '0' : '0 24px'
            }}>
                {/* Compact mode: Single row with mode name, timer and score */}
                {isCompact ? (
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        {/* Mode Name */}
                        <div style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                            
                            
                            borderRadius: hudRadius,
                            border: '2px solid rgba(0, 229, 255, 0.2)',
                            padding: hudPadding,
                            boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
                        }}>
                            <span style={{
                                fontSize: '1rem',
                                fontWeight: 700,
                                color: '#00E5FF'
                            }}>
                                Bubble Pop
                            </span>
                        </div>

                        {/* Timer */}
                        <div style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                            
                            
                            borderRadius: hudRadius,
                            border: timeRemaining < 5000
                                ? '2px solid rgba(222, 49, 99, 0.6)'
                                : '2px solid rgba(255, 255, 255, 0.1)',
                            padding: hudPadding,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: timeRemaining < 5000
                                ? '0 0 15px rgba(222, 49, 99, 0.4)'
                                : '0 4px 16px rgba(0, 0, 0, 0.3)'
                        }}>
                            <span style={{ fontSize: '1rem' }}>⏱</span>
                            <span style={{
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                color: timeRemaining < 5000 ? '#DE3163' : '#00E5FF',
                                fontFamily: 'monospace'
                            }}>
                                {formatTime(timeRemaining)}
                            </span>
                        </div>

                        {/* Score */}
                        <div style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                            
                            
                            borderRadius: hudRadius,
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            padding: hudPadding,
                            boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
                        }}>
                            <span style={{
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                color: goalReached ? '#FFD93D' : '#00E5FF'
                            }}>
                                {score}/{currentGoal}
                            </span>
                        </div>
                    </div>
                ) : (
                    /* Desktop: Full layout */
                    <>
                        {/* Left: Mode Name */}
                        <div style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                            
                            
                            borderRadius: hudRadius,
                            border: '2px solid rgba(0, 229, 255, 0.2)',
                            padding: hudPadding,
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                        }}>
                            <div style={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                color: '#00E5FF',
                                textShadow: '0 0 10px rgba(0, 229, 255, 0.5)'
                            }}>
                                Bubble Pop
                            </div>
                        </div>

                        {/* Center: Timer */}
                        <div style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                            
                            
                            borderRadius: hudRadius,
                            border: timeRemaining < 5000
                                ? '2px solid rgba(222, 49, 99, 0.6)'
                                : '2px solid rgba(255, 255, 255, 0.1)',
                            padding: hudPadding,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: timeRemaining < 5000
                                ? '0 0 20px rgba(222, 49, 99, 0.4)'
                                : '0 8px 32px rgba(0, 0, 0, 0.3)'
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>⏱</span>
                            <span style={{
                                fontSize: '1.75rem',
                                fontWeight: 'bold',
                                color: timeRemaining < 5000 ? '#DE3163' : '#00E5FF',
                                fontFamily: 'monospace',
                                textShadow: timeRemaining < 5000
                                    ? '0 0 15px rgba(222, 49, 99, 0.6)'
                                    : '0 0 10px rgba(0, 229, 255, 0.5)'
                            }}>
                                {formatTime(timeRemaining)}
                            </span>
                        </div>

                        {/* Right: Score and Goal */}
                        <div style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                            
                            
                            borderRadius: hudRadius,
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            padding: hudPadding,
                            textAlign: 'center',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                        }}>
                            <div style={{
                                fontSize: '1.75rem',
                                fontWeight: 'bold',
                                color: goalReached ? '#FFD93D' : '#00E5FF',
                                textShadow: goalReached
                                    ? '0 0 20px rgba(255, 217, 61, 0.6)'
                                    : '0 0 10px rgba(0, 229, 255, 0.5)',
                                marginBottom: '4px'
                            }}>
                                Score {score} / {currentGoal}
                            </div>
                            <div style={{
                                fontSize: '0.85rem',
                                color: 'rgba(255,255,255,0.7)',
                                marginTop: '2px'
                            }}>
                                Pop {currentGoal} bubbles
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Motivation toasts handled by toastService — no in-component overlay */}

            {/* End-of-Round Modal - Center Screen - Responsive */}
            {showEndModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100dvh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    background: 'rgba(0, 0, 0, 0.6)',
                    
                    padding: isCompact ? '16px' : '24px',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        background: 'rgba(1, 12, 36, 0.95)',
                        
                        borderRadius: isCompact ? '24px' : '32px',
                        border: '3px solid rgba(255, 255, 255, 0.1)',
                        padding: isCompact ? '24px 28px' : '48px 56px',
                        textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                        maxWidth: isCompact ? '90%' : '500px',
                        width: '100%',
                        animation: 'modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div style={{
                            fontSize: isCompact ? '3rem' : '4rem',
                            marginBottom: isCompact ? '12px' : '20px',
                            animation: goalReached ? 'starGlow 1.2s ease infinite' : 'none'
                        }}>
                            {goalReached ? '⭐' : '✨'}
                        </div>

                        <h2 style={{
                            fontSize: isCompact ? '1.5rem' : '2.5rem',
                            fontWeight: 'bold',
                            color: goalReached ? '#FFD93D' : 'white',
                            textShadow: goalReached ? '0 0 30px #FFD93D' : 'none',
                            margin: `0 0 ${isCompact ? '10px' : '16px'} 0`
                        }}>
                            {goalReached
                                ? (isLastLevel ? 'All Levels Complete! 🎉' : 'Level Complete!')
                                : 'Nice Try!'
                            }
                        </h2>

                        <p style={{
                            fontSize: isCompact ? '1rem' : '1.3rem',
                            color: 'rgba(255,255,255,0.8)',
                            marginBottom: isCompact ? '20px' : '32px'
                        }}>
                            You popped <strong style={{ color: '#00E5FF' }}>{score}</strong> bubbles!
                            {goalReached && !isLastLevel && (
                                <div style={{ marginTop: '12px', fontSize: '1.1rem', color: '#FFD93D' }}>
                                    Moving to next level...
                                </div>
                            )}
                            {goalReached && isLastLevel && (
                                <div style={{ marginTop: '12px', fontSize: '1.1rem', color: '#FFD93D' }}>
                                    Amazing! You completed all {MAX_LEVEL} levels! 🌟
                                </div>
                            )}
                        </p>

                        <div style={{
                            display: 'flex',
                            gap: isCompact ? '10px' : '16px',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            {/* Next Level button - shown when goal reached and not last level */}
                            {goalReached && !isLastLevel && (
                                <button
                                    onClick={handleNextLevel}
                                    style={{
                                        padding: isCompact ? '12px 24px' : '16px 32px',
                                        background: 'linear-gradient(180deg, rgba(255, 217, 61, 0.4) 0%, rgba(255, 217, 61, 0.3) 100%)',
                                        border: '2px solid rgba(255, 217, 61, 0.6)',
                                        borderRadius: isCompact ? '16px' : '24px',
                                        color: '#FFD93D',
                                        cursor: 'pointer',
                                        fontSize: isCompact ? '0.95rem' : '1.1rem',
                                        fontWeight: 700,
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 4px 16px rgba(255, 217, 61, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                                        minWidth: '44px',
                                        minHeight: '44px'
                                    }}
                                    onMouseDown={(e) => {
                                        e.currentTarget.style.transform = 'scale(0.95)';
                                    }}
                                    onMouseUp={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    Next Level
                                </button>
                            )}
                            {/* Try Again button - always shown */}
                            <button
                                onClick={handleTryAgain}
                                style={{
                                    padding: isCompact ? '12px 24px' : '16px 32px',
                                    background: goalReached
                                        ? 'linear-gradient(180deg, rgba(79, 172, 254, 0.3) 0%, rgba(79, 172, 254, 0.2) 100%)'
                                        : 'linear-gradient(180deg, rgba(79, 172, 254, 0.4) 0%, rgba(79, 172, 254, 0.3) 100%)',
                                    border: '2px solid rgba(79, 172, 254, 0.5)',
                                    borderRadius: isCompact ? '16px' : '24px',
                                    color: '#4facfe',
                                    cursor: 'pointer',
                                    fontSize: isCompact ? '0.95rem' : '1.1rem',
                                    fontWeight: 700,
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 16px rgba(79, 172, 254, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                                    minWidth: '44px',
                                    minHeight: '44px'
                                }}
                                onMouseDown={(e) => {
                                    e.currentTarget.style.transform = 'scale(0.95)';
                                }}
                                onMouseUp={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Overlay — shown when all levels complete */}
            {showResultsOverlay && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100dvh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10001,
                    background: 'rgba(0,0,0,0.65)',
                    padding: isCompact ? '16px' : '24px',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        background: 'rgba(1,12,36,0.96)',
                        borderRadius: isCompact ? '24px' : '32px',
                        border: '2px solid rgba(255,215,61,0.35)',
                        padding: isCompact ? '28px 24px' : '52px 56px',
                        textAlign: 'center',
                        maxWidth: isCompact ? '92%' : '480px',
                        width: '100%',
                        animation: 'modalPop 0.4s cubic-bezier(0.34,1.56,0.64,1)'
                    }}>
                        {/* Trophy */}
                        <div style={{ fontSize: isCompact ? '3.5rem' : '4.5rem', marginBottom: isCompact ? '12px' : '20px' }}>
                            🏆
                        </div>

                        <h2 style={{
                            margin: `0 0 ${isCompact ? '10px' : '16px'} 0`,
                            fontSize: isCompact ? '1.6rem' : '2.4rem',
                            fontWeight: 800,
                            color: '#FFD93D',
                        }}>
                            All Done!
                        </h2>

                        <p style={{
                            fontSize: isCompact ? '1rem' : '1.2rem',
                            color: 'rgba(255,255,255,0.85)',
                            margin: `0 0 ${isCompact ? '6px' : '10px'} 0`
                        }}>
                            You completed all <strong style={{ color: '#00E5FF' }}>{MAX_LEVEL}</strong> levels!
                        </p>

                        {/* Stats */}
                        <div style={{
                            display: 'flex',
                            gap: isCompact ? '10px' : '16px',
                            justifyContent: 'center',
                            margin: `${isCompact ? '16px' : '28px'} 0`,
                            flexWrap: 'wrap'
                        }}>
                            {/* Score */}
                            <div style={{
                                background: 'rgba(0,229,255,0.1)',
                                border: '1.5px solid rgba(0,229,255,0.3)',
                                borderRadius: '16px',
                                padding: isCompact ? '10px 16px' : '14px 22px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: isCompact ? '1.6rem' : '2rem', fontWeight: 800, color: '#00E5FF' }}>
                                    {finalScore}
                                </div>
                                <div style={{ fontSize: isCompact ? '0.72rem' : '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                                    bubbles popped
                                </div>
                            </div>

                            {/* Accuracy */}
                            <div style={{
                                background: 'rgba(255,217,61,0.1)',
                                border: '1.5px solid rgba(255,217,61,0.3)',
                                borderRadius: '16px',
                                padding: isCompact ? '10px 16px' : '14px 22px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: isCompact ? '1.6rem' : '2rem', fontWeight: 800, color: '#FFD93D' }}>
                                    {Math.min(100, Math.round((finalScore / getCurrentGoal()) * 100))}%
                                </div>
                                <div style={{ fontSize: isCompact ? '0.72rem' : '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                                    accuracy
                                </div>
                            </div>

                            {/* Time */}
                            <div style={{
                                background: 'rgba(100,255,200,0.1)',
                                border: '1.5px solid rgba(100,255,200,0.25)',
                                borderRadius: '16px',
                                padding: isCompact ? '10px 16px' : '14px 22px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: isCompact ? '1.6rem' : '2rem', fontWeight: 800, color: '#64FFC8' }}>
                                    30s
                                </div>
                                <div style={{ fontSize: isCompact ? '0.72rem' : '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                                    per level
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div style={{
                            display: 'flex',
                            gap: isCompact ? '10px' : '14px',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            {/* Back to Menu */}
                            <button
                                onClick={onExit}
                                style={{
                                    padding: isCompact ? '12px 22px' : '14px 28px',
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '2px solid rgba(255,255,255,0.25)',
                                    borderRadius: isCompact ? '16px' : '20px',
                                    color: 'rgba(255,255,255,0.9)',
                                    cursor: 'pointer',
                                    fontSize: isCompact ? '0.95rem' : '1rem',
                                    fontWeight: 700,
                                    transition: 'transform 0.15s ease',
                                    minHeight: '44px',
                                    touchAction: 'manipulation'
                                }}
                                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                ← Menu
                            </button>

                            {/* Play Again */}
                            <button
                                onClick={handlePlayAgain}
                                style={{
                                    padding: isCompact ? '12px 22px' : '14px 28px',
                                    background: 'linear-gradient(180deg, rgba(255,217,61,0.35) 0%, rgba(255,217,61,0.25) 100%)',
                                    border: '2px solid rgba(255,217,61,0.55)',
                                    borderRadius: isCompact ? '16px' : '20px',
                                    color: '#FFD93D',
                                    cursor: 'pointer',
                                    fontSize: isCompact ? '0.95rem' : '1rem',
                                    fontWeight: 700,
                                    transition: 'transform 0.15s ease',
                                    minHeight: '44px',
                                    touchAction: 'manipulation'
                                }}
                                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                Play Again ↺
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Milestone Celebration */}
            {showMilestoneCelebration && (
                <Celebration
                    show={true}
                    message="Great job!"
                    subMessage={`${score} bubbles popped! 🎊`}
                    icon="🎉"
                    duration={2500}
                    showConfetti={true}
                    soundEffect={true}
                />
            )}

            {/* CSS animations */}
            <style>{`
                @keyframes modalPop {
                    0% {
                        transform: scale(0);
                        opacity: 0;
                    }
                    60% {
                        transform: scale(1.05);
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                
                @keyframes starGlow {
                    0%, 100% {
                        filter: drop-shadow(0 0 20px #FFD93D);
                        transform: scale(1);
                    }
                    50% {
                        filter: drop-shadow(0 0 40px #FFD93D);
                        transform: scale(1.1);
                    }
                }


            `}</style>
        </>
    );
};
