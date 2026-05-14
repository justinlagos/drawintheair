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

export type GameMode = 'calibration' | 'free' | 'pre-writing' | 'sort-and-place' | 'word-search' | 'colour-builder' | 'balloon-math' | 'rainbow-bridge' | 'gesture-spelling';

interface ModeOption {
    id: GameMode;
    title: string;
    subtitle: string;
    icon: string;
    accentColor: string;
    accentGlow: string;
    category: string;
}

/**
 * Mode order is BEHAVIOURAL, not alphabetical.
 *
 * Tier 1 (top row . activation modes . highest first-session engagement):
 *   1. Free Paint . the "they just played this" anchor + creative.
 *   2. Bubble Pop . quickest win, biggest smile, lowest learning curve.
 *   3. Tracing . the curriculum gateway.
 *   4. Spelling Stars . the literacy hook for parents.
 *
 * Tier 2 (next-step modes . need more dexterity / dwell control):
 *   5. Sort & Place
 *   6. Word Search
 *   7. Balloon Math
 *   8. Rainbow Bridge
 *
 * Source: dashboard mode_started + mode_completed counts over the
 * last 90 days. Phase 2 of the activation refactor.
 */
const MODES: ModeOption[] = [
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
        id: 'calibration',
        title: 'Bubble Pop',
        subtitle: 'Warm up your hands',
        icon: '🫧',
        accentColor: '#FF8C42',
        accentGlow: 'rgba(255, 140, 66, 0.35)',
        category: 'Warm-up'
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
        id: 'gesture-spelling',
        title: 'Spelling Stars',
        subtitle: 'Spell the word!',
        icon: '✍️',
        accentColor: '#A855F7',
        accentGlow: 'rgba(168, 85, 247, 0.35)',
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
    },
    {
        id: 'balloon-math',
        title: 'Balloon Math',
        subtitle: 'Pop the right number!',
        icon: '🎈',
        accentColor: '#FF6B6B',
        accentGlow: 'rgba(255, 107, 107, 0.35)',
        category: 'Learning'
    },
    {
        id: 'rainbow-bridge',
        title: 'Rainbow Bridge',
        subtitle: 'Match the colours',
        icon: '🌈',
        accentColor: '#00BCD4',
        accentGlow: 'rgba(0, 188, 212, 0.35)',
        category: 'Learning'
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
                        #FFFFFF 0%,
                        #FBFCFF 60%,
                        #F4FAFF 100%
                    )
                `,
                boxShadow: isSelected
                    ? `inset 0 2px 6px rgba(108,63,164,0.18), 0 2px 4px rgba(108,63,164,0.10)`
                    : isHovered
                        ? `0 12px 30px ${mode.accentGlow}, 0 4px 8px rgba(108,63,164,0.10)`
                        : `0 6px 18px rgba(108,63,164,0.14), 0 1px 2px rgba(108,63,164,0.06)`,
                outline: isHovered
                    ? `3px solid ${mode.accentColor}`
                    : `2px solid rgba(108, 63, 164, 0.18)`,
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
                        fontFamily: "'Fredoka', 'Baloo 2', system-ui, sans-serif",
                        fontSize: compact ? '1.05rem' : featured ? '1.5rem' : '1.15rem',
                        fontWeight: 800,
                        color: '#3F4052',
                        lineHeight: 1.2,
                        letterSpacing: '-0.02em',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                    }}>
                        {mode.title}
                    </div>
                    <div style={{
                        fontFamily: "'Nunito', 'Quicksand', system-ui, sans-serif",
                        fontSize: compact ? '0.82rem' : featured ? '0.98rem' : '0.85rem',
                        fontWeight: 600,
                        color: '#6B6E80',
                        marginTop: '4px',
                        lineHeight: 1.3,
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
    const getScreenInfo = useCallback(() => {
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
    }, []);
    const [screenInfo, setScreenInfo] = useState(getScreenInfo);

    useEffect(() => {
        const handleResize = () => setScreenInfo(getScreenInfo());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [getScreenInfo]);

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
    // This effect synchronizes external hand-tracking data (MediaPipe results)
    // into React state — the legitimate "subscribe to external system" pattern
    // for useEffect. The set-state calls are guarded by hover transitions so
    // they only fire on changes, not every frame.
    /* eslint-disable react-hooks/set-state-in-effect */
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
    /* eslint-enable react-hooks/set-state-in-effect */

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
            {/* Bright Kid-UI menu background — sky + soft sun glow */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0,
                background: 'linear-gradient(180deg, #9FDFFF 0%, #BEEBFF 30%, #DEF5FF 65%, #FFF6E5 100%)',
            }} />
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0,
                background: 'radial-gradient(circle 700px at 78% 18%, rgba(255, 216, 77, 0.40) 0%, rgba(255, 216, 77, 0.18) 35%, transparent 70%)',
            }} />
            {/* Soft cloud silhouettes + meadow at bottom */}
            <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
                 style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
                <g opacity="0.85">
                    <ellipse cx="220" cy="160" rx="85" ry="24" fill="#FFFFFF" />
                    <ellipse cx="780" cy="120" rx="100" ry="28" fill="#FFFFFF" />
                    <ellipse cx="1180" cy="200" rx="80" ry="22" fill="#FFFFFF" />
                </g>
                <path d="M0,720 Q300,680 720,710 T1440,700 L1440,900 L0,900 Z" fill="#A6E89A" />
                <path d="M0,800 Q300,760 720,790 T1440,780 L1440,900 L0,900 Z" fill="#7ED957" />
            </svg>

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
                {/* Back to Home — Kid-UI secondary pill */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="kid-panel"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            background: '#FFFFFF',
                            border: '2.5px solid #6C3FA4',
                            borderRadius: '9999px',
                            padding: '10px 22px',
                            minHeight: '44px',
                            color: '#6C3FA4',
                            fontFamily: "'Fredoka', 'Baloo 2', system-ui, sans-serif",
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            zIndex: 10,
                            boxShadow: '0 4px 16px rgba(108, 63, 164, 0.12), 0 1px 2px rgba(108, 63, 164, 0.08)',
                            touchAction: 'manipulation',
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
                        marginTop: '12px',
                        fontFamily: "'Fredoka', 'Baloo 2', system-ui, sans-serif",
                        fontSize: isPhone ? '1.1rem' : '1.4rem',
                        color: '#3F4052',
                        fontWeight: 700,
                        letterSpacing: '-0.3px',
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

                {/* Footer instruction — Kid-UI cream pill */}
                <div className="kid-panel" style={{
                    padding: isPhone ? '12px 22px' : '14px 28px',
                    background: '#FFFFFF',
                    borderRadius: '9999px',
                    border: '2px solid rgba(108, 63, 164, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    alignSelf: 'center',
                    marginTop: isMobilePortrait ? '8px' : '12px',
                    boxShadow: '0 4px 16px rgba(108, 63, 164, 0.12), 0 1px 2px rgba(108, 63, 164, 0.08)',
                }}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>👆</span>
                    <span style={{
                        fontFamily: "'Fredoka', 'Baloo 2', system-ui, sans-serif",
                        fontSize: isPhone ? '0.9rem' : '1rem',
                        fontWeight: 700,
                        color: '#3F4052',
                    }}>
                        {isPhone ? 'Tap to play' : 'Point and hold to select'}
                    </span>
                </div>
            </div>
        </div>
    );
};
