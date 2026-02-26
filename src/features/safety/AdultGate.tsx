import { useState, useRef, useEffect } from 'react';
import { perf, type PerformanceOverride } from '../../core/perf';

// Responsive hook
const useResponsiveLayout = () => {
    const [layout, setLayout] = useState(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
            isMobile: w <= 480,
            isTabletSmall: w > 480 && w <= 768,
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
                isLandscapePhone: w > h && h <= 500,
                screenWidth: w
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return layout;
};

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
    const [perfOverride, setPerfOverride] = useState<PerformanceOverride>(() => {
        const saved = localStorage.getItem('perf-override') as PerformanceOverride | null;
        return (saved && ['auto', 'high', 'low'].includes(saved)) ? saved : 'auto';
    });

    const HOLD_DURATION = 2000; // 2 seconds to unlock
    
    const layout = useResponsiveLayout();
    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;

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

    const handlePerfChange = (value: PerformanceOverride) => {
        setPerfOverride(value);
        localStorage.setItem('perf-override', value);
        perf.setOverride(value);
    };

    const currentTier = perf.getConfig().tier;

    // Responsive button size - minimum 44px for touch safety
    const buttonSize = isCompact ? 44 : 48;
    const svgSize = buttonSize + 4;
    const circleCenter = svgSize / 2;
    const circleRadius = (buttonSize / 2) - 1;
    const circumference = 2 * Math.PI * circleRadius;

    return (
        <>
            {/* Hold button - Top Right corner */}
            <div style={{
                position: 'absolute',
                top: isCompact ? 'clamp(12px, 3vw, 24px)' : '24px',
                right: isCompact ? 'clamp(12px, 3vw, 24px)' : '24px',
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
                        width: `${buttonSize}px`,
                        height: `${buttonSize}px`,
                        minWidth: '44px',
                        minHeight: '44px',
                        borderRadius: '50%',
                        background: 'rgba(15, 12, 41, 0.75)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        transform: isHolding ? 'scale(0.95)' : 'scale(1)',
                        borderColor: isHolding ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                        overflow: 'hidden',
                        touchAction: 'manipulation'
                    }}
                >
                    {/* Progress ring */}
                    <svg
                        style={{
                            position: 'absolute',
                            top: -2,
                            left: -2,
                            width: `${svgSize}px`,
                            height: `${svgSize}px`,
                            transform: 'rotate(-90deg)',
                            pointerEvents: 'none'
                        }}
                    >
                        <circle
                            cx={circleCenter}
                            cy={circleCenter}
                            r={circleRadius}
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="3"
                        />
                        <circle
                            cx={circleCenter}
                            cy={circleCenter}
                            r={circleRadius}
                            fill="none"
                            stroke="#00FFFF"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${holdProgress * circumference} ${circumference}`}
                            style={{
                                filter: holdProgress > 0 ? 'drop-shadow(0 0 8px #00FFFF)' : 'none',
                                transition: isHolding ? 'none' : 'stroke-dasharray 0.2s ease'
                            }}
                        />
                    </svg>

                    {/* Icon */}
                    <span style={{
                        fontSize: isCompact ? '1rem' : '1.2rem',
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
                        top: `${buttonSize + 12}px`,
                        right: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        padding: isCompact ? '6px 10px' : '8px 12px',
                        borderRadius: '8px',
                        fontSize: isCompact ? '0.75rem' : '0.8rem',
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
                        background: 'rgba(0, 0, 0, 0.85)',
                        zIndex: 300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: isCompact ? '16px' : '24px',
                        animation: 'fadeIn 0.3s ease'
                    }}
                    onClick={handleCloseMenu}
                >
                    <div
                        style={{
                            background: 'rgba(30, 25, 60, 0.95)',
                            borderRadius: isCompact ? '16px' : '24px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            padding: isCompact ? '20px' : '32px',
                            maxWidth: '400px',
                            width: '100%',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                            animation: 'float 0.3s ease'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{
                            margin: '0 0 8px',
                            fontSize: isCompact ? 'clamp(1.1rem, 4vw, 1.5rem)' : '1.5rem',
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            🔓 Parent Menu
                        </h2>

                        <p style={{
                            margin: isCompact ? '0 0 16px' : '0 0 24px',
                            color: 'rgba(255,255,255,0.6)',
                            textAlign: 'center',
                            fontSize: isCompact ? '0.8rem' : '0.9rem'
                        }}>
                            This area is for grown-ups
                        </p>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: isCompact ? '10px' : '12px'
                        }}>
                            {/* Exit to Menu */}
                            <button
                                onClick={handleExit}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: isCompact ? '8px' : '12px',
                                    padding: isCompact ? '14px' : '16px',
                                    minHeight: '44px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: isCompact ? '12px' : '16px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: isCompact ? '0.9rem' : '1rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease',
                                    touchAction: 'manipulation'
                                }}
                            >
                                <span style={{ fontSize: isCompact ? '1.25rem' : '1.5rem' }}>🏠</span>
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
                                        gap: isCompact ? '8px' : '12px',
                                        padding: isCompact ? '14px' : '16px',
                                        minHeight: '44px',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: isCompact ? '12px' : '16px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: isCompact ? '0.9rem' : '1rem',
                                        fontWeight: 600,
                                        transition: 'all 0.2s ease',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    <span style={{ fontSize: isCompact ? '1.25rem' : '1.5rem' }}>⚙️</span>
                                    Settings
                                </button>
                            )}

                            {/* Performance Toggle */}
                            <div style={{
                                padding: isCompact ? '12px' : '16px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                borderRadius: isCompact ? '12px' : '16px',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <div style={{
                                    marginBottom: isCompact ? '8px' : '12px',
                                    fontSize: isCompact ? '0.85rem' : '0.9rem',
                                    color: 'rgba(255,255,255,0.7)',
                                    fontWeight: 600
                                }}>
                                    ⚡ Performance
                                </div>
                                <div style={{
                                    display: 'flex',
                                    gap: isCompact ? '6px' : '8px'
                                }}>
                                    {(['auto', 'high', 'low'] as PerformanceOverride[]).map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => handlePerfChange(option)}
                                            style={{
                                                flex: 1,
                                                padding: isCompact ? '10px 8px' : '12px 10px',
                                                minHeight: '44px',
                                                background: perfOverride === option
                                                    ? 'rgba(0, 229, 255, 0.2)'
                                                    : 'rgba(255, 255, 255, 0.05)',
                                                border: perfOverride === option
                                                    ? '1px solid rgba(0, 229, 255, 0.5)'
                                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: isCompact ? '8px' : '10px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: isCompact ? '0.8rem' : '0.85rem',
                                                fontWeight: perfOverride === option ? 600 : 400,
                                                transition: 'all 0.2s ease',
                                                touchAction: 'manipulation',
                                                textTransform: 'capitalize'
                                            }}
                                        >
                                            {option === 'auto' ? 'Auto' : option === 'high' ? 'High' : 'Low'}
                                        </button>
                                    ))}
                                </div>
                                <div style={{
                                    marginTop: isCompact ? '8px' : '10px',
                                    fontSize: isCompact ? '0.7rem' : '0.75rem',
                                    color: 'rgba(255,255,255,0.5)',
                                    textAlign: 'center'
                                }}>
                                    Current: {currentTier.toUpperCase()}
                                </div>
                            </div>

                            {/* Cancel */}
                            <button
                                onClick={handleCloseMenu}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: isCompact ? '8px' : '12px',
                                    padding: isCompact ? '14px' : '16px',
                                    minHeight: '44px',
                                    background: 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: isCompact ? '12px' : '16px',
                                    color: 'rgba(255,255,255,0.6)',
                                    cursor: 'pointer',
                                    fontSize: isCompact ? '0.9rem' : '1rem',
                                    transition: 'all 0.2s ease',
                                    touchAction: 'manipulation'
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

