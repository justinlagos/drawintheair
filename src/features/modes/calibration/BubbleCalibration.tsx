/**
 * Bubble Pop UI - PRIORITY C
 * 
 * Features:
 * - 30-second timer (always visible)
 * - End-of-round modal (center screen)
 * - Chapter progression
 * - Milestone rewards at 20 pops
 * - "Start Over" and "Next" buttons
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
    getCurrentChapter,
    canAdvanceChapter,
    getCurrentGoal,
    hasReachedGoal
} from './bubbleCalibrationLogic';
import { Celebration } from '../../../components/Celebration';

interface BubbleCalibrationProps {
    onComplete: () => void;
}

const GAME_DURATION = 30000; // 30 seconds

export const BubbleCalibration = ({ onComplete: _onComplete }: BubbleCalibrationProps) => {
    const [score, setScore] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
    const [milestoneReached, setMilestoneReached] = useState(false);
    const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
    const [showEndModal, setShowEndModal] = useState(false);
    const [chapter, setChapter] = useState(1);
    const [autoAdvanceScheduled, setAutoAdvanceScheduled] = useState(false);

    // Initialize game when chapter changes
    useEffect(() => {
        startBubbleGame(chapter as 1 | 2 | 3);
        // Reset UI state when chapter changes
        setShowEndModal(false);
        setScore(0);
        setTimeRemaining(GAME_DURATION);
        setMilestoneReached(false);
        setAutoAdvanceScheduled(false);
    }, [chapter]);
    
    // Game state update interval
    useEffect(() => {
        let autoAdvanceTimeout: number | undefined;
        
        const interval = setInterval(() => {
            const currentScore = getScore();
            const currentTimeRemaining = getTimeRemaining();
            const currentMilestoneReached = hasReachedMilestone();
            const currentChapter = getCurrentChapter();
            const currentGoal = getCurrentGoal();
            
            setScore(currentScore);
            setTimeRemaining(currentTimeRemaining);
            setMilestoneReached(currentMilestoneReached);
            setChapter(currentChapter);
            
            // Show milestone celebration when reached
            if (currentMilestoneReached && !hasCelebratedMilestone()) {
                setShowMilestoneCelebration(true);
                setMilestoneCelebrated();
                setTimeout(() => {
                    setShowMilestoneCelebration(false);
                }, 2500);
            }
            
            // Check for game end - show modal (only once)
            const gameEnded = !isGameActive() && getGameEndTime();
            if (gameEnded && !showEndModal && !autoAdvanceScheduled) {
                setShowEndModal(true);
                
                // Auto-advance on success - short celebration then automatic transition
                if (hasReachedGoal() && currentChapter < 3) {
                    setAutoAdvanceScheduled(true);
                    // Show reward, then auto-advance after 1500ms (short celebration)
                    autoAdvanceTimeout = window.setTimeout(() => {
                        const nextChapter = (currentChapter + 1) as 1 | 2 | 3;
                        // Close modal and reset state before advancing
                        setShowEndModal(false);
                        setAutoAdvanceScheduled(false);
                        // Set chapter - this will trigger the chapter useEffect to start the game
                        setChapter(nextChapter);
                    }, 1500);
                }
            }
        }, 100);

        return () => {
            clearInterval(interval);
            if (autoAdvanceTimeout !== undefined) {
                clearTimeout(autoAdvanceTimeout);
            }
        };
    }, [showEndModal, autoAdvanceScheduled]);

    const handleStartOver = () => {
        startBubbleGame(chapter as 1 | 2 | 3);
        setShowEndModal(false);
        setScore(0);
        setTimeRemaining(GAME_DURATION);
        setMilestoneReached(false);
    };

    const handleNextChapter = () => {
        if (canAdvanceChapter()) {
            const nextChapter = (chapter + 1) as 1 | 2 | 3;
            startBubbleGame(nextChapter);
            setChapter(nextChapter);
            setShowEndModal(false);
            setScore(0);
            setTimeRemaining(GAME_DURATION);
            setMilestoneReached(false);
        }
    };

    const currentGoal = getCurrentGoal();
    const progress = Math.min(score / currentGoal, 1);

    // Format time as MM:SS
    const formatTime = (ms: number) => {
        const seconds = Math.ceil(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <>
            {/* Top UI - Timer and Score */}
            <div style={{
                position: 'absolute',
                top: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 30,
                pointerEvents: 'none',
                display: 'flex',
                gap: '20px',
                alignItems: 'center'
            }}>
                {/* Timer - Large and visible */}
                <div style={{
                    background: 'rgba(1, 12, 36, 0.9)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    border: timeRemaining < 5000 ? '3px solid #DE3163' : '2px solid rgba(255, 255, 255, 0.1)',
                    padding: '16px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: timeRemaining < 5000 
                        ? '0 0 30px rgba(222, 49, 99, 0.5)' 
                        : '0 8px 32px rgba(0, 0, 0, 0.4)'
                }}>
                    <span style={{ fontSize: '2rem' }}>⏱️</span>
                    <span style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        color: timeRemaining < 5000 ? '#DE3163' : '#00E5FF',
                        fontFamily: 'monospace',
                        textShadow: timeRemaining < 5000 
                            ? '0 0 20px #DE3163' 
                            : '0 0 15px #00E5FF'
                    }}>
                        {formatTime(timeRemaining)}
                    </span>
                </div>

                {/* Score */}
                <div style={{
                    background: 'rgba(1, 12, 36, 0.9)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    padding: '16px 32px',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                }}>
                    <div style={{
                        fontSize: '3.5rem',
                        fontWeight: 'bold',
                        color: milestoneReached ? '#FFD93D' : '#00E5FF',
                        textShadow: milestoneReached 
                            ? '0 0 30px #FFD93D' 
                            : '0 0 20px #00E5FF',
                        marginBottom: '8px'
                    }}>
                        {score}
                    </div>
                    <div style={{
                        fontSize: '0.9rem',
                        color: 'rgba(255,255,255,0.7)'
                    }}>
                        {milestoneReached ? '🎉 Goal Reached!' : `Goal: ${currentGoal}`}
                    </div>
                </div>
            </div>

            {/* Chapter indicator - Top Left */}
            <div style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                zIndex: 30,
                pointerEvents: 'none'
            }}>
                <div style={{
                    background: 'rgba(1, 12, 36, 0.9)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    padding: '12px 20px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                }}>
                    <div style={{
                        fontSize: '1rem',
                        color: 'rgba(255,255,255,0.8)',
                        fontWeight: 600
                    }}>
                        Chapter {chapter} of 3
                    </div>
                </div>
            </div>

            {/* Milestone Progress Bar */}
            {!milestoneReached && (
                <div style={{
                    position: 'absolute',
                    top: '140px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 30,
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        width: '350px',
                        height: '12px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '2px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{
                            width: `${progress * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #00E5FF, #FFD93D)',
                            borderRadius: '6px',
                            transition: 'width 0.2s ease',
                            boxShadow: '0 0 20px rgba(0,229,255,0.6)'
                        }} />
                    </div>
                </div>
            )}

            {/* End-of-Round Modal - Center Screen */}
            {showEndModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{
                        background: 'rgba(1, 12, 36, 0.95)',
                        backdropFilter: 'blur(30px)',
                        borderRadius: '32px',
                        border: '3px solid rgba(255, 255, 255, 0.1)',
                        padding: '48px 56px',
                        textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                        maxWidth: '500px',
                        animation: 'modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: '20px',
                            animation: hasReachedGoal() ? 'starGlow 1.5s ease infinite' : 'none'
                        }}>
                            {hasReachedGoal() ? '⭐' : '✨'}
                        </div>
                        
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            color: hasReachedGoal() ? '#FFD93D' : 'white',
                            marginBottom: '16px',
                            textShadow: hasReachedGoal() ? '0 0 30px #FFD93D' : 'none'
                        }}>
                            {hasReachedGoal() ? 'Chapter Complete!' : 'Nice try, want to go again?'}
                        </h2>
                        
                        <p style={{
                            fontSize: '1.3rem',
                            color: 'rgba(255,255,255,0.8)',
                            marginBottom: '32px'
                        }}>
                            You popped <strong style={{ color: '#00E5FF' }}>{score}</strong> bubbles!
                            {hasReachedGoal() && chapter < 3 && (
                                <div style={{ marginTop: '12px', fontSize: '1.1rem', color: '#FFD93D' }}>
                                    Moving to next chapter...
                                </div>
                            )}
                        </p>

                        <div style={{
                            display: 'flex',
                            gap: '16px',
                            justifyContent: 'center'
                        }}>
                            {/* Start Over button - always shown */}
                            <button
                                onClick={handleStartOver}
                                style={{
                                    padding: '16px 32px',
                                    background: hasReachedGoal()
                                        ? 'linear-gradient(180deg, rgba(79, 172, 254, 0.3) 0%, rgba(79, 172, 254, 0.2) 100%)'
                                        : 'linear-gradient(180deg, rgba(79, 172, 254, 0.4) 0%, rgba(79, 172, 254, 0.3) 100%)',
                                    border: '2px solid rgba(79, 172, 254, 0.5)',
                                    borderRadius: '24px',
                                    color: '#4facfe',
                                    cursor: 'pointer',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 16px rgba(79, 172, 254, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
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
                                Start Over
                            </button>

                            {/* Next button - only shown on success, but auto-advance is happening */}
                            {hasReachedGoal() && chapter < 3 && !autoAdvanceScheduled && (
                                <button
                                    onClick={handleNextChapter}
                                    style={{
                                        padding: '16px 32px',
                                        background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.4) 0%, rgba(255, 215, 0, 0.3) 100%)',
                                        border: '2px solid rgba(255, 215, 0, 0.6)',
                                        borderRadius: '24px',
                                        color: '#FFD700',
                                        cursor: 'pointer',
                                        fontSize: '1.1rem',
                                        fontWeight: 700,
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 4px 16px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
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
                                    Next Chapter →
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Milestone Celebration */}
            {showMilestoneCelebration && (
                <Celebration
                    show={true}
                    message="Amazing!"
                    subMessage={`${score} bubbles popped! 🎊`}
                    icon="🎉"
                    duration={2500}
                    showConfetti={true}
                    soundEffect={true}
                />
            )}

            {/* CSS animation */}
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
