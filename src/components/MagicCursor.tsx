/**
 * Magic Cursor Component
 * 
 * Visual feedback for finger position and pen state.
 * - Shows pen up (ready to draw) vs pen down (drawing) states
 * - Fades based on tracking confidence
 * - Smooth animations
 * - ToyMode: Character cursor style (firefly/wand with tail)
 */

import { useRef, useEffect, useState } from 'react';
import { isToyModeEnabled } from '../core/toyMode';
import './MagicCursor.css';

export type CursorStyle = 'ring' | 'character';
export type CursorState = 'idle' | 'hover' | 'active' | 'success' | 'lost';

interface MagicCursorProps {
    x: number;
    y: number;
    active: boolean;
    penDown?: boolean;
    confidence?: number;
    style?: CursorStyle;
    state?: CursorState;
}

export const MagicCursor = ({
    x,
    y,
    active,
    penDown = false,
    confidence = 1,
    style,
    state
}: MagicCursorProps) => {
    const cursorRef = useRef<HTMLDivElement>(null);
    const [smoothX, setSmoothX] = useState(x);
    const [smoothY, setSmoothY] = useState(y);
    const idleAnimationFrameRef = useRef<number | null>(null);
    const [tailPoints, setTailPoints] = useState<Array<{ x: number; y: number; opacity: number }>>([]);
    
    // Determine cursor style - default ring, character in ToyMode
    const toyModeEnabled = isToyModeEnabled();
    const cursorStyle: CursorStyle = style || (toyModeEnabled ? 'character' : 'ring');
    
    // Determine cursor state
    let cursorState: CursorState = 'idle';
    if (!active) cursorState = 'idle';
    else if (state) cursorState = state;
    else if (penDown) cursorState = 'active';
    else cursorState = 'hover';

    // Smooth cursor movement for visual feedback
    useEffect(() => {
        const smoothing = 0.3;
        setSmoothX(prev => prev + (x - prev) * smoothing);
        setSmoothY(prev => prev + (y - prev) * smoothing);
    }, [x, y]);

    // Update tail points for character cursor
    useEffect(() => {
        if (cursorStyle === 'character' && active) {
            setTailPoints(prev => {
                const newPoints = [{ x: smoothX, y: smoothY, opacity: 1 }, ...prev];
                return newPoints.slice(0, 8).map((p, i) => ({
                    ...p,
                    opacity: Math.max(0, 1 - i * 0.15)
                }));
            });
        } else {
            setTailPoints([]);
        }
    }, [smoothX, smoothY, cursorStyle, active]);

    // Idle animation for character cursor
    useEffect(() => {
        if (cursorStyle === 'character' && cursorState === 'idle' && active) {
            const animate = () => {
                idleAnimationFrameRef.current = requestAnimationFrame(animate);
            };
            idleAnimationFrameRef.current = requestAnimationFrame(animate);
        } else {
            if (idleAnimationFrameRef.current !== null) {
                cancelAnimationFrame(idleAnimationFrameRef.current);
                idleAnimationFrameRef.current = null;
            }
        }
        return () => {
            if (idleAnimationFrameRef.current !== null) {
                cancelAnimationFrame(idleAnimationFrameRef.current);
                idleAnimationFrameRef.current = null;
            }
        };
    }, [cursorStyle, cursorState, active]);

    // Calculate opacity based on active state and confidence
    const opacity = active ? Math.max(0.3, confidence) : 0;

    // Character cursor render
    if (cursorStyle === 'character') {
        const glowIntensity = penDown ? 1.5 : cursorState === 'success' ? 2 : 1;
        const scale = cursorState === 'success' ? 1.2 : penDown ? 1.1 : 1;
        
        return (
            <div
                ref={cursorRef}
                className={`magic-cursor character-cursor cursor-${cursorState}`}
                style={{
                    transform: `translate(${smoothX * window.innerWidth}px, ${smoothY * window.innerHeight}px)`,
                    opacity
                }}
            >
                {/* Tail trail */}
                {tailPoints.map((point, i) => (
                    <div
                        key={i}
                        className="cursor-tail-point"
                        style={{
                            position: 'absolute',
                            left: `${point.x * window.innerWidth}px`,
                            top: `${point.y * window.innerHeight}px`,
                            width: `${8 - i}px`,
                            height: `${8 - i}px`,
                            marginLeft: `${-(8 - i) / 2}px`,
                            marginTop: `${-(8 - i) / 2}px`,
                            borderRadius: '50%',
                            background: `radial-gradient(circle, rgba(255, 230, 109, ${point.opacity * 0.8}) 0%, rgba(255, 107, 157, ${point.opacity * 0.4}) 100%)`,
                            boxShadow: `0 0 ${10 * point.opacity}px rgba(255, 230, 109, ${point.opacity * 0.6})`,
                            transform: 'translate(-50%, -50%)',
                            opacity: point.opacity
                        }}
                    />
                ))}
                
                {/* Main firefly/wand tip */}
                <div
                    className="cursor-character-main"
                    style={{
                        position: 'absolute',
                        width: `${20 * scale}px`,
                        height: `${20 * scale}px`,
                        marginLeft: `${-10 * scale}px`,
                        marginTop: `${-10 * scale}px`,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, rgba(255, 230, 109, 1) 0%, rgba(255, 107, 157, 0.8) 50%, transparent 100%)`,
                        boxShadow: `0 0 ${20 * glowIntensity}px rgba(255, 230, 109, ${0.8 * glowIntensity}), 0 0 ${40 * glowIntensity}px rgba(255, 107, 157, ${0.4 * glowIntensity})`,
                        transform: cursorState === 'idle' ? 'scale(1)' : 'scale(1)',
                        animation: cursorState === 'idle' ? 'cursorIdle 2s ease-in-out infinite' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                />
            </div>
        );
    }

    // Default ring cursor
    return (
        <div
            ref={cursorRef}
            className={`magic-cursor ${penDown ? 'pen-down' : 'pen-up'}`}
            style={{
                transform: `translate(${smoothX * window.innerWidth}px, ${smoothY * window.innerHeight}px)`,
                opacity
            }}
        >
            {/* Outer ring - shows pen state */}
            <div className="cursor-ring" />

            {/* Inner dot - solid when drawing */}
            <div className={`cursor-dot ${penDown ? 'active' : ''}`} />

            {/* Decorative rotating ring */}
            <div className="cursor-decoration" />

            {/* Trail effect when drawing */}
            {penDown && (
                <div className="cursor-trail" />
            )}
        </div>
    );
};
