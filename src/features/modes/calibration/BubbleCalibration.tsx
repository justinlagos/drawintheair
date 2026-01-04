import { useEffect, useState } from 'react';
import {
    getScore,
    getTimeRemaining,
    isGameActive,
    hasReachedMilestone,
    getGameEndTime,
    startBubbleGame
} from './bubbleCalibrationLogic';

interface BubbleCalibrationProps {
    onComplete: () => void;
}

const MILESTONE_SCORE = 20;
const GAME_DURATION = 30000; // 30 seconds

export const BubbleCalibration = ({ onComplete }: BubbleCalibrationProps) => {
    const [score, setScore] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
    const [milestoneReached, setMilestoneReached] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    useEffect(() => {
        startBubbleGame();
        
        const interval = setInterval(() => {
            setScore(getScore());
            setTimeRemaining(getTimeRemaining());
            setMilestoneReached(hasReachedMilestone());
            
            // Check for game end
            if (!isGameActive() && getGameEndTime()) {
                setShowCelebration(true);
                setTimeout(() => {
                    setShowCelebration(false);
                    onComplete();
                }, 3000);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [onComplete]);

    const progress = Math.min(score / MILESTONE_SCORE, 1);

    // Format time as MM:SS
    const formatTime = (ms: number) => {
        const seconds = Math.ceil(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: '40px',
            pointerEvents: 'none',
            zIndex: 30
        }}>
            {/* Header */}
            <div style={{
                background: 'rgba(15, 12, 41, 0.7)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '16px 32px',
                marginBottom: '20px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '2rem',
                    background: 'linear-gradient(135deg, #00FFFF, #FF00FF)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    Pop the Bubbles! 🫧
                </h2>
                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '1rem' }}>
                    Pop as many as you can in 30 seconds!
                </p>
            </div>

            {/* Timer */}
            <div style={{
                background: 'rgba(15, 12, 41, 0.7)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '12px 24px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                <span style={{
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: timeRemaining < 5000 ? '#FF4444' : '#00FFFF',
                    fontFamily: 'monospace',
                    textShadow: timeRemaining < 5000 ? '0 0 10px #FF4444' : 'none'
                }}>
                    {formatTime(timeRemaining)}
                </span>
            </div>

            {/* Score and Milestone */}
            <div style={{
                background: 'rgba(15, 12, 41, 0.7)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '16px 32px',
                marginBottom: '16px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: milestoneReached ? '#FFD700' : '#00FFFF',
                    textShadow: milestoneReached ? '0 0 20px #FFD700' : '0 0 10px #00FFFF',
                    marginBottom: '8px'
                }}>
                    {score}
                </div>
                <div style={{
                    fontSize: '1rem',
                    color: 'rgba(255,255,255,0.7)'
                }}>
                    {milestoneReached ? (
                        <span style={{ color: '#FFD700', fontWeight: 'bold' }}>
                            🎉 Amazing! 20+ pops! 🎉
                        </span>
                    ) : (
                        `Goal: ${MILESTONE_SCORE} pops`
                    )}
                </div>
            </div>

            {/* Milestone Progress */}
            {!milestoneReached && (
                <div style={{
                    width: '300px',
                    height: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.2)',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        width: `${progress * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #00FFFF, #FF00FF)',
                        borderRadius: '4px',
                        transition: 'width 0.2s ease',
                        boxShadow: '0 0 15px rgba(0,255,255,0.5)'
                    }} />
                </div>
            )}

            {/* Celebration Overlay */}
            {showCelebration && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                    textAlign: 'center',
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: '20px',
                        animation: 'bounce 0.5s ease infinite'
                    }}>
                        {milestoneReached ? '🎉🎊🎈' : '✨'}
                    </div>
                    <div style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        color: '#FFD700',
                        textShadow: '0 0 20px #FFD700',
                        marginBottom: '10px'
                    }}>
                        {milestoneReached ? 'Amazing!' : 'Great Job!'}
                    </div>
                    <div style={{
                        fontSize: '1.5rem',
                        color: 'white',
                        marginBottom: '20px'
                    }}>
                        You popped {score} bubbles!
                    </div>
                    {milestoneReached && (
                        <div style={{
                            fontSize: '1.2rem',
                            color: '#00FFFF',
                            marginTop: '20px',
                            padding: '12px 24px',
                            background: 'rgba(0, 245, 212, 0.2)',
                            borderRadius: '12px',
                            border: '1px solid rgba(0, 245, 212, 0.4)'
                        }}>
                            🏆 Unlock: New Brush Style! 🏆
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Export is handled in bubbleCalibrationLogic.ts
