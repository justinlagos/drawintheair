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
        gradient: 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)', // Orange
        accentColor: '#FF8C42',
        category: 'warm-up'
    },
    {
        id: 'free',
        title: 'Free Paint',
        description: 'Create',
        icon: '🎨',
        gradient: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)', // Purple
        accentColor: '#9B59B6',
        category: 'creative'
    },
    {
        id: 'pre-writing',
        title: 'Tracing',
        description: 'Learn',
        icon: '✏️',
        gradient: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)', // Green
        accentColor: '#2ECC71',
        category: 'learning'
    },
    {
        id: 'sort-and-place',
        title: 'Sort and Place',
        description: 'Think',
        icon: '🗂️',
        gradient: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)', // Blue
        accentColor: '#3498DB',
        category: 'puzzle'
    },
    {
        id: 'word-search',
        title: 'Word Search',
        description: 'Focus',
        icon: '🔍',
        gradient: 'linear-gradient(135deg, #F1C40F 0%, #F39C12 100%)', // Yellow
        accentColor: '#F1C40F',
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
    screenSize?: 'phone' | 'tablet-small' | 'tablet' | 'desktop' | 'large';
}

const ModeCard = ({ mode, isHovered, isSelected, hoverProgress, onSelect, isFullWidth = false, screenSize = 'desktop' }: ModeCardProps) => {
    const isMobile = screenSize === 'phone' || screenSize === 'tablet-small';
    const isTablet = screenSize === 'tablet';
    
    // Responsive card height
    const cardHeight = isFullWidth 
        ? (isMobile ? '100px' : isTablet ? '120px' : '140px')
        : '100%';
    
    // Responsive border radius - use ToyMode token when available
    const borderRadius = isMobile ? '16px' : '20px';
    // ToyMode will override via CSS variables
    
    return (
        <div
            id={`mode-card-${mode.id}`}
            className="mode-card"
            onClick={() => onSelect(mode.id)}
            style={{
                position: 'relative',
                width: '100%',
                height: cardHeight,
                minHeight: isMobile ? '100px' : isFullWidth ? 'auto' : '140px',
                borderRadius: borderRadius,
                background: 'transparent',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                border: 'none',
                cursor: 'pointer',
                transform: `scale(${isSelected ? 0.98 : isHovered ? 1.05 : 1}) translateY(${isHovered ? -6 : 0}px)`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'none',
                overflow: 'visible',
                padding: '32px',
                margin: '-32px',
                boxSizing: 'content-box'
            }}
        >
            {/* Subtle glow effect on hover */}
            {isHovered && (
                <div style={{
                    position: 'absolute',
                    top: '-32px',
                    left: '-32px',
                    right: '-32px',
                    bottom: '-32px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle at center, ${mode.accentColor}25 0%, ${mode.accentColor}10 30%, transparent 70%)`,
                    pointerEvents: 'none',
                    zIndex: 0,
                    opacity: hoverProgress * 0.8,
                    transition: 'opacity 0.2s ease-out',
                    filter: `blur(24px)`,
                    transform: 'scale(1.1)'
                }} />
            )}

            {/* Inner card content */}
            <div style={{
                width: '100%',
                height: '100%',
                padding: isFullWidth 
                    ? (isMobile ? '20px 24px' : '28px 36px') 
                    : (isMobile ? 'clamp(18px, 2.5vw, 24px)' : 'clamp(24px, 3vw, 32px)'),
                display: 'flex',
                flexDirection: isFullWidth ? 'row' : 'column',
                justifyContent: isFullWidth ? 'flex-start' : 'space-between',
                alignItems: isFullWidth ? 'center' : 'stretch',
                gap: isFullWidth ? (isMobile ? '16px' : '28px') : '0',
                position: 'relative',
                zIndex: 1,
                boxSizing: 'border-box'
            }}>

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
                                fontSize: isMobile ? 'clamp(2.5rem, 7vw, 3rem)' : 'clamp(3.5rem, 5vw, 4rem)',
                                filter: isHovered 
                                    ? `drop-shadow(0 0 24px ${mode.accentColor}70) drop-shadow(0 0 48px ${mode.accentColor}40) drop-shadow(0 4px 16px rgba(0,0,0,0.5))` 
                                    : 'drop-shadow(0 3px 12px rgba(0,0,0,0.4)) drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isHovered ? 'scale(1.12) translateY(-4px)' : 'scale(1)',
                                lineHeight: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                transformStyle: 'preserve-3d'
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
                            paddingLeft: isMobile ? 'clamp(8px, 1.5vw, 12px)' : 'clamp(12px, 1.8vw, 16px)'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: isMobile ? 'clamp(1.2rem, 3.5vw, 1.4rem)' : isTablet ? 'clamp(1.4rem, 2.8vw, 1.6rem)' : 'clamp(1.5rem, 2.2vw, 1.8rem)',
                                fontWeight: 700,
                                color: '#ffffff',
                                textShadow: isHovered
                                    ? `0 4px 16px rgba(0,0,0,0.8), 0 0 24px ${mode.accentColor}50, 0 2px 4px rgba(0,0,0,0.9)`
                                    : '0 3px 12px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.8)',
                                lineHeight: '1.25',
                                letterSpacing: '-0.2px',
                                textAlign: 'left',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isHovered ? 'translateX(4px)' : 'translateX(0)'
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
                            minHeight: isMobile ? 'clamp(70px, 10vh, 90px)' : 'clamp(100px, 12vh, 140px)',
                            maxHeight: isMobile ? 'clamp(100px, 14vh, 120px)' : 'clamp(140px, 16vh, 180px)',
                            paddingTop: isMobile ? 'clamp(36px, 5vh, 44px)' : 'clamp(52px, 6vh, 72px)', // Space for category badge
                            paddingBottom: isMobile ? 'clamp(16px, 2vh, 20px)' : 'clamp(20px, 2.5vh, 28px)',
                            boxSizing: 'border-box'
                        }}>
                            <div style={{
                                fontSize: isMobile ? 'clamp(3.5rem, 10vw, 4.5rem)' : isTablet ? 'clamp(4.5rem, 8vw, 5.5rem)' : 'clamp(5rem, 6vw, 6.5rem)',
                                filter: isHovered 
                                    ? `drop-shadow(0 8px 32px rgba(0,0,0,0.6)) drop-shadow(0 0 48px ${mode.accentColor}60) drop-shadow(0 0 24px ${mode.accentColor}40)` 
                                    : 'drop-shadow(0 6px 20px rgba(0,0,0,0.5)) drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isHovered ? 'scale(1.15) translateY(-6px) rotateY(5deg)' : 'scale(1)',
                                lineHeight: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textShadow: '0 2px 12px rgba(0,0,0,0.4)',
                                transformStyle: 'preserve-3d',
                                perspective: '1000px'
                            }}>
                                {mode.icon}
                            </div>
                        </div>

                        {/* Title and Description - Bottom, always visible */}
                        <div style={{
                            flex: '0 0 auto',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: isMobile ? 'clamp(8px, 1.2vh, 10px)' : 'clamp(10px, 1.5vh, 12px)',
                            minHeight: isMobile ? 'clamp(50px, 7vh, 60px)' : 'clamp(60px, 8vh, 75px)',
                            paddingTop: isMobile ? 'clamp(20px, 2.5vh, 24px)' : 'clamp(24px, 3vh, 32px)',
                            paddingBottom: isMobile ? 'clamp(20px, 2.5vh, 24px)' : 'clamp(28px, 3.5vh, 36px)',
                            paddingLeft: isMobile ? 'clamp(16px, 2vw, 20px)' : 'clamp(20px, 2.5vw, 28px)',
                            paddingRight: isMobile ? 'clamp(16px, 2vw, 20px)' : 'clamp(20px, 2.5vw, 28px)',
                            boxSizing: 'border-box',
                            width: '100%',
                            overflow: 'visible'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: isMobile ? 'clamp(1.2rem, 3.5vw, 1.4rem)' : isTablet ? 'clamp(1.4rem, 2.8vw, 1.6rem)' : 'clamp(1.5rem, 2.2vw, 1.8rem)',
                                fontWeight: 700,
                                color: '#ffffff',
                                textShadow: isHovered 
                                    ? `0 4px 16px rgba(0,0,0,0.8), 0 0 24px ${mode.accentColor}50, 0 2px 4px rgba(0,0,0,0.9)`
                                    : '0 3px 12px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.8)',
                                lineHeight: '1.25',
                                letterSpacing: '-0.2px',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'visible',
                                marginBottom: 'clamp(4px, 0.5vh, 6px)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
                            }}>
                                {mode.title}
                            </h3>
                            <p style={{
                                margin: 0,
                                fontSize: mode.id === 'word-search' 
                                    ? (isMobile ? 'clamp(0.85rem, 2.4vw, 0.95rem)' : 'clamp(0.95rem, 1.8vw, 1.1rem)')
                                    : (isMobile ? 'clamp(0.8rem, 2.2vw, 0.9rem)' : 'clamp(0.9rem, 1.6vw, 1rem)'),
                                fontWeight: mode.id === 'word-search' ? 700 : 600,
                                color: isHovered ? 'rgba(255, 255, 255, 1)' : (mode.id === 'word-search' ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.95)'),
                                textShadow: isHovered
                                    ? `0 2px 10px rgba(0,0,0,0.7), 0 0 16px ${mode.accentColor}40, 0 1px 3px rgba(0,0,0,0.8)`
                                    : mode.id === 'word-search'
                                    ? `0 3px 12px rgba(0,0,0,0.7), 0 0 20px ${mode.accentColor}30, 0 1px 3px rgba(0,0,0,0.8)`
                                    : '0 2px 8px rgba(0,0,0,0.6), 0 0 12px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.7)',
                                lineHeight: '1.5',
                                textAlign: 'center',
                                whiteSpace: mode.id === 'word-search' ? 'normal' : 'nowrap',
                                overflow: 'visible',
                                letterSpacing: mode.id === 'word-search' ? '0.3px' : '0.2px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                                textOverflow: 'clip',
                                wordBreak: mode.id === 'word-search' ? 'normal' : 'normal',
                                width: '100%',
                                maxWidth: '100%'
                            }}>
                                {mode.description}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Breakpoint detection hook
type ScreenSize = 'phone' | 'tablet-small' | 'tablet' | 'desktop' | 'large';

const useScreenSize = (): ScreenSize => {
    const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
        const w = window.innerWidth;
        if (w <= 480) return 'phone';
        if (w <= 768) return 'tablet-small';
        if (w <= 1024) return 'tablet';
        if (w <= 1440) return 'desktop';
        return 'large';
    });

    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            if (w <= 480) setScreenSize('phone');
            else if (w <= 768) setScreenSize('tablet-small');
            else if (w <= 1024) setScreenSize('tablet');
            else if (w <= 1440) setScreenSize('desktop');
            else setScreenSize('large');
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return screenSize;
};

export const ModeSelectionMenu = ({ onSelect, trackingResults }: ModeSelectionMenuProps) => {
    const [hoveredMode, setHoveredMode] = useState<GameMode | null>(null);
    const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
    const [hoverProgress, setHoverProgress] = useState(0);
    const hoverStartTime = useRef<number | null>(null);
    const cardRefs = useRef<Map<GameMode, DOMRect>>(new Map());
    const screenSize = useScreenSize();
    const isMobile = screenSize === 'phone' || screenSize === 'tablet-small';
    const isTablet = screenSize === 'tablet';
    const isLarge = screenSize === 'large';
    const availableModes = MODES;

    // Detect mobile (legacy compatibility)
    useEffect(() => {
        // Card refs update handled in separate effect
    }, []);

    // Update card positions
    useEffect(() => {
        const updateRefs = () => {
            availableModes.forEach(mode => {
                const el = document.getElementById(`mode-card-${mode.id}`);
                if (el) {
                    cardRefs.current.set(mode.id, el.getBoundingClientRect());
                }
            });
        };
        updateRefs();
        window.addEventListener('resize', updateRefs);
        return () => window.removeEventListener('resize', updateRefs);
    }, [availableModes]);

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

    // Responsive values
    const containerPadding = isMobile ? 'clamp(12px, 3vw, 24px)' : isTablet ? '20px' : '24px';
    const headerFontSize = isMobile ? 'clamp(1.5rem, 5vw, 2rem)' : isTablet ? '2rem' : isLarge ? '3rem' : '2.5rem';
    const subtitleFontSize = isMobile ? 'clamp(0.85rem, 2.5vw, 1rem)' : isTablet ? '1rem' : '1.15rem';

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: isMobile ? 'flex-start' : 'center',
            zIndex: 50,
            background: '#010C24',
            overflow: 'hidden', // CRITICAL: Prevent scrolling
            padding: containerPadding,
            paddingTop: isMobile ? 'max(env(safe-area-inset-top, 12px), 12px)' : '24px',
            paddingBottom: isMobile ? 'max(env(safe-area-inset-bottom, 12px), 12px)' : '24px',
            boxSizing: 'border-box',
            height: '100vh',
            maxHeight: '100vh' // CRITICAL: Constrain to viewport
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
                maxWidth: isLarge ? '1100px' : '920px',
                height: isMobile ? 'auto' : '100%',
                minHeight: isMobile ? 'auto' : 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: isMobile ? 'flex-start' : 'space-between',
                gap: isMobile ? '16px' : isTablet ? '24px' : '32px',
                position: 'relative',
                zIndex: 1,
                paddingTop: isMobile ? '8px' : '16px',
                paddingBottom: isMobile ? '8px' : '16px',
                boxSizing: 'border-box',
                flex: isMobile ? '0 0 auto' : '1 1 auto',
                overflow: 'visible'
            }}>
                {/* Header Section - Scene Header */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: isMobile ? '8px' : '12px',
                    flexShrink: 0,
                    paddingBottom: isMobile ? '8px' : 0
                }}>
                    {/* Main Title */}
                    <div style={{
                        fontSize: headerFontSize,
                        fontWeight: 800,
                        color: '#ffffff',
                        letterSpacing: isMobile ? 'clamp(1px, 0.3vw, 1.5px)' : 'clamp(1.5px, 0.4vw, 2.5px)',
                        textShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 30px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.6)',
                        textAlign: 'center',
                        lineHeight: '1.15',
                        marginBottom: isMobile ? 'clamp(4px, 0.8vh, 6px)' : 'clamp(6px, 1vh, 8px)'
                    }}>
                        DRAW IN THE AIR
                    </div>

                    {/* Subtitle */}
                    <div style={{
                        fontSize: subtitleFontSize,
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontWeight: 500,
                        textAlign: 'center',
                        letterSpacing: 'clamp(0.3px, 0.1vw, 0.6px)',
                        textShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(0,0,0,0.2)'
                    }}>
                        Choose your adventure
                    </div>
                </div>

                {/* Mode Cards Grid - Responsive single-screen layout */}
                <div style={{
                    flex: isMobile ? '0 0 auto' : '1 1 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? 'clamp(10px, 1.2vw, 12px)' : isTablet ? 'clamp(12px, 1.5vw, 16px)' : 'clamp(16px, 2vw, 20px)',
                    width: '100%',
                    maxWidth: isMobile ? '100%' : isTablet ? '900px' : 'clamp(900px, 88vw, 1200px)',
                    margin: '0 auto',
                    maxHeight: isMobile ? 'none' : '100%',
                    overflow: 'hidden', // CRITICAL: Prevent scrolling
                    justifyContent: 'center'
                }}>
                    {/* Calculate optimal layout based on viewport */}
                    {(() => {
                        // Desktop: Single row of 5 cards
                        if (!isMobile && !isTablet) {
                            return (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(5, 1fr)',
                                    gap: 'clamp(16px, 2vw, 20px)',
                                    width: '100%',
                                    height: '100%',
                                    alignContent: 'center'
                                }}>
                                    {availableModes.map((mode) => {
                                        const isHovered = hoveredMode === mode.id;
                                        const isSelected = selectedMode === mode.id;
                                        return (
                                            <div
                                                key={mode.id}
                                                style={{
                                                    display: 'flex',
                                                    overflow: 'visible',
                                                    padding: '24px',
                                                    margin: '-24px',
                                                    boxSizing: 'content-box',
                                                    height: '100%',
                                                    maxHeight: '180px' // Constrain height
                                                }}
                                            >
                                                <ModeCard
                                                    mode={mode}
                                                    isHovered={isHovered}
                                                    isSelected={isSelected}
                                                    hoverProgress={hoverProgress}
                                                    onSelect={onSelect}
                                                    isFullWidth={false}
                                                    screenSize={screenSize}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        }
                        
                        // Tablet: 3 top + 2 bottom
                        if (isTablet && !isMobile) {
                            return (
                                <>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: 'clamp(12px, 1.5vw, 16px)',
                                        width: '100%'
                                    }}>
                                        {availableModes.slice(0, 3).map((mode) => {
                                            const isHovered = hoveredMode === mode.id;
                                            const isSelected = selectedMode === mode.id;
                                            return (
                                                <div
                                                    key={mode.id}
                                                    style={{
                                                        display: 'flex',
                                                        overflow: 'visible',
                                                        padding: '20px',
                                                        margin: '-20px',
                                                        boxSizing: 'content-box',
                                                        height: '100%',
                                                        maxHeight: '160px'
                                                    }}
                                                >
                                                    <ModeCard
                                                        mode={mode}
                                                        isHovered={isHovered}
                                                        isSelected={isSelected}
                                                        hoverProgress={hoverProgress}
                                                        onSelect={onSelect}
                                                        isFullWidth={false}
                                                        screenSize={screenSize}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'stretch',
                                        gap: 'clamp(12px, 1.5vw, 16px)',
                                        width: '100%'
                                    }}>
                                        {availableModes.slice(3).map((mode) => {
                                            const isHovered = hoveredMode === mode.id;
                                            const isSelected = selectedMode === mode.id;
                                            return (
                                                <div
                                                    key={mode.id}
                                                    style={{
                                                        display: 'flex',
                                                        overflow: 'visible',
                                                        padding: '20px',
                                                        margin: '-20px',
                                                        boxSizing: 'content-box',
                                                        width: 'calc((100% - clamp(12px, 1.5vw, 16px)) / 3)',
                                                        maxWidth: 'calc((100% - clamp(12px, 1.5vw, 16px)) / 3)',
                                                        height: '100%',
                                                        maxHeight: '160px'
                                                    }}
                                                >
                                                    <ModeCard
                                                        mode={mode}
                                                        isHovered={isHovered}
                                                        isSelected={isSelected}
                                                        hoverProgress={hoverProgress}
                                                        onSelect={onSelect}
                                                        isFullWidth={false}
                                                        screenSize={screenSize}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        }
                        
                        // Mobile: 2+2+1 or 2+3 layout
                        const isLandscape = window.innerWidth > window.innerHeight;
                        if (isLandscape) {
                            // Landscape: Single row of 5
                            return (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(5, 1fr)',
                                    gap: '10px',
                                    width: '100%',
                                    height: '100%',
                                    alignContent: 'center'
                                }}>
                                    {availableModes.map((mode) => {
                                        const isHovered = hoveredMode === mode.id;
                                        const isSelected = selectedMode === mode.id;
                                        return (
                                            <div
                                                key={mode.id}
                                                style={{
                                                    display: 'flex',
                                                    overflow: 'visible',
                                                    padding: '16px',
                                                    margin: '-16px',
                                                    boxSizing: 'content-box',
                                                    height: '100%',
                                                    maxHeight: '120px'
                                                }}
                                            >
                                                <ModeCard
                                                    mode={mode}
                                                    isHovered={isHovered}
                                                    isSelected={isSelected}
                                                    hoverProgress={hoverProgress}
                                                    onSelect={onSelect}
                                                    isFullWidth={false}
                                                    screenSize={screenSize}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        } else {
                            // Portrait: 2+2+1
                            return (
                                <>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '10px',
                                        width: '100%'
                                    }}>
                                        {availableModes.slice(0, 2).map((mode) => {
                                            const isHovered = hoveredMode === mode.id;
                                            const isSelected = selectedMode === mode.id;
                                            return (
                                                <div
                                                    key={mode.id}
                                                    style={{
                                                        display: 'flex',
                                                        overflow: 'visible',
                                                        padding: '16px',
                                                        margin: '-16px',
                                                        boxSizing: 'content-box',
                                                        height: '100%',
                                                        maxHeight: '130px'
                                                    }}
                                                >
                                                    <ModeCard
                                                        mode={mode}
                                                        isHovered={isHovered}
                                                        isSelected={isSelected}
                                                        hoverProgress={hoverProgress}
                                                        onSelect={onSelect}
                                                        isFullWidth={false}
                                                        screenSize={screenSize}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '10px',
                                        width: '100%'
                                    }}>
                                        {availableModes.slice(2, 4).map((mode) => {
                                            const isHovered = hoveredMode === mode.id;
                                            const isSelected = selectedMode === mode.id;
                                            return (
                                                <div
                                                    key={mode.id}
                                                    style={{
                                                        display: 'flex',
                                                        overflow: 'visible',
                                                        padding: '16px',
                                                        margin: '-16px',
                                                        boxSizing: 'content-box',
                                                        height: '100%',
                                                        maxHeight: '130px'
                                                    }}
                                                >
                                                    <ModeCard
                                                        mode={mode}
                                                        isHovered={isHovered}
                                                        isSelected={isSelected}
                                                        hoverProgress={hoverProgress}
                                                        onSelect={onSelect}
                                                        isFullWidth={false}
                                                        screenSize={screenSize}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        width: '100%'
                                    }}>
                                        {availableModes.slice(4).map((mode) => {
                                            const isHovered = hoveredMode === mode.id;
                                            const isSelected = selectedMode === mode.id;
                                            return (
                                                <div
                                                    key={mode.id}
                                                    style={{
                                                        display: 'flex',
                                                        overflow: 'visible',
                                                        padding: '16px',
                                                        margin: '-16px',
                                                        boxSizing: 'content-box',
                                                        width: '50%',
                                                        height: '100%',
                                                        maxHeight: '130px'
                                                    }}
                                                >
                                                    <ModeCard
                                                        mode={mode}
                                                        isHovered={isHovered}
                                                        isSelected={isSelected}
                                                        hoverProgress={hoverProgress}
                                                        onSelect={onSelect}
                                                        isFullWidth={false}
                                                        screenSize={screenSize}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        }
                    })()}
                </div>

                {/* Footer Instruction - Fixed Bottom */}
                <div style={{
                    padding: isMobile ? 'clamp(14px, 2vh, 18px) clamp(18px, 4vw, 22px)' : 'clamp(18px, 2.5vh, 22px) clamp(28px, 3vw, 36px)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderRadius: isMobile ? 'clamp(14px, 2vw, 16px)' : 'clamp(16px, 2vw, 20px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile ? 'clamp(10px, 2vw, 14px)' : 'clamp(14px, 2vw, 18px)',
                    flexShrink: 0,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    marginTop: isMobile ? 'clamp(12px, 2vh, 16px)' : 0
                }}>
                    <span style={{ 
                        fontSize: isMobile ? 'clamp(1.3rem, 4vw, 1.5rem)' : 'clamp(1.5rem, 2.5vw, 1.7rem)',
                        filter: 'drop-shadow(0 0 12px rgba(255, 217, 61, 0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        lineHeight: '1'
                    }}>👆</span>
                    <div style={{
                        fontSize: isMobile ? 'clamp(0.9rem, 2.5vw, 1rem)' : 'clamp(1rem, 1.8vw, 1.1rem)',
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.98)',
                        letterSpacing: 'clamp(0.2px, 0.1vw, 0.4px)',
                        textShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 12px rgba(0,0,0,0.2)'
                    }}>
                        Point and hold to select
                    </div>
                </div>
            </div>
        </div>
    );
};
