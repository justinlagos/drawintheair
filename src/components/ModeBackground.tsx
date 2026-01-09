/**
 * Mode Background Component
 * 
 * Lightweight backgrounds per mode using CSS layers or canvas.
 * No heavy shaders, no extra WebGL scenes.
 */

import { useEffect, useRef } from 'react';
import { featureFlags } from '../core/featureFlags';

type ModeId = 'free' | 'calibration' | 'sort-and-place' | 'pre-writing' | 'word-search';

interface ModeBackgroundProps {
    modeId: ModeId;
}

/**
 * Free Paint: Glow cave particles
 */
const FreePaintBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            opacity: number;
            color: string;
        }> = [];

        // Create particles
        for (let i = 0; i < 20; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 4 + 2,
                opacity: Math.random() * 0.5 + 0.2,
                color: `hsl(${Math.random() * 360}, 70%, 60%)`
            });
        }

        let animationFrame: number;

        const animate = () => {
            ctx.fillStyle = 'rgba(1, 12, 36, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 15;
                ctx.shadowColor = p.color;
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            ctx.globalAlpha = 1;
            animationFrame = requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
                opacity: 0.6
            }}
        />
    );
};

/**
 * Bubble Pop: Underwater parallax drift
 */
const BubblePopBackground = () => {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(0, 20, 40, 0.9) 0%, rgba(0, 30, 60, 0.9) 50%, rgba(0, 40, 80, 0.9) 100%)',
            opacity: 0.7
        }} />
    );
};

/**
 * Sorting: Play mat or table surface
 */
const SortingBackground = () => {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            background: `
                repeating-linear-gradient(
                    0deg,
                    rgba(139, 90, 43, 0.05) 0px,
                    rgba(139, 90, 43, 0.05) 2px,
                    transparent 2px,
                    transparent 20px
                ),
                linear-gradient(135deg, rgba(101, 67, 33, 0.1) 0%, rgba(139, 90, 43, 0.1) 100%)
            `,
            opacity: 0.6
        }} />
    );
};

export const ModeBackground = ({ modeId }: ModeBackgroundProps) => {
    // Only show backgrounds if ToyMode theme is enabled
    if (!featureFlags.getFlag('toyModeTheme')) return null;

    switch (modeId) {
        case 'free':
            return <FreePaintBackground />;
        case 'calibration':
            return <BubblePopBackground />;
        case 'sort-and-place':
            return <SortingBackground />;
        default:
            return null;
    }
};
