/**
 * Magic Cursor Component
 * 
 * Visual feedback for finger position and pen state.
 * - Shows pen up (ready to draw) vs pen down (drawing) states
 * - Fades based on tracking confidence
 * - Smooth animations
 */

import { useRef, useEffect, useState } from 'react';
import './MagicCursor.css';

interface MagicCursorProps {
    x: number;
    y: number;
    active: boolean;
    penDown?: boolean;
    confidence?: number;
}

export const MagicCursor = ({
    x,
    y,
    active,
    penDown = false,
    confidence = 1
}: MagicCursorProps) => {
    const cursorRef = useRef<HTMLDivElement>(null);
    const [smoothX, setSmoothX] = useState(x);
    const [smoothY, setSmoothY] = useState(y);

    // Smooth cursor movement for visual feedback
    useEffect(() => {
        const smoothing = 0.3;
        setSmoothX(prev => prev + (x - prev) * smoothing);
        setSmoothY(prev => prev + (y - prev) * smoothing);
    }, [x, y]);

    // Calculate opacity based on active state and confidence
    const opacity = active ? Math.max(0.3, confidence) : 0;

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
