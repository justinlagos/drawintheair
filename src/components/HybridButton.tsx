/**
 * HybridButton - Supports both hand tracking (dwell) and mouse/touch (click)
 * 
 * Critical for Free Paint mode - children can use either input method
 */

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface HybridButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    onDwellSelect?: () => void;
    isSelected?: boolean;
    disabled?: boolean;
    dwellDuration?: number;
    style?: React.CSSProperties;
    className?: string;
    title?: string;
    'data-color-button'?: string;
    'data-brush-button'?: string;
    'data-tool-button'?: string;
    'data-action-button'?: string;
}

export interface HybridButtonRef {
    handleTrackingHover: (isHovered: boolean, point?: { x: number; y: number }) => void;
}

export const HybridButton = forwardRef<HybridButtonRef, HybridButtonProps>(({
    children,
    onClick,
    onDwellSelect,
    isSelected = false,
    disabled = false,
    dwellDuration = 800, // Faster dwell for paint mode
    style,
    className,
    title,
    'data-color-button': dataColorButton,
    'data-brush-button': dataBrushButton,
    'data-tool-button': dataToolButton,
    'data-action-button': dataActionButton
}, ref) => {
    const [dwellProgress, setDwellProgress] = useState(0);
    const [isHoveredByTracking, setIsHoveredByTracking] = useState(false);
    const dwellTimerRef = useRef<number | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    
    // Mouse/Touch click handler
    const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        onClick();
        
        // Visual feedback
        if (buttonRef.current) {
            buttonRef.current.animate([
                { transform: 'scale(0.95)' },
                { transform: 'scale(1)' }
            ], { duration: 150 });
        }
    };
    
    // Hand tracking dwell handler (called from parent via ref)
    const handleTrackingHover = (isHovered: boolean, point?: { x: number; y: number }) => {
        // `point` is currently unused but kept for future visual effects (e.g., ripple from touch point)
        // Read it to satisfy TypeScript's noUnusedParameters rule.
        void point;
        if (disabled) return;
        
        setIsHoveredByTracking(isHovered);
        
        if (isHovered && !dwellTimerRef.current) {
            // Start dwell timer
            const startTime = Date.now();
            dwellTimerRef.current = window.setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / dwellDuration, 1);
                setDwellProgress(progress);
                
                if (progress >= 1) {
                    // Dwell complete - select
                    clearInterval(dwellTimerRef.current!);
                    dwellTimerRef.current = null;
                    setDwellProgress(0);
                    onDwellSelect?.() || onClick();
                }
            }, 16);
        } else if (!isHovered && dwellTimerRef.current) {
            // Cancel dwell
            clearInterval(dwellTimerRef.current);
            dwellTimerRef.current = null;
            setDwellProgress(0);
        }
    };
    
    // Expose tracking handler via ref
    useImperativeHandle(ref, () => ({
        handleTrackingHover
    }));
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (dwellTimerRef.current) {
                clearInterval(dwellTimerRef.current);
            }
        };
    }, []);
    
    return (
        <button
            ref={buttonRef}
            className={`hybrid-button ${isSelected ? 'selected' : ''} ${className || ''}`}
            onClick={handleClick}
            onTouchEnd={handleClick}
            disabled={disabled}
            title={title}
            style={{
                ...style,
                position: 'relative',
                cursor: disabled ? 'not-allowed' : 'pointer',
                // Ensure touch targets are 44px minimum
                minWidth: '44px',
                minHeight: '44px',
                transition: 'transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
            }}
            {...(dataColorButton && { 'data-color-button': dataColorButton })}
            {...(dataBrushButton && { 'data-brush-button': dataBrushButton })}
            {...(dataToolButton && { 'data-tool-button': dataToolButton })}
            {...(dataActionButton && { 'data-action-button': dataActionButton })}
        >
            {children}
            
            {/* Dwell progress ring */}
            {dwellProgress > 0 && !disabled && (
                <svg
                    className="dwell-progress-ring"
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none'
                    }}
                >
                    <circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        fill="none"
                        stroke="rgba(0, 229, 255, 0.8)"
                        strokeWidth="4"
                        strokeDasharray={`${dwellProgress * 283} 283`}
                        strokeLinecap="round"
                    />
                </svg>
            )}
            
            {/* Tracking hover indicator */}
            {isHoveredByTracking && !disabled && (
                <div
                    className="tracking-hover-indicator"
                    style={{
                        position: 'absolute',
                        inset: '-4px',
                        border: '2px solid rgba(0, 229, 255, 0.6)',
                        borderRadius: 'inherit',
                        pointerEvents: 'none',
                        animation: 'pulse 1s ease-in-out infinite'
                    }}
                />
            )}
        </button>
    );
});

HybridButton.displayName = 'HybridButton';
