import React, { useState, useEffect } from 'react';
import {
    getScore,
    isRoundComplete,
    getCelebrationTime,
    getCurrentStage,
    getCurrentLevel,
    getTotalLevels,
    startLevel,
    advanceLevel,
} from './sortAndPlaceLogic';
import { Celebration } from '../../../components/Celebration';
import { GameTopBar } from '../../../components/GameTopBar';
import { earnSticker } from '../../../core/stickerBook';
import { featureFlags } from '../../../core/featureFlags';
import { showToast, getRandomMotivation } from '../../../core/toastService';

const useResponsiveLayout = () => {
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

interface SortAndPlaceModeProps {
    onExit?: () => void;
}

export const SortAndPlaceMode = ({ onExit }: SortAndPlaceModeProps = {}) => {
    const [stageTitle, setStageTitle] = useState('');
    const [score, setScore] = useState(0);
    const [total, setTotal] = useState(8);
    const [showCelebration, setShowCelebration] = useState(false);
    const [levelNumber, setLevelNumber] = useState(1);
    const [allLevelsComplete, setAllLevelsComplete] = useState(false);
    const [currentStageKey, setCurrentStageKey] = useState(0);
    const [floatingPoints, setFloatingPoints] = useState<{ id: number; x: number; y: number }[]>([]);
    const [dropFeedback, setDropFeedback] = useState<'correct' | 'wrong' | null>(null);
    const lastScoreRef = React.useRef(0);
    const lastRoundCompleteRef = React.useRef(false);
    // Track which level index to load when the effect re-runs after a stage advance
    const nextLevelRef = React.useRef(0);

    const layout = useResponsiveLayout();
    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;

    useEffect(() => {
        // Start the level from the ref (0 on first mount, updated before each advance)
        startLevel(nextLevelRef.current);
        setLevelNumber(getCurrentLevel());
        // Reset score tracking for the new level
        lastScoreRef.current = 0;

        const interval = setInterval(() => {
            const stage = getCurrentStage();
            if (stage) {
                setStageTitle(stage.title);
                setTotal(stage.items.length);
            }

            const newScore = getScore();
            if (newScore > lastScoreRef.current) {
                // Show correct-drop feedback
                setDropFeedback('correct');
                setTimeout(() => setDropFeedback(null), 600);
                // Floating +1
                const newPoint = {
                    id: Date.now(),
                    x: window.innerWidth / 2 + (Math.random() * 100 - 50),
                    y: window.innerHeight / 3 + (Math.random() * 50 - 25)
                };
                setFloatingPoints(prev => [...prev, newPoint]);
                setTimeout(() => {
                    setFloatingPoints(prev => prev.filter(p => p.id !== newPoint.id));
                }, 1000);
            }
            lastScoreRef.current = newScore;
            setScore(newScore);

            if (isRoundComplete() && getCelebrationTime() > 0 && !lastRoundCompleteRef.current) {
                lastRoundCompleteRef.current = true;
                setShowCelebration(true);
                showToast(getRandomMotivation(), 'success', 1500);
                if (featureFlags.getFlag('stickerRewards')) {
                    earnSticker('sorting-complete');
                }
                setTimeout(() => {
                    lastRoundCompleteRef.current = false;
                    setShowCelebration(false);
                    const hasMore = advanceLevel();
                    if (hasMore) {
                        // advanceLevel() already incremented the internal index;
                        // read it back so the next effect run starts at the right level.
                        nextLevelRef.current = getCurrentLevel() - 1; // 0-based
                        setLevelNumber(getCurrentLevel());
                        setCurrentStageKey(prev => prev + 1);
                    } else {
                        // All 4 levels complete — loop back to level 1
                        setAllLevelsComplete(true);
                        setTimeout(() => {
                            setAllLevelsComplete(false);
                            nextLevelRef.current = 0;
                            setLevelNumber(1);
                            setCurrentStageKey(prev => prev + 1);
                        }, 3000);
                    }
                }, 2500);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [currentStageKey]);

    const progress = total > 0 ? score / total : 0;

    const hudSpacing = isMobile ? '18px' : isTabletSmall ? '28px' : '40px';
    const hudPadding = isCompact ? '12px 16px' : '18px 24px';
    const hudRadius = isCompact ? '18px' : '22px';

    return (
        <>
            {/* Back to menu + stage chip */}
            {onExit && (
                <GameTopBar
                    onBack={onExit}
                    stage={`Level ${levelNumber} of ${getTotalLevels()}`}
                    compact={isCompact}
                />
            )}

            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: hudSpacing,
                zIndex: 9999,
                pointerEvents: 'none',
                isolation: 'isolate'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',


                    borderRadius: '9999px',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    padding: isCompact ? '8px 16px' : '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
                }}>
                    <span style={{
                        fontSize: isCompact ? '1rem' : '1.2rem',
                        filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.4))'
                    }}>
                        🗂️
                    </span>
                    <span style={{
                        fontSize: isCompact ? '0.85rem' : '0.95rem',
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.95)',
                        letterSpacing: '0.3px'
                    }}>
                        Sort and Place
                    </span>
                </div>
            </div>

            <div style={{
                position: 'absolute',
                top: isCompact ? `calc(${hudSpacing} + 50px)` : `calc(${hudSpacing} + 56px)`,
                left: hudSpacing,
                zIndex: 20,
                maxWidth: isCompact ? 'calc(50% - 16px)' : 'none'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',


                    borderRadius: hudRadius,
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    padding: hudPadding,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
                    minWidth: isCompact ? 'auto' : '280px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCompact ? '8px' : '14px',
                        marginBottom: isCompact ? '8px' : '16px'
                    }}>
                        <span style={{
                            fontSize: isCompact ? '1.3rem' : '2rem',
                            filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.5))'
                        }}>
                            🗂️
                        </span>
                        <span style={{
                            fontSize: isCompact ? '0.95rem' : '1.3rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
                        }}>
                            Sort and Place
                        </span>
                    </div>

                    <div style={{
                        fontSize: isCompact ? '0.8rem' : '1rem',
                        color: 'rgba(255,255,255,0.8)',
                        marginBottom: isCompact ? '6px' : '12px',
                        fontWeight: 500
                    }}>
                        Level {levelNumber} of {getTotalLevels()}
                    </div>

                    <div style={{
                        fontSize: isCompact ? '0.85rem' : '0.95rem',
                        color: 'rgba(255,255,255,0.6)',
                        marginBottom: isCompact ? '6px' : '12px'
                    }}>
                        <strong style={{
                            color: '#00F5D4',
                            fontSize: isCompact ? '1rem' : '1.1rem'
                        }}>
                            {score}
                        </strong> / {total}
                    </div>

                    <div style={{
                        width: '100%',
                        height: isCompact ? '6px' : '8px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginTop: isCompact ? '6px' : '12px'
                    }}>
                        <div style={{
                            width: `${progress * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                            boxShadow: `0 0 15px ${progress === 1 ? '#00F5D4' : '#4ECDC4'}88`
                        }} />
                    </div>
                </div>
            </div>

            {/* Instruction chip */}
            <div style={{
                position: 'absolute', top: hudSpacing, left: '50%', transform: 'translateX(-50%)',
                zIndex: 20, pointerEvents: 'none', animation: 'float 3s ease-in-out infinite',
                maxWidth: isCompact ? 'calc(100% - 180px)' : 'none'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                    border: '1.5px solid rgba(0, 245, 212, 0.3)', borderRadius: '9999px',
                    padding: isCompact ? '10px 20px' : '14px 28px',
                    color: '#00f5d4', fontSize: isCompact ? '0.85rem' : '1.1rem',
                    textAlign: 'center', fontWeight: 600,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    👆 {isCompact ? stageTitle : (getCurrentStage()?.instruction ?? stageTitle)}
                </div>
            </div>

            {/* Drop feedback flash */}
            {dropFeedback && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9990, pointerEvents: 'none',
                    background: dropFeedback === 'correct'
                        ? 'radial-gradient(ellipse at center, rgba(0,245,100,0.22) 0%, transparent 70%)'
                        : 'radial-gradient(ellipse at center, rgba(255,60,60,0.22) 0%, transparent 70%)',
                    animation: 'dropFeedbackFade 0.6s ease-out forwards'
                }} />
            )}

            {/* All-levels-complete banner */}
            {allLevelsComplete && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9995, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #6C47FF, #FF6B6B)',
                        borderRadius: 24, padding: '32px 48px', textAlign: 'center',
                        boxShadow: '0 0 60px rgba(108,71,255,0.6)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: 8 }}>🏆</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>All Levels Complete!</div>
                        <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>Starting over…</div>
                    </div>
                </div>
            )}

            <Celebration
                show={showCelebration}
                message={allLevelsComplete ? '🏆 All Levels Done!' : `Level ${levelNumber} Complete!`}
                subMessage={allLevelsComplete ? '🎉 You sorted everything!' : '⭐ Amazing job!'}
                icon="🎉"
            />

            {/* Floating +1 */}
            {floatingPoints.map(pt => (
                <div key={pt.id} style={{
                    position: 'absolute', left: pt.x, top: pt.y,
                    fontSize: '2rem', fontWeight: 'bold', color: '#00F5D4',
                    textShadow: '0 0 10px rgba(0, 245, 212, 0.8)',
                    pointerEvents: 'none', zIndex: 9999,
                    animation: 'floatUpAndFade 1s ease-out forwards'
                }}>+1</div>
            ))}

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateX(-50%) translateY(0px); }
                    50% { transform: translateX(-50%) translateY(-10px); }
                }
                @keyframes floatUpAndFade {
                    0% { opacity: 0; transform: translateY(0) scale(0.5); }
                    20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
                    100% { opacity: 0; transform: translateY(-60px) scale(1); }
                }
                @keyframes dropFeedbackFade {
                    0% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
        </>
    );
};
