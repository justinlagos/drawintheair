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
import { SortAndPlaceBackground } from './SortAndPlaceBackground';
import {
    KidChip,
    KidPanel,
    KidProgressBar,
    KidObjectiveCard,
    KidBadge,
} from '../../../components/kid-ui';
import { tokens } from '../../../styles/tokens';
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
                // NOTE: Celebration auto-dismisses via its internal timer and
                // calls handleCelebrationDone(); see prop on the component below.
                // Previously a duplicate outer setTimeout raced with the
                // Celebration's internal timer and could leave the popup stuck.
            }
        }, 100);

        return () => clearInterval(interval);
    }, [currentStageKey]);

    // Single source of truth for level transition. Called by Celebration's
    // onComplete when its internal timer expires (default 2500ms).
    const handleCelebrationDone = () => {
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
            // All 4 levels complete — show banner, then loop back to level 1.
            setAllLevelsComplete(true);
            setTimeout(() => {
                setAllLevelsComplete(false);
                nextLevelRef.current = 0;
                setLevelNumber(1);
                setCurrentStageKey(prev => prev + 1);
            }, 3000);
        }
    };

    const progress = total > 0 ? score / total : 0;

    const hudSpacing = isMobile ? '18px' : isTabletSmall ? '28px' : '40px';
    const totalLevels = getTotalLevels();
    const stageInstruction = getCurrentStage()?.instruction ?? stageTitle;

    const currentStageId = getCurrentStage()?.id ?? 'colors-sort';

    return (
        <>
            {/* Per-stage themed background — sky+meadow for colours, geometric
                world for shapes, kitchen+playroom for food/toys, savannah+road
                for animals/vehicles, park for recycle/trash, library for
                letters, math classroom for numbers. */}
            <SortAndPlaceBackground stageId={currentStageId} />

            {/* Back-to-menu top bar. Stage label intentionally omitted —
                the bespoke stats panel below shows level + score + progress. */}
            {onExit && (
                <GameTopBar
                    onBack={onExit}
                    compact={isCompact}
                />
            )}

            {/* TOP-LEFT: Mode label chip */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: hudSpacing,
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'none',
            }}>
                <KidChip variant="neutral" size={isCompact ? 'sm' : 'md'} icon={<span>🗂️</span>}>
                    Sort &amp; Place
                </KidChip>
            </div>

            {/* TOP-CENTER: Objective card — what to do, large and friendly */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'none',
                maxWidth: isCompact ? 'calc(100% - 200px)' : 'min(640px, 60vw)',
            }}>
                <KidObjectiveCard>
                    {isCompact ? stageTitle : stageInstruction}
                </KidObjectiveCard>
            </div>

            {/* BELOW MODE CHIP (left side): Stats panel */}
            <div style={{
                position: 'absolute',
                top: isCompact ? `calc(${hudSpacing} + 56px)` : `calc(${hudSpacing} + 64px)`,
                left: hudSpacing,
                zIndex: tokens.zIndex.hud,
                width: isCompact ? 'min(220px, calc(50% - 16px))' : '280px',
                pointerEvents: 'none',
            }}>
                <KidPanel size={isCompact ? 'sm' : 'md'}>
                    {/* Level chip + score in a row */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: tokens.spacing.sm,
                        marginBottom: tokens.spacing.md,
                    }}>
                        <span style={{
                            fontFamily: tokens.fontFamily.heading,
                            fontWeight: tokens.fontWeight.bold,
                            fontSize: tokens.fontSize.label,
                            color: tokens.semantic.textPrimary,
                        }}>
                            Level {levelNumber}<span style={{ color: tokens.semantic.textMuted, fontWeight: tokens.fontWeight.medium }}>{` of ${totalLevels}`}</span>
                        </span>
                        <KidChip
                            variant="score"
                            size="sm"
                            icon={<span style={{ color: tokens.colors.sunshine }}>★</span>}
                        >
                            {score}<span style={{ color: tokens.semantic.textMuted, marginLeft: 2 }}>{`/${total}`}</span>
                        </KidChip>
                    </div>
                    <KidProgressBar
                        value={progress}
                        tone={progress >= 1 ? 'lime' : 'aqua'}
                        height={isCompact ? 10 : 12}
                        ariaLabel={`Level ${levelNumber} progress, ${score} of ${total}`}
                    />
                </KidPanel>
            </div>

            {/* Drop feedback flash — gentle radial wash on correct/wrong */}
            {dropFeedback && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: tokens.zIndex.floatingFx, pointerEvents: 'none',
                    background: dropFeedback === 'correct'
                        ? `radial-gradient(ellipse at center, rgba(126, 217, 87, 0.28) 0%, transparent 70%)`
                        : `radial-gradient(ellipse at center, rgba(255, 107, 107, 0.25) 0%, transparent 70%)`,
                    animation: 'dropFeedbackFade 0.6s ease-out forwards',
                }} />
            )}

            {/* All-levels-complete banner — kid-bright KidPanel + trophy badge */}
            {allLevelsComplete && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: tokens.zIndex.modal, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(190, 235, 255, 0.45)',
                    animation: 'fadeInScrim 0.3s ease forwards',
                }}>
                    <KidPanel size="lg" tone="white" style={{ textAlign: 'center', minWidth: 320 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: tokens.spacing.lg }}>
                            <KidBadge shape="medal" tone="sunshine" size="lg" animateIn />
                        </div>
                        <div style={{
                            fontFamily: tokens.fontFamily.display,
                            fontSize: tokens.fontSize.heading,
                            fontWeight: tokens.fontWeight.bold,
                            color: tokens.semantic.primary,
                            marginBottom: tokens.spacing.sm,
                        }}>
                            All Levels Complete!
                        </div>
                        <div style={{
                            fontFamily: tokens.fontFamily.body,
                            fontSize: tokens.fontSize.body,
                            color: tokens.semantic.textSecondary,
                        }}>
                            Starting over…
                        </div>
                    </KidPanel>
                </div>
            )}

            <Celebration
                show={showCelebration}
                message={allLevelsComplete ? 'All Levels Done!' : `Level ${levelNumber} Complete!`}
                subMessage={allLevelsComplete ? 'You sorted everything!' : 'Amazing job!'}
                icon={allLevelsComplete ? '🏆' : '🎉'}
                stars={allLevelsComplete ? 3 : 2}
                showConfetti
                soundEffect
                onComplete={handleCelebrationDone}
            />

            {/* Floating +1 — sunshine palette, soft glow */}
            {floatingPoints.map(pt => (
                <div key={pt.id} style={{
                    position: 'absolute', left: pt.x, top: pt.y,
                    fontFamily: tokens.fontFamily.heading,
                    fontSize: '2rem', fontWeight: tokens.fontWeight.extrabold,
                    color: tokens.colors.sunshine,
                    textShadow: '0 2px 8px rgba(255, 216, 77, 0.5), 0 0 4px rgba(255, 255, 255, 0.8)',
                    pointerEvents: 'none', zIndex: tokens.zIndex.floatingFx,
                    animation: 'floatUpAndFade 1s ease-out forwards',
                }}>+1</div>
            ))}

            <style>{`
                @keyframes floatUpAndFade {
                    0% { opacity: 0; transform: translateY(0) scale(0.5); }
                    20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
                    100% { opacity: 0; transform: translateY(-60px) scale(1); }
                }
                @keyframes dropFeedbackFade {
                    0% { opacity: 1; }
                    100% { opacity: 0; }
                }
                @keyframes fadeInScrim {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </>
    );
};
