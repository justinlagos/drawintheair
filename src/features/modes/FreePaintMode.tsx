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

import { useState, useEffect, useRef } from 'react';
import { drawingEngine } from '../../core/drawingEngine';
import type { TrackingFrameData } from '../tracking/TrackingLayer';
import { FreePaintDebugHUD } from '../../components/FreePaintDebugHUD';
import { GameTopBar } from '../../components/GameTopBar';
import { freePaintMetricsTracker } from './freePaintMetrics';
import { freePaintProManager } from './freePaintProManager';
import { featureFlags } from '../../core/featureFlags';
import { paintToolsManager, type PaintTool } from './freePaintTools';
import { undoRedoManager } from './freePaintUndo';
import { HybridButton, type HybridButtonRef } from '../../components/HybridButton';
import { normalizedToCanvas } from '../../core/coordinateUtils';

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
            background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
            
            
            borderRadius: compact ? '18px' : '22px',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
            padding: compact ? '8px' : '16px',
            ...style
        }}
    >
        {children}
    </div>
);

interface FreePaintModeProps {
    frameData?: TrackingFrameData;
    onExit?: () => void;
}

export const FreePaintMode = ({ frameData, onExit }: FreePaintModeProps) => {
    const [activeColor, setActiveColor] = useState(COLORS[0].value);
    const [activeSize, setActiveSize] = useState(BRUSH_SIZES[1].size);
    const [showHint, setShowHint] = useState(true);
    const [hintOpacity, setHintOpacity] = useState(1);
    const layout = useResponsiveLayout();
    
    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;
    
    // Refs for hybrid buttons to enable tracking hover
    const colorButtonRefs = useRef<Map<string, HybridButtonRef>>(new Map());
    const brushButtonRefs = useRef<Map<string, HybridButtonRef>>(new Map());
    const toolButtonRefs = useRef<Map<string, HybridButtonRef>>(new Map());
    const actionButtonRefs = useRef<Map<string, HybridButtonRef>>(new Map());

    // Check if debug mode is enabled
    const showDebug = (() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('debug') === 'airpaint';
        }
        return false;
    })();

    // Track metrics for debug HUD
    const [debugMetrics, setDebugMetrics] = useState(freePaintMetricsTracker.getMetrics());
    const metricsUpdateIntervalRef = useRef<number | undefined>(undefined);

    // Update metrics periodically when debug is enabled
    useEffect(() => {
        if (showDebug) {
            // Update metrics at ~10Hz (every 100ms) to avoid React state spam
            metricsUpdateIntervalRef.current = window.setInterval(() => {
                setDebugMetrics(freePaintMetricsTracker.getMetrics());
            }, 100);

            return () => {
                if (metricsUpdateIntervalRef.current !== undefined) {
                    clearInterval(metricsUpdateIntervalRef.current);
                }
            };
        }
    }, [showDebug]);

    // Initialize AIR PAINT PRO features if flags are enabled
    useEffect(() => {
        const flags = featureFlags.getFlags();
        if (flags.airPaintEnabled || flags.layersEnabled) {
            // Find the TrackingLayer container (parent of canvas)
            // The canvas is in TrackingLayer, we'll create layered canvases as siblings
            const findCanvasContainer = (): HTMLElement | null => {
                const canvas = document.querySelector('canvas[style*="z-index: 100"]');
                return canvas?.parentElement as HTMLElement | null;
            };
            
            const updateSize = () => {
                const container = findCanvasContainer();
                if (container) {
                    const width = container.clientWidth || window.innerWidth;
                    const height = container.clientHeight || window.innerHeight;
                    freePaintProManager.initialize(width, height, container);
                }
            };
            
            // Initialize after a short delay to ensure DOM is ready
            const initTimer = setTimeout(updateSize, 100);
            
            // Resize on window resize
            window.addEventListener('resize', updateSize);
            return () => {
                clearTimeout(initTimer);
                window.removeEventListener('resize', updateSize);
                freePaintProManager.destroy();
            };
        }
    }, []);

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
        paintToolsManager.setBrushColor(color);
    };

    const handleSizeChange = (size: number) => {
        setActiveSize(size);
        drawingEngine.setWidth(size);
        paintToolsManager.setBrushSize(size);
    };

    const handleClear = () => {
        drawingEngine.clear();
        undoRedoManager.clear();
    };
    
    // Tool selection handlers
    const handleToolSelect = (tool: PaintTool) => {
        paintToolsManager.setTool(tool);
    };
    
    // Undo/Redo handlers
    const handleUndo = () => {
        const operation = undoRedoManager.pop();
        if (operation) {
            if (operation.type === 'stroke') {
                // Remove last stroke
                const strokes = drawingEngine.getStrokes();
                if (strokes.length > 0) {
                    strokes.pop();
                    drawingEngine.setStrokes(strokes);
                }
            } else if (operation.type === 'clear') {
                // Clear canvas
                drawingEngine.clear();
            } else if (operation.type === 'fill') {
                // Restore previous image data for fill area
                const canvas = document.querySelector('canvas[style*="z-index: 100"]') as HTMLCanvasElement;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.putImageData(operation.imageData, operation.bounds.x, operation.bounds.y);
                    }
                }
            }
        }
    };
    
    const handleRedo = () => {
        const operation = undoRedoManager.redo();
        if (operation) {
            if (operation.type === 'stroke') {
                // Add stroke back
                const strokes = drawingEngine.getStrokes();
                strokes.push(operation.stroke);
                drawingEngine.setStrokes(strokes);
            } else if (operation.type === 'fill') {
                // Re-apply fill
                const canvas = document.querySelector('canvas[style*="z-index: 100"]') as HTMLCanvasElement;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx && operation.imageData) {
                        ctx.putImageData(operation.imageData, operation.bounds.x, operation.bounds.y);
                    }
                }
            }
        }
    };
    
    // Save PNG handler
    const handleSave = () => {
        // Get canvas from TrackingLayer
        const canvas = document.querySelector('canvas[style*="z-index: 100"]') as HTMLCanvasElement;
        if (!canvas) return;
        
        // Create download link
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `draw-in-the-air-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    };
    
    // Get current tool state
    const activeTool = paintToolsManager.getTool();
    const canUndo = undoRedoManager.canUndo();
    const canRedo = undoRedoManager.canRedo();
    const flags = featureFlags.getFlags();
    
    // Debug: Log flags on mount
    useEffect(() => {
        console.log('[FreePaintMode] Flags:', {
            airPaintEnabled: flags.airPaintEnabled,
            layersEnabled: flags.layersEnabled,
            fillEnabled: flags.fillEnabled,
            activeTool
        });
    }, [flags.airPaintEnabled, flags.layersEnabled, flags.fillEnabled, activeTool]);

    const penDown = frameData?.penDown ?? false;
    
    // Throttled tracking hover check - runs at most every 100ms to avoid per-frame DOM queries
    const lastHoverCheckRef = useRef<number>(0);
    const HOVER_CHECK_INTERVAL = 100;

    // Check tracking point against all buttons
    useEffect(() => {
        if (!frameData?.filteredPoint) return;
        
        // Throttle to avoid running every frame
        const now = Date.now();
        if (now - lastHoverCheckRef.current < HOVER_CHECK_INTERVAL) return;
        lastHoverCheckRef.current = now;
        
        const trackingPoint = frameData.filteredPoint;
        const canvasPoint = normalizedToCanvas(trackingPoint, window.innerWidth, window.innerHeight);
        
        // Check color buttons
        colorButtonRefs.current.forEach((ref, color) => {
            const button = document.querySelector(`[data-color-button="${color}"]`) as HTMLElement;
            if (button) {
                const rect = button.getBoundingClientRect();
                const isOver = (
                    canvasPoint.x >= rect.left &&
                    canvasPoint.x <= rect.right &&
                    canvasPoint.y >= rect.top &&
                    canvasPoint.y <= rect.bottom
                );
                ref.handleTrackingHover(isOver, canvasPoint);
            }
        });
        
        // Check brush size buttons
        brushButtonRefs.current.forEach((ref, size) => {
            const button = document.querySelector(`[data-brush-button="${size}"]`) as HTMLElement;
            if (button) {
                const rect = button.getBoundingClientRect();
                const isOver = (
                    canvasPoint.x >= rect.left &&
                    canvasPoint.x <= rect.right &&
                    canvasPoint.y >= rect.top &&
                    canvasPoint.y <= rect.bottom
                );
                ref.handleTrackingHover(isOver, canvasPoint);
            }
        });
        
        // Check tool buttons
        toolButtonRefs.current.forEach((ref, tool) => {
            const button = document.querySelector(`[data-tool-button="${tool}"]`) as HTMLElement;
            if (button) {
                const rect = button.getBoundingClientRect();
                const isOver = (
                    canvasPoint.x >= rect.left &&
                    canvasPoint.x <= rect.right &&
                    canvasPoint.y >= rect.top &&
                    canvasPoint.y <= rect.bottom
                );
                ref.handleTrackingHover(isOver, canvasPoint);
            }
        });
        
        // Check action buttons
        actionButtonRefs.current.forEach((ref, action) => {
            const button = document.querySelector(`[data-action-button="${action}"]`) as HTMLElement;
            if (button) {
                const rect = button.getBoundingClientRect();
                const isOver = (
                    canvasPoint.x >= rect.left &&
                    canvasPoint.x <= rect.right &&
                    canvasPoint.y >= rect.top &&
                    canvasPoint.y <= rect.bottom
                );
                ref.handleTrackingHover(isOver, canvasPoint);
            }
        });
    }, [frameData?.filteredPoint]);

    // Responsive sizing
    const colorButtonSize = isCompact ? '36px' : '48px';
    const brushButtonSize = isCompact ? '40px' : '52px';
    const toolGap = isCompact ? '8px' : '12px';
    const panelPadding = isCompact ? '10px' : '16px';
    const hudSpacing = isMobile ? '18px' : isTabletSmall ? '28px' : '40px';

    return (
        <>
            {/* Back to menu */}
            {onExit && (
                <GameTopBar onBack={onExit} compact={isCompact} />
            )}

            {/* Debug HUD - shown when ?debug=freepaint */}
            {showDebug && (
                <FreePaintDebugHUD metrics={debugMetrics} />
            )}

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
                            <HybridButton
                                key={color.value}
                                ref={el => {
                                    if (el) colorButtonRefs.current.set(color.value, el);
                                }}
                                onClick={() => handleColorChange(color.value)}
                                isSelected={activeColor === color.value}
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
                                    padding: 0,
                                    transform: activeColor === color.value ? 'scale(1.15)' : 'scale(1)',
                                    boxShadow: activeColor === color.value
                                        ? `0 0 20px ${color.value}, 0 0 40px ${color.value}88, inset 0 2px 4px rgba(255,255,255,0.3)`
                                        : `0 4px 12px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)`
                                }}
                                data-color-button={color.value}
                            >
                                {activeColor === color.value && (
                                    <span style={{ 
                                        color: color.value === '#ffffff' ? '#000' : '#fff',
                                        fontSize: '1.2rem',
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)'
                                    }}>✓</span>
                                )}
                            </HybridButton>
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
                            <HybridButton
                                key={brush.label}
                                ref={el => {
                                    if (el) brushButtonRefs.current.set(brush.size.toString(), el);
                                }}
                                onClick={() => handleSizeChange(brush.size)}
                                isSelected={activeSize === brush.size}
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
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transform: activeSize === brush.size ? 'scale(1.1)' : 'scale(1)',
                                    boxShadow: activeSize === brush.size
                                        ? '0 0 20px rgba(255,255,255,0.4), inset 0 2px 4px rgba(255,255,255,0.2)'
                                        : '0 4px 12px rgba(0,0,0,0.3)',
                                    padding: 0
                                }}
                                data-brush-button={brush.size.toString()}
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
                                <span style={{ 
                                    position: 'absolute',
                                    bottom: '-20px',
                                    fontSize: '0.75rem',
                                    color: 'rgba(255,255,255,0.7)'
                                }}>
                                    {brush.label}
                                </span>
                            </HybridButton>
                        ))}
                    </div>
                </FloatingTool>
            </div>

            {/* Bottom Center - Toolbar (responsive) */}
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
                        gap: isCompact ? '8px' : '12px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        {/* Tool Selection - AIR PAINT PRO */}
                        {flags.airPaintEnabled && (
                            <>
                                <div style={{
                                    display: 'flex',
                                    gap: isCompact ? '4px' : '6px',
                                    padding: isCompact ? '6px' : '8px',
                                    background: 'rgba(255,255,255,0.08)',
                                    borderRadius: isCompact ? '10px' : '12px',
                                    border: '1px solid rgba(255,255,255,0.15)'
                                }}>
                                    {(['brush', 'eraser', 'fill'] as PaintTool[]).map(tool => (
                                        <HybridButton
                                            key={tool}
                                            ref={el => {
                                                if (el) toolButtonRefs.current.set(tool, el);
                                            }}
                                            onClick={() => handleToolSelect(tool)}
                                            isSelected={activeTool === tool}
                                            title={tool.charAt(0).toUpperCase() + tool.slice(1)}
                                            style={{
                                                width: isCompact ? '36px' : '44px',
                                                height: isCompact ? '36px' : '44px',
                                                borderRadius: '8px',
                                                background: activeTool === tool
                                                    ? 'rgba(255,255,255,0.25)'
                                                    : 'rgba(255,255,255,0.08)',
                                                border: activeTool === tool
                                                    ? '2px solid rgba(255,255,255,0.7)'
                                                    : '1px solid rgba(255,255,255,0.2)',
                                                color: '#fff',
                                                fontSize: isCompact ? '1rem' : '1.2rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transform: activeTool === tool ? 'scale(1.1)' : 'scale(1)'
                                            }}
                                            data-tool-button={tool}
                                        >
                                            {tool === 'brush' && '🖌️'}
                                            {tool === 'eraser' && '🧹'}
                                            {tool === 'fill' && '🪣'}
                                        </HybridButton>
                                    ))}
                                </div>
                                
                                {/* Divider */}
                                <div style={{
                                    width: '1px',
                                    height: '40px',
                                    background: 'rgba(255,255,255,0.2)'
                                }} />
                                
                                {/* Undo/Redo */}
                                <div style={{
                                    display: 'flex',
                                    gap: isCompact ? '4px' : '6px'
                                }}>
                                    <HybridButton
                                        ref={el => {
                                            if (el) actionButtonRefs.current.set('undo', el);
                                        }}
                                        onClick={handleUndo}
                                        disabled={!canUndo}
                                        title="Undo"
                                        style={{
                                            width: isCompact ? '36px' : '44px',
                                            height: isCompact ? '36px' : '44px',
                                            borderRadius: '8px',
                                            background: canUndo
                                                ? 'rgba(255,255,255,0.15)'
                                                : 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            color: canUndo ? '#fff' : 'rgba(255,255,255,0.3)',
                                            fontSize: isCompact ? '1rem' : '1.2rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: canUndo ? 1 : 0.5
                                        }}
                                        data-action-button="undo"
                                    >
                                        ↶
                                    </HybridButton>
                                    <HybridButton
                                        ref={el => {
                                            if (el) actionButtonRefs.current.set('redo', el);
                                        }}
                                        onClick={handleRedo}
                                        disabled={!canRedo}
                                        title="Redo"
                                        style={{
                                            width: isCompact ? '36px' : '44px',
                                            height: isCompact ? '36px' : '44px',
                                            borderRadius: '8px',
                                            background: canRedo
                                                ? 'rgba(255,255,255,0.15)'
                                                : 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            color: canRedo ? '#fff' : 'rgba(255,255,255,0.3)',
                                            fontSize: isCompact ? '1rem' : '1.2rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: canRedo ? 1 : 0.5
                                        }}
                                        data-action-button="redo"
                                    >
                                        ↷
                                    </HybridButton>
                                </div>
                                
                                {/* Divider */}
                                <div style={{
                                    width: '1px',
                                    height: '40px',
                                    background: 'rgba(255,255,255,0.2)'
                                }} />
                                
                                {/* Save */}
                                <HybridButton
                                    ref={el => {
                                        if (el) actionButtonRefs.current.set('save', el);
                                    }}
                                    onClick={handleSave}
                                    title="Save as PNG"
                                    style={{
                                        width: isCompact ? '36px' : '44px',
                                        height: isCompact ? '36px' : '44px',
                                        borderRadius: '8px',
                                        background: 'rgba(0, 245, 212, 0.2)',
                                        border: '1px solid rgba(0, 245, 212, 0.4)',
                                        color: '#00f5d4',
                                        fontSize: isCompact ? '1rem' : '1.2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    data-action-button="save"
                                >
                                    💾
                                </HybridButton>
                                
                                {/* Divider */}
                                <div style={{
                                    width: '1px',
                                    height: '40px',
                                    background: 'rgba(255,255,255,0.2)'
                                }} />
                            </>
                        )}
                        
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
                                    {activeTool === 'brush' ? 'Brush' : activeTool === 'eraser' ? 'Eraser' : 'Fill'}
                                </span>
                                <div style={{
                                    width: `${Math.min(activeSize * (isCompact ? 1 : 1.5), isCompact ? 32 : 48)}px`,
                                    height: `${Math.min(activeSize * (isCompact ? 1 : 1.5), isCompact ? 32 : 48)}px`,
                                    borderRadius: '50%',
                                    background: activeTool === 'eraser' ? '#ff4444' : activeColor,
                                    boxShadow: `0 0 25px ${activeTool === 'eraser' ? '#ff4444' : activeColor}88, 0 0 50px ${activeTool === 'eraser' ? '#ff4444' : activeColor}44`,
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
                        <HybridButton
                            ref={el => {
                                if (el) actionButtonRefs.current.set('clear', el);
                            }}
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
                                fontSize: isCompact ? '0.85rem' : '1rem',
                                fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                                minWidth: '44px',
                                minHeight: '44px'
                            }}
                            data-action-button="clear"
                        >
                            <span style={{ fontSize: isCompact ? '1rem' : '1.2rem' }}>🗑️</span>
                            {!isLandscapePhone && 'Clear'}
                        </HybridButton>
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
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                        border: '1.5px solid rgba(0, 245, 212, 0.3)',
                        borderRadius: '9999px',
                        padding: isCompact ? '10px 20px' : '14px 28px',
                        color: '#00f5d4',
                        fontSize: isCompact ? '0.9rem' : '1.1rem',
                        fontWeight: 600,
                        
                        
                        boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
                        animation: 'float 3s ease-in-out infinite',
                        textAlign: 'center',
                        whiteSpace: isCompact ? 'normal' : 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
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
