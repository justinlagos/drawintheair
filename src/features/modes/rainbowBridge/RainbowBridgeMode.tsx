/**
 * RainbowBridgeMode.tsx
 *
 * React UI wrapper for the Rainbow Bridge game mode.
 * Shows step counter, level info, and celebration overlay.
 */

import { useState, useEffect, useRef } from 'react';
import { Celebration } from '../../../components/Celebration';
import { GameTopBar } from '../../../components/GameTopBar';
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

    useEffect(() => {
        initRainbowBridge();
    }, []);

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
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            fontFamily: "'Outfit', system-ui, sans-serif",
        }}>
            <GameTopBar
                onBack={onExit ?? (() => { })}
                stage={`Level ${level} · ${totalCompleted} bridges built`}
            />

            {/* Pattern steps indicator */}
            <div style={{
                position: 'absolute',
                bottom: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                zIndex: 20,
                pointerEvents: 'none',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '999px',
                padding: '8px 18px',
                border: '1.5px solid rgba(255,255,255,0.2)',
            }}>
                {pattern.map((col, i) => (
                    <div key={i} style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: col.hex,
                        border: i === currentStep
                            ? '3px solid #ffffff'
                            : i < currentStep
                                ? '3px solid #00FF88'
                                : '2px solid rgba(255,255,255,0.3)',
                        boxShadow: i === currentStep ? `0 0 12px ${col.glow}` : 'none',
                        transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                        transition: 'transform 0.2s ease',
                    }} />
                ))}
            </div>

            {/* Instruction label */}
            <div style={{
                position: 'absolute',
                top: '64px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 'clamp(0.8rem, 2.5vw, 1rem)',
                fontWeight: 700,
                background: 'rgba(0,0,0,0.35)',
                padding: '6px 18px',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
                zIndex: 20,
                pointerEvents: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
            }}>
                {pattern[currentStep] ? (
                    <>Step {currentStep + 1}: hover the <span style={{ color: pattern[currentStep].hex, fontWeight: 900 }}>{pattern[currentStep].name}</span> stone!</>
                ) : (
                    '🌈 Bridge complete!'
                )}
            </div>

            <Celebration
                show={showCelebration}
                message="🌈 Rainbow Bridge Built!"
                subMessage="You matched all the colours!"
                icon="🌈"
                duration={2500}
                onComplete={handleCelebrationDone}
            />
        </div>
    );
};
