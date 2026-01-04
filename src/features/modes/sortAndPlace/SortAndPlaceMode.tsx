import { useState, useEffect } from 'react';
import {
    getCurrentRound,
    getScore,
    getTotalObjects,
    isRoundComplete,
    getCelebrationTime,
    nextRound,
    resetAllRounds,
    startSortRound
} from './sortAndPlaceLogic';
import { Celebration } from '../../../components/Celebration';

export const SortAndPlaceMode = () => {
    const [round, setRound] = useState<'color' | 'size' | 'category'>('color');
    const [score, setScore] = useState(0);
    const [total, setTotal] = useState(5);
    const [showCelebration, setShowCelebration] = useState(false);
    const [roundNumber, setRoundNumber] = useState(1);

    useEffect(() => {
        startSortRound('color');
        
        const interval = setInterval(() => {
            setRound(getCurrentRound());
            setScore(getScore());
            setTotal(getTotalObjects());
            
            if (isRoundComplete() && getCelebrationTime() > 0) {
                setShowCelebration(true);
                setTimeout(() => {
                    setShowCelebration(false);
                    if (nextRound()) {
                        setRoundNumber(prev => prev + 1);
                    } else {
                        // All rounds complete
                        setRoundNumber(1);
                        resetAllRounds();
                    }
                }, 2500);
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    const roundLabels = {
        color: { title: 'Sort by Color', icon: '🎨', instruction: 'Put red things here, blue things there!' },
        size: { title: 'Sort by Size', icon: '📦', instruction: 'Big things here, small things there!' },
        category: { title: 'Sort by Type', icon: '🗂️', instruction: 'Food here, toys there!' }
    };

    const label = roundLabels[round];

    return (
        <>
            {/* Top Left - Mode indicator */}
            <div style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                zIndex: 20
            }}>
                <div style={{
                    background: 'rgba(15, 12, 41, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '16px 24px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>{label.icon}</span>
                        <span style={{
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Sort and Place
                        </span>
                    </div>
                    <div style={{
                        fontSize: '0.9rem',
                        color: 'rgba(255,255,255,0.7)',
                        marginBottom: '8px'
                    }}>
                        Round {roundNumber} of 3: <strong style={{ color: 'white' }}>{label.title}</strong>
                    </div>
                    <div style={{
                        fontSize: '0.85rem',
                        color: 'rgba(255,255,255,0.6)'
                    }}>
                        {score} / {total} sorted
                    </div>
                </div>
            </div>

            {/* Instruction */}
            <div style={{
                position: 'absolute',
                top: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                pointerEvents: 'none'
            }}>
                <div style={{
                    background: 'rgba(0, 245, 212, 0.15)',
                    border: '1px solid rgba(0, 245, 212, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    color: '#00f5d4',
                    fontSize: '1.1rem',
                    textAlign: 'center'
                }}>
                    👆 {label.instruction}
                </div>
            </div>

            {/* Celebration */}
            <Celebration
                show={showCelebration}
                message={roundNumber === 3 ? "All Rounds Complete!" : "Round Complete!"}
                subMessage={roundNumber === 3 ? "🎉 Amazing work! 🎉" : "Great job!"}
                icon="🎉"
            />
        </>
    );
};

