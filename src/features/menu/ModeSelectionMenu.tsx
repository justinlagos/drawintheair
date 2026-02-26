/**
 * Mode Selection Menu — Clean Grid Layout
 *
 * Strategy:
 * - Desktop/TV: 2-row layout with featured tile (top, wide) + 4 smaller tiles (bottom row)
 * - Tablet: 2×2 grid + 1 featured top tile
 * - Mobile portrait: Vertical scrollable list with large tap targets
 * - Mobile landscape: Compact horizontal grid
 *
 * No 3D carousel. No perspective transforms. Clean, immediate, obvious.
 * Every tile is always visible. Tap or dwell to select.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { type HandLandmarkerResult } from '@mediapipe/tasks-vision';

export type GameMode = 'calibration' | 'free' | 'pre-writing' | 'sort-and-place' | 'word-search';

interface ModeOption {
    id: GameMode;
    title: string;
    subtitle: string;
    icon: string;
    accentColor: string;
    accentGlow: string;
    category: string;
}

const MODES: ModeOption[] = [
    {
        id: 'calibration',
        title: 'Bubble Pop',
        subtitle: 'Warm up your hands',
        icon: '🫧',
        accentColor: '#FF8C42',
        accentGlow: 'rgba(255, 140, 66, 0.35)',
        category: 'Warm-up'
    },
    {
        id: 'free',
        title: 'Free Paint',
        subtitle: 'Create anything',
        icon: '🎨',
        accentColor: '#9B59B6',
        accentGlow: 'rgba(155, 89, 182, 0.35)',
        category: 'Creative'
    },
    {
        id: 'pre-writing',
        title: 'Tracing',
        subtitle: 'Follow the path',
        icon: '✏️',
        accentColor: '#2ECC71',
        accentGlow: 'rgba(46, 204, 113, 0.35)',
        category: 'Learning'
    },
    {
        id: 'sort-and-place',
        title: 'Sort & Place',
        subtitle: 'Think and sort',
        icon: '🗂️',
        accentColor: '#3498DB',
        accentGlow: 'rgba(52, 152, 219, 0.35)',
        category: 'Puzzle'
    },
    {
        id: 'word-search',
        title: 'Word Search',
        subtitle: 'Find the words',
        icon: '🔍',
        accentColor: '#F1C40F',
        accentGlow: 'rgba(241, 196, 15, 0.35)',
        category: 'Puzzle'
    }
];

interface ModeSelectionMenuProps {
    onSelect: (mode: GameMode) => void;
    onBack?: () => void;
    trackingResults: HandLandmarkerResult | null;
}

/* ═══════════════════════════════════════════════════
   GAME CARD — Single tile with toy-plastic material
   ═══════════════════════════════════════════════════ */

interface GameCardProps {
    mode: ModeOption;
    featured?: boolean;
    isHovered: boolean;
    isSelected: boolean;
    hoverProgress: number;
    onClick: () => void;
    compact?: boolean;
}

const GameCard = ({ mode, featured, isHovered, isSelected, hoverProgress, onClick, compact }: GameCardProps) => {
    const [pressed, setPressed] = useState(false);

    return (
        <button
            id={`mode-card-${mode.id}`}
            className="mode-card"
            onClick={onClick}
            onPointerDown={() => setPressed(true)}
            onPointerUp={() => setPressed(false)}
            onPointerLeave={() => setPressed(false)}
            style={{
                /* Reset button */
                appearance: 'none',
                border: 'none',
                padding: 0,
                fontFamily: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '24px',
                overflow: 'hidden',
                background: `
                    linear-gradient(
                        165deg,
                        rgba(255,255,255,0.14) 0%,
                        rgba(255,255,255,0.06) 40%,
                        rgba(0,0,0,0.15) 100%
                    )
                `,
                boxShadow: isSelected
                    ? `inset 0 2px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)`
                    : isHovered
                    ? `0 8px 32px ${mode.accentGlow}, 0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)`
                    : `0 6px 20px rgba(0,0,0,0.35), 0 12px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)`,
                outline: isHovered
                    ? `2.5px solid ${mode.accentColor}88`
                    : '2px solid rgba(255,255,255,0.12)',
                outlineOffset: '-2px',
                transform: pressed || isSelected
                    ? 'scale(0.97)'
                    : isHovered
                    ? 'scale(1.03) translateY(-4px)'
                    : 'scale(1)',
                transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease, outline 150ms ease',
                isolation: 'isolate',
            }}
        >
            {/* Specular highlight — plastic sheen */}
            <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                pointerEvents: 'none',
                zIndex: 1,
                background: `radial-gradient(ellipse 120% 80% at 25% 0%, rgba(255,255,255,${isHovered ? 0.28 : 0.18}), transparent 55%)`,
                opacity: pressed ? 0.6 : 1,
                transition: 'opacity 100ms ease',
            }} />

            {/* Dwell progress bar at bottom */}
            {isHovered && hoverProgress > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '4px',
                    width: `${hoverProgress * 100}%`,
                    background: `linear-gradient(90deg, ${mode.accentColor}, ${mode.accentColor}cc)`,
                    borderRadius: '0 2px 0 0',
                    zIndex: 5,
                    transition: 'width 80ms linear',
                    boxShadow: `0 0 12px ${mode.accentColor}80`,
                }} />
            )}

            {/* Content layout */}
            <div style={{
                position: 'relative',
                zIndex: 2,
                height: '100%',
                padding: compact ? '14px 16px' : featured ? '24px 28px' : '20px 22px',
                display: 'flex',
                flexDirection: featured && !compact ? 'row' : compact ? 'row' : 'column',
                alignItems: 'center',
                justifyContent: featured && !compact ? 'center' : compact ? 'flex-start' : 'center',
                gap: compact ? '14px' : featured ? '24px' : '12px',
                boxSizing: 'border-box',
            }}>
                {/* Icon with glow */}
                <div style={{
                    position: 'relative',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {/* Glow behind icon */}
                    <div style={{
                        position: 'absolute',
                        width: compact ? '48px' : featured ? '80px' : '64px',
                        height: compact ? '48px' : featured ? '80px' : '64px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${mode.accentGlow} 0%, transparent 70%)`,
                        opacity: isHovered ? 1 : 0.6,
                        transition: 'opacity 200ms ease',
                    }} />
                    <span style={{
                        position: 'relative',
                        fontSize: compact ? '2rem' : featured ? '3.5rem' : '2.8rem',
                        lineHeight: 1,
                        filter: isHovered
                            ? `drop-shadow(0 4px 12px rgba(0,0,0,0.5)) drop-shadow(0 0 20px ${mode.accentGlow})`
                            : 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))',
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 200ms ease',
                    }}>
                        {mode.icon}
                    </span>
                </div>

                {/* Text */}
                <div style={{
                    textAlign: compact ? 'left' : featured ? 'left' : 'center',
                    minWidth: 0,
                }}>
                    <div style={{
                        fontSize: compact ? '1.05rem' : featured ? '1.5rem' : '1.15rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        lineHeight: 1.2,
                        letterSpacing: '0.02em',
                        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                    }}>
                        {mode.title}
                    </div>
                    <div style={{
                        fontSize: compact ? '0.8rem' : featured ? '0.95rem' : '0.8rem',
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.6)',
                        marginTop: '3px',
                        lineHeight: 1.3,
                        textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}>
                        {mode.subtitle}
                    </div>
                </div>

                {/* Category badge — featured only, desktop */}
                {featured && !compact && (
                    <div style={{
                        marginLeft: 'auto',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        background: `${mode.accentColor}22`,
                        border: `1px solid ${mode.accentColor}44`,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: mode.accentColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}>
                        {mode.category}
                    </div>
                )}
            </div>
        </button>
    );
};


/* ═══════════════════════════════════════════════════
   MAIN MENU COMPONENT
   ═══════════════════════════════════════════════════ */

export const ModeSelectionMenu = ({ onSelect, onBack, trackingResults }: ModeSelectionMenuProps) => {
    const [hoveredMode, setHoveredMode] = useState<GameMode | null>(null);
    const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
    const [hoverProgress, setHoverProgress] = useState(0);
    const hoverStartTime = useRef<number | null>(null);
    const cardRefs = useRef<Map<GameMode, DOMRect>>(new Map());
    const [screenInfo, setScreenInfo] = useState(() => getScreenInfo());

    function getScreenInfo() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
            isPhone: w <= 520,
            isTablet: w > 520 && w <= 1024,
            isDesktop: w > 1024,
            isLandscape: w > h,
            width: w,
            height: h,
        };
    }

    useEffect(() => {
        const handleResize = () => setScreenInfo(getScreenInfo());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { isPhone, isTablet, isDesktop, isLandscape } = screenInfo;
    const isMobilePortrait = isPhone && !isLandscape;
    const isMobileLandscape = isPhone && isLandscape;

    // Update card hit areas for hand tracking
    useEffect(() => {
        const updateRefs = () => {
            MODES.forEach(mode => {
                const el = document.getElementById(`mode-card-${mode.id}`);
                if (el) cardRefs.current.set(mode.id, el.getBoundingClientRect());
            });
        };
        updateRefs();
        const interval = setInterval(updateRefs, 1000);
        return () => clearInterval(interval);
    }, []);

    // Hand tracking: dwell-to-select (1.5s hover)
    useEffect(() => {
        if (!trackingResults?.landmarks?.length) {
            if (hoverStartTime.current) {
                hoverStartTime.current = null;
                setHoverProgress(0);
                setHoveredMode(null);
            }
            return;
        }

        const tip = trackingResults.landmarks[0][8]; // index fingertip
        const fx = tip.x * window.innerWidth;
        const fy = tip.y * window.innerHeight;

        let found: GameMode | null = null;
        cardRefs.current.forEach((rect, modeId) => {
            if (fx >= rect.left && fx <= rect.right && fy >= rect.top && fy <= rect.bottom) {
                found = modeId;
            }
        });

        if (found !== hoveredMode) {
            setHoveredMode(found);
            hoverStartTime.current = found ? Date.now() : null;
            setHoverProgress(0);
        }

        if (found && hoverStartTime.current) {
            const elapsed = Date.now() - hoverStartTime.current;
            const progress = Math.min(elapsed / 1500, 1);
            setHoverProgress(progress);
            if (progress >= 1 && !selectedMode) {
                setSelectedMode(found);
                setTimeout(() => onSelect(found!), 250);
            }
        }
    }, [trackingResults, hoveredMode, selectedMode, onSelect]);

    const handleSelect = useCallback((mode: ModeOption) => {
        if (selectedMode) return;
        setSelectedMode(mode.id);
        setTimeout(() => onSelect(mode.id), 200);
    }, [selectedMode, onSelect]);

    // Featured mode = first (Bubble Pop, the warm-up)
    const featured = MODES[0];
    const rest = MODES.slice(1);

    // Safe margin
    const margin = isPhone ? 18 : isTablet ? 28 : 40;

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            overflow: isMobilePortrait ? 'auto' : 'hidden',
            padding: margin,
            boxSizing: 'border-box',
            minHeight: '100vh',
        }}>
            {/* World background */}
            <div className="world-bg" />
            <div className="play-stage-light" />

            {/* Ambient vignette */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'radial-gradient(ellipse at center, transparent 30%, rgba(7,12,24,0.6) 100%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            {/* Content */}
            <div style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: isDesktop ? '960px' : '720px',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobilePortrait ? '12px' : isPhone ? '14px' : '20px',
            }}>
                {/* Back to Home button */}
                {onBack && (
                    <button
                        onClick={onBack}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '12px',
                            padding: '8px 16px',
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            zIndex: 10,
                        }}
                    >
                        ← Back
                    </button>
                )}

                {/* Header */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: isMobilePortrait ? '4px' : isPhone ? '4px' : '8px',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}>
                    <img 
                        src="/logo.png" 
                        alt="Draw in the Air"
                        style={{
                            height: isPhone ? '40px' : '60px',
                            width: 'auto',
                            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))'
                        }}
                    />
                    <p style={{
                        margin: 0,
                        marginTop: '8px',
                        fontSize: isPhone ? '0.9rem' : '1.05rem',
                        color: 'rgba(255,255,255,0.65)',
                        fontWeight: 500,
                        textShadow: '0 1px 6px rgba(0,0,0,0.3)',
                    }}>
                        Choose your adventure
                    </p>
                </div>

                {/* ═══ LAYOUT ═══ */}

                {isMobilePortrait ? (
                    /* MOBILE PORTRAIT — simple vertical list */
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                    }}>
                        {MODES.map(mode => (
                            <div key={mode.id} style={{ height: '76px' }}>
                                <GameCard
                                    mode={mode}
                                    compact
                                    isHovered={hoveredMode === mode.id}
                                    isSelected={selectedMode === mode.id}
                                    hoverProgress={hoveredMode === mode.id ? hoverProgress : 0}
                                    onClick={() => handleSelect(mode)}
                                />
                            </div>
                        ))}
                    </div>
                ) : isMobileLandscape ? (
                    /* MOBILE LANDSCAPE — compact 2+3 rows */
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '10px',
                    }}>
                        {MODES.map(mode => (
                            <div key={mode.id} style={{ height: '80px' }}>
                                <GameCard
                                    mode={mode}
                                    compact
                                    isHovered={hoveredMode === mode.id}
                                    isSelected={selectedMode === mode.id}
                                    hoverProgress={hoveredMode === mode.id ? hoverProgress : 0}
                                    onClick={() => handleSelect(mode)}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    /* TABLET + DESKTOP — Featured top card + 2×2 grid below */
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isTablet ? '14px' : '18px',
                    }}>
                        {/* Featured card — full width, taller */}
                        <div style={{ height: isTablet ? '130px' : '150px' }}>
                            <GameCard
                                mode={featured}
                                featured
                                isHovered={hoveredMode === featured.id}
                                isSelected={selectedMode === featured.id}
                                hoverProgress={hoveredMode === featured.id ? hoverProgress : 0}
                                onClick={() => handleSelect(featured)}
                            />
                        </div>

                        {/* 2×2 grid of remaining modes */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: isTablet ? '12px' : '16px',
                        }}>
                            {rest.map(mode => (
                                <div key={mode.id} style={{ height: isTablet ? '150px' : '180px' }}>
                                    <GameCard
                                        mode={mode}
                                        isHovered={hoveredMode === mode.id}
                                        isSelected={selectedMode === mode.id}
                                        hoverProgress={hoveredMode === mode.id ? hoverProgress : 0}
                                        onClick={() => handleSelect(mode)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer instruction pill */}
                <div style={{
                    padding: isPhone ? '10px 18px' : '12px 24px',
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                    borderRadius: '999px',
                    border: '1.5px solid rgba(255,255,255,0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    alignSelf: 'center',
                    marginTop: isMobilePortrait ? '4px' : '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}>
                    <span style={{
                        fontSize: '1.1rem',
                        lineHeight: 1,
                        filter: 'drop-shadow(0 0 6px rgba(255,217,61,0.4))',
                    }}>👆</span>
                    <span style={{
                        fontSize: isPhone ? '0.82rem' : '0.9rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.75)',
                        letterSpacing: '0.2px',
                    }}>
                        {isPhone ? 'Tap to play' : 'Point and hold to select'}
                    </span>
                </div>
            </div>
        </div>
    );
};
