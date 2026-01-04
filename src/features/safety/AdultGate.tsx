import { useState, useRef, useEffect } from 'react';

interface AdultGateProps {
    onExit: () => void;
    onSettings?: () => void;
}

export const AdultGate = ({ onExit, onSettings }: AdultGateProps) => {
    const [holdProgress, setHoldProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const holdStartTime = useRef<number | null>(null);
    const animationRef = useRef<number | null>(null);

    const HOLD_DURATION = 2000; // 2 seconds to unlock

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    const startHold = () => {
        setIsHolding(true);
        holdStartTime.current = Date.now();

        const updateProgress = () => {
            if (holdStartTime.current) {
                const elapsed = Date.now() - holdStartTime.current;
                const progress = Math.min(elapsed / HOLD_DURATION, 1);
                setHoldProgress(progress);

                if (progress >= 1) {
                    setShowMenu(true);
                    setIsHolding(false);
                    holdStartTime.current = null;
                } else {
                    animationRef.current = requestAnimationFrame(updateProgress);
                }
            }
        };

        animationRef.current = requestAnimationFrame(updateProgress);
    };

    const endHold = () => {
        setIsHolding(false);
        holdStartTime.current = null;
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        // Animate progress back to 0
        const animateBack = () => {
            setHoldProgress(prev => {
                const next = prev - 0.05;
                if (next <= 0) return 0;
                requestAnimationFrame(animateBack);
                return next;
            });
        };
        animateBack();
    };

    const handleExit = () => {
        setShowMenu(false);
        setHoldProgress(0);
        onExit();
    };

    const handleSettings = () => {
        setShowMenu(false);
        setHoldProgress(0);
        onSettings?.();
    };

    const handleCloseMenu = () => {
        setShowMenu(false);
        setHoldProgress(0);
    };

    return (
        <>
            {/* Hold button - Top Right corner */}
            <div style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                zIndex: 200,
                pointerEvents: 'auto'
            }}>
                <button
                    onMouseDown={startHold}
                    onMouseUp={endHold}
                    onMouseLeave={endHold}
                    onTouchStart={startHold}
                    onTouchEnd={endHold}
                    style={{
                        position: 'relative',
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(15, 12, 41, 0.6)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        transform: isHolding ? 'scale(0.95)' : 'scale(1)',
                        borderColor: isHolding ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                        overflow: 'hidden'
                    }}
                >
                    {/* Progress ring */}
                    <svg
                        style={{
                            position: 'absolute',
                            top: -2,
                            left: -2,
                            width: '52px',
                            height: '52px',
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                        }}
                    >
                        <circle
                            cx="26"
                            cy="26"
                            r="23"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="3"
                        />
                        <circle
                            cx="26"
                            cy="26"
                            r="23"
                            fill="none"
                            stroke="#00FFFF"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${holdProgress * 144.5} 144.5`}
                            style={{
                                filter: holdProgress > 0 ? 'drop-shadow(0 0 8px #00FFFF)' : 'none',
                                transition: isHolding ? 'none' : 'stroke-dasharray 0.2s ease'
                            }}
                        />
                    </svg>

                    {/* Icon */}
                    <span style={{
                        fontSize: '1.2rem',
                        opacity: 0.8,
                        transition: 'transform 0.2s ease',
                        transform: isHolding ? 'scale(0.9)' : 'scale(1)'
                    }}>
                        {holdProgress >= 1 ? '🔓' : '🔒'}
                    </span>
                </button>

                {/* Hold instruction tooltip */}
                {isHolding && holdProgress > 0 && holdProgress < 1 && (
                    <div style={{
                        position: 'absolute',
                        top: '60px',
                        right: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        color: 'white',
                        whiteSpace: 'nowrap',
                        animation: 'fadeIn 0.2s ease'
                    }}>
                        Hold to unlock... {Math.round(holdProgress * 100)}%
                    </div>
                )}
            </div>

            {/* Adult Menu Overlay */}
            {showMenu && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'fadeIn 0.3s ease'
                    }}
                    onClick={handleCloseMenu}
                >
                    <div
                        style={{
                            background: 'rgba(30, 25, 60, 0.95)',
                            borderRadius: '24px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            padding: '32px',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                            animation: 'float 0.3s ease'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{
                            margin: '0 0 8px',
                            fontSize: '1.5rem',
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            🔓 Parent Menu
                        </h2>

                        <p style={{
                            margin: '0 0 24px',
                            color: 'rgba(255,255,255,0.6)',
                            textAlign: 'center',
                            fontSize: '0.9rem'
                        }}>
                            This area is for grown-ups
                        </p>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            {/* Exit to Menu */}
                            <button
                                onClick={handleExit}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    padding: '16px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '16px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <span style={{ fontSize: '1.5rem' }}>🏠</span>
                                Exit to Menu
                            </button>

                            {/* Settings (optional) */}
                            {onSettings && (
                                <button
                                    onClick={handleSettings}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '12px',
                                        padding: '16px',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '16px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <span style={{ fontSize: '1.5rem' }}>⚙️</span>
                                    Settings
                                </button>
                            )}

                            {/* Cancel */}
                            <button
                                onClick={handleCloseMenu}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    padding: '16px',
                                    background: 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '16px',
                                    color: 'rgba(255,255,255,0.6)',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

