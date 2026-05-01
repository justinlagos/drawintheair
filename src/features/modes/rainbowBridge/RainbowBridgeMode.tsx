/**
 * RainbowBridgeMode — React UI wrapper for Rainbow Bridge.
 *
 * Bright Kid-UI design language:
 *   - Sky-and-rainbow themed background
 *   - KidObjectiveCard for the step instruction
 *   - KidPanel for the pattern indicator (with kid-bright stones)
 *   - Celebration 2.0 with stars
 */

import { useState, useEffect, useRef } from 'react';
import { Celebration } from '../../../components/Celebration';
import { GameTopBar } from '../../../components/GameTopBar';
import { RainbowBridgeBackground } from './RainbowBridgeBackground';
import { KidChip, KidPanel, KidObjectiveCard } from '../../../components/kid-ui';
import { tokens } from '../../../styles/tokens';
import {
    initRainbowBridge,
    getRainbowPattern,
    getRainbowCurrentStep,
    isRainbowLevelComplete,
    getRainbowCelebrationTime,
    getRainbowLevel,
    getRainbowTotalCompleted,
    advanceRainbowLevel,
    type RainbowColour,
} from './rainbowBridgeLogic';

interface RainbowBridgeModeProps {
    onExit?: () => void;
}

export const RainbowBridgeMode = ({ onExit }: RainbowBridgeModeProps) => {
    const [pattern, setPattern] = useState<RainbowColour[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [level, setLevel] = useState(1);
    const [totalCompleted, setTotalCompleted] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const levelCompletedRef = useRef(false);

    useEffect(() => { initRainbowBridge(); }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setPattern([...getRainbowPattern()]);
            setCurrentStep(getRainbowCurrentStep());
            setLevel(getRainbowLevel());
            setTotalCompleted(getRainbowTotalCompleted());

            const celebTime = getRainbowCelebrationTime();
            if (isRainbowLevelComplete() && celebTime > 0 && !levelCompletedRef.current) {
                levelCompletedRef.current = true;
                setShowCelebration(true);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleCelebrationDone = () => {
        levelCompletedRef.current = false;
        setShowCelebration(false);
        advanceRainbowLevel();
    };

    return (
        <div style={{
            position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
            fontFamily: tokens.fontFamily.body,
        }}>
            <RainbowBridgeBackground />

            {/* Back-to-menu top bar */}
            <GameTopBar onBack={onExit ?? (() => { })} />

            {/* TOP-LEFT: Mode + level chip */}
            <div style={{
                position: 'absolute', top: '100px', left: tokens.spacing.xxl,
                zIndex: tokens.zIndex.hud, pointerEvents: 'none',
            }}>
                <KidChip variant="neutral" size="md" icon={<span>🌈</span>}>
                    {`Level ${level}`}
                </KidChip>
            </div>

            {/* TOP-RIGHT: Bridges-built tally chip */}
            <div style={{
                position: 'absolute', top: '100px', right: tokens.spacing.xxl,
                zIndex: tokens.zIndex.hud, pointerEvents: 'none',
            }}>
                <KidChip variant="reward" size="md"
                         icon={<span style={{ color: tokens.colors.deepPlum }}>🏆</span>}>
                    {totalCompleted}<span style={{
                        color: tokens.semantic.textSecondary,
                        fontWeight: tokens.fontWeight.medium,
                        marginLeft: 4,
                    }}>built</span>
                </KidChip>
            </div>

            {/* TOP-CENTER: Step instruction */}
            <div style={{
                position: 'absolute', top: '170px', left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud, pointerEvents: 'none',
                maxWidth: 'min(640px, 90vw)',
            }}>
                <KidObjectiveCard icon="✨">
                    {pattern[currentStep] ? (
                        <>Step {currentStep + 1}: hover the{' '}
                            <span style={{
                                color: pattern[currentStep].hex,
                                fontWeight: tokens.fontWeight.extrabold,
                                textShadow: `0 1px 2px rgba(0,0,0,0.06)`,
                            }}>
                                {pattern[currentStep].name}
                            </span>
                            {' '}stone!</>
                    ) : (
                        <>Bridge complete!</>
                    )}
                </KidObjectiveCard>
            </div>

            {/* BOTTOM: Pattern progress stones in a soft panel */}
            <div style={{
                position: 'absolute', bottom: tokens.spacing.xl, left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud, pointerEvents: 'none',
            }}>
                <KidPanel size="sm" tone="white" style={{
                    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                    display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
                }}>
                    {pattern.map((col, i) => {
                        const isActive = i === currentStep;
                        const isDone = i < currentStep;
                        return (
                            <div key={i} style={{
                                width: '26px', height: '26px',
                                borderRadius: '50%',
                                background: col.hex,
                                border: isActive
                                    ? `3px solid ${tokens.semantic.primary}`
                                    : isDone
                                        ? `3px solid ${tokens.semantic.success}`
                                        : `2px solid rgba(108, 63, 164, 0.20)`,
                                boxShadow: isActive
                                    ? `0 0 14px ${col.glow}, 0 2px 6px rgba(0,0,0,0.10)`
                                    : `0 2px 4px rgba(108, 63, 164, 0.12)`,
                                transform: isActive ? 'scale(1.25)' : 'scale(1)',
                                transition: `transform ${tokens.motion.duration.quick} ${tokens.motion.ease.bounce}`,
                            }} />
                        );
                    })}
                </KidPanel>
            </div>

            <Celebration
                show={showCelebration}
                message="Rainbow Bridge Built!"
                subMessage="You matched all the colours!"
                icon="🌈"
                duration={2500}
                stars={2}
                showConfetti
                soundEffect
                onComplete={handleCelebrationDone}
            />
        </div>
    );
};
