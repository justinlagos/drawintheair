/**
 * Mode Selection Menu - Production Quality Design
 * 
 * Nintendo × Apple level interface with:
 * - Zero overlapping UI
 * - Clear visual hierarchy
 * - Strict grid system (2×2 + full-width row)
 * - Premium spacing and safe zones
 * - Calm, playful, premium feel
 */

import { useState, useEffect, useRef } from 'react';
import { type HandLandmarkerResult } from '@mediapipe/tasks-vision';

export type GameMode = 'calibration' | 'free' | 'pre-writing' | 'sort-and-place' | 'word-search';

interface ModeOption {
    id: GameMode;
    title: string;
    description: string;
    icon: string;
    gradient: string;
    accentColor: string;
    category: 'warm-up' | 'creative' | 'learning' | 'puzzle';
}

const MODES: ModeOption[] = [
    {
        id: 'calibration',
        title: 'Bubble Pop',
        description: 'Warm up',
        icon: '🫧',
        gradient: 'linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(0, 229, 255, 0.04) 100%)',
        accentColor: '#00E5FF',
        category: 'warm-up'
    },
    {
        id: 'free',
        title: 'Free Paint',
        description: 'Create',
        icon: '🎨',
        gradient: 'linear-gradient(135deg, rgba(222, 49, 99, 0.08) 0%, rgba(222, 49, 99, 0.04) 100%)',
        accentColor: '#DE3163',
        category: 'creative'
    },
    {
        id: 'pre-writing',
        title: 'Tracing',
        description: 'Learn',
        icon: '✏️',
        gradient: 'linear-gradient(135deg, rgba(255, 217, 61, 0.08) 0%, rgba(255, 217, 61, 0.04) 100%)',
        accentColor: '#FFD93D',
        category: 'learning'
    },
    {
        id: 'sort-and-place',
        title: 'Sort and Place',
        description: 'Think',
        icon: '🗂️',
        gradient: 'linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(0, 229, 255, 0.04) 100%)',
        accentColor: '#00E5FF',
        category: 'puzzle'
    },
    {
        id: 'word-search',
        title: 'Word Search',
        description: 'Explore',
        icon: '🔍',
        gradient: 'linear-gradient(135deg, rgba(222, 49, 99, 0.08) 0%, rgba(222, 49, 99, 0.04) 100%)',
        accentColor: '#DE3163',
        category: 'puzzle'
    }
];

interface ModeSelectionMenuProps {
    onSelect: (mode: GameMode) => void;
    trackingResults: HandLandmarkerResult | null;
}

interface ModeCardProps {
    mode: ModeOption;
    isHovered: boolean;
    isSelected: boolean;
    hoverProgress: number;
    onSelect: (mode: GameMode) => void;
    isFullWidth?: boolean;
}

const ModeCard = ({ mode, isHovered, isSelected, hoverProgress, onSelect, isFullWidth = false }: ModeCardProps) => {
    return (
        <div
            id={`mode-card-${mode.id}`}
            onClick={() => onSelect(mode.id)}
            style={{
                position: 'relative',
                width: '100%',
                height: isFullWidth ? '140px' : '100%',
                borderRadius: '20px',
                background: isHovered 
                    ? `linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%), ${mode.gradient}`
                    : `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%), ${mode.gradient}`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: isHovered 
                    ? `1px solid rgba(255, 255, 255, 0.25)` 
                    : `1px solid rgba(255, 255, 255, 0.1)`,
                cursor: 'pointer',
                transform: `scale(${isSelected ? 0.98 : isHovered ? 1.01 : 1}) translateY(${isHovered ? -3 : 0}px)`,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isHovered
                    ? `0 12px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px ${mode.accentColor}35, 0 0 24px ${mode.accentColor}15`
                    : '0 8px 24px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
            }}
        >
            {/* Progress ring */}
            {isHovered && (
                <svg
                    style={{
                        position: 'absolute',
                        top: '-3px',
                        left: '-3px',
                        right: '-3px',
                        bottom: '-3px',
                        width: 'calc(100% + 6px)',
                        height: 'calc(100% + 6px)',
                        pointerEvents: 'none',
                        zIndex: 2,
                        transform: 'rotate(-90deg)'
                    }}
                >
                    <circle
                        cx="50%"
                        cy="50%"
                        r="calc(50% - 1.5px)"
                        fill="none"
                        stroke={mode.accentColor}
                        strokeWidth="2.5"
                        strokeDasharray={`${hoverProgress * 800} 800`}
                        strokeLinecap="round"
                        style={{ 
                            transition: 'stroke-dasharray 0.1s linear',
                            filter: `drop-shadow(0 0 6px ${mode.accentColor})`
                        }}
                    />
                </svg>
            )}

            {/* Inner card content */}
            <div style={{
                width: '100%',
                height: '100%',
                padding: isFullWidth ? '20px 28px' : '20px',
                display: 'flex',
                flexDirection: isFullWidth ? 'row' : 'column',
                justifyContent: isFullWidth ? 'flex-start' : 'space-between',
                alignItems: isFullWidth ? 'center' : 'stretch',
                gap: isFullWidth ? '24px' : '0',
                position: 'relative',
                zIndex: 1,
                boxSizing: 'border-box'
            }}>
                {/* Category badge - Top left, always visible */}
                <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    zIndex: 3,
                    flexShrink: 0
                }}>
                    <div style={{
                        padding: '6px 14px',
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${mode.accentColor}18, ${mode.accentColor}10)`,
                        backdropFilter: 'blur(10px)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: mode.accentColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.9px',
                        border: `1px solid ${mode.accentColor}35`,
                        boxShadow: `0 2px 8px ${mode.accentColor}12`,
                        whiteSpace: 'nowrap'
                    }}>
                        {mode.category.replace('-', ' ')}
                    </div>
                </div>

                {isFullWidth ? (
                    /* Full-width card layout: Icon left, Text right, same level */
                    <>
                        {/* Icon - Left side */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flex: '0 0 auto',
                            width: 'auto',
                            height: '100%',
                            marginTop: 0
                        }}>
                            <div style={{
                                fontSize: '3.5rem',
                                filter: isHovered 
                                    ? `drop-shadow(0 0 16px ${mode.accentColor}50) drop-shadow(0 0 32px ${mode.accentColor}25)` 
                                    : 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                                lineHeight: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {mode.icon}
                            </div>
                        </div>

                        {/* Title - Right side, same level as icon */}
                        <div style={{
                            flex: '1 1 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            height: '100%',
                            paddingLeft: '8px'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                color: '#ffffff',
                                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                                lineHeight: '1.2',
                                letterSpacing: '-0.3px',
                                textAlign: 'left',
                                whiteSpace: 'nowrap'
                            }}>
                                {mode.title}
                            </h3>
                        </div>
                    </>
                ) : (
                    /* Grid card layout: Icon center, Title bottom */
                    <>
                        {/* Icon - Centered, with space for badge */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flex: '1 1 auto',
                            minHeight: '80px',
                            maxHeight: '120px',
                            paddingTop: '40px', // Space for category badge
                            paddingBottom: '8px',
                            boxSizing: 'border-box'
                        }}>
                            <div style={{
                                fontSize: '3.2rem',
                                filter: isHovered 
                                    ? `drop-shadow(0 0 16px ${mode.accentColor}50) drop-shadow(0 0 32px ${mode.accentColor}25)` 
                                    : 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                                lineHeight: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {mode.icon}
                            </div>
                        </div>

                        {/* Title - Bottom, always visible */}
                        <div style={{
                            flex: '0 0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '32px',
                            paddingTop: '8px',
                            paddingBottom: '4px',
                            boxSizing: 'border-box'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '1.35rem',
                                fontWeight: 700,
                                color: '#ffffff',
                                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                                lineHeight: '1.2',
                                letterSpacing: '-0.3px',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'visible'
                            }}>
                                {mode.title}
                            </h3>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export const ModeSelectionMenu = ({ onSelect, trackingResults }: ModeSelectionMenuProps) => {
    const [hoveredMode, setHoveredMode] = useState<GameMode | null>(null);
    const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
    const [hoverProgress, setHoverProgress] = useState(0);
    const hoverStartTime = useRef<number | null>(null);
    const cardRefs = useRef<Map<GameMode, DOMRect>>(new Map());
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    // Detect mobile
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Update card positions
    useEffect(() => {
        const updateRefs = () => {
            MODES.forEach(mode => {
                const el = document.getElementById(`mode-card-${mode.id}`);
                if (el) {
                    cardRefs.current.set(mode.id, el.getBoundingClientRect());
                }
            });
        };
        updateRefs();
        window.addEventListener('resize', updateRefs);
        return () => window.removeEventListener('resize', updateRefs);
    }, []);

    // Track finger position and detect hover/selection
    useEffect(() => {
        if (!trackingResults?.landmarks?.length) {
            if (hoverStartTime.current) {
                hoverStartTime.current = null;
                setHoverProgress(0);
            }
            return;
        }

        const tip = trackingResults.landmarks[0][8];
        const fx = tip.x * window.innerWidth;
        const fy = tip.y * window.innerHeight;

        let foundHover: GameMode | null = null;

        cardRefs.current.forEach((rect, modeId) => {
            if (
                fx >= rect.left &&
                fx <= rect.right &&
                fy >= rect.top &&
                fy <= rect.bottom
            ) {
                foundHover = modeId;
            }
        });

        if (foundHover !== hoveredMode) {
            setHoveredMode(foundHover);
            hoverStartTime.current = foundHover ? Date.now() : null;
            setHoverProgress(0);
        }

        if (foundHover && hoverStartTime.current) {
            const elapsed = Date.now() - hoverStartTime.current;
            const progress = Math.min(elapsed / 1500, 1);
            setHoverProgress(progress);

            if (progress >= 1 && !selectedMode) {
                setSelectedMode(foundHover);
                setTimeout(() => onSelect(foundHover!), 300);
            }
        }
    }, [trackingResults, hoveredMode, selectedMode, onSelect]);

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            background: '#010C24',
            overflow: 'hidden',
            padding: '24px',
            boxSizing: 'border-box',
            height: '100vh'
        }}>
            {/* Vignette overlay for depth */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: `
                    radial-gradient(ellipse at center, transparent 0%, rgba(1, 12, 36, 0.4) 100%),
                    radial-gradient(circle at 20% 30%, rgba(0, 229, 255, 0.06) 0%, transparent 50%),
                    radial-gradient(circle at 80% 70%, rgba(222, 49, 99, 0.06) 0%, transparent 50%),
                    radial-gradient(circle at 50% 50%, rgba(255, 217, 61, 0.04) 0%, transparent 70%)
                `,
                pointerEvents: 'none',
                zIndex: 0
            }} />

            {/* Main Container - Centered with strict spacing */}
            <div style={{
                width: '100%',
                maxWidth: '920px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '32px',
                position: 'relative',
                zIndex: 1,
                paddingTop: '16px',
                paddingBottom: '16px',
                boxSizing: 'border-box'
            }}>
                {/* Header Section - Scene Header */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    flexShrink: 0
                }}>
                    {/* Main Title */}
                    <div style={{
                        fontSize: isMobile ? '2rem' : '2.5rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        letterSpacing: '2px',
                        textShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        textAlign: 'center',
                        lineHeight: '1.1'
                    }}>
                        DRAW IN THE AIR
                    </div>

                    {/* Subtitle */}
                    <div style={{
                        fontSize: isMobile ? '1rem' : '1.15rem',
                        color: 'rgba(255, 255, 255, 0.75)',
                        fontWeight: 400,
                        textAlign: 'center',
                        letterSpacing: '0.5px'
                    }}>
                        Choose your adventure
                    </div>
                </div>

                {/* Mode Cards Grid - Strict 2×2 + Full-Width Row */}
                <div style={{
                    flex: '1 1 auto',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gridTemplateRows: isMobile 
                        ? 'repeat(5, minmax(180px, 1fr))'
                        : 'repeat(2, minmax(180px, 1fr)) auto',
                    gap: '16px',
                    alignItems: 'stretch',
                    minHeight: 0,
                    width: '100%'
                }}>
                    {/* First 4 cards in 2×2 grid */}
                    {MODES.slice(0, 4).map((mode) => {
                        const isHovered = hoveredMode === mode.id;
                        const isSelected = selectedMode === mode.id;

                        return (
                            <div
                                key={mode.id}
                                style={{
                                    minHeight: 0,
                                    display: 'flex'
                                }}
                            >
                                <ModeCard
                                    mode={mode}
                                    isHovered={isHovered}
                                    isSelected={isSelected}
                                    hoverProgress={hoverProgress}
                                    onSelect={onSelect}
                                    isFullWidth={false}
                                />
                            </div>
                        );
                    })}

                    {/* Last card - Full width row */}
                    {MODES.slice(4).map((mode) => {
                        const isHovered = hoveredMode === mode.id;
                        const isSelected = selectedMode === mode.id;

                        return (
                            <div
                                key={mode.id}
                                style={{
                                    gridColumn: isMobile ? '1' : '1 / -1',
                                    gridRow: isMobile ? 'auto' : '3',
                                    minHeight: 0,
                                    display: 'flex',
                                    maxWidth: isMobile ? '100%' : '600px',
                                    justifySelf: 'center'
                                }}
                            >
                                <ModeCard
                                    mode={mode}
                                    isHovered={isHovered}
                                    isSelected={isSelected}
                                    hoverProgress={hoverProgress}
                                    onSelect={onSelect}
                                    isFullWidth={true}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Footer Instruction - Fixed Bottom */}
                <div style={{
                    padding: '16px 28px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    flexShrink: 0,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
                }}>
                    <span style={{ 
                        fontSize: '1.4rem',
                        filter: 'drop-shadow(0 0 8px rgba(255, 217, 61, 0.5))',
                        lineHeight: '1'
                    }}>👆</span>
                    <div style={{
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.95)',
                        letterSpacing: '0.3px'
                    }}>
                        Point and hold to select
                    </div>
                </div>
            </div>
        </div>
    );
};
