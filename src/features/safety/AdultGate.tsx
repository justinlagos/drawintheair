import { useState, useRef, useEffect } from 'react';
import { perf, type PerformanceOverride } from '../../core/perf';
import { KidPanel, KidButton } from '../../components/kid-ui';
import { tokens } from '../../styles/tokens';

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
                    aria-label="Hold to unlock parent menu"
                    style={{
                        position: 'relative',
                        width: `${buttonSize}px`,
                        height: `${buttonSize}px`,
                        minWidth: '44px',
                        minHeight: '44px',
                        borderRadius: '50%',
                        background: tokens.semantic.bgPanel,
                        border: `2px solid ${isHolding ? tokens.semantic.primary : tokens.semantic.borderPanel}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        transform: isHolding ? 'scale(0.95)' : 'scale(1)',
                        boxShadow: tokens.shadow.float,
                        overflow: 'hidden',
                        touchAction: 'manipulation',
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
                            pointerEvents: 'none',
                        }}
                    >
                        <circle
                            cx={circleCenter}
                            cy={circleCenter}
                            r={circleRadius}
                            fill="none"
                            stroke="rgba(108, 63, 164, 0.15)"
                            strokeWidth="3"
                        />
                        <circle
                            cx={circleCenter}
                            cy={circleCenter}
                            r={circleRadius}
                            fill="none"
                            stroke={tokens.colors.deepPlum}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${holdProgress * circumference} ${circumference}`}
                            style={{
                                filter: holdProgress > 0 ? `drop-shadow(0 0 6px ${tokens.colors.deepPlum})` : 'none',
                                transition: isHolding ? 'none' : 'stroke-dasharray 0.2s ease',
                            }}
                        />
                    </svg>

                    {/* Icon */}
                    <span style={{
                        fontSize: isCompact ? '1rem' : '1.2rem',
                        transition: 'transform 0.2s ease',
                        transform: isHolding ? 'scale(0.9)' : 'scale(1)',
                    }}>
                        {holdProgress >= 1 ? '🔓' : '🔒'}
                    </span>
                </button>

                {/* Hold instruction tooltip — bright Kid-UI cream pill */}
                {isHolding && holdProgress > 0 && holdProgress < 1 && (
                    <div className="kid-panel" style={{
                        position: 'absolute',
                        top: `${buttonSize + 12}px`,
                        right: 0,
                        background: tokens.semantic.bgPanel,
                        padding: isCompact ? '6px 12px' : '8px 14px',
                        borderRadius: tokens.radius.pill,
                        border: `1.5px solid ${tokens.semantic.borderPanel}`,
                        fontFamily: tokens.fontFamily.heading,
                        fontWeight: tokens.fontWeight.bold,
                        fontSize: isCompact ? '0.78rem' : '0.85rem',
                        color: tokens.semantic.textPrimary,
                        whiteSpace: 'nowrap',
                        boxShadow: tokens.shadow.float,
                        animation: 'fadeIn 0.2s ease',
                    }}>
                        Hold to unlock… {Math.round(holdProgress * 100)}%
                    </div>
                )}
            </div>

            {/* Parent Menu — Kid-UI bright modal */}
            {showMenu && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(190, 235, 255, 0.55)',
                        zIndex: 300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: isCompact ? '16px' : '24px',
                        animation: 'fadeIn 0.3s ease',
                    }}
                    onClick={handleCloseMenu}
                >
                    <KidPanel
                        size="lg"
                        tone="white"
                        style={{
                            maxWidth: '440px',
                            width: '100%',
                            animation: 'modalPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                        onClick={(e?: React.MouseEvent) => e?.stopPropagation()}
                    >
                        <h2 style={{
                            margin: `0 0 ${tokens.spacing.xs}`,
                            fontFamily: tokens.fontFamily.display,
                            fontWeight: tokens.fontWeight.bold,
                            fontSize: isCompact ? 'clamp(1.2rem, 4vw, 1.6rem)' : '1.6rem',
                            color: tokens.semantic.primary,
                            textAlign: 'center',
                            letterSpacing: tokens.letterSpacing.tight,
                        }}>
                            🔓 Parent Menu
                        </h2>

                        <p style={{
                            margin: `0 0 ${isCompact ? tokens.spacing.lg : tokens.spacing.xl}`,
                            fontFamily: tokens.fontFamily.body,
                            color: tokens.semantic.textSecondary,
                            textAlign: 'center',
                            fontSize: isCompact ? '0.9rem' : '1rem',
                        }}>
                            This area is for grown-ups
                        </p>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: tokens.spacing.md,
                        }}>
                            <KidButton variant="primary" size="md" fullWidth onClick={handleExit}
                                       icon={<span aria-hidden style={{ fontSize: '1.4rem' }}>🏠</span>}>
                                Exit to Menu
                            </KidButton>

                            {onSettings && (
                                <KidButton variant="secondary" size="md" fullWidth onClick={handleSettings}
                                           icon={<span aria-hidden style={{ fontSize: '1.4rem' }}>⚙️</span>}>
                                    Settings
                                </KidButton>
                            )}

                            {/* Performance toggle — bright cream sub-panel */}
                            <div style={{
                                padding: tokens.spacing.lg,
                                background: tokens.semantic.bgPanelTinted,
                                borderRadius: tokens.radius.lg,
                                border: `1.5px solid ${tokens.semantic.borderPanel}`,
                            }}>
                                <div style={{
                                    marginBottom: tokens.spacing.md,
                                    fontFamily: tokens.fontFamily.heading,
                                    fontSize: tokens.fontSize.label,
                                    color: tokens.semantic.textPrimary,
                                    fontWeight: tokens.fontWeight.bold,
                                }}>
                                    ⚡ Performance
                                </div>
                                <div style={{
                                    display: 'flex',
                                    gap: tokens.spacing.sm,
                                }}>
                                    {(['auto', 'high', 'low'] as PerformanceOverride[]).map((option) => {
                                        const active = perfOverride === option;
                                        return (
                                            <button
                                                key={option}
                                                onClick={() => handlePerfChange(option)}
                                                style={{
                                                    flex: 1,
                                                    minHeight: '44px',
                                                    padding: '10px 12px',
                                                    background: active ? tokens.semantic.bgPanel : 'transparent',
                                                    border: `2px solid ${active ? tokens.semantic.primary : tokens.semantic.borderPanel}`,
                                                    borderRadius: tokens.radius.md,
                                                    fontFamily: tokens.fontFamily.heading,
                                                    fontWeight: tokens.fontWeight.bold,
                                                    color: active ? tokens.semantic.primary : tokens.semantic.textPrimary,
                                                    fontSize: tokens.fontSize.label,
                                                    cursor: 'pointer',
                                                    boxShadow: active ? tokens.shadow.float : 'none',
                                                    transition: `all ${tokens.motion.duration.quick} ${tokens.motion.ease.standard}`,
                                                    touchAction: 'manipulation',
                                                    textTransform: 'capitalize',
                                                }}
                                            >
                                                {option === 'auto' ? 'Auto' : option === 'high' ? 'High' : 'Low'}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div style={{
                                    marginTop: tokens.spacing.sm,
                                    fontFamily: tokens.fontFamily.body,
                                    fontSize: tokens.fontSize.caption,
                                    color: tokens.semantic.textMuted,
                                    textAlign: 'center',
                                }}>
                                    Current: {currentTier.toUpperCase()}
                                </div>
                            </div>

                            <button
                                onClick={handleCloseMenu}
                                style={{
                                    minHeight: '44px',
                                    padding: '12px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: tokens.semantic.textSecondary,
                                    cursor: 'pointer',
                                    fontFamily: tokens.fontFamily.heading,
                                    fontSize: tokens.fontSize.label,
                                    fontWeight: tokens.fontWeight.semibold,
                                    transition: 'all 0.2s ease',
                                    touchAction: 'manipulation',
                                }}
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    </KidPanel>
                </div>
            )}
        </>
    );
};

