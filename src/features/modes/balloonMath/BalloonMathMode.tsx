/**
 * BalloonMathMode.tsx
 *
 * React UI wrapper for the Balloon Pop Math game mode.
 * Renders the equation/target at the top, score, progress bar,
 * and celebration. Per-frame canvas work is done by balloonMathLogic.ts
 */

import { useState, useEffect, useRef } from 'react';
import { Celebration } from '../../../components/Celebration';
import { GameTopBar } from '../../../components/GameTopBar';
import {
    initBalloonMath,
    getBalloonMathScore,
    getBalloonMathLevel,
    getBalloonMathTarget,
    getBalloonMathEquation,
    isBalloonMathLevelComplete,
    getBalloonMathCelebrationTime,
    getBalloonMathLevelName,
    getBalloonMathPopsNeeded,
    getBalloonMathPopsThisLevel,
    isLastBalloonMathLevel,
    advanceBalloonMathLevel,
} from './balloonMathLogic';

interface BalloonMathModeProps {
    onExit?: () => void;
}

export const BalloonMathMode = ({ onExit }: BalloonMathModeProps) => {
    const [target, setTarget] = useState(1);
    const [equation, setEquation] = useState<[number, number]>([0, 0]);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [levelName, setLevelName] = useState('');
    const [popsThisLevel, setPopsThisLevel] = useState(0);
    const [popsNeeded, setPopsNeeded] = useState(3);
    const [showCelebration, setShowCelebration] = useState(false);
    // useRef so polling always reads the latest value without stale closure
    const levelCompletedRef = useRef(false);

    // Initialise game on mount
    useEffect(() => {
        initBalloonMath(0);
    }, []);

    // Poll module-level state every 100ms (same pattern as ColourBuilderMode)
    useEffect(() => {
        const interval = setInterval(() => {
            setTarget(getBalloonMathTarget());
            setEquation(getBalloonMathEquation());
            setScore(getBalloonMathScore());
            setLevel(getBalloonMathLevel());
            setLevelName(getBalloonMathLevelName());
            setPopsThisLevel(getBalloonMathPopsThisLevel());
            setPopsNeeded(getBalloonMathPopsNeeded());

            const celebTime = getBalloonMathCelebrationTime();
            if (isBalloonMathLevelComplete() && celebTime > 0 && !levelCompletedRef.current) {
                levelCompletedRef.current = true;
                setShowCelebration(true);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleCelebrationDone = () => {
        levelCompletedRef.current = false;
        setShowCelebration(false);
        advanceBalloonMathLevel();
    };

    const isUsingEquation = equation[0] > 0;
    const progressPct = popsNeeded > 0 ? (popsThisLevel / popsNeeded) * 100 : 0;

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', fontFamily: "'Outfit', system-ui, sans-serif" }}>

            {/* Top bar */}
            <GameTopBar
                onBack={onExit ?? (() => { })}
                stage={`${levelName} · Score ${score}`}
            />

            {/* Target equation banner */}
            <div style={{
                position: 'absolute',
                top: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 200,
                textAlign: 'center',
                pointerEvents: 'none',
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
                    border: '2px solid rgba(255,255,255,0.25)',
                    borderRadius: '24px',
                    padding: '14px 32px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    whiteSpace: 'nowrap',
                }}>
                    <div style={{
                        fontSize: 'clamp(0.8rem, 2.5vw, 1rem)',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.7)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                    }}>
                        🎈 Pop the number
                    </div>
                    <div style={{
                        fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                        fontWeight: 900,
                        lineHeight: 1,
                        background: 'linear-gradient(135deg, #FFD93D 0%, #FF6B6B 50%, #C77DFF 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-2px',
                    }}>
                        {isUsingEquation
                            ? <>{equation[0]} + {equation[1]} = ?</>
                            : target
                        }
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div style={{
                position: 'absolute',
                bottom: '18px',
                left: '10%',
                right: '10%',
                height: '8px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '4px',
                zIndex: 200,
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    background: 'linear-gradient(90deg, #FFD93D, #FF6B6B)',
                    borderRadius: '4px',
                    transition: 'width 0.35s ease-out',
                    boxShadow: '0 0 10px rgba(255,217,61,0.6)',
                }} />
            </div>

            {/* Level label */}
            <div style={{
                position: 'absolute',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.55)',
                fontSize: '0.75rem',
                fontWeight: 600,
                zIndex: 200,
                pointerEvents: 'none',
            }}>
                Level {level}
            </div>

            <Celebration
                show={showCelebration}
                message={isLastBalloonMathLevel() ? '🏆 All Levels Done!' : '🎉 Level Complete!'}
                subMessage={isLastBalloonMathLevel() ? 'You\'re a Math Star!' : 'Ready for the next one?'}
                icon="🎈"
                duration={2500}
                onComplete={handleCelebrationDone}
            />
        </div>
    );
};
