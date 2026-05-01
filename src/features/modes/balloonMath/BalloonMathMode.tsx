/**
 * BalloonMathMode — React UI wrapper for the Balloon Pop Math mode.
 *
 * Bright Kid-UI design language:
 *   - Sky-and-balloon themed background (BalloonMathBackground)
 *   - KidObjectiveCard for the equation/target prompt
 *   - KidPanel + KidProgressBar + KidChip for level/score HUD
 *   - Celebration 2.0 with stars
 *
 * Game logic untouched — this is purely a visual migration.
 */

import { useState, useEffect, useRef } from 'react';
import { Celebration } from '../../../components/Celebration';
import { GameTopBar } from '../../../components/GameTopBar';
import { BalloonMathBackground } from './BalloonMathBackground';
import {
    KidChip,
    KidPanel,
    KidProgressBar,
} from '../../../components/kid-ui';
import { tokens } from '../../../styles/tokens';
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
    const levelCompletedRef = useRef(false);

    useEffect(() => { initBalloonMath(0); }, []);

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
    const progress = popsNeeded > 0 ? popsThisLevel / popsNeeded : 0;

    return (
        <div style={{
            position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
            fontFamily: tokens.fontFamily.body,
        }}>
            <BalloonMathBackground />

            {/* Back-to-menu top bar (no stage label — bespoke panel below) */}
            <GameTopBar onBack={onExit ?? (() => { })} />

            {/* TOP-CENTER: Objective card with the equation/target — big Fredoka */}
            <div style={{
                position: 'absolute',
                top: '92px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'none',
                maxWidth: 'min(640px, 90vw)',
            }}>
                <KidPanel size="md" tone="white" style={{
                    textAlign: 'center',
                    padding: `${tokens.spacing.md} ${tokens.spacing.xxl}`,
                }}>
                    <div style={{
                        fontFamily: tokens.fontFamily.body,
                        fontWeight: tokens.fontWeight.semibold,
                        fontSize: tokens.fontSize.label,
                        color: tokens.semantic.textSecondary,
                        marginBottom: tokens.spacing.xs,
                    }}>
                        Pop the number
                    </div>
                    <div style={{
                        fontFamily: tokens.fontFamily.display,
                        fontWeight: tokens.fontWeight.extrabold,
                        fontSize: 'clamp(2.6rem, 7vw, 4.2rem)',
                        lineHeight: 1,
                        color: tokens.semantic.primary,
                        letterSpacing: tokens.letterSpacing.tight,
                    }}>
                        {isUsingEquation
                            ? <>{equation[0]} + {equation[1]} = ?</>
                            : target}
                    </div>
                </KidPanel>
            </div>

            {/* TOP-LEFT: Level chip */}
            <div style={{
                position: 'absolute', top: '100px', left: tokens.spacing.xxl,
                zIndex: tokens.zIndex.hud, pointerEvents: 'none',
            }}>
                <KidChip variant="neutral" size="md" icon={<span>🎈</span>}>
                    {levelName || `Level ${level}`}
                </KidChip>
            </div>

            {/* TOP-RIGHT: Score chip */}
            <div style={{
                position: 'absolute', top: '100px', right: tokens.spacing.xxl,
                zIndex: tokens.zIndex.hud, pointerEvents: 'none',
            }}>
                <KidChip variant="score" size="md"
                         icon={<span style={{ color: tokens.colors.sunshine }}>★</span>}>
                    {score}
                </KidChip>
            </div>

            {/* BOTTOM: Progress bar in a soft panel */}
            <div style={{
                position: 'absolute',
                bottom: tokens.spacing.xl,
                left: '8%',
                right: '8%',
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'none',
            }}>
                <KidPanel size="sm" tone="white" style={{ padding: tokens.spacing.md }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing.md,
                    }}>
                        <span style={{
                            fontFamily: tokens.fontFamily.heading,
                            fontWeight: tokens.fontWeight.bold,
                            fontSize: tokens.fontSize.label,
                            color: tokens.semantic.textPrimary,
                            whiteSpace: 'nowrap',
                        }}>
                            {popsThisLevel}<span style={{ color: tokens.semantic.textMuted }}>{` / ${popsNeeded}`}</span>
                        </span>
                        <div style={{ flex: 1 }}>
                            <KidProgressBar
                                value={progress}
                                tone={progress >= 1 ? 'lime' : 'sunshine'}
                                ariaLabel={`Progress, ${popsThisLevel} of ${popsNeeded} pops`}
                            />
                        </div>
                    </div>
                </KidPanel>
            </div>

            <Celebration
                show={showCelebration}
                message={isLastBalloonMathLevel() ? 'All Levels Done!' : 'Level Complete!'}
                subMessage={isLastBalloonMathLevel() ? "You're a Math Star!" : 'Ready for the next one?'}
                icon="🎈"
                duration={2500}
                stars={isLastBalloonMathLevel() ? 3 : 2}
                showConfetti
                soundEffect
                onComplete={handleCelebrationDone}
            />
        </div>
    );
};
