/**
 * Free Paint Mode - PRIORITY B
 * 
 * Premium casual-game styling:
 * - Soft depth, gentle glow, rounded shapes
 * - Clean layout with minimal clutter
 * - Large, clear controls
 * - First-time hint "Pinch to draw" (auto-fades)
 * - Brush preview bottom centre, bigger and clearer
 */

import { useState, useEffect } from 'react';
import { drawingEngine } from '../../core/drawingEngine';
import type { TrackingFrameData } from '../tracking/TrackingLayer';

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
}

const FloatingTool = ({ children, style = {} }: FloatingToolProps) => (
    <div
        style={{
            background: 'rgba(15, 12, 41, 0.75)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            padding: '16px',
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

    return (
        <>
            {/* Top Left - Mode indicator */}
            <div style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                zIndex: 15
            }}>
                <FloatingTool style={{ padding: '14px 20px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>🎨</span>
                        <span style={{
                            fontSize: '1.1rem',
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

            {/* Left Side - Color Palette (simplified) */}
            <div style={{
                position: 'absolute',
                left: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 20,
                pointerEvents: 'auto'
            }}>
                <FloatingTool>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        alignItems: 'center'
                    }}>
                        {COLORS.map(color => (
                            <button
                                key={color.value}
                                onClick={() => handleColorChange(color.value)}
                                title={color.name}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: color.value === '#ffffff'
                                        ? 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)'
                                        : color.value,
                                    border: activeColor === color.value
                                        ? '4px solid white'
                                        : '2px solid rgba(255,255,255,0.3)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.2s ease',
                                    transform: activeColor === color.value ? 'scale(1.2)' : 'scale(1)',
                                    boxShadow: activeColor === color.value
                                        ? `0 0 25px ${color.value}, 0 0 50px ${color.value}88, inset 0 2px 4px rgba(255,255,255,0.3)`
                                        : `0 4px 12px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)`
                                }}
                            />
                        ))}
                    </div>
                </FloatingTool>
            </div>

            {/* Right Side - Brush Sizes (simplified) */}
            <div style={{
                position: 'absolute',
                right: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 20,
                pointerEvents: 'auto'
            }}>
                <FloatingTool>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        alignItems: 'center'
                    }}>
                        {BRUSH_SIZES.map(brush => (
                            <button
                                key={brush.label}
                                onClick={() => handleSizeChange(brush.size)}
                                style={{
                                    width: '52px',
                                    height: '52px',
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
                                    transform: activeSize === brush.size ? 'scale(1.15)' : 'scale(1)',
                                    boxShadow: activeSize === brush.size
                                        ? '0 0 20px rgba(255,255,255,0.4), inset 0 2px 4px rgba(255,255,255,0.2)'
                                        : '0 4px 12px rgba(0,0,0,0.3)'
                                }}
                            >
                                <div style={{
                                    width: `${brush.displaySize}px`,
                                    height: `${brush.displaySize}px`,
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

            {/* Bottom Center - Brush Preview + Clear (enhanced) */}
            <div style={{
                position: 'absolute',
                bottom: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                pointerEvents: 'auto'
            }}>
                <FloatingTool style={{ padding: '18px 28px' }}>
                    <div style={{
                        display: 'flex',
                        gap: '20px',
                        alignItems: 'center'
                    }}>
                        {/* Large brush preview */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.15)'
                        }}>
                            <span style={{ 
                                color: 'rgba(255,255,255,0.7)', 
                                fontSize: '0.85rem',
                                fontWeight: 500
                            }}>
                                Brush
                            </span>
                            <div style={{
                                width: `${Math.min(activeSize * 1.5, 48)}px`,
                                height: `${Math.min(activeSize * 1.5, 48)}px`,
                                borderRadius: '50%',
                                background: activeColor,
                                boxShadow: `0 0 25px ${activeColor}88, 0 0 50px ${activeColor}44`,
                                border: '2px solid rgba(255,255,255,0.3)',
                                transition: 'all 0.3s ease',
                                transform: penDown ? 'scale(1.1)' : 'scale(1)'
                            }} />
                        </div>

                        {/* Divider */}
                        <div style={{
                            width: '1px',
                            height: '40px',
                            background: 'rgba(255,255,255,0.2)'
                        }} />

                        {/* Clear button - pill-shaped with 3D bevel */}
                        <button
                            onClick={handleClear}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '14px 24px',
                                background: 'linear-gradient(180deg, rgba(255, 59, 48, 0.25) 0%, rgba(255, 59, 48, 0.15) 100%)',
                                border: '2px solid rgba(255, 59, 48, 0.4)',
                                borderRadius: '24px',
                                color: '#ff6b6b',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
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
                            <span style={{ fontSize: '1.2rem' }}>🗑️</span>
                            Clear
                        </button>
                    </div>
                </FloatingTool>
            </div>

            {/* First-time hint - "Pinch to draw" (auto-fades) */}
            {showHint && (
                <div style={{
                    position: 'absolute',
                    bottom: '140px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 15,
                    pointerEvents: 'none',
                    opacity: hintOpacity,
                    transition: 'opacity 0.5s ease'
                }}>
                    <div style={{
                        background: 'rgba(0, 245, 212, 0.2)',
                        border: '2px solid rgba(0, 245, 212, 0.4)',
                        borderRadius: '20px',
                        padding: '16px 28px',
                        color: '#00f5d4',
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 32px rgba(0, 245, 212, 0.3)',
                        animation: 'float 3s ease-in-out infinite'
                    }}>
                        👆 Pinch to draw, open hand to pause
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
