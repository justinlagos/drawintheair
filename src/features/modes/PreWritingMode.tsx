import { useState, useEffect } from 'react';
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
import { Celebration } from '../../components/Celebration';

export const PreWritingMode = () => {
    const [progress, setProgress] = useState(0);
    const [pathName, setPathName] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [totalPaths] = useState(getTotalPaths());
    const [isLetter, setIsLetter] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    // Set up completion callback
    useEffect(() => {
        setCompleteCallback(() => {
            setShowCelebration(true);
            setTimeout(() => {
                setShowCelebration(false);
                // Auto-advance to next path
                if (nextPath()) {
                    setProgress(0);
                    const newName = getCurrentPathName();
                    setPathName(newName);
                    setCurrentIndex(getCurrentPathIndex());
                    setIsLetter(isCurrentLetter());
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
        setShowCelebration(false);
        const newName = getCurrentPathName();
        setPathName(newName);
        setCurrentIndex(getCurrentPathIndex());
        setIsLetter(isCurrentLetter());
    };

    const handleRestart = () => {
        resetPath();
        setProgress(0);
        setShowCelebration(false);
    };

    const handleRestartAll = () => {
        resetAllPaths();
        setProgress(0);
        setCurrentIndex(0);
        setShowCelebration(false);
        const newName = getCurrentPathName();
        setPathName(newName);
        setIsLetter(isCurrentLetter());
    };

    const progressPercent = Math.round(progress * 100);

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
                    background: 'rgba(15, 12, 41, 0.85)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    padding: '20px 28px',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        marginBottom: '16px'
                    }}>
                        <span style={{ fontSize: '2rem' }}>✏️</span>
                        <span style={{
                            fontSize: '1.3rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Tracing Mode
                        </span>
                    </div>

                    {/* Path info */}
                    <div style={{
                        fontSize: '1rem',
                        color: 'rgba(255,255,255,0.8)',
                        marginBottom: '12px',
                        fontWeight: 500
                    }}>
                        {isLetter ? 'Letter' : 'Shape'} {currentIndex + 1} of {totalPaths}
                    </div>

                    <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: '16px'
                    }}>
                        {pathName}
                    </div>

                    {/* Progress dots */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        maxWidth: '280px'
                    }}>
                        {Array.from({ length: totalPaths }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: '12px',
                                    height: '12px',
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

            {/* Progress Bar - Top Center */}
            <div style={{
                position: 'absolute',
                top: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                pointerEvents: 'none'
            }}>
                <div style={{
                    background: 'rgba(15, 12, 41, 0.85)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '30px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    padding: '16px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
                }}>
                    <span style={{
                        fontSize: '2rem',
                        filter: progress >= 0.95 ? 'drop-shadow(0 0 15px #FFD700)' : 'none'
                    }}>
                        {progress >= 0.95 ? '⭐' : progress > 0.5 ? '🌟' : '✨'}
                    </span>

                    <div style={{
                        width: '250px',
                        height: '14px',
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
                        fontSize: '1.3rem',
                        fontWeight: 'bold',
                        color: progress >= 0.95 ? '#FFD700' : '#00f5d4',
                        minWidth: '60px',
                        textAlign: 'right',
                        textShadow: progress >= 0.95 ? '0 0 15px #FFD700' : 'none'
                    }}>
                        {progressPercent}%
                    </span>
                </div>
            </div>

            {/* Bottom Controls */}
            <div style={{
                position: 'absolute',
                bottom: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                pointerEvents: 'auto'
            }}>
                <div style={{
                    background: 'rgba(15, 12, 41, 0.85)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    padding: '16px 24px',
                    display: 'flex',
                    gap: '12px',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
                }}>
                    <button
                        onClick={handleRestart}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '14px 24px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '16px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                    >
                        <span>🔄</span>
                        Restart {isLetter ? 'Letter' : 'Shape'}
                    </button>

                    {progress >= 0.95 && currentIndex < totalPaths - 1 && (
                        <button
                            onClick={handleNext}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '14px 28px',
                                background: 'linear-gradient(135deg, #00f5d4, #4facfe)',
                                border: 'none',
                                borderRadius: '16px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: 700,
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 20px rgba(0, 245, 212, 0.4)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <span>➡️</span>
                            Next {isLetter ? 'Letter' : 'Shape'}
                        </button>
                    )}

                    {currentIndex === totalPaths - 1 && progress >= 0.95 && (
                        <button
                            onClick={handleRestartAll}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '14px 28px',
                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                border: 'none',
                                borderRadius: '16px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: 700,
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 20px rgba(255, 215, 0, 0.4)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <span>🎉</span>
                            Play Again
                        </button>
                    )}
                </div>
            </div>

            {/* Instructions */}
            {progress < 0.1 && !showCelebration && (
                <div style={{
                    position: 'absolute',
                    bottom: '120px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 15,
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        background: 'rgba(0, 245, 212, 0.2)',
                        border: '2px solid rgba(0, 245, 212, 0.4)',
                        borderRadius: '16px',
                        padding: '16px 28px',
                        color: '#00f5d4',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 32px rgba(0, 245, 212, 0.3)',
                        animation: 'float 3s ease-in-out infinite'
                    }}>
                        👆 Pinch to draw! Start at the green dot and follow the line!
                    </div>
                </div>
            )}

            {/* Central Celebration */}
            {showCelebration && (
                <Celebration
                    show={true}
                    message="Great Job!"
                    subMessage={`You traced ${pathName}! ${currentIndex < totalPaths - 1 ? 'Keep going! ✨' : 'All done! 🎉'}`}
                    icon="⭐"
                    duration={2500}
                    showConfetti={true}
                    soundEffect={true}
                />
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
