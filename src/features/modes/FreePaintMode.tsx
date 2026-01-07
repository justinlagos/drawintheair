/**
 * Free Paint Mode - PRIORITY B
 * 
 * Premium casual-game styling:
 * - Soft depth, gentle glow, rounded shapes
 * - Clean layout with minimal clutter
 * - Large, clear controls
 * - First-time hint "Pinch to draw" (auto-fades)
 * - Brush preview bottom centre, bigger and clearer
 * - Fully responsive across all screen sizes
 */

import { useState, useEffect } from 'react';
import { drawingEngine } from '../../core/drawingEngine';
import type { TrackingFrameData } from '../tracking/TrackingLayer';

// Responsive breakpoint hook
const useResponsiveLayout = () => {
    const [layout, setLayout] = useState(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isLandscape = w > h;
        return {
            isMobile: w <= 480,
            isTabletSmall: w > 480 && w <= 768,
            isTablet: w > 768 && w <= 1024,
            isDesktop: w > 1024,
            isLandscapePhone: isLandscape && h <= 500,
            screenWidth: w,
            screenHeight: h
        };
    });

    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const isLandscape = w > h;
            setLayout({
                isMobile: w <= 480,
                isTabletSmall: w > 480 && w <= 768,
                isTablet: w > 768 && w <= 1024,
                isDesktop: w > 1024,
                isLandscapePhone: isLandscape && h <= 500,
                screenWidth: w,
                screenHeight: h
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return layout;
};

const COLORS = [
    { value: '#ff006e', name: 'Hot Pink' },
    { value: '#3a86ff', name: 'Electric Blue' },
    { value: '#8338ec', name: 'Purple' },
    { value: '#ffbe0b', name: 'Sunshine' },
    { value: '#00f5d4', name: 'Teal' },
    { value: '#ff5400', name: 'Orange' },
    { value: '#ffffff', name: 'White' },
];

const BRUSH_SIZES = [
    { label: 'S', size: 4, displaySize: 8 },
    { label: 'M', size: 8, displaySize: 14 },
    { label: 'L', size: 16, displaySize: 22 },
    { label: 'XL', size: 32, displaySize: 32 },
];

interface FloatingToolProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
    compact?: boolean;
}

const FloatingTool = ({ children, style = {}, compact = false }: FloatingToolProps) => (
    <div
        style={{
            background: 'rgba(15, 12, 41, 0.75)',
            backdropFilter: 'blur(20px)',
            borderRadius: compact ? '14px' : '20px',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            padding: compact ? '8px' : '16px',
            ...style
        }}
    >
        {children}
    </div>
);

interface FreePaintModeProps {
    frameData?: TrackingFrameData;
}

export const FreePaintMode = ({ frameData }: FreePaintModeProps) => {
    const [activeColor, setActiveColor] = useState(COLORS[0].value);
    const [activeSize, setActiveSize] = useState(BRUSH_SIZES[1].size);
    const [showHint, setShowHint] = useState(true);
    const [hintOpacity, setHintOpacity] = useState(1);
    const layout = useResponsiveLayout();
    
    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;

    // Auto-fade hint after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setHintOpacity(0);
            setTimeout(() => setShowHint(false), 500);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleColorChange = (color: string) => {
        setActiveColor(color);
        drawingEngine.setColor(color);
    };

    const handleSizeChange = (size: number) => {
        setActiveSize(size);
        drawingEngine.setWidth(size);
    };

    const handleClear = () => {
        drawingEngine.clear();
    };

    const penDown = frameData?.penDown ?? false;

    // Responsive sizing
    const colorButtonSize = isCompact ? '36px' : '48px';
    const brushButtonSize = isCompact ? '40px' : '52px';
    const toolGap = isCompact ? '8px' : '12px';
    const panelPadding = isCompact ? '10px' : '16px';
    const hudSpacing = isCompact ? '12px' : '24px';

    return (
        <>
            {/* Top Left - Mode indicator */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: hudSpacing,
                zIndex: 15
            }}>
                <FloatingTool style={{ padding: isCompact ? '10px 14px' : '14px 20px' }} compact={isCompact}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCompact ? '8px' : '12px'
                    }}>
                        <span style={{ fontSize: isCompact ? '1.2rem' : '1.5rem' }}>🎨</span>
                        <span style={{
                            fontSize: isCompact ? '0.9rem' : '1.1rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Free Paint
                        </span>
                    </div>
                </FloatingTool>
            </div>

            {/* Color Palette - Left side on desktop, bottom-left on mobile */}
            <div style={{
                position: 'absolute',
                left: hudSpacing,
                ...(isCompact ? {
                    bottom: isLandscapePhone ? hudSpacing : '100px',
                    top: 'auto',
                    transform: 'none'
                } : {
                    top: '50%',
                    transform: 'translateY(-50%)'
                }),
                zIndex: 20,
                pointerEvents: 'auto'
            }}>
                <FloatingTool style={{ padding: panelPadding }} compact={isCompact}>
                    <div style={{
                        display: 'flex',
                        flexDirection: isCompact ? 'row' : 'column',
                        flexWrap: isCompact ? 'wrap' : 'nowrap',
                        gap: toolGap,
                        alignItems: 'center',
                        maxWidth: isCompact ? '180px' : 'none'
                    }}>
                        {COLORS.map(color => (
                            <button
                                key={color.value}
                                onClick={() => handleColorChange(color.value)}
                                title={color.name}
                                style={{
                                    width: colorButtonSize,
                                    height: colorButtonSize,
                                    minWidth: '44px',
                                    minHeight: '44px',
                                    borderRadius: '50%',
                                    background: color.value === '#ffffff'
                                        ? 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)'
                                        : color.value,
                                    border: activeColor === color.value
                                        ? (isCompact ? '3px solid white' : '4px solid white')
                                        : '2px solid rgba(255,255,255,0.3)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.2s ease',
                                    transform: activeColor === color.value ? 'scale(1.15)' : 'scale(1)',
                                    boxShadow: activeColor === color.value
                                        ? `0 0 20px ${color.value}, 0 0 40px ${color.value}88, inset 0 2px 4px rgba(255,255,255,0.3)`
                                        : `0 4px 12px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)`
                                }}
                            />
                        ))}
                    </div>
                </FloatingTool>
            </div>

            {/* Brush Sizes - Right side on desktop, bottom-right on mobile */}
            <div style={{
                position: 'absolute',
                right: hudSpacing,
                ...(isCompact ? {
                    bottom: isLandscapePhone ? hudSpacing : '100px',
                    top: 'auto',
                    transform: 'none'
                } : {
                    top: '50%',
                    transform: 'translateY(-50%)'
                }),
                zIndex: 20,
                pointerEvents: 'auto'
            }}>
                <FloatingTool style={{ padding: panelPadding }} compact={isCompact}>
                    <div style={{
                        display: 'flex',
                        flexDirection: isCompact ? 'row' : 'column',
                        gap: toolGap,
                        alignItems: 'center'
                    }}>
                        {BRUSH_SIZES.map(brush => (
                            <button
                                key={brush.label}
                                onClick={() => handleSizeChange(brush.size)}
                                style={{
                                    width: brushButtonSize,
                                    height: brushButtonSize,
                                    minWidth: '44px',
                                    minHeight: '44px',
                                    borderRadius: '50%',
                                    background: activeSize === brush.size
                                        ? 'rgba(255,255,255,0.25)'
                                        : 'rgba(255,255,255,0.08)',
                                    border: activeSize === brush.size
                                        ? '3px solid rgba(255,255,255,0.7)'
                                        : '2px solid rgba(255,255,255,0.2)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    transform: activeSize === brush.size ? 'scale(1.1)' : 'scale(1)',
                                    boxShadow: activeSize === brush.size
                                        ? '0 0 20px rgba(255,255,255,0.4), inset 0 2px 4px rgba(255,255,255,0.2)'
                                        : '0 4px 12px rgba(0,0,0,0.3)',
                                    padding: 0
                                }}
                            >
                                <div style={{
                                    width: `${isCompact ? Math.max(brush.displaySize * 0.7, 6) : brush.displaySize}px`,
                                    height: `${isCompact ? Math.max(brush.displaySize * 0.7, 6) : brush.displaySize}px`,
                                    borderRadius: '50%',
                                    background: activeColor,
                                    boxShadow: activeSize === brush.size
                                        ? `0 0 15px ${activeColor}`
                                        : 'none'
                                }} />
                            </button>
                        ))}
                    </div>
                </FloatingTool>
            </div>

            {/* Bottom Center - Brush Preview + Clear (responsive) */}
            <div style={{
                position: 'absolute',
                bottom: isCompact ? hudSpacing : '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                pointerEvents: 'auto',
                maxWidth: isCompact ? 'calc(100% - 200px)' : 'none'
            }}>
                <FloatingTool style={{ padding: isCompact ? '10px 16px' : '18px 28px' }} compact={isCompact}>
                    <div style={{
                        display: 'flex',
                        gap: isCompact ? '12px' : '20px',
                        alignItems: 'center',
                        flexWrap: 'nowrap'
                    }}>
                        {/* Brush preview - hidden on very small screens */}
                        {!isLandscapePhone && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: isCompact ? '4px' : '8px',
                                padding: isCompact ? '8px 12px' : '12px 20px',
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: isCompact ? '12px' : '16px',
                                border: '1px solid rgba(255,255,255,0.15)'
                            }}>
                                <span style={{ 
                                    color: 'rgba(255,255,255,0.7)', 
                                    fontSize: isCompact ? '0.7rem' : '0.85rem',
                                    fontWeight: 500
                                }}>
                                    Brush
                                </span>
                                <div style={{
                                    width: `${Math.min(activeSize * (isCompact ? 1 : 1.5), isCompact ? 32 : 48)}px`,
                                    height: `${Math.min(activeSize * (isCompact ? 1 : 1.5), isCompact ? 32 : 48)}px`,
                                    borderRadius: '50%',
                                    background: activeColor,
                                    boxShadow: `0 0 25px ${activeColor}88, 0 0 50px ${activeColor}44`,
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    transition: 'all 0.3s ease',
                                    transform: penDown ? 'scale(1.1)' : 'scale(1)'
                                }} />
                            </div>
                        )}

                        {/* Divider - hidden on compact */}
                        {!isCompact && (
                            <div style={{
                                width: '1px',
                                height: '40px',
                                background: 'rgba(255,255,255,0.2)'
                            }} />
                        )}

                        {/* Clear button - responsive */}
                        <button
                            onClick={handleClear}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: isCompact ? '6px' : '10px',
                                padding: isCompact ? '10px 16px' : '14px 24px',
                                background: 'linear-gradient(180deg, rgba(255, 59, 48, 0.25) 0%, rgba(255, 59, 48, 0.15) 100%)',
                                border: '2px solid rgba(255, 59, 48, 0.4)',
                                borderRadius: isCompact ? '16px' : '24px',
                                color: '#ff6b6b',
                                cursor: 'pointer',
                                fontSize: isCompact ? '0.85rem' : '1rem',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                                minWidth: '44px',
                                minHeight: '44px'
                            }}
                            onMouseDown={(e) => {
                                e.currentTarget.style.transform = 'scale(0.95)';
                            }}
                            onMouseUp={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <span style={{ fontSize: isCompact ? '1rem' : '1.2rem' }}>🗑️</span>
                            {!isLandscapePhone && 'Clear'}
                        </button>
                    </div>
                </FloatingTool>
            </div>

            {/* First-time hint - "Pinch to draw" (auto-fades) - responsive */}
            {showHint && (
                <div style={{
                    position: 'absolute',
                    bottom: isCompact ? (isLandscapePhone ? '60px' : '160px') : '140px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 15,
                    pointerEvents: 'none',
                    opacity: hintOpacity,
                    transition: 'opacity 0.5s ease',
                    maxWidth: isCompact ? 'calc(100% - 48px)' : 'none'
                }}>
                    <div style={{
                        background: 'rgba(0, 245, 212, 0.2)',
                        border: '2px solid rgba(0, 245, 212, 0.4)',
                        borderRadius: isCompact ? '14px' : '20px',
                        padding: isCompact ? '10px 16px' : '16px 28px',
                        color: '#00f5d4',
                        fontSize: isCompact ? '0.9rem' : '1.2rem',
                        fontWeight: 600,
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 32px rgba(0, 245, 212, 0.3)',
                        animation: 'float 3s ease-in-out infinite',
                        textAlign: 'center',
                        whiteSpace: isCompact ? 'normal' : 'nowrap'
                    }}>
                        👆 {isCompact ? 'Pinch to draw' : 'Pinch to draw, open hand to pause'}
                    </div>
                </div>
            )}

            {/* CSS animation */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateX(-50%) translateY(0px); }
                    50% { transform: translateX(-50%) translateY(-10px); }
                }
            `}</style>
        </>
    );
};
