import { useState, useEffect, useRef } from 'react';
import {
    resetPath,
    nextPath,
    resetAllPaths,
    getCurrentPathIndex,
    getCurrentPathName,
    getProgress,
    getTotalPaths,
    isCurrentLetter,
    setCompleteCallback,
    setInitialPathById
} from './preWriting/preWritingLogic';
import { GameTopBar } from '../../components/GameTopBar';
import { TracingBackground } from './tracing/TracingBackground';
import { KidPanel, KidButton, KidObjectiveCard } from '../../components/kid-ui';
import { tokens } from '../../styles/tokens';
import { showMessageCard, getRandomMessageCopy } from '../../core/messageCardService';

// Responsive hook
const useResponsiveLayout = () => {
    const [layout, setLayout] = useState(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
            isMobile: w <= 480,
            isTabletSmall: w > 480 && w <= 768,
            isTablet: w > 768 && w <= 1024,
            isLandscapePhone: w > h && h <= 500,
            screenWidth: w,
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
                screenWidth: w,
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return layout;
};

interface PreWritingModeProps {
    onExit?: () => void;
}

export const PreWritingMode = ({ onExit }: PreWritingModeProps = {}) => {
    const [progress, setProgress] = useState(0);
    const [pathName, setPathName] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [totalPaths] = useState(getTotalPaths());
    const [isLetter, setIsLetter] = useState(false);
    const stageStartTimeRef = useRef<number>(Date.now());
    const successCountRef = useRef<number>(0);
    const streakRef = useRef<number>(0);

    const layout = useResponsiveLayout();
    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;

    // Jump to a specific letter/number/shape via ?trace= URL param (SEO deep-link)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const trace = params.get('trace');
        if (trace) {
            setInitialPathById(trace);
            setPathName(getCurrentPathName());
            setCurrentIndex(getCurrentPathIndex());
            setIsLetter(isCurrentLetter());
        }
    }, []);

    // Completion callback — auto-advances to the next path
    useEffect(() => {
        setCompleteCallback(() => {
            const now = Date.now();
            if (now - stageStartTimeRef.current >= 2000) {
                successCountRef.current += 1;
                streakRef.current += 1;
                if (successCountRef.current % 3 === 0) {
                    showMessageCard({ text: getRandomMessageCopy(), variant: 'success', durationMs: 1000 });
                }
                if (streakRef.current === 5) {
                    showMessageCard({ text: getRandomMessageCopy(), variant: 'success', durationMs: 1000 });
                }
                showMessageCard({ text: getRandomMessageCopy(), variant: 'success', durationMs: 1100 });
            }
            setTimeout(() => {
                if (nextPath()) {
                    setProgress(0);
                    const newName = getCurrentPathName();
                    setPathName(newName);
                    setCurrentIndex(getCurrentPathIndex());
                    setIsLetter(isCurrentLetter());
                    stageStartTimeRef.current = Date.now();
                }
            }, 2500);
        });

        return () => {
            setCompleteCallback(null);
        };
    }, []);

    // Poll for state updates at 10fps so React doesn't render every frame.
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(getProgress());
            setPathName(getCurrentPathName());
            setCurrentIndex(getCurrentPathIndex());
            setIsLetter(isCurrentLetter());
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleNext = () => {
        nextPath();
        setProgress(0);
        stageStartTimeRef.current = Date.now();
        setPathName(getCurrentPathName());
        setCurrentIndex(getCurrentPathIndex());
        setIsLetter(isCurrentLetter());
    };

    const handleRestart = () => {
        resetPath();
        setProgress(0);
        stageStartTimeRef.current = Date.now();
    };

    const handleRestartAll = () => {
        resetAllPaths();
        setProgress(0);
        setCurrentIndex(0);
        stageStartTimeRef.current = Date.now();
        setPathName(getCurrentPathName());
        setIsLetter(isCurrentLetter());
    };

    const progressPercent = Math.round(progress * 100);
    const hudSpacing = isMobile ? '18px' : isTabletSmall ? '28px' : '40px';

    return (
        <>
            <TracingBackground />

            {/* Back to menu (no stage label — bespoke panel below shows it) */}
            {onExit && <GameTopBar onBack={onExit} compact={isCompact} />}

            {/* TOP-LEFT: Mode + path info card */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: hudSpacing,
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'none',
                maxWidth: isCompact ? 'calc(50% - 20px)' : '300px',
            }}>
                <KidPanel size={isCompact ? 'sm' : 'md'}>
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: tokens.spacing.sm,
                        marginBottom: tokens.spacing.sm,
                    }}>
                        <span aria-hidden style={{ fontSize: isCompact ? '1.2rem' : '1.5rem' }}>✏️</span>
                        <span style={{
                            fontFamily: tokens.fontFamily.heading,
                            fontWeight: tokens.fontWeight.bold,
                            fontSize: isCompact ? tokens.fontSize.label : tokens.fontSize.button,
                            color: tokens.semantic.primary,
                        }}>Tracing</span>
                    </div>
                    <div style={{
                        fontFamily: tokens.fontFamily.body,
                        fontSize: tokens.fontSize.caption,
                        color: tokens.semantic.textSecondary,
                        marginBottom: tokens.spacing.xs,
                    }}>
                        {isLetter ? 'Letter' : 'Shape'} {currentIndex + 1}/{totalPaths}
                    </div>
                    <div style={{
                        fontFamily: tokens.fontFamily.heading,
                        fontWeight: tokens.fontWeight.bold,
                        fontSize: isCompact ? tokens.fontSize.label : tokens.fontSize.button,
                        color: tokens.semantic.textPrimary,
                        marginBottom: tokens.spacing.sm,
                    }}>{pathName}</div>
                    {/* Path progress dots */}
                    <div style={{
                        display: 'flex',
                        gap: isCompact ? '5px' : '7px',
                        flexWrap: 'wrap',
                        maxWidth: isCompact ? '160px' : '260px',
                    }}>
                        {Array.from({ length: totalPaths }).map((_, i) => (
                            <div key={i} style={{
                                width: isCompact ? '9px' : '12px',
                                height: isCompact ? '9px' : '12px',
                                borderRadius: '50%',
                                background: i < currentIndex
                                    ? tokens.colors.aqua
                                    : i === currentIndex
                                        ? `conic-gradient(${tokens.colors.aqua} ${progressPercent}%, rgba(108,63,164,0.18) ${progressPercent}%)`
                                        : 'rgba(108,63,164,0.18)',
                                boxShadow: i <= currentIndex
                                    ? `0 0 10px rgba(85, 221, 224, 0.55)` : 'none',
                                transition: 'all 0.3s ease',
                            }} />
                        ))}
                    </div>
                </KidPanel>
            </div>

            {/* TOP-CENTER: Progress bar */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'none',
                maxWidth: isCompact ? 'calc(100% - 200px)' : 'none',
            }}>
                <KidPanel size="sm" style={{
                    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                    display: 'flex', alignItems: 'center',
                    gap: isCompact ? tokens.spacing.sm : tokens.spacing.md,
                }}>
                    <span aria-hidden style={{
                        fontSize: isCompact ? '1.2rem' : '1.6rem',
                        filter: progress >= 0.95 ? 'drop-shadow(0 0 10px #FFD84D)' : 'none',
                    }}>
                        {progress >= 0.95 ? '⭐' : progress > 0.5 ? '🌟' : '✨'}
                    </span>
                    <div style={{
                        width: isCompact ? 'clamp(80px, 20vw, 150px)' : '230px',
                        height: isCompact ? '10px' : '12px',
                        background: 'rgba(108,63,164,0.12)',
                        borderRadius: tokens.radius.pill,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: progress >= 0.95
                                ? `linear-gradient(90deg, ${tokens.colors.sunshine}, ${tokens.colors.warmOrange})`
                                : `linear-gradient(90deg, ${tokens.colors.aqua}, ${tokens.colors.skyBlue})`,
                            borderRadius: tokens.radius.pill,
                            transition: 'width 0.18s ease',
                            boxShadow: progress >= 0.95
                                ? `0 0 14px ${tokens.colors.sunshine}88`
                                : `0 0 12px ${tokens.colors.aqua}88`,
                        }} />
                    </div>
                    <span style={{
                        fontFamily: tokens.fontFamily.heading,
                        fontWeight: tokens.fontWeight.bold,
                        fontSize: isCompact ? tokens.fontSize.label : tokens.fontSize.button,
                        color: progress >= 0.95 ? tokens.colors.warmOrange : tokens.semantic.primary,
                        minWidth: isCompact ? '42px' : '54px',
                        textAlign: 'right',
                    }}>
                        {progressPercent}%
                    </span>
                </KidPanel>
            </div>

            {/* BOTTOM CONTROLS: Restart + (manual Next when complete) */}
            <div style={{
                position: 'absolute',
                bottom: isCompact ? '12px' : '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'auto',
                display: 'flex',
                gap: tokens.spacing.md,
                flexWrap: 'wrap',
                justifyContent: 'center',
            }}>
                <KidButton variant="secondary" size="md" onClick={handleRestart}
                           icon={<span aria-hidden>🔄</span>}>
                    {isCompact ? 'Restart' : `Restart ${isLetter ? 'Letter' : 'Shape'}`}
                </KidButton>

                {/* Auto-advance handles the next path on completion. These manual
                    buttons are an extra safety net visible only at 95%+ progress. */}
                {progress >= 0.95 && currentIndex < totalPaths - 1 && (
                    <KidButton variant="primary" size="md" onClick={handleNext}
                               icon={<span aria-hidden>➡️</span>}>
                        {isCompact ? 'Next' : `Next ${isLetter ? 'Letter' : 'Shape'}`}
                    </KidButton>
                )}
                {currentIndex === totalPaths - 1 && progress >= 0.95 && (
                    <KidButton variant="success" size="md" onClick={handleRestartAll}
                               icon={<span aria-hidden>🎉</span>}>
                        {isCompact ? 'Again' : 'Play Again'}
                    </KidButton>
                )}
            </div>

            {/* Instruction objective card */}
            {progress < 0.1 && (
                <div style={{
                    position: 'absolute',
                    bottom: isCompact ? '90px' : '120px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: tokens.zIndex.hud,
                    pointerEvents: 'none',
                    maxWidth: isCompact ? 'calc(100% - 32px)' : 'none',
                }}>
                    <KidObjectiveCard icon="👆">
                        {isCompact ? 'Pinch to draw!' : 'Pinch to draw — start at the green dot!'}
                    </KidObjectiveCard>
                </div>
            )}
        </>
    );
};
