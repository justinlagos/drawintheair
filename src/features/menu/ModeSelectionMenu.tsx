/**
 * Mode Selection Menu - Compact, No-Scroll Design
 * 
 * All modes visible on screen at once with:
 * - Proper margins from edges
 * - Compact card sizes
 * - Clean, consistent UI/UX
 * - No scrolling required
 * - Balanced layout
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
        gradient: 'linear-gradient(135deg, #00E5FF20 0%, #00E5FF30 50%, #00E5FF20 100%)',
        accentColor: '#00E5FF',
        category: 'warm-up'
    },
    {
        id: 'free',
        title: 'Free Paint',
        description: 'Create',
        icon: '🎨',
        gradient: 'linear-gradient(135deg, #DE316320 0%, #DE316330 50%, #DE316320 100%)',
        accentColor: '#DE3163',
        category: 'creative'
    },
    {
        id: 'pre-writing',
        title: 'Tracing',
        description: 'Learn',
        icon: '✏️',
        gradient: 'linear-gradient(135deg, #FFD93D20 0%, #FFD93D30 50%, #FFD93D20 100%)',
        accentColor: '#FFD93D',
        category: 'learning'
    },
    {
        id: 'sort-and-place',
        title: 'Sort and Place',
        description: 'Think',
        icon: '🗂️',
        gradient: 'linear-gradient(135deg, #00E5FF20 0%, #00E5FF30 50%, #00E5FF20 100%)',
        accentColor: '#00E5FF',
        category: 'puzzle'
    },
    {
        id: 'word-search',
        title: 'Word Search',
        description: 'Explore',
        icon: '🔍',
        gradient: 'linear-gradient(135deg, #DE316320 0%, #DE316330 50%, #DE316320 100%)',
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
    cardRefs: React.MutableRefObject<Map<GameMode, DOMRect>>;
}

const ModeCard = ({ mode, isHovered, isSelected, hoverProgress, onSelect, cardRefs }: ModeCardProps) => {
    return (
        <div
            id={`mode-card-${mode.id}`}
            onClick={() => onSelect(mode.id)}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                padding: '2px',
                borderRadius: '20px',
                background: mode.gradient,
                cursor: 'pointer',
                transform: `scale(${isSelected ? 0.96 : isHovered ? 1.03 : 1}) translateY(${isHovered ? -8 : 0}px)`,
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: isHovered
                    ? `0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1), 0 0 40px ${mode.accentColor}30`
                    : '0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
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
                padding: '24px 28px',
                borderRadius: '18px',
                background: 'rgba(1, 12, 36, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Top section: Icon and Category */}
                <div>
                    {/* Icon */}
                    <div style={{
                        fontSize: '3.5rem',
                        marginBottom: '12px',
                        filter: isHovered 
                            ? `drop-shadow(0 0 16px ${mode.accentColor}) drop-shadow(0 0 32px ${mode.accentColor}50)` 
                            : 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: isHovered ? 'scale(1.15) rotate(5deg)' : 'scale(1)',
                        lineHeight: '1',
                        display: 'inline-block'
                    }}>
                        {mode.icon}
                    </div>

                    {/* Category badge */}
                    <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${mode.accentColor}20, ${mode.accentColor}10)`,
                        border: `1px solid ${mode.accentColor}25`,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: mode.accentColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {mode.category.replace('-', ' ')}
                    </div>
                </div>

                {/* Bottom section: Title and Description */}
                <div>
                    {/* Title */}
                    <h3 style={{
                        margin: '0 0 8px',
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                        lineHeight: '1.2',
                        letterSpacing: '-0.3px'
                    }}>
                        {mode.title}
                    </h3>

                    {/* Description */}
                    <p style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        color: 'rgba(255,255,255,0.75)',
                        lineHeight: '1.5',
                        fontWeight: 400
                    }}>
                        {mode.description}
                    </p>

                    {/* Hover instruction */}
                    {isHovered && (
                        <div style={{
                            marginTop: '16px',
                            padding: '8px 16px',
                            background: `linear-gradient(135deg, ${mode.accentColor}20, ${mode.accentColor}10)`,
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            color: mode.accentColor,
                            textAlign: 'center',
                            fontWeight: 600,
                            border: `1px solid ${mode.accentColor}25`,
                            animation: 'fadeInUp 0.2s ease-out',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}>
                            <span>👆</span>
                            <span>Hold to select</span>
                        </div>
                    )}
                </div>
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
            padding: '32px',
            boxSizing: 'border-box',
            height: '100vh'
        }}>
            {/* Animated background elements */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: `
                    radial-gradient(circle at 20% 30%, rgba(102, 126, 234, 0.12) 0%, transparent 50%),
                    radial-gradient(circle at 80% 70%, rgba(245, 87, 108, 0.12) 0%, transparent 50%),
                    radial-gradient(circle at 50% 50%, rgba(0, 242, 254, 0.06) 0%, transparent 70%)
                `,
                pointerEvents: 'none',
                zIndex: 0,
                animation: 'backgroundFloat 20s ease-in-out infinite'
            }} />

            {/* Main Container - Centered with proper margins */}
            <div style={{
                width: '100%',
                maxWidth: '1400px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '24px',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Header Section - Compact */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0
                }}>
                    {/* Logo */}
                    <div style={{
                        fontSize: isMobile ? '1.8rem' : '2.2rem',
                        fontWeight: 800,
                        color: '#FFD93D',
                        letterSpacing: '1.5px',
                        textShadow: '0 0 20px rgba(255, 217, 61, 0.3)'
                    }}>
                        DRAW IN THE AIR
                    </div>

                    {/* Subtitle */}
                    <div style={{
                        fontSize: isMobile ? '0.9rem' : '1rem',
                        color: 'rgba(255, 255, 255, 0.65)',
                        fontWeight: 400,
                        textAlign: 'center'
                    }}>
                        Choose your adventure
                    </div>
                </div>

                {/* Mode Cards Grid - 2-2-1 layout, all visible */}
                <div style={{
                    flex: '1 1 auto',
                    display: 'grid',
                    gridTemplateColumns: isMobile 
                        ? '1fr' 
                        : 'repeat(2, 1fr)',
                    gridTemplateRows: isMobile 
                        ? 'repeat(5, minmax(0, 1fr))'
                        : 'repeat(3, minmax(0, 1fr))',
                    gap: '20px',
                    alignItems: 'stretch',
                    minHeight: 0,
                    maxHeight: '100%',
                    overflow: 'hidden'
                }}>
                    {MODES.map((mode, index) => {
                        const isHovered = hoveredMode === mode.id;
                        const isSelected = selectedMode === mode.id;
                        
                        // Last card spans full width on desktop
                        const gridColumn = !isMobile && index === MODES.length - 1 
                            ? '1 / -1' 
                            : 'auto';
                        const gridRow = !isMobile && index === MODES.length - 1 ? '3' : 'auto';

                        return (
                            <div
                                key={mode.id}
                                style={{
                                    gridColumn,
                                    gridRow,
                                    minHeight: 0,
                                    display: 'flex',
                                    maxWidth: !isMobile && index === MODES.length - 1 ? '600px' : 'none',
                                    justifySelf: !isMobile && index === MODES.length - 1 ? 'center' : 'stretch'
                                }}
                            >
                                <ModeCard
                                    mode={mode}
                                    isHovered={isHovered}
                                    isSelected={isSelected}
                                    hoverProgress={hoverProgress}
                                    onSelect={onSelect}
                                    cardRefs={cardRefs}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Footer Instruction - Compact */}
                <div style={{
                    padding: '14px 24px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    flexShrink: 0
                }}>
                    <span style={{ fontSize: '1.3rem' }}>👆</span>
                    <div style={{
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                        Point and hold to select
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes backgroundFloat {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    33% {
                        transform: translate(15px, -15px) scale(1.03);
                    }
                    66% {
                        transform: translate(-15px, 15px) scale(0.97);
                    }
                }
            `}</style>
        </div>
    );
};
