import { useRef, useEffect } from 'react';

interface MagicCursorProps {
    x: number;
    y: number;
    active: boolean;
}

export const MagicCursor = ({ x, y, active }: MagicCursorProps) => {
    const cursorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (cursorRef.current) {
            // Smooth follow with CSS transition or JS lerp?
            // Using JS direct update for responsiveness, CSS for "trail"
            cursorRef.current.style.transform = `translate(${x * window.innerWidth}px, ${y * window.innerHeight}px)`;
            cursorRef.current.style.opacity = active ? '1' : '0';
        }
    }, [x, y, active]);

    return (
        <div
            ref={cursorRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid var(--secondary)',
                boxShadow: '0 0 15px var(--secondary), inset 0 0 10px var(--secondary)',
                pointerEvents: 'none',
                zIndex: 9999,
                transition: 'opacity 0.2s ease',
                transform: 'translate(-50%, -50%)',
                marginLeft: '-20px',
                marginTop: '-20px',
            }}
        >
            {/* Inner spark */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '10px',
                height: '10px',
                background: 'white',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 10px white'
            }} />
        </div>
    );
};
