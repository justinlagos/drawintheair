/**
 * Magic Cursor Component
 * 
 * Visual feedback for finger position and pen state.
 * - Shows pen up (ready to draw) vs pen down (drawing) states
 * - Fades based on tracking confidence
 * - Smooth animations
 * - ToyMode: Character cursor style (firefly/wand with tail)
 */

import { useRef, useEffect, type MutableRefObject } from 'react';
import { isToyModeEnabled } from '../core/toyMode';
import { getCanvasCoordinateMapper } from '../core/canvasCoordinateMapper';
import type { TrackingFrameData } from '../features/tracking/TrackingLayer';
import './MagicCursor.css';

export type CursorStyle = 'ring' | 'character';
export type CursorState = 'idle' | 'hover' | 'active' | 'success' | 'lost';

interface MagicCursorProps {
    frameRef: MutableRefObject<TrackingFrameData>;
    getPenDown?: () => boolean;
    airPaintEnabled?: boolean;
    mode?: 'calibration' | 'free' | 'pre-writing' | 'sort-and-place' | 'word-search' | 'colour-builder';
    style?: CursorStyle;
    state?: CursorState;
}

export const MagicCursor = ({
    frameRef,
    getPenDown,
    airPaintEnabled = false,
    mode,
    style,
    state
}: MagicCursorProps) => {
    const cursorRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);
    const currentRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
    const lastTimeRef = useRef<number>(performance.now());
    const tailHistoryRef = useRef<Array<{ x: number; y: number }>>([]);
    const tailRefs = useRef<Array<HTMLDivElement | null>>([]);
    const activeRef = useRef<boolean>(false);
    const penDownRef = useRef<boolean>(false);
    const confidenceRef = useRef<number>(1);

    // Determine cursor style - default ring, character in ToyMode
    const toyModeEnabled = isToyModeEnabled();
    const cursorStyle: CursorStyle = style || (toyModeEnabled ? 'character' : 'ring');

    useEffect(() => {
        const updateCursor = (time: number) => {
            const frame = frameRef.current;
            const { filteredPoint, indexTip, hasHand, confidence } = frame;
            const useFiltered = mode === 'free' && airPaintEnabled && filteredPoint;
            const target = useFiltered ? filteredPoint! : (indexTip ?? { x: 0.5, y: 0.5 });

            activeRef.current = Boolean(hasHand);
            confidenceRef.current = confidence ?? 1;
            penDownRef.current = getPenDown ? getPenDown() : frame.penDown;

            const mapper = getCanvasCoordinateMapper();
            const cssWidth = mapper?.getCanvasCssSize().width || window.innerWidth;
            const cssHeight = mapper?.getCanvasCssSize().height || window.innerHeight;

            const clampedX = Math.min(1, Math.max(0, target.x));
            const clampedY = Math.min(1, Math.max(0, target.y));

            const dt = Math.max((time - lastTimeRef.current) / 1000, 0.001);
            lastTimeRef.current = time;
            const current = currentRef.current;
            const dx = clampedX - current.x;
            const dy = clampedY - current.y;
            const speed = Math.hypot(dx, dy) / dt;
            const smoothing = speed > 1.2 ? 0.75 : speed > 0.5 ? 0.5 : 0.3;

            current.x += dx * smoothing;
            current.y += dy * smoothing;

            if (cursorRef.current) {
                const opacity = activeRef.current ? Math.max(0.3, confidenceRef.current) : 0;
                const px = current.x * cssWidth;
                const py = current.y * cssHeight;
                cursorRef.current.style.transform = `translate(${px}px, ${py}px)`;
                cursorRef.current.style.opacity = `${opacity}`;
                cursorRef.current.classList.toggle('pen-down', penDownRef.current);
                cursorRef.current.classList.toggle('pen-up', !penDownRef.current);
                cursorRef.current.classList.toggle('high-confidence', confidenceRef.current > 0.8);
                cursorRef.current.classList.toggle('low-confidence', confidenceRef.current < 0.5);
                if (cursorStyle === 'character') {
                    const nextState: CursorState = !activeRef.current
                        ? 'idle'
                        : (state || (penDownRef.current ? 'active' : 'hover'));
                    cursorRef.current.classList.toggle('cursor-idle', nextState === 'idle');
                    cursorRef.current.classList.toggle('cursor-hover', nextState === 'hover');
                    cursorRef.current.classList.toggle('cursor-active', nextState === 'active');
                    cursorRef.current.classList.toggle('cursor-success', nextState === 'success');
                    cursorRef.current.classList.toggle('cursor-lost', nextState === 'lost');
                }
            }

            if (cursorStyle === 'character') {
                if (activeRef.current) {
                    tailHistoryRef.current.unshift({ x: current.x, y: current.y });
                    if (tailHistoryRef.current.length > 8) tailHistoryRef.current.length = 8;
                } else {
                    tailHistoryRef.current.length = 0;
                }

                tailRefs.current.forEach((node, i) => {
                    if (!node) return;
                    const point = tailHistoryRef.current[i];
                    if (!point) {
                        node.style.opacity = '0';
                        return;
                    }
                    const size = 8 - i;
                    const opacity = Math.max(0, 1 - i * 0.15);
                    node.style.opacity = `${opacity}`;
                    node.style.width = `${size}px`;
                    node.style.height = `${size}px`;
                    node.style.left = `${point.x * cssWidth}px`;
                    node.style.top = `${point.y * cssHeight}px`;
                    node.style.marginLeft = `${-size / 2}px`;
                    node.style.marginTop = `${-size / 2}px`;
                });
            }

            rafRef.current = requestAnimationFrame(updateCursor);
        };

        rafRef.current = requestAnimationFrame(updateCursor);
        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [frameRef, airPaintEnabled, cursorStyle, mode, getPenDown]);

    // Calculate opacity based on active state and confidence
    // Character cursor render
    if (cursorStyle === 'character') {
        const glowIntensity = penDownRef.current ? 1.5 : 1;
        const scale = penDownRef.current ? 1.1 : 1;

        return (
            <div
                ref={cursorRef}
                className="magic-cursor character-cursor cursor-idle"
            >
                {/* Tail trail */}
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="cursor-tail-point"
                        ref={(node) => { tailRefs.current[i] = node; }}
                        style={{
                            position: 'absolute',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(255, 230, 109, 0.8) 0%, rgba(255, 107, 157, 0.4) 100%)',
                            boxShadow: '0 0 10px rgba(255, 230, 109, 0.6)',
                            transform: 'translate(-50%, -50%)',
                            opacity: 0
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
                        transform: (state || 'idle') === 'idle' ? 'scale(1)' : 'scale(1)',
                        animation: (state || 'idle') === 'idle' ? 'cursorIdle 2s ease-in-out infinite' : 'none',
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
            className="magic-cursor pen-up"
        >
            {/* Outer ring - shows pen state */}
            <div className="cursor-ring" />

            {/* Inner dot - solid when drawing */}
            <div className={`cursor-dot ${penDownRef.current ? 'active' : ''}`} />

            {/* Decorative rotating ring */}
            <div className="cursor-decoration" />

            {/* Trail effect when drawing */}
            {penDownRef.current && (
                <div className="cursor-trail" />
            )}
        </div>
    );
};
