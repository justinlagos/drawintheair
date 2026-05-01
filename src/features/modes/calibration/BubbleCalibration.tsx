/**
 * Bubble Pop UI - Nintendo-Quality Casual Game Experience
 * 
 * Features:
 * - Clean, aligned top bar with mode name, timer, and score
 * - Level progression (6 levels)
 * - Smooth transitions and celebrations
 * - No frozen states - always recoverable
 * - Child-friendly messaging and encouragement
 * - Fully responsive across all screen sizes
 */

import { useEffect, useState, useRef } from 'react';
import {
    getScore,
    getBubbleMisses,
    getTimeRemaining,
    isGameActive,
    hasReachedMilestone,
    hasCelebratedMilestone,
    setMilestoneCelebrated,
    getGameEndTime,
    startBubbleGame,
    getCurrentGoal,
    hasReachedGoal,
    MAX_LEVEL,
    type BubbleLevel
} from './bubbleCalibrationLogic';
import { GameTopBar } from '../../../components/GameTopBar';
import {
    KidChip,
    KidPanel,
    KidButton,
    KidBadge,
} from '../../../components/kid-ui';
import { tokens } from '../../../styles/tokens';
import { earnSticker } from '../../../core/stickerBook';
import { featureFlags } from '../../../core/featureFlags';
import { showMessageCard, getRandomMessageCopy } from '../../../core/messageCardService';
import { startCountdown } from '../../../core/countdownService';

interface BubbleCalibrationProps {
    onComplete: () => void;
    onExit: () => void;
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

export const BubbleCalibration = ({ onComplete: _onComplete, onExit }: BubbleCalibrationProps) => {
    const [score, setScore] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
    const [showEndModal, setShowEndModal] = useState(false);
    const [showResultsOverlay, setShowResultsOverlay] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [level, setLevel] = useState<BubbleLevel>(1);
    const [autoAdvanceScheduled, setAutoAdvanceScheduled] = useState(false);
    const stageStartTimeRef = useRef<number>(Date.now());
    const successCountRef = useRef<number>(0);
    const streakRef = useRef<number>(0);
    const lastScoreRef = useRef<number>(0);
    const lastMissesRef = useRef<number>(0);

    const layout = useResponsiveHUD();
    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;

    // Initialize game when level changes
    useEffect(() => {
        const countdownEndsAt = startCountdown(3000);
        startBubbleGame(level as BubbleLevel, countdownEndsAt);
        // Reset UI state when level changes
        setShowEndModal(false);
        setScore(0);
        setTimeRemaining(GAME_DURATION);
        setAutoAdvanceScheduled(false);
        lastScoreRef.current = 0;
        lastMissesRef.current = 0;
        successCountRef.current = 0;
        streakRef.current = 0;
        stageStartTimeRef.current = countdownEndsAt;
    }, [level]);

    // Game state update interval
    useEffect(() => {
        let autoAdvanceTimeout: number | undefined;

        const interval = setInterval(() => {
            const currentScore = getScore();
            const currentTimeRemaining = getTimeRemaining();
            const currentMilestoneReached = hasReachedMilestone();
            const gameIsActive = isGameActive();
            const currentMisses = getBubbleMisses();
            const now = Date.now();
            const eligible = now - stageStartTimeRef.current >= 2000;

            // Update score and time only - do NOT overwrite React level state
            setScore(currentScore);
            setTimeRemaining(currentTimeRemaining);

            // Show milestone celebration when reached
            if (currentMilestoneReached && !hasCelebratedMilestone()) {
                setMilestoneCelebrated();
                if (eligible) {
                    showMessageCard({ text: getRandomMessageCopy(), variant: 'success', durationMs: 1100 });
                }
            }

            if (currentMisses > lastMissesRef.current) {
                streakRef.current = 0;
                lastMissesRef.current = currentMisses;
            }

            if (currentScore > lastScoreRef.current) {
                const delta = currentScore - lastScoreRef.current;
                lastScoreRef.current = currentScore;
                if (eligible) {
                    successCountRef.current += delta;
                    streakRef.current += delta;
                    if (successCountRef.current % 3 === 0) {
                        showMessageCard({ text: getRandomMessageCopy(), variant: 'success', durationMs: 1000 });
                    }
                    if (streakRef.current === 5) {
                        showMessageCard({ text: getRandomMessageCopy(), variant: 'success', durationMs: 1000 });
                    }
                }
            }

            // Check for game end - more robust detection
            // Game ends when timer reaches 0 OR when gameEndTime is set
            const gameEnded = (!gameIsActive && currentTimeRemaining <= 0) || (!gameIsActive && getGameEndTime() !== null);

            if (gameEnded && !showEndModal && !showResultsOverlay && !autoAdvanceScheduled) {
                const goalReached = hasReachedGoal();
                const isLast = level === MAX_LEVEL;

                // Earn sticker on milestone (if enabled)
                if (goalReached && featureFlags.getFlag('stickerRewards')) {
                    earnSticker('bubble-milestone');
                }

                // Final level complete → show results overlay instead of regular modal
                if (goalReached && isLast) {
                    setFinalScore(currentScore);
                    setShowResultsOverlay(true);
                } else {
                    setShowEndModal(true);
                    // Auto-advance on success for non-final levels — hands-free
                    // for kids; 2200ms gives time to read the star/text.
                    if (goalReached && level < MAX_LEVEL) {
                        setAutoAdvanceScheduled(true);
                        autoAdvanceTimeout = window.setTimeout(() => {
                            const nextLevel = (level + 1) as BubbleLevel;
                            setShowEndModal(false);
                            setAutoAdvanceScheduled(false);
                            setLevel(nextLevel);
                        }, 2200);
                    }
                }
                if (eligible) {
                    showMessageCard({ text: getRandomMessageCopy(), variant: 'success', durationMs: 1100 });
                }
            }
        }, 100);

        return () => {
            clearInterval(interval);
            if (autoAdvanceTimeout !== undefined) {
                clearTimeout(autoAdvanceTimeout);
            }
        };
    }, [showEndModal, showResultsOverlay, autoAdvanceScheduled, level]);

    const handleTryAgain = () => {
        // Reset all state and restart game
        const countdownEndsAt = startCountdown(3000);
        startBubbleGame(level as BubbleLevel, countdownEndsAt);
        setShowEndModal(false);
        setShowResultsOverlay(false);
        setScore(0);
        setTimeRemaining(GAME_DURATION);
        setAutoAdvanceScheduled(false);
        lastScoreRef.current = 0;
        lastMissesRef.current = 0;
        successCountRef.current = 0;
        streakRef.current = 0;
        stageStartTimeRef.current = countdownEndsAt;
    };

    // Play Again from results overlay — restart from level 1
    const handlePlayAgain = () => {
        setShowResultsOverlay(false);
        setAutoAdvanceScheduled(false);
        setLevel(1 as BubbleLevel);
        // level useEffect will call startBubbleGame(1) and reset UI state
    };

    const handleNextLevel = () => {
        if (level < MAX_LEVEL) {
            const nextLevel = (level + 1) as BubbleLevel;
            // Just set level - useEffect will handle starting the game
            setLevel(nextLevel);
            setShowEndModal(false);
            setAutoAdvanceScheduled(false);
        }
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
    const isLastLevel = level === MAX_LEVEL;

    // Responsive sizing
    const hudSpacing = isMobile ? '18px' : isTabletSmall ? '28px' : '40px';
    const lowTime = timeRemaining < 5000;

    return (
        <>
            {/* Back to menu top bar — stage label omitted, KidChip below shows it */}
            <GameTopBar onBack={onExit} compact={isCompact} />

            {/* Top HUD — bright Kid-UI chips arranged in a single bar */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'none',
                display: 'flex',
                gap: isCompact ? tokens.spacing.sm : tokens.spacing.lg,
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                maxWidth: isCompact ? 'calc(100% - 100px)' : '1100px',
                padding: isCompact ? `0 ${tokens.spacing.md}` : `0 ${tokens.spacing.xl}`,
            }}>
                <KidChip variant="neutral" size={isCompact ? 'sm' : 'md'}
                         icon={<span>🫧</span>}>
                    {`Level ${level} of ${MAX_LEVEL}`}
                </KidChip>

                <KidChip
                    variant={lowTime ? 'reward' : 'timer'}
                    size={isCompact ? 'sm' : 'md'}
                    icon={<span style={{
                        color: lowTime ? tokens.semantic.danger : tokens.semantic.primary,
                    }}>⏱</span>}
                    style={lowTime ? { borderColor: tokens.semantic.danger } : undefined}
                >
                    <span style={{
                        fontFamily: tokens.fontFamily.heading,
                        fontWeight: tokens.fontWeight.extrabold,
                        color: lowTime ? tokens.semantic.danger : tokens.semantic.textPrimary,
                    }}>{formatTime(timeRemaining)}</span>
                </KidChip>

                <KidChip variant="score" size={isCompact ? 'sm' : 'md'}
                         icon={<span style={{ color: tokens.colors.sunshine }}>★</span>}>
                    <span>{score}<span style={{
                        color: tokens.semantic.textMuted,
                        fontWeight: tokens.fontWeight.medium,
                    }}>{` / ${currentGoal}`}</span></span>
                </KidChip>
            </div>

            {/* Motivation toasts handled by toastService — no in-component overlay */}

            {/* End-of-Round Modal — bright Kid-UI */}
            {showEndModal && (
                <div style={{
                    position: 'fixed', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: tokens.zIndex.modal,
                    background: 'rgba(190, 235, 255, 0.55)',
                    padding: tokens.spacing.xl,
                    boxSizing: 'border-box',
                }}>
                    <KidPanel size="lg" tone="white" style={{
                        textAlign: 'center',
                        maxWidth: isCompact ? '92%' : '520px',
                        width: '100%',
                        animation: 'modalPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'center',
                            marginBottom: tokens.spacing.lg,
                        }}>
                            <KidBadge
                                shape={goalReached ? 'star' : 'shield'}
                                tone={goalReached ? 'sunshine' : 'aqua'}
                                size="lg"
                                animateIn
                            />
                        </div>

                        <h2 style={{
                            fontFamily: tokens.fontFamily.display,
                            fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
                            fontWeight: tokens.fontWeight.bold,
                            color: tokens.semantic.primary,
                            margin: `0 0 ${tokens.spacing.md} 0`,
                            letterSpacing: tokens.letterSpacing.tight,
                        }}>
                            {goalReached
                                ? (isLastLevel ? 'All Levels Complete!' : 'Level Complete!')
                                : 'Nice Try!'}
                        </h2>

                        <p style={{
                            fontFamily: tokens.fontFamily.body,
                            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                            color: tokens.semantic.textPrimary,
                            margin: `0 0 ${tokens.spacing.xl} 0`,
                        }}>
                            You popped <strong style={{ color: tokens.colors.coral }}>{score}</strong> bubbles!
                            {goalReached && !isLastLevel && (
                                <div style={{
                                    marginTop: tokens.spacing.md,
                                    fontSize: tokens.fontSize.label,
                                    color: tokens.semantic.textSecondary,
                                }}>
                                    Moving to the next level…
                                </div>
                            )}
                            {goalReached && isLastLevel && (
                                <div style={{
                                    marginTop: tokens.spacing.md,
                                    fontSize: tokens.fontSize.label,
                                    color: tokens.semantic.textSecondary,
                                }}>
                                    Amazing! You completed all {MAX_LEVEL} levels.
                                </div>
                            )}
                        </p>

                        <div style={{
                            display: 'flex',
                            gap: tokens.spacing.md,
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                        }}>
                            {/* Manual "Next Level" only appears if auto-advance is
                                NOT scheduled (e.g., final level or failed round).
                                In auto-advance mode the modal closes itself after
                                2.2s, so kids never need to click. */}
                            {goalReached && !isLastLevel && !autoAdvanceScheduled && (
                                <KidButton variant="primary" size="md" onClick={handleNextLevel}>
                                    Next Level
                                </KidButton>
                            )}
                            <KidButton variant="secondary" size="md" onClick={handleTryAgain}>
                                Try Again
                            </KidButton>
                        </div>
                    </KidPanel>
                </div>
            )}

            {/* Results Overlay — all levels complete; bright Kid-UI */}
            {showResultsOverlay && (
                <div style={{
                    position: 'fixed', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: tokens.zIndex.modal + 1,
                    background: 'rgba(190, 235, 255, 0.6)',
                    padding: tokens.spacing.xl,
                    boxSizing: 'border-box',
                }}>
                    <KidPanel size="lg" tone="white" style={{
                        textAlign: 'center',
                        maxWidth: isCompact ? '92%' : '520px',
                        width: '100%',
                        animation: 'modalPop 0.45s cubic-bezier(0.34,1.56,0.64,1)',
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'center',
                            marginBottom: tokens.spacing.lg,
                        }}>
                            <KidBadge shape="medal" tone="sunshine" size="lg" animateIn />
                        </div>

                        <h2 style={{
                            fontFamily: tokens.fontFamily.display,
                            fontSize: 'clamp(1.7rem, 5vw, 2.4rem)',
                            fontWeight: tokens.fontWeight.bold,
                            color: tokens.semantic.primary,
                            margin: `0 0 ${tokens.spacing.md} 0`,
                            letterSpacing: tokens.letterSpacing.tight,
                        }}>
                            All Done!
                        </h2>

                        <p style={{
                            fontFamily: tokens.fontFamily.body,
                            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                            color: tokens.semantic.textPrimary,
                            margin: `0 0 ${tokens.spacing.lg} 0`,
                        }}>
                            You completed all <strong style={{ color: tokens.colors.coral }}>{MAX_LEVEL}</strong> levels!
                        </p>

                        {/* Stats — three soft tinted KidPanels */}
                        <div style={{
                            display: 'flex',
                            gap: tokens.spacing.md,
                            justifyContent: 'center',
                            margin: `${tokens.spacing.lg} 0`,
                            flexWrap: 'wrap',
                        }}>
                            {[
                                { v: finalScore, l: 'bubbles popped', c: tokens.colors.coral },
                                {
                                    v: `${Math.min(100, Math.round((finalScore / getCurrentGoal()) * 100))}%`,
                                    l: 'accuracy', c: tokens.colors.sunshine,
                                },
                                { v: '30s', l: 'per level', c: tokens.colors.aqua },
                            ].map((s, i) => (
                                <KidPanel key={i} size="sm" tone="sky" flat style={{
                                    minWidth: '92px',
                                    textAlign: 'center',
                                    padding: tokens.spacing.md,
                                }}>
                                    <div style={{
                                        fontFamily: tokens.fontFamily.heading,
                                        fontWeight: tokens.fontWeight.extrabold,
                                        fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                                        color: s.c,
                                        lineHeight: 1,
                                    }}>{s.v}</div>
                                    <div style={{
                                        fontSize: tokens.fontSize.caption,
                                        color: tokens.semantic.textSecondary,
                                        marginTop: tokens.spacing.xs,
                                    }}>{s.l}</div>
                                </KidPanel>
                            ))}
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: tokens.spacing.md,
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                        }}>
                            <KidButton variant="secondary" size="md" onClick={onExit}>
                                ← Menu
                            </KidButton>
                            <KidButton variant="primary" size="md" onClick={handlePlayAgain}>
                                Play Again
                            </KidButton>
                        </div>
                    </KidPanel>
                </div>
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


            `}</style>
        </>
    );
};
