import { useState, useEffect } from 'react';
import {
    resetPath,
    nextPath,
    resetAllPaths,
    getCurrentPathIndex,
    getCurrentPathName,
    getProgress,
    getTotalPaths,
    isCurrentLetter
} from './preWriting/preWritingLogic';

export const PreWritingMode = () => {
    const [progress, setProgress] = useState(0);
    const [pathName, setPathName] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [totalPaths] = useState(getTotalPaths());
    const [isLetter, setIsLetter] = useState(false);

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
        const newName = getCurrentPathName();
        setPathName(newName);
        setIsLetter(isCurrentLetter());
    };

    const handleRestart = () => {
        resetPath();
        setProgress(0);
    };

    const handleRestartAll = () => {
        resetAllPaths();
        setProgress(0);
        setCurrentIndex(0);
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
                    background: 'rgba(15, 12, 41, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '16px 24px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>✏️</span>
                        <span style={{
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Tracing Mode
                        </span>
                    </div>

                    {/* Path info */}
                    <div style={{
                        fontSize: '0.9rem',
                        color: 'rgba(255,255,255,0.7)',
                        marginBottom: '8px'
                    }}>
                        {isLetter ? 'Letter' : 'Shape'} {currentIndex + 1} of {totalPaths}: <strong style={{ color: 'white', fontSize: '1.2rem' }}>{pathName}</strong>
                    </div>

                    {/* Progress dots */}
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        marginTop: '8px'
                    }}>
                        {Array.from({ length: totalPaths }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: i < currentIndex
                                        ? '#00f5d4'
                                        : i === currentIndex
                                            ? `conic-gradient(#00f5d4 ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`
                                            : 'rgba(255,255,255,0.2)',
                                    boxShadow: i <= currentIndex ? '0 0 8px #00f5d4' : 'none',
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
                    background: 'rgba(15, 12, 41, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '30px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}>
                    <span style={{
                        fontSize: '1.5rem',
                        filter: progress > 0.5 ? 'drop-shadow(0 0 10px #FFD700)' : 'none'
                    }}>
                        {progress >= 0.95 ? '⭐' : progress > 0.5 ? '🌟' : '✨'}
                    </span>

                    <div style={{
                        width: '200px',
                        height: '12px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: progress >= 0.95
                                ? 'linear-gradient(90deg, #FFD700, #FFA500)'
                                : 'linear-gradient(90deg, #00f5d4, #4facfe)',
                            borderRadius: '6px',
                            transition: 'width 0.15s ease',
                            boxShadow: `0 0 15px ${progress >= 0.95 ? '#FFD700' : '#00f5d4'}88`
                        }} />
                    </div>

                    <span style={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: progress >= 0.95 ? '#FFD700' : '#00f5d4',
                        minWidth: '50px',
                        textAlign: 'right',
                        textShadow: progress >= 0.95 ? '0 0 10px #FFD700' : 'none'
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
                    background: 'rgba(15, 12, 41, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '16px 24px',
                    display: 'flex',
                    gap: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}>
                    <button
                        onClick={handleRestart}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '12px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
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
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #00f5d4, #4facfe)',
                                border: 'none',
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 20px rgba(0, 245, 212, 0.4)'
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
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                border: 'none',
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 20px rgba(255, 215, 0, 0.4)'
                            }}
                        >
                            <span>🎉</span>
                            Play Again
                        </button>
                    )}
                </div>
            </div>

            {/* Instructions */}
            {progress < 0.1 && (
                <div style={{
                    position: 'absolute',
                    bottom: '120px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 15,
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        background: 'rgba(0, 245, 212, 0.15)',
                        border: '1px solid rgba(0, 245, 212, 0.3)',
                        borderRadius: '12px',
                        padding: '12px 20px',
                        color: '#00f5d4',
                        fontSize: '1rem',
                        animation: 'float 3s ease-in-out infinite'
                    }}>
                        👆 Pinch to draw! Start at the green dot and follow the line!
                    </div>
                </div>
            )}
        </>
    );
};
