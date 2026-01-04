import { useState, useEffect, useRef } from 'react';
import { type HandLandmarkerResult } from '@mediapipe/tasks-vision';

export type GameMode = 'calibration' | 'free' | 'pre-writing' | 'sort-and-place';

interface ModeOption {
    id: GameMode;
    title: string;
    description: string;
    icon: string;
    gradient: string;
}

const MODES: ModeOption[] = [
    {
        id: 'calibration',
        title: 'Bubble Pop',
        description: 'Warm up by popping bubbles',
        icon: '🫧',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
        id: 'free',
        title: 'Free Paint',
        description: 'Draw anything you imagine',
        icon: '🎨',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
        id: 'pre-writing',
        title: 'Tracing',
        description: 'Follow the lines to learn',
        icon: '✏️',
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
        id: 'sort-and-place',
        title: 'Sort and Place',
        description: 'Grab and sort objects',
        icon: '🗂️',
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    }
];

interface ModeSelectionMenuProps {
    onSelect: (mode: GameMode) => void;
    trackingResults: HandLandmarkerResult | null;
}

export const ModeSelectionMenu = ({ onSelect, trackingResults }: ModeSelectionMenuProps) => {
    const [hoveredMode, setHoveredMode] = useState<GameMode | null>(null);
    const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
    const [hoverProgress, setHoverProgress] = useState(0);
    const hoverStartTime = useRef<number | null>(null);
    const cardRefs = useRef<Map<GameMode, DOMRect>>(new Map());

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
            const progress = Math.min(elapsed / 1500, 1); // 1.5 seconds to select
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
            background: 'rgba(15, 12, 41, 0.7)',
            backdropFilter: 'blur(8px)'
        }}>
            {/* Title */}
            <h1 style={{
                fontSize: '3.5rem',
                marginBottom: '50px',
                background: 'linear-gradient(135deg, #00FFFF, #FF00FF, #FFFF00)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 30px rgba(255,0,255,0.3)',
                animation: 'float 3s ease-in-out infinite'
            }}>
                Choose Your Adventure
            </h1>

            {/* Mode Cards */}
            <div style={{
                display: 'flex',
                gap: '30px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: '900px'
            }}>
                {MODES.map((mode) => {
                    const isHovered = hoveredMode === mode.id;
                    const isSelected = selectedMode === mode.id;

                    return (
                        <div
                            key={mode.id}
                            id={`mode-card-${mode.id}`}
                            onClick={() => onSelect(mode.id)}
                            style={{
                                position: 'relative',
                                width: '240px',
                                padding: '30px',
                                borderRadius: '24px',
                                background: 'rgba(255,255,255,0.08)',
                                backdropFilter: 'blur(20px)',
                                border: `2px solid ${isHovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
                                cursor: 'pointer',
                                transform: `scale(${isSelected ? 0.95 : isHovered ? 1.05 : 1}) translateY(${isHovered ? -10 : 0}px)`,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isHovered
                                    ? `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${mode.gradient.includes('667eea') ? '#667eea44' : mode.gradient.includes('f093fb') ? '#f093fb44' : '#4facfe44'}`
                                    : '0 10px 40px rgba(0,0,0,0.2)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Hover progress ring */}
                            {isHovered && (
                                <svg
                                    style={{
                                        position: 'absolute',
                                        top: -4,
                                        left: -4,
                                        right: -4,
                                        bottom: -4,
                                        width: 'calc(100% + 8px)',
                                        height: 'calc(100% + 8px)',
                                        pointerEvents: 'none'
                                    }}
                                >
                                    <rect
                                        x="2"
                                        y="2"
                                        width="calc(100% - 4px)"
                                        height="calc(100% - 4px)"
                                        rx="26"
                                        ry="26"
                                        fill="none"
                                        stroke="url(#progress-gradient)"
                                        strokeWidth="4"
                                        strokeDasharray={`${hoverProgress * 600} 600`}
                                        style={{ transition: 'stroke-dasharray 0.1s linear' }}
                                    />
                                    <defs>
                                        <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#00FFFF" />
                                            <stop offset="100%" stopColor="#FF00FF" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            )}

                            {/* Gradient overlay */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '4px',
                                background: mode.gradient,
                                opacity: isHovered ? 1 : 0.6,
                                transition: 'opacity 0.3s'
                            }} />

                            {/* Icon */}
                            <div style={{
                                fontSize: '4rem',
                                marginBottom: '16px',
                                filter: isHovered ? 'drop-shadow(0 0 20px white)' : 'none',
                                transition: 'filter 0.3s',
                                transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                            }}>
                                {mode.icon}
                            </div>

                            {/* Title */}
                            <h3 style={{
                                margin: '0 0 8px',
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                color: 'white'
                            }}>
                                {mode.title}
                            </h3>

                            {/* Description */}
                            <p style={{
                                margin: 0,
                                fontSize: '0.95rem',
                                color: 'rgba(255,255,255,0.7)'
                            }}>
                                {mode.description}
                            </p>

                            {/* Hover instruction */}
                            {isHovered && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '8px 16px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '20px',
                                    fontSize: '0.85rem',
                                    color: '#00FFFF'
                                }}>
                                    Hold to select...
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Instruction */}
            <p style={{
                marginTop: '50px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1.1rem'
            }}>
                👆 Point at a card and hold to select
            </p>
        </div>
    );
};

