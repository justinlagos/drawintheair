/**
 * Bubble Pop UI - Nintendo-Quality Casual Game Experience
 * 
 * Features:
 * - Clean, aligned top bar with mode name, timer, and score
 * - Level progression (3 levels)
 * - Smooth transitions and celebrations
 * - No frozen states - always recoverable
 * - Child-friendly messaging and encouragement
 * - Fully responsive across all screen sizes
 */

import { useEffect, useState } from 'react';
import {
    getScore,
    getTimeRemaining,
    isGameActive,
    hasReachedMilestone,
    hasCelebratedMilestone,
    setMilestoneCelebrated,
    getGameEndTime,
    startBubbleGame,
    getCurrentLevel,
    getCurrentGoal,
    hasReachedGoal
} from './bubbleCalibrationLogic';
import { Celebration } from '../../../components/Celebration';

interface BubbleCalibrationProps {
    onComplete: () => void;
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

export const BubbleCalibration = ({ onComplete: _onComplete }: BubbleCalibrationProps) => {
    const [score, setScore] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
    const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
    const [showEndModal, setShowEndModal] = useState(false);
    const [level, setLevel] = useState(1);
    const [autoAdvanceScheduled, setAutoAdvanceScheduled] = useState(false);
    const [encouragementMessage, setEncouragementMessage] = useState<string | null>(null);
    
    const layout = useResponsiveHUD();
    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;

    // Initialize game when level changes
    useEffect(() => {
        startBubbleGame(level as 1 | 2 | 3);
        // Reset UI state when level changes
        setShowEndModal(false);
        setScore(0);
        setTimeRemaining(GAME_DURATION);
        setAutoAdvanceScheduled(false);
        setEncouragementMessage(null);
    }, [level]);
    
    // Game state update interval
    useEffect(() => {
        let autoAdvanceTimeout: number | undefined;
        let encouragementTimeout: number | undefined;
        
        const interval = setInterval(() => {
            const currentScore = getScore();
            const currentTimeRemaining = getTimeRemaining();
            const currentMilestoneReached = hasReachedMilestone();
            const currentLevel = getCurrentLevel();
            const currentGoal = getCurrentGoal();
            const gameIsActive = isGameActive();
            
            setScore(currentScore);
            setTimeRemaining(currentTimeRemaining);
            setLevel(currentLevel);
            
            // Show milestone celebration when reached
            if (currentMilestoneReached && !hasCelebratedMilestone()) {
                setShowMilestoneCelebration(true);
                setMilestoneCelebrated();
                setTimeout(() => {
                    setShowMilestoneCelebration(false);
                }, 2500);
            }
            
            // Show encouragement messages
            if (gameIsActive && currentScore > 0) {
                const progress = currentScore / currentGoal;
                if (progress >= 0.8 && progress < 1 && !encouragementMessage) {
                    setEncouragementMessage("Almost there!");
                    if (encouragementTimeout) clearTimeout(encouragementTimeout);
                    encouragementTimeout = window.setTimeout(() => {
                        setEncouragementMessage(null);
                    }, 2000);
                } else if (progress >= 0.5 && progress < 0.8 && !encouragementMessage) {
                    setEncouragementMessage("Keep going!");
                    if (encouragementTimeout) clearTimeout(encouragementTimeout);
                    encouragementTimeout = window.setTimeout(() => {
                        setEncouragementMessage(null);
                    }, 2000);
                }
            }
            
            // Check for game end - more robust detection
            // Game ends when timer reaches 0 OR when gameEndTime is set
            const gameEnded = (!gameIsActive && currentTimeRemaining <= 0) || (!gameIsActive && getGameEndTime() !== null);
            
            if (gameEnded && !showEndModal && !autoAdvanceScheduled) {
                setShowEndModal(true);
                
                // Auto-advance on success - brief celebration then automatic transition
                const goalReached = hasReachedGoal();
                if (goalReached && currentLevel < 3) {
                    setAutoAdvanceScheduled(true);
                    // Show reward, then auto-advance after 1200ms (brief celebration)
                    autoAdvanceTimeout = window.setTimeout(() => {
                        const nextLevel = (currentLevel + 1) as 1 | 2 | 3;
                        // Close modal and reset state before advancing
                        setShowEndModal(false);
                        setAutoAdvanceScheduled(false);
                        // Set level - this will trigger the level useEffect to start the game
                        setLevel(nextLevel);
                    }, 1200);
                }
            }
        }, 100);

        return () => {
            clearInterval(interval);
            if (autoAdvanceTimeout !== undefined) {
                clearTimeout(autoAdvanceTimeout);
            }
            if (encouragementTimeout !== undefined) {
                clearTimeout(encouragementTimeout);
            }
        };
    }, [showEndModal, autoAdvanceScheduled, encouragementMessage, level]);

    const handleTryAgain = () => {
        // Reset all state and restart game
        startBubbleGame(level as 1 | 2 | 3);
        setShowEndModal(false);
        setScore(0);
        setTimeRemaining(GAME_DURATION);
        setEncouragementMessage(null);
        setAutoAdvanceScheduled(false);
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
    const isLastLevel = level === 3;

    // Responsive sizing
    const hudSpacing = isCompact ? '12px' : '20px';
    const hudPadding = isCompact ? '8px 14px' : '12px 24px';
    const hudRadius = isCompact ? '12px' : '16px';
    const hudGap = isCompact ? '10px' : '24px';

    return (
        <>
            {/* Top Bar - Responsive layout */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 30,
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
                {/* Compact mode: Single row with timer and score */}
                {isCompact ? (
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        {/* Timer */}
                        <div style={{
                            background: 'rgba(1, 12, 36, 0.85)',
                            backdropFilter: 'blur(20px)',
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
                            background: 'rgba(1, 12, 36, 0.85)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: hudRadius,
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            padding: hudPadding,
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
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
                            background: 'rgba(1, 12, 36, 0.85)',
                            backdropFilter: 'blur(20px)',
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
                            background: 'rgba(1, 12, 36, 0.85)',
                            backdropFilter: 'blur(20px)',
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
                            background: 'rgba(1, 12, 36, 0.85)',
                            backdropFilter: 'blur(20px)',
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

            {/* Mode name - Top Left (hidden on compact) */}
            {!isCompact && (
                <div style={{
                    position: 'absolute',
                    top: hudSpacing,
                    left: hudSpacing,
                    zIndex: 30,
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        background: 'rgba(1, 12, 36, 0.7)',
                        backdropFilter: 'blur(15px)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '8px 16px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                    }}>
                        <div style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255,255,255,0.7)',
                            fontWeight: 500
                        }}>
                            Bubble Pop
                        </div>
                    </div>
                </div>
            )}

            {/* Encouragement Message - Center, fades in/out */}
            {encouragementMessage && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 25,
                    pointerEvents: 'none',
                    animation: 'fadeInOut 2s ease-in-out'
                }}>
                    <div style={{
                        background: 'rgba(1, 12, 36, 0.9)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '20px',
                        border: '2px solid rgba(255, 217, 61, 0.4)',
                        padding: '16px 32px',
                        boxShadow: '0 8px 32px rgba(255, 217, 61, 0.3)'
                    }}>
                        <div style={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            color: '#FFD93D',
                            textShadow: '0 0 20px rgba(255, 217, 61, 0.6)'
                        }}>
                            {encouragementMessage}
                        </div>
                    </div>
                </div>
            )}

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
                    backdropFilter: 'blur(10px)',
                    padding: isCompact ? '16px' : '24px',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        background: 'rgba(1, 12, 36, 0.95)',
                        backdropFilter: 'blur(30px)',
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
                            marginBottom: isCompact ? '10px' : '16px',
                            textShadow: goalReached ? '0 0 30px #FFD93D' : 'none',
                            margin: 0
                        }}>
                            {goalReached 
                                ? (isLastLevel ? 'All Levels Complete!' : 'Level Complete!')
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
                                    Great job completing all levels! 🎉
                                </div>
                            )}
                        </p>

                        <div style={{
                            display: 'flex',
                            gap: isCompact ? '10px' : '16px',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
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

                @keyframes fadeInOut {
                    0%, 100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.9);
                    }
                    20%, 80% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
            `}</style>
        </>
    );
};
