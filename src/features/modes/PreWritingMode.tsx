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
    setCompleteCallback
} from './preWriting/preWritingLogic';
import { GameTopBar } from '../../components/GameTopBar';
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

    // Set up completion callback
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
                // Auto-advance to next path
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

    // Poll for updates (avoid React per-frame updates)
    useEffect(() => {
        const interval = setInterval(() => {
            const newProgress = getProgress();
            const newName = getCurrentPathName();
            const newIndex = getCurrentPathIndex();
            const newIsLetter = isCurrentLetter();

            setProgress(newProgress);
            setPathName(newName);
            setCurrentIndex(newIndex);
            setIsLetter(newIsLetter);
        }, 100); // Update UI at 10fps

        return () => clearInterval(interval);
    }, []);

    const handleNext = () => {
        nextPath();
        setProgress(0);
        stageStartTimeRef.current = Date.now();
        const newName = getCurrentPathName();
        setPathName(newName);
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
        const newName = getCurrentPathName();
        setPathName(newName);
        setIsLetter(isCurrentLetter());
    };

    const progressPercent = Math.round(progress * 100);

    // Responsive sizing
    const hudSpacing = isMobile ? '18px' : isTabletSmall ? '28px' : '40px';
    const hudPadding = isCompact ? '12px 16px' : '18px 24px';
    const hudRadius = isCompact ? '18px' : '22px';

    return (
        <>
            {/* Back to menu */}
            {onExit && (
                <GameTopBar
                    onBack={onExit}
                    stage={`${currentIndex + 1} of ${totalPaths}`}
                    compact={isCompact}
                />
            )}

            {/* Top Left - Mode indicator - Responsive */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: hudSpacing,
                zIndex: 20,
                maxWidth: isCompact ? 'calc(50% - 20px)' : 'none'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                    
                    
                    borderRadius: hudRadius,
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    padding: hudPadding,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCompact ? '8px' : '14px',
                        marginBottom: isCompact ? '8px' : '16px'
                    }}>
                        <span style={{ fontSize: isCompact ? '1.3rem' : '2rem' }}>✏️</span>
                        <span style={{
                            fontSize: isCompact ? '0.95rem' : '1.3rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            {isCompact ? 'Tracing' : 'Tracing Mode'}
                        </span>
                    </div>

                    {/* Path info */}
                    <div style={{
                        fontSize: isCompact ? '0.8rem' : '1rem',
                        color: 'rgba(255,255,255,0.8)',
                        marginBottom: isCompact ? '6px' : '12px',
                        fontWeight: 500
                    }}>
                        {isLetter ? 'Letter' : 'Shape'} {currentIndex + 1}/{totalPaths}
                    </div>

                    <div style={{
                        fontSize: isCompact ? '1rem' : '1.2rem',
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: isCompact ? '8px' : '16px'
                    }}>
                        {pathName}
                    </div>

                    {/* Progress dots - smaller on mobile */}
                    <div style={{
                        display: 'flex',
                        gap: isCompact ? '5px' : '8px',
                        flexWrap: 'wrap',
                        maxWidth: isCompact ? '160px' : '280px'
                    }}>
                        {Array.from({ length: totalPaths }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: isCompact ? '8px' : '12px',
                                    height: isCompact ? '8px' : '12px',
                                    borderRadius: '50%',
                                    background: i < currentIndex
                                        ? '#00f5d4'
                                        : i === currentIndex
                                            ? `conic-gradient(#00f5d4 ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`
                                            : 'rgba(255,255,255,0.2)',
                                    boxShadow: i <= currentIndex ? '0 0 10px #00f5d4' : 'none',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Progress Bar - Top Center - Responsive */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                pointerEvents: 'none',
                maxWidth: isCompact ? 'calc(100% - 180px)' : 'none'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                    
                    
                    borderRadius: isCompact ? '20px' : '9999px',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    padding: isCompact ? '10px 16px' : '14px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCompact ? '10px' : '20px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
                }}>
                    <span style={{
                        fontSize: isCompact ? '1.3rem' : '2rem',
                        filter: progress >= 0.95 ? 'drop-shadow(0 0 15px #FFD700)' : 'none'
                    }}>
                        {progress >= 0.95 ? '⭐' : progress > 0.5 ? '🌟' : '✨'}
                    </span>

                    <div style={{
                        width: isCompact ? 'clamp(80px, 20vw, 150px)' : '250px',
                        height: isCompact ? '10px' : '14px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '7px',
                        overflow: 'hidden',
                        border: '2px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: progress >= 0.95
                                ? 'linear-gradient(90deg, #FFD700, #FFA500)'
                                : 'linear-gradient(90deg, #00f5d4, #4facfe)',
                            borderRadius: '7px',
                            transition: 'width 0.15s ease',
                            boxShadow: `0 0 20px ${progress >= 0.95 ? '#FFD700' : '#00f5d4'}88`
                        }} />
                    </div>

                    <span style={{
                        fontSize: isCompact ? '1rem' : '1.3rem',
                        fontWeight: 'bold',
                        color: progress >= 0.95 ? '#FFD700' : '#00f5d4',
                        minWidth: isCompact ? '40px' : '60px',
                        textAlign: 'right',
                        textShadow: progress >= 0.95 ? '0 0 15px #FFD700' : 'none'
                    }}>
                        {progressPercent}%
                    </span>
                </div>
            </div>

            {/* Bottom Controls - Responsive */}
            <div style={{
                position: 'absolute',
                bottom: isCompact ? '12px' : '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                pointerEvents: 'auto',
                maxWidth: isCompact ? 'calc(100% - 24px)' : 'none'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                    
                    
                    borderRadius: isCompact ? '18px' : '9999px',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    padding: isCompact ? '10px 14px' : '14px 24px',
                    display: 'flex',
                    gap: isCompact ? '8px' : '12px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={handleRestart}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isCompact ? '4px' : '8px',
                            padding: isCompact ? '10px 14px' : '14px 24px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: isCompact ? '12px' : '16px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: isCompact ? '0.85rem' : '1rem',
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            minWidth: '44px',
                            minHeight: '44px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                    >
                        <span>🔄</span>
                        {isCompact ? 'Restart' : `Restart ${isLetter ? 'Letter' : 'Shape'}`}
                    </button>

                    {progress >= 0.95 && currentIndex < totalPaths - 1 && (
                        <button
                            onClick={handleNext}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: isCompact ? '4px' : '8px',
                                padding: isCompact ? '10px 16px' : '14px 28px',
                                background: 'linear-gradient(135deg, #00f5d4, #4facfe)',
                                border: 'none',
                                borderRadius: isCompact ? '12px' : '16px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: isCompact ? '0.85rem' : '1rem',
                                fontWeight: 700,
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 20px rgba(0, 245, 212, 0.4)',
                                minWidth: '44px',
                                minHeight: '44px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <span>➡️</span>
                            {isCompact ? 'Next' : `Next ${isLetter ? 'Letter' : 'Shape'}`}
                        </button>
                    )}

                    {currentIndex === totalPaths - 1 && progress >= 0.95 && (
                        <button
                            onClick={handleRestartAll}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: isCompact ? '4px' : '8px',
                                padding: isCompact ? '10px 16px' : '14px 28px',
                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                border: 'none',
                                borderRadius: isCompact ? '12px' : '16px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: isCompact ? '0.85rem' : '1rem',
                                fontWeight: 700,
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 20px rgba(255, 215, 0, 0.4)',
                                minWidth: '44px',
                                minHeight: '44px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <span>🎉</span>
                            {isCompact ? 'Again' : 'Play Again'}
                        </button>
                    )}
                </div>
            </div>

            {/* Instructions - Responsive */}
            {progress < 0.1 && (
                <div style={{
                    position: 'absolute',
                    bottom: isCompact ? '90px' : '120px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 15,
                    pointerEvents: 'none',
                    maxWidth: isCompact ? 'calc(100% - 32px)' : 'none'
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                        border: '1.5px solid rgba(0, 245, 212, 0.3)',
                        borderRadius: '9999px',
                        padding: isCompact ? '10px 20px' : '14px 28px',
                        color: '#00f5d4',
                        fontSize: isCompact ? '0.9rem' : '1.1rem',
                        fontWeight: 600,
                        
                        
                        boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
                        animation: 'float 3s ease-in-out infinite',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        👆 {isCompact ? 'Pinch to draw!' : 'Pinch to draw — start at the green dot!'}
                    </div>
                </div>
            )}

            {/* CSS animation */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateX(-50%) translateY(0px); }
                    50% { transform: translateX(-50%) translateY(-10px); }
                }
            `}</style>
        </>
    );
};
