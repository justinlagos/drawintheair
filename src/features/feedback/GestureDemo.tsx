/**
 * GestureDemo — the "Show me how" 5-second loop.
 *
 * Shows, rather than tells, the wave gesture: a hand rocks side to side
 * while four dots fill with sunshine in sequence, mirroring the real
 * wave gate. Pure CSS animation, respects prefers-reduced-motion.
 */

import React from 'react';
import { tokens } from '../../styles/tokens';

interface GestureDemoProps {
    size?: 'sm' | 'md';
}

export const GestureDemo: React.FC<GestureDemoProps> = ({ size = 'md' }) => {
    const hand = size === 'sm' ? 40 : 56;
    const dot = size === 'sm' ? 14 : 18;

    return (
        <div
            aria-label="Example: hold up your hand and wave side to side"
            role="img"
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: size === 'sm' ? 10 : 14,
                padding: size === 'sm' ? '8px 0' : '12px 0',
            }}
        >
            <div
                className="fb-demo-hand"
                style={{
                    fontSize: hand,
                    lineHeight: 1,
                    transformOrigin: '50% 90%',
                }}
            >
                {'👋'}
            </div>
            <div style={{ display: 'flex', gap: size === 'sm' ? 8 : 10 }}>
                {[0, 1, 2, 3].map((i) => (
                    <span
                        key={i}
                        className="fb-demo-dot"
                        style={{
                            width: dot,
                            height: dot,
                            borderRadius: '50%',
                            background: tokens.colors.sunshine,
                            border: `2px solid ${tokens.colors.sunshine}`,
                            animationDelay: `${i * 0.35}s`,
                        }}
                    />
                ))}
            </div>
            <style>{`
                @keyframes fb-demo-wave {
                    0%, 100% { transform: rotate(-16deg); }
                    50% { transform: rotate(20deg); }
                }
                @keyframes fb-demo-fill {
                    0%, 15% { opacity: 0.25; transform: scale(0.85); }
                    40%, 100% { opacity: 1; transform: scale(1.12); }
                }
                .fb-demo-hand {
                    animation: fb-demo-wave 0.9s ease-in-out infinite;
                }
                .fb-demo-dot {
                    opacity: 0.25;
                    animation: fb-demo-fill 2.6s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .fb-demo-hand { animation: none; transform: rotate(0deg); }
                    .fb-demo-dot { animation: none; opacity: 1; }
                }
            `}</style>
        </div>
    );
};
