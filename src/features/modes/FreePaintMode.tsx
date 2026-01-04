import { useState } from 'react';
import { drawingEngine } from '../../core/drawingEngine';

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
    className?: string;
}

const FloatingTool = ({ children, style = {}, className = '' }: FloatingToolProps) => (
    <div
        className={className}
        style={{
            background: 'rgba(15, 12, 41, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            padding: '12px',
            ...style
        }}
    >
        {children}
    </div>
);

export const FreePaintMode = () => {
    const [activeColor, setActiveColor] = useState(COLORS[0].value);
    const [activeSize, setActiveSize] = useState(BRUSH_SIZES[1].size);

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

    return (
        <>
            {/* Left Side - Color Palette */}
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
                        gap: '10px',
                        alignItems: 'center'
                    }}>
                        {/* Palette Icon */}
                        <div style={{
                            fontSize: '1.5rem',
                            marginBottom: '4px',
                            opacity: 0.8
                        }}>
                            🎨
                        </div>

                        {COLORS.map(color => (
                            <button
                                key={color.value}
                                onClick={() => handleColorChange(color.value)}
                                title={color.name}
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    background: color.value === '#ffffff'
                                        ? 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)'
                                        : color.value,
                                    border: activeColor === color.value
                                        ? '3px solid white'
                                        : '2px solid rgba(255,255,255,0.3)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.2s ease',
                                    transform: activeColor === color.value ? 'scale(1.15)' : 'scale(1)',
                                    boxShadow: activeColor === color.value
                                        ? `0 0 20px ${color.value}, 0 0 40px ${color.value}66`
                                        : `0 2px 8px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)`
                                }}
                            />
                        ))}
                    </div>
                </FloatingTool>
            </div>

            {/* Right Side - Brush Sizes */}
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
                        gap: '10px',
                        alignItems: 'center'
                    }}>
                        {/* Brush Icon */}
                        <div style={{
                            fontSize: '1.5rem',
                            marginBottom: '4px',
                            opacity: 0.8
                        }}>
                            🖌️
                        </div>

                        {BRUSH_SIZES.map(brush => (
                            <button
                                key={brush.label}
                                onClick={() => handleSizeChange(brush.size)}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: activeSize === brush.size
                                        ? 'rgba(255,255,255,0.2)'
                                        : 'rgba(255,255,255,0.05)',
                                    border: activeSize === brush.size
                                        ? '2px solid rgba(255,255,255,0.6)'
                                        : '1px solid rgba(255,255,255,0.2)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    transform: activeSize === brush.size ? 'scale(1.1)' : 'scale(1)'
                                }}
                            >
                                {/* Brush size preview */}
                                <div style={{
                                    width: `${brush.displaySize}px`,
                                    height: `${brush.displaySize}px`,
                                    borderRadius: '50%',
                                    background: activeColor,
                                    boxShadow: activeSize === brush.size
                                        ? `0 0 10px ${activeColor}`
                                        : 'none'
                                }} />
                            </button>
                        ))}
                    </div>
                </FloatingTool>
            </div>

            {/* Bottom Center - Actions */}
            <div style={{
                position: 'absolute',
                bottom: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                pointerEvents: 'auto'
            }}>
                <FloatingTool style={{ padding: '16px 24px' }}>
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center'
                    }}>
                        {/* Current brush preview */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 16px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px'
                        }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                                Brush:
                            </span>
                            <div style={{
                                width: `${activeSize}px`,
                                height: `${activeSize}px`,
                                maxWidth: '32px',
                                maxHeight: '32px',
                                borderRadius: '50%',
                                background: activeColor,
                                boxShadow: `0 0 15px ${activeColor}88`
                            }} />
                        </div>

                        {/* Divider */}
                        <div style={{
                            width: '1px',
                            height: '32px',
                            background: 'rgba(255,255,255,0.2)'
                        }} />

                        {/* Clear button */}
                        <button
                            onClick={handleClear}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                background: 'rgba(255, 59, 48, 0.2)',
                                border: '1px solid rgba(255, 59, 48, 0.4)',
                                borderRadius: '12px',
                                color: '#ff6b6b',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span>🗑️</span>
                            Clear Canvas
                        </button>
                    </div>
                </FloatingTool>
            </div>

            {/* Top Left - Mode indicator */}
            <div style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                zIndex: 15
            }}>
                <FloatingTool style={{ padding: '12px 20px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '1.3rem' }}>🎨</span>
                        <span style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Free Paint
                        </span>
                    </div>
                </FloatingTool>
            </div>
        </>
    );
};
